import type { AvatarLook } from './avatar';
import type { RollResult } from './dice';
import type { FloorItem, Hint, WallItem } from './room';
import type { CampaignState, LootKind } from './rpg';
import type { Role, Session, SessionAction, Token } from './session';
import type { Door } from './walls';

export type DirKey = 'sw' | 'se' | 'nw' | 'ne';
export const DIR_KEYS: DirKey[] = ['sw', 'se', 'nw', 'ne'];

/** Animação de cada linha da folha. */
export type AnimKey = 'idle' | 'walk' | 'sit';
export const ANIM_KEYS: AnimKey[] = ['idle', 'walk', 'sit'];

/** Clima de luz do quarto (controlado pelo mestre). */
export type LightMode = 'normal' | 'flicker' | 'blackout';
export const LIGHT_MODES: LightMode[] = ['normal', 'flicker', 'blackout'];

/** Personagem com sprite sheet enviado por um jogador. */
export interface CharacterDef {
  id: number;
  name: string;
  owner: string;
  /** URL da imagem (ex: /uploads/abc.png) */
  sheet: string;
  cols: number;
  rows: number;
  /** direção de cada linha da folha */
  dirs: DirKey[];
  /** animação de cada linha (padrão: idle) */
  anims?: AnimKey[];
  /** altura na tela, em pixels (zoom 1) */
  height: number;
  fps: number;
  /** ordem dos quadros de idle */
  sequence: number[];
  removeBg: boolean;
}

export type CharacterPatch = Partial<Pick<CharacterDef, 'name' | 'cols' | 'rows' | 'dirs' | 'anims' | 'height' | 'fps' | 'sequence' | 'removeBg'>>;

export function sanitizeCharPatch(p: unknown): CharacterPatch {
  const out: CharacterPatch = {};
  if (!p || typeof p !== 'object') return out;
  const o = p as Record<string, unknown>;
  const int = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
  if (typeof o.name === 'string') {
    const n = o.name.trim().slice(0, 24);
    if (n.length >= 2) out.name = n;
  }
  const cols = int(o.cols, 1, 16);
  if (cols) out.cols = cols;
  const rows = int(o.rows, 1, 8);
  if (rows) out.rows = rows;
  if (Array.isArray(o.dirs) && o.dirs.length <= 8 && o.dirs.every((d) => DIR_KEYS.includes(d as DirKey)))
    out.dirs = o.dirs as DirKey[];
  if (Array.isArray(o.anims) && o.anims.length <= 8 && o.anims.every((a) => ANIM_KEYS.includes(a as AnimKey)))
    out.anims = o.anims as AnimKey[];
  const height = int(o.height, 40, 260);
  if (height) out.height = height;
  const fps = int(o.fps, 1, 24);
  if (fps) out.fps = fps;
  if (Array.isArray(o.sequence) && o.sequence.length >= 1 && o.sequence.length <= 32 && o.sequence.every((n) => int(n, 0, 15) !== undefined))
    out.sequence = o.sequence as number[];
  if (typeof o.removeBg === 'boolean') out.removeBg = o.removeBg;
  return out;
}

export interface UserStatus {
  id: number;
  x: number;
  y: number;
  z: number;
  dir: number;
  headDir: number;
  /** 0 em pé, 1 sentado em mobi, 2 sentado no chão */
  sit: 0 | 1 | 2;
  dance: boolean;
  /** próximo tile (andando) */
  mv?: { x: number; y: number; z: number };
}

export interface UserInfo extends UserStatus {
  name: string;
  look: AvatarLook;
  /** cor da peça (anel/retrato) */
  color?: string;
}

export interface RoomSummary {
  id: number;
  name: string;
  description: string;
  owner: string;
  users: number;
}

export interface RoomInfo {
  id: number;
  name: string;
  description: string;
  owner: string;
  heightmap: string;
  door: Door;
  darkness: number;
  lightMode: LightMode;
  /** densidade da névoa 0..1 */
  fog: number;
  publicBuild: boolean;
  /** o cliente atual pode construir/editar */
  canBuild: boolean;
  /** o cliente atual é o dono (mestre) */
  isOwner: boolean;
}

/** Uma cena (quarto) do minimapa: planta, passagens e quem está nela. */
export interface SceneInfo {
  id: number;
  name: string;
  heightmap: string;
  door: Door;
  portals: { x: number; y: number; link: number }[];
  users: { id: number; name: string; x: number; y: number }[];
}

export interface InvItem {
  id: number;
  defId: string;
}

export type ChatKind = 'say' | 'shout' | 'roll' | 'system';

