/**
 * Tela do jogador (link ?ficha=CHAVE que o mestre manda, ou a conta dele): abre no modo jogo
 * (TelaJogador: Agente, Mochila, Poderes, Rituais, Docs, Notas), pensado para o celular; a ficha
 * inteira fica na engrenagem. NEX e pontos de prestígio ficam com o mestre.
 */
import type { FichaSalva } from '@crona/shared';
import type { App } from './app';
import { h } from './dom';
import { botao, janela } from './fichaModal';
import { FichasScreen } from './fichas';
import { TelaJogador } from './jogador';
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

/** Guarda a chave da ficha que a conta do jogador trouxe (abre com ?ficha, sem o link). */
export function guardarChaveFicha(chave: string) {
  try {
    localStorage.setItem(CHAVE, chave);
  } catch {
    /* sem armazenamento */
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
  /** o modo jogo (abre nele); a ficha inteira fica na engrenagem */
  readonly jogo: TelaJogador;
  private completa: HTMLElement;
  private aviso: HTMLElement;

  constructor(app: App, sair: () => void) {
    this.fichas = new FichasScreen(app, { jogador: true });
    this.jogo = new TelaJogador(app, { fichaCompleta: () => this.verCompleta(true), menu: () => this.menu(), sair });
    const topo = new TopBar({
      abas: [
        { id: 'JOGO', rotulo: 'JOGO', icone: 'esquerda' },
        { id: 'FICHAS', rotulo: 'FICHA', icone: 'ficha' },
      ],
      ativa: 'FICHAS',
      aoTrocar: (id) => id === 'JOGO' && this.verCompleta(false),
      botoes: [
        { id: 'config', icone: 'engrenagem', titulo: 'Menu', cheio: true, onclick: (e) => (e.stopPropagation(), this.menu()) },
        { id: 'sair', icone: 'sair', titulo: 'Sair', sair: true, onclick: () => sair() },
      ],
    });
    this.completa = h('div', { class: 'tf-completa hidden' }, topo.el, this.fichas.el);
    this.aviso = h('div', { class: 'tf-aviso hidden' });
    this.el = h('div', { class: 'tela-ficha hidden' }, this.jogo.el, this.completa, this.aviso);
  }

  /** As fichas chegaram (só a dele) e a equipe, para entregar itens. */
  setFichas(fichas: FichaSalva[], nova?: number, equipe?: { id: number; nome: string }[]) {
    this.fichas.setFichas(fichas, nova);
    this.jogo.setFicha(fichas[0] ?? null);
    if (equipe) this.jogo.setEquipe(equipe);
  }

  private verCompleta(sim: boolean) {
    sfx.paper();
    this.completa.classList.toggle('hidden', !sim);
    this.jogo.el.classList.toggle('hidden', sim);
    if (sim) this.fichas.show();
  }

  /** A engrenagem: a ficha completa e o som. */
  private menu() {
    const naFicha = !this.completa.classList.contains('hidden');
    const j = janela('MENU', 'engrenagem', () => {}, 30);
    const som = botao(sfx.enabled ? 'Sons: ligados' : 'Sons: desligados', 'sol', '', () => {
      sfx.setEnabled(!sfx.enabled);
      som.querySelector('span')!.textContent = sfx.enabled ? 'Sons: ligados' : 'Sons: desligados';
    });
    j.el.classList.add('tela-toda');
    j.corpo.append(
      h(
        'div',
        { class: 'tf-menu' },
        botao(naFicha ? 'Voltar ao jogo' : 'Ficha completa', naFicha ? 'esquerda' : 'ficha', 'forte', () => (j.fechar(), this.verCompleta(!naFicha))),
        som,
      ),
    );
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
