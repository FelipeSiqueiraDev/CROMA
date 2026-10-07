import type { ParticleKind, RoomMap } from '@crona/shared';
import { rgba } from './color';
import { iso } from './iso';
import type { Light } from './lighting';

/**
 * Partículas do cômodo (só enfeite, cada tela sorteia as suas):
 *  - poeira: pontinhos flutuando que só aparecem onde tem luz;
 *  - fumaça: fios subindo das velas, candelabros e arandelas;
 *  - brasas: faíscas subindo do fogo, de vez em quando.
 */

interface P {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  seed: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Particles {
  private list: P[] = [];
  private kinds = new Set<ParticleKind>();
  /** caixa do chão do cômodo, em px de mundo */
  private box = { x0: 0, x1: 0, y0: 0, y1: 0 };
  private tiles = 0;
  private last = 0;
  private emit = new Map<string, number>();

  setRoom(map: RoomMap, kinds: string[] | undefined) {
    this.kinds = new Set((kinds ?? []).filter((k): k is ParticleKind => k === 'dust' || k === 'smoke' || k === 'embers'));
    this.list = [];
    this.emit.clear();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    let n = 0;
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const h = map.floorHeight(x, y);
        if (h === null) continue;
        n++;
        const [sx, sy] = iso(x + 0.5, y + 0.5, h);
        x0 = Math.min(x0, sx);
        x1 = Math.max(x1, sx);
        y0 = Math.min(y0, sy);
        y1 = Math.max(y1, sy);
      }
    this.tiles = n;
    this.box = { x0, x1, y0: y0 - 110, y1 };
  }

  get active() {
    return this.kinds.size > 0;
  }

  /** Luz no ponto (0..1): quanto ele está perto de alguma fonte. */
  private lightAt(x: number, y: number, lights: Light[]) {
    let s = 0;
    let c = '#fff2d8';
    let best = 0;
    for (const L of lights) {
      const d = Math.hypot(x - L.x, y - L.y);
      if (d >= L.radius) continue;
      const v = (1 - d / L.radius) * L.intensity;
      s += v;
      if (v > best) {
        best = v;
        c = L.color;
      }
    }
    return { v: Math.min(1, s), c };
  }

  /** Avança e desenha (coordenadas de mundo; o ctx já está na câmera). level = quantidade 0..1. */
  draw(ctx: CanvasRenderingContext2D, now: number, lights: Light[], level: number) {
    if (!this.kinds.size) return;
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
    this.last = now;
    level = Math.max(0, Math.min(1, level));
    // poeira: no máximo uma por casa e meia (160 no total), vezes a quantidade escolhida
    if (this.kinds.has('dust')) {
      const want = Math.round(Math.min(160, this.tiles / 1.5) * level);
      let dust = 0;
      for (const p of this.list) if (p.kind === 'dust') dust++;
      // baixou a quantidade: as que sobram somem
      for (let i = this.list.length - 1; i >= 0 && dust > want; i--)
        if (this.list[i].kind === 'dust') {
          this.list.splice(i, 1);
          dust--;
        }
      for (; dust < want; dust++) {
        const b = this.box;
        this.list.push({ kind: 'dust', x: rand(b.x0, b.x1), y: rand(b.y0, b.y1), vx: rand(-3, 3), vy: rand(-2.5, 1.5), age: rand(0, 6), life: rand(7, 14), size: rand(0.6, 1.5), seed: Math.random() * 100 });
      }
    }
    // fumaça e brasas saem do fogo
    const fire = lights.filter((L) => L.kind === 'fire');
    for (const L of fire) {
      const key = `${Math.round(L.x)},${Math.round(L.y)}`;
      const next = this.emit.get(key) ?? now + rand(0, 800);
      if (now < next) {
        this.emit.set(key, next);
        continue;
      }
      // menos quantidade = cada vela solta fumaça e brasa mais de vez em quando
      this.emit.set(key, now + rand(380, 700) / Math.max(0.15, level));
      if (Math.random() > level) continue;
      if (this.kinds.has('smoke')) this.list.push({ kind: 'smoke', x: L.x + rand(-2, 2), y: L.y - 6, vx: rand(-2, 2), vy: rand(-16, -10), age: 0, life: rand(2.2, 3.6), size: rand(1.5, 2.5), seed: Math.random() * 100 });
      if (this.kinds.has('embers') && Math.random() < 0.3) this.list.push({ kind: 'embers', x: L.x + rand(-3, 3), y: L.y - 4, vx: rand(-6, 6), vy: rand(-28, -16), age: 0, life: rand(0.8, 1.8), size: rand(0.8, 1.4), seed: Math.random() * 100 });
    }
    if (this.list.length > 420) this.list.splice(0, this.list.length - 420);

    const t = now / 1000;
    ctx.save();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      const k = p.age / p.life;
      const fade = Math.min(1, k * 5) * Math.min(1, (1 - k) * 4);
      if (p.kind === 'dust') {
        p.x += (p.vx + Math.sin(t * 0.7 + p.seed) * 2) * dt;
        p.y += (p.vy + Math.cos(t * 0.5 + p.seed) * 1.5) * dt;
        const L = this.lightAt(p.x, p.y, lights);
        const a = fade * (0.04 + 0.75 * L.v);
        if (a < 0.02) continue;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(L.c, a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'smoke') {
        p.x += (p.vx + Math.sin(t * 2 + p.seed) * 5) * dt;
        p.y += p.vy * dt;
        const r = p.size + k * 9;
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(160,150,140,${0.16 * fade * (1 - k)})`);
        g.addColorStop(1, 'rgba(160,150,140,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      } else {
        p.x += (p.vx + Math.sin(t * 9 + p.seed) * 8) * dt;
        p.y += p.vy * dt;
        p.vy *= 0.99;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,${150 + Math.round(80 * (1 - k))},60,${0.9 * fade})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
