import { FLOOR_STYLES, heightToChar, MAX_ROOM_SIZE, PARTICLE_KINDS, parseHeightmap, type Door, type FloorStyle, type ParticleKind } from '@croma/shared';
import type { App } from './app';
import { clear, h, icon, Win } from './dom';

export class RoomSettingsWin {
  readonly win: Win;
  private app: App;
  private floor: FloorEditorWin;

  constructor(app: App) {
    this.app = app;
    this.win = new Win('Configurar quarto', { width: 380, x: 90, y: 90 });
    this.floor = new FloorEditorWin(app);
    this.win.onClose = () => {
      // desfaz prévia de escuridão não salva
      const r = this.app.state.room;
      if (r && this.app.view.info) this.app.view.info.darkness = r.darkness;
    };
  }

  toggle() {
    if (this.win.isOpen) this.win.close();
    else this.open();
  }

  open() {
    const r = this.app.state.room;
    if (!r) return;
    const b = clear(this.win.body);
    const name = h('input', { class: 'input', maxlength: 30, value: r.name });
    const desc = h('input', { class: 'input', maxlength: 140, value: r.description, placeholder: 'Descrição curta' });
    const dark = h('input', { type: 'range', min: '0', max: '90', value: String(Math.round(r.darkness * 100)) });
    const darkV = h('span', { class: 'muted' }, `${dark.value}%`);
    dark.addEventListener('input', () => {
      darkV.textContent = `${dark.value}%`;
      if (this.app.view.info) this.app.view.info.darkness = Number(dark.value) / 100;
    });
    const system = r.owner === 'CROMA';
    const pub = h('input', { type: 'checkbox', checked: r.publicBuild, disabled: system });
    const floorName = h('input', { class: 'input', maxlength: 20, value: r.floor ?? '', placeholder: 'Térreo, Subsolo… (vazio = um andar só)' });
    const style = h('select', { class: 'input' }, ...FLOOR_STYLES.map((f) => h('option', { value: f.id, selected: (r.floorStyle ?? 'pedra') === f.id }, f.name)));
    const useAmbient = h('input', { type: 'checkbox', checked: !!r.ambient });
    const ambient = h('input', { type: 'color', value: r.ambient ?? '#6a5a8a' });
    const parts = PARTICLE_KINDS.map((p) => ({ id: p.id, box: h('input', { type: 'checkbox', checked: (r.particles ?? []).includes(p.id) }), name: p.name }));
    b.append(
      h(
        'form',
        {
          class: 'form',
          onsubmit: (e: Event) => {
            e.preventDefault();
            this.app.net.send({
              t: 'roomSettings',
              name: name.value,
              description: desc.value,
              darkness: Number(dark.value) / 100,
              publicBuild: pub.checked,
              floor: floorName.value,
              floorStyle: style.value as FloorStyle,
              ambient: useAmbient.checked ? ambient.value : null,
              particles: parts.filter((p) => p.box.checked).map((p) => p.id as ParticleKind),
            });
            this.win.close();
          },
        },
        h('label', { class: 'field-label' }, 'Nome'),
        name,
        h('label', { class: 'field-label' }, 'Descrição'),
        desc,
        h('label', { class: 'field-label' }, 'Andar'),
        floorName,
        h('label', { class: 'field-label' }, 'Piso'),
        style,
        h('label', { class: 'field-label' }, 'Cor do ambiente'),
        h('div', { class: 'row' }, h('label', { class: 'check' }, useAmbient, 'Tingir o escuro'), ambient),
        h('label', { class: 'field-label' }, 'Partículas'),
        ...parts.map((p) => h('label', { class: 'check' }, p.box, p.name)),
        h('label', { class: 'field-label' }, 'Escuridão ambiente'),
        h('div', { class: 'row' }, dark, darkV),
        h('label', { class: 'check' }, pub, system ? 'Quarto público do sistema: todos constroem' : 'Todos podem construir'),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn primary', type: 'submit' }, 'Salvar'),
          h('button', { class: 'btn', type: 'button', onclick: () => this.floor.open() }, icon('map', 16), 'Editar planta'),
        ),
      ),
    );
    this.win.open();
  }
}

type Tool = 'paint' | 'erase' | 'door';

class FloorEditorWin {
  readonly win: Win;
  private app: App;
  private tiles: (number | null)[][] = [];
  private door: Door = { x: 0, y: 0, dir: 2 };
  private tool: Tool = 'paint';
  private height = 0;
  private canvas: HTMLCanvasElement | null = null;
  private cell = 14;

  constructor(app: App) {
    this.app = app;
    this.win = new Win('Editor de planta', { width: 640, x: 60, y: 40, cls: 'floor-editor' });
  }

  open() {
    const r = this.app.state.room;
    if (!r) return;
    const hm = parseHeightmap(r.heightmap);
    this.tiles = hm.tiles.map((row) => [...row]);
    this.door = { ...r.door };
    this.render();
    this.win.open();
  }

  private get w() {
    return this.tiles[0]?.length ?? 0;
  }
  private get hgt() {
    return this.tiles.length;
  }

