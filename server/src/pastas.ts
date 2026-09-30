// Pastas de dados do servidor (fora do git).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
