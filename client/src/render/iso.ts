/** Tile 64x32, 32px por unidade de altura. */
export const TILE_W = 64;
export const TILE_H = 32;
export const Z_PX = 32;

export function iso(x: number, y: number, z: number): [number, number] {
  return [(x - y) * 32, (x + y) * 16 - z * Z_PX];
}

/** Inverso de iso() para uma altura conhecida. */
export function unIso(sx: number, sy: number, z: number): [number, number] {
  const a = sx / 32;
  const b = (sy + z * Z_PX) / 16;
  return [(a + b) / 2, (b - a) / 2];
}