export type ClientMsg =
  /** gmKey = chave do link do mestre; sem ela (ou errada) a pessoa entra como jogador */
  | { t: 'login'; name: string; look: AvatarLook; gmKey?: string }
  /** ações da sessão (contrato em session.ts); só o mestre */
  | { t: 'act'; a: SessionAction }
  | { t: 'rooms' }
  | { t: 'createRoom'; name: string; model: string }
  | { t: 'join'; roomId: number }
  | { t: 'peek'; roomId: number }
  | { t: 'walk'; x: number; y: number }
  | { t: 'lookAt'; x: number; y: number }
  | { t: 'chat'; text: string; shout?: boolean }
  | { t: 'action'; action: 'wave' | 'dance' | 'sit' | 'stand' }
  | { t: 'look'; look: AvatarLook }
  | { t: 'place'; defId?: string; invId?: number; x: number; y: number; rot: number }
  | { t: 'placeWall'; defId?: string; invId?: number; wall: 'l' | 'r'; plane: number; pos: number; z: number }
  | { t: 'moveItem'; id: number; x: number; y: number; rot: number }
  | { t: 'moveWallItem'; id: number; wall: 'l' | 'r'; plane: number; pos: number; z: number }
  | { t: 'pickup'; id: number }
  | { t: 'use'; id: number }
  | { t: 'setHint'; id: number; hint: Hint | null }
  | { t: 'roomSettings'; name: string; description: string; darkness: number; publicBuild: boolean }
  | { t: 'roomFx'; lightMode?: LightMode; fog?: number; darkness?: number }
  | { t: 'setLink'; id: number; roomId: number | null }
  | { t: 'sendTo'; userId: number | 'all'; roomId: number }
  | { t: 'tokenAdd'; name: string; look: AvatarLook; color?: string; capacity?: number }
  | { t: 'tokenEdit'; tokenId: number; name?: string; look?: AvatarLook; color?: string; capacity?: number }
  | { t: 'tokenRemove'; tokenId: number }
  | { t: 'tokenWalk'; tokenId: number; x: number; y: number }
  | { t: 'tokenFace'; tokenId: number; dir: number }
  | { t: 'tokenScene'; tokenId: number; roomId: number }
  | { t: 'lootAdd'; itemId: number; name: string; weight: number; kind: LootKind }
  | { t: 'lootRemove'; itemId: number; lootId: number }
  | { t: 'lootGive'; itemId: number; lootId: number; to: string | null }
  | { t: 'lootReveal'; itemId: number; lootId: number; revealed: boolean }
  | { t: 'actionAdd'; itemId: number; label: string; dt: number }
  | { t: 'actionRemove'; itemId: number; actionId: number }
  | { t: 'actionLog'; itemId: number; actionId: number; player: string; success: boolean; value?: number }
  | { t: 'objAdd'; text: string }
  | { t: 'objToggle'; id: number }
  | { t: 'objRemove'; id: number }
  | { t: 'campaignSet'; title: string; subtitle: string }
  | { t: 'layoutSet'; roomId: number; x: number; y: number }
  | { t: 'capacitySet'; name: string; capacity: number }
  | { t: 'floorPlan'; heightmap: string; door: Door }
  | { t: 'charUpdate'; id: number; patch: CharacterPatch }
  | { t: 'charDelete'; id: number };

export type ServerMsg =
  | { t: 'hello'; characters: CharacterDef[] }
  | { t: 'welcome'; id: number; name: string; look: AvatarLook; token: string; inventory: InvItem[]; home?: number; role: Role }
  | { t: 'error'; msg: string }
  | { t: 'notice'; msg: string }
  | { t: 'roomList'; rooms: RoomSummary[] }
  | { t: 'roomCreated'; id: number }
  | { t: 'roomEnter'; room: RoomInfo; items: FloorItem[]; wallItems: WallItem[]; users: UserInfo[] }
  /** conteúdo de outra cena da campanha (miniatura), sem entrar nela */
  | { t: 'peek'; room: RoomInfo; items: FloorItem[]; wallItems: WallItem[] }
  | { t: 'roomUpdate'; room: RoomInfo }
  | { t: 'userJoin'; user: UserInfo }
  | { t: 'userLeave'; id: number }
  | { t: 'userLook'; id: number; look: AvatarLook }
  | { t: 'status'; updates: UserStatus[] }
  | { t: 'chat'; id: number; name: string; text: string; kind: ChatKind; roll?: RollResult }
  | { t: 'action'; id: number; action: 'wave' }
  | { t: 'itemAdd'; item: FloorItem }
  | { t: 'itemUpdate'; item: FloorItem }
  | { t: 'itemRemove'; id: number }
  | { t: 'wallAdd'; item: WallItem }
  | { t: 'wallUpdate'; item: WallItem }
  | { t: 'wallRemove'; id: number }
  | { t: 'inventory'; items: InvItem[] }
  | { t: 'characters'; list: CharacterDef[] }
  | { t: 'scenes'; scenes: SceneInfo[] }
  | { t: 'campaign'; state: CampaignState }
  /** estado completo da sessão (reenviado quando muda) */
  | { t: 'session'; session: Session }
  /** peças que se mexeram neste passo (a cada TOKEN_STEP_MS) */
  | { t: 'tokens'; sceneId: number; tokens: Token[] }
  /** ação recusada pelo servidor */
  | { t: 'denied'; action: string; reason: string };
