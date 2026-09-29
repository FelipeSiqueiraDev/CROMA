import {
  anyFurniName,
  distinctFacings,
  getFurni,
  getWallFurni,
  LOOT_KINDS,
  lootKindLabel,
  MAX_TOKEN_NAME,
  nextRotation,
  parseHeightmap,
  turnFacing,
  type AvatarLook,
  type CampaignState,
  type FloorItem,
  type Loot,
  type LootKind,
  type Objective,
  type PartyMember,
  type RoomInfo,
  type WallItem,
} from '@croma/shared';
import { portraitCanvas } from '../render/portrait';
import { sprites } from '../render/sprites';
import { thumbCopy } from '../render/thumbs';
import { RoomView } from '../room/RoomView';
import type { App } from './app';
import { clear, h, icon, toast, Win } from './dom';
import { HintEditor, HintViewer } from './infostand';
import { characterPicker, lookEditor } from './lookEditor';
import { logIcon, lootIcon } from './lootIcons';
import { brushSweep, brushWash, bump, countUp, drawStroke, eraseDraw, enter, floatText, flyArc, fxLayer, leave, pencilDraw, pencilShade, reduced, shake, stamp, tilt, typeInto, wait, wipeIn } from './motion';
import { askNote, promptNote } from './note';
import { brushize, paperize, textures, unpaint } from './paperArt';
import { sfx } from './sfx';

export interface ShellActions {
  fx(): void;
  catalog(): void;
  inventory(): void;
  settings(): void;
  characters(): void;
  navigator(): void;
  help(): void;
  logout(): void;
}

type InspTab = 'desc' | 'inter' | 'items';
type Sel = { kind: 'floor' | 'wall'; item: FloorItem | WallItem } | null;
interface TabDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

const THUMB_KEY = 'croma.thumb.';
const COLORS = ['#e3a94c', '#d83a2e', '#3f6fd8', '#f2efe6', '#6fdc8c', '#c78bff', '#3fe0c0', '#ff6fb0'];
const INSP_TABS: InspTab[] = ['desc', 'inter', 'items'];

/** Abas do topo: posição e tamanho exatos do layout de referência (px de design; 1rem = 10). */
const TABS: TabDef[] = [
  { id: 'MAPA', x: 0, y: 8, w: 122, h: 58, rot: -0.6 },
  { id: 'COMBATE', x: 133, y: 12, w: 144, h: 52, rot: -1.1 },
  { id: 'INTERLÚDIO', x: 287, y: 13, w: 130, h: 46, rot: 0.5 },
  { id: 'PERSONAGENS', x: 428, y: 13, w: 153, h: 47, rot: 0.3 },
  { id: 'ITENS', x: 590, y: 10, w: 95, h: 50, rot: -0.5 },
  { id: 'NOTAS', x: 698, y: 10, w: 107, h: 47, rot: 0.7 },
];
const TABS_LEFT = 335;

function loadThumb(id: number): string | null {
  try {
    return localStorage.getItem(THUMB_KEY + id);
  } catch {
    return null;
  }
}
function saveThumb(id: number, url: string) {
  try {
    localStorage.setItem(THUMB_KEY + id, url);
  } catch {
    /* sem storage */
  }
}

function svg(html: string): SVGSVGElement {
  const s = document.createElement('span');
  s.innerHTML = html.trim();
  return s.firstElementChild as SVGSVGElement;
}

/** Sigilo vermelho do topo. */
function sigil(): SVGSVGElement {
  const P = (a: number, r: number) => `${(32 + Math.cos(a) * r).toFixed(2)} ${(32 + Math.sin(a) * r).toFixed(2)}`;
  let spikes = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const long = i % 2 === 0;
    const r2 = long ? (i % 4 === 0 ? 31.5 : 27) : 20;
    const w = long ? 0.12 : 0.06;
    spikes += `M${P(a - w, 6)} L${P(a, r2)} L${P(a + w, 6)}Z `;
  }
  let star = '';
  for (let i = 0; i < 8; i++) star += `${i ? 'L' : 'M'}${P((i * 3 * Math.PI * 2) / 8 - Math.PI / 2, 12.5)} `;
  return svg(`<svg class="sigil" viewBox="0 0 64 64" aria-hidden="true">
    <defs><filter id="sgr" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence baseFrequency="0.95" numOctaves="1" seed="4"/><feDisplacementMap in="SourceGraphic" scale="1.3"/></filter></defs>
    <g filter="url(#sgr)" fill="none" stroke="#c4261d" stroke-linecap="round">
      <path d="${spikes}" fill="#c4261d" stroke="none"/>
      <circle cx="32" cy="32" r="17" stroke-width="1.7"/>
      <circle cx="32" cy="32" r="12.5" stroke-width="0.9"/>
      <path d="${star}Z" stroke-width="1.1"/>
      <circle cx="32" cy="32" r="3.4" fill="#c4261d" stroke="none"/>
    </g></svg>`);
}

/** Fio vermelho preso na aba ativa; muda de aba balançando como barbante. */
class RedThread {
  readonly el: SVGSVGElement;
  private main: SVGPathElement;
  private hi: SVGPathElement;
  private side: SVGPathElement;
  private cur = { xr: 0, xc: 0 };
  private raf = 0;

  constructor(tab: TabDef) {
    this.el = svg(`<svg class="tb-thread" viewBox="0 0 1250 90" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="#a8231c" stroke-width="1.4"/><path stroke="#e05246" stroke-width="0.5" opacity=".6"/><path stroke="#a8231c" stroke-width="1.2"/></svg>`);
    [this.main, this.hi, this.side] = [...this.el.querySelectorAll('path')] as SVGPathElement[];
    const g = RedThread.geo(tab);
    this.draw(g.xr, g.xc, g.xr);
    this.cur = g;
  }

  static geo(t: TabDef) {
    const xl = TABS_LEFT + t.x;
    return { xr: xl + t.w, xc: xl + t.w / 2 };
  }

  /** `xr` = lado direito da aba (parte de cima do fio); `xc` = nó embaixo; `xt` = ponta presa lá em cima. */
  private draw(xr: number, xc: number, xt: number) {
    const f = (n: number) => n.toFixed(1);
    this.main.setAttribute(
      'd',
      `M${f(xt + 45)} -3 C ${f(xr + 26)} 8, ${f(xr + 10)} 15, ${f(xr - 2)} 23 C ${f(xr - 10)} 30, ${f(xr - 13)} 39, ${f(xr - 15)} 46 C ${f(xr - 18)} 54, ${f(xc + 30)} 57, ${f(xc + 15)} 59 C ${f(xc + 9)} 60, ${f(xc + 1)} 56, ${f(xc - 1)} 60 C ${f(xc - 3)} 64, ${f(xc + 5)} 66, ${f(xc + 7)} 62 C ${f(xc + 8)} 58, ${f(xc + 2)} 57, ${f(xc - 3)} 62 C ${f(xc - 10)} 68, ${f(xc - 18)} 74, ${f(xc - 26)} 80 C ${f(xc - 31)} 84, ${f(xc - 35)} 87, ${f(xc - 40)} 92`,
    );
    this.hi.setAttribute('d', `M${f(xt + 46)} -2 C ${f(xr + 27)} 9, ${f(xr + 11)} 16, ${f(xr - 1)} 24 C ${f(xr - 9)} 31, ${f(xr - 12)} 40, ${f(xr - 14)} 47 C ${f(xr - 17)} 55, ${f(xc + 31)} 58, ${f(xc + 16)} 60`);
    this.side.setAttribute('d', `M${f(xt - 21)} -3 C ${f(xr - 16)} 5, ${f(xr - 11)} 12, ${f(xr - 3)} 21`);
  }

  /** Arrasta o fio até a aba: a ponta vai na frente, o nó vem atrasado e passa um pouco. */
  moveTo(tab: TabDef) {
    const to = RedThread.geo(tab);
    const from = { ...this.cur };
    cancelAnimationFrame(this.raf);
    if (reduced()) {
      this.draw(to.xr, to.xc, to.xr);
      this.cur = to;
      return;
    }
    const back = (t: number) => {
      const c1 = 1.9;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const t0 = performance.now();
    const dur = 900;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const top = back(Math.min(1, t / 0.75));
      const mid = back(Math.max(0, Math.min(1, (t - 0.06) / 0.8)));
      const knot = back(Math.max(0, (t - 0.16) / 0.84));
      const xt = from.xr + (to.xr - from.xr) * top;
      const xr = from.xr + (to.xr - from.xr) * mid;
      const xc = from.xc + (to.xc - from.xc) * knot;
      this.draw(xr, xc, xt);
      if (t < 1) this.raf = requestAnimationFrame(step);
      else this.cur = to;
    };
    this.raf = requestAnimationFrame(step);
  }
}

/** Clipe de papel metálico. */
function paperclip(cls: string): SVGSVGElement {
  return svg(`<svg class="${cls}" viewBox="0 0 22 50" aria-hidden="true" fill="none" stroke-linecap="round">
    <defs><linearGradient id="clipg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d9398"/><stop offset=".35" stop-color="#f4f6f7"/><stop offset=".6" stop-color="#a9afb4"/><stop offset="1" stop-color="#e2e5e7"/></linearGradient></defs>
    <path d="M6 33 V10 A5 5 0 0 1 16 10 V40 A3.6 3.6 0 0 1 8.8 40 V14 A2.1 2.1 0 0 1 13 14 V35" stroke="#2d3033" stroke-width="3.6"/>
    <path d="M6 33 V10 A5 5 0 0 1 16 10 V40 A3.6 3.6 0 0 1 8.8 40 V14 A2.1 2.1 0 0 1 13 14 V35" stroke="url(#clipg)" stroke-width="2.2"/>
  </svg>`);
}

/** Percevejo vermelho. */
function pushpin(): SVGSVGElement {
  return svg(`<svg class="pin" viewBox="0 0 32 32" aria-hidden="true">
    <defs><radialGradient id="ping" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff9d8e"/><stop offset=".35" stop-color="#d4342a"/><stop offset="1" stop-color="#5c0905"/></radialGradient></defs>
    <path d="M9 24 L3 31" stroke="#6a6f73" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="12.5" cy="20" rx="8.6" ry="7" fill="url(#ping)"/>
    <circle cx="19" cy="11.5" r="8" fill="url(#ping)"/>
    <ellipse cx="16.6" cy="8.4" rx="2.6" ry="1.6" fill="#fff" opacity=".75"/>
    <ellipse cx="9.6" cy="17.4" rx="2" ry="1.2" fill="#fff" opacity=".5"/>
  </svg>`);
}

/** Traço de tinta sob títulos (grosso à esquerda, afina à direita). */
function uline(cls = 'uline'): SVGSVGElement {
  return svg(`<svg class="${cls}" viewBox="0 0 140 10" preserveAspectRatio="none" aria-hidden="true"><path d="M1 5.2 C 20 3.4 60 3.6 100 3.6 C 118 3.5 132 3.1 139 3.2 L 138.6 5 C 110 5.8 60 6.9 22 7.7 C 12 7.9 4 7.9 1.4 7.3 Z" fill="currentColor"/></svg>`);
}

/** Contorno vermelho feito à mão (aba ativa do inspetor). */
function tabRing(): SVGSVGElement {
  return svg(`<svg class="tab-ring" viewBox="0 0 112 34" preserveAspectRatio="none" aria-hidden="true">
    <path class="ring-line" d="M3.2 33 L2.6 7.4 Q2.4 2.6 7.2 2.3 L103.6 1.4 Q109.4 1.2 109.8 6.4 L110.6 33" fill="none" stroke="#c9352b" stroke-width="1.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <path class="ring-under" d="M9 30.6 C 40 29.4 80 30.2 104 30.6 L 103.4 33 C 80 33.5 40 33.8 8.6 33.4 Z" fill="#c9352b"/>
  </svg>`);
}

/** Check a lápis, um pouco diferente em cada objetivo. */
function checkMark(seed: number): SVGSVGElement {
  const r = (i: number) => {
    const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return v - Math.floor(v) - 0.5;
  };
  const n = (base: number, i: number, amp: number) => (base + r(i) * amp).toFixed(2);
  const d = `M${n(3.1, 1, 0.8)} ${n(10.6, 2, 0.8)} C ${n(4.8, 3, 0.6)} ${n(12.2, 4, 0.6)} ${n(6.3, 5, 0.5)} ${n(13.8, 6, 0.5)} ${n(7.8, 7, 0.5)} ${n(15.9, 8, 0.5)} C ${n(10.2, 9, 1)} ${n(10.5, 10, 1)} ${n(13.8, 11, 1)} ${n(5.6, 12, 1)} ${n(18.8, 13, 0.8)} ${n(1.4, 14, 0.8)}`;
  return svg(`<svg viewBox="0 0 20 20" aria-hidden="true"><path class="chk-p" d="${d}"/></svg>`);
}

