/**
 * Animações da interface: lápis que risca, pincel que pinta, máquina de
 * escrever, carimbo, voo em arco, contadores e inclinação 3D. Tudo com
 * Web Animations / requestAnimationFrame, sem mexer no CSS dos elementos
 * (entradas usam composite 'add', então somam à transformação de base).
 */
import { sfx } from './sfx';

export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** px de CSS por px de design */
const k = () => (parseFloat(getComputedStyle(document.documentElement).fontSize) || 10) / 10;

let layer: HTMLElement | null = null;
/** Camada fixa para efeitos soltos (lápis, pincel, itens voando). */
export function fxLayer(): HTMLElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'fx-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  return layer;
}

function svgEl(html: string): SVGSVGElement {
  const s = document.createElement('span');
  s.innerHTML = html.trim();
  return s.firstElementChild as SVGSVGElement;
}

// ------------------------------------------------------------------ entradas

type From = 'up' | 'down' | 'left' | 'right' | 'drop' | 'pop' | 'fade';

/** Entrada de um elemento novo (soma à transformação que ele já tem). */
export function enter(el: Element, from: From = 'up', delay = 0, dur = 420) {
  if (reduced()) return;
  const d = 1.2 * 10 * k();
  const t: Record<From, string> = {
    up: `translateY(${d}px)`,
    down: `translateY(${-d}px)`,
    left: `translateX(${d}px)`,
    right: `translateX(${-d}px)`,
    drop: `translateY(${-d * 1.6}px) rotate(-2deg)`,
    pop: 'scale(0.6)',
    fade: 'translateY(0)',
  };
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur * 0.8, delay, easing: 'ease-out', fill: 'backwards' });
  el.animate([{ transform: t[from] }, { transform: 'translate(0, 0)' }], {
    duration: dur,
    delay,
    easing: from === 'pop' || from === 'drop' ? 'cubic-bezier(.2,.9,.3,1.35)' : 'cubic-bezier(.2,.8,.2,1)',
    fill: 'backwards',
    composite: 'add',
  });
}

/** Saída: anima e remove. */
export async function leave(el: HTMLElement, to: From = 'fade', dur = 260) {
  if (reduced()) return el.remove();
  const d = 1 * 10 * k();
  const t: Partial<Record<From, string>> = { up: `translateY(${-d}px)`, down: `translateY(${d}px)`, left: `translateX(${-d}px)`, right: `translateX(${d}px)`, pop: 'scale(0.6)', fade: 'translateY(0)' };
  el.style.pointerEvents = 'none';
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in', fill: 'forwards' });
  await el.animate([{ transform: 'translate(0, 0)' }, { transform: t[to] ?? 'translateY(0)' }], { duration: dur, easing: 'ease-in', fill: 'forwards', composite: 'add' }).finished.catch(() => {});
  el.remove();
}

