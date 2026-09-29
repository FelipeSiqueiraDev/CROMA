import type { LightMode } from '@croma/shared';
import type { App } from './app';
import { clear, h, Win } from './dom';

const MODES: [LightMode, string, string][] = [
  ['normal', 'Normal', 'Luzes funcionando'],
  ['flicker', 'Piscando', 'Energia falhando em rajadas'],
  ['blackout', 'Apagão', 'Só velas, janelas e emergência'],
];

/** Controles de clima ao vivo para o mestre: luz, névoa e escuridão. */
export class FxWin {
  readonly win: Win;
  private app: App;

  constructor(app: App) {
    this.app = app;
    this.win = new Win('Clima da cena', { width: 330, x: innerWidth - 370, y: 80 });
    app.on('room', () => this.win.isOpen && this.render());
  }

  toggle() {
    if (this.win.isOpen) this.win.close();
    else {
      this.render();
      this.win.open();
    }
  }

  private render() {
    const r = this.app.state.room;
    const b = clear(this.win.body);
    if (!r) return;
    const send = (p: { lightMode?: LightMode; fog?: number; darkness?: number }) => this.app.net.send({ t: 'roomFx', ...p });
    const modes = h('div', { class: 'fx-modes' });
    for (const [id, label, desc] of MODES)
      modes.append(
        h('button', { class: `fx-mode ${id}${r.lightMode === id ? ' on' : ''}`, onclick: () => send({ lightMode: id }) }, h('b', null, label), h('small', null, desc)),
      );
    const slider = (label: string, value: number, max: number, onDone: (v: number) => void, onLive: (v: number) => void) => {
      const i = h('input', { type: 'range', min: '0', max: String(max), value: String(Math.round(value * 100)) });
      const v = h('span', { class: 'muted' }, `${i.value}%`);
      i.addEventListener('input', () => {
        v.textContent = `${i.value}%`;
        onLive(Number(i.value) / 100);
      });
      i.addEventListener('change', () => onDone(Number(i.value) / 100));
      return h('div', null, h('label', { class: 'field-label' }, label), h('div', { class: 'row' }, i, v));
    };
    const info = this.app.view.info;
    b.append(
      h('label', { class: 'field-label' }, 'Luz ambiente'),
      modes,
      slider('Névoa', r.fog, 100, (v) => send({ fog: v }), (v) => info && (info.fog = v)),
      slider('Escuridão', r.darkness, 90, (v) => send({ darkness: v }), (v) => info && (info.darkness = v)),
      h('p', { class: 'muted' }, 'Muda na hora para todos na cena.'),
    );
  }
}