function arrow(): SVGSVGElement {
  return svg(`<svg class="arr" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.2 5h11.6M9.2 1.6L12.8 5l-3.6 3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}

function warnIcon(): SVGSVGElement {
  return svg(`<svg class="warn" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 1.6 L23.2 20.6 H0.8 Z" fill="#d33a30" stroke="#d33a30" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 7.6v6.2" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.45" fill="#fff"/></svg>`);
}

/** Rabiscos a lápis dos papéis soltos. */
function scribble(): SVGSVGElement {
  return svg(`<svg class="scrib" viewBox="0 0 60 80" aria-hidden="true" fill="none" stroke="#4a3d31" stroke-width="1" stroke-linecap="round" opacity=".55">
    <path d="M8 16 c6 -4 10 4 16 0 s8 -3 12 1"/><path d="M8 28 c5 -2 9 2 14 -1"/><path d="M26 30 l6 -8 l4 9"/>
    <path d="M10 44 c4 6 12 6 16 0 c3 -5 9 -3 11 2"/><path d="M12 58 h22 v10 h-22 z"/><path d="M16 62 h14"/>
  </svg>`);
}

function sunIcon(): SVGSVGElement {
  return svg(`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.4"/><path d="M12 7.6a4.4 4.4 0 0 1 0 8.8z" fill="currentColor"/><path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8"/></svg>`);
}

function gearIcon(): SVGSVGElement {
  const teeth = Array.from({ length: 8 }, (_, i) => `<rect x="-2.3" y="-11" width="4.6" height="5" rx="1" transform="rotate(${i * 45})"/>`).join('');
  return svg(`<svg width="28" height="28" viewBox="-12 -12 24 24" fill="currentColor" aria-hidden="true">${teeth}<circle r="7.6"/><circle r="3.2" fill="#0f0f0e"/></svg>`);
}

function recIcon(): SVGSVGElement {
  return svg(`<svg class="tb-rec" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3.8" fill="currentColor"/></svg>`);
}

/** Janela para criar/editar uma peça. */
class TokenWin {
  readonly win: Win;
  private app: App;

  constructor(app: App) {
    this.app = app;
    this.win = new Win('Personagem', { width: 460, y: 60 });
  }

  open(edit?: { id: number; name: string; look: AvatarLook; color: string; capacity: number }) {
    let look: AvatarLook = edit
      ? { ...edit.look }
      : { skin: '#e8b98f', hair: '#3b2618', hairStyle: 0, top: '#2b2a30', pants: '#1c1b1f', shoes: '#3d3a40', outfit: 1, extra: 0, charId: null };
    let color = edit?.color ?? COLORS[(this.app.view.users.size + 1) % COLORS.length];
    const name = h('input', { class: 'input', maxlength: MAX_TOKEN_NAME, placeholder: 'Nome do personagem', value: edit?.name ?? '' });
    const cap = h('input', { class: 'input small', type: 'number', min: '1', max: '99', value: String(edit?.capacity ?? 10) });
    const colors = h('div', { class: 'swatches' });
    for (const c of COLORS) {
      const b = h('button', {
        type: 'button',
        class: `swatch${c === color ? ' on' : ''}`,
        style: `background:${c}`,
        'aria-label': `Cor ${c}`,
        onclick: () => {
          color = c;
          colors.querySelectorAll('.swatch').forEach((e) => e.classList.remove('on'));
          b.classList.add('on');
        },
      });
      colors.append(b);
    }
    const body = h('div', { class: 'token-look' });
    const renderBody = () => {
      clear(body);
      body.append(
        h('label', { class: 'field-label' }, 'Sprite'),
        characterPicker(this.app.state.characters, look.charId, (id) => {
          look = { ...look, charId: id };
          renderBody();
        }),
      );
      if (!look.charId) body.append(h('label', { class: 'field-label' }, 'Avatar pixel'), lookEditor(look, (l) => (look = { ...l, charId: null })));
    };
    renderBody();
    clear(this.win.body).append(
      h(
        'form',
        {
          class: 'form',
          onsubmit: (e: Event) => {
            e.preventDefault();
            const n = name.value.trim();
            if (!n) return toast('Dê um nome ao personagem.', 'error');
            const capacity = Math.max(1, Math.min(99, Number(cap.value) || 10));
            if (edit) this.app.net.send({ t: 'tokenEdit', tokenId: edit.id, name: n, look, color, capacity });
            else this.app.net.send({ t: 'tokenAdd', name: n, look, color, capacity });
            this.win.close();
          },
        },
        h('label', { class: 'field-label' }, 'Nome'),
        name,
        h('div', { class: 'row' }, h('label', { class: 'field-label' }, 'Carga máx.'), cap),
        h('label', { class: 'field-label' }, 'Cor'),
        colors,
        body,
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, edit ? 'Salvar' : 'Colocar no tabuleiro')),
      ),
    );
    this.win.setTitle(edit ? `Editar ${edit.name}` : 'Novo personagem');
    this.win.open();
    name.focus();
  }
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);
const level = (ratio: number) => (ratio >= 1 ? 'red' : ratio >= 0.75 ? 'yellow' : 'green');

interface Card {
  el: HTMLButtonElement;
  img: HTMLElement;
  name: HTMLElement;
  away: HTMLElement;
  look: string;
  color: string;
}
interface ObjRow {
  id: number;
  el: HTMLElement;
  path: SVGPathElement;
  text: HTMLElement;
  done: boolean;
  busy: boolean;
}
interface Slot {
  el: HTMLButtonElement;
  key: string;
}