/** Pulinho de destaque (sem trocar classes/animações CSS). */
export function bump(el: Element, scale = 1.06, lift = 1.2) {
  if (reduced()) return;
  const y = -lift * 10 * k();
  el.animate(
    [
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(0, ${y}px) scale(${scale})`, offset: 0.3 },
      { transform: `translate(0, ${y * -0.15}px) scale(${1 - (scale - 1) * 0.3})`, offset: 0.65 },
      { transform: 'translate(0, 0) scale(1)' },
    ],
    { duration: 620, easing: 'ease-out', composite: 'add' },
  );
}

/** Tremidinha (erro, limite estourado). */
export function shake(el: Element, px = 0.35) {
  if (reduced()) return;
  const d = px * 10 * k();
  el.animate([0, -d, d, -d * 0.7, d * 0.5, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 380, easing: 'ease-out', composite: 'add' });
}

// ------------------------------------------------------------------ lápis

function pencilSvg(): SVGSVGElement {
  // deitado com a ponta em (0, 12); o CSS gira pela ponta
  return svgEl(`<svg class="pencil" viewBox="0 0 150 24" aria-hidden="true">
    <defs>
      <linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2574b"/><stop offset=".45" stop-color="#b8312a"/><stop offset=".55" stop-color="#9c241d"/><stop offset="1" stop-color="#6e140f"/></linearGradient>
      <linearGradient id="pcw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d6aa"/><stop offset="1" stop-color="#c79c62"/></linearGradient>
      <linearGradient id="pcf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e7e1"/><stop offset=".5" stop-color="#a7a39a"/><stop offset="1" stop-color="#77736b"/></linearGradient>
      <linearGradient id="pce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3a79d"/><stop offset="1" stop-color="#c46c62"/></linearGradient>
    </defs>
    <path d="M0 12 L24 4.5 L24 19.5 Z" fill="url(#pcw)"/>
    <path d="M0 12 L8 9.5 L8 14.5 Z" fill="#8f1d16"/>
    <rect x="24" y="4.5" width="96" height="15" fill="url(#pcb)"/>
    <path d="M24 9.5 H120 M24 14.5 H120" stroke="#5e110c" stroke-opacity=".35" stroke-width=".8"/>
    <rect x="120" y="4" width="13" height="16" rx="1" fill="url(#pcf)"/>
    <path d="M123 4 V20 M127 4 V20 M131 4 V20" stroke="#5b5850" stroke-width=".8"/>
    <rect x="133" y="4.5" width="15" height="15" rx="3.5" fill="url(#pce)"/>
  </svg>`);
}

/** Um lápis que aparece, segue uma ponta (x,y de tela) e depois sai. */
class Pencil {
  el: SVGSVGElement;
  private angle: number;
  constructor(angle = -38) {
    this.el = pencilSvg();
    this.angle = angle;
    fxLayer().append(this.el);
    const s = k();
    this.el.style.width = `${15 * 10 * s * 0.62}px`;
    this.el.style.height = `${2.4 * 10 * s * 0.62}px`;
  }
  at(x: number, y: number, tilt = 0) {
    this.el.style.transform = `translate(${x}px, ${y - this.el.clientHeight / 2}px) rotate(${this.angle + tilt}deg)`;
  }
  async show(x: number, y: number) {
    this.at(x, y);
    await this.el.animate([{ opacity: 0, translate: '1.4rem -1.8rem' }, { opacity: 1, translate: '0 0' }], { duration: 160, easing: 'ease-out' }).finished.catch(() => {});
  }
  async away() {
    await this.el.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '2.6rem -3.2rem' }], { duration: 260, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    this.el.remove();
  }
}

/** Ponto de um <path> em coordenadas de tela. */
function screenPoint(path: SVGPathElement, len: number) {
  const p = path.getPointAtLength(len);
  const m = path.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

/** Traço à mão: o lápis desenha o <path> (stroke-dash) e sai. */
export async function pencilDraw(path: SVGPathElement, dur = 520) {
  const L = path.getTotalLength();
  path.style.strokeDasharray = `${L}px`;
  path.style.strokeDashoffset = `${L}px`;
  if (reduced()) {
    path.style.strokeDashoffset = '0px';
    return;
  }
  const pen = new Pencil();
  const s0 = screenPoint(path, 0);
  await pen.show(s0.x, s0.y);
  sfx.pencil(dur);
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      // desce rápido, sobe acelerando
      const e = t < 0.3 ? easeOut(t / 0.3) * 0.33 : 0.33 + easeInOut((t - 0.3) / 0.7) * 0.67;
      const l = L * e;
      path.style.strokeDashoffset = `${L - l}px`;
      const p = screenPoint(path, l);
      pen.at(p.x, p.y, Math.sin(t * 9) * 2.5);
      if (t < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
  await pen.away();
}

/** Borracha: esfrega e o traço some, com farelos. */
export async function eraseDraw(path: SVGPathElement, dur = 520) {
  const L = path.getTotalLength();
  if (reduced()) {
    path.style.strokeDasharray = `${L}px`;
    path.style.strokeDashoffset = `${L}px`;
    return;
  }
  const box = path.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const pen = new Pencil(142);
  const s = k();
  // a borracha fica na outra ponta: aponta o lápis para baixo-direita
  const rub = (dx: number) => pen.at(cx + dx - 16 * 10 * s * 0.62 * Math.cos((142 * Math.PI) / 180) * 0.98, cy - 16 * 10 * s * 0.62 * Math.sin((142 * Math.PI) / 180) * 0.98);
  rub(0);
  await pen.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }).finished.catch(() => {});
  sfx.erase(dur);
  const t0 = performance.now();
  await new Promise<void>((done) => {
    let crumbs = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      rub(Math.sin(t * Math.PI * 6) * 0.7 * 10 * s);
      path.style.opacity = String(1 - easeOut(t));
      if (t * 8 > crumbs) {
        crumbs++;
        crumb(cx + (Math.random() - 0.5) * box.width, cy + (Math.random() - 0.3) * box.height);
      }
      if (t < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
  path.style.strokeDasharray = `${L}px`;
  path.style.strokeDashoffset = `${L}px`;
  path.style.opacity = '';
  await pen.away();
}

function crumb(x: number, y: number) {
  const c = document.createElement('i');
  c.className = 'crumb';
  c.style.left = `${x}px`;
  c.style.top = `${y}px`;
  fxLayer().append(c);
  const dx = (Math.random() - 0.5) * 30;
  c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx}px, ${24 + Math.random() * 20}px) rotate(${dx * 8}deg)`, opacity: 0 }], {
    duration: 600 + Math.random() * 300,
    easing: 'cubic-bezier(.3,.1,.7,1)',
  }).onfinish = () => c.remove();
}

