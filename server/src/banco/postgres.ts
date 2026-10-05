/**
 * Banco no Postgres. Ao abrir, aplica as migrações que faltam
 * (src/banco/migracoes, em ordem). Ao salvar, compara com a última gravação e
 * escreve só as linhas que mudaram, numa transação. Uma gravação por vez: se
 * pedirem outra no meio, vale a mais nova.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import type { Banco } from '.';
import type { Database } from '../db';
import { assinaturas, linhasDe, montar, TABELAS, type Linha, type Tabela } from './linhas';

const MIGRACOES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migracoes');

/** O número da trava do CRONA no Postgres (pg_advisory_lock). */
const TRAVA = 4177_0310;

/** Outro servidor do CRONA já está usando este banco. */
export class BancoOcupado extends Error {
  constructor() {
    super('outro servidor do CRONA já está usando este banco');
  }
}

export class BancoPostgres implements Banco {
  readonly nome = 'postgres' as const;
  readonly sql: postgres.Sql;
  /** o que está gravado: tabela → chave → texto da linha */
  private gravado = new Map<string, Map<string, string>>();
  private emAndamento: Promise<void> | null = null;
  private proximo: Database | null = null;

  constructor(url: string) {
    this.sql = postgres(url, { max: 3, connect_timeout: 5, onnotice: () => {} });
  }

  /** a conexão que segura a trava do banco enquanto o servidor estiver no ar */
  private trava: postgres.ReservedSql | null = null;

  async abrir() {
    await this.sql`select 1`;
    // um servidor por banco: o servidor guarda tudo na memória e grava só o que mudou, então dois no
    // mesmo banco (o do Docker e um `npm run dev`, por exemplo) apagariam o que o outro gravou
    this.trava = await this.sql.reserve();
    const [{ ok }] = await this.trava<{ ok: boolean }[]>`select pg_try_advisory_lock(${TRAVA}) as ok`;
    if (!ok) {
      this.trava.release();
      this.trava = null;
      throw new BancoOcupado();
    }
    await this.migrar();
  }

  private async migrar() {
    await this.sql`create table if not exists migracoes (nome text primary key, aplicada_em timestamptz not null default now())`;
    const feitas = new Set((await this.sql<{ nome: string }[]>`select nome from migracoes`).map((r) => r.nome));
    for (const arq of fs.readdirSync(MIGRACOES).filter((f) => f.endsWith('.sql')).sort()) {
      if (feitas.has(arq)) continue;
      const texto = fs.readFileSync(path.join(MIGRACOES, arq), 'utf8');
      await this.sql.begin(async (tx) => {
        await tx.unsafe(texto);
        await tx`insert into migracoes (nome) values (${arq})`;
      });
      console.log(`[banco] migração aplicada: ${arq}`);
    }
  }

  async carregar(): Promise<Database | null> {
    const t: Record<string, Linha[]> = {};
    for (const tab of TABELAS) t[tab.nome] = [...(await this.sql`select * from ${this.sql(tab.nome)}`)] as Linha[];
    if (!t.config.length) return null;
    const db = montar(t);
    // o que acabou de ler é o que está gravado: a próxima gravação só escreve diferenças
    this.gravado = assinaturas(linhasDe(db));
    return db;
  }

  salvar(db: Database): Promise<void> {
    if (this.emAndamento) {
      this.proximo = db;
      return this.emAndamento;
    }
    this.emAndamento = (async () => {
      try {
        let atual: Database | null = db;
        while (atual) {
          this.proximo = null;
          await this.gravar(atual);
          atual = this.proximo;
        }
      } finally {
        this.emAndamento = null;
      }
    })();
    return this.emAndamento;
  }

  private async gravar(db: Database) {
    const linhas = linhasDe(db);
    const novo = assinaturas(linhas);
    const antes = this.gravado;
    const chave = (tab: Tabela, k: string) => (tab.chaveNumero ? Number(k) : k);
    await this.sql.begin(async (tx) => {
      // apaga o que saiu (filhos antes dos pais)
      for (const tab of [...TABELAS].reverse()) {
        const agora = novo.get(tab.nome)!;
        const saiu = [...(antes.get(tab.nome)?.keys() ?? [])].filter((k) => !agora.has(k)).map((k) => chave(tab, k));
        for (let i = 0; i < saiu.length; i += 500) await tx`delete from ${tx(tab.nome)} where ${tx(tab.chave)} in ${tx(saiu.slice(i, i + 500))}`;
      }
      // grava o que entrou ou mudou (pais antes dos filhos)
      for (const tab of TABELAS) {
        const velho = antes.get(tab.nome);
        const mudou = [...novo.get(tab.nome)!].filter(([k, s]) => velho?.get(k) !== s).map(([k]) => linhas.get(tab.nome)!.get(k)!);
        if (!mudou.length) continue;
        const atualiza = tab.colunas.filter((c) => c !== tab.chave).map((c) => `${c} = excluded.${c}`).join(', ');
        for (let i = 0; i < mudou.length; i += 500) {
          const lote = mudou.slice(i, i + 500).map((l) => {
            const r: Record<string, unknown> = {};
            for (const c of tab.colunas) r[c] = tab.json.includes(c) ? tx.json(l[c] as postgres.JSONValue) : l[c];
            return r;
          });
          await tx`insert into ${tx(tab.nome)} ${tx(lote as Record<string, postgres.ParameterOrJSON<never>>[], ...tab.colunas)} on conflict (${tx(tab.chave)}) do update set ${tx.unsafe(atualiza)}`;
        }
      }
    });
    this.gravado = novo;
  }

  async fechar() {
    if (this.emAndamento) await this.emAndamento;
    if (this.trava) {
      await this.trava`select pg_advisory_unlock(${TRAVA})`.catch(() => {});
      this.trava.release();
      this.trava = null;
    }
    await this.sql.end({ timeout: 5 });
  }
}
