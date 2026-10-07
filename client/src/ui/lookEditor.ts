import {
  CLOTH_COLORS,
  EXTRAS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  SKIN_TONES,
  type AvatarLook,
  type CharacterDef,
} from '@crona/shared';
import { drawPixelAvatar, PIXEL_AVATAR_HEIGHT } from '../render/avatarPixel';
import { drawSprite, framesFor, sprites } from '../render/sprites';
import { clear, h } from './dom';

/** Prévia animada do avatar (clique para girar). */
export class AvatarPreview {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private look: AvatarLook;
  private dir = 4;
  private raf = 0;
  private w: number;
  private hgt: number;
  private walk = false;

  constructor(look: AvatarLook, w = 110, hgt = 150) {
    this.look = look;
    this.w = w;
    this.hgt = hgt;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas = h('canvas', { class: 'avatar-preview', width: w * dpr, height: hgt * dpr, style: `width:${w}px;height:${hgt}px`, title: 'Clique para girar' });
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.addEventListener('click', () => (this.dir = (this.dir + 1) % 8));
    this.canvas.addEventListener('mouseenter', () => (this.walk = true));
    this.canvas.addEventListener('mouseleave', () => (this.walk = false));
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (!this.canvas.isConnected) return;
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  setLook(l: AvatarLook) {
    this.look = l;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  private draw() {
    const ctx = this.ctx;
    const dpr = Math.min(2, devicePixelRatio || 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const now = performance.now();
    const sp = this.look.charId ? sprites.get(this.look.charId) : null;
    const H = sp ? sp.def.height : PIXEL_AVATAR_HEIGHT;
    const scale = Math.min(sp ? 1.25 : 1.5, (this.hgt - 22) / H);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    const cx = this.w / 2 / scale;
    const cy = (this.hgt - 12) / scale;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (sp) drawSprite(ctx, sp.def, sp.lc, this.dir, cx, cy, now, 0, this.walk ? 'walk' : 'stand');
    else
      drawPixelAvatar(ctx, this.look, cx, cy, this.dir, this.dir, {
        pose: this.walk ? 'walk' : 'stand',
        frame: this.walk ? Math.floor(now / 125) % 4 : 0,
        wave: false,
        dance: false,
        blink: now % 4000 < 140,
      });
  }
}

function swatches(colors: string[], current: string, onPick: (c: string) => void) {
  const row = h('div', { class: 'swatches' });
  for (const c of colors) {
    const b = h('button', {
      class: `swatch${c === current ? ' on' : ''}`,
      style: `background:${c}`,
      title: c,
      'aria-label': `Cor ${c}`,
      onclick: () => {
        row.querySelectorAll('.swatch').forEach((e) => e.classList.remove('on'));
        b.classList.add('on');
        onPick(c);
      },
    });
    row.append(b);
  }
  return row;
}

function choices(labels: string[], current: number, onPick: (i: number) => void) {
  const row = h('div', { class: 'chips' });
  labels.forEach((l, i) => {
    const b = h('button', {
      class: `chip${i === current ? ' on' : ''}`,
      onclick: () => {
        row.querySelectorAll('.chip').forEach((e) => e.classList.remove('on'));
        b.classList.add('on');
        onPick(i);
      },
    }, l);
    row.append(b);
  });
  return row;
}

/** Editor do avatar pixel. */
export function lookEditor(look: AvatarLook, onChange: (l: AvatarLook) => void): HTMLElement {
  const l = { ...look };
  const set = (p: Partial<AvatarLook>) => {
    Object.assign(l, p);
    onChange({ ...l });
  };
  return h(
    'div',
    { class: 'look-editor' },
    h('label', null, 'Pele'),
    swatches(SKIN_TONES, l.skin, (c) => set({ skin: c })),
    h('label', null, 'Cabelo'),
    choices(HAIR_STYLES, l.hairStyle, (i) => set({ hairStyle: i })),
    swatches(HAIR_COLORS, l.hair, (c) => set({ hair: c })),
    h('label', null, 'Roupa'),
    choices(OUTFITS, l.outfit, (i) => set({ outfit: i })),
    swatches(CLOTH_COLORS, l.top, (c) => set({ top: c })),
    h('label', null, 'Calça'),
    swatches(CLOTH_COLORS, l.pants, (c) => set({ pants: c })),
    h('label', null, 'Calçado'),
    swatches(CLOTH_COLORS.slice(0, 8), l.shoes, (c) => set({ shoes: c })),
    h('label', null, 'Detalhe'),
    choices(EXTRAS, l.extra, (i) => set({ extra: i })),
  );
}

/** Miniatura do personagem (primeiro quadro). */
export function charThumb(def: CharacterDef, size = 72): HTMLCanvasElement {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const c = h('canvas', { width: size * dpr, height: size * dpr, style: `width:${size}px;height:${size}px`, class: 'char-thumb' });
  const ctx = c.getContext('2d')!;
  sprites.load(def).then((lc) => {
    if (!lc) {
      ctx.fillStyle = '#b3261e';
      ctx.font = `${12 * dpr}px sans-serif`;
      ctx.fillText('erro', 8 * dpr, 20 * dpr);
      return;
    }
    const f = framesFor(lc, 4)?.[0];
    if (!f) return;
    const s = Math.min((size * dpr * 0.92) / f.canvas.height, (size * dpr * 0.92) / f.canvas.width);
    const w = f.canvas.width * s;
    const hh = f.canvas.height * s;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(f.canvas, (size * dpr - w) / 2, size * dpr - hh - 2, w, hh);
  });
  return c;
}

/** Lista de personagens (sprite) + opção de avatar pixel. */
export function characterPicker(chars: CharacterDef[], current: number | null, onPick: (id: number | null) => void): HTMLElement {
  const grid = h('div', { class: 'char-grid' });
  const mk = (id: number | null, label: string, thumb: HTMLElement) => {
    const b = h(
      'button',
      {
        class: `char-card${id === current ? ' on' : ''}`,
        onclick: () => {
          grid.querySelectorAll('.char-card').forEach((e) => e.classList.remove('on'));
          b.classList.add('on');
          onPick(id);
        },
      },
      thumb,
      h('span', null, label),
    );
    grid.append(b);
  };
  mk(null, 'Avatar pixel', h('div', { class: 'char-thumb pixel-thumb' }, 'PX'));
  for (const c of chars) mk(c.id, c.name, charThumb(c));
  return grid;
}

export function rebuild(el: HTMLElement, content: HTMLElement) {
  clear(el).append(content);
}
