/**
 * Tela do jogador (link ?ficha=CHAVE que o mestre manda): só a ficha dele,
 * pensada para o celular. MAPA e COMBATE aparecem na barra, mas ficam com o
 * mestre; NEX e pontos de prestígio também.
 */
import type { App } from './app';
import { h } from './dom';
import { FichasScreen } from './fichas';
import { ic } from './icons';
import { sfx } from './sfx';
import { TopBar } from './topbar';

const CHAVE = 'crona.fichaKey';

/** Chave do link da ficha (?ficha=...), guardada para abrir de novo sem o link. */
export function lerChaveFicha(): string | null {
  const q = new URLSearchParams(location.search);
  const daUrl = q.get('ficha');
  try {
    if (daUrl) localStorage.setItem(CHAVE, daUrl);
    return daUrl || (q.has('ficha') ? localStorage.getItem(CHAVE) : null);
  } catch {
    return daUrl;
  }
}

export function esquecerChaveFicha() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
}

export class TelaFicha {
  readonly el: HTMLElement;
  readonly fichas: FichasScreen;
  private aviso: HTMLElement;

  constructor(app: App, sair: () => void) {
    this.fichas = new FichasScreen(app, { jogador: true });
    const som = h('button', { role: 'menuitemcheckbox', onclick: () => (sfx.setEnabled(!sfx.enabled), desenharSom()) });
    const desenharSom = () => som.replaceChildren(ic('sol'), sfx.enabled ? 'Sons: ligados' : 'Sons: desligados');
    desenharSom();
    const menu = h('div', { class: 'tb2-menu hidden', role: 'menu' }, som);
    const topo = new TopBar({
      abas: [
        { id: 'MAPA', rotulo: 'MAPA', icone: 'mapa', fora: true },
        { id: 'COMBATE', rotulo: 'COMBATE', icone: 'espadas', fora: true },
        { id: 'FICHAS', rotulo: 'FICHAS', icone: 'ficha' },
      ],
      ativa: 'FICHAS',
      aoTrocar: () => {},
      botoes: [
        { id: 'config', icone: 'engrenagem', titulo: 'Configurações', cheio: true, onclick: (e) => (e.stopPropagation(), menu.classList.toggle('hidden')) },
        { id: 'sair', icone: 'sair', titulo: 'Sair', sair: true, onclick: () => sair() },
      ],
    });
    topo.botoes.get('config')!.parentElement!.append(menu);
    document.addEventListener('click', () => menu.classList.add('hidden'));
    this.aviso = h('div', { class: 'tf-aviso hidden' });
    this.el = h('div', { class: 'tela-ficha hidden' }, topo.el, this.fichas.el, this.aviso);
  }

  show() {
    this.el.classList.remove('hidden');
    this.aviso.classList.add('hidden');
    this.fichas.show();
  }

  /** Link inválido ou conexão perdida. */
  erro(msg: string) {
    this.el.classList.remove('hidden');
    this.aviso.replaceChildren(h('p', null, msg));
    this.aviso.classList.remove('hidden');
  }
}
