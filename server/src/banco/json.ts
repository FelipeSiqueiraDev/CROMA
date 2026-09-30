// Banco em arquivo: server/data/db.json (o jeito antigo, e o padrão sem CROMA_DB_URL).
import fs from 'node:fs';
import path from 'node:path';
import type { Banco } from '.';
import type { Database } from '../db';
import { DATA_DIR } from '../pastas';

export const DB_FILE = path.join(DATA_DIR, 'db.json');

export class BancoJson implements Banco {
  readonly nome = 'json' as const;

  async carregar(): Promise<Database | null> {
    return this.carregarAgora();
  }

  /** Lê o arquivo na hora (o Hotel sobe sem esperar). */
  carregarAgora(): Database | null {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Database;
      return db.version === 1 ? db : null;
    } catch {
      return null;
    }
  }

  async salvar(db: Database): Promise<void> {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const json = JSON.stringify(db);
    const tmp = DB_FILE + '.tmp';
    try {
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, DB_FILE);
    } catch {
      // OneDrive/antivírus às vezes travam o rename; grava direto.
      fs.writeFileSync(DB_FILE, json);
    }
  }

  async fechar(): Promise<void> {}
}
