import type { AvatarLook } from '@croma/shared';
import { drawPixelHead } from './avatarPixel';
import { framesFor, sprites } from './sprites';

/** Retrato quadrado (rosto) de uma peça: recorte do sprite ou cabeça pixel. */
export function portraitCanvas(look: AvatarLook | null, size = 88): HTMLCanvasElement {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  c.style.width = c.style.height = `${size}px`;
  const ctx = c.getContext('2d')!;
  const paint = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const bg = ctx.createRadialGradient(c.width / 2, c.height * 0.4, 2, c.width / 2, c.height / 2, c.width * 0.75);
    bg.addColorStop(0, '#3a3129');
    bg.addColorStop(1, '#14100e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    if (!look) return;
    const def = look.charId ? sprites.def(look.charId) : undefined;
    const sp = def ? sprites.get(look.charId) : null;
    if (sp) {
      const f = framesFor(sp.lc, 4)?.[0];
      if (!f) return;
      const cw = f.canvas.width;
      const side = Math.min(cw, f.canvas.height * 0.5);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(f.canvas, (cw - side) / 2, 0, side, side, c.width * 0.04, c.height * 0.06, c.width * 0.92, c.height * 0.92);
    } else {
      ctx.imageSmoothingEnabled = false;
      const s = (c.width / 40) * 1.05;
      drawPixelHead(ctx, look, c.width / 2, c.height * 0.54, s);
    }
  };
  paint();
  if (look?.charId && sprites.def(look.charId) && !sprites.get(look.charId)) {
    const def = sprites.def(look.charId)!;
    sprites.load(def).then(paint);
  }
  return c;
}
