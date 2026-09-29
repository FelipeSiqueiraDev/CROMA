import { WALL_HEIGHT } from './constants';
import type { Heightmap } from './heightmap';

export interface Door {
  x: number;
  y: number;
  dir: number;
}

/**
 * Segmento de parede de 1 tile.
 *  - 'l' (parede esquerda): plano x = plane, cobre y ∈ [at, at+1]
 *  - 'r' (parede direita):  plano y = plane, cobre x ∈ [at, at+1]
 */
export interface WallSeg {
  wall: 'l' | 'r';
  plane: number;
  at: number;
  base: number;
  door: boolean;
}

export interface WallInfo {
  segs: WallSeg[];
  top: number;
  find(wall: 'l' | 'r', plane: number, at: number): WallSeg | undefined;
}

/**
 * Paredes só existem na borda de trás do quarto (em "escada" que só avança
 * em direção ao observador), igual ao comportamento clássico.
 */
export function computeWalls(hm: Heightmap, door: Door): WallInfo {
  const isTile = (x: number, y: number) =>
    !(x === door.x && y === door.y) && hm.tiles[y]?.[x] !== null && hm.tiles[y]?.[x] !== undefined;

  let maxH = 0;
  for (const row of hm.tiles) for (const t of row) if (t !== null && t > maxH) maxH = t;

  const segs: WallSeg[] = [];
  let minX = Infinity;
  for (let y = 0; y < hm.height; y++) {
    for (let x = 0; x < hm.width; x++) {
      if (!isTile(x, y)) continue;
      if (x <= minX) {
        segs.push({ wall: 'l', plane: x, at: y, base: hm.tiles[y][x] ?? 0, door: false });
        minX = x;
      }
      break;
    }
  }
  let minY = Infinity;
  for (let x = 0; x < hm.width; x++) {
    for (let y = 0; y < hm.height; y++) {
      if (!isTile(x, y)) continue;
      if (y <= minY) {
        segs.push({ wall: 'r', plane: y, at: x, base: hm.tiles[y][x] ?? 0, door: false });
        minY = y;
      }
      break;
    }
  }

  if (hm.tiles[door.y]?.[door.x] !== null && hm.tiles[door.y]?.[door.x] !== undefined) {
    const l = segs.find((s) => s.wall === 'l' && s.at === door.y && s.plane === door.x + 1);
    if (l) l.door = true;
    else {
      const r = segs.find((s) => s.wall === 'r' && s.at === door.x && s.plane === door.y + 1);
      if (r) r.door = true;
    }
  }

  const map = new Map(segs.map((s) => [`${s.wall}:${s.plane}:${s.at}`, s]));
  return {
    segs,
    top: maxH + WALL_HEIGHT,
    find: (wall, plane, at) => map.get(`${wall}:${plane}:${at}`),
  };
}
