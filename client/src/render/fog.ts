import type { RoomMap } from '@crona/shared';
import { rng } from './color';
import { iso } from './iso';

interface Puff {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  phase: number;
  low: boolean;
}

let sprite: HTMLCanvasElement | null = null;
function puffSprite() {
  if (sprite) return sprite;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(168,178,168,1)');
  g.addColorStop(0.45, 'rgba(150,160,152,0.55)');
  g.addColorStop(1, 'rgba(140,150,145,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  sprite = c;
  return c;
}

/**
 * Névoa: nuvens suaves que derivam sobre o piso, recortadas pelo volume do
 * quarto. É desenhada antes da luz, então brilha perto das fontes de luz.
 */
export class Fog {
  private puffs: Puff[] = [];
  private clip: Path2D | null = null;
  private bounds = { x0: 0, x1: 1, y0: 0, y1: 1 };
  private last = 0;

  setMap(map: RoomMap) {
    const tiles: [number, number, number][] = [];
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const h = map.floorHeight(x, y);
        if (h !== null && !map.isDoor(x, y)) tiles.push([x, y, h]);
      }
    const clip = new Path2D();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const [x, y, h] of tiles) {
      const top = h + 2.6;
      const pts = [iso(x, y, top), iso(x + 1, y, top), iso(x + 1, y, h), iso(x + 1, y + 1, h), iso(x, y + 1, h), iso(x, y + 1, top)];
      clip.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) clip.lineTo(p[0], p[1]);
      clip.closePath();
      for (const [px, py] of pts) {
        x0 = Math.min(x0, px);
        x1 = Math.max(x1, px);
        y0 = Math.min(y0, py);
        y1 = Math.max(y1, py);
      }
    }
    this.clip = clip;
    this.bounds = { x0, x1, y0, y1 };
    const r = rng(tiles.length * 31 + map.width);
    this.puffs = [];
    const n = Math.min(90, 18 + tiles.length / 3);
    for (let i = 0; i < n; i++) {
      const [tx, ty, th] = tiles[Math.floor(r() * tiles.length)] ?? [0, 0, 0];
      const [px, py] = iso(tx + r(), ty + r(), th);
      const low = r() < 0.6;
      this.puffs.push({
        x: px,
        y: py - (low ? r() * 10 : 20 + r() * 50),
        r: low ? 50 + r() * 60 : 40 + r() * 50,
        vx: (r() < 0.5 ? -1 : 1) * (4 + r() * 9),
        vy: (r() - 0.5) * 2,
        a: 0.5 + r() * 0.5,
        phase: r() * 10,
        low,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, density: number, now: number) {
    if (!this.clip || density <= 0.01) return;
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    const b = this.bounds;
    const s = puffSprite();
    ctx.save();
    ctx.clip(this.clip);
    for (const p of this.puffs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < b.x0 - p.r) p.x = b.x1 + p.r;
      if (p.x > b.x1 + p.r) p.x = b.x0 - p.r;
      if (p.y < b.y0) p.vy = Math.abs(p.vy);
      if (p.y > b.y1) p.vy = -Math.abs(p.vy);
      const breathe = 0.75 + 0.25 * Math.sin(now / 2300 + p.phase);
      ctx.globalAlpha = Math.min(0.5, density * (p.low ? 0.32 : 0.18) * p.a * breathe);
      const w = p.r * 2.2;
      const h = p.low ? p.r * 0.7 : p.r * 1.3;
      ctx.drawImage(s, p.x - w / 2, p.y - h / 2, w, h);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
