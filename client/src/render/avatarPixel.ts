import type { AvatarLook } from '@crona/shared';
import { shade } from './color';

export type Pose = 'stand' | 'walk' | 'sit';

export interface AvatarAnim {
  pose: Pose;
  frame: number;
  wave: boolean;
  dance: boolean;
  blink: boolean;
}

type R = (x: number, y: number, w: number, h: number, c: string) => void;
interface View {
  view: 'front' | 'side' | 'back';
  mirror: boolean;
  fs: number;
}

/** dir 0..7 → vista. 0=cima-direita, 2=baixo-direita, 4=baixo-esquerda, 6=cima-esquerda. */
const VIEWS: View[] = [
  { view: 'back', mirror: false, fs: 2 },
  { view: 'side', mirror: false, fs: 0 },
  { view: 'front', mirror: false, fs: 2 },
  { view: 'front', mirror: false, fs: 0 },
  { view: 'front', mirror: true, fs: 2 },
  { view: 'side', mirror: true, fs: 0 },
  { view: 'back', mirror: true, fs: 2 },
  { view: 'back', mirror: false, fs: 0 },
];

const EYE = '#15121a';
const BELT = '#241b15';

function bodyRects(L: AvatarLook, v: View, a: AvatarAnim, r: R, drop: number, bob: number) {
  const walk = a.pose === 'walk';
  const sit = a.pose === 'sit';
  const ph = walk ? [1, 0, -1, 0][a.frame % 4] : 0;
  const T = L.top;
  const TD = shade(T, -0.24);
  const P = L.pants;
  const PD = shade(P, -0.22);
  const S = L.skin;
  const SD = shade(S, -0.18);
  const B = L.shoes;
  const BD = shade(B, -0.35);
  const coat = L.outfit === 1;
  const hoodie = L.outfit === 2;
  const ty = -48 + drop + bob;

  if (v.view !== 'side') {
    // pernas
    if (sit) {
      if (v.view === 'front') {
        r(-7, -6, 14, 6, P);
        r(-7, 0, 6, 9, P);
        r(1, 0, 6, 9, PD);
        r(-8, 8, 7, 5, B);
        r(1, 8, 7, 5, B);
      } else r(-8, -6, 16, 6, P);
    } else {
      const lL = ph > 0 ? 3 : 0;
      const lR = ph < 0 ? 3 : 0;
      r(-7, -27 + bob, 6, 21 - lL - bob, P);
      r(1, -27 + bob, 6, 21 - lR - bob, PD);
      r(-8, -6 - lL, 7, 6, B);
      r(-8, -6 - lL, 7, 1, BD);
      r(1, -6 - lR, 7, 6, B);
      r(1, -6 - lR, 7, 1, BD);
    }
    if (hoodie) r(-10, ty - 4, 20, 6, TD);
    r(-3, ty - 3, 6, 4, SD);
    // tronco
    r(-9, ty, 18, 21, T);
    r(4, ty, 5, 21, TD);
    if (coat) {
      if (v.view === 'front') {
        r(-3, ty, 6, 19, '#1a1719');
        r(-4, ty, 1, 21, TD);
        r(3, ty, 1, 21, shade(T, -0.4));
      }
      if (!sit) {
        r(-9, ty + 21, 6, 13, T);
        r(3, ty + 21, 6, 13, TD);
        if (v.view === 'back') r(-3, ty + 21, 6, 13, TD);
      }
    }
    if (hoodie && v.view === 'front') {
      r(-5, ty + 13, 10, 5, TD);
      r(-3, ty + 1, 1, 6, '#d8d0c0');
      r(2, ty + 1, 1, 6, '#d8d0c0');
    }
    if (hoodie && v.view === 'back') r(-7, ty - 2, 14, 8, shade(T, -0.1));
    if (!coat || v.view === 'back') {
      r(-9, ty + 19, 18, 2, BELT);
      if (v.view === 'front') r(-1, ty + 19, 3, 2, '#b89a5a');
    }
    // braços
    const sw = walk ? ph * 2 : 0;
    const ay = ty + 1;
    const up = (x: number, c: string) => {
      r(x, ay - 13, 4, 14, c);
      r(x, ay - 18, 4, 5, S);
    };
    if (a.dance && a.frame % 2 === 0) up(-13, TD);
    else {
      r(-13, ay + sw, 4, 15, TD);
      r(-13, ay + 15 + sw, 4, 5, S);
    }
    if (a.wave) up(9 + (a.frame % 2), T);
    else if (a.dance && a.frame % 2 === 1) up(9, T);
    else {
      r(9, ay - sw, 4, 15, T);
      r(9, ay + 15 - sw, 4, 5, SD);
    }
    return;
  }

  // ----- perfil (olhando para a direita) -----
  if (sit) {
    r(-5, -7, 15, 6, P);
    r(5, -2, 6, 10, P);
    r(5, 7, 9, 5, B);
  } else {
    const sp = walk ? ph * 3 : 0;
    r(-4 - sp, -27 + bob, 7, 21 - bob, PD);
    r(-4 - sp, -6, 10, 6, BD);
    r(-4 + sp, -27 + bob, 7, 21 - bob, P);
    r(-4 + sp, -6, 10, 6, B);
  }
  if (hoodie) r(-10, ty - 3, 7, 10, TD);
  r(-2, ty - 3, 5, 4, SD);
  r(-6, ty, 12, 21, T);
  r(-6, ty, 3, 21, TD);
  if (coat && !sit) {
    r(-7, ty + 21, 12, 13, T);
    r(-7, ty + 21, 3, 13, TD);
  }
  if (!coat) r(-6, ty + 19, 12, 2, BELT);
  const as = walk ? -ph * 3 : 0;
  if (a.wave || (a.dance && a.frame % 2 === 0)) {
    r(1, ty - 12, 5, 13, TD);
    r(2, ty - 17, 5, 5, S);
  } else {
    r(-2 + as, ty + 1, 5, 15, TD);
    r(-2 + as, ty + 16, 5, 5, S);
  }
}

