import type { AvatarLook, ChatKind, RollResult } from '@crona/shared';
import { drawPixelHead } from './avatarPixel';
import { framesFor, sprites } from './sprites';

export const UI_FONT = '"Chakra Petch", "Segoe UI", Verdana, sans-serif';

interface Bubble {
  /** posição x de mundo do falante (fixa) */
  wx: number;
  /** y atual e alvo em coordenadas de tela relativas (px) */
  y: number;
  ty: number;
  name: string;
  text: string;
  kind: ChatKind;
  look: AvatarLook | null;
  roll?: RollResult;
  w: number;
  born: number;
}

const H = 26;
const GAP = 4;
const MAX_AGE = 45000;

const iconCache = new Map<string, HTMLCanvasElement>();

/** Ícone 20x20 do rosto do avatar (pixel ou sprite). */
export function avatarIcon(look: AvatarLook): HTMLCanvasElement {
  const sp = look.charId ? sprites.get(look.charId) : null;
  const key = sp ? `c${look.charId}` : JSON.stringify(look);
  let c = iconCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 40;
  c.height = 40;
  const x = c.getContext('2d')!;
  if (sp) {
    const f = framesFor(sp.lc, 4)?.[0];
    if (f) {
      const cw = f.canvas.width;
      const side = Math.min(cw, f.canvas.height * 0.45);
      x.imageSmoothingQuality = 'high';
      x.drawImage(f.canvas, (cw - side) / 2, 0, side, side, 0, 0, 40, 40);
    }
  } else {
    x.imageSmoothingEnabled = false;
    drawPixelHead(x, look, 20, 8, 1.15);
  }
  iconCache.set(key, c);
  if (iconCache.size > 200) iconCache.clear();
  return c;
}

export function clearIconCache() {
  iconCache.clear();
}

export class Bubbles {
  private list: Bubble[] = [];
  private lastShift = 0;

  clear() {
    this.list = [];
  }

  add(
    ctx: CanvasRenderingContext2D,
    wx: number,
    headScreenY: number,
    name: string,
    text: string,
    kind: ChatKind,
    look: AvatarLook | null,
    roll?: RollResult,
  ) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `700 12px ${UI_FONT}`;
    const nw = ctx.measureText(name + ': ').width;
    ctx.font = `${kind === 'shout' ? 700 : 500} 12px ${UI_FONT}`;
    const body = roll ? `${text} ` : text;
    let tw = ctx.measureText(body).width;
    if (roll) {
      ctx.font = `700 12px ${UI_FONT}`;
      tw += ctx.measureText(rollText(roll)).width + 8;
    }
    ctx.restore();
    const w = Math.min(520, 34 + nw + tw + 12);
    const now = performance.now();
    const b: Bubble = { wx, y: headScreenY - 34, ty: headScreenY - 34, name, text, kind, look, roll, w, born: now };
    this.list.push(b);
    this.resolve();
    this.lastShift = now;
  }

  /** Move para cima quem estiver embaixo do mais novo. */
  private resolve() {
    const byNew = [...this.list].sort((a, b) => b.born - a.born);
    for (let i = 1; i < byNew.length; i++) {
      const b = byNew[i];
      for (let j = 0; j < i; j++) {
        const n = byNew[j];
        if (Math.abs(n.wx - b.wx) * 2 > (n.w + b.w) * 0.5 + 400) continue;
        if (b.ty > n.ty - (H + GAP)) b.ty = n.ty - (H + GAP);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, worldToScreenX: (wx: number) => number, viewW: number) {
    const now = performance.now();
    if (this.list.length && now - this.lastShift > 6000) {
      for (const b of this.list) b.ty -= H + GAP;
      this.lastShift = now;
    }
    this.list = this.list.filter((b) => now - b.born < MAX_AGE && b.y > -60);
    for (const b of this.list) {
      b.y += (b.ty - b.y) * 0.22;
      const cx = worldToScreenX(b.wx);
      const x = Math.max(6, Math.min(viewW - b.w - 6, cx - b.w / 2));
      const y = Math.round(b.y);
      drawBubble(ctx, b, Math.round(x), y, cx);
    }
  }

  /** Compensa arrasto da câmera (px de tela). */
  pan(dy: number) {
    for (const b of this.list) {
      b.y += dy;
      b.ty += dy;
    }
  }
}

function rollText(r: RollResult) {
  const kept = r.rolls.length > 1 ? `[${r.rolls.join(', ')}]` : `${r.rolls[0]}`;
  const mod = r.mod ? (r.mod > 0 ? ` +${r.mod}` : ` ${r.mod}`) : '';
  return `${kept}${mod} = ${r.total}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble, x: number, y: number, cx: number) {
  const border = b.kind === 'roll' ? '#b3261e' : b.kind === 'shout' ? '#e0a040' : '#4a3d44';
  ctx.save();
  // cauda
  const tx = Math.max(x + 10, Math.min(x + b.w - 10, cx));
  ctx.fillStyle = border;
  ctx.beginPath();
  ctx.moveTo(tx - 5, y + H - 1);
  ctx.lineTo(tx + 5, y + H - 1);
  ctx.lineTo(tx, y + H + 5);
  ctx.closePath();
  ctx.fill();
  roundRect(ctx, x, y, b.w, H, 5);
  ctx.fillStyle = b.kind === 'roll' ? 'rgba(34,10,12,0.94)' : 'rgba(18,14,20,0.93)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = border;
  ctx.stroke();
  // ícone
  if (b.kind === 'roll') drawDie(ctx, x + 14, y + H / 2);
  else if (b.look) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(avatarIcon(b.look), x + 4, y + 3, 20, 20);
  }
  ctx.textBaseline = 'middle';
  ctx.font = `700 12px ${UI_FONT}`;
  ctx.fillStyle = b.kind === 'roll' ? '#ff8a7a' : '#e3a94c';
  const label = b.name + ': ';
  ctx.fillText(label, x + 30, y + H / 2 + 1);
  let px = x + 30 + ctx.measureText(label).width;
  ctx.font = `${b.kind === 'shout' ? 700 : 500} 12px ${UI_FONT}`;
  ctx.fillStyle = '#efe6d6';
  const maxW = x + b.w - 8 - px;
  let text = b.roll ? b.text + ' ' : b.text;
  if (ctx.measureText(text).width > maxW && !b.roll) {
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    text += '…';
  }
  ctx.fillText(text, px, y + H / 2 + 1);
  if (b.roll) {
    px += ctx.measureText(text).width + 4;
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.fillStyle = '#ffd27a';
    ctx.fillText(rollText(b.roll), px, y + H / 2 + 1);
  }
  ctx.restore();
}

function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * 8;
    const py = Math.sin(a) * 8;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#8a1414';
  ctx.fill();
  ctx.strokeStyle = '#ff8a7a';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 3);
  ctx.lineTo(-5, 3);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
