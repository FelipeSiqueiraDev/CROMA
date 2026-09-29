import type { AnimKey, CharacterDef, DirKey } from '@croma/shared';

/** Quadro pronto para desenhar. w/h/ax/ay em pixels de mundo (zoom 1). */
export interface SpriteFrame {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  /** âncora (pés) dentro do quadro */
  ax: number;
  ay: number;
}

export interface LoadedChar {
  /** chave "anim:dir", ex.: "idle:sw", "walk:ne" */
  frames: Record<string, SpriteFrame[]>;
  /** folha já sem fundo, para pré-visualização */
  sheet: HTMLCanvasElement;
}

/** Superamostragem para ficar nítido no zoom 2 / telas retina. */
const RES = 2.5;

/** dir do jogo (0..7) → linha da folha. As folhas têm 4 direções diagonais. */
const DIR_TO_KEY: DirKey[] = ['ne', 'se', 'se', 'sw', 'sw', 'sw', 'nw', 'ne'];
const FALLBACK: Record<DirKey, DirKey[]> = {
  se: ['sw', 'ne', 'nw'],
  sw: ['se', 'nw', 'ne'],
  ne: ['nw', 'se', 'sw'],
  nw: ['ne', 'sw', 'se'],
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Falha ao carregar ' + src));
    img.src = src;
  });
}

/**
 * Remove o fundo (normalmente branco) por flood fill a partir das bordas,
 * sem apagar partes claras do personagem que estão cercadas pelo contorno.
 */