/**
 * Lápis de cor pintando uma área (planta do andar): segue uma lista de
 * pontos de tela ao longo de `dur` e chama `progress(t)` a cada quadro.
 */
export async function pencilShade(points: { x: number; y: number }[], dur: number, progress: (t: number) => void) {
  if (reduced() || points.length < 2) return progress(1);
  const pen = new Pencil(-50);
  await pen.show(points[0].x, points[0].y);
  sfx.pencil(dur, 0.7);
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      progress(t);
      const f = t * (points.length - 1);
      const i = Math.min(points.length - 2, Math.floor(f));
      const u = f - i;
      pen.at(points[i].x + (points[i + 1].x - points[i].x) * u, points[i].y + (points[i + 1].y - points[i].y) * u, Math.sin(t * 40) * 3);
      if (t < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
  await pen.away();
}

// ------------------------------------------------------------------ pincel

function brushSvg(): SVGSVGElement {
  // deitado: cerdas à esquerda (0..34), virola, cabo
  return svgEl(`<svg class="brush-head" viewBox="0 0 170 30" aria-hidden="true">
    <defs>
      <linearGradient id="bhw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a33"/><stop offset=".5" stop-color="#5b3519"/><stop offset="1" stop-color="#3a200e"/></linearGradient>
      <linearGradient id="bhf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8e5de"/><stop offset=".5" stop-color="#a09b92"/><stop offset="1" stop-color="#6c685f"/></linearGradient>
    </defs>
    <path d="M2 6 Q10 3 34 5 L34 25 Q10 27 2 24 Q-1 15 2 6Z" fill="#c9594c"/>
    <path d="M4 9 H33 M3 13 H33 M3 17 H33 M4 21 H33" stroke="#7d2018" stroke-opacity=".45" stroke-width="1"/>
    <path d="M22 5 Q28 4 34 5 L34 25 Q28 26 22 25Z" fill="#3b2a20" opacity=".5"/>
    <rect x="34" y="3" width="26" height="24" rx="2" fill="url(#bhf)"/>
    <path d="M40 3 V27 M46 3 V27" stroke="#58544c" stroke-width="1"/>
    <path d="M60 6 L166 11 Q170 15 166 19 L60 24Z" fill="url(#bhw)"/>
  </svg>`);
}

/**
 * Pincelada: revela `canvas` da esquerda para a direita com borda molhada,
 * com um pincel passando na frente.
 */
export async function brushSweep(row: HTMLElement, canvas: HTMLElement, dur = 620, delay = 0) {
  const setP = (p: number) => {
    const m = `linear-gradient(90deg, #000 0, #000 ${p - 7}%, rgba(0,0,0,.35) ${p - 2}%, transparent ${p + 4}%)`;
    canvas.style.setProperty('mask-image', m);
    canvas.style.setProperty('-webkit-mask-image', m);
  };
  if (reduced()) return;
  setP(-8);
  if (delay) await wait(delay);
  if (!row.isConnected) return;
  const head = brushSvg();
  fxLayer().append(head);
  const s = k();
  const hw = 17 * 10 * s * 0.55;
  const hh = 3 * 10 * s * 0.55;
  head.style.width = `${hw}px`;
  head.style.height = `${hh}px`;
  // a linha pode mudar de lugar durante a pincelada (lista reordenando): mede a cada quadro
  const place = (p: number, lift = 0) => {
    const r = row.getBoundingClientRect();
    head.style.visibility = r.height > 0 ? '' : 'hidden';
    const x = r.left + (r.width * p) / 100;
    const y = r.top + r.height * 0.5 + Math.sin(p / 9) * r.height * 0.12 - lift;
    head.style.transform = `translate(${x}px, ${y - hh / 2}px) rotate(${-24 + Math.sin(p / 14) * 4}deg)`;
  };
  place(0, 14);
  head.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, fill: 'forwards' });
  sfx.brush(dur);
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const p = -8 + easeInOut(t) * 118;
      setP(p);
      place(Math.min(100, Math.max(0, p)), t < 0.12 ? (1 - t / 0.12) * 14 : 0);
      if (t < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
  canvas.style.removeProperty('mask-image');
  canvas.style.removeProperty('-webkit-mask-image');
  await head.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '2rem -2.4rem' }], { duration: 240, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
  head.remove();
}

