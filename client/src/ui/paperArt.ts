/**
 * Papel envelhecido procedural, desenhado em canvas: borda rasgada irregular,
 * bordas queimadas/encardidas, amassado com luz, manchas, fibras, pintinhas,
 * vincos, canto dobrado e folhas por trás. Tudo em "px de design" (a tela de
 * referência tem 1536×1024); `k` converte para px de CSS.
 */

type Pt = [number, number];
export type Corner = 'tl' | 'tr' | 'br' | 'bl';

export interface Back {
  dx: number;
  dy: number;
  rot: number;
  dw?: number;
  dh?: number;
  tone?: string;
}

export interface PaperOpts {
  seed: number;
  /** cor base do papel */
  tone?: string;
  /** 0..1: escurecimento das bordas */
  burn?: number;
  /** amplitude da borda rasgada (px de design) */
  torn?: number;
  /** 0..1: relevo de papel amassado */
  crumple?: number;
  stains?: number;
  /** densidade de pintinhas/sujeira */
  specks?: number;
  creases?: number;
  /** papel quadriculado: tamanho da célula (px de design) */
  grid?: number;
  /** pautado: distância entre linhas (px de design) */
  ruled?: number;
  curl?: Corner;
  curlSize?: number;
  /** aba de ficha no topo esquerdo */
  tab?: { w: number; h: number };
  backs?: Back[];
  /** 0..1 */
  shadow?: number;
  /** faixa pintada na base (cartão do personagem) */
  stripe?: string;
  /** margem do canvas em volta do papel (px de design) */
  pad?: number;
}

export interface BrushOpts {
  seed: number;
  color: string;
  /** ponta de seta à direita */
  arrow?: boolean;
  alpha?: number;
}

// ------------------------------------------------------------------ util

