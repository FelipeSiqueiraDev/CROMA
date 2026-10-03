/**
 * O banco em memória (Database) virando linhas das tabelas do Postgres e de
 * volta. Cada linha tem as colunas legíveis e `dados` com o objeto inteiro,
 * então nada se perde quando um tipo ganha campo novo.
 */
import type { CharacterDef, FloorItem, LogEntry, WallItem } from '@crona/shared';
import type { CampaignData, Database, FichaSalva, RoomData, TokenData, UserData } from '../db';

export interface Tabela {
  nome: string;
  chave: string;
  /** a chave é número (id) ou texto */
  chaveNumero: boolean;
  colunas: string[];
  /** colunas jsonb */
  json: string[];
}

/** Na ordem de gravação: pais antes dos filhos (para apagar, a ordem inversa). */
export const TABELAS: Tabela[] = [
  { nome: 'config', chave: 'chave', chaveNumero: false, colunas: ['chave', 'valor'], json: ['valor'] },
  { nome: 'campanhas', chave: 'id', chaveNumero: true, colunas: ['id', 'titulo', 'subtitulo', 'dados'], json: ['dados'] },
  { nome: 'registro', chave: 'id', chaveNumero: false, colunas: ['id', 'campanha_id', 'em', 'icone', 'texto', 'dados'], json: ['dados'] },
  { nome: 'cenas', chave: 'id', chaveNumero: true, colunas: ['id', 'nome', 'andar', 'descricao', 'dados'], json: ['dados'] },
  { nome: 'mobis', chave: 'id', chaveNumero: true, colunas: ['id', 'cena_id', 'ordem', 'tipo', 'x', 'y', 'dados'], json: ['dados'] },
  { nome: 'mobis_parede', chave: 'id', chaveNumero: true, colunas: ['id', 'cena_id', 'ordem', 'tipo', 'dados'], json: ['dados'] },
  { nome: 'pecas', chave: 'id', chaveNumero: true, colunas: ['id', 'cena_id', 'ordem', 'nome', 'dados'], json: ['dados'] },
  { nome: 'personagens', chave: 'id', chaveNumero: true, colunas: ['id', 'ordem', 'nome', 'dados'], json: ['dados'] },
  { nome: 'usuarios', chave: 'nome', chaveNumero: false, colunas: ['nome', 'dados'], json: ['dados'] },
  { nome: 'fichas', chave: 'id', chaveNumero: true, colunas: ['id', 'nome', 'campanha_id', 'personagem_id', 'nex', 'classe', 'criada_em', 'atualizada_em', 'dados'], json: ['dados'] },
];

export type Linha = Record<string, unknown>;
/** tabela → chave (em texto) → linha */
export type Linhas = Map<string, Map<string, Linha>>;

/** Campos do Database que viram tabela própria (o resto vai para `config`). */
const LISTAS = new Set(['rooms', 'users', 'characters', 'campaigns', 'fichas']);

