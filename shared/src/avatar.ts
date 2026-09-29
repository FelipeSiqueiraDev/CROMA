/** Visual do avatar. Se `charId` apontar para um personagem com sprite sheet, ele é usado. */
export interface AvatarLook {
  skin: string;
  hair: string;
  hairStyle: number;
  top: string;
  pants: string;
  shoes: string;
  /** 0 camisa, 1 casaco longo, 2 moletom */
  outfit: number;
  /** 0 nada, 1 óculos, 2 barba */
  extra: number;
  charId: number | null;
}

export const SKIN_TONES = ['#f3d2b3', '#e8b98f', '#d09a6b', '#a86f45', '#7a4a2c', '#4e2f1c'];
export const HAIR_COLORS = ['#1a1412', '#3b2618', '#6b3f22', '#a8321e', '#c9c4bc', '#d8b25a', '#2d2d33', '#5a1a2a'];
export const CLOTH_COLORS = [
  '#1c1b1f', '#2b2a30', '#3d3a40', '#4a3a2c', '#5c4632', '#6b5a45', '#2f3a2c', '#3a4a3a',
  '#2c3444', '#44304a', '#5a1f1f', '#8a2a22', '#d8d0c0', '#9a9080', '#6a6f78', '#b08a3a',
];
export const HAIR_STYLES = ['Curto', 'Longo', 'Bagunçado', 'Rabo de cavalo'];
export const OUTFITS = ['Camisa', 'Casaco longo', 'Moletom'];
export const EXTRAS = ['Nada', 'Óculos', 'Barba'];

const HEX = /^#[0-9a-f]{6}$/i;

export function defaultLook(): AvatarLook {
  return {
    skin: SKIN_TONES[1],
    hair: HAIR_COLORS[1],
    hairStyle: 0,
    top: CLOTH_COLORS[4],
    pants: CLOTH_COLORS[0],
    shoes: CLOTH_COLORS[3],
    outfit: 1,
    extra: 0,
    charId: null,
  };
}

export function randomLook(): AvatarLook {
  const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  return {
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS),
    hairStyle: Math.floor(Math.random() * HAIR_STYLES.length),
    top: pick(CLOTH_COLORS),
    pants: pick(CLOTH_COLORS.slice(0, 10)),
    shoes: pick(CLOTH_COLORS.slice(0, 6)),
    outfit: Math.floor(Math.random() * OUTFITS.length),
    extra: Math.floor(Math.random() * EXTRAS.length),
    charId: null,
  };
}

export function sanitizeLook(input: unknown): AvatarLook {
  const d = defaultLook();
  if (!input || typeof input !== 'object') return d;
  const o = input as Record<string, unknown>;
  const col = (v: unknown, fb: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fb);
  const int = (v: unknown, max: number, fb: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < max ? v : fb;
  return {
    skin: col(o.skin, d.skin),
    hair: col(o.hair, d.hair),
    hairStyle: int(o.hairStyle, HAIR_STYLES.length, d.hairStyle),
    top: col(o.top, d.top),
    pants: col(o.pants, d.pants),
    shoes: col(o.shoes, d.shoes),
    outfit: int(o.outfit, OUTFITS.length, d.outfit),
    extra: int(o.extra, EXTRAS.length, d.extra),
    charId: typeof o.charId === 'number' && Number.isInteger(o.charId) && o.charId > 0 ? o.charId : null,
  };
}
