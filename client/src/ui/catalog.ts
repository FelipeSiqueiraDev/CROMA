import {
  anyFurniName,
  CATEGORY_NAMES,
  FURNI_LIST,
  getFurni,
  getWallFurni,
  WALL_FURNI_LIST,
  type FurniCategory,
} from '@crona/shared';
import { thumbCopy } from '../render/thumbs';
import type { App } from './app';
import { clear, h, toast, Win } from './dom';

export type StartPlace = (defId: string, invId?: number) => void;

export class CatalogWin {
  readonly win: Win;
  private app: App;
  private cat: FurniCategory = 'escritorio';
  private selected: string | null = null;
  private place: StartPlace;
  /** trocando um móvel do cômodo por outro (o botão Trocar do painel do móvel) */
  private troca: { id: number; defId: string } | null = null;

  constructor(app: App, place: StartPlace) {
    this.app = app;
    this.place = place;
    this.win = new Win('Construir', { width: 560, x: 80, y: 70, cls: 'catalog' });
    app.on('room', () => this.win.isOpen && this.render());
  }

  toggle() {
    if (this.win.isOpen) this.win.close();
    else {
      this.troca = null;
      this.render();
      this.win.open();
    }
  }

  /** Abre o catálogo para trocar o móvel id por outro, na categoria dele. */
  trocar(id: number, defId: string) {
    const d = getFurni(defId);
    this.troca = { id, defId };
    if (d && !d.interno) this.cat = d.category;
    this.selected = null;
    this.render();
    this.win.open();
  }

  private items(): { id: string; name: string; desc?: string }[] {
    if (this.cat === 'parede') return WALL_FURNI_LIST.map((d) => ({ id: d.id, name: d.name, desc: d.desc }));
    return FURNI_LIST.filter((d) => d.category === this.cat && !d.interno).map((d) => ({ id: d.id, name: d.name, desc: d.desc }));
  }

  private render() {
    const b = clear(this.win.body);
    const cats = h('nav', { class: 'cat-list' });
    for (const [id, label] of Object.entries(CATEGORY_NAMES) as [FurniCategory, string][]) {
      cats.append(
        h('button', { class: `cat${id === this.cat ? ' on' : ''}`, onclick: () => ((this.cat = id), (this.selected = null), this.render()) }, label),
      );
    }
    const grid = h('div', { class: 'item-grid' });
    for (const it of this.items()) {
      const cell = h(
        'button',
        {
          class: `item-cell${it.id === this.selected ? ' on' : ''}`,
          title: it.name,
          onclick: () => {
            this.selected = it.id;
            this.render();
          },
          ondblclick: () => this.tryPlace(it.id),
        },
        thumbCopy(it.id, 56),
      );
      grid.append(cell);
    }
    const detail = h('div', { class: 'item-detail' });
    const sel = this.selected;
    if (sel) {
      const fd = getFurni(sel);
      const wd = getWallFurni(sel);
      const facts: string[] = [];
      if (fd) {
        facts.push(`${fd.width}×${fd.depth} tiles`);
        if (fd.sit) facts.push('dá para sentar');
        if (fd.walkable) facts.push('dá para pisar');
        if (fd.stackable) facts.push('empilhável');
        if (fd.states) facts.push('interativo');
      } else if (wd) facts.push('vai na parede');
      detail.append(
        h('div', { class: 'detail-thumb' }, thumbCopy(sel, 96)),
        h('div', { class: 'detail-text' }, h('b', null, anyFurniName(sel)), h('small', null, facts.join(' · ')), (fd?.desc ?? wd?.desc) ? h('p', null, fd?.desc ?? wd?.desc ?? '') : null),
        h('button', { class: 'btn primary', onclick: () => this.tryPlace(sel) }, this.troca ? 'Trocar por este' : 'Colocar no quarto'),
      );
    } else detail.append(h('p', { class: 'muted' }, this.troca ? `Trocando ${anyFurniName(this.troca.defId)}: escolha o móvel novo (duplo clique já troca).` : 'Escolha um mobi. Duplo clique já começa a colocar.'));
    b.append(h('div', { class: 'catalog-layout' }, cats, h('div', { class: 'catalog-main' }, grid, detail)));
  }

  private tryPlace(defId: string) {
    if (!this.app.state.room) return toast('Entre num quarto primeiro.', 'error');
    if (!this.app.canBuild) return toast('Só o mestre do quarto pode construir aqui.', 'error');
    if (this.troca) {
      if (!getFurni(defId)) return toast('Item de parede não troca com móvel de chão.', 'error');
      this.app.net.send({ t: 'swapItem', id: this.troca.id, defId });
      this.troca = null;
      this.win.close();
      return;
    }
    this.place(defId);
    this.win.close();
  }
}

export class InventoryWin {
  readonly win: Win;
  private app: App;
  private place: StartPlace;

  constructor(app: App, place: StartPlace) {
    this.app = app;
    this.place = place;
    this.win = new Win('Mobis guardados', { width: 400, x: innerWidth - 440, y: 90 });
    app.on('inventory', () => this.win.isOpen && this.render());
  }

  toggle() {
    if (this.win.isOpen) this.win.close();
    else {
      this.render();
      this.win.open();
    }
  }

  private render() {
    const b = clear(this.win.body);
    const inv = this.app.state.inventory;
    if (!inv.length) {
      b.append(h('p', { class: 'muted' }, 'Inventário vazio. Mobis que você guardar aparecem aqui.'));
      return;
    }
    const groups = new Map<string, number[]>();
    for (const it of inv) {
      const g = groups.get(it.defId) ?? [];
      g.push(it.id);
      groups.set(it.defId, g);
    }
    const grid = h('div', { class: 'item-grid inv' });
    for (const [defId, ids] of groups) {
      grid.append(
        h(
          'button',
          {
            class: 'item-cell',
            title: `${anyFurniName(defId)} — clique para colocar`,
            onclick: () => {
              if (!this.app.state.room) return toast('Entre num quarto primeiro.', 'error');
              if (!this.app.canBuild) return toast('Só o mestre do quarto pode construir aqui.', 'error');
              this.place(defId, ids[0]);
              this.win.close();
            },
          },
          thumbCopy(defId, 56),
          ids.length > 1 ? h('span', { class: 'count' }, `×${ids.length}`) : null,
        ),
      );
    }
    b.append(grid, h('p', { class: 'muted' }, 'Clique para colocar. Segure Shift para colocar vários.'));
  }
}
