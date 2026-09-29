import { STACK_LIMIT, WALL_PX_PER_TILE, Z_PX } from './constants';
import { footprint, getFurni, getWallFurni } from './furni';
import { parseHeightmap, type Heightmap } from './heightmap';
import { computeWalls, type Door, type WallInfo } from './walls';
import type { ItemAction, Loot } from './rpg';

export interface Point {
  x: number;
  y: number;
}

export type HintIcon = 'inspect' | 'interact' | 'document' | 'gear' | 'alert';
export const HINT_ICONS: HintIcon[] = ['inspect', 'interact', 'document', 'gear', 'alert'];

/** Pista/interação que o mestre anexa a um mobi. */
export interface Hint {
  icon: HintIcon;
  title: string;
  text: string;
  /** false = só o mestre vê */
  visible: boolean;
}

export interface FloorItem {
  id: number;
  defId: string;
  x: number;
  y: number;
  z: number;
  rot: number;
  state: number;
  hint?: Hint;
  /** Passagem: id do quarto de destino */
  link?: number;
  /** itens guardados dentro (gaveta, estante...) */
  loot?: Loot[];
  /** interações com teste (DT) */
  actions?: ItemAction[];
}

export interface WallItem {
  id: number;
  defId: string;
  wall: 'l' | 'r';
  /** plano da parede: x para 'l', y para 'r' */
  plane: number;
  /** posição (centro) ao longo da parede, em tiles */
  pos: number;
  /** altura da base do item */
  z: number;
  state: number;
  hint?: Hint;
  loot?: Loot[];
  actions?: ItemAction[];
}

export type WalkState = 'blocked' | 'walk' | 'sit';

export interface PlaceResult {
  ok: boolean;
  z: number;
  reason?: string;
}

const fail = (reason: string): PlaceResult => ({ ok: false, z: 0, reason });

export class RoomMap {
  readonly hm: Heightmap;
  readonly door: Door;
  readonly walls: WallInfo;
  private items = new Map<number, FloorItem>();
  private wallItems = new Map<number, WallItem>();
  private grid: FloorItem[][][] = [];

  constructor(heightmap: string | Heightmap, door: Door, items: FloorItem[] = [], wallItems: WallItem[] = []) {
    this.hm = typeof heightmap === 'string' ? parseHeightmap(heightmap) : heightmap;
    this.door = door;
    this.walls = computeWalls(this.hm, door);
    for (const it of items) this.items.set(it.id, it);
    for (const w of wallItems) this.wallItems.set(w.id, w);
    this.rebuild();
  }

  get width() {
    return this.hm.width;
  }
  get height() {
    return this.hm.height;
  }

  floorHeight(x: number, y: number): number | null {
    if (x < 0 || y < 0 || x >= this.hm.width || y >= this.hm.height) return null;
    return this.hm.tiles[y][x];
  }

  isDoor(x: number, y: number) {
    return x === this.door.x && y === this.door.y;
  }

  // ---------- itens de chão ----------
  allItems(): FloorItem[] {
    return [...this.items.values()];
  }
  getItem(id: number) {
    return this.items.get(id);
  }
  addItem(it: FloorItem) {
    this.items.set(it.id, it);
    this.rebuild();
  }
  updateItem(it: FloorItem) {
    this.items.set(it.id, it);
    this.rebuild();
  }
  removeItem(id: number) {
    const ok = this.items.delete(id);
    this.rebuild();
    return ok;
  }

  // ---------- itens de parede ----------
  allWallItems(): WallItem[] {
    return [...this.wallItems.values()];
  }
  getWallItem(id: number) {
    return this.wallItems.get(id);
  }
  setWallItem(it: WallItem) {
    this.wallItems.set(it.id, it);
  }
  removeWallItem(id: number) {
    return this.wallItems.delete(id);
  }

  private rebuild() {
    const { width: w, height: h } = this.hm;
    this.grid = Array.from({ length: h }, () => Array.from({ length: w }, () => [] as FloorItem[]));
    for (const it of this.items.values()) {
      const def = getFurni(it.defId);
      if (!def) continue;
      const fp = footprint(def, it.rot);
      for (let dy = 0; dy < fp.sy; dy++)
        for (let dx = 0; dx < fp.sx; dx++) {
          const x = it.x + dx;
          const y = it.y + dy;
          if (x >= 0 && y >= 0 && x < w && y < h) this.grid[y][x].push(it);
        }
    }
    for (const row of this.grid) for (const cell of row) if (cell.length > 1) cell.sort((a, b) => a.z - b.z || a.id - b.id);
  }

