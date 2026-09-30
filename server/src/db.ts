import type { AvatarLook, CharacterDef, combate, Door, FichaSalva, FloorItem, FloorStyle, InvItem, LightMode, LogEntry, Objective, ParticleKind, Vitals, WallItem } from '@croma/shared';
import type { Banco } from './banco';
import { BancoJson } from './banco/json';

export { DATA_DIR, UPLOAD_DIR } from './pastas';

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
  /** andar ("Térreo", "Subsolo") */
  floor?: string;
  /** piso do cômodo */
  floorStyle?: FloorStyle;
  /** cor do ambiente (#rrggbb) */
  ambient?: string;
  /** partículas (poeira, fumaça, brasas) */
  particles?: ParticleKind[];
  /** quantidade de partículas 0..1 */
  particleLevel?: number;
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
  /** estado do retrato: com a arma, machucado */
  armed?: boolean;
  hurt?: boolean;
  /** PV, PE e SAN (atual e total) */
  vitals?: Vitals;
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
  /** nome da operação em andamento (topo da tela) */
  operacao?: string;
  objectives: Objective[];
  layout: Record<number, { x: number; y: number; r?: number }>;
  log: LogEntry[];
  /** cena que todos estão vendo (a última que o mestre abriu) */
  currentSceneId?: number;
  /** combate em andamento (docs/COMBATE.md); sem valor = sem combate */
  combate?: combate.Combate;
  /** fichas rápidas das ameaças, pelo id da peça (docs/COMBATE.md, seção 17) */
  ameacas?: Record<string, combate.FichaAmeaca>;
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
  /** a última cena que o mestre abriu (em qualquer campanha): a mesa vai para ela */
  liveScene?: number;
  /** versão da montagem da Sede da Ordem (ver SEDE_REV) */
  sedeRev?: number;
  /** fichas de personagem (motor de regras) */
  fichas?: FichaSalva[];
  nextFichaId?: number;
}

export type { FichaSalva } from '@croma/shared';

// ---------- onde o banco fica guardado ----------
// JSON (server/data/db.json) por padrão; Postgres quando o servidor abre com
// CROMA_DB_URL (ver src/banco). O Hotel continua chamando loadDb/saveDbNow.

let banco: Banco = new BancoJson();
let carregado: { db: Database | null } | null = null;

/** Escolhe e abre o banco antes de o Hotel subir (lê o que estiver guardado). */
export async function usarBanco(b: Banco): Promise<void> {
  banco = b;
  carregado = { db: await b.carregar() };
}

export function bancoAtual(): Banco {
  return banco;
}

export function loadDb(): Database | null {
  if (carregado) {
    const { db } = carregado;
    carregado = null;
    return db;
  }
  return new BancoJson().carregarAgora();
}

export function saveDbNow(db: Database) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  banco.salvar(db).catch((e) => console.error('[banco] falha ao salvar', e));
}

let timer: NodeJS.Timeout | null = null;
export function scheduleSave(db: Database) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    saveDbNow(db);
  }, 800);
}

/** Grava o que falta e fecha a conexão (ao desligar o servidor). */
export async function fecharBanco(db: Database) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  await banco.salvar(db);
  await banco.fechar();
}
