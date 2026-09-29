import type { AvatarLook } from './avatar';
import type { SceneInfo } from './protocol';

/** Tipos de item de RPG (ícone e rótulo). */
export type LootKind = 'weapon' | 'document' | 'key' | 'letter' | 'potion' | 'tape' | 'box' | 'misc';

export const LOOT_KINDS: { id: LootKind; label: string }[] = [
  { id: 'weapon', label: 'Arma Simples' },
  { id: 'document', label: 'Documento' },
  { id: 'key', label: 'Chave' },
  { id: 'letter', label: 'Carta' },
  { id: 'potion', label: 'Consumível' },
  { id: 'tape', label: 'Mídia' },
  { id: 'box', label: 'Caixa' },
  { id: 'misc', label: 'Item' },
];

export function lootKindLabel(k: LootKind) {
  return LOOT_KINDS.find((x) => x.id === k)?.label ?? 'Item';
}

/** Item guardado dentro de um mobi (gaveta, estante...). */
export interface Loot {
  id: number;
  name: string;
  weight: number;
  kind: LootKind;
  /** nome do jogador que está com o item */
  holder?: string;
  /** jogadores já podem ver */
  revealed?: boolean;
}

/** Interação com teste: "Investigar (DT 15)". */
export interface ItemAction {
  id: number;
  label: string;
  dt: number;
}

export interface Objective {
  id: number;
  text: string;
  done: boolean;
}

export type LogIcon = 'user' | 'dice' | 'give' | 'scene' | 'obj';

export interface LogEntry {
  at: number;
  icon: LogIcon;
  text: string;
}

export interface PartyMember {
  name: string;
  /** id da conexão, se online */
  id: number | null;
  look: AvatarLook | null;
  load: number;
  capacity: number;
  roomId: number | null;
  color: string;
}

/** Tudo que a tela MAPA precisa sobre a campanha (cenas ligadas por Passagens). */
export interface CampaignState {
  key: number;
  title: string;
  subtitle: string;
  objectives: Objective[];
  /** posição de cada cena na planta (em células) */
  layout: Record<number, { x: number; y: number }>;
  log: LogEntry[];
  party: PartyMember[];
  scenes: SceneInfo[];
}

export const DEFAULT_CAPACITY = 10;

export function sanitizeLootInput(o: Record<string, unknown>): { name: string; weight: number; kind: LootKind } | null {
  const name = typeof o.name === 'string' ? o.name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40) : '';
  const weight = typeof o.weight === 'number' && Number.isFinite(o.weight) ? Math.max(0, Math.min(50, Math.round(o.weight * 10) / 10)) : 1;
  const kind = LOOT_KINDS.some((k) => k.id === o.kind) ? (o.kind as LootKind) : 'misc';
  if (name.length < 1) return null;
  return { name, weight, kind };
}

/** Cor fixa de cada jogador (anel, retrato, minimapa). */
const PLAYER_COLORS = ['#e3a94c', '#d83a2e', '#3f6fd8', '#f2efe6', '#6fdc8c', '#c78bff', '#3fe0c0', '#ff6fb0'];
export function playerColorFor(name: string) {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PLAYER_COLORS[h % PLAYER_COLORS.length];
}

export type { AvatarLook };
