import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AvatarLook, CharacterDef, Door, FloorItem, InvItem, LightMode, LogEntry, Objective, WallItem } from '@croma/shared';

export const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface RoomData {
  id: number;
  name: string;
  description: string;
  owner: string;
  heightmap: string;
  door: Door;
  items: FloorItem[];
  wallItems: WallItem[];
  publicBuild: boolean;
  darkness: number;
  lightMode?: LightMode;
  fog?: number;
  /** peças (personagens) nesta cena */
  tokens?: TokenData[];
}

export interface TokenData {
  id: number;
  name: string;
  look: AvatarLook;
  x: number;
  y: number;
  dir: number;
  /** cor do anel/retrato */
  color?: string;
  /** limite de carga */
  capacity?: number;
}

export interface UserData {
  name: string;
  look: AvatarLook;
  inventory: InvItem[];
  /** limite de carga (itens de RPG) */
  capacity?: number;
}

/** Campanha = grupo de cenas ligadas; a chave é o menor id de quarto do grupo. */
export interface CampaignData {
  title: string;
  subtitle: string;
  objectives: Objective[];
  layout: Record<number, { x: number; y: number }>;
  log: LogEntry[];
  /** cena que todos estão vendo (a última que o mestre abriu) */
  currentSceneId?: number;
}

export interface Database {
  version: 1;
  /** versão do conteúdo de exemplo já aplicado */
  seedVersion?: number;
  nextRoomId: number;
  nextItemId: number;
  nextCharId: number;
  rooms: RoomData[];
  /** chave = nome em minúsculas */
  users: Record<string, UserData>;
  characters: CharacterDef[];
  campaigns?: Record<string, CampaignData>;
  /** cena de abertura sugerida (a demonstração mais nova) */
  home?: number;
  /** chave do link do mestre (quem entra com ela controla as sessões) */
  gmKey?: string;
}

export function loadDb(): Database | null {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(raw) as Database;
    if (db.version !== 1) return null;
    return db;
  } catch {
    return null;
  }
}

export function saveDbNow(db: Database) {
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

let timer: NodeJS.Timeout | null = null;
export function scheduleSave(db: Database) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    try {
      saveDbNow(db);
    } catch (e) {
      console.error('[db] falha ao salvar', e);
    }
  }, 800);
}
