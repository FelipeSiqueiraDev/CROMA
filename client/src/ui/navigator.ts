import { LAYOUTS, parseHeightmap, type Door } from '@croma/shared';
import type { App } from './app';
import { clear, h, icon, Win } from './dom';

/** Desenha uma planta em miniatura (isométrica). */
export function layoutPreview(heightmap: string, door: Door, w = 120, hh = 80): HTMLCanvasElement {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const c = h('canvas', { width: w * dpr, height: hh * dpr, style: `width:${w}px;height:${hh}px`, class: 'layout-prev' });
  const ctx = c.getContext('2d')!;
  const hm = parseHeightmap(heightmap);
  const span = hm.width + hm.height;
  const tw = Math.min(16, (w - 8) / (span / 2) / 1.0);
  const th = tw / 2;
  const zp = th * 0.8;
  let maxH = 0;
  for (const r of hm.tiles) for (const t of r) if (t !== null && t > maxH) maxH = t;
  const ox = w / 2 - ((hm.width - hm.height) * tw) / 4;
  const oy = (hh - (span * th) / 2) / 2 + maxH * zp * 0.5;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let s = 0; s < span; s++)
    for (let y = 0; y < hm.height; y++) {
      const x = s - y;
      if (x < 0 || x >= hm.width) continue;
      const t = hm.tiles[y][x];
      if (t === null) continue;
      const sx = ox + ((x - y) * tw) / 2;
      const sy = oy + ((x + y) * th) / 2 - t * zp;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + tw / 2, sy + th / 2);
      ctx.lineTo(sx, sy + th);
      ctx.lineTo(sx - tw / 2, sy + th / 2);
      ctx.closePath();
      const isDoor = x === door.x && y === door.y;
      ctx.fillStyle = isDoor ? '#e3a94c' : `hsl(24, 10%, ${26 + t * 7}%)`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  return c;
}

export class NavigatorWin {
  readonly win: Win;
  private app: App;
  private tab: 'rooms' | 'mine' | 'create' = 'rooms';

  constructor(app: App) {
    this.app = app;
    this.win = new Win('Navegador', { width: 420, x: 24, y: 70 });
    app.on('rooms', () => this.win.isOpen && this.tab !== 'create' && this.render());
    app.on('room', () => this.win.isOpen && this.render());
  }

  open() {
    this.app.net.send({ t: 'rooms' });
    this.render();
    this.win.open();
  }

  toggle() {
    if (this.win.isOpen) this.win.close();
    else this.open();
  }

  private render() {
    const b = clear(this.win.body);
    const mk = (id: typeof this.tab, label: string) =>
      h('button', { class: `tab${this.tab === id ? ' on' : ''}`, onclick: () => ((this.tab = id), this.render()) }, label);
    b.append(h('div', { class: 'tabs' }, mk('rooms', 'Quartos'), mk('mine', 'Meus quartos'), mk('create', 'Criar quarto')));
    if (this.tab === 'create') return b.append(this.createForm());
    const me = this.app.state.me?.name.toLowerCase();
    const rooms = this.app.state.rooms.filter((r) => this.tab === 'rooms' || r.owner.toLowerCase() === me);
    const list = h('div', { class: 'room-list' });
    if (!rooms.length) list.append(h('p', { class: 'muted' }, this.tab === 'mine' ? 'Você ainda não criou quartos.' : 'Nenhum quarto.'));
    for (const r of rooms) {
      const here = this.app.state.room?.id === r.id;
      list.append(
        h(
          'button',
          {
            class: `room-row${here ? ' here' : ''}`,
            onclick: () => {
              if (!here) this.app.net.send({ t: 'join', roomId: r.id });
              this.win.close();
            },
          },
          h('div', { class: 'room-info' }, h('b', null, r.name), h('small', null, r.description || `de ${r.owner}`)),
          h('span', { class: `badge${r.users ? ' live' : ''}` }, icon('user', 12), String(r.users)),
        ),
      );
    }
    b.append(list);
  }

  private createForm() {
    const name = h('input', { class: 'input', maxlength: 30, placeholder: 'Nome do quarto' });
    let model = LAYOUTS[0].id;
    const grid = h('div', { class: 'layout-grid' });
    for (const l of LAYOUTS) {
      const card = h(
        'button',
        {
          class: `layout-card${l.id === model ? ' on' : ''}`,
          type: 'button',
          onclick: () => {
            model = l.id;
            grid.querySelectorAll('.layout-card').forEach((e) => e.classList.remove('on'));
            card.classList.add('on');
          },
        },
        layoutPreview(l.heightmap, l.door),
        h('span', null, l.name),
      );
      grid.append(card);
    }
    return h(
      'form',
      {
        class: 'form',
        onsubmit: (e: Event) => {
          e.preventDefault();
          this.app.net.send({ t: 'createRoom', name: name.value, model });
        },
      },
      h('label', { class: 'field-label' }, 'Nome'),
      name,
      h('label', { class: 'field-label' }, 'Planta'),
      grid,
      h('button', { class: 'btn primary', type: 'submit' }, 'Criar e entrar'),
      h('p', { class: 'muted' }, 'Você será o mestre do quarto: pode construir, criar pistas e editar a planta.'),
    );
  }
}
