const rgbCache = new Map<string, [number, number, number]>();
const shadeCache = new Map<string, string>();

export function hexToRgb(hex: string): [number, number, number] {
  let c = rgbCache.get(hex);
  if (!c) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
  }
  return c;
}

const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');

/** amt > 0 clareia, amt < 0 escurece (-1..1). */
export function shade(hex: string, amt: number): string {
  if (!amt) return hex;
  const key = hex + amt.toFixed(3);
  let out = shadeCache.get(key);
  if (!out) {
    const [r, g, b] = hexToRgb(hex);
    if (amt > 0) out = '#' + toHex(r + (255 - r) * amt) + toHex(g + (255 - g) * amt) + toHex(b + (255 - b) * amt);
    else out = '#' + toHex(r * (1 + amt)) + toHex(g * (1 + amt)) + toHex(b * (1 + amt));
    shadeCache.set(key, out);
  }
  return out;
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return '#' + toHex(r1 + (r2 - r1) * t) + toHex(g1 + (g2 - g1) * t) + toHex(b1 + (b2 - b1) * t);
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Hash inteiro → [0,1). */
export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v * 1000) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

/** Gerador determinístico (mulberry32). */
export function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