function headRects(L: AvatarLook, v: View, a: AvatarAnim, r: R, o: number) {
  const S = L.skin;
  const SD = shade(S, -0.18);
  const H = L.hair;
  const HD = shade(H, -0.28);
  const HL = shade(H, 0.25);
  const G = '#c9a54a';
  const st = L.hairStyle;
  const fs = v.fs;

  if (v.view === 'side') {
    r(-9, -73 + o, 19, 24, S);
    r(-10, -70 + o, 21, 17, S);
    r(-2, -63 + o, 3, 5, SD);
    if (a.blink) r(5, -60 + o, 3, 1, EYE);
    else r(5, -62 + o, 3, 4, EYE);
    r(4, -65 + o, 4, 1, HD);
    r(10, -61 + o, 2, 3, SD);
    r(6, -55 + o, 3, 1, shade(S, -0.38));
    if (L.extra === 1) {
      r(3, -63 + o, 7, 1, G);
      r(3, -58 + o, 7, 1, G);
      r(3, -63 + o, 1, 6, G);
      r(9, -63 + o, 1, 6, G);
      r(-2, -62 + o, 5, 1, G);
    } else if (L.extra === 2) {
      r(-1, -57 + o, 11, 7, H);
      r(5, -55 + o, 4, 1, '#2a1a14');
    }
    if (st === 0) {
      r(-10, -76 + o, 20, 7, H);
      r(-10, -70 + o, 8, 12, H);
    } else if (st === 1) {
      r(-10, -76 + o, 20, 7, H);
      r(-11, -70 + o, 9, 28, H);
    } else if (st === 2) {
      r(-11, -78 + o, 21, 9, H);
      r(-9, -82 + o, 4, 4, H);
      r(-3, -83 + o, 4, 5, H);
      r(3, -81 + o, 4, 3, H);
      r(-11, -70 + o, 8, 12, H);
      r(4, -70 + o, 5, 4, H);
    } else {
      r(-10, -76 + o, 20, 7, H);
      r(-10, -70 + o, 6, 8, H);
      r(-16, -72 + o, 6, 18, H);
      r(-11, -72 + o, 2, 4, '#222222');
    }
    r(-4, -75 + o, 7, 1, HL);
    return;
  }

  r(-10, -73 + o, 20, 24, S);
  r(-11, -70 + o, 22, 17, S);
  r(7, -70 + o, 4, 17, SD);

  if (v.view === 'front') {
    if (a.blink) {
      r(-6 + fs, -60 + o, 3, 1, EYE);
      r(3 + fs, -60 + o, 3, 1, EYE);
    } else {
      r(-6 + fs, -62 + o, 3, 4, EYE);
      r(3 + fs, -62 + o, 3, 4, EYE);
      r(-5 + fs, -62 + o, 1, 1, '#ffffff');
      r(4 + fs, -62 + o, 1, 1, '#ffffff');
    }
    r(-7 + fs, -65 + o, 4, 1, HD);
    r(3 + fs, -65 + o, 4, 1, HD);
    r(0 + fs, -58 + o, 1, 2, SD);
    r(-1 + fs, -55 + o, 3, 1, shade(S, -0.38));
    if (L.extra === 1) {
      for (const ex of [-8, 2]) {
        r(ex + fs, -63 + o, 6, 1, G);
        r(ex + fs, -57 + o, 6, 1, G);
        r(ex + fs, -63 + o, 1, 7, G);
        r(ex + 5 + fs, -63 + o, 1, 7, G);
      }
      r(-2 + fs, -61 + o, 4, 1, G);
    } else if (L.extra === 2) {
      r(-10, -57 + o, 20, 7, H);
      r(-8, -51 + o, 16, 3, H);
      r(-2 + fs, -55 + o, 5, 1, '#2a1a14');
    }
    if (st === 0) {
      r(-11, -76 + o, 22, 7, H);
      r(-11, -70 + o, 3, 7, H);
      r(8, -70 + o, 3, 7, H);
      r(-8, -70 + o, 10, 3, H);
    } else if (st === 1) {
      r(-11, -76 + o, 22, 7, H);
      r(-12, -70 + o, 4, 27, H);
      r(8, -70 + o, 4, 27, H);
      r(-9, -70 + o, 13, 3, H);
    } else if (st === 2) {
      r(-12, -78 + o, 24, 9, H);
      r(-11, -81 + o, 4, 3, H);
      r(-5, -83 + o, 4, 5, H);
      r(1, -82 + o, 4, 4, H);
      r(7, -80 + o, 4, 3, H);
      r(-12, -70 + o, 3, 10, H);
      r(9, -70 + o, 3, 10, H);
      r(-9, -70 + o, 4, 5, H);
      r(-4, -70 + o, 3, 4, H);
      r(2, -70 + o, 4, 6, H);
    } else {
      r(-11, -76 + o, 22, 7, H);
      r(-11, -70 + o, 3, 8, H);
      r(8, -70 + o, 3, 8, H);
      r(-8, -70 + o, 9, 3, H);
      r(10, -72 + o, 4, 16, HD);
    }
    r(-6, -75 + o, 6, 1, HL);
    return;
  }

  // costas
  if (st === 0) r(-11, -76 + o, 22, 21, H);
  else if (st === 1) r(-12, -76 + o, 24, 34, H);
  else if (st === 2) {
    r(-12, -78 + o, 24, 23, H);
    r(-11, -81 + o, 4, 3, H);
    r(-5, -83 + o, 4, 5, H);
    r(1, -82 + o, 4, 4, H);
    r(7, -80 + o, 4, 3, H);
    r(-12, -57 + o, 4, 3, H);
    r(-2, -57 + o, 4, 3, H);
    r(6, -57 + o, 4, 3, H);
  } else {
    r(-11, -76 + o, 22, 19, H);
    r(-3, -66 + o, 6, 24, H);
    r(-3, -67 + o, 6, 2, '#222222');
  }
  r(-6, -75 + o, 8, 1, HL);
  r(4, -74 + o, 6, 14, HD);
}