/** Tinta sendo lavada (cena que deixou de ser a atual). */
export async function brushWash(canvas: HTMLElement, dur = 380) {
  if (reduced()) return;
  await canvas
    .animate(
      [
        { opacity: 1, filter: 'blur(0px) saturate(1)' },
        { opacity: 0, filter: 'blur(3px) saturate(0.4)' },
      ],
      { duration: dur, easing: 'ease-in', fill: 'forwards' },
    )
    .finished.catch(() => {});
}

// ------------------------------------------------------------------ texto

const typing = new WeakMap<Element, number>();

/** Máquina de escrever: digita `text` em `el` em no máximo `maxMs`. */
export function typeInto(el: HTMLElement, text: string, maxMs = 800, ticks = true) {
  const prev = typing.get(el);
  if (prev) cancelAnimationFrame(prev);
  if (reduced() || !text) {
    el.textContent = text;
    return;
  }
  const per = Math.max(4, Math.min(22, maxMs / text.length));
  const node = document.createTextNode('');
  const caret = document.createElement('span');
  caret.className = 'caret';
  el.replaceChildren(node, caret);
  el.setAttribute('aria-label', text);
  const t0 = performance.now();
  let shown = 0;
  const step = () => {
    const n = Math.min(text.length, Math.floor((performance.now() - t0) / per));
    if (n !== shown) {
      if (ticks && Math.floor(n / 3) !== Math.floor(shown / 3)) sfx.tick();
      shown = n;
      node.data = text.slice(0, n);
    }
    if (n < text.length) typing.set(el, requestAnimationFrame(step));
    else {
      typing.delete(el);
      caret.remove();
      el.removeAttribute('aria-label');
    }
  };
  typing.set(el, requestAnimationFrame(step));
}

