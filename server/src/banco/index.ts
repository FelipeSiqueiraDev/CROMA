/**
 * Onde o CRONA guarda tudo. Com CRONA_DB_URL, no Postgres (docker-compose.yml,
 * `npm run banco`); sem ela, no arquivo server/data/db.json. Na primeira vez
 * no Postgres, o conteúdo do db.json é importado.
 */
import type { Database } from '../db';
import { usarBanco } from '../db';
import { BancoJson } from './json';

export interface Banco {
  readonly nome: 'json' | 'postgres';
  carregar(): Promise<Database | null>;
  salvar(db: Database): Promise<void>;
  fechar(): Promise<void>;
}

export async function abrirBanco(): Promise<Banco> {
  const url = process.env.CRONA_DB_URL;
  if (!url) {
    const json = new BancoJson();
    await usarBanco(json);
    return json;
  }
  const { BancoOcupado, BancoPostgres } = await import('./postgres');
  const pg = new BancoPostgres(url);
  try {
    await pg.abrir();
  } catch (e) {
    if (e instanceof BancoOcupado) {
      console.error('[banco] Outro servidor do CRONA já está usando este banco (o do Docker? `npm run crona:parar`).');
      console.error('[banco] Dois servidores no mesmo banco apagariam o que o outro grava: pare um deles.');
      process.exit(1);
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[banco] não consegui abrir o Postgres (${msg}).`);
    console.error('[banco] Suba o banco com `npm run banco` ou tire CRONA_DB_URL de server/.env para usar o db.json.');
    process.exit(1);
  }
  // primeira vez: traz o que estava no db.json
  let db = await pg.carregar();
  if (!db) {
    const antigo = new BancoJson().carregarAgora();
    if (antigo) {
      await pg.salvar(antigo);
      db = await pg.carregar();
      console.log(`[banco] importei o db.json para o Postgres (${antigo.rooms.length} cenas).`);
    }
  }
  await usarBanco({ nome: 'postgres', carregar: async () => db, salvar: (d) => pg.salvar(d), fechar: () => pg.fechar() });
  console.log('[banco] Postgres');
  return pg;
}
