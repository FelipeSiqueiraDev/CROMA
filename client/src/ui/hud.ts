import { MAX_CHAT, type ChatKind, type RollResult } from '@croma/shared';
import type { App } from './app';
import { h, icon } from './dom';

export interface HudActions {
  navigator(): void;
  catalog(): void;
  inventory(): void;
  characters(): void;
  settings(): void;
  fx(): void;
  help(): void;
}

interface LogEntry {
  name: string;
  text: string;
  kind: ChatKind;
  roll?: RollResult;
  at: Date;
}

export class Hud {
  readonly el: HTMLElement;
  private app: App;
  private input: HTMLInputElement;
  private roomLabel: HTMLElement;
  private log: HTMLElement;
  private logList: HTMLElement;
  private dice: HTMLElement;
  private placeBar: HTMLElement;
  private settingsBtn: HTMLButtonElement;
  private fxBtn: HTMLButtonElement;
  private entries: LogEntry[] = [];
  private history: string[] = [];
  private histPos = -1;

  constructor(app: App, act: HudActions) {
    this.app = app;
    const btn = (name: string, label: string, fn: () => void) =>
      h('button', { class: 'hud-btn', title: label, 'aria-label': label, onclick: fn }, icon(name, 20), h('span', null, label));
    this.input = h('input', {
      class: 'chat-input',
      maxlength: MAX_CHAT,
      placeholder: 'Diga algo…  (/r 1d20 rola dados · Shift+Enter grita)',
      'aria-label': 'Mensagem',
      autocomplete: 'off',
      spellcheck: false,
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit(e.shiftKey);
      } else if (e.key === 'ArrowUp' && this.history.length) {
        e.preventDefault();
        this.histPos = Math.min(this.history.length - 1, this.histPos + 1);
        this.input.value = this.history[this.history.length - 1 - this.histPos];
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.histPos = Math.max(-1, this.histPos - 1);
        this.input.value = this.histPos < 0 ? '' : this.history[this.history.length - 1 - this.histPos];
      } else if (e.key === 'Escape') this.input.blur();
      e.stopPropagation();
    });
    this.dice = this.buildDice();
    this.roomLabel = h('div', { class: 'room-label' });
    this.settingsBtn = btn('gear', 'Quarto', act.settings);
    this.fxBtn = btn('cloud', 'Clima', act.fx);
    this.logList = h('div', { class: 'log-list' });
    this.log = h('div', { class: 'chat-log hidden' }, h('div', { class: 'log-head' }, 'Histórico'), this.logList);
    this.placeBar = h('div', { class: 'place-bar hidden' });
    const zoom = h(
      'div',
      { class: 'zoom' },
      h('button', { class: 'icon-btn', title: 'Afastar', 'aria-label': 'Afastar', onclick: () => app.view.zoomStep(-1) }, icon('minus', 16)),
      h('button', { class: 'icon-btn', title: 'Enquadrar quarto', 'aria-label': 'Enquadrar quarto', onclick: () => app.view.fit() }, icon('target', 16)),
      h('button', { class: 'icon-btn', title: 'Aproximar', 'aria-label': 'Aproximar', onclick: () => app.view.zoomStep(1) }, icon('plus', 16)),
      h('button', { class: 'icon-btn', title: 'Como jogar', 'aria-label': 'Como jogar', onclick: act.help }, icon('help', 17)),
    );
    this.el = h(
      'div',
      { class: 'hud' },
      this.log,
      this.dice,
      this.placeBar,
      h(
        'footer',
        { class: 'hud-bar' },
        h(
          'div',
          { class: 'hud-left' },
          h('div', { class: 'hud-logo' }, 'CROMA'),
          btn('nav', 'Navegador', act.navigator),
          btn('catalog', 'Catálogo', act.catalog),
          btn('box', 'Inventário', act.inventory),
          btn('user', 'Personagem', act.characters),
          this.settingsBtn,
          this.fxBtn,
        ),
        h(
          'div',
          { class: 'hud-chat' },
          h('button', { class: 'icon-btn', title: 'Histórico do chat', 'aria-label': 'Histórico do chat', onclick: () => this.log.classList.toggle('hidden') }, icon('log', 18)),
          this.input,
          h('button', { class: 'icon-btn dice-btn', title: 'Rolar dados', 'aria-label': 'Rolar dados', onclick: () => this.dice.classList.toggle('hidden') }, icon('dice', 20)),
        ),
        h('div', { class: 'hud-right' }, this.roomLabel, zoom),
      ),
    );
    app.on('room', () => this.updateRoom());
    app.on('rooms', () => this.updateRoom());
    this.updateRoom();
  }

  focusChat(ch?: string) {
    this.input.focus();
    if (ch) this.input.value += ch;
  }

  private submit(shout: boolean) {
    const text = this.input.value.trim();
    this.input.value = '';
    this.histPos = -1;
    if (!text) return;
    this.history.push(text);
    if (this.history.length > 50) this.history.shift();
    const net = this.app.net;
    const lower = text.toLowerCase();
    if (lower === 'o/' || lower === ':acenar' || lower === ':wave') return net.send({ t: 'action', action: 'wave' });
    if (lower === ':sit' || lower === ':sentar') return net.send({ t: 'action', action: 'sit' });
    if (lower === ':stand' || lower === ':levantar') return net.send({ t: 'action', action: 'stand' });
    if (lower === ':dance' || lower === ':dancar' || lower === ':dançar') return net.send({ t: 'action', action: 'dance' });
    net.send({ t: 'chat', text, shout });
  }

  private buildDice() {
    const mod = h('input', { class: 'input small', type: 'number', value: '0', min: '-99', max: '99', 'aria-label': 'Modificador' });
    const count = h('input', { class: 'input small', type: 'number', value: '1', min: '1', max: '20', 'aria-label': 'Quantidade' });
    const keep = h('select', { class: 'input small', 'aria-label': 'Modo' }, h('option', { value: '' }, 'somar'), h('option', { value: 'kh' }, 'maior'), h('option', { value: 'kl' }, 'menor'));
    const roll = (sides: number) => {
      const n = Math.max(1, Math.min(20, Number(count.value) || 1));
      const m = Math.max(-99, Math.min(99, Number(mod.value) || 0));
      const k = n > 1 ? keep.value : '';
      const expr = `${n}d${sides}${k}${m > 0 ? '+' + m : m < 0 ? m : ''}`;
      this.app.net.send({ t: 'chat', text: `/r ${expr}` });
    };
    return h(
      'div',
      { class: 'dice-pop hidden' },
      h('div', { class: 'dice-row' }, ...[4, 6, 8, 10, 12, 20, 100].map((s) => h('button', { class: 'die', onclick: () => roll(s) }, `d${s}`))),
      h('div', { class: 'dice-row opts' }, h('label', null, 'Qtd', count), h('label', null, 'Mod', mod), h('label', null, 'Modo', keep)),
    );
  }

  private updateRoom() {
    const r = this.app.state.room;
    const count = r ? (this.app.state.rooms.find((x) => x.id === r.id)?.users ?? this.app.view.users.size) : 0;
    this.roomLabel.textContent = r ? `${r.name} · ${count} online` : 'Fora de um quarto';
    this.settingsBtn.style.display = r?.isOwner ? '' : 'none';
    this.fxBtn.style.display = r?.isOwner ? '' : 'none';
  }

  addLog(name: string, text: string, kind: ChatKind, roll?: RollResult) {
    const e: LogEntry = { name, text, kind, roll, at: new Date() };
    this.entries.push(e);
    if (this.entries.length > 120) {
      this.entries.shift();
      this.logList.firstElementChild?.remove();
    }
    const time = e.at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const row = h('div', { class: `log-row ${kind}` }, h('time', null, time));
    if (kind === 'system') row.append(h('span', { class: 'sys' }, text));
    else {
      row.append(h('b', null, name + ': '), h('span', null, text));
      if (roll) row.append(h('strong', { class: 'roll' }, ` [${roll.rolls.join(', ')}]${roll.mod ? (roll.mod > 0 ? ' +' + roll.mod : ' ' + roll.mod) : ''} = ${roll.total}`));
    }
    this.logList.append(row);
    this.logList.scrollTop = this.logList.scrollHeight;
  }

  clearLog() {
    this.entries = [];
    this.logList.textContent = '';
  }

  setPlacement(text: string | null) {
    this.placeBar.classList.toggle('hidden', !text);
    this.placeBar.textContent = text ?? '';
  }

  get chatFocused() {
    return document.activeElement === this.input;
  }
}
