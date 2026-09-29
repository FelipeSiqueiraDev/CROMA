import { parseHeightmap, type SceneInfo } from '@croma/shared';
import type { App } from './app';
import { clear, h, icon } from './dom';

const DOT_COLORS = ['#e3a94c', '#6fdc8c', '#6fa8ff', '#ff8a7a', '#c78bff', '#3fe0c0', '#ffd27a', '#ff6fb0'];
export function playerColor(id: number) {
  return DOT_COLORS[id % DOT_COLORS.length];
}

/** Miniatura isométrica da cena com passagens e jogadores. */
function sceneCanvas(s: SceneInfo, meId: number, w = 150, hh = 96): HTMLCanvasElement {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const c = h('canvas', { width: w * dpr, height: hh * dpr, style: `width:${w}px;height:${hh}px` });
  const ctx = c.getContext('2d')!;
  const hm = parseHeightmap(s.heightmap);
  const span = hm.width + hm.height;
  const tw = Math.min(18, (w - 10) / (span / 2));
  const th = tw / 2;
  const zp = th * 0.8;
  let maxH = 0;
  for (const r of hm.tiles) for (const t of r) if (t !== null && t > maxH) maxH = t;
  const ox = w / 2 - ((hm.width - hm.height) * tw) / 4;
  const oy = (hh - (span * th) / 2) / 2 + maxH * zp * 0.5;
  const P = (x: number, y: number, z: number): [number, number] => [ox + ((x - y) * tw) / 2, oy + ((x + y) * th) / 2 - z * zp];
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let sum = 0; sum < span; sum++)
    for (let y = 0; y < hm.height; y++) {
      const x = sum - y;
      if (x < 0 || x >= hm.width) continue;
      const t = hm.tiles[y][x];
      if (t === null) continue;
      const [sx, sy] = P(x, y, t);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + tw / 2, sy + th / 2);
      ctx.lineTo(sx, sy + th);
      ctx.lineTo(sx - tw / 2, sy + th / 2);
      ctx.closePath();
      ctx.fillStyle = `hsl(24, 9%, ${20 + t * 6}%)`;
      ctx.fill();
    }
  const heightAt = (x: number, y: number) => hm.tiles[y]?.[x] ?? 0;
  for (const p of s.portals) {
    const [sx, sy] = P(p.x + 0.5, p.y + 0.5, heightAt(p.x, p.y));
    ctx.fillStyle = '#b3261e';
    ctx.fillRect(sx - 2.5, sy - 5, 5, 6);
  }
  for (const u of s.users) {
    const [sx, sy] = P(u.x + 0.5, u.y + 0.5, heightAt(u.x, u.y));
    ctx.beginPath();
    ctx.arc(sx, sy - 2, u.id === meId ? 4 : 3.2, 0, Math.PI * 2);
    ctx.fillStyle = playerColor(u.id);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = u.id === meId ? '#fff' : 'rgba(0,0,0,0.8)';
    ctx.stroke();
  }
  return c;
}

/** Minimapa: todas as cenas ligadas por Passagens e onde cada jogador está. */
export class Minimap {
  readonly el: HTMLElement;
  private app: App;
  private collapsed = false;
  private scenes: SceneInfo[] = [];

  constructor(app: App) {
    this.app = app;
    this.el = h('aside', { class: 'minimap hidden', 'aria-label': 'Minimapa de cenas' });
    app.on('room', () => this.render());
  }

  set(scenes: SceneInfo[]) {
    this.scenes = scenes;
    this.render();
  }

  private render() {
    const el = clear(this.el);
    const room = this.app.state.room;
    if (this.scenes.length < 2 || !room) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const meId = this.app.state.me?.id ?? 0;
    const gm = !!room.isOwner;
    const total = this.scenes.reduce((n, s) => n + s.users.length, 0);
    el.append(
      h(
        'button',
        { class: 'mm-head', onclick: () => ((this.collapsed = !this.collapsed), this.render()), 'aria-expanded': String(!this.collapsed) },
        icon('map', 15),
        h('b', null, 'Cenas'),
        h('span', { class: 'muted' }, `${this.scenes.length} · ${total} jogador${total === 1 ? '' : 'es'}`),
      ),
    );
    if (this.collapsed) return;
    const list = h('div', { class: 'mm-list' });
    // cena atual primeiro
    const ordered = [...this.scenes].sort((a, b) => (a.id === room.id ? -1 : b.id === room.id ? 1 : a.id - b.id));
    for (const s of ordered) {
      const here = s.id === room.id;
      const users = h('div', { class: 'mm-users' });
      for (const u of s.users) {
        const chip = h('span', { class: 'mm-user', style: `--c:${playerColor(u.id)}` }, u.name);
        if (gm && !here && u.id !== meId) {
          chip.classList.add('act');
          chip.title = 'Trazer para a cena atual';
          chip.addEventListener('click', () => this.app.net.send({ t: 'sendTo', userId: u.id, roomId: room.id }));
        }
        users.append(chip);
      }
      if (!s.users.length) users.append(h('span', { class: 'muted small' }, 'vazia'));
      const actions = h('div', { class: 'mm-acts' });
      if (gm && !here) {
        actions.append(
          h('button', { class: 'mm-btn', title: 'Ir para esta cena', onclick: () => this.app.net.send({ t: 'join', roomId: s.id }) }, 'Ir'),
          h('button', { class: 'mm-btn', title: 'Levar todos da cena atual para esta', onclick: () => this.app.net.send({ t: 'sendTo', userId: 'all', roomId: s.id }) }, 'Levar todos'),
        );
      }
      list.append(
        h(
          'div',
          { class: `mm-scene${here ? ' here' : ''}` },
          h('div', { class: 'mm-name' }, here ? '● ' : '', s.name),
          sceneCanvas(s, meId),
          users,
          actions.childElementCount ? actions : null,
        ),
      );
    }
    el.append(list);
    if (gm) el.append(h('p', { class: 'mm-tip muted' }, 'Clique no nome de um jogador em outra cena para trazê-lo.'));
  }
}