  private resizeGrid(w: number, hh: number) {
    w = Math.max(2, Math.min(MAX_ROOM_SIZE, w));
    hh = Math.max(2, Math.min(MAX_ROOM_SIZE, hh));
    const next: (number | null)[][] = [];
    for (let y = 0; y < hh; y++) next.push(Array.from({ length: w }, (_, x) => this.tiles[y]?.[x] ?? null));
    this.tiles = next;
    this.render();
  }

  private render() {
    const b = clear(this.win.body);
    const toolBtn = (t: Tool, label: string) => h('button', { class: `chip${this.tool === t ? ' on' : ''}`, type: 'button', onclick: () => ((this.tool = t), this.render()) }, label);
    const heights = h('div', { class: 'chips' });
    for (let i = 0; i <= 9; i++)
      heights.append(
        h('button', { class: `chip hchip${this.height === i ? ' on' : ''}`, style: `--hl:${22 + i * 7}%`, type: 'button', onclick: () => ((this.height = i), (this.tool = 'paint'), this.render()) }, String(i)),
      );
    const wI = h('input', { class: 'input small', type: 'number', min: '2', max: String(MAX_ROOM_SIZE), value: String(this.w) });
    const hI = h('input', { class: 'input small', type: 'number', min: '2', max: String(MAX_ROOM_SIZE), value: String(this.hgt) });
    wI.addEventListener('change', () => this.resizeGrid(Number(wI.value), this.hgt));
    hI.addEventListener('change', () => this.resizeGrid(this.w, Number(hI.value)));
    const dirSel = h(
      'select',
      { class: 'input small' },
      ...['↗ 0', '→ 1', '↘ 2', '↓ 3', '↙ 4', '← 5', '↖ 6', '↑ 7'].map((l, i) => h('option', { value: String(i), selected: this.door.dir === i }, l)),
    );
    dirSel.addEventListener('change', () => (this.door.dir = Number(dirSel.value)));
    this.cell = Math.max(8, Math.min(30, Math.floor(600 / Math.max(this.w, this.hgt))));
    const dpr = Math.min(2, devicePixelRatio || 1);
    const cw = this.w * this.cell;
    const ch = this.hgt * this.cell;
    const canvas = h('canvas', { class: 'floor-grid', width: cw * dpr, height: ch * dpr, style: `width:${cw}px;height:${ch}px` });
    this.canvas = canvas;
    let painting = false;
    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: Math.floor((e.clientX - r.left) / this.cell), y: Math.floor((e.clientY - r.top) / this.cell) };
    };
    const apply = (e: PointerEvent) => {
      const { x, y } = at(e);
      if (x < 0 || y < 0 || x >= this.w || y >= this.hgt) return;
      if (this.tool === 'paint') this.tiles[y][x] = this.height;
      else if (this.tool === 'erase') this.tiles[y][x] = null;
      else {
        if (this.tiles[y][x] === null) this.tiles[y][x] = this.height;
        this.door = { ...this.door, x, y };
      }
      this.drawGrid();
    };
    canvas.addEventListener('pointerdown', (e) => {
      painting = this.tool !== 'door';
      canvas.setPointerCapture(e.pointerId);
      apply(e);
    });
    canvas.addEventListener('pointermove', (e) => painting && apply(e));
    canvas.addEventListener('pointerup', () => (painting = false));
    b.append(
      h(
        'div',
        { class: 'fe-tools' },
        h('div', { class: 'chips' }, toolBtn('paint', 'Pintar piso'), toolBtn('erase', 'Apagar'), toolBtn('door', 'Porta')),
        h('label', null, 'Altura', heights),
        h('label', null, 'Largura', wI),
        h('label', null, 'Altura (y)', hI),
        h('label', null, 'Direção de entrada', dirSel),
      ),
      h('div', { class: 'fe-canvas' }, canvas),
      h(
        'p',
        { class: 'muted' },
        'A porta deve ficar num piso encostado na parede esquerda ou de trás. Mobis que não couberem na nova planta voltam para o seu inventário.',
      ),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => this.save() }, 'Salvar planta'),
        h('button', { class: 'btn', onclick: () => this.open() }, 'Desfazer mudanças'),
      ),
    );
    this.drawGrid();
  }

  private drawGrid() {
    const c = this.canvas;
    if (!c) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b090c';
    ctx.fillRect(0, 0, c.width, c.height);
    const s = this.cell;
    for (let y = 0; y < this.hgt; y++)
      for (let x = 0; x < this.w; x++) {
        const t = this.tiles[y][x];
        if (t !== null) {
          ctx.fillStyle = `hsl(24, 12%, ${22 + t * 7}%)`;
          ctx.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
          if (s >= 12) {
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.font = `${Math.floor(s * 0.6)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(t), x * s + s / 2, y * s + s / 2 + 1);
          }
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.strokeRect(x * s + 0.5, y * s + 0.5, s - 1, s - 1);
        }
      }
    ctx.strokeStyle = '#e3a94c';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.door.x * s + 1, this.door.y * s + 1, s - 2, s - 2);
  }

  private save() {
    const hm = this.tiles.map((row) => row.map(heightToChar).join('')).join('\n');
    this.app.net.send({ t: 'floorPlan', heightmap: hm, door: this.door });
    this.win.close();
  }
}
