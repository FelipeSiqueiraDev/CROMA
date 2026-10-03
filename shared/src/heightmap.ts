import { MAX_ROOM_SIZE } from './constants';

/**
 * Mapa de alturas no formato clássico:
 *   'x' = vazio, '0'-'9' = alturas 0-9, 'a'-'w' = alturas 10-32.
 * Cada linha do texto é um y, cada caractere é um x.
 */
export interface Heightmap {
  width: number;
  height: number;
  /** tiles[y][x] = altura do piso, ou null para vazio */
  tiles: (number | null)[][];
}

export function charToHeight(c: string): number | null {
  const ch = c.toLowerCase();
  if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48;
  if (ch >= 'a' && ch <= 'w') return ch.charCodeAt(0) - 97 + 10;
  return null;
}

export function heightToChar(h: number | null): string {
  if (h === null) return 'x';
  if (h < 10) return String(h);
  return String.fromCharCode(97 + Math.min(h, 32) - 10);
}

export function parseHeightmap(src: string): Heightmap {
  const rows = src
    .replace(/\r/g, '')
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const tiles = rows.map((r) =>
    Array.from({ length: width }, (_, x) => (x < r.length ? charToHeight(r[x]) : null)),
  );
  return { width, height: rows.length, tiles };
}

export function serializeHeightmap(hm: Heightmap): string {
  return hm.tiles.map((row) => row.map(heightToChar).join('')).join('\n');
}

/** Retorna mensagem de erro, ou null se válido. */
export function validateHeightmap(src: string): string | null {
  if (typeof src !== 'string' || src.length > 7000) return 'Planta inválida.';
  if (!/^[0-9a-wxX\r\n ]+$/.test(src)) return 'Planta com caracteres inválidos.';
  const hm = parseHeightmap(src);
  if (hm.width < 2 || hm.height < 2) return 'Planta pequena demais.';
  if (hm.width > MAX_ROOM_SIZE || hm.height > MAX_ROOM_SIZE) return `Máximo ${MAX_ROOM_SIZE}x${MAX_ROOM_SIZE}.`;
  let count = 0;
  for (const row of hm.tiles) for (const t of row) if (t !== null) count++;
  if (count < 4) return 'A planta precisa de pelo menos 4 pisos.';
  return null;
}