/** Tela MAPA, fiel ao layout de referência, com as interações animadas. */
export class Shell {
  readonly el: HTMLElement;
  readonly board: HTMLElement;
  private app: App;
  private campaign: CampaignState | null = null;
  private tokenWin: TokenWin;
  private hintEditor: HintEditor;
  private hintViewer: HintViewer;
  private mapLayer: HTMLElement;
  private mapCanvas: HTMLCanvasElement | null = null;
  private shownAt = 0;
  private sigs: Record<string, string> = {};
  // topo
  private titleEl: HTMLElement;
  private subEl: HTMLElement;
  private tabsEl: HTMLElement;
  private thread: RedThread;
  private fxBtn: HTMLButtonElement;
  /** último giro pedido de cada peça (para cliques seguidos) */
  private turnGoal = new Map<number, { dir: number; at: number }>();
  private menu: HTMLElement;
  private soundItem: HTMLElement;
  private activeTab = 'MAPA';
  private topShown: [string, string] = ['', ''];
  // esquerda
  private scenesEl: HTMLElement;
  private sceneRows = new Map<number, HTMLElement>();
  private activeScene: number | null = null;
  private peeked = new Set<number>();
  private planCanvas: HTMLCanvasElement;
  private planRects: { id: number; x: number; y: number; w: number; h: number; name: string }[] = [];
  private planDrag: { id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null;
  private planScale = 6;
  private planOrigin = { x: 0, y: 0 };
  private planHatch = { room: -1, t: 1 };
  private planFade = { room: -1, t: 1 };
  private planHover = -1;
  private planTip: HTMLElement;
  private objEl: HTMLElement;
  private objPlus: HTMLElement;
  private objRows = new Map<number, ObjRow>();
  private addingObj = false;
  // centro
  private placeBar: HTMLElement;
  private tabOverlay: HTMLElement;
  private hoverTimer = 0;
  private lastRoom: number | null = null;
  // direita
  private inspEl: HTMLElement;
  private inspBody: HTMLElement;
  private closeTag: HTMLElement;
  private giveWrap: HTMLElement;
  private giveBody: HTMLElement;
  private giveOpen = false;
  private giveKey = '';
  private inspTab: InspTab = 'desc';
  private inspKey = '';
  private inspSig = '';
  private photoUrl: string | null = null;
  private giveLoot: { itemId: number; lootId: number } | null = null;
  private delivering = false;
  private addingLoot = false;
  private logging: number | null = null;
  private holders = new Map<number, string | undefined>();
  // baixo
  private partyEl: HTMLElement;
  private cards = new Map<number, Card>();
  private addCard: HTMLElement | null = null;
  private quickEl: HTMLElement;
  private slots: Slot[] = [];
  private logEl: HTMLElement;
  private logRows = new Map<string, HTMLElement>();
  private logReady = false;

  constructor(app: App, act: ShellActions) {
    this.app = app;
    this.tokenWin = new TokenWin(app);
    this.hintEditor = new HintEditor(app);
    this.hintViewer = new HintViewer(app);
    const tex = textures();
    const rs = document.documentElement.style;
    rs.setProperty('--tex-paper', `url(${tex.paper})`);
    rs.setProperty('--tex-dark', `url(${tex.dark})`);
    rs.setProperty('--tex-wood', `url(${tex.wood})`);

    // ================= topo =================
    this.titleEl = h('div', { class: 'tb-title' });
    this.subEl = h('div', { class: 'tb-sub' });
    const brand = h('button', { class: 'tb-brand', title: 'Renomear campanha', onclick: () => this.renameCampaign() }, sigil(), h('div', { class: 'tb-names' }, this.titleEl, this.subEl));
    this.tabsEl = h('nav', { class: 'tb-tabs', role: 'tablist' });
    for (const t of TABS) {
      const b = h(
        'button',
        {
          class: 'tb-tab',
          role: 'tab',
          'data-tab': t.id,
          style: `left:${t.x / 10}rem;top:${t.y / 10}rem;width:${t.w / 10}rem;height:${t.h / 10}rem;--rot:${t.rot}deg`,
          onclick: () => this.setTab(t.id),
        },
        h('span', { class: 'tt-label' }, t.id),
      );
      this.tabsEl.append(b);
    }
    this.thread = new RedThread(TABS[0]);
    this.paintTabs(false);
    this.fxBtn = h('button', { class: 'tb-icon tb-sun', title: 'Clima da cena', 'aria-label': 'Clima da cena', onclick: () => (sfx.click(), act.fx()) }, sunIcon());
    this.soundItem = h('button', { role: 'menuitemcheckbox', onclick: () => this.toggleSound() });
    this.menu = h(
      'div',
      { class: 'tb-menu hidden', role: 'menu' },
      ...(
        [
          ['user', 'Novo personagem', () => this.tokenWin.open()],
          ['catalog', 'Construir (catálogo)', act.catalog],
          ['gear', 'Configurar cena', act.settings],
          ['box', 'Mobis guardados', act.inventory],
          ['user', 'Sprites dos personagens', act.characters],
          ['nav', 'Todas as cenas', act.navigator],
          ['help', 'Como usar', act.help],
        ] as [string, string, () => void][]
      ).map(([ic, label, fn]) => h('button', { role: 'menuitem', onclick: () => (this.menu.classList.add('hidden'), fn()) }, icon(ic, 16), label)),
      this.soundItem,
    );
    this.menu.prepend(h('span', { class: 'tape tape-menu', 'aria-hidden': 'true' }));
    paperize(this.menu, { seed: 90, tone: '#d3bea6', burn: 0.85, torn: 2, stains: 1, creases: 0, pad: 30 });
    this.renderSoundItem();
    const gear = h('button', { class: 'tb-icon', title: 'Configurações', 'aria-label': 'Configurações', onclick: (e: Event) => (e.stopPropagation(), this.toggleMenu()) }, gearIcon());
    document.addEventListener('click', () => this.menu.classList.add('hidden'));
    const end = h(
      'button',
      { class: 'tb-end', onclick: async () => (await askNote('ENCERRAR SESSÃO?', 'O tabuleiro fecha nesta aba. Tudo fica salvo para a próxima sessão.', 'Encerrar', true)) && act.logout() },
      recIcon(),
      h('span', null, 'ENCERRAR SESSÃO'),
      h('span', { class: 'tb-x' }, '✕'),
    );
    const top = h('header', { class: 'tb' }, brand, this.tabsEl, this.thread.el, h('div', { class: 'tb-right' }, this.fxBtn, h('div', { class: 'tb-gear' }, gear, this.menu), end));

    // ================= esquerda =================
    this.scenesEl = h('div', { class: 'scene-list' });
    const scenes = h('section', { class: 'sheet p-scenes' }, h('h3', { class: 'p-title' }, 'CENÁRIO ATUAL'), this.scenesEl);
    paperize(scenes, { seed: 11, tone: '#ceb69b', burn: 1, curl: 'br', curlSize: 32, backs: [{ dx: -6, dy: -3, rot: -1.1, dw: 2, dh: 4 }, { dx: 5, dy: 5, rot: 0.9 }] });
    this.planCanvas = h('canvas', { class: 'plan-canvas' });
    this.planTip = h('span', { class: 'plan-tip hidden' });
    const plan = h('section', { class: 'sheet p-plan' }, h('h3', { class: 'p-title' }, '1º ANDAR', uline()), this.planCanvas, pushpin(), this.planTip);
    paperize(plan, { seed: 12, tone: '#c3b09a', burn: 0.85, grid: 11, backs: [{ dx: -10, dy: 5, rot: -1.4 }] });
    this.bindPlan();
    const left = h('aside', { class: 'col-left' }, scenes, plan);
    const scrapA = h('span', { class: 'scrap scrap-a', 'aria-hidden': 'true' });
    paperize(scrapA, { seed: 41, tone: '#c1ae97', burn: 0.8, shadow: 0.9, torn: 2.4 });
    const note = h('span', { class: 'scrap scrap-note', 'aria-hidden': 'true' }, scribble());
    paperize(note, { seed: 42, tone: '#c4af96', burn: 0.8, torn: 2.2 });
    const noteTape = h('span', { class: 'tape tape-note', 'aria-hidden': 'true' });

    // ================= objetivos =================
    this.objEl = h('div', { class: 'obj-list' });
    this.objPlus = h('button', { class: 'obj-plus hidden', title: 'Novo objetivo', 'aria-label': 'Novo objetivo', onclick: () => ((this.addingObj = true), this.renderObjectives()) }, '+');
    const objs = h('section', { class: 'sheet p-obj' }, h('h3', { class: 'p-title' }, 'OBJETIVOS'), this.objPlus, this.objEl);
    paperize(objs, { seed: 13, tone: '#c3a67e', burn: 0.8, tab: { w: 113, h: 36 }, backs: [{ dx: 5, dy: 4, rot: 1.2, dw: -10, dh: -6 }] });

    // ================= centro =================
    this.placeBar = h('div', { class: 'place-bar hidden' });
    this.tabOverlay = h('div', { class: 'tab-overlay hidden' });
    const zoom = h(
      'div',
      { class: 'board-zoom' },
      h('button', { class: 'bz', title: 'Afastar', 'aria-label': 'Afastar', onclick: () => app.view.zoomStep(-1) }, icon('minus', 16)),
      h('button', { class: 'bz', title: 'Enquadrar', 'aria-label': 'Enquadrar', onclick: () => app.view.fit() }, icon('target', 16)),
      h('button', { class: 'bz', title: 'Aproximar', 'aria-label': 'Aproximar', onclick: () => app.view.zoomStep(1) }, icon('plus', 16)),
    );
    this.board = h('main', { class: 'board' }, this.placeBar, zoom, this.tabOverlay);

    // ================= direita =================
    const backboard = h('div', { class: 'backboard', 'aria-hidden': 'true' });
    this.closeTag = h('button', { class: 'insp-x hidden', title: 'Fechar', 'aria-label': 'Fechar', onclick: () => (sfx.click(), app.view.select(null)) }, paperclip('x-clip'), h('span', null, '✕'));
    this.inspBody = h('div', { class: 'insp-body' });
    this.inspEl = h('section', { class: 'sheet p-insp' }, paperclip('clip'), h('span', { class: 'tape tape-insp', 'aria-hidden': 'true' }), this.closeTag, this.inspBody);
    paperize(this.inspEl, { seed: 14, tone: '#d3bca8', burn: 0.9, backs: [{ dx: -3, dy: 2, rot: -0.5, dw: 4, dh: 2, tone: '#c7b199' }] });
    this.giveBody = h('div', { class: 'give-body' });
    this.giveWrap = h('section', { class: 'sheet p-give hidden' }, this.giveBody);
    paperize(this.giveWrap, { seed: 15, tone: '#d2bba6', burn: 0.9 });
    const giveScrap = h('span', { class: 'scrap scrap-give', 'aria-hidden': 'true' }, scribble());
    paperize(giveScrap, { seed: 43, tone: '#c6b199', burn: 0.8, torn: 2.2, backs: [{ dx: -4, dy: 10, rot: -3, dh: -20 }] });
    const right = h('aside', { class: 'col-right' }, this.inspEl, this.giveWrap);

    // ================= baixo =================
    this.partyEl = h('div', { class: 'party' });
    this.quickEl = h('div', { class: 'quick-slots' });
    for (let i = 0; i < 7; i++) {
      const el = h('button', { class: 'qslot empty', disabled: true, style: `--i:${i}`, onclick: () => this.pickSlot(i) });
      this.slots.push({ el, key: '' });
      this.quickEl.append(el);
    }
    const quick = h(
      'section',
      { class: 'sheet p-quick' },
      h('span', { class: 'tape tape-q1', 'aria-hidden': 'true' }),
      h('span', { class: 'tape tape-q2', 'aria-hidden': 'true' }),
      h('h3', { class: 'p-title' }, 'INVENTÁRIO RÁPIDO (CENÁRIO)'),
      this.quickEl,
    );
    paperize(quick, { seed: 16, tone: '#c9b49b', burn: 1, backs: [{ dx: 4, dy: 5, rot: 0.7, dw: -8 }] });
    this.logEl = h('div', { class: 'log-lines' });
    const log = h('section', { class: 'sheet p-log' }, h('span', { class: 'tape tape-log', 'aria-hidden': 'true' }), h('h3', { class: 'p-title' }, 'ÚLTIMAS AÇÕES'), this.logEl);
    paperize(log, { seed: 17, tone: '#cab59c', burn: 1, tab: { w: 163, h: 11 }, backs: [{ dx: -5, dy: 6, rot: -0.8, dw: 4 }] });
    const bottom = h('footer', { class: 'bottom' }, this.partyEl, quick, log);

    this.mapLayer = h('div', { class: 'map-layer' }, h('div', { class: 'map-fx', 'aria-hidden': 'true' }));
    const ui = h('div', { class: 'ui' }, top, this.board, scrapA, left, note, noteTape, objs, backboard, giveScrap, right, bottom);
    // textura de grafite para os traços a lápis
    const defs = svg(`<svg class="svg-defs" aria-hidden="true"><defs><filter id="pencil-tex" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="0.9" result="d"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.45" result="a"/>
      <feComposite in="d" in2="a" operator="in"/></filter></defs></svg>`);
    this.el = h('div', { class: 'shell hidden' }, defs, this.mapLayer, ui);

    app.on('room', () => this.onRoom());
    app.on('rooms', () => this.renderScenes());
    app.on('selection', () => {
      this.giveLoot = null;
      this.addingLoot = false;
      this.logging = null;
      this.renderInspector();
      this.renderParty();
    });
    app.on('items', () => (this.renderInspector(), this.renderQuick()));
    app.on('characters', () => ((this.sigs.party = ''), this.renderParty()));
    setInterval(() => this.captureThumb(), 4000);
    setInterval(() => this.markWalking(), 180);
    window.addEventListener('resize', () => this.drawPlan());
  }

  // ================= montagem =================
  /** Coloca o canvas do tabuleiro atrás da interface e informa a área visível. */
  mountCanvas(canvas: HTMLCanvasElement) {
    this.mapCanvas = canvas;
    this.mapLayer.prepend(canvas);
    const upd = () => {
      const r = this.board.getBoundingClientRect();
      this.app.view.setFrame(r.width > 4 && r.height > 4 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null);
    };
    new ResizeObserver(upd).observe(this.board);
    window.addEventListener('resize', upd);
    canvas.addEventListener('pointermove', () => {
      this.el.classList.add('map-hover');
      clearTimeout(this.hoverTimer);
      this.hoverTimer = window.setTimeout(() => this.el.classList.remove('map-hover'), 2200);
    });
  }

  show() {
    this.el.classList.remove('hidden');
    this.shownAt = performance.now();
    requestAnimationFrame(() => this.el.classList.add('ready'));
    this.renderAll();
  }

  /** Atraso de entrada: escalonado na abertura da tela, imediato depois. */
  private intro(ms: number) {
    return performance.now() - this.shownAt < 1500 ? ms : 0;
  }

  setPlacement(text: string | null) {
    this.placeBar.classList.toggle('hidden', !text);
    this.placeBar.textContent = text ?? '';
  }

  setCampaign(s: CampaignState) {
    this.campaign = s;
    this.renderTop();
    this.renderScenes();
    this.requestThumbs();
    this.drawPlan();
    this.renderObjectives();
    this.renderParty();
    this.renderLog();
    this.renderInspector();
  }

  partyIds(): number[] {
    return (this.campaign?.party ?? []).map((p) => p.id ?? 0).filter(Boolean);
  }

  private onRoom() {
    const id = this.app.state.room?.id ?? null;
    if (id !== this.lastRoom && this.lastRoom !== null) this.sceneFade();
    this.lastRoom = id;
    this.renderAll();
    setTimeout(() => this.captureThumb(), 1200);
  }

  private renderAll() {
    this.sigs = {};
    this.renderTop();
    this.renderScenes();
    this.drawPlan();
    this.renderObjectives();
    this.renderInspector(true);
    this.renderParty();
    this.renderQuick();
    this.renderLog();
  }

  /** Só redesenha uma parte quando os dados dela mudaram. */
  private changed(part: string, data: unknown) {
    const s = JSON.stringify(data);
    if (this.sigs[part] === s) return false;
    this.sigs[part] = s;
    return true;
  }

  private get gm() {
    return !!this.app.state.room?.canBuild;
  }
  private get owner() {
    return !!this.app.state.room?.isOwner;
  }

  /** Troca de cena no tabuleiro: o quadro antigo dissolve por cima do novo. */
  private sceneFade() {
    const src = this.mapCanvas;
    if (!src || reduced() || !src.width) return;
    const c = document.createElement('canvas');
    c.className = 'scene-fade';
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d')!.drawImage(src, 0, 0);
    src.after(c);
    c.animate(
      [
        { opacity: 1, filter: 'blur(0px) brightness(1)', transform: 'scale(1)' },
        { opacity: 0, filter: 'blur(6px) brightness(0.4)', transform: 'scale(1.05)' },
      ],
      { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' },
    ).onfinish = () => c.remove();
    src.animate([{ opacity: 0, filter: 'brightness(0.3)' }, { opacity: 1, filter: 'brightness(1)' }], { duration: 750, easing: 'ease-out' });
  }

  // ================= topo =================
  private renderTop() {
    this.fxBtn.style.visibility = this.owner ? 'visible' : 'hidden';
    // o nome vem com a campanha (evita piscar o nome da sala antes)
    if (!this.campaign) return;
    const r = this.app.state.room;
    const title = (this.campaign.title || r?.name || 'CROMA').toUpperCase();
    const sub = (this.campaign.subtitle || r?.name.split('·').pop()?.trim() || '').toUpperCase();
    // só datilografa quando o texto muda de verdade (trocar de cena não repete)
    if (title === this.topShown[0] && sub === this.topShown[1]) return;
    this.topShown = [title, sub];
    typeInto(this.titleEl, title, 520, false);
    setTimeout(() => typeInto(this.subEl, sub, 420, false), 160);
  }

  private toggleMenu() {
    const open = this.menu.classList.toggle('hidden') === false;
    if (!open) return;
    sfx.paper();
    if (reduced()) return;
    // o bilhete desce balançando preso pela fita
    this.menu.animate(
      [
        { transform: 'translateY(-1.6rem) rotate(-5deg)', opacity: 0 },
        { transform: 'translateY(0.3rem) rotate(2deg)', opacity: 1, offset: 0.55 },
        { transform: 'translateY(0) rotate(-0.8deg)', opacity: 1, offset: 0.8 },
        { transform: 'translateY(0) rotate(0)', opacity: 1 },
      ],
      { duration: 520, easing: 'ease-out' },
    );
    [...this.menu.querySelectorAll('button')].forEach((c, i) => enter(c, 'left', 90 + i * 30, 280));
  }

  private toggleSound() {
    sfx.setEnabled(!sfx.enabled);
    this.renderSoundItem();
  }

  private renderSoundItem() {
    clear(this.soundItem).append(icon('music', 16), sfx.enabled ? 'Sons da interface: ligados' : 'Sons da interface: desligados');
    this.soundItem.setAttribute('aria-checked', String(sfx.enabled));
  }

  private paintTabs(animate: boolean) {
    this.tabsEl.querySelectorAll<HTMLElement>('.tb-tab').forEach((b, i) => {
      const on = b.dataset.tab === this.activeTab;
      const was = b.classList.contains('on');
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      if (on !== was || !animate) {
        paperize(b, { seed: 200 + i, tone: on ? '#c5ab8e' : '#a58f77', burn: on ? 0.7 : 0.95, torn: 1.6, shadow: 0.9, stains: 3, creases: 0, pad: 20 });
      }
      const deco = b.querySelector<HTMLElement>('.tt-deco');
      if (!on && deco) {
        if (!animate) deco.remove();
        else {
          // a fita descola e sai
          const tape = deco.querySelector('.tape');
          tape?.animate([{ transform: 'translateX(-50%) rotate(-2deg)', opacity: 1 }, { transform: 'translateX(-50%) translateY(-1.2rem) rotate(-28deg)', opacity: 0 }], { duration: 320, easing: 'ease-in', fill: 'forwards' });
          deco.querySelector('.uline')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
          setTimeout(() => deco.remove(), 330);
        }
      }
      if (on && !deco) {
        const tape = h('span', { class: 'tape tape-tab' });
        const line = uline('uline red');
        b.append(h('span', { class: 'tt-deco', 'aria-hidden': 'true' }, tape, line));
        if (animate) {
          // fita bate e gruda; o traço vermelho é pintado
          tape.animate([{ transform: 'translateX(-50%) scale(1.5) rotate(10deg)', opacity: 0 }, { transform: 'translateX(-50%) scale(0.95) rotate(-3deg)', opacity: 1, offset: 0.7 }, { transform: 'translateX(-50%) scale(1) rotate(-2deg)', opacity: 1 }], {
            duration: 360,
            delay: 160,
            easing: 'cubic-bezier(.3,.7,.3,1)',
            fill: 'backwards',
          });
          wipeIn(line, 380, 300);
          bump(b, 1.03, 0.4);
        }
      }
    });
  }

  private setTab(t: string) {
    if (t === this.activeTab) return;
    this.activeTab = t;
    sfx.paper();
    this.paintTabs(true);
    this.thread.moveTo(TABS.find((x) => x.id === t) ?? TABS[0]);
    if (t === 'MAPA') {
      const o = this.tabOverlay;
      if (!o.classList.contains('hidden')) {
        o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = () => {
          o.classList.add('hidden');
          o.getAnimations().forEach((a) => a.cancel());
        };
      }
      return;
    }
    const note = h('section', { class: 'sheet p-soon' }, h('h3', { class: 'p-title' }, t, uline()), h('p', null, 'Esta aba chega nas próximas etapas.'), h('button', { class: 'dbtn', onclick: () => this.setTab('MAPA') }, 'Voltar ao mapa'));
    paperize(note, { seed: 20 + t.length, tone: '#d0bba5', burn: 0.8 });
    clear(this.tabOverlay).append(note);
    this.tabOverlay.classList.remove('hidden');
    enter(note, 'drop', 0, 520);
  }

  private async renameCampaign() {
    if (!this.owner || !this.campaign) return;
    const v = await promptNote('CAMPANHA', [
      { label: 'Nome', value: this.campaign.title, max: 40 },
      { label: 'Subtítulo', value: this.campaign.subtitle, max: 40 },
    ]);
    if (v) this.app.net.send({ t: 'campaignSet', title: v[0], subtitle: v[1] });
  }

  // ================= cenário atual =================
  private captureThumb() {
    const r = this.app.state.room;
    if (!r) return;
    const url = this.app.view.snapshot(150, 98);
    if (!url) return;
    saveThumb(r.id, url);
    this.setThumb(r.id, url);
  }

  private setThumb(id: number, url: string) {
    this.el.querySelectorAll<HTMLImageElement>(`img[data-room="${id}"]`).forEach((img) => (img.src = url));
    this.el.querySelectorAll(`.thumb-ph[data-room="${id}"]`).forEach((ph) => {
      const img = h('img', { src: url, alt: '', 'data-room': String(id) });
      ph.replaceWith(img);
      img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
    });
  }

  /** Pede ao servidor o conteúdo das cenas sem miniatura. */
  private requestThumbs() {
    const cur = this.app.state.room?.id;
    for (const s of this.campaign?.scenes ?? []) {
      if (s.id === cur || this.peeked.has(s.id) || loadThumb(s.id)) continue;
      this.peeked.add(s.id);
      this.app.net.send({ t: 'peek', roomId: s.id });
    }
  }

  /** Miniatura de outra cena, desenhada fora da tela. */
  onPeek(room: RoomInfo, items: FloorItem[], wallItems: WallItem[]) {
    const url = RoomView.still(room, items, wallItems, 150, 98);
    if (!url) return;
    saveThumb(room.id, url);
    this.setThumb(room.id, url);
  }

  private sceneList(): { id: number; name: string }[] {
    const camp = this.campaign?.scenes ?? [];
    if (camp.length) return camp.map((s) => ({ id: s.id, name: s.name }));
    return this.app.state.rooms.map((r) => ({ id: r.id, name: r.name }));
  }

  private renderScenes() {
    const list = this.sceneList();
    const cur = this.app.state.room?.id ?? null;
    if (!this.changed('scenes', [list, cur])) return;
    const ids = new Set(list.map((s) => s.id));
    for (const [id, row] of this.sceneRows)
      if (!ids.has(id)) {
        this.sceneRows.delete(id);
        void leave(row, 'left');
      }
    list.forEach((s, i) => {
      const name = s.name.split('·').pop()!.trim();
      let row = this.sceneRows.get(s.id);
      if (!row) {
        const url = loadThumb(s.id);
        const thumb = url ? h('img', { src: url, alt: '', 'data-room': String(s.id) }) : h('span', { class: 'thumb-ph', 'data-room': String(s.id) });
        row = h('button', { class: 'sc-row', onclick: () => this.goScene(s.id) }, h('span', { class: 'sc-thumb' }, thumb), h('span', { class: 'sc-name' }, name));
        this.sceneRows.set(s.id, row);
        enter(row, 'right', this.intro(250 + i * 55));
      } else row.querySelector('.sc-name')!.textContent = name;
      const at = this.scenesEl.children[i];
      if (at !== row) this.scenesEl.insertBefore(row, at ?? null);
    });
    if (cur !== this.activeScene) {
      const old = this.activeScene !== null ? this.sceneRows.get(this.activeScene) : undefined;
      if (old) this.unmarkScene(old);
      const row = cur !== null ? this.sceneRows.get(cur) : undefined;
      if (row) this.markScene(row, this.intro(900));
      this.activeScene = cur;
      this.planFade = { room: this.planHatch.room, t: 0 };
      this.animatePlan(cur ?? -1, this.intro(1100));
    }
  }

  private goScene(id: number) {
    if (id === this.app.state.room?.id) {
      const row = this.sceneRows.get(id);
      if (row) shake(row, 0.25);
      return;
    }
    sfx.click();
    this.app.net.send({ t: 'join', roomId: id });
  }

  /** Cena atual: pincel vermelho passa pintando a linha. */
  private markScene(row: HTMLElement, delay: number) {
    row.classList.add('on');
    const cv = brushize(row, { seed: 5 + [...this.sceneRows.values()].indexOf(row), color: '#cf5a4e', arrow: true });
    void brushSweep(row, cv, 640, delay);
  }

  /** Cena que deixou de ser a atual: a tinta lava. */
  private unmarkScene(row: HTMLElement) {
    row.classList.remove('on');
    const cv = row.querySelector<HTMLElement>(':scope > .paper-cv');
    if (!cv) return;
    void brushWash(cv).then(() => {
      if (!row.classList.contains('on')) unpaint(row);
    });
  }

  // ================= 1º andar =================
  private bindPlan() {
    const c = this.planCanvas;
    const at = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * c.clientWidth) / r.width, y: ((e.clientY - r.top) * c.clientHeight) / r.height };
    };
    const hitRect = (p: { x: number; y: number }) => [...this.planRects].reverse().find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    c.addEventListener('pointerdown', (e) => {
      const p = at(e);
      const r = hitRect(p);
      if (!r || !this.campaign) return;
      const lay = this.campaign.layout[r.id] ?? { x: 0, y: 0 };
      this.planDrag = { id: r.id, sx: p.x, sy: p.y, ox: lay.x, oy: lay.y, moved: false };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      const d = this.planDrag;
      const p = at(e);
      const hit = hitRect(p);
      c.style.cursor = hit ? 'pointer' : 'default';
      const hid = hit?.id ?? -1;
      if (hid !== this.planHover) {
        this.planHover = hid;
        this.drawPlan(true);
      }
      if (hit && !d) {
        this.planTip.textContent = hit.name;
        this.planTip.classList.remove('hidden');
        const pr = this.planTip.parentElement!.getBoundingClientRect();
        const cr = c.getBoundingClientRect();
        const k = cr.width / c.clientWidth;
        this.planTip.style.left = `${cr.left - pr.left + (hit.x + hit.w / 2) * k}px`;
        this.planTip.style.top = `${cr.top - pr.top + hit.y * k}px`;
      } else this.planTip.classList.add('hidden');
      if (!d || !this.campaign || !this.owner) return;
      const dx = Math.round((p.x - d.sx) / this.planScale);
      const dy = Math.round((p.y - d.sy) / this.planScale);
      if (dx || dy) d.moved = true;
      if (d.moved) {
        this.campaign.layout[d.id] = { x: d.ox + dx, y: d.oy + dy };
        this.drawPlan(true);
      }
    });
    c.addEventListener('pointerleave', () => {
      this.planHover = -1;
      this.planTip.classList.add('hidden');
      this.drawPlan(true);
    });
    c.addEventListener('pointerup', () => {
      const d = this.planDrag;
      this.planDrag = null;
      if (!d || !this.campaign) return;
      if (d.moved) {
        const l = this.campaign.layout[d.id];
        this.app.net.send({ t: 'layoutSet', roomId: d.id, x: l.x, y: l.y });
      } else if (d.id !== this.app.state.room?.id) this.goScene(d.id);
    });
  }

  /** Lápis de cor pintando o cômodo atual na planta (hachuras + preenchimento). */
  private animatePlan(room: number, delay: number) {
    this.planHatch = { room, t: 0 };
    const run = async () => {
      if (delay) await wait(delay);
      if (this.planHatch.room !== room) return;
      const r = this.planRects.find((x) => x.id === room);
      const lines = r ? this.hatchLines(r) : [];
      const cr = this.planCanvas.getBoundingClientRect();
      const k = cr.width / (this.planCanvas.clientWidth || 1);
      const pts: { x: number; y: number }[] = [];
      lines.forEach(([x0, y0, x1, y1], i) => {
        const a = { x: cr.left + x0 * k, y: cr.top + y0 * k };
        const b = { x: cr.left + x1 * k, y: cr.top + y1 * k };
        if (i % 2) pts.push(b, a);
        else pts.push(a, b);
      });
      await pencilShade(pts, 950, (t) => {
        if (this.planHatch.room !== room) return;
        this.planHatch.t = t;
        this.planFade.t = Math.min(1, t * 1.6);
        this.drawPlan(true);
      });
      this.planHatch.t = 1;
      this.planFade = { room: -1, t: 1 };
      this.drawPlan(true);
    };
    void run();
  }

  /** Hachuras a 45° dentro do retângulo do cômodo (x0,y0 → x1,y1). */
  private hatchLines(r: { x: number; y: number; w: number; h: number }) {
    const out: [number, number, number, number][] = [];
    const step = 3.2;
    for (let c = r.x + r.y + step; c < r.x + r.w + r.y + r.h; c += step) {
      const x0 = Math.max(r.x, c - (r.y + r.h));
      const x1 = Math.min(r.x + r.w, c - r.y);
      out.push([x0, c - x0, x1, c - x1]);
    }
    return out;
  }

  /** Planta: cômodos de pedra cinza com contorno grosso; o atual pintado de vermelho. */
  private drawPlan(keepScale = false) {
    const c = this.planCanvas;
    const cssW = c.clientWidth || 220;
    const cssH = c.clientHeight || 170;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (c.width !== Math.round(cssW * dpr) || c.height !== Math.round(cssH * dpr)) {
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const camp = this.campaign;
    const cur = this.app.state.room?.id;
    this.planRects = [];
    if (!camp || !camp.scenes.length) return;
    const parsed = camp.scenes.map((s) => ({ s, hm: parseHeightmap(s.heightmap), p: camp.layout[s.id] ?? { x: 0, y: 0 } }));
    if (!keepScale || !this.planDrag) {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const { hm, p } of parsed) {
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x + hm.width);
        y1 = Math.max(y1, p.y + hm.height);
      }
      const pad = 8;
      this.planScale = Math.max(2, Math.min(12, Math.min((cssW - pad * 2) / (x1 - x0), (cssH - pad * 2) / (y1 - y0))));
      this.planOrigin = {
        x: pad + (cssW - pad * 2 - (x1 - x0) * this.planScale) / 2 - x0 * this.planScale,
        y: pad + (cssH - pad * 2 - (y1 - y0) * this.planScale) / 2 - y0 * this.planScale,
      };
    }
    const S = this.planScale;
    const O = this.planOrigin;
    const rnd = (x: number, y: number, k: number) => {
      const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
      return v - Math.floor(v);
    };
    for (const { s, hm, p } of parsed) {
      const ox = O.x + p.x * S;
      const oy = O.y + p.y * S;
      const tile = (x: number, y: number) => hm.tiles[y]?.[x] !== null && hm.tiles[y]?.[x] !== undefined;
      const tilesPath = new Path2D();
      for (let y = 0; y < hm.height; y++) for (let x = 0; x < hm.width; x++) if (tile(x, y)) tilesPath.rect(ox + x * S, oy + y * S, S + 0.4, S + 0.4);
      // piso de pedra
      for (let y = 0; y < hm.height; y++)
        for (let x = 0; x < hm.width; x++) {
          if (!tile(x, y)) continue;
          const n = rnd(x + p.x, y + p.y, 1);
          const g = Math.round(128 + (n - 0.5) * 22);
          ctx.fillStyle = `rgb(${g},${g - 3},${g - 7})`;
          ctx.fillRect(ox + x * S, oy + y * S, S + 0.4, S + 0.4);
          if (rnd(x, y, 2) < 0.35) {
            ctx.strokeStyle = 'rgba(40,36,32,0.55)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            const sx = ox + x * S + rnd(x, y, 3) * S;
            const sy = oy + y * S + rnd(x, y, 4) * S;
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + (rnd(x, y, 5) - 0.5) * S, sy + (rnd(x, y, 6) - 0.5) * S);
            ctx.stroke();
          }
          if (rnd(x, y, 7) < 0.12) {
            ctx.fillStyle = 'rgba(235,230,220,0.7)';
            ctx.fillRect(ox + (x + 0.35) * S, oy + (y + 0.35) * S, S * 0.3, S * 0.3);
          }
        }
      ctx.strokeStyle = 'rgba(40,36,32,0.22)';
      ctx.lineWidth = 0.5;
      for (let y = 0; y < hm.height; y += 2) for (let x = 0; x < hm.width; x += 2) if (tile(x, y)) ctx.strokeRect(ox + x * S, oy + y * S, S * 2, S * 2);
      const rect = { id: s.id, x: ox, y: oy, w: hm.width * S, h: hm.height * S, name: s.name.split('·').pop()!.trim() };
      // cômodo atual: lápis de cor vermelho (hachura) e depois o preenchimento
      if (s.id === cur && this.planHatch.room === s.id) {
        const t = this.planHatch.t;
        ctx.save();
        ctx.clip(tilesPath);
        ctx.fillStyle = `rgba(214,68,56,${(0.5 * Math.max(0, t - 0.55)) / 0.45})`;
        ctx.fill(tilesPath);
        const lines = this.hatchLines(rect);
        const drawn = t * lines.length;
        ctx.strokeStyle = 'rgba(176,34,26,0.7)';
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        lines.forEach(([x0, y0, x1, y1], i) => {
          if (i >= drawn) return;
          const f = Math.min(1, drawn - i);
          const [ax, ay, bx, by] = i % 2 ? [x1, y1, x0, y0] : [x0, y0, x1, y1];
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
        });
        ctx.stroke();
        ctx.restore();
      } else if (s.id === this.planFade.room && this.planFade.t < 1) {
        ctx.save();
        ctx.fillStyle = `rgba(214,68,56,${0.55 * (1 - this.planFade.t)})`;
        ctx.fill(tilesPath);
        ctx.restore();
      }
      if (s.id === this.planHover) {
        ctx.fillStyle = 'rgba(255,245,225,0.16)';
        ctx.fill(tilesPath);
      }
      // paredes
      ctx.strokeStyle = s.id === this.planHover ? '#5a1510' : '#1c1916';
      ctx.lineWidth = Math.max(1.8, S * 0.34);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let y = 0; y < hm.height; y++)
        for (let x = 0; x < hm.width; x++) {
          if (!tile(x, y)) continue;
          const X = ox + x * S;
          const Y = oy + y * S;
          if (!tile(x, y - 1)) (ctx.moveTo(X, Y), ctx.lineTo(X + S, Y));
          if (!tile(x, y + 1)) (ctx.moveTo(X, Y + S), ctx.lineTo(X + S, Y + S));
          if (!tile(x - 1, y)) (ctx.moveTo(X, Y), ctx.lineTo(X, Y + S));
          if (!tile(x + 1, y)) (ctx.moveTo(X + S, Y), ctx.lineTo(X + S, Y + S));
        }
      ctx.stroke();
      for (const pt of s.portals) {
        ctx.fillStyle = s.id === cur ? '#d66a5e' : '#8e8a84';
        ctx.fillRect(ox + pt.x * S + S * 0.15, oy + pt.y * S - S * 0.25, S * 0.7, S * 0.5);
      }
      for (const u of s.users) {
        const pm = camp.party.find((q) => q.id === u.id);
        ctx.beginPath();
        ctx.arc(ox + (u.x + 0.5) * S, oy + (u.y + 0.5) * S, Math.max(2.2, S * 0.42), 0, Math.PI * 2);
        ctx.fillStyle = pm?.color ?? '#fff';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#140f0c';
        ctx.stroke();
      }
      this.planRects.push(rect);
    }
  }

  // ================= objetivos =================
  private renderObjectives() {
    const list = this.campaign?.objectives ?? [];
    this.objPlus.classList.toggle('hidden', !this.owner || this.addingObj);
    if (!this.changed('obj', [list, this.owner, this.addingObj])) return;
    const ids = new Set(list.map((o) => o.id));
    for (const [id, r] of this.objRows)
      if (!ids.has(id)) {
        this.objRows.delete(id);
        void leave(r.el, 'left');
      }
    list.forEach((o, i) => {
      let r = this.objRows.get(o.id);
      if (!r) {
        r = this.makeObjRow(o);
        this.objRows.set(o.id, r);
        enter(r.el, 'left', this.intro(420 + i * 60));
        if (o.done) r.path.style.strokeDashoffset = '0px';
      } else {
        if (r.text.textContent !== o.text) r.text.textContent = o.text;
        if (r.done !== o.done && !r.busy) this.animateCheck(r, o.done);
      }
      r.el.classList.toggle('done', o.done);
      const at = this.objEl.children[i];
      if (at !== r.el) this.objEl.insertBefore(r.el, at ?? null);
    });
    this.objEl.querySelector('.obj-add')?.remove();
    if (this.owner && this.addingObj) {
      const inp = h('input', { class: 'obj-add', placeholder: 'novo objetivo (Enter)', maxlength: 80 });
      const done = () => {
        this.addingObj = false;
        this.renderObjectives();
      };
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && inp.value.trim()) {
          this.app.net.send({ t: 'objAdd', text: inp.value.trim() });
          inp.value = '';
        } else if (e.key === 'Escape') done();
      });
      inp.addEventListener('blur', () => !inp.value.trim() && done());
      this.objEl.append(inp);
      enter(inp, 'up', 0, 260);
      setTimeout(() => inp.focus(), 0);
    }
  }

  private makeObjRow(o: Objective): ObjRow {
    const mark = checkMark(o.id);
    const path = mark.querySelector('path')!;
    const box = h('span', { class: 'chk' }, mark);
    const text = h('span', { class: 'obj-t' }, o.text);
    const row: ObjRow = { id: o.id, el: h('div', { class: 'obj' }), path, text, done: o.done, busy: false };
    const toggle = () => {
      if (!this.owner || row.busy) return;
      const next = !row.done;
      // otimista: anima já; o servidor confirma em seguida
      const obj = this.campaign?.objectives.find((x) => x.id === o.id);
      if (obj) obj.done = next;
      this.animateCheck(row, next);
      row.el.classList.toggle('done', next);
      this.sigs.obj = '';
      this.app.net.send({ t: 'objToggle', id: o.id });
    };
    row.el.append(h('button', { class: 'obj-hit', 'aria-label': 'Concluir ou desmarcar', onclick: toggle }, box), h('span', { class: 'obj-tx', onclick: toggle }, text));
    if (this.owner) row.el.append(h('button', { class: 'obj-x', title: 'Remover', 'aria-label': 'Remover objetivo', onclick: () => this.app.net.send({ t: 'objRemove', id: o.id }) }, '×'));
    return row;
  }

  /** Lápis risca o check (ou a borracha apaga). */
  private animateCheck(r: ObjRow, done: boolean) {
    r.done = done;
    r.busy = true;
    const p = done ? pencilDraw(r.path, 560) : eraseDraw(r.path, 520);
    void p.finally(() => {
      r.busy = false;
      const want = this.campaign?.objectives.find((x) => x.id === r.id)?.done;
      if (want !== undefined && want !== r.done) this.animateCheck(r, want);
    });
  }

  // ================= inspetor =================
  private selection(): Sel {
    const sel = this.app.view.selection;
    const map = this.app.view.map;
    if (!sel || !map || sel.kind === 'user') return null;
    const item = sel.kind === 'floor' ? map.getItem(sel.id) : map.getWallItem(sel.id);
    return item ? { kind: sel.kind, item } : null;
  }

  private member(name: string | undefined): PartyMember | undefined {
    if (!name) return undefined;
    return this.campaign?.party.find((p) => p.name.toLowerCase() === name.toLowerCase());
  }

  private polaroid(content: HTMLElement | HTMLCanvasElement): HTMLElement {
    return h('div', { class: 'polaroid' }, h('span', { class: 'pol-photo' }, content), h('i', { class: 'pc-dot d1' }), h('i', { class: 'pc-dot d2' }), h('i', { class: 'pc-dot d3' }), h('i', { class: 'pc-dot d4' }));
  }

  private headText(title: string, desc: string, extra?: Node | null): HTMLElement {
    return h('div', { class: 'insp-text' }, h('h2', null, h('span', null, title), uline()), h('p', null, desc), extra ?? null);
  }

  /** Estado que muda o que o inspetor mostra (para não redesenhar à toa). */
  private inspState() {
    const view = this.app.view;
    const sel = view.selection;
    const party = (this.campaign?.party ?? []).map((p) => [p.id, p.name, p.color, p.load, p.capacity, p.look]);
    let data: unknown = null;
    if (sel?.kind === 'user') {
      const u = view.users.get(sel.id);
      data = u ? [u.name, u.look, u.color, view.myId === sel.id] : null;
    } else if (sel) data = this.selection()?.item ?? null;
    else {
      const map = view.map;
      data = map ? [...map.allItems(), ...map.allWallItems()].filter((it) => it.hint || it.loot?.length || it.actions?.length) : null;
    }
    return JSON.stringify([sel, this.inspTab, this.giveLoot, this.addingLoot, this.logging, this.gm, this.app.state.room?.id, this.app.state.room?.description, data, party]);
  }

  private renderInspector(force = false) {
    const view = this.app.view;
    const sel = view.selection;
    const key = sel ? `${sel.kind}${sel.id}` : `none${this.app.state.room?.id ?? 0}`;
    const fresh = key !== this.inspKey;
    const sig = this.inspState();
    if (!force && !fresh && sig === this.inspSig) return;
    this.inspSig = sig;
    const prevTab = this.inspTab;
    if (fresh) {
      this.inspTab = sel && sel.kind !== 'user' ? 'items' : 'desc';
      this.photoUrl = sel && sel.kind !== 'user' ? view.photo(sel.kind, sel.id, 262, 250) : null;
      this.inspSig = this.inspState();
      if (sel) sfx.paper();
    }
    this.inspKey = key;
    const body = this.inspBody;
    clear(body);
    this.closeTag.classList.toggle('hidden', !sel);
    if (fresh && sel) this.closeTag.animate([{ transform: 'rotate(-14deg)' }, { transform: 'rotate(8deg)', offset: 0.45 }, { transform: 'rotate(-3deg)', offset: 0.75 }, { transform: 'rotate(0)' }], { duration: 700, easing: 'ease-out' });

    if (sel?.kind === 'user') {
      if (view.users.get(sel.id)) this.renderTokenInspector(body, sel.id);
    } else {
      const s = this.selection();
      if (!s) this.renderSceneInspector(body);
      else this.renderItemInspector(body, s);
    }
    if (fresh) this.animateInspector(body);
    else if (prevTab !== this.inspTab) this.animateTabSwitch(body, prevTab);
    this.renderGive();
  }

  /** Nova seleção: polaroid revela, título sublinha, texto é datilografado, cartões entram. */
  private animateInspector(body: HTMLElement) {
    const pol = body.querySelector<HTMLElement>('.polaroid');
    if (pol && !reduced()) {
      pol.animate([{ transform: 'translateY(-1.8rem) rotate(-7deg) scale(1.08)', opacity: 0 }, { transform: 'translateY(0) rotate(0) scale(1)', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.9,.3,1.25)', composite: 'add' });
      const photo = pol.querySelector<HTMLElement>('.pol-photo > *');
      photo?.animate([{ filter: 'brightness(2.4) contrast(0.45) sepia(0.9) blur(1.5px)' }, { filter: 'brightness(1.3) contrast(0.8) sepia(0.5) blur(0.5px)', offset: 0.5 }, { filter: 'brightness(0.9) contrast(1.15) saturate(1.15) sepia(0.22)' }], {
        duration: 1600,
        easing: 'ease-out',
      });
    }
    const h2 = body.querySelector('.insp-text h2');
    if (h2) {
      enter(h2, 'fade', 80, 300);
      const ul = h2.querySelector('.uline');
      if (ul) wipeIn(ul, 420, 260);
    }
    const p = body.querySelector<HTMLElement>('.insp-text > p');
    if (p) typeInto(p, p.textContent ?? '', 750);
    body.querySelectorAll('.itabs').forEach((t) => enter(t, 'up', 180, 360));
    this.drawRing(body, 380);
    body.querySelectorAll('.ipane > *').forEach((c, i) => enter(c, 'left', 260 + i * 70, 420));
    body.querySelectorAll('.insp-tip, .tools, .tool-sel').forEach((c) => enter(c, 'fade', 300, 400));
  }

  private animateTabSwitch(body: HTMLElement, prev: InspTab) {
    const dir = INSP_TABS.indexOf(this.inspTab) > INSP_TABS.indexOf(prev) ? 'left' : 'right';
    body.querySelectorAll('.ipane').forEach((pane) => enter(pane, dir, 0, 300));
    body.querySelectorAll('.ipane > *').forEach((c, i) => enter(c, 'fade', 40 + i * 40, 260));
    this.drawRing(body, 0);
    sfx.paper();
  }

  /** O contorno vermelho da aba ativa é desenhado a lápis. */
  private drawRing(body: HTMLElement, delay: number) {
    body.querySelectorAll<SVGPathElement>('.tab-ring .ring-line').forEach((p) => drawStroke(p, 460, delay));
    body.querySelectorAll('.tab-ring .ring-under').forEach((p) => wipeIn(p, 300, delay + 380));
  }

  private renderSceneInspector(body: HTMLElement) {
    const r = this.app.state.room;
    const url = r ? loadThumb(r.id) : null;
    body.append(
      h(
        'div',
        { class: 'insp-head' },
        this.polaroid(url ? h('img', { src: url, alt: '', 'data-room': String(r!.id) }) : h('span', { class: 'thumb-ph', 'data-room': String(r?.id ?? 0) })),
        this.headText((r?.name.split('·').pop()?.trim() ?? 'Cena').toUpperCase(), r?.description || 'Clique num objeto do cenário para ver descrição, interações e itens.'),
      ),
    );
    const map = this.app.view.map;
    const marks: { kind: 'floor' | 'wall'; item: FloorItem | WallItem }[] = [];
    if (map) {
      for (const it of map.allItems()) if ((it.hint && (it.hint.visible || this.gm)) || it.loot?.length || it.actions?.length) marks.push({ kind: 'floor', item: it });
      for (const it of map.allWallItems()) if ((it.hint && (it.hint.visible || this.gm)) || it.loot?.length || it.actions?.length) marks.push({ kind: 'wall', item: it });
    }
    body.append(h('div', { class: 'itabs' }, h('span', { class: 'itab on wide' }, h('span', null, `NESTA CENA (${marks.length})`), tabRing())));
    const pane = h('div', { class: 'ipane' });
    if (!marks.length) pane.append(h('p', { class: 'empty' }, 'Nada marcado nesta cena.'));
    marks.forEach(({ kind, item }) => {
      const free = (item.loot ?? []).filter((l) => !l.holder).length;
      const parts = [item.hint ? 'Pista' : null, free ? `${free} ${free > 1 ? 'itens' : 'item'}` : null, item.actions?.length ? `${item.actions.length} ${item.actions.length > 1 ? 'interações' : 'interação'}` : null].filter(Boolean);
      const go = () => {
        this.app.view.focusItem(kind, item.id);
        this.app.view.select({ kind, id: item.id });
      };
      pane.append(
        h(
          'div',
          { class: 'icard link', onclick: go },
          h('div', { class: 'ic-icon' }, thumbCopy(item.defId, 56)),
          h('div', { class: 'ic-text' }, h('b', null, item.hint?.title || anyFurniName(item.defId)), h('small', null, parts.join(' | '))),
          h('button', { class: 'dbtn', onclick: (e: Event) => (e.stopPropagation(), go()) }, 'Ver'),
        ),
      );
    });
    body.append(pane, h('p', { class: 'insp-tip' }, 'Clique num personagem (ou no retrato dele, embaixo) para comandá-lo; depois clique no chão para ele andar.'));
  }

  private renderItemInspector(body: HTMLElement, s: NonNullable<Sel>) {
    const { item } = s;
    const fdef = s.kind === 'floor' ? getFurni(item.defId) : undefined;
    const wdef = s.kind === 'wall' ? getWallFurni(item.defId) : undefined;
    const hint = item.hint && (item.hint.visible || this.gm) ? item.hint : undefined;
    const title = (hint?.title || anyFurniName(item.defId)).toUpperCase();
    const desc = hint?.text || fdef?.desc || wdef?.desc || 'Nada de especial à primeira vista.';
    const loot = item.loot ?? [];
    const actions = item.actions ?? [];
    const photo = this.photoUrl ? h('img', { src: this.photoUrl, alt: '' }) : thumbCopy(item.defId, 124);
    body.append(h('div', { class: 'insp-head' }, this.polaroid(photo), this.headText(title, desc)));
    const tab = (id: InspTab, label: string) => {
      const on = this.inspTab === id;
      return h(
        'button',
        {
          class: `itab${on ? ' on' : ''}`,
          role: 'tab',
          'aria-selected': String(on),
          onclick: () => {
            if (this.inspTab === id) return;
            this.inspTab = id;
            this.giveLoot = null;
            this.renderInspector();
          },
        },
        h('span', null, label),
        on ? tabRing() : null,
      );
    };
    body.append(h('div', { class: 'itabs', role: 'tablist' }, tab('desc', 'DESCRIÇÃO'), tab('inter', 'INTERAÇÕES'), tab('items', `ITENS (${loot.length})`)));
    const pane = h('div', { class: `ipane ${this.inspTab}` });
    body.append(pane);
    if (this.inspTab === 'desc') this.paneDesc(pane, s);
    else if (this.inspTab === 'inter') this.paneInter(pane, s, actions);
    else this.paneItems(pane, s, loot);
  }

  private paneDesc(pane: HTMLElement, s: NonNullable<Sel>) {
    const { item, kind } = s;
    const net = this.app.net;
    const fdef = kind === 'floor' ? getFurni(item.defId) : undefined;
    const wdef = kind === 'wall' ? getWallFurni(item.defId) : undefined;
    const hint = item.hint && (item.hint.visible || this.gm) ? item.hint : undefined;
    pane.append(h('p', { class: 'desc-full' }, hint?.text || fdef?.desc || wdef?.desc || 'Sem descrição. O mestre pode escrever uma em "Escrever".'));
    if (hint && !hint.visible) pane.append(h('p', { class: 'desc-hidden' }, '● oculto para os jogadores'));
    const tools = h('div', { class: 'tools' });
    const tool = (label: string, fn: () => void) => h('button', { class: 'tool', onclick: () => (sfx.click(), fn()) }, label);
    const states = fdef?.states ?? wdef?.states ?? 0;
    if (states > 1) tools.append(tool('Usar', () => net.send({ t: 'use', id: item.id })));
    if (hint) tools.append(tool('Ler', () => this.hintViewer.open(kind, item.id)));
    if (this.gm) {
      const floor = kind === 'floor' ? (item as FloorItem) : null;
      if (floor && fdef && fdef.rotations.length > 1)
        tools.append(
          tool('Girar', () => {
            const rot = nextRotation(fdef, floor.rot);
            const map = this.app.view.map!;
            if (!map.canPlace(floor.defId, floor.x, floor.y, rot, floor.id).ok) return toast('Não dá para girar aqui.', 'error');
            net.send({ t: 'moveItem', id: floor.id, x: floor.x, y: floor.y, rot });
          }),
        );
      tools.append(
        tool('Mover', () => {
          if (floor) this.app.view.startPlacement({ kind: 'floor', defId: floor.defId, rot: floor.rot, moveId: floor.id });
          else this.app.view.startPlacement({ kind: 'wall', defId: item.defId, moveId: item.id });
          this.app.emit('placement');
        }),
        tool(item.hint ? 'Editar texto' : 'Escrever', () => this.hintEditor.open(kind, item.id)),
      );
      if (item.hint) {
        const hh = item.hint;
        tools.append(tool(hh.visible ? 'Ocultar' : 'Revelar', () => net.send({ t: 'setHint', id: item.id, hint: { ...hh, visible: !hh.visible } })));
      }
      tools.append(tool('Guardar', () => net.send({ t: 'pickup', id: item.id })));
      if (floor && fdef?.portal) {
        const others = this.app.state.rooms.filter((r) => r.id !== this.app.state.room?.id);
        const sel = h('select', { class: 'tool-sel', 'aria-label': 'Destino da passagem' }, h('option', { value: '' }, 'Passagem: sem destino'), ...others.map((r) => h('option', { value: String(r.id), selected: r.id === floor.link }, `Leva para: ${r.name}`)));
        sel.addEventListener('change', () => net.send({ t: 'setLink', id: floor.id, roomId: sel.value ? Number(sel.value) : null }));
        pane.append(sel);
      }
    }
    pane.append(tools);
  }

  private paneInter(pane: HTMLElement, s: NonNullable<Sel>, actions: NonNullable<FloorItem['actions']>) {
    const net = this.app.net;
    if (!actions.length) pane.append(h('p', { class: 'empty' }, 'Nenhuma interação cadastrada.'));
    actions.forEach((a) => {
      const card = h('div', { class: 'icard' }, h('div', { class: 'ic-icon dt' }, h('b', null, 'DT'), h('span', null, String(a.dt))), h('div', { class: 'ic-text' }, h('b', null, a.label), h('small', null, `Teste | DT ${a.dt}`)));
      if (this.gm) {
        if (this.logging === a.id) {
          const who = h('select', { class: 'mini' }, ...(this.campaign?.party ?? []).map((p) => h('option', { value: p.name }, p.name)));
          const val = h('input', { class: 'mini num', type: 'number', placeholder: 'valor' });
          const send = (success: boolean) => {
            net.send({ t: 'actionLog', itemId: s.item.id, actionId: a.id, player: who.value, success, value: val.value ? Number(val.value) : undefined });
            this.stampCard(card, success ? 'SUCESSO' : 'FALHA', success);
            this.logging = null;
            this.renderInspector();
          };
          const logRow = h('div', { class: 'ic-log' }, who, val, h('button', { class: 'dbtn ok', onclick: () => send(true) }, 'Sucesso'), h('button', { class: 'dbtn bad', onclick: () => send(false) }, 'Falha'));
          card.append(logRow);
          enter(logRow, 'up', 0, 280);
        } else
          card.append(
            h(
              'div',
              { class: 'ic-right' },
              h('button', { class: 'dbtn', onclick: () => ((this.logging = a.id), sfx.click(), this.renderInspector()) }, 'Registrar'),
              h('button', { class: 'ic-del', title: 'Remover', 'aria-label': 'Remover interação', onclick: () => net.send({ t: 'actionRemove', itemId: s.item.id, actionId: a.id }) }, '×'),
            ),
          );
      }
      pane.append(card);
    });
    if (this.gm) {
      const label = h('input', { class: 'mini grow', placeholder: 'Nova interação (ex: Investigar)', maxlength: 40 });
      const dt = h('input', { class: 'mini num', type: 'number', value: '15', min: '0', max: '60' });
      const form = h(
        'form',
        {
          class: 'add-row',
          onsubmit: (e: Event) => {
            e.preventDefault();
            if (!label.value.trim()) return;
            net.send({ t: 'actionAdd', itemId: s.item.id, label: label.value.trim(), dt: Number(dt.value) || 10 });
          },
        },
        label,
        h('span', { class: 'mini-l' }, 'DT'),
        dt,
        h('button', { class: 'dbtn', type: 'submit' }, '+'),
      );
      pane.append(form);
    }
  }

  private paneItems(pane: HTMLElement, s: NonNullable<Sel>, loot: Loot[]) {
    const net = this.app.net;
    if (!loot.length && !this.gm) pane.append(h('p', { class: 'empty' }, 'Nada aqui.'));
    loot.forEach((l) => {
      const holder = this.member(l.holder);
      const prev = this.holders.get(l.id);
      const justGiven = this.holders.has(l.id) && prev !== l.holder && !!l.holder;
      this.holders.set(l.id, l.holder);
      const right = l.holder
        ? h(
            'button',
            { class: 'given', title: this.gm ? 'Devolver ao cenário' : '', onclick: () => this.gm && net.send({ t: 'lootGive', itemId: s.item.id, lootId: l.id, to: null }) },
            h('span', { class: 'given-face', style: `--c:${holder?.color ?? '#999'}` }, portraitCanvas(holder?.look ?? null, 72)),
            h('span', { class: 'given-t' }, 'Entregue', h('br'), `para ${l.holder}`),
          )
        : this.gm
          ? h(
              'button',
              {
                class: `dbtn${this.giveLoot?.lootId === l.id ? ' on' : ''}`,
                onclick: () => {
                  sfx.click();
                  this.giveLoot = this.giveLoot?.lootId === l.id ? null : { itemId: s.item.id, lootId: l.id };
                  this.renderInspector();
                },
              },
              'Entregar',
            )
          : null;
      const card = h(
        'div',
        { class: `icard${this.giveLoot?.lootId === l.id ? ' sel' : ''}${l.revealed || this.gm ? '' : ' dim'}`, 'data-loot': String(l.id) },
        h('div', { class: 'ic-icon' }, lootIcon(l.kind, 52)),
        h('div', { class: 'ic-text' }, h('b', null, l.name), h('small', null, `Peso: ${fmt(l.weight)} | ${lootKindLabel(l.kind)}`)),
        right,
      );
      if (this.gm && !l.holder)
        card.append(h('button', { class: 'ic-del', title: 'Remover item', 'aria-label': 'Remover item', onclick: () => net.send({ t: 'lootRemove', itemId: s.item.id, lootId: l.id }) }, '×'));
      pane.append(card);
      if (justGiven && right && !reduced()) {
        right.animate([{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, delay: 650, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' });
        card.animate([{ boxShadow: '0 0 0 0.3rem rgba(80,160,90,.55)' }, { boxShadow: '0 0 0 0 rgba(80,160,90,0)' }], { duration: 900, delay: 650 });
        setTimeout(() => sfx.pop(), 700);
      }
    });
    if (this.gm) {
      if (this.addingLoot) {
        const name = h('input', { class: 'mini grow', placeholder: 'Nome do item', maxlength: 40 });
        const weight = h('input', { class: 'mini num', type: 'number', value: '1', step: '0.1', min: '0' });
        const kind = h('select', { class: 'mini' }, ...LOOT_KINDS.map((k) => h('option', { value: k.id }, k.label)));
        const form = h(
          'form',
          {
            class: 'add-row',
            onsubmit: (e: Event) => {
              e.preventDefault();
              if (!name.value.trim()) return;
              net.send({ t: 'lootAdd', itemId: s.item.id, name: name.value.trim(), weight: Number(weight.value) || 0, kind: kind.value as LootKind });
              this.addingLoot = false;
            },
          },
          name,
          h('span', { class: 'mini-l' }, 'Peso'),
          weight,
          kind,
          h('button', { class: 'dbtn', type: 'submit' }, 'OK'),
        );
        pane.append(form);
        enter(form, 'up', 0, 260);
        setTimeout(() => name.focus(), 0);
      } else pane.append(h('button', { class: 'add-item', onclick: () => ((this.addingLoot = true), this.renderInspector()) }, '+ Adicionar item'));
    }
  }

  /** Carimbo que bate sobre o cartão e desbota (resultado de um teste). */
  private stampCard(card: HTMLElement, text: string, ok: boolean) {
    const r = card.getBoundingClientRect();
    const st = h('span', { class: `stamp-mark${ok ? ' ok' : ' bad'}` }, text);
    st.style.left = `${r.left + r.width * 0.62}px`;
    st.style.top = `${r.top + r.height / 2}px`;
    fxLayer().append(st);
    stamp(st);
    st.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 1400, fill: 'forwards' }).onfinish = () => st.remove();
  }

  /** "ENTREGAR X PARA:" com a carga de cada personagem. */
  private renderGive() {
    const g = this.giveLoot;
    const s = this.selection();
    const l = g && s && s.item.id === g.itemId ? s.item.loot?.find((x) => x.id === g.lootId) : undefined;
    if (!l || !this.campaign || l.holder) {
      this.closeGive();
      return;
    }
    const key = JSON.stringify([l, this.campaign.party.map((p) => [p.id, p.load, p.capacity, p.color, p.look])]);
    if (this.giveOpen && key === this.giveKey) return;
    const opening = !this.giveOpen;
    this.giveKey = key;
    this.giveOpen = true;
    this.giveWrap.getAnimations().forEach((a) => a.cancel());
    this.giveWrap.classList.remove('hidden');
    if (opening) {
      sfx.paper();
      if (!reduced())
        this.giveWrap.animate([{ transform: 'translateY(3rem) rotate(1.5deg)', opacity: 0 }, { transform: 'translateY(0) rotate(0)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,.9,.3,1.15)', composite: 'add' });
    }
    const body = clear(this.giveBody);
    body.append(h('h3', { class: 'p-title' }, `ENTREGAR ${l.name.toUpperCase()} PARA:`));
    this.campaign.party.forEach((p, i) => {
      const after = Math.round((p.load + l.weight) * 10) / 10;
      const over = Math.round((after - p.capacity) * 10) / 10;
      const ratio = p.capacity ? p.load / p.capacity : 1;
      const pct = Math.min(100, ratio * 100);
      const loadEl = h('span', null, `${fmt(p.load)} / ${fmt(p.capacity)}`);
      const fill = h('i', { style: `--w:${pct}%` });
      const bar = h('div', { class: `g-bar ${level(ratio)}`, role: 'meter', 'aria-valuenow': String(p.load), 'aria-valuemax': String(p.capacity), 'aria-label': `Carga de ${p.name}` }, fill);
      const btn = h('button', { class: 'dbtn', onclick: () => void this.deliver(p, l, g!, { row, bar, fill, loadEl, btn }) }, 'Entregar');
      const row = h(
        'div',
        { class: 'grow-row' },
        h('span', { class: 'g-face', style: `--c:${p.color}` }, portraitCanvas(p.look, 104)),
        h('div', { class: 'g-name' }, h('b', null, p.name), loadEl),
        bar,
        h(
          'div',
          { class: `g-after${over > 0 ? ' over' : ''}` },
          h('b', null, `+${fmt(l.weight)} `, arrow(), ` ${fmt(after)} / ${fmt(p.capacity)}`),
          over > 0 ? h('small', null, warnIcon(), h('u', null, `Excederá o limite em ${fmt(over)}`)) : null,
        ),
        btn,
      );
      body.append(row);
      if (opening) {
        enter(row, 'left', 120 + i * 60, 380);
        if (!reduced()) fill.animate([{ width: '0%' }, { width: `${pct}%` }], { duration: 800, delay: 240 + i * 60, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
        const warn = row.querySelector('.g-after small');
        if (warn) setTimeout(() => shake(warn, 0.3), 700 + i * 60);
      }
    });
  }

  private closeGive() {
    if (!this.giveOpen) {
      this.giveWrap.classList.add('hidden');
      return;
    }
    this.giveOpen = false;
    this.giveKey = '';
    if (reduced()) return this.giveWrap.classList.add('hidden');
    const a = this.giveWrap.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(2.4rem) rotate(1deg)', opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards', composite: 'add' });
    a.onfinish = () => {
      if (this.giveOpen) return;
      this.giveWrap.classList.add('hidden');
      a.cancel();
    };
  }

  /** Entrega: a barra enche, os números contam, o item voa até o retrato. */
  private async deliver(p: PartyMember, l: Loot, g: { itemId: number; lootId: number }, ui: { row: HTMLElement; bar: HTMLElement; fill: HTMLElement; loadEl: HTMLElement; btn: HTMLElement }) {
    if (this.delivering) return;
    this.delivering = true;
    try {
      const after = Math.round((p.load + l.weight) * 10) / 10;
      const over = after > p.capacity;
      sfx.click();
      this.giveBody.querySelectorAll('.dbtn').forEach((b) => ((b as HTMLButtonElement).disabled = true));
      ui.row.classList.add('giving');
      const pct = Math.min(100, (after / p.capacity) * 100);
      if (!reduced()) ui.fill.animate([{ width: getComputedStyle(ui.fill).width }, { width: `${pct}%` }], { duration: 480, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
      ui.bar.className = `g-bar ${level(after / p.capacity)}`;
      countUp(ui.loadEl, p.load, after, 480, (v) => `${fmt(v)} / ${fmt(p.capacity)}`);
      if (over) setTimeout(() => shake(ui.bar, 0.4), 420);
      await wait(reduced() ? 0 : 520);
      // voa do ícone do item no inspetor até o retrato
      const src = this.inspBody.querySelector<HTMLElement>(`[data-loot="${l.id}"] .ic-icon`) ?? ui.btn;
      const from = src.getBoundingClientRect();
      const card = this.cards.get(p.id ?? 0)?.el;
      this.app.net.send({ t: 'lootGive', itemId: g.itemId, lootId: l.id, to: p.name });
      this.giveLoot = null;
      if (card) {
        const to = card.getBoundingClientRect();
        await flyArc(lootIcon(l.kind, 52), from, to);
        bump(card, 1.07, 1.4);
        floatText(card, `+${fmt(l.weight)}`, over ? '#ff6a5c' : '#8fe39a');
      }
    } finally {
      this.delivering = false;
    }
  }

  private renderTokenInspector(body: HTMLElement, id: number) {
    const view = this.app.view;
    const u = view.users.get(id)!;
    const p = this.campaign?.party.find((x) => x.id === id);
    const color = p?.color ?? u.color;
    const net = this.app.net;
    const carried: { l: Loot; from: string }[] = [];
    const map = view.map;
    if (map) for (const it of [...map.allItems(), ...map.allWallItems()]) for (const l of it.loot ?? []) if (l.holder?.toLowerCase() === u.name.toLowerCase()) carried.push({ l, from: anyFurniName(it.defId) });
    const active = view.myId === id;
    const ratio = p && p.capacity ? p.load / p.capacity : 0;
    const load = p
      ? h('div', { class: 'tk-load' }, h('span', null, `Carga ${fmt(p.load)} / ${fmt(p.capacity)}`), h('div', { class: `g-bar ${level(ratio)}` }, h('i', { style: `--w:${Math.min(100, ratio * 100)}%` })))
      : null;
    body.append(
      h(
        'div',
        { class: 'insp-head' },
        this.polaroid(portraitCanvas(u.look, 262)),
        this.headText(
          u.name.toUpperCase(),
          (active ? 'Sob seu comando: clique no chão para andar.' : 'Clique em Comandar (ou no retrato dele) para mover este personagem.') + (this.gm ? ' Q e E giram.' : ''),
          load,
        ),
      ),
    );
    const tools = h('div', { class: 'tools' });
    const tool = (label: string, fn: () => void) => h('button', { class: 'tool', onclick: () => (sfx.click(), fn()) }, label);
    if (!active) tools.append(tool('Comandar', () => view.setActive(id)));
    tools.append(tool('Centralizar', () => view.focusUser(id)));
    if (this.gm) {
      tools.append(
        h('button', { class: 'tool', title: 'Girar para a esquerda (Q)', onclick: () => this.turnToken(id, false) }, '↺ Girar'),
        h('button', { class: 'tool', title: 'Girar para a direita (E)', onclick: () => this.turnToken(id, true) }, 'Girar ↻'),
        tool('Editar', () => this.tokenWin.open({ id, name: u.name, look: u.look, color, capacity: p?.capacity ?? 10 })),
        tool('Remover', async () => (await askNote(`TIRAR ${u.name.toUpperCase()}?`, `${u.name} sai do tabuleiro. Os itens que carrega continuam registrados.`, 'Tirar do tabuleiro', true)) && net.send({ t: 'tokenRemove', tokenId: id })),
      );
    }
    body.append(tools);
    if (this.gm) {
      const sc = h('select', { class: 'tool-sel', 'aria-label': 'Levar para outra cena' }, h('option', { value: '' }, 'Levar para outra cena…'), ...this.sceneList().filter((r) => r.id !== this.app.state.room?.id).map((r) => h('option', { value: String(r.id) }, r.name)));
      sc.addEventListener('change', () => sc.value && net.send({ t: 'tokenScene', tokenId: id, roomId: Number(sc.value) }));
      body.append(sc);
    }
    body.append(h('div', { class: 'itabs' }, h('span', { class: 'itab on' }, h('span', null, `CARREGANDO (${carried.length})`), tabRing())));
    const pane = h('div', { class: 'ipane' });
    if (!carried.length) pane.append(h('p', { class: 'empty' }, 'Nada nas mãos (itens desta cena).'));
    carried.forEach(({ l, from }) =>
      pane.append(h('div', { class: 'icard' }, h('div', { class: 'ic-icon' }, lootIcon(l.kind, 52)), h('div', { class: 'ic-text' }, h('b', null, l.name), h('small', null, `Peso: ${fmt(l.weight)} | ${lootKindLabel(l.kind)} · ${from}`)))),
    );
    body.append(pane);
  }

  /** Gira a peça parada para o próximo ângulo que a folha dela tem (cw = sentido horário na tela). */
  turnToken(viewId: number, cw: boolean) {
    const u = this.app.view.users.get(viewId);
    if (!u) return;
    if (!this.gm) return toast('Só o mestre gira os personagens. Abra o link do mestre (aparece no terminal do servidor).', 'error');
    const def = sprites.def(u.look.charId);
    // folha de 4 direções: só as 4 poses; de 8 ou avatar pixel: as 8
    const allowed = def ? distinctFacings((k) => def.dirs.some((d, i) => d === k && (def.anims?.[i] ?? 'idle') === 'idle')) : [];
    // cliques seguidos contam a partir do último pedido, não do que o servidor já confirmou
    const now = performance.now();
    const goal = this.turnGoal.get(viewId);
    const base = goal && now - goal.at < 800 ? goal.dir : u.dir;
    const next = turnFacing(base, cw, allowed);
    if (next === base) return;
    this.turnGoal.set(viewId, { dir: next, at: now });
    sfx.click();
    this.app.session.faceToken(-viewId, next);
  }

  // ================= baixo =================
  private renderParty() {
    const party = this.campaign?.party ?? [];
    const view = this.app.view;
    const cur = this.app.state.room?.id;
    if (!this.changed('party', [party, cur, view.myId, this.gm])) return;
    this.partyEl.style.setProperty('--n', String(Math.max(4, party.length)));
    const ids = new Set(party.map((p) => p.id ?? 0));
    for (const [id, c] of this.cards)
      if (!ids.has(id)) {
        this.cards.delete(id);
        void leave(c.el, 'down');
      }
    party.forEach((p, i) => {
      const id = p.id ?? 0;
      let c = this.cards.get(id);
      if (!c) {
        c = this.makeCard(p, i);
        this.cards.set(id, c);
        enter(c.el, 'up', this.intro(300 + i * 80), 560);
      }
      const look = JSON.stringify(p.look);
      if (c.look !== look) {
        clear(c.img).append(portraitCanvas(p.look, 200));
        c.look = look;
      }
      if (c.color !== p.color) {
        c.color = p.color;
        c.el.style.setProperty('--c', p.color);
        paperize(c.el, { seed: 60 + i * 3, tone: '#cfb99f', burn: 0.72, stripe: p.color, torn: 1.8, backs: [{ dx: 3, dy: 3, rot: 1.8 }, { dx: -3, dy: 5, rot: -1.3 }], pad: 22 });
      }
      c.name.textContent = p.name;
      const here = p.roomId === cur;
      const wasOn = c.el.classList.contains('on');
      c.el.classList.toggle('on', view.myId === id);
      c.el.classList.toggle('away', !here);
      c.away.textContent = here ? '' : this.sceneName(p.roomId);
      c.away.classList.toggle('hidden', here);
      c.el.title = here ? `${p.name} (tecla ${i + 1})` : `${p.name} — em ${this.sceneName(p.roomId)}`;
      if (!wasOn && view.myId === id && this.cards.size && performance.now() - this.shownAt > 1500) bump(c.el, 1.04, 0.8);
      const at = this.partyEl.children[i];
      if (at !== c.el) this.partyEl.insertBefore(c.el, at ?? null);
    });
    if (this.gm && this.campaign && !party.length) {
      if (!this.addCard) {
        this.addCard = h('button', { class: 'pcard add', title: 'Novo personagem', onclick: () => this.tokenWin.open() }, h('span', { class: 'plus' }, '+'), h('span', null, 'Personagem'));
        this.partyEl.append(this.addCard);
        enter(this.addCard, 'up', 0, 400);
      }
    } else if (this.addCard) {
      this.addCard.remove();
      this.addCard = null;
    }
  }

  private makeCard(p: PartyMember, i: number): Card {
    const id = p.id ?? 0;
    const img = h('span', { class: 'pc-img' }, portraitCanvas(p.look, 200));
    const name = h('span', { class: 'pc-name' }, p.name);
    const away = h('span', { class: 'pc-away hidden' });
    const el = h(
      'button',
      {
        class: 'pcard',
        style: `--c:${p.color};--r:${[-1.2, 0.8, -0.5, 1.1, -0.9, 0.6][i % 6]}deg`,
        'data-token': String(id),
        onclick: () => this.pickCard(id),
      },
      h('span', { class: 'pc-photo' }, img, h('i', { class: 'pc-corner k1' }), h('i', { class: 'pc-corner k2' }), h('i', { class: 'pc-corner k3' }), h('i', { class: 'pc-corner k4' })),
      name,
      away,
      h('i', { class: 'pc-glow', 'aria-hidden': 'true' }),
      h('i', { class: 'pc-glare', 'aria-hidden': 'true' }),
      this.turnButton(id, false),
      this.turnButton(id, true),
    );
    paperize(el, { seed: 60 + i * 3, tone: '#cfb99f', burn: 0.72, stripe: p.color, torn: 1.8, backs: [{ dx: 3, dy: 3, rot: 1.8 }, { dx: -3, dy: 5, rot: -1.3 }], pad: 22 });
    tilt(el);
    return { el, img, name, away, look: JSON.stringify(p.look), color: p.color };
  }

  /** Botãozinho de girar no canto da carta (a carta inteira continua comandando). */
  private turnButton(id: number, cw: boolean) {
    const run = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      this.turnToken(id, cw);
    };
    return h(
      'span',
      {
        class: `pc-turn ${cw ? 'r' : 'l'}`,
        role: 'button',
        tabindex: '0',
        title: cw ? 'Girar para a direita (E)' : 'Girar para a esquerda (Q)',
        'aria-label': cw ? 'Girar para a direita' : 'Girar para a esquerda',
        onclick: run,
        onpointerdown: (e: Event) => e.stopPropagation(),
        onkeydown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && run(e),
      },
      cw ? '↻' : '↺',
    );
  }

  private pickCard(id: number) {
    const p = this.campaign?.party.find((x) => x.id === id);
    if (!p || !p.id) return;
    const view = this.app.view;
    sfx.click();
    if (p.roomId === this.app.state.room?.id) {
      view.setActive(p.id);
      view.focusUser(p.id);
    } else if (p.roomId) {
      this.app.pendingActive = p.id;
      this.app.net.send({ t: 'join', roomId: p.roomId });
    }
  }

  /** Retrato balança enquanto a peça anda no tabuleiro. */
  private markWalking() {
    const now = performance.now();
    for (const [id, c] of this.cards) {
      const u = this.app.view.users.get(id);
      const walking = !!u?.anim && now - u.anim.start < 620;
      if (c.el.classList.contains('walking') !== walking) c.el.classList.toggle('walking', walking);
    }
  }

  private renderQuick() {
    const map = this.app.view.map;
    const list: { l: Loot; kind: 'floor' | 'wall'; id: number }[] = [];
    if (map) {
      for (const it of map.allItems()) for (const l of it.loot ?? []) if (!l.holder) list.push({ l, kind: 'floor', id: it.id });
      for (const it of map.allWallItems()) for (const l of it.loot ?? []) if (!l.holder) list.push({ l, kind: 'wall', id: it.id });
    }
    // agrupados por tipo: armas, documentos, chaves, cartas, consumíveis, mídia, caixas
    const order = LOOT_KINDS.map((k) => k.id);
    list.sort((a, b) => order.indexOf(a.l.kind) - order.indexOf(b.l.kind));
    this.slots.forEach((slot, i) => {
      const s = list[i];
      const more = i === 6 && list.length > 7 ? list.length - 6 : 0;
      const key = s ? `${s.kind}${s.id}:${s.l.id}:${s.l.name}:${more}` : '';
      if (key === slot.key) return;
      const had = slot.key !== '';
      slot.key = key;
      const el = slot.el;
      el.dataset.kind = s?.kind ?? '';
      el.dataset.item = s ? String(s.id) : '';
      el.disabled = !s;
      el.classList.toggle('empty', !s);
      el.title = s ? `${s.l.name} (${lootKindLabel(s.l.kind)})` : '';
      clear(el);
      if (!s) return;
      const ic = lootIcon(s.l.kind, 44);
      el.append(ic, h('span', { class: 'q-tag', 'aria-hidden': 'true' }, h('b', null, s.l.name), h('small', null, `Peso ${fmt(s.l.weight)}`)));
      if (more) el.append(h('b', { class: 'q-more' }, `+${more}`));
      if (!reduced()) {
        const d = this.intro(520 + i * 50);
        ic.animate([{ transform: 'scale(0.2) rotate(-40deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(6deg)', opacity: 1, offset: 0.65 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], {
          duration: 460,
          delay: d,
          easing: 'cubic-bezier(.3,.7,.3,1)',
          fill: 'backwards',
        });
        if (had || d === 0) setTimeout(() => sfx.pop(), d);
      }
    });
  }

  private pickSlot(i: number) {
    const el = this.slots[i].el;
    const kind = el.dataset.kind as 'floor' | 'wall' | '';
    const id = Number(el.dataset.item);
    if (!kind || !id) return;
    sfx.click();
    bump(el, 1.05, 0.3);
    this.app.view.focusItem(kind, id);
    this.app.view.select({ kind, id });
    this.inspTab = 'items';
    this.renderInspector(true);
  }

  private renderLog() {
    if (!this.campaign) return;
    const log = [...this.campaign.log].reverse();
    if (!this.changed('log', log)) return;
    const keys = log.map((e) => `${e.at}|${e.text}`);
    const want = new Set(keys);
    for (const [k, row] of this.logRows)
      if (!want.has(k)) {
        this.logRows.delete(k);
        row.remove();
      }
    this.logEl.querySelector('.empty')?.remove();
    if (!log.length) this.logEl.append(h('p', { class: 'empty' }, 'Nada ainda nesta sessão.'));
    log.forEach((e, i) => {
      const k = keys[i];
      let row = this.logRows.get(k);
      const isNew = !row;
      if (!row) {
        const t = new Date(e.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        row = h('div', { class: 'log-line' }, h('time', null, t), h('span', { class: 'lg-ic' }, logIcon(e.icon, 15)), h('span', { class: 'lg-t' }, e.text));
        this.logRows.set(k, row);
      }
      const at = this.logEl.children[i];
      if (at !== row) this.logEl.insertBefore(row, at ?? null);
      if (isNew && this.logReady && i === 0) this.animateLogLine(row, e.text);
      else if (isNew && !this.logReady) enter(row, 'up', this.intro(560 + i * 70), 420);
    });
    this.logReady = true;
  }

  /** Linha nova: abre espaço, carimba a hora e datilografa o texto. */
  private animateLogLine(row: HTMLElement, text: string) {
    if (reduced()) return;
    row.animate([{ height: '0px', opacity: 0 }, { height: getComputedStyle(row).height, opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    stamp(row.querySelector('time')!, 200);
    row.querySelector('.lg-ic')?.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.25)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 380, delay: 320, easing: 'ease-out', fill: 'backwards' });
    const t = row.querySelector<HTMLElement>('.lg-t')!;
    setTimeout(() => typeInto(t, text, 700), 380);
    row.animate([{ background: 'rgba(200,53,43,.18)' }, { background: 'rgba(200,53,43,0)' }], { duration: 1600, delay: 300, fill: 'backwards' });
  }

  private sceneName(id: number | null) {
    const s = this.sceneList().find((x) => x.id === id);
    return s ? s.name.split('·').pop()!.trim() : '';
  }
}
