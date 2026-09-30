import type { FloorStyle, RoomMap, WallSeg } from '@croma/shared';
import { hash, shade } from './color';
import { iso } from './iso';

export interface StaticLayer {
  canvas: HTMLCanvasElement;
  /** canto superior esquerdo em coordenadas de mundo */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Como cada piso é desenhado: cor, rejunte e desenho (pedra, tábua, ladrilho...). */
interface FloorLook {
  base: string;
  grout: string;
  kind: 'stone' | 'plank' | 'tile' | 'checker' | 'carpet' | 'plate' | 'dirt';
  alt?: string;
}

const FLOORS: Record<FloorStyle, FloorLook> = {
  pedra: { base: '#4f4841', grout: 'rgba(18,14,12,0.6)', kind: 'stone' },
  concreto: { base: '#585650', grout: 'rgba(20,20,18,0.28)', kind: 'stone' },
  madeira: { base: '#3b2718', grout: 'rgba(10,6,4,0.7)', kind: 'plank' },
  taco: { base: '#8a4a22', grout: 'rgba(40,16,6,0.6)', kind: 'plank' },
  ladrilho: { base: '#c2beb2', grout: 'rgba(80,80,74,0.6)', kind: 'tile' },
  xadrez: { base: '#cfcabd', alt: '#2a2622', grout: 'rgba(0,0,0,0.35)', kind: 'checker' },
  azulejo: { base: '#93aebb', grout: 'rgba(40,60,70,0.5)', kind: 'tile' },
  carpete: { base: '#3b2160', alt: '#7a5ab0', grout: 'rgba(0,0,0,0)', kind: 'carpet' },
  musgo: { base: '#213b33', grout: 'rgba(0,10,6,0.6)', kind: 'stone' },
  metal: { base: '#30343a', grout: 'rgba(0,0,0,0.55)', kind: 'plate' },
  terra: { base: '#3a2e22', grout: 'rgba(0,0,0,0)', kind: 'dirt' },
};

export function floorLook(style: FloorStyle | undefined): FloorLook {
  return FLOORS[style ?? 'pedra'] ?? FLOORS.pedra;
}
const EDGE_VOID_X = '#1d1916';
const EDGE_VOID_Y = '#27221e';
const EDGE_STEP_X = '#342e29';
const EDGE_STEP_Y = '#403933';
const WALL_L = '#302a26';
const WALL_R = '#3b342f';
const WALL_TOP = '#5a524b';
const WALL_CAP = '#221d1a';
const T = 0.3;
const FLOOR_THICK = 0.35;
/** altura do vão da porta: 2,15 m (Z_PER_M) */
const DOOR_H = 3.9;
const MAX_PIXELS = 14_000_000;

type Pt = [number, number];

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill?: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function minFloor(map: RoomMap) {
  let m = Infinity;
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const h = map.floorHeight(x, y);
      if (h !== null && h < m) m = h;
    }
  return Number.isFinite(m) ? m : 0;
}

export function roomBounds(map: RoomMap) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (p: Pt) => {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  };
  const top = map.walls.top;
  const minH = minFloor(map);
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const h = map.floorHeight(x, y);
      if (h === null) continue;
      add(iso(x, y, h));
      add(iso(x + 1, y + 1, minH - FLOOR_THICK));
      add(iso(x + 1, y, h));
      add(iso(x, y + 1, h));
    }
  for (const s of map.walls.segs) {
    if (s.wall === 'l') {
      add(iso(s.plane - T, s.at, top));
      add(iso(s.plane - T, s.at + 1, top));
    } else {
      add(iso(s.at, s.plane - T, top));
      add(iso(s.at + 1, s.plane - T, top));
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}

/**
 * Recorte para quem está atrás da parede da porta: tudo, menos as faces de
 * parede vizinhas, mais o vão da porta (regra evenodd).
 */
export function doorClipPath(map: RoomMap): { seg: WallSeg; path: Path2D } | null {
  const seg = map.walls.segs.find((s) => s.door);
  if (!seg) return null;
  const path = new Path2D();
  path.rect(-1e5, -1e5, 2e5, 2e5);
  const add = (q: Pt[]) => {
    path.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) path.lineTo(q[i][0], q[i][1]);
    path.closePath();
  };
  for (const s of map.walls.segs)
    if (s.wall === seg.wall && s.plane === seg.plane && Math.abs(s.at - seg.at) <= 2) add(wallQuad(s, s.at, s.at + 1, s.base - FLOOR_THICK, map.walls.top));
  add(wallQuad(seg, seg.at + 0.1, seg.at + 0.9, seg.base - FLOOR_THICK, seg.base + DOOR_H));
  return { seg, path };
}

