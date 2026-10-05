import { arteDaMiniatura } from './furniArte';
import { getFurni, getWallFurni } from '@crona/shared';
import { furniVisual } from './furniFloor';
import { drawWallFurni } from './furniWall';
import { boxSilhouette, Mapper, Painter } from './painter';
import { sortDrawables, type Drawable } from './sort';

const cache = new Map<string, HTMLCanvasElement>();

/** Miniatura de um mobi (chão ou parede) para catálogo e inventário. */
export function furniThumb(defId: string, size = 64): HTMLCanvasElement {
  const key = `${defId}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = size * dpr;
  c.height = size * dpr;
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;
  const ctx = c.getContext('2d')!;
  const wd = getWallFurni(defId);
  if (wd) {
    const s = Math.min(2, (size - 8) / Math.max(wd.w, wd.h));
    ctx.setTransform(s * dpr, 0, 0, s * dpr, ((size - wd.w * s) / 2) * dpr, ((size - wd.h * s) / 2) * dpr);
    drawWallFurni(ctx, wd, 0, 1, Date.now());
  } else {
    const def = getFurni(defId);
    if (def) {
      const rot = def.rotations.includes(2) ? 2 : def.rotations[0];
      const vis = furniVisual(def, 0, 1);
      const m = new Mapper().set(rot, def.width, def.depth, 0, 0, 0);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const n of vis.nodes)
        for (const [px, py] of boxSilhouette(m.box(n.b))) {
          x0 = Math.min(x0, px);
          y0 = Math.min(y0, py);
          x1 = Math.max(x1, px);
          y1 = Math.max(y1, py);
        }
      y0 -= 10;
      const s = Math.min(1.6, (size - 6) / Math.max(x1 - x0, y1 - y0));
      ctx.setTransform(s * dpr, 0, 0, s * dpr, (size / 2 - ((x0 + x1) / 2) * s) * dpr, (size / 2 - ((y0 + y1) / 2) * s) * dpr);
      const p = new Painter();
      p.ctx = ctx;
      p.t = 0;
      p.seed = 1;
      p.m.set(rot, def.width, def.depth, 0, 0, 0);
      const list: Drawable[] = vis.nodes.map((n) => {
        const box = m.box(n.b);
        const sil = boxSilhouette(box);
        const xs = sil.map((q) => q[0]);
        const ys = sil.map((q) => q[1]);
        return { box, sx0: Math.min(...xs), sx1: Math.max(...xs), sy0: Math.min(...ys), sy1: Math.max(...ys), draw: () => n.draw(p) };
      });
      for (const d of sortDrawables(list)) d.draw();
    }
  }
  cache.set(key, c);
  return c;
}

/** Cópia de uma miniatura (o mesmo canvas não pode estar em dois lugares do DOM). */
export function thumbCopy(defId: string, size = 64): HTMLCanvasElement {
  const src = furniThumb(defId, size);
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.style.width = src.style.width;
  c.style.height = src.style.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  // com arte, a miniatura é a arte do jogo (o desenho padrão fica até a imagem chegar)
  const url = arteDaMiniatura(defId);
  if (url) {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight) * 0.92;
      const w = img.naturalWidth * k;
      const hh = img.naturalHeight * k;
      g.clearRect(0, 0, c.width, c.height);
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (c.width - w) / 2, (c.height - hh) / 2, w, hh);
    };
    img.src = url;
  }
  return c;
}