/** Carimbo: bate com força e assenta. */
export function stamp(el: Element, delay = 0) {
  if (reduced()) return;
  el.animate(
    [
      { transform: 'scale(1.9) rotate(-9deg)', opacity: 0, filter: 'blur(1px)' },
      { transform: 'scale(0.94) rotate(1deg)', opacity: 1, filter: 'blur(0)', offset: 0.55 },
      { transform: 'scale(1) rotate(0)', opacity: 1 },
    ],
    { duration: 380, delay, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' },
  );
  setTimeout(() => sfx.stamp(), delay + 200);
}

/** Números contando (ex.: "6 / 10" → "8 / 10"). */
export function countUp(el: HTMLElement, from: number, to: number, dur: number, fmt: (n: number) => string) {
  if (reduced()) {
    el.textContent = fmt(to);
    return;
  }
  const t0 = performance.now();
  const step = () => {
    const t = Math.min(1, (performance.now() - t0) / dur);
    el.textContent = fmt(from + (to - from) * easeOut(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Texto que sobe e some (ex.: "+2" em cima do retrato). */
export function floatText(anchor: Element, text: string, color: string) {
  const r = anchor.getBoundingClientRect();
  const t = document.createElement('b');
  t.className = 'float-text';
  t.textContent = text;
  t.style.color = color;
  t.style.left = `${r.left + r.width / 2}px`;
  t.style.top = `${r.top + r.height * 0.25}px`;
  fxLayer().append(t);
  t.animate(
    [
      { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -1.4rem) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -4.2rem) scale(1)', opacity: 0 },
    ],
    { duration: 1300, easing: 'cubic-bezier(.2,.7,.3,1)' },
  ).onfinish = () => t.remove();
}

// ------------------------------------------------------------------ voo em arco

/** Leva `node` de um retângulo a outro numa curva, girando; resolve na chegada. */
export async function flyArc(node: Element, from: DOMRect, to: DOMRect, dur = 760) {
  const box = document.createElement('div');
  box.className = 'fly';
  box.append(node);
  fxLayer().append(box);
  const sx = from.left + from.width / 2;
  const sy = from.top + from.height / 2;
  const ex = to.left + to.width / 2;
  const ey = to.top + to.height * 0.35;
  const cx = (sx + ex) / 2 + (ex - sx) * 0.1;
  const cy = Math.min(sy, ey) - Math.max(120, Math.abs(ex - sx) * 0.35);
  const frames: Keyframe[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
    const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
    const sc = 1 + Math.sin(t * Math.PI) * 0.35 - t * 0.35;
    frames.push({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${t * -340}deg) scale(${sc})`, offset: t });
  }
  if (reduced()) {
    box.remove();
    return;
  }
  sfx.whoosh(dur);
  // rastro de poeira de papel
  let last = 0;
  const t0 = performance.now();
  const trail = () => {
    const t = (performance.now() - t0) / dur;
    if (t >= 1) return;
    if (t - last > 0.07) {
      last = t;
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
      const d = document.createElement('i');
      d.className = 'dust';
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      fxLayer().append(d);
      d.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 0.8 }, { transform: 'translate(-50%,-10%) scale(0.2)', opacity: 0 }], { duration: 520 }).onfinish = () => d.remove();
    }
    requestAnimationFrame(trail);
  };
  requestAnimationFrame(trail);
  await box.animate(frames, { duration: dur, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' }).finished.catch(() => {});
  box.remove();
  sfx.drop();
}

// ------------------------------------------------------------------ inclinação 3D

/** Cartão que inclina seguindo o mouse, com brilho. */
export function tilt(el: HTMLElement, max = 7) {
  if (reduced()) return;
  let raf = 0;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${(px * max * 2).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-py * max * 2).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
    });
  });
  el.addEventListener('pointerleave', () => {
    cancelAnimationFrame(raf);
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  });
}

// ------------------------------------------------------------------ traço SVG simples

/** Desenha um traço SVG (sem lápis), ex.: contorno da aba ativa. */
export function drawStroke(path: SVGGeometryElement, dur = 420, delay = 0) {
  const L = path.getTotalLength();
  if (reduced()) return;
  path.style.strokeDasharray = `${L}px`;
  path.animate([{ strokeDashoffset: `${L}px` }, { strokeDashoffset: '0px' }], { duration: dur, delay, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'backwards' }).onfinish = () => {
    path.style.strokeDasharray = '';
  };
}

/** Revela da esquerda para a direita (sublinhados feitos à mão). */
export function wipeIn(el: Element, dur = 380, delay = 0) {
  if (reduced()) return;
  el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: dur, delay, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'backwards' });
}

export { wait };