/** Pontos de um retângulo no plano de uma parede (a = ao longo, z = altura). */
function wallQuad(s: WallSeg, a0: number, a1: number, z0: number, z1: number): Pt[] {
  if (s.wall === 'l') return [iso(s.plane, a0, z0), iso(s.plane, a1, z0), iso(s.plane, a1, z1), iso(s.plane, a0, z1)];
  return [iso(a0, s.plane, z0), iso(a1, s.plane, z0), iso(a1, s.plane, z1), iso(a0, s.plane, z1)];
}

function wallLine(s: WallSeg, a0: number, z0: number, a1: number, z1: number): [Pt, Pt] {
  if (s.wall === 'l') return [iso(s.plane, a0, z0), iso(s.plane, a1, z1)];
  return [iso(a0, s.plane, z0), iso(a1, s.plane, z1)];
}

function drawWallSeg(ctx: CanvasRenderingContext2D, map: RoomMap, s: WallSeg) {
  const top = map.walls.top;
  const b = s.base;
  const a0 = s.at;
  const a1 = s.at + 1;
  const face = wallQuad(s, a0, a1, b, top);
  const hole = s.door ? wallQuad(s, a0 + 0.1, a1 - 0.1, b, b + DOOR_H) : null;
  const base = s.wall === 'l' ? WALL_L : WALL_R;

  ctx.save();
  ctx.beginPath();
  for (const q of hole ? [face, hole] : [face]) {
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath();
  }
  ctx.fillStyle = base;
  ctx.fill('evenodd');
  ctx.clip('evenodd');

  // tijolos
  const course = 0.3;
  let k = 0;
  for (let z = b; z < top - 1e-3; z += course, k++) {
    const z1 = Math.min(top, z + course);
    const off = (k % 2) * 0.25;
    for (let a = a0 - 0.5 + off; a < a1; a += 0.5) {
      const s0 = Math.max(a0, a);
      const s1 = Math.min(a1, a + 0.5);
      if (s1 <= s0) continue;
      const v = (hash(s.plane * 7 + (s.wall === 'l' ? 1 : 2), Math.round(a * 4), k) - 0.5) * 0.14;
      poly(ctx, wallQuad(s, s0 + 0.012, s1 - 0.012, z + 0.03, z1 - 0.012), shade(base, v));
    }
  }
  // grade de argamassa
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  k = 0;
  for (let z = b; z < top; z += course, k++) {
    const [p, q] = wallLine(s, a0, z, a1, z);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  }
  // sujeira na base
  const [, yb] = iso(s.wall === 'l' ? s.plane : a0, s.wall === 'l' ? a0 : s.plane, b);
  const [, yt] = iso(s.wall === 'l' ? s.plane : a0, s.wall === 'l' ? a0 : s.plane, b + 1.8);
  const g = ctx.createLinearGradient(0, yb + 16, 0, yt);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  poly(ctx, face);
  ctx.fill();
  // rodapé
  poly(ctx, wallQuad(s, a0, a1, b, b + 0.14), 'rgba(12,10,9,0.8)');
  // manchas de umidade
  const rnd = hash(s.plane, s.at, s.wall === 'l' ? 3 : 4);
  if (rnd < 0.35) {
    const [cx, cy] = iso(s.wall === 'l' ? s.plane : a0 + 0.5, s.wall === 'l' ? a0 + 0.5 : s.plane, b + 0.4 + rnd * 4);
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
    rg.addColorStop(0, 'rgba(10,14,8,0.35)');
    rg.addColorStop(1, 'rgba(10,14,8,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(cx - 24, cy - 24, 48, 48);
  }
  ctx.restore();

  if (hole) {
    ctx.lineWidth = 2;
    const fr = wallQuad(s, a0 + 0.08, a1 - 0.08, b, b + DOOR_H + 0.06);
    ctx.beginPath();
    ctx.moveTo(fr[0][0], fr[0][1]);
    ctx.lineTo(fr[3][0], fr[3][1]);
    ctx.lineTo(fr[2][0], fr[2][1]);
    ctx.lineTo(fr[1][0], fr[1][1]);
    ctx.strokeStyle = '#1b1512';
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(200,160,110,0.25)';
    ctx.stroke();
  }

  // topo com espessura
  const topStrip: Pt[] =
    s.wall === 'l'
      ? [iso(s.plane - T, a0, top), iso(s.plane, a0, top), iso(s.plane, a1, top), iso(s.plane - T, a1, top)]
      : [iso(a0, s.plane - T, top), iso(a1, s.plane - T, top), iso(a1, s.plane, top), iso(a0, s.plane, top)];
  ctx.lineWidth = 1;
  poly(ctx, topStrip, WALL_TOP, WALL_TOP);
  // linha da quina interna
  const [e0, e1] = wallLine(s, a0, top, a1, top);
  ctx.strokeStyle = 'rgba(255,240,220,0.12)';
  ctx.beginPath();
  ctx.moveTo(e0[0], e0[1]);
  ctx.lineTo(e1[0], e1[1]);
  ctx.stroke();

  // tampas nas pontas
  if (s.wall === 'l') {
    if (!map.walls.find('l', s.plane, s.at + 1))
      poly(ctx, [iso(s.plane - T, a1, b - FLOOR_THICK), iso(s.plane, a1, b - FLOOR_THICK), iso(s.plane, a1, top), iso(s.plane - T, a1, top)], WALL_CAP, 'rgba(0,0,0,0.6)');
  } else if (!map.walls.find('r', s.plane, s.at + 1)) {
    poly(ctx, [iso(a1, s.plane - T, b - FLOOR_THICK), iso(a1, s.plane, b - FLOOR_THICK), iso(a1, s.plane, top), iso(a1, s.plane - T, top)], shade(WALL_CAP, -0.2), 'rgba(0,0,0,0.6)');
  }
}

/** Quadrilátero no chão: (u0, v0) até (u1, v1) na altura h. */
function quad(u0: number, v0: number, u1: number, v1: number, h: number): Pt[] {
  return [iso(u0, v0, h), iso(u1, v0, h), iso(u1, v1, h), iso(u0, v1, h)];
}

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, lw = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/** Pisos que não são pedra: tábuas, ladrilhos, xadrez, carpete, chapa, terra. */
function drawPattern(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, look: FloorLook) {
  const base = look.base;
  switch (look.kind) {
    case 'plank': {
      // três tábuas por casa, correndo em x, emendas desencontradas
      for (let k = 0; k < 3; k++) {
        const v0 = y + k / 3;
        const v1 = v0 + 1 / 3;
        const joint = x + 0.15 + hash(x, y * 3 + k, 11) * 0.7;
        for (const [a, b] of [
          [x, joint],
          [joint, x + 1],
        ]) {
          const col = shade(base, (hash(Math.floor(a * 7), y * 3 + k, 12) - 0.5) * 0.28);
          poly(ctx, quad(a, v0, b, v1, h), col);
          line(ctx, iso(a + 0.05, v0 + 0.12, h), iso(b - 0.05, v0 + 0.13, h), 'rgba(0,0,0,0.12)');
          line(ctx, iso(a + 0.1, v0 + 0.22, h), iso(b - 0.1, v0 + 0.21, h), 'rgba(255,230,200,0.05)');
        }
        line(ctx, iso(x, v1, h), iso(x + 1, v1, h), look.grout);
        line(ctx, iso(joint, v0, h), iso(joint, v1, h), look.grout);
      }
      break;
    }
    case 'tile':
    case 'checker': {
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const u0 = x + i / 2;
          const v0 = y + j / 2;
          const dark = look.kind === 'checker' && (x * 2 + i + y * 2 + j) % 2 === 1;
          const col = shade(dark ? look.alt! : base, (hash(x * 2 + i, y * 2 + j, 5) - 0.5) * 0.08);
          const pts = quad(u0, v0, u0 + 0.5, v0 + 0.5, h);
          poly(ctx, pts, col);
          line(ctx, pts[3], pts[0], 'rgba(255,255,255,0.14)');
          line(ctx, pts[0], pts[1], 'rgba(255,255,255,0.14)');
          ctx.strokeStyle = look.grout;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[1][0], pts[1][1]);
          ctx.lineTo(pts[2][0], pts[2][1]);
          ctx.lineTo(pts[3][0], pts[3][1]);
          ctx.stroke();
          // mancha de uso de vez em quando
          if (hash(x, y, i, j, 3) < 0.08) {
            const [cx, cy] = iso(u0 + 0.25, v0 + 0.25, h);
            ctx.fillStyle = 'rgba(60,50,40,0.18)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 7, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      break;
    }
    case 'carpet': {
      poly(ctx, quad(x, y, x + 1, y + 1, h), shade(base, (hash(x, y, 4) - 0.5) * 0.05));
      // fibras e um losango bem apagado
      for (let k = 0; k < 14; k++) {
        const [px, py] = iso(x + hash(x, y, k, 1), y + hash(y, x, k, 2), h);
        ctx.fillStyle = hash(k, x, y) < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
      if ((x + y) % 2 === 0) {
        ctx.strokeStyle = `${look.alt ?? '#ffffff'}22`;
        ctx.lineWidth = 1;
        const p = [iso(x + 0.5, y + 0.2, h), iso(x + 0.8, y + 0.5, h), iso(x + 0.5, y + 0.8, h), iso(x + 0.2, y + 0.5, h)];
        ctx.beginPath();
        ctx.moveTo(p[0][0], p[0][1]);
        for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }
    case 'plate': {
      const pts = quad(x, y, x + 1, y + 1, h);
      poly(ctx, pts, shade(base, (hash(x, y, 6) - 0.5) * 0.12));
      // piso antiderrapante: tracinhos alternados
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const u = x + 0.15 + i * 0.23;
          const v = y + 0.15 + j * 0.23;
          const d = (i + j) % 2 ? 0.06 : -0.06;
          line(ctx, iso(u - 0.05, v - d, h), iso(u + 0.05, v + d, h), 'rgba(170,180,190,0.16)', 1.3);
        }
      for (const [u, v] of [
        [x + 0.07, y + 0.07],
        [x + 0.93, y + 0.07],
        [x + 0.07, y + 0.93],
        [x + 0.93, y + 0.93],
      ]) {
        const [px, py] = iso(u, v, h);
        ctx.fillStyle = 'rgba(200,205,210,0.35)';
        ctx.fillRect(Math.round(px) - 1, Math.round(py), 2, 1);
      }
      ctx.strokeStyle = look.grout;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.lineTo(pts[3][0], pts[3][1]);
      ctx.stroke();
      break;
    }
    case 'dirt': {
      poly(ctx, quad(x, y, x + 1, y + 1, h), shade(base, (hash(x, y, 8) - 0.5) * 0.15));
      for (let k = 0; k < 4; k++) {
        const [cx, cy] = iso(x + hash(x, y, k, 9), y + hash(y, x, k, 10), h);
        ctx.fillStyle = hash(k, y, x) < 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(120,100,70,0.14)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4 + hash(k, x) * 8, 2 + hash(k, y) * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let k = 0; k < 6; k++) {
        const [px, py] = iso(x + hash(x, k, y, 1), y + hash(k, y, x, 2), h);
        ctx.fillStyle = 'rgba(150,130,100,0.35)';
        ctx.fillRect(Math.round(px), Math.round(py), 2, 1);
      }
      break;
    }
    default:
      break;
  }
}

function drawTile(ctx: CanvasRenderingContext2D, map: RoomMap, x: number, y: number, h: number, door: boolean, minH: number, look: FloorLook = FLOORS.pedra) {
  // bordas (espessura) para frente; na beira da sala descem até a base
  const nx = map.floorHeight(x + 1, y);
  const bx = nx === null ? minH - FLOOR_THICK : nx;
  if (bx < h) {
    const pts: Pt[] = [iso(x + 1, y, h), iso(x + 1, y + 1, h), iso(x + 1, y + 1, bx), iso(x + 1, y, bx)];
    poly(ctx, pts, nx === null ? EDGE_VOID_X : EDGE_STEP_X, 'rgba(0,0,0,0.5)');
  }
  const ny = map.floorHeight(x, y + 1);
  const by = ny === null ? minH - FLOOR_THICK : ny;
  if (by < h) {
    const pts: Pt[] = [iso(x, y + 1, h), iso(x + 1, y + 1, h), iso(x + 1, y + 1, by), iso(x, y + 1, by)];
    poly(ctx, pts, ny === null ? EDGE_VOID_Y : EDGE_STEP_Y, 'rgba(0,0,0,0.5)');
    if (ny !== null) {
      // degrau: linha clara na quina
      const a = iso(x, y + 1, h);
      const c = iso(x + 1, y + 1, h);
      ctx.strokeStyle = 'rgba(255,230,200,0.12)';
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.stroke();
    }
  }

  if (!door && look.kind !== 'stone') {
    drawPattern(ctx, x, y, h, look);
    // sombra de degrau: piso mais alto atrás
    const backX = map.floorHeight(x - 1, y);
    const backY = map.floorHeight(x, y - 1);
    if (backX !== null && backX > h) poly(ctx, quad(x, y, x + 0.5, y + 1, h), 'rgba(0,0,0,0.28)');
    if (backY !== null && backY > h) poly(ctx, quad(x, y, x + 1, y + 0.5, h), 'rgba(0,0,0,0.28)');
    return;
  }
  const base = door ? '#221d19' : look.base;
  const GROUT = look.grout;
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      const u0 = x + i / 2;
      const v0 = y + j / 2;
      const r = hash(x * 2 + i, y * 2 + j, 5);
      const col = shade(base, (r - 0.5) * 0.18 - (door ? 0 : hash(x, y, 9) * 0.05));
      const pts: Pt[] = [iso(u0, v0, h), iso(u0 + 0.5, v0, h), iso(u0 + 0.5, v0 + 0.5, h), iso(u0, v0 + 0.5, h)];
      poly(ctx, pts, col);
      // relevo: luz no canto de cima, sombra embaixo
      ctx.strokeStyle = 'rgba(255,235,210,0.06)';
      ctx.beginPath();
      ctx.moveTo(pts[3][0], pts[3][1]);
      ctx.lineTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.stroke();
      ctx.strokeStyle = GROUT;
      ctx.beginPath();
      ctx.moveTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.lineTo(pts[3][0], pts[3][1]);
      ctx.stroke();
      // pontilhado
      for (let k = 0; k < 5; k++) {
        const s = 0.1 + hash(x, y, i, j, k) * 0.8;
        const t = 0.1 + hash(y, x, j, i, k + 7) * 0.8;
        const [px, py] = iso(u0 + s * 0.5, v0 + t * 0.5, h);
        ctx.fillStyle = hash(k, x, y, i + j) < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,240,220,0.06)';
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
      // sombra de degrau: piso mais alto atrás
      const backX = map.floorHeight(x - 1, y);
      const backY = map.floorHeight(x, y - 1);
      if (i === 0 && backX !== null && backX > h) poly(ctx, [iso(u0, v0, h), iso(u0 + 0.5, v0, h), iso(u0 + 0.5, v0 + 0.5, h), iso(u0, v0 + 0.5, h)], 'rgba(0,0,0,0.28)');
      if (j === 0 && backY !== null && backY > h) poly(ctx, [iso(u0, v0, h), iso(u0 + 0.5, v0, h), iso(u0 + 0.5, v0 + 0.5, h), iso(u0, v0 + 0.5, h)], 'rgba(0,0,0,0.28)');
      // rachaduras
      if (r < 0.06 && !door) {
        const [ax, ay] = iso(u0 + 0.1, v0 + 0.25, h);
        const [bx2, by2] = iso(u0 + 0.3, v0 + 0.2, h);
        const [cx, cy] = iso(u0 + 0.42, v0 + 0.4, h);
        ctx.strokeStyle = 'rgba(10,8,6,0.55)';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx2, by2);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
    }
}

/** Linha clara na borda de trás de um piso mais alto que o vizinho (leitura do degrau). */
function drawLedges(ctx: CanvasRenderingContext2D, map: RoomMap, x: number, y: number, h: number) {
  const bx = map.floorHeight(x - 1, y);
  const by = map.floorHeight(x, y - 1);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,235,210,0.22)';
  if (bx !== null && bx < h) {
    const a = iso(x, y, h);
    const b = iso(x, y + 1, h);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  if (by !== null && by < h) {
    const a = iso(x, y, h);
    const b = iso(x + 1, y, h);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

export function buildStatic(map: RoomMap, wantScale: number, style?: FloorStyle): StaticLayer {
  const look = floorLook(style);
  const bd = roomBounds(map);
  const pad = 8;
  const x = Math.floor(bd.minX - pad);
  const y = Math.floor(bd.minY - pad);
  const w = Math.ceil(bd.maxX - bd.minX + pad * 2);
  const h = Math.ceil(bd.maxY - bd.minY + pad * 2);
  const scale = Math.min(wantScale, Math.sqrt(MAX_PIXELS / (w * h)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w * scale));
  canvas.height = Math.max(1, Math.ceil(h * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
  ctx.lineJoin = 'round';

  const minH = minFloor(map);
  const door = map.door;
  const doorH = map.floorHeight(door.x, door.y);
  const doorSeg = map.walls.segs.find((s) => s.door);
  if (doorSeg && doorH !== null) {
    const hole = wallQuad(doorSeg, doorSeg.at + 0.1, doorSeg.at + 0.9, doorSeg.base, doorSeg.base + DOOR_H);
    poly(ctx, hole, '#050405');
    drawTile(ctx, map, door.x, door.y, doorH, true, minH);
    const [gx, gy] = iso(door.x + 0.5, door.y + 0.5, doorH + 1.2);
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 60);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = g;
    poly(ctx, hole);
    ctx.fill();
  }

  const segs = [...map.walls.segs].sort((a, b) => (a.wall === b.wall ? 0 : a.wall === 'r' ? -1 : 1));
  for (const s of segs) drawWallSeg(ctx, map, s);
  // cantos
  for (const s of map.walls.segs) {
    if (s.wall !== 'l') continue;
    const r = map.walls.find('r', s.at, s.plane);
    if (!r) continue;
    const top = map.walls.top;
    poly(ctx, [iso(s.plane - T, s.at - T, top), iso(s.plane, s.at - T, top), iso(s.plane, s.at, top), iso(s.plane - T, s.at, top)], WALL_TOP, WALL_TOP);
  }

  const tiles: [number, number, number][] = [];
  for (let ty = 0; ty < map.height; ty++)
    for (let tx = 0; tx < map.width; tx++) {
      const th = map.floorHeight(tx, ty);
      if (th !== null && !map.isDoor(tx, ty)) tiles.push([tx, ty, th]);
    }
  tiles.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[2] - b[2]);
  for (const [tx, ty, th] of tiles) {
    drawTile(ctx, map, tx, ty, th, false, minH, look);
    drawLedges(ctx, map, tx, ty, th);
  }

  return { canvas, x, y, w, h };
}