export function removeBackground(img: ImageData) {
  const { width: w, height: h, data: d } = img;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  if (corners.filter((i) => d[i * 4 + 3] < 16).length >= 3) return; // já tem transparência
  const bg = [0, 0, 0];
  for (const i of corners) for (let k = 0; k < 3; k++) bg[k] += d[i * 4 + k] / 4;
  const diff = (i: number) => {
    const p = i * 4;
    return Math.abs(d[p] - bg[0]) + Math.abs(d[p + 1] - bg[1]) + Math.abs(d[p + 2] - bg[2]);
  };
  const N = w * h;
  const mask = new Uint8Array(N);
  const stack = new Int32Array(N);
  let sp = 0;
  const TOL = 66;
  const tryPush = (i: number) => {
    if (!mask[i] && diff(i) <= TOL) {
      mask[i] = 1;
      stack[sp++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    tryPush(x);
    tryPush((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    tryPush(y * w);
    tryPush(y * w + w - 1);
  }
  while (sp) {
    const i = stack[--sp];
    const x = i % w;
    if (x > 0) tryPush(i - 1);
    if (x < w - 1) tryPush(i + 1);
    if (i >= w) tryPush(i - w);
    if (i < N - w) tryPush(i + w);
  }
  // Bolsões fechados de fundo puro (entre braço e corpo, por exemplo).
  const seen = new Uint8Array(N);
  const region: number[] = [];
  for (let s = 0; s < N; s++) {
    if (mask[s] || seen[s] || diff(s) > 20) continue;
    region.length = 0;
    seen[s] = 1;
    stack[0] = s;
    sp = 1;
    while (sp) {
      const i = stack[--sp];
      region.push(i);
      const x = i % w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const j of nb) {
        if (j < 0 || j >= N || seen[j] || mask[j] || diff(j) > 20) continue;
        seen[j] = 1;
        stack[sp++] = j;
      }
    }
    if (region.length >= 14) for (const i of region) mask[i] = 1;
  }
  for (let i = 0; i < N; i++) if (mask[i]) d[i * 4 + 3] = 0;
  // Suaviza o halo claro na borda.
  for (let i = 0; i < N; i++) {
    if (mask[i]) continue;
    const x = i % w;
    const edge = (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (i >= w && mask[i - w]) || (i < N - w && mask[i + w]);
    if (!edge) continue;
    const df = diff(i);
    if (df < 150) d[i * 4 + 3] = Math.min(d[i * 4 + 3], Math.round((df / 150) * 255));
  }
}

function scaleCanvas(src: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number) {
  let cur: CanvasImageSource = src;
  let cx = sx;
  let cy = sy;
  let cw = sw;
  let ch = sh;
  // reduz em etapas de no máximo 2x para manter qualidade
  while (cw / 2 > dw && ch / 2 > dh) {
    const tmp = document.createElement('canvas');
    tmp.width = Math.max(1, Math.round(cw / 2));
    tmp.height = Math.max(1, Math.round(ch / 2));
    const t = tmp.getContext('2d')!;
    t.imageSmoothingQuality = 'high';
    t.drawImage(cur, cx, cy, cw, ch, 0, 0, tmp.width, tmp.height);
    cur = tmp;
    cx = 0;
    cy = 0;
    cw = tmp.width;
    ch = tmp.height;
  }
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(dw));
  out.height = Math.max(1, Math.round(dh));
  const o = out.getContext('2d')!;
  o.imageSmoothingQuality = 'high';
  o.drawImage(cur, cx, cy, cw, ch, 0, 0, out.width, out.height);
  return out;
}

async function processCharacter(def: CharacterDef): Promise<LoadedChar> {
  const img = await loadImage(def.sheet);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const sheet = document.createElement('canvas');
  sheet.width = W;
  sheet.height = H;
  const sx = sheet.getContext('2d', { willReadFrequently: true })!;
  sx.drawImage(img, 0, 0);
  const data = sx.getImageData(0, 0, W, H);
  if (def.removeBg) {
    removeBackground(data);
    sx.putImageData(data, 0, 0);
  }
  const d = data.data;
  const cw = W / def.cols;
  const ch = H / def.rows;
  interface Cell {
    row: number;
    col: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    fx: number;
  }
  const cells: Cell[] = [];
  for (let row = 0; row < def.rows; row++)
    for (let col = 0; col < def.cols; col++) {
      const X0 = Math.floor(col * cw);
      const X1 = Math.floor((col + 1) * cw);
      const Y0 = Math.floor(row * ch);
      const Y1 = Math.floor((row + 1) * ch);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -1;
      let y1 = -1;
      for (let y = Y0; y < Y1; y++)
        for (let x = X0; x < X1; x++)
          if (d[(y * W + x) * 4 + 3] > 96) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      if (x1 < 0) continue;
      // pés: média dos pixels opacos na faixa de baixo
      const band = Math.max(2, Math.round((y1 - y0) * 0.08));
      let sum = 0;
      let n = 0;
      for (let y = y1 - band; y <= y1; y++)
        for (let x = x0; x <= x1; x++)
          if (d[(y * W + x) * 4 + 3] > 96) {
            sum += x;
            n++;
          }
      cells.push({ row, col, x0, y0, x1, y1, fx: n ? sum / n : (x0 + x1) / 2 });
    }
  if (!cells.length) throw new Error('Folha vazia');
  // a escala vem só das linhas de idle (sentado é mais baixo)
  const idleCells = cells.filter((c) => (def.anims?.[c.row] ?? 'idle') === 'idle');
  const heights = (idleCells.length ? idleCells : cells).map((c) => c.y1 - c.y0 + 1).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)];
  const s = def.height / median;
  const frames: Record<string, SpriteFrame[]> = {};
  for (let row = 0; row < def.rows; row++) {
    const dir = def.dirs[row];
    const key = `${def.anims?.[row] ?? 'idle'}:${dir}`;
    if (!dir || frames[key]) continue;
    const list: SpriteFrame[] = [];
    for (const c of cells.filter((q) => q.row === row).sort((a, b) => a.col - b.col)) {
      const bw = c.x1 - c.x0 + 1;
      const bh = c.y1 - c.y0 + 1;
      const canvas = scaleCanvas(sheet, c.x0, c.y0, bw, bh, bw * s * RES, bh * s * RES);
      list.push({ canvas, w: bw * s, h: bh * s, ax: (c.fx - c.x0 + 0.5) * s, ay: bh * s });
    }
    if (list.length) frames[key] = list;
  }
  return { frames, sheet };
}

export function spriteKey(def: CharacterDef) {
  return [def.sheet, def.cols, def.rows, def.height, def.removeBg, def.dirs.join(''), (def.anims ?? []).join('')].join('|');
}

class SpriteStore {
  private defs = new Map<number, CharacterDef>();
  private cache = new Map<string, LoadedChar | 'loading' | 'error'>();
  onLoad: (() => void) | null = null;

  setDefs(list: CharacterDef[]) {
    this.defs = new Map(list.map((d) => [d.id, d]));
  }

  def(id: number | null | undefined) {
    return id ? this.defs.get(id) : undefined;
  }

  all() {
    return [...this.defs.values()];
  }

  get(id: number | null | undefined): { def: CharacterDef; lc: LoadedChar } | null {
    const def = this.def(id);
    if (!def) return null;
    const key = spriteKey(def);
    const c = this.cache.get(key);
    if (c && c !== 'loading' && c !== 'error') return { def, lc: c };
    if (!c) {
      this.cache.set(key, 'loading');
      processCharacter(def)
        .then((lc) => {
          this.cache.set(key, lc);
          this.onLoad?.();
        })
        .catch((e) => {
          console.warn('[sprites]', e);
          this.cache.set(key, 'error');
        });
    }
    return null;
  }

  /** Espera carregar (para prévias na interface). */
  async load(def: CharacterDef): Promise<LoadedChar | null> {
    const key = spriteKey(def);
    const c = this.cache.get(key);
    if (c && c !== 'loading' && c !== 'error') return c;
    try {
      const lc = await processCharacter(def);
      this.cache.set(key, lc);
      return lc;
    } catch {
      return null;
    }
  }
}

export const sprites = new SpriteStore();

/** Quadros para a direção e animação; cai para idle e para outra direção se faltar. */
export function framesFor(lc: LoadedChar, dir: number, anim: AnimKey = 'idle'): SpriteFrame[] | null {
  const key = DIR_TO_KEY[((dir % 8) + 8) % 8];
  if (lc.frames[`${anim}:${key}`]?.length) return lc.frames[`${anim}:${key}`];
  if (anim !== 'idle') return null;
  for (const k of [key, ...FALLBACK[key]]) if (lc.frames[`idle:${k}`]?.length) return lc.frames[`idle:${k}`];
  return null;
}

export type SpritePose = 'stand' | 'walk' | 'sit';

/** Desenha o personagem com os pés em (x, y). Retorna a altura desenhada. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  def: CharacterDef,
  lc: LoadedChar,
  dir: number,
  x: number,
  y: number,
  t: number,
  phase: number,
  pose: SpritePose,
  alpha = 1,
): number {
  // linhas próprias de andar/sentar, se a folha tiver
  const own = pose === 'stand' ? null : framesFor(lc, dir, pose);
  const frames = own ?? framesFor(lc, dir);
  if (!frames) return 0;
  let f: SpriteFrame;
  if (own) {
    // animação dedicada: toca os quadros em ordem (andar ~8 qps)
    const fps = pose === 'walk' ? 8 : def.fps;
    f = own[Math.floor((t / 1000 + phase) * fps) % own.length];
  } else {
    const seq = def.sequence.length ? def.sequence : [0];
    const fps = pose === 'walk' ? def.fps * 1.5 : def.fps;
    const idx = seq[Math.floor((t / 1000 + phase) * fps) % seq.length] % frames.length;
    f = frames[idx] ?? frames[0];
  }
  const bob = pose === 'walk' && !own ? -Math.abs(Math.sin((t * Math.PI) / 250)) * 3 : 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (pose === 'sit' && !own) {
    // sem quadro de sentado: abaixa o corpo e esconde as pernas atrás do assento
    const drop = f.h * 0.22;
    ctx.beginPath();
    ctx.rect(x - f.w * 2, y - f.h * 2, f.w * 4, f.h * 2 + 4);
    ctx.clip();
    ctx.drawImage(f.canvas, x - f.ax, y - f.ay + drop, f.w, f.h);
  } else {
    ctx.drawImage(f.canvas, x - f.ax, y - f.ay + bob, f.w, f.h);
  }
  ctx.restore();
  return f.h;
}