export function linhasDe(db: Database): Linhas {
  const out: Linhas = new Map(TABELAS.map((t) => [t.nome, new Map<string, Linha>()]));
  const por = (t: string, chave: string | number, l: Linha) => out.get(t)!.set(String(chave), l);

  for (const [k, v] of Object.entries(db)) if (!LISTAS.has(k) && v !== undefined) por('config', k, { chave: k, valor: v });

  for (const [id, c] of Object.entries(db.campaigns ?? {})) {
    const { title, subtitle, log, ...resto } = c;
    por('campanhas', id, { id: Number(id), titulo: title, subtitulo: subtitle ?? '', dados: resto });
    // chave estável por entrada: campanha, momento e quantas vieram no mesmo milissegundo
    const vistos = new Map<number, number>();
    for (const e of log ?? []) {
      const n = vistos.get(e.at) ?? 0;
      vistos.set(e.at, n + 1);
      const chave = `${id}:${e.at}:${n}`;
      por('registro', chave, { id: chave, campanha_id: Number(id), em: new Date(e.at), icone: e.icon, texto: e.text, dados: e });
    }
  }

  for (const r of db.rooms) {
    const { items, wallItems, tokens, ...resto } = r;
    por('cenas', r.id, { id: r.id, nome: r.name, andar: r.floor ?? null, descricao: r.description ?? '', dados: resto });
    items.forEach((it, i) => por('mobis', it.id, { id: it.id, cena_id: r.id, ordem: i, tipo: it.defId, x: it.x, y: it.y, dados: it }));
    wallItems.forEach((it, i) => por('mobis_parede', it.id, { id: it.id, cena_id: r.id, ordem: i, tipo: it.defId, dados: it }));
    (tokens ?? []).forEach((t, i) => por('pecas', t.id, { id: t.id, cena_id: r.id, ordem: i, nome: t.name, dados: t }));
  }

  db.characters.forEach((c, i) => por('personagens', c.id, { id: c.id, ordem: i, nome: c.name, dados: c }));
  for (const [nome, u] of Object.entries(db.users)) por('usuarios', nome, { nome, dados: u });
  for (const f of db.fichas ?? [])
    por('fichas', f.id, {
      id: f.id,
      nome: f.nome,
      campanha_id: f.campanha ?? null,
      personagem_id: f.personagem ?? null,
      nex: f.ficha.nex,
      classe: f.ficha.classe,
      criada_em: new Date(f.criadaEm),
      atualizada_em: new Date(f.atualizadaEm),
      dados: f,
    });
  return out;
}

/** Linhas lidas do banco (por tabela) de volta para o Database. */
export function montar(t: Record<string, Linha[]>): Database {
  const db = {} as Database;
  for (const l of t.config ?? []) (db as unknown as Record<string, unknown>)[l.chave as string] = l.valor;

  const cenas = new Map<number, RoomData>();
  for (const l of [...(t.cenas ?? [])].sort((a, b) => (a.id as number) - (b.id as number))) {
    const r = { ...(l.dados as object), items: [], wallItems: [], tokens: [] } as unknown as RoomData;
    cenas.set(l.id as number, r);
  }
  const ordenado = (ls: Linha[] | undefined) => [...(ls ?? [])].sort((a, b) => (a.cena_id as number) - (b.cena_id as number) || (a.ordem as number) - (b.ordem as number));
  for (const l of ordenado(t.mobis)) cenas.get(l.cena_id as number)?.items.push(l.dados as FloorItem);
  for (const l of ordenado(t.mobis_parede)) cenas.get(l.cena_id as number)?.wallItems.push(l.dados as WallItem);
  for (const l of ordenado(t.pecas)) cenas.get(l.cena_id as number)?.tokens!.push(l.dados as TokenData);
  db.rooms = [...cenas.values()];

  const campanhas: Record<string, CampaignData> = {};
  for (const l of t.campanhas ?? []) campanhas[String(l.id)] = { title: l.titulo as string, subtitle: l.subtitulo as string, ...(l.dados as object), log: [] } as unknown as CampaignData;
  const registro = [...(t.registro ?? [])].sort((a, b) => new Date(a.em as string).getTime() - new Date(b.em as string).getTime() || String(a.id).localeCompare(String(b.id)));
  for (const l of registro) campanhas[String(l.campanha_id)]?.log.push(l.dados as LogEntry);
  db.campaigns = campanhas;

  db.characters = [...(t.personagens ?? [])].sort((a, b) => (a.ordem as number) - (b.ordem as number)).map((l) => l.dados as CharacterDef);
  db.users = {};
  for (const l of t.usuarios ?? []) db.users[l.nome as string] = l.dados as UserData;
  db.fichas = [...(t.fichas ?? [])].sort((a, b) => (a.id as number) - (b.id as number)).map((l) => l.dados as FichaSalva);
  return db;
}

/** Texto de cada linha, para saber o que mudou desde a última gravação. */
export function assinaturas(ls: Linhas): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  for (const [t, m] of ls) out.set(t, new Map([...m].map(([k, l]) => [k, JSON.stringify(l)])));
  return out;
}