  itemsAt(x: number, y: number): FloorItem[] {
    return this.grid[y]?.[x] ?? [];
  }

  topItem(x: number, y: number): FloorItem | undefined {
    const cell = this.itemsAt(x, y);
    return cell[cell.length - 1];
  }

  /** Item de assento no tile (se houver). */
  sitItem(x: number, y: number): FloorItem | undefined {
    const cell = this.itemsAt(x, y);
    for (let i = cell.length - 1; i >= 0; i--) if (getFurni(cell[i].defId)?.sit) return cell[i];
    return undefined;
  }

  walkState(x: number, y: number): WalkState {
    if (this.floorHeight(x, y) === null) return 'blocked';
    let sit = false;
    for (const it of this.itemsAt(x, y)) {
      const def = getFurni(it.defId);
      if (!def) continue;
      if (def.sit) sit = true;
      else if (!def.walkable) return 'blocked';
    }
    return sit ? 'sit' : 'walk';
  }

  /** Altura em que um avatar fica no tile (piso, tapete ou assento). */
  standHeight(x: number, y: number): number {
    const f = this.floorHeight(x, y) ?? 0;
    const cell = this.itemsAt(x, y);
    if (!cell.length) return f;
    let top = f;
    let seat: number | null = null;
    for (const it of cell) {
      const def = getFurni(it.defId);
      if (!def) continue;
      const t = it.z + def.height;
      if (def.sit) seat = t;
      if (t > top) top = t;
    }
    return seat ?? top;
  }

  canPlace(defId: string, x: number, y: number, rot: number, ignoreId?: number): PlaceResult {
    const def = getFurni(defId);
    if (!def) return fail('Mobi desconhecido.');
    if (!def.rotations.includes(rot)) return fail('Rotação inválida.');
    if (!Number.isInteger(x) || !Number.isInteger(y)) return fail('Posição inválida.');
    const fp = footprint(def, rot);
    let base: number | null = null;
    let z = -Infinity;
    for (let dy = 0; dy < fp.sy; dy++)
      for (let dx = 0; dx < fp.sx; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        const h = this.floorHeight(tx, ty);
        if (h === null) return fail('Fora do quarto.');
        if (this.isDoor(tx, ty)) return fail('Não bloqueie a porta.');
        if (base === null) base = h;
        else if (h !== base) return fail('O piso precisa estar nivelado.');
        let tileTop = h;
        for (const it of this.itemsAt(tx, ty)) {
          if (it.id === ignoreId) continue;
          const idef = getFurni(it.defId);
          if (!idef) continue;
          if (!idef.stackable) return fail('Não dá para empilhar aqui.');
          tileTop = Math.max(tileTop, it.z + idef.height);
        }
        z = Math.max(z, tileTop);
      }
    if (z + def.height > STACK_LIMIT) return fail('Alto demais.');
    return { ok: true, z: Math.round(z * 1000) / 1000 };
  }

  /** Tiles ocupados por um mobi numa posição/rotação. */
  tilesFor(defId: string, x: number, y: number, rot: number): Point[] {
    const def = getFurni(defId);
    if (!def) return [];
    const fp = footprint(def, rot);
    const out: Point[] = [];
    for (let dy = 0; dy < fp.sy; dy++) for (let dx = 0; dx < fp.sx; dx++) out.push({ x: x + dx, y: y + dy });
    return out;
  }

  canPlaceWall(defId: string, wall: 'l' | 'r', plane: number, pos: number, z: number): PlaceResult {
    const def = getWallFurni(defId);
    if (!def) return fail('Mobi de parede desconhecido.');
    if (![plane, pos, z].every(Number.isFinite)) return fail('Posição inválida.');
    const half = def.w / WALL_PX_PER_TILE / 2;
    const a0 = pos - half;
    const a1 = pos + half;
    let maxBase = -Infinity;
    for (let c = Math.floor(a0 + 1e-6); c <= Math.floor(a1 - 1e-6); c++) {
      const seg = this.walls.find(wall, plane, c);
      if (!seg) return fail('Precisa ficar inteiro numa parede.');
      if (seg.door) return fail('Não cubra a porta.');
      maxBase = Math.max(maxBase, seg.base);
    }
    if (z < maxBase + 0.05) return fail('Baixo demais.');
    if (z + def.h / Z_PX > this.walls.top - 0.02) return fail('Alto demais.');
    return { ok: true, z };
  }
}