function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise1(rnd: () => number) {
  const n = 256;
  const v = Float32Array.from({ length: n }, rnd);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = v[((i % n) + n) % n];
    const b = v[(((i + 1) % n) + n) % n];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

function noise2(rnd: () => number, size = 64) {
  const v = Float32Array.from({ length: size * size }, rnd);
  const g = (i: number, j: number) => v[(((j % size) + size) % size) * size + (((i % size) + size) % size)];
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);
    const a = g(xi, yi);
    const b = g(xi + 1, yi);
    const c = g(xi, yi + 1);
    const d = g(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function hexRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.replace(/./g, (c) => c + c) : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

function mkCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

let grainTile: HTMLCanvasElement | null = null;
/** ruído fino (tile) para o grão do papel */
function grain() {
  if (grainTile) return grainTile;
  const s = 192;
  const c = mkCanvas(s, s);
  const g = c.getContext('2d')!;
  const img = g.createImageData(s, s);
  const r = rng(77);
  for (let i = 0; i < img.data.length; i += 4) {
    let v = 128 + (r() - 0.5) * 70;
    if (r() < 0.015) v -= 50;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

// ------------------------------------------------------------------ forma

/** Retângulo base (sentido horário), com corte do canto dobrado e aba. */
function basePoly(W: number, H: number, o: PaperOpts, k: number): Pt[] {
  const cs = (o.curlSize ?? 30) * k;
  const tab = o.tab ? { w: o.tab.w * k, h: o.tab.h * k } : null;
  const pts: Pt[] = [];
  // topo
  if (o.curl === 'tl') pts.push([0, cs], [cs, 0]);
  else pts.push([0, 0]);
  if (tab) {
    pts.push([tab.w, 0], [tab.w + tab.h * 0.28, tab.h]);
  }
  const top = tab ? tab.h : 0;
  if (o.curl === 'tr') pts.push([W - cs, top], [W, top + cs]);
  else pts.push([W, top]);
  if (o.curl === 'br') pts.push([W, H - cs], [W - cs, H]);
  else pts.push([W, H]);
  if (o.curl === 'bl') pts.push([cs, H], [0, H - cs]);
  else pts.push([0, H]);
  return pts;
}

/** Contorno rasgado: desloca pontos da borda para dentro com ruído + mordidas. */
function tornPoly(base: Pt[], rnd: () => number, amp: number, k: number): Pt[] {
  const n1 = noise1(rnd);
  const step = Math.max(1.2, 2.2 * k);
  // mordidas ao longo do perímetro
  let per = 0;
  for (let i = 0; i < base.length; i++) {
    const a = base[i];
    const b = base[(i + 1) % base.length];
    per += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const bites: { p: number; w: number; d: number }[] = [];
  const nb = Math.round(per / (70 * k));
  for (let i = 0; i < nb; i++) bites.push({ p: rnd() * per, w: (3 + rnd() * 12) * k, d: amp * (0.6 + rnd() * 1.6) });
  const edge = (p: number) => {
    const q = p / k;
    let d = amp * (0.3 * n1(q / 48) + 0.34 * n1(q / 14 + 40) + 0.36 * n1(q / 4 + 90));
    for (const b of bites) {
      const t = (p - b.p) / b.w;
      if (t > -3 && t < 3) d += b.d * Math.exp(-t * t);
    }
    return d + rnd() * 0.45 * k;
  };
  const out: Pt[] = [];
  let p0 = 0;
  for (let i = 0; i < base.length; i++) {
    const a = base[i];
    const b = base[(i + 1) % base.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.5) continue;
    const dx = (b[0] - a[0]) / L;
    const dy = (b[1] - a[1]) / L;
    const nx = -dy;
    const ny = dx;
    for (let s = 0; s < L; s += step) {
      const d = edge(p0 + s);
      out.push([a[0] + dx * s + nx * d, a[1] + dy * s + ny * d]);
    }
    p0 += L;
  }
  return out;
}

function toPath(pts: Pt[]) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

/** Sombra interna (o preenchimento fica fora do recorte; só a sombra entra). */
function innerShadow(ctx: CanvasRenderingContext2D, path: Path2D, W: number, H: number, blur: number, color: string) {
  ctx.save();
  ctx.clip(path);
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  const big = new Path2D();
  big.rect(-W * 2, -H * 2, W * 5, H * 5);
  big.addPath(path);
  ctx.fillStyle = color;
  ctx.fill(big, 'evenodd');
  ctx.restore();
}

// ------------------------------------------------------------------ amassado

function crumpleCanvas(W: number, H: number, cell: number, rnd: () => number) {
  const gw = Math.max(6, Math.ceil(W / cell) + 3);
  const gh = Math.max(6, Math.ceil(H / cell) + 3);
  const n = noise2(rnd, 64);
  const ht = new Float32Array(gw * gh);
  const ox = rnd() * 60;
  const oy = rnd() * 60;
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      let v = 0;
      let amp = 1;
      let f = 1 / 8;
      let tot = 0;
      for (let o = 0; o < 4; o++) {
        const s = n(x * f + ox + o * 17, y * f + oy + o * 11);
        v += amp * (1 - Math.abs(2 * s - 1));
        tot += amp;
        amp *= 0.52;
        f *= 2.05;
      }
      ht[y * gw + x] = v / tot;
    }
  const c = mkCanvas(gw, gh);
  const g = c.getContext('2d')!;
  const img = g.createImageData(gw, gh);
  const at = (x: number, y: number) => ht[Math.min(gh - 1, Math.max(0, y)) * gw + Math.min(gw - 1, Math.max(0, x))];
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      const s = Math.max(-1, Math.min(1, (-dx * 0.75 - dy * 0.65) * 5.5));
      const v = 128 + s * 118;
      const i = (y * gw + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return { c, gw, gh };
}

/** Manchas de aquarela: campo de ruído com limiar, interior suave e borda marcada. */
function stainCanvas(W: number, H: number, cell: number, rnd: () => number, color: [number, number, number], strength: number, thr: number) {
  const gw = Math.max(6, Math.ceil(W / cell) + 3);
  const gh = Math.max(6, Math.ceil(H / cell) + 3);
  const n = noise2(rnd, 64);
  const ox = rnd() * 60;
  const oy = rnd() * 60;
  const c = mkCanvas(gw, gh);
  const g = c.getContext('2d')!;
  const img = g.createImageData(gw, gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const v = 0.55 * n(x / 11 + ox, y / 11 + oy) + 0.3 * n(x / 4.5 + ox + 9, y / 4.5 + oy + 3) + 0.15 * n(x / 1.8 + 30, y / 1.8 + 21);
      const t = Math.min(1, Math.max(0, (v - thr) / 0.14));
      const inner = t * t * (3 - 2 * t);
      const rim = Math.exp(-(((v - thr - 0.015) / 0.022) ** 2));
      const a = Math.min(1, inner * 0.55 + rim * 0.5) * strength;
      const i = (y * gw + x) * 4;
      img.data[i] = color[0];
      img.data[i + 1] = color[1];
      img.data[i + 2] = color[2];
      img.data[i + 3] = Math.round(a * 255);
    }
  g.putImageData(img, 0, 0);
  return { c, gw, gh };
}

// ------------------------------------------------------------------ papel

const DEF_TONE = '#d3bfab';

function paperBody(ctx: CanvasRenderingContext2D, W: number, H: number, k: number, dpr: number, o: PaperOpts, rnd: () => number, detail: number) {
  const tone = hexRgb(o.tone ?? DEF_TONE);
  const dark: [number, number, number] = [96, 72, 44];
  const burn = o.burn ?? 0.6;
  const base = basePoly(W, H, o, k);
  const pts = tornPoly(base, rnd, (o.torn ?? 2) * k, k);
  const path = toPath(pts);
  const sh = o.shadow ?? 1;

  // sombra no fundo
  if (sh > 0) {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.55 * sh})`;
    ctx.shadowBlur = 16 * k * dpr;
    ctx.shadowOffsetY = 6 * k * dpr;
    ctx.shadowOffsetX = 1.5 * k * dpr;
    ctx.fillStyle = rgba(tone, 1);
    ctx.fill(path);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.5 * sh})`;
    ctx.shadowBlur = 2.5 * k * dpr;
    ctx.shadowOffsetY = 1.2 * k * dpr;
    ctx.fillStyle = rgba(tone, 1);
    ctx.fill(path);
    ctx.restore();
  }

  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = rgba(tone, 1);
  ctx.fillRect(0, 0, W, H);

  // luz geral (centro um pouco mais claro, bordas mais escuras)
  const lg = ctx.createRadialGradient(W * (0.35 + rnd() * 0.3), H * (0.3 + rnd() * 0.3), 0, W / 2, H / 2, Math.max(W, H) * 0.8);
  lg.addColorStop(0, 'rgba(255,248,238,0.12)');
  lg.addColorStop(0.6, 'rgba(255,248,238,0)');
  lg.addColorStop(1, rgba(mix(tone, dark, 0.55), 0.3));
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);

  // manchas grandes e suaves
  const nb = Math.round(((W * H) / (70 * 70 * k * k)) * 0.8 * detail) + 4;
  for (let i = 0; i < nb; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = (16 + rnd() * 80) * k;
    const d = rnd() < 0.75;
    const c: [number, number, number] = d ? (rnd() < 0.5 ? [120, 96, 72] : [104, 96, 90]) : [246, 236, 222];
    const a = d ? 0.02 + rnd() * 0.05 : 0.04 + rnd() * 0.06;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(0.6, rgba(c, a * 0.5));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // manchas de aquarela (sujeira de uso)
  const stn = o.stains ?? 2;
  if (stn > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const big = stainCanvas(W, H, 4 * k, rnd, [124, 98, 72], 0.22 * Math.min(2, stn / 2), 0.6);
    ctx.drawImage(big.c, -4 * k, -4 * k, big.gw * 4 * k, big.gh * 4 * k);
    const small = stainCanvas(W, H, 2 * k, rnd, [108, 82, 58], 0.17 * Math.min(2, stn / 2), 0.66);
    ctx.drawImage(small.c, -2 * k, -2 * k, small.gw * 2 * k, small.gh * 2 * k);
    ctx.restore();
  }

  // quadriculado / pautado (antes do amassado, para ele marcar as linhas)
  if (o.grid) {
    const g = o.grid * k;
    const x0 = 6 * k;
    for (let i = 0, x = x0; x < W; i++, x += g) {
      ctx.fillStyle = i % 5 === 0 ? 'rgba(92,108,132,0.28)' : 'rgba(92,108,132,0.17)';
      ctx.fillRect(x, 0, i % 5 === 0 ? 1.1 * k : 0.75 * k, H);
    }
    for (let i = 0, y = x0; y < H; i++, y += g) {
      ctx.fillStyle = i % 5 === 0 ? 'rgba(92,108,132,0.28)' : 'rgba(92,108,132,0.17)';
      ctx.fillRect(0, y, W, i % 5 === 0 ? 1.1 * k : 0.75 * k);
    }
  }
  if (o.ruled) {
    const g = o.ruled * k;
    for (let y = g; y < H - 4 * k; y += g) {
      ctx.fillStyle = 'rgba(70,58,46,0.16)';
      ctx.fillRect(0, y, W, 0.8 * k);
    }
  }

  // amassado (relevo com luz)
  const cr = o.crumple ?? 0.25;
  if (cr > 0) {
    const cell = 7 * k;
    const m = crumpleCanvas(W, H, cell, rnd);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(1, cr * 0.4);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(m.c, -cell, -cell, m.gw * cell, m.gh * cell);
    ctx.restore();
  }

  // vincos
  const nc = o.creases ?? (W * H > 60000 * k * k ? 2 : 1);
  for (let i = 0; i < nc; i++) {
    const vert = rnd() < 0.5;
    const pos = (0.25 + rnd() * 0.5) * (vert ? W : H);
    const tilt = (rnd() - 0.5) * 0.12 * (vert ? H : W);
    const seg = 14;
    const line: Pt[] = [];
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      const j = (rnd() - 0.5) * 1.6 * k;
      line.push(vert ? [pos + tilt * (t - 0.5) + j, t * H] : [t * W, pos + tilt * (t - 0.5) + j]);
    }
    const stroke = (dx: number, dy: number, color: string, w: number) => {
      ctx.beginPath();
      line.forEach(([x, y], s) => (s ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.stroke();
    };
    stroke(0, 0, 'rgba(92,70,46,0.13)', 1 * k);
    stroke(vert ? 1 * k : 0, vert ? 0 : 1 * k, 'rgba(255,250,240,0.2)', 0.9 * k);
  }

  // riscos finos
  const nsc = Math.round(((W * H) / (140 * 140 * k * k)) * detail);
  for (let i = 0; i < nsc; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const len = (8 + rnd() * 30) * k;
    const a = rnd() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.strokeStyle = `rgba(90,70,52,${0.05 + rnd() * 0.08})`;
    ctx.lineWidth = 0.6 * k;
    ctx.stroke();
  }

  // grão
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = ctx.createPattern(grain(), 'repeat')!;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // fibras
  const nf = Math.round(((W * H) / (34 * 34 * k * k)) * detail);
  ctx.lineCap = 'round';
  for (let i = 0; i < nf; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const len = (2 + rnd() * 7) * k;
    const a = rnd() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * len * 0.5, y + Math.sin(a + 0.6) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.strokeStyle = rnd() < 0.5 ? 'rgba(255,248,238,0.12)' : 'rgba(92,72,50,0.08)';
    ctx.lineWidth = 0.5 * k;
    ctx.stroke();
  }

  // pintinhas e sujeira
  const sp = Math.round(((W * H) / (34 * 34 * k * k)) * (o.specks ?? 1) * detail);
  for (let i = 0; i < sp; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = (0.25 + Math.pow(rnd(), 3) * 1.5) * k;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(58,44,32,${0.12 + rnd() * 0.42})`;
    ctx.fill();
  }

  // encardido irregular nas bordas
  if (burn > 0) {
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      acc += 1;
      if (acc < 10 + rnd() * 16) continue;
      acc = 0;
      const [x, y] = pts[i];
      const r = (5 + rnd() * 24) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = (0.06 + rnd() * 0.22) * burn;
      g.addColorStop(0, rgba([88, 64, 38], a));
      g.addColorStop(1, rgba([88, 64, 38], 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // cantos gastos
    for (const [cx, cy] of [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
    ] as Pt[]) {
      const r = (20 + rnd() * 30) * k;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rgba([80, 58, 34], 0.32 * burn));
      g.addColorStop(1, rgba([80, 58, 34], 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    innerShadow(ctx, path, W, H, 26 * k * dpr, rgba([110, 80, 52], 0.44 * burn));
    innerShadow(ctx, path, W, H, 8 * k * dpr, rgba([96, 68, 42], 0.52 * burn));
    innerShadow(ctx, path, W, H, 2 * k * dpr, rgba([62, 44, 28], 0.7 * burn));
  }

  // faixa pintada (cartão do personagem)
  if (o.stripe) {
    const sc = hexRgb(o.stripe);
    const sh2 = 8 * k;
    const n1 = noise1(rnd);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 2 * k) ctx.lineTo(x, H - sh2 + (n1(x / (7 * k)) - 0.5) * 3 * k);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = rgba(sc, 0.92);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ctx.createPattern(grain(), 'repeat')!;
    ctx.fillRect(0, H - sh2 - 3 * k, W, sh2 + 3 * k);
    ctx.restore();
  }
  ctx.restore();

  // fio da borda
  ctx.strokeStyle = 'rgba(52,38,26,0.55)';
  ctx.lineWidth = 0.8 * k;
  ctx.stroke(path);

  // canto dobrado
  if (o.curl) drawCurl(ctx, W, H, k, dpr, o.curl, (o.curlSize ?? 30) * k, (o.tab?.h ?? 0) * k, tone);
  return path;
}

function drawCurl(ctx: CanvasRenderingContext2D, W: number, H: number, k: number, dpr: number, corner: Corner, cs: number, top: number, tone: [number, number, number]) {
  ctx.save();
  // leva o canto para baixo-direita
  if (corner === 'bl') (ctx.translate(W, 0), ctx.scale(-1, 1));
  else if (corner === 'tr') (ctx.translate(0, H + top), ctx.scale(1, -1));
  else if (corner === 'tl') (ctx.translate(W, H), ctx.scale(-1, -1));
  const A: Pt = [W - cs, H];
  const B: Pt = [W, H - cs];
  const T: Pt = [W - cs * 0.9, H - cs * 0.86];
  const flap = new Path2D();
  flap.moveTo(A[0], A[1]);
  flap.quadraticCurveTo(W - cs * 1.02, H - cs * 0.35, T[0], T[1]);
  flap.quadraticCurveTo(W - cs * 0.4, H - cs * 1.02, B[0], B[1]);
  flap.quadraticCurveTo(W - cs * 0.45, H - cs * 0.45, A[0], A[1]);
  flap.closePath();
  ctx.save();
  ctx.shadowColor = 'rgba(30,18,8,0.5)';
  ctx.shadowBlur = 7 * k * dpr;
  ctx.shadowOffsetX = -2.5 * k * dpr;
  ctx.shadowOffsetY = -2.5 * k * dpr;
  ctx.fillStyle = rgba(tone, 1);
  ctx.fill(flap);
  ctx.restore();
  const g = ctx.createLinearGradient(W - cs * 0.3, H - cs * 0.3, T[0], T[1]);
  g.addColorStop(0, rgba(mix(tone, [70, 52, 32], 0.45), 1));
  g.addColorStop(0.35, rgba(mix(tone, [255, 252, 244], 0.25), 1));
  g.addColorStop(1, rgba(mix(tone, [255, 252, 244], 0.45), 1));
  ctx.fillStyle = g;
  ctx.fill(flap);
  ctx.save();
  ctx.clip(flap);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = ctx.createPattern(grain(), 'repeat')!;
  ctx.fillRect(W - cs * 1.1, H - cs * 1.1, cs * 1.2, cs * 1.2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(70,50,30,0.45)';
  ctx.lineWidth = 0.8 * k;
  ctx.stroke(flap);
  ctx.restore();
}

/** Desenha papel (com folhas de trás) com origem no canto do papel. */
export function drawPaper(ctx: CanvasRenderingContext2D, W: number, H: number, k: number, dpr: number, o: PaperOpts) {
  const rnd = rng(o.seed);
  for (const [i, b] of (o.backs ?? []).entries()) {
    const bw = W + (b.dw ?? 0) * k;
    const bh = H + (b.dh ?? 0) * k;
    ctx.save();
    ctx.translate(W / 2 + b.dx * k, H / 2 + b.dy * k);
    ctx.rotate((b.rot * Math.PI) / 180);
    ctx.translate(-bw / 2, -bh / 2);
    paperBody(ctx, bw, bh, k, dpr, { seed: o.seed * 31 + i * 7 + 3, tone: b.tone ?? '#c9bda8', burn: (o.burn ?? 0.6) + 0.25, torn: (o.torn ?? 2.6) * 1.1, crumple: 0.5, stains: 1, creases: 0, shadow: 0.8 }, rng(o.seed * 13 + i), 0.5);
    ctx.restore();
  }
  paperBody(ctx, W, H, k, dpr, o, rnd, 1);
}

// ------------------------------------------------------------------ pincel

/** Faixa de pincel (marca-texto vermelho da cena atual). */
export function drawBrush(ctx: CanvasRenderingContext2D, W: number, H: number, k: number, o: BrushOpts) {
  const rnd = rng(o.seed);
  const c = hexRgb(o.color);
  const tip = o.arrow ? H * 0.5 : 0;
  const n = Math.max(6, Math.round(H / (1.4 * k)));
  const n1 = noise1(rnd);
  // corpo da pincelada: contorno irregular
  const body: Pt[] = [];
  const top = 2 * k;
  const bot = H - 2 * k;
  for (let x = 2 * k; x <= W - tip - 2 * k; x += 3 * k) body.push([x, top + (n1(x / (9 * k)) - 0.3) * 3 * k]);
  if (o.arrow) {
    body.push([W - tip, top + k], [W - 1 * k, H / 2 + (rnd() - 0.5) * 2 * k], [W - tip, bot - k]);
  }
  for (let x = W - tip - 2 * k; x >= 2 * k; x -= 3 * k) body.push([x, bot + (n1(x / (8 * k) + 50) - 0.7) * 3 * k]);
  for (let y = bot; y >= top; y -= 3 * k) body.push([(n1(y / (4 * k) + 90) * 5 + rnd() * 2) * k, y]);
  ctx.fillStyle = rgba(c, (o.alpha ?? 0.85) * 0.78);
  ctx.fill(toPath(body));
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const y = t * H + (rnd() - 0.5) * k;
    const edge = Math.abs(t - 0.5) * 2; // 0 no meio, 1 nas bordas
    const x0 = (1 + rnd() * 7) * k + edge * edge * 6 * k;
    const x1 = W - tip * edge - (rnd() * 5 + (o.arrow ? 1 : 3)) * k;
    const a = (o.alpha ?? 0.85) * (0.12 + rnd() * 0.3) * (1 - Math.pow(edge, 6) * 0.7);
    ctx.beginPath();
    const seg = 10;
    for (let s = 0; s <= seg; s++) {
      const x = x0 + ((x1 - x0) * s) / seg;
      const yy = y + (n1(x / (30 * k) + i * 3.1) - 0.5) * 1.6 * k;
      if (s) ctx.lineTo(x, yy);
      else ctx.moveTo(x, yy);
    }
    ctx.strokeStyle = rnd() < 0.5 ? rgba(mix(c, [255, 236, 226], 0.25), a) : rgba(mix(c, [120, 30, 24], 0.3), a);
    ctx.lineWidth = (H / n) * (0.8 + rnd() * 0.8);
    ctx.stroke();
  }
  // falhas de pincel seco
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < W / (14 * k); i++) {
    const x = rnd() * W * 0.9;
    const y = rnd() * H;
    ctx.fillStyle = `rgba(0,0,0,${0.08 + rnd() * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(x, y, (2 + rnd() * 9) * k, (0.3 + rnd() * 0.7) * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = ctx.createPattern(grain(), 'repeat')!;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------------ texturas para CSS

let texCache: { paper: string; dark: string; wood: string } | null = null;

function noiseLayer(g: CanvasRenderingContext2D, S: number, rnd: () => number, dark: [number, number, number], light: [number, number, number], ad: number, al: number) {
  const img = g.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = rnd();
    const c = n < 0.5 ? dark : light;
    const a = n < 0.5 ? (0.5 - n) * 2 * ad : (n - 0.5) * 2 * al;
    img.data[i] = c[0];
    img.data[i + 1] = c[1];
    img.data[i + 2] = c[2];
    img.data[i + 3] = Math.round(a * 255);
  }
  const t = mkCanvas(S, S);
  t.getContext('2d')!.putImageData(img, 0, 0);
  g.drawImage(t, 0, 0);
}

/** Texturas (data URL): sobreposição de papel, fundo escuro encardido e couro/madeira. */
export function textures() {
  if (texCache) return texCache;
  const S = 512;
  // papel: manchas + grão + fibras, fundo transparente (vai por cima de uma cor)
  const p = mkCanvas(S, S);
  const g = p.getContext('2d')!;
  const rnd = rng(901);
  g.imageSmoothingEnabled = true;
  const a = stainCanvas(S, S, 4, rnd, [118, 98, 80], 0.2, 0.6);
  g.drawImage(a.c, -4, -4, a.gw * 4, a.gh * 4);
  const b = stainCanvas(S, S, 2, rnd, [104, 84, 64], 0.14, 0.66);
  g.drawImage(b.c, -2, -2, b.gw * 2, b.gh * 2);
  noiseLayer(g, S, rnd, [70, 52, 36], [255, 250, 240], 0.1, 0.08);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.3 + Math.pow(rnd(), 3) * 1.4;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = `rgba(58,44,32,${0.12 + rnd() * 0.35})`;
    g.fill();
  }
  // fundo escuro
  const d = mkCanvas(S, S);
  const dg = d.getContext('2d')!;
  dg.fillStyle = '#121110';
  dg.fillRect(0, 0, S, S);
  const dn = stainCanvas(S, S, 6, rnd, [60, 54, 46], 0.5, 0.52);
  dg.drawImage(dn.c, -6, -6, dn.gw * 6, dn.gh * 6);
  const dn2 = stainCanvas(S, S, 3, rnd, [4, 4, 4], 0.6, 0.55);
  dg.drawImage(dn2.c, -3, -3, dn2.gw * 3, dn2.gh * 3);
  noiseLayer(dg, S, rnd, [0, 0, 0], [120, 110, 98], 0.25, 0.06);
  for (let i = 0; i < 40; i++) {
    dg.beginPath();
    const x = rnd() * S;
    const y = rnd() * S;
    const L = 10 + rnd() * 60;
    const an = rnd() * Math.PI * 2;
    dg.moveTo(x, y);
    dg.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L);
    dg.strokeStyle = `rgba(150,140,125,${0.03 + rnd() * 0.05})`;
    dg.lineWidth = 0.7;
    dg.stroke();
  }
  // couro marrom (quadro atrás do inspetor)
  const w = mkCanvas(S, S);
  const wg = w.getContext('2d')!;
  wg.fillStyle = '#3d2d20';
  wg.fillRect(0, 0, S, S);
  const wn = stainCanvas(S, S, 5, rnd, [92, 70, 50], 0.45, 0.55);
  wg.drawImage(wn.c, -5, -5, wn.gw * 5, wn.gh * 5);
  const wn2 = stainCanvas(S, S, 3, rnd, [22, 15, 10], 0.5, 0.58);
  wg.drawImage(wn2.c, -3, -3, wn2.gw * 3, wn2.gh * 3);
  noiseLayer(wg, S, rnd, [10, 6, 3], [160, 130, 100], 0.22, 0.07);
  texCache = { paper: p.toDataURL('image/png'), dark: d.toDataURL('image/jpeg', 0.86), wood: w.toDataURL('image/jpeg', 0.86) };
  return texCache;
}

// ------------------------------------------------------------------ montagem no DOM

type Painter = (ctx: CanvasRenderingContext2D, W: number, H: number, k: number, dpr: number) => void;

interface Mounted {
  el: HTMLElement;
  cv: HTMLCanvasElement;
  pad: number;
  paint: Painter;
  key: string;
  id: string;
}

const mounted = new Map<Element, Mounted>();
const cache = new Map<string, HTMLCanvasElement>();
let queued = false;
const pending = new Set<Mounted>();

const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((es) => es.forEach((e) => queue(mounted.get(e.target)))) : null;

/** px de CSS por px de design (1rem = 10 px de design) */
export function designScale() {
  return (parseFloat(getComputedStyle(document.documentElement).fontSize) || 10) / 10;
}

function queue(m: Mounted | undefined) {
  if (!m) return;
  pending.add(m);
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    const list = [...pending];
    pending.clear();
    for (const x of list) render(x);
  });
}

function render(m: Mounted) {
  if (!m.el.isConnected) {
    ro?.unobserve(m.el);
    mounted.delete(m.el);
    return;
  }
  const W = m.el.offsetWidth;
  const H = m.el.offsetHeight;
  if (W < 2 || H < 2) return;
  const k = designScale();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pad = m.pad * k;
  const key = `${W}x${H}@${dpr}|${k.toFixed(3)}|${m.id}`;
  if (key === m.key) return;
  m.key = key;
  const cw = Math.round((W + pad * 2) * dpr);
  const ch = Math.round((H + pad * 2) * dpr);
  let src = cache.get(key);
  if (!src) {
    src = mkCanvas(cw, ch);
    const ctx = src.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
    m.paint(ctx, W, H, k, dpr);
    cache.set(key, src);
    if (cache.size > 70) cache.delete(cache.keys().next().value as string);
  }
  m.cv.width = cw;
  m.cv.height = ch;
  m.cv.getContext('2d')!.drawImage(src, 0, 0);
}

function mount(el: HTMLElement, pad: number, id: string, paint: Painter) {
  const old = mounted.get(el);
  if (old) old.cv.remove();
  const cv = document.createElement('canvas');
  cv.className = 'paper-cv';
  cv.setAttribute('aria-hidden', 'true');
  const r = pad / 10;
  cv.style.left = cv.style.top = `-${r}rem`;
  cv.style.width = cv.style.height = `calc(100% + ${2 * r}rem)`;
  el.prepend(cv);
  el.classList.add('papered');
  const m: Mounted = { el, cv, pad, paint, key: '', id };
  mounted.set(el, m);
  ro?.observe(el);
  queue(m);
  return cv;
}

/** Transforma o elemento numa folha de papel (canvas atrás do conteúdo). */
export function paperize(el: HTMLElement, o: PaperOpts) {
  const backPad = Math.max(0, ...(o.backs ?? []).map((b) => Math.max(Math.abs(b.dx), Math.abs(b.dy)) + Math.max(Math.abs(b.dw ?? 0), Math.abs(b.dh ?? 0)) / 2 + 6));
  const pad = o.pad ?? Math.max(26, backPad + 20);
  return mount(el, pad, `p${JSON.stringify(o)}`, (ctx, W, H, k, dpr) => drawPaper(ctx, W, H, k, dpr, o));
}

/** Pincelada atrás do elemento. */
export function brushize(el: HTMLElement, o: BrushOpts) {
  return mount(el, 0, `b${JSON.stringify(o)}`, (ctx, W, H, k) => drawBrush(ctx, W, H, k, o));
}

/** Tira o papel/pincel desenhado de um elemento. */
export function unpaint(el: HTMLElement) {
  const m = mounted.get(el);
  if (!m) return;
  m.cv.remove();
  mounted.delete(el);
  ro?.unobserve(el);
  el.classList.remove('papered');
}

/** Redesenha tudo (mudou a escala da tela). */
export function repaintAll() {
  for (const m of mounted.values()) {
    m.key = '';
    queue(m);
  }
}