type Rect = [number, number, number, number, string];

function collect(look: AvatarLook, dir: number, headDir: number, a: AvatarAnim, headOnly = false): Rect[] {
  const bv = VIEWS[((dir % 8) + 8) % 8];
  const hv = VIEWS[((headDir % 8) + 8) % 8];
  const rects: Rect[] = [];
  const push =
    (mirror: boolean): R =>
    (x, y, w, h, c) =>
      rects.push([mirror ? -(x + w) : x, y, w, h, c]);
  const sit = a.pose === 'sit';
  const drop = sit ? 22 : 0;
  const bob = (a.pose === 'walk' && a.frame % 2 === 1 ? -1 : 0) + (a.dance && a.frame % 2 === 1 ? -2 : 0);
  if (!headOnly) bodyRects(look, bv, a, push(bv.mirror), drop, bob);
  headRects(look, hv, a, push(hv.mirror), drop + bob);
  return rects;
}

/** A grade do desenho tem 84 px de altura; no tabuleiro o boneco vai a 1,80 m, como os personagens (104 px). */
const GRADE_ALTURA = 84;
export const PIXEL_AVATAR_HEIGHT = 104;
const ESCALA = PIXEL_AVATAR_HEIGHT / GRADE_ALTURA;

/** Desenha o avatar com os pés em (x, y). */
export function drawPixelAvatar(
  ctx: CanvasRenderingContext2D,
  look: AvatarLook,
  x: number,
  y: number,
  dir: number,
  headDir: number,
  a: AvatarAnim,
  alpha = 1,
) {
  const rects = collect(look, dir, headDir, a);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(ESCALA, ESCALA);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(14,9,10,0.92)';
  for (const [rx, ry, w, h] of rects) ctx.fillRect(rx - 1, ry - 1, w + 2, h + 2);
  for (const [rx, ry, w, h, c] of rects) {
    ctx.fillStyle = c;
    ctx.fillRect(rx, ry, w, h);
  }
  ctx.restore();
}

/** Só a cabeça (ícone de balão), com o centro do rosto em (x, y). */
export function drawPixelHead(ctx: CanvasRenderingContext2D, look: AvatarLook, x: number, y: number, scale = 1) {
  const rects = collect(look, 3, 3, { pose: 'stand', frame: 0, wave: false, dance: false, blink: false }, true);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  ctx.translate(0, 62);
  ctx.fillStyle = 'rgba(14,9,10,0.92)';
  for (const [rx, ry, w, h] of rects) ctx.fillRect(rx - 1, ry - 1, w + 2, h + 2);
  for (const [rx, ry, w, h, c] of rects) {
    ctx.fillStyle = c;
    ctx.fillRect(rx, ry, w, h);
  }
  ctx.restore();
}

