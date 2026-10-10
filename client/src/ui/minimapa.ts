import { montarLocais, nomeCurto, parseHeightmap, type CampaignState, type Heightmap, type Locais, type LocalPredio, type SceneInfo } from '@crona/shared';
import { clear, h } from './dom';
import { ic } from './icons';
import { reduced, wait } from './motion';
import { sfx } from './sfx';

/**
 * O minimapa da tela MAPA: a planta do lugar em níveis, Terreno › Prédio › Andar › Cômodo.
 *
 * - No terreno (a cena ao ar livre), o mapa em pixel art, como o mapa de um jogo antigo: o
 *   chão, as árvores, a cerca, as plantações, os prédios com o telhado e a plaquinha, as
 *   saídas e as peças. O painel é um HUD, com a moldura azul do tabuleiro.
 * - Clicar num prédio desce até ele (o mapa dá zoom no telhado e vira a planta do andar);
 *   a escada (▲ ▼) troca o andar; o botão ‹, o direito ou a roda para trás sobem. O botão
 *   das camadas abre a lista de todos os lugares, prédio por prédio, andar por andar.
 * - Clicar num cômodo só olha (o cartão embaixo diz o que é e quem está); "Entrar" ou o
 *   clique duplo levam a cena (o tabuleiro e a mesa vão junto).
 *
 * Tudo sai das cenas (`montarLocais`, em shared/src/locais.ts): mapa novo ganha minimapa
 * sozinho, sem arte de cada mapa.
 */

export interface MinimapaHost {
  campanha(): CampaignState | null;
  cenaAtual(): number | undefined;
  /** o mestre arruma a planta (Alt + arrastar um cômodo) */
  mestre(): boolean;
  ir(id: number): void;
  moverCena(id: number, x: number, y: number): void;
}

type Vista = { tipo: 'terreno'; cena: number } | { tipo: 'predio'; predio: string; andar: string };
type Caixa = { x: number; y: number; w: number; h: number };
interface Alvo extends Caixa {
  tipo: 'cena' | 'predio' | 'saida' | 'andar';
  id: number | string;
  nome: string;
  forma?: Path2D;
}
interface Anim {
  terreno: Vista;
  predio: Vista;
  /** o prédio no desenho do terreno */
  R: Caixa;
  /** 1 = descendo para o prédio, -1 = subindo para o terreno */
  dir: 1 | -1;
  t0: number;
  dur: number;
}

const PAD = 10;
/** pixels da arte por casa: o mapa é desenhado pequeno e ampliado sem suavizar */
const P = 4;
const FONTE = '"Pixelify Sans", "Silkscreen", monospace';
/** as cores do HUD (as da plaquinha e dos botões do tabuleiro) */
const HUD = { fundo: 'rgba(9,12,18,0.86)', borda: '#8fb0d2', texto: '#e2eefa', fraco: '#a9c6e4', aqui: '#ff6a52', ouro: '#f0c96a' };
/** metros por casa (M_POR_CASA) */
const M_CASA = 0.75;

/** Ruído fixo de uma casa (sempre o mesmo desenho para o mesmo mapa). */
function ruido(x: number, y: number, k = 0) {
  const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

const mesma = (a: Vista | null, b: Vista | null) =>
  !!a && !!b && a.tipo === b.tipo && (a.tipo === 'terreno' ? a.cena === (b as typeof a).cena : a.predio === (b as typeof a).predio && a.andar === (b as typeof a).andar);

export class Minimapa {
  readonly trilha = h('div', { class: 'p-title mm-trilha' });
  readonly canvas = h('canvas', { class: 'plan-canvas mm-canvas' });
  readonly cartao = h('div', { class: 'mm-cartao hidden' });
  readonly botoes = h('div', { class: 'mm-botoes' });

  private locais: Locais | null = null;
  private sigLocais = '';
  private vista: Vista | null = null;
  /** acompanha a cena aberta (deixa de acompanhar quando o mestre sai olhando) */
  private seguindo = true;
  private ultimaCena: number | undefined = undefined;
  private sel: { tipo: 'cena'; id: number } | null = null;
  private hover = '';
  private alvos: Alvo[] = [];
  private anim: Anim | null = null;
  private raf = 0;
  private hatch = { room: -1, t: 1 };
  private fade = { room: -1, t: 1 };
  private drag: { id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null;
  /** escala e origem do andar desenhado agora (para arrastar cômodos) */
  private S = 6;
  private O = { x: 0, y: 0 };
  private hms = new Map<string, Heightmap>();
  /** o terreno em pixel art, pronto (só muda quando o mapa muda) */
  private camadas = new Map<number, { sig: string; c: HTMLCanvasElement }>();

  constructor(private host: MinimapaHost) {
    this.ligar();
  }

  // ------------------------------------------------------------------ estado

  /** A campanha ou a cena mudou: refaz os níveis e volta para onde o grupo está. */
  atualizar() {
    const camp = this.host.campanha();
    const cenas = camp?.scenes ?? [];
    const sig = JSON.stringify(cenas.map((s) => [s.id, s.name, s.floor, s.aberto, s.portals.map((p) => p.link), s.marcos?.map((m) => [m.x, m.y, m.entra])]));
    if (sig !== this.sigLocais) {
      this.sigLocais = sig;
      this.locais = cenas.length ? montarLocais(cenas) : null;
      this.camadas.clear();
    }
    const cur = this.host.cenaAtual();
    if (cur !== this.ultimaCena) {
      this.ultimaCena = cur;
      this.seguindo = true;
      this.sel = null;
      this.anim = null;
    }
    const aqui = cur !== undefined ? this.vistaDe(cur) : null;
    if (this.seguindo || !this.vista || !this.valida(this.vista)) this.vista = aqui ?? this.primeira();
    this.desenhar();
  }

  /** Vai para o nível da cena (o terreno, ou o andar do prédio dela). */
  private vistaDe(id: number): Vista | null {
    const o = this.locais?.onde.get(id);
    if (!o) return null;
    if (o.predio) return { tipo: 'predio', predio: o.predio, andar: o.andar ?? '' };
    return o.terreno !== null ? { tipo: 'terreno', cena: o.terreno } : null;
  }

  private primeira(): Vista | null {
    const l = this.locais;
    if (!l) return null;
    if (l.terrenos[0]) return { tipo: 'terreno', cena: l.terrenos[0].cena };
    const p = l.predios[0];
    return p ? { tipo: 'predio', predio: p.id, andar: p.andares[0]?.nome ?? '' } : null;
  }

  private valida(v: Vista) {
    const l = this.locais;
    if (!l) return false;
    if (v.tipo === 'terreno') return l.terrenos.some((t) => t.cena === v.cena);
    return !!l.predios.find((p) => p.id === v.predio)?.andares.some((a) => a.nome === v.andar);
  }

  private predio(id: string) {
    return this.locais?.predios.find((p) => p.id === id);
  }

  private cena(id: number) {
    return this.host.campanha()?.scenes.find((s) => s.id === id);
  }

  /** Muda o nível mostrado; volta a acompanhar se for o da cena aberta. */
  private mostrar(v: Vista, anima = true) {
    const de = this.vista;
    if (mesma(de, v)) return;
    const cur = this.host.cenaAtual();
    this.seguindo = mesma(v, cur !== undefined ? this.vistaDe(cur) : null);
    this.sel = null;
    // terreno ↔ prédio: o zoom no telhado
    if (anima && de && !reduced()) {
      const terreno = de.tipo === 'terreno' ? de : v.tipo === 'terreno' ? v : null;
      const pv = de.tipo === 'predio' ? de : v.tipo === 'predio' ? v : null;
      const p = pv && this.predio(pv.predio);
      if (terreno && pv && p?.marco && p.terreno === terreno.cena) {
        const R = this.caixaDoPredio(terreno.cena, p);
        if (R) this.anim = { terreno, predio: pv, R, dir: v.tipo === 'predio' ? 1 : -1, t0: performance.now(), dur: 520 };
      }
    }
    this.vista = v;
    this.desenhar();
  }

  /** Sobe um nível (do prédio para o terreno dele). */
  private subir() {
    const v = this.vista;
    if (v?.tipo !== 'predio') return;
    const p = this.predio(v.predio);
    if (p?.terreno === null || p?.terreno === undefined) return;
    sfx.whoosh(260);
    this.mostrar({ tipo: 'terreno', cena: p.terreno });
  }

  private descer(p: LocalPredio) {
    sfx.whoosh(260);
    const cur = this.host.cenaAtual();
    const dentro = cur !== undefined ? this.locais?.onde.get(cur) : undefined;
    const andar = dentro?.predio === p.id ? dentro.andar! : (p.andares.find((a) => a.cenas.includes(p.entrada))?.nome ?? p.andares[0].nome);
    this.mostrar({ tipo: 'predio', predio: p.id, andar });
  }

  /** Volta para onde o grupo está. */
  private centralizar() {
    const cur = this.host.cenaAtual();
    const v = cur !== undefined ? this.vistaDe(cur) : null;
    if (!v) return;
    sfx.click();
    this.mostrar(v);
    this.seguindo = true;
  }

  /** A cena aberta mudou: o cômodo novo acende com a varredura (como o radar de um jogo). */
  animarAtual(delay: number) {
    const room = this.host.cenaAtual() ?? -1;
    this.fade = { room: this.hatch.room, t: 0 };
    this.hatch = { room, t: reduced() ? 1 : 0 };
    if (reduced()) return this.desenhar();
    const run = async () => {
      if (delay) await wait(delay);
      const t0 = performance.now();
      const passo = () => {
        if (this.hatch.room !== room) return;
        const t = Math.min(1, (performance.now() - t0) / 700);
        this.hatch.t = t;
        this.fade.t = Math.min(1, t * 1.6);
        this.desenhar();
        if (t < 1) requestAnimationFrame(passo);
        else this.fade = { room: -1, t: 1 };
      };
      requestAnimationFrame(passo);
    };
    void run();
  }

  // ------------------------------------------------------------------ mouse

  private ligar() {
    const c = this.canvas;
    const at = (e: MouseEvent) => {
      const r = c.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * c.clientWidth) / r.width, y: ((e.clientY - r.top) * c.clientHeight) / r.height };
    };
    const acerta = (p: { x: number; y: number }) => {
      const ctx = c.getContext('2d')!;
      for (const a of [...this.alvos].reverse()) {
        if (p.x < a.x || p.x > a.x + a.w || p.y < a.y || p.y > a.y + a.h) continue;
        if (a.forma) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const dentro = ctx.isPointInPath(a.forma, p.x, p.y);
          ctx.restore();
          if (!dentro) continue;
        }
        return a;
      }
      return undefined;
    };
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.anim) return;
      const a = acerta(at(e));
      if (!a) {
        this.sel = null;
        return this.desenhar();
      }
      if (a.tipo === 'cena' && e.altKey && this.host.mestre() && this.vista?.tipo === 'predio') {
        const lay = this.host.campanha()?.layout[a.id as number] ?? { x: 0, y: 0 };
        const p = at(e);
        this.drag = { id: a.id as number, sx: p.x, sy: p.y, ox: lay.x, oy: lay.y, moved: false };
        c.setPointerCapture(e.pointerId);
      }
    });
    c.addEventListener('pointermove', (e) => {
      const p = at(e);
      const d = this.drag;
      if (d) {
        const camp = this.host.campanha();
        const dx = Math.round((p.x - d.sx) / this.S);
        const dy = Math.round((p.y - d.sy) / this.S);
        if (dx || dy) d.moved = true;
        if (d.moved && camp) {
          camp.layout[d.id] = { ...camp.layout[d.id], x: d.ox + dx, y: d.oy + dy };
          this.desenhar();
        }
        return;
      }
      const a = acerta(p);
      c.style.cursor = a ? 'pointer' : 'default';
      const k = a ? `${a.tipo}:${a.id}` : '';
      if (k !== this.hover) {
        this.hover = k;
        this.desenhar();
      }
      const titulo = a?.nome ?? '';
      if (c.title !== titulo) c.title = titulo;
    });
    c.addEventListener('pointerleave', () => {
      if (!this.hover) return;
      this.hover = '';
      this.desenhar();
    });
    c.addEventListener('pointerup', (e) => {
      const d = this.drag;
      this.drag = null;
      if (d?.moved) {
        const l = this.host.campanha()?.layout[d.id];
        if (l) this.host.moverCena(d.id, l.x, l.y);
        return;
      }
      if (e.button !== 0 || this.anim) return;
      const a = acerta(at(e));
      if (!a) return;
      if (a.tipo === 'predio') {
        const p = this.predio(a.id as string);
        if (p) this.descer(p);
        return;
      }
      if (a.tipo === 'andar' && this.vista?.tipo === 'predio') {
        sfx.tick();
        this.mostrar({ tipo: 'predio', predio: this.vista.predio, andar: a.id as string }, false);
        return;
      }
      if (a.tipo === 'saida') {
        sfx.tick();
        this.mostrar({ tipo: 'terreno', cena: a.id as number }, false);
        return;
      }
      const id = a.id as number;
      if (this.sel?.id !== id) sfx.click();
      this.sel = { tipo: 'cena', id };
      this.desenhar();
    });
    c.addEventListener('dblclick', (e) => {
      const a = acerta(at(e));
      if (a?.tipo === 'cena' && a.id !== this.host.cenaAtual()) this.host.ir(a.id as number);
    });
    // o botão direito e a roda para trás sobem; a roda para a frente em cima de um prédio desce
    c.addEventListener('contextmenu', (e) => {
      if (this.vista?.tipo !== 'predio' || this.predio(this.vista.predio)?.terreno == null) return;
      e.preventDefault();
      this.subir();
    });
    c.addEventListener(
      'wheel',
      (e) => {
        if (this.anim) return;
        if (e.deltaY > 0 && this.vista?.tipo === 'predio' && this.predio(this.vista.predio)?.terreno != null) {
          e.preventDefault();
          this.subir();
        } else if (e.deltaY < 0 && this.vista?.tipo === 'terreno') {
          const a = acerta(at(e));
          const p = a?.tipo === 'predio' ? this.predio(a.id as string) : undefined;
          if (p) {
            e.preventDefault();
            this.descer(p);
          }
        }
      },
      { passive: false },
    );
  }

  // ------------------------------------------------------------------ DOM: caminho, abas, cartão

  private renderCabeca() {
    const v = this.vista;
    const l = this.locais;
    const camp = this.host.campanha();
    const cur = this.host.cenaAtual();
    const p = v?.tipo === 'predio' ? this.predio(v.predio) : undefined;
    const terreno = v?.tipo === 'terreno' ? v.cena : p?.terreno ?? null;
    const tNome = terreno !== null ? l?.terrenos.find((t) => t.cena === terreno)?.nome : undefined;
    // o título: o lugar (a fazenda, os arredores) ou o prédio e o andar ("Casarão › Térreo")
    const partes: string[] = [];
    if (v?.tipo === 'terreno') partes.push(terreno === l?.terrenos[0]?.cena ? camp?.title || tNome || 'Planta' : tNome || 'Planta');
    if (p) {
      partes.push(p.nome || camp?.title || 'Planta');
      const a = p.andares.find((x) => v?.tipo === 'predio' && x.nome === v.andar);
      if (a && p.andares.length > 1) partes.push(a.rotulo);
    }
    if (!partes.length) partes.push('Planta');
    const sig = JSON.stringify(partes);
    if (this.trilha.dataset.sig !== sig) {
      this.trilha.dataset.sig = sig;
      clear(this.trilha);
      partes.forEach((x, i) => {
        if (i) this.trilha.append(h('span', { class: 'mm-sep', 'aria-hidden': 'true' }, '›'));
        this.trilha.append(h('span', { class: `mm-migalha${i === partes.length - 1 ? ' on' : ''}` }, x));
      });
    }
    // os botões do canto: subir, voltar para onde o grupo está e a lista de todos os lugares
    const podeSubir = v?.tipo === 'predio' && p?.terreno != null;
    const longe = !this.seguindo && cur !== undefined && !!this.vistaDe(cur);
    const sigB = JSON.stringify([podeSubir, longe]);
    if (this.botoes.dataset.sig !== sigB) {
      this.botoes.dataset.sig = sigB;
      clear(this.botoes).append(
        podeSubir ? h('button', { class: 'mm-bt', type: 'button', title: 'Voltar ao terreno (botão direito)', 'aria-label': 'Voltar ao terreno', onclick: () => this.subir() }, ic('esquerda')) : '',
        longe ? h('button', { class: 'mm-bt', type: 'button', title: 'Onde o grupo está', 'aria-label': 'Centralizar', onclick: () => this.centralizar() }, ic('centralizar')) : '',
        h('button', { class: 'mm-bt', type: 'button', title: 'Todos os lugares', 'aria-label': 'Todos os lugares', onclick: () => this.abrirLugares() }, ic('camadas')),
      );
    }
    this.renderCartao();
  }

  /** Mostra a cena no minimapa (o nível dela) com o cartão aberto. */
  private focar(id: number) {
    const v = this.vistaDe(id);
    if (!v) return;
    this.mostrar(v);
    this.sel = { tipo: 'cena', id };
    this.desenhar();
  }

  /** Abertos na lista de lugares (os prédios e os andares); o do grupo abre sozinho. */
  private abertos = new Set<string>();

  /**
   * A lista de todos os lugares, numa janela: cada terreno com os prédios dele, cada prédio
   * abre os andares e os cômodos. Clicar num nome mostra no minimapa; o Entrar leva a cena.
   */
  private abrirLugares() {
    const l = this.locais;
    const camp = this.host.campanha();
    if (!l || !camp) return;
    sfx.tick();
    const cur = this.host.cenaAtual();
    const ondeCur = cur !== undefined ? l.onde.get(cur) : undefined;
    if (ondeCur?.predio) (this.abertos.add(ondeCur.predio), this.abertos.add(`${ondeCur.predio}/${ondeCur.andar}`));
    const lista = h('div', { class: 'mm-lugares' });
    const j = this.janelaHud(camp.title || 'Lugares', lista);
    const bolinhas = (ids: number[]) => {
      const g = this.genteEm(ids);
      return g.length ? h('span', { class: 'mm-gente', 'aria-label': `${g.length} aqui` }, ...g.slice(0, 6).map((cor) => h('i', { style: `background:${cor}` }))) : null;
    };
    const entrar = (id: number) =>
      id === cur
        ? h('span', { class: 'mm-l-aqui', title: 'O grupo está aqui' }, ic('pino'), 'Aqui')
        : h('button', { class: 'mm-l-entrar', type: 'button', title: 'Levar a cena para lá', onclick: (e: Event) => (e.stopPropagation(), j.fechar(), this.host.ir(id)) }, ic('entrar'), 'Entrar');
    const ver = (id: number) => () => (sfx.click(), j.fechar(), this.focar(id));
    /** linha de um lugar que é uma cena: o nome mostra no minimapa */
    const linhaCena = (id: number, nome: string, cls: string, icone: string) =>
      h(
        'div',
        { class: `mm-l-linha ${cls}${id === cur ? ' atual' : ''}` },
        h('button', { class: 'mm-l-nome', type: 'button', title: 'Mostrar no minimapa', onclick: ver(id) }, ic(icone), h('span', null, nome), bolinhas([id])),
        entrar(id),
      );
    /** grupo que abre e fecha (o prédio, o andar) */
    const grupo = (chave: string, cabeca: (seta: Element) => HTMLElement, filhos: () => HTMLElement[], cls: string) => {
      const box = h('div', { class: `mm-l-grupo ${cls}` });
      const desenha = () => {
        const aberto = this.abertos.has(chave);
        box.classList.toggle('aberto', aberto);
        clear(box).append(
          cabeca(h('span', { class: 'mm-l-seta', 'aria-hidden': 'true' }, aberto ? '▾' : '▸')),
          aberto ? h('div', { class: 'mm-l-filhos' }, ...filhos()) : '',
        );
      };
      const alternar = () => {
        sfx.tick();
        if (this.abertos.has(chave)) this.abertos.delete(chave);
        else this.abertos.add(chave);
        desenha();
      };
      desenha();
      return { box, alternar };
    };
    const predioEl = (p: LocalPredio) => {
      let alt: () => void = () => {};
      const g = grupo(
        p.id,
        (seta) =>
          h(
            'div',
            { class: `mm-l-linha predio${ondeCur?.predio === p.id ? ' atual' : ''}` },
            h('button', { class: 'mm-l-nome', type: 'button', 'aria-expanded': String(this.abertos.has(p.id)), onclick: () => alt() }, seta, ic('mapa'), h('span', null, p.nome || camp.title || 'Prédio'), h('small', null, `${p.cenas.length} ${p.cenas.length === 1 ? 'cômodo' : 'cômodos'}`), bolinhas(p.cenas)),
            entrar(p.entrada),
          ),
        () =>
          p.andares.length === 1
            ? p.andares[0].cenas.map((id) => linhaCena(id, nomeCurto(this.cena(id)?.name ?? ''), 'comodo', 'pino'))
            : p.andares.map((a) => {
                let altA: () => void = () => {};
                const ga = grupo(
                  `${p.id}/${a.nome}`,
                  (seta) => h('div', { class: 'mm-l-linha andar' }, h('button', { class: 'mm-l-nome', type: 'button', onclick: () => altA() }, seta, ic('camadas'), h('span', null, a.rotulo), bolinhas(a.cenas))),
                  () => a.cenas.map((id) => linhaCena(id, nomeCurto(this.cena(id)?.name ?? ''), 'comodo', 'pino')),
                  'andar',
                );
                altA = ga.alternar;
                return ga.box;
              }),
        'predio',
      );
      alt = g.alternar;
      return g.box;
    };
    for (const t of l.terrenos) {
      lista.append(linhaCena(t.cena, t.nome, 'terreno', 'montanha'));
      const filhos = t.predios.map((id) => this.predio(id)).filter((p): p is LocalPredio => !!p);
      if (filhos.length) lista.append(h('div', { class: 'mm-l-filhos' }, ...filhos.map(predioEl)));
    }
    for (const p of l.predios.filter((q) => q.terreno === null)) {
      this.abertos.add(p.id);
      lista.append(predioEl(p));
    }
  }

  /** A janela do HUD (a moldura azul do tabuleiro), no meio da tela; Esc ou fora dela fecha. */
  private janelaHud(titulo: string, corpo: HTMLElement) {
    const fechar = () => {
      document.removeEventListener('keydown', tecla, true);
      fundo.classList.add('saindo');
      setTimeout(() => fundo.remove(), 140);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      fechar();
    };
    const caixa = h(
      'section',
      { class: 'mm-janela', role: 'dialog', 'aria-label': titulo },
      h('header', null, ic('camadas'), h('h3', null, titulo), h('button', { class: 'mm-bt', type: 'button', title: 'Fechar (Esc)', 'aria-label': 'Fechar', onclick: () => fechar() }, ic('fechar'))),
      corpo,
    );
    const fundo = h('div', { class: 'mm-janela-fundo' }, caixa);
    fundo.addEventListener('pointerdown', (e) => e.target === fundo && fechar());
    document.addEventListener('keydown', tecla, true);
    document.body.append(fundo);
    return { fechar };
  }

  /** As cores de quem está nessas cenas. */
  private genteEm(ids: number[]): string[] {
    const camp = this.host.campanha();
    if (!camp) return [];
    const out: string[] = [];
    for (const id of ids)
      for (const u of this.cena(id)?.users ?? []) out.push(camp.party.find((q) => q.id === u.id)?.color ?? '#efe6d1');
    return out;
  }

  /** O cartão do cômodo escolhido: o que é, quem está lá e o Entrar. */
  private renderCartao() {
    const sel = this.sel;
    const s = sel ? this.cena(sel.id) : undefined;
    const cur = this.host.cenaAtual();
    const camp = this.host.campanha();
    const quem = s ? s.users.map((u) => camp?.party.find((q) => q.id === u.id)?.name ?? u.name) : [];
    const sig = JSON.stringify([sel?.id, s?.name, quem, cur]);
    if (this.cartao.dataset.sig === sig) return;
    this.cartao.dataset.sig = sig;
    clear(this.cartao).classList.toggle('hidden', !s);
    if (!s) return;
    const o = this.locais?.onde.get(s.id);
    const p = o?.predio ? this.predio(o.predio) : undefined;
    const andar = p?.andares.find((a) => a.nome === o?.andar)?.rotulo;
    const onde = [andar, p?.nome].filter(Boolean).join(' · ') || (s.aberto ? 'Ao ar livre' : '');
    const aqui = s.id === cur;
    this.cartao.append(
      h(
        'div',
        { class: 'mm-c-txt' },
        h('b', null, nomeCurto(s.name)),
        h('span', null, onde),
        h('span', { class: 'mm-c-quem' }, quem.length ? quem.join(', ') : 'Ninguém aqui'),
      ),
      aqui
        ? h('span', { class: 'mm-c-aqui' }, ic('pino'), 'Aqui')
        : h('button', { class: 'mm-c-entrar', type: 'button', title: 'Levar a cena para lá (clique duplo também)', onclick: () => this.host.ir(s.id) }, ic('entrar'), 'Entrar'),
    );
  }


  // ------------------------------------------------------------------ desenho

  desenhar() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.quadro();
    });
  }

  private quadro() {
    const c = this.canvas;
    const W = c.clientWidth || 220;
    this.renderCabeca();
    const H = this.altura();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const Hc = c.clientHeight || 170;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(Hc * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(Hc * dpr);
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hc);
    const v = this.vista;
    if (!v || !this.locais) return;
    const a = this.anim;
    if (a) {
      const p = Math.min(1, (performance.now() - a.t0) / a.dur);
      const ease = 1 - (1 - p) ** 3;
      const e = a.dir > 0 ? ease : 1 - ease;
      // o prédio no terreno cresce até encher o painel, e a planta dele nasce do telhado
      const F = encaixar(a.R, W, H);
      const k = F.w / a.R.w;
      const s = 1 + (k - 1) * e;
      ctx.save();
      ctx.translate((F.x - a.R.x * k) * e, (F.y - a.R.y * k) * e);
      ctx.scale(s, s);
      ctx.globalAlpha = Math.max(0, 1 - e * 1.4);
      this.desenharVista(ctx, a.terreno, W, H, []);
      ctx.restore();
      const si = 1 / k + (1 - 1 / k) * e;
      ctx.save();
      ctx.translate((a.R.x - F.x / k) * (1 - e), (a.R.y - F.y / k) * (1 - e));
      ctx.scale(si, si);
      ctx.globalAlpha = Math.min(1, Math.max(0, e * 1.6 - 0.35));
      this.desenharVista(ctx, a.predio, W, H, []);
      ctx.restore();
      if (p < 1) {
        this.desenhar();
        return;
      }
      this.anim = null;
      ctx.clearRect(0, 0, W, Hc);
    }
    const alvos: Alvo[] = [];
    this.desenharVista(ctx, v, W, H, alvos);
    this.alvos = alvos;
  }

  /** A altura útil do desenho: sem o pedaço que o cartão cobre. */
  private altura() {
    const c = this.canvas;
    const H = c.clientHeight || 170;
    if (this.cartao.classList.contains('hidden')) return H;
    const rc = c.getBoundingClientRect();
    const rk = this.cartao.getBoundingClientRect();
    if (!rc.height || !rk.height) return H;
    const k = H / rc.height;
    return Math.max(60, Math.min(H, (rk.top - rc.top) * k - 4));
  }

  private desenharVista(ctx: CanvasRenderingContext2D, v: Vista, W: number, H: number, alvos: Alvo[]) {
    ctx.imageSmoothingEnabled = false;
    if (v.tipo === 'terreno') {
      const s = this.cena(v.cena);
      if (s) this.desenharTerreno(ctx, s, W, H, alvos);
    } else {
      const p = this.predio(v.predio);
      if (p) this.desenharAndar(ctx, p, v.andar, W, H, alvos);
    }
  }

  private hm(s: SceneInfo) {
    let m = this.hms.get(s.heightmap);
    if (!m) this.hms.set(s.heightmap, (m = parseHeightmap(s.heightmap)));
    return m;
  }

  private encaixeDoTerreno(s: SceneInfo, W: number, H: number) {
    const raw = this.hm(s);
    const S = Math.min((W - PAD * 2) / raw.width, (H - PAD * 2) / raw.height);
    return { S, O: { x: Math.round((W - raw.width * S) / 2), y: Math.round((H - raw.height * S) / 2) }, raw };
  }

  private caixaDoPredio(terreno: number, p: LocalPredio): Caixa | null {
    const s = this.cena(terreno);
    if (!s || !p.marco) return null;
    const { S, O } = this.encaixeDoTerreno(s, this.canvas.clientWidth || 220, this.altura());
    return { x: O.x + p.marco.x * S, y: O.y + p.marco.y * S, w: p.marco.w * S, h: p.marco.h * S };
  }

  // ---------------------------------------------------------------- o terreno

  private desenharTerreno(ctx: CanvasRenderingContext2D, s: SceneInfo, W: number, H: number, alvos: Alvo[]) {
    const { S, O, raw } = this.encaixeDoTerreno(s, W, H);
    const l = this.locais!;
    const lt = l.terrenos.find((t) => t.cena === s.id);
    const cur = this.host.cenaAtual();
    const mw = raw.width * S;
    const mh = raw.height * S;
    // a pixel art do chão e de tudo o que está nele fica guardada (só muda quando o mapa muda)
    const sig = JSON.stringify([s.terreno?.length, s.marcos, s.simbolos?.length, s.heightmap.length]);
    let cam = this.camadas.get(s.id);
    if (!cam || cam.sig !== sig) {
      cam = { sig, c: pixelTerreno(s, raw) };
      this.camadas.set(s.id, cam);
    }
    moldura(ctx, O.x, O.y, mw, mh);
    ctx.drawImage(cam.c, O.x, O.y, mw, mh);
    // os prédios: o mouse em cima acende a borda; o do grupo fica vermelho, com a seta
    const ondeCur = cur !== undefined ? l.onde.get(cur) : undefined;
    const telhados: (Caixa & { id: string; nome: string; atual: boolean; gente: string[] })[] = [];
    for (const id of lt?.predios ?? []) {
      const p = this.predio(id);
      if (!p?.marco) continue;
      const m = p.marco;
      const x = Math.round(O.x + m.x * S);
      const y = Math.round(O.y + m.y * S);
      const w = Math.round(m.w * S);
      const hh = Math.round(m.h * S);
      alvos.push({ tipo: 'predio', id, nome: `${p.nome}: clique para ver dentro`, x, y, w, h: hh });
      const atual = ondeCur?.predio === id;
      if (atual) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,90,60,0.22)';
        ctx.fillRect(x, y, w, hh);
        ctx.shadowColor = HUD.aqui;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = HUD.aqui;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, w + 2, hh + 2);
        ctx.restore();
      }
      if (this.hover === `predio:${id}`) {
        ctx.fillStyle = 'rgba(200,230,255,0.16)';
        ctx.fillRect(x, y, w, hh);
        ctx.strokeStyle = HUD.texto;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, w + 2, hh + 2);
      }
      telhados.push({ id, nome: p.nome, x, y, w, h: hh, atual, gente: this.genteEm(p.cenas) });
    }
    // as plaquinhas: no telhado quando cabe; senão embaixo, em cima ou do lado, sem tampar outra
    const ocupado: Caixa[] = [];
    const bate = (a: Caixa, b: Caixa) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const t of telhados) {
      const m = medirPlaca(ctx, t.nome);
      const lugares = [
        ...(m.w <= t.w * 1.3 && m.h <= t.h * 1.2 ? [[t.x + t.w / 2, t.y + t.h / 2]] : []),
        [t.x + t.w / 2, t.y + t.h + m.h / 2 + 3],
        [t.x + t.w / 2, t.y - m.h / 2 - 3],
        [t.x + t.w + m.w / 2 + 3, t.y + t.h / 2],
        [t.x - m.w / 2 - 3, t.y + t.h / 2],
      ];
      const caixa = ([cx, cy]: number[]) => ({ x: Math.round(cx - m.w / 2), y: Math.round(cy - m.h / 2), w: m.w, h: m.h });
      const livre = lugares.find((lu) => {
        const c = caixa(lu);
        return c.x >= 0 && c.y >= 0 && c.x + c.w <= W && c.y + c.h <= H && !ocupado.some((o) => bate(c, o)) && !telhados.some((o) => o.id !== t.id && bate(c, o));
      });
      const c = caixa(livre ?? lugares[0]);
      ocupado.push(c);
      desenharPlaca(ctx, m, c, t.atual ? 'aqui' : this.hover === `predio:${t.id}` ? 'foco' : '');
      alvos.push({ tipo: 'predio', id: t.id, nome: `${t.nome}: clique para ver dentro`, ...c });
      if (t.gente.length) selo(ctx, t.gente, t.x + t.w - 2, t.y + 2);
      if (t.atual) seta(ctx, c.x + c.w / 2, c.y - 2);
    }
    // os nomes soltos do chão (plantações, lago, rio)
    for (const r of rotulosDoChao(s, raw)) textoSolto(ctx, r.txt, O.x + r.x * S, O.y + r.y * S);
    // as saídas para outro terreno (a porteira para os arredores)
    for (const sd of lt?.saidas ?? []) {
      const nome = l.terrenos.find((t) => t.cena === sd.para)?.nome ?? '';
      const esq = sd.x < raw.width / 2;
      const txt = esq ? `◄ ${nome}` : `${nome} ►`;
      const m = medirPlaca(ctx, txt);
      const x = Math.round(esq ? O.x + (sd.x + 0.5) * S + 4 : O.x + (sd.x + 0.5) * S - 4 - m.w);
      const y = O.y + (sd.y + 0.5) * S;
      // ao lado da passagem: em cima, embaixo ou no meio, onde não tampar uma plaquinha
      const lugares = [y - m.h - 4, y + 4, y - m.h / 2].map((yy) => ({ x, y: Math.round(yy), w: m.w, h: m.h }));
      const c = lugares.find((q) => !ocupado.some((o) => bate(q, o)) && !telhados.some((o) => bate(q, o))) ?? lugares[0];
      ocupado.push(c);
      desenharPlaca(ctx, m, c, this.hover === `saida:${sd.para}` ? 'foco' : 'saida');
      alvos.push({ tipo: 'saida', id: sd.para, nome: `Ver o mapa de ${nome}`, ...c });
    }
    // as peças ao ar livre
    for (const u of s.users) this.peca(ctx, u.id, O.x + (u.x + 0.5) * S, O.y + (u.y + 0.5) * S);
    rosa(ctx, O.x + mw - 14, O.y + 14);
    escala(ctx, S, O.x + 6, O.y + mh - 8);
    // o chão inteiro também é um alvo (o primeiro da lista: os prédios ganham dele)
    alvos.unshift({ tipo: 'cena', id: s.id, nome: lt?.nome ?? nomeCurto(s.name), x: O.x, y: O.y, w: mw, h: mh });
    if (this.sel?.id === s.id) {
      ctx.strokeStyle = HUD.texto;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.strokeRect(O.x - 4, O.y - 4, mw + 8, mh + 8);
      ctx.setLineDash([]);
    }
  }

  /** A peça: o quadradinho na cor do agente, com a borda escura. */
  private peca(ctx: CanvasRenderingContext2D, uid: number, x: number, y: number) {
    const cor = this.host.campanha()?.party.find((q) => q.id === uid)?.color ?? '#ffffff';
    const t = 6;
    const X = Math.round(x - t / 2);
    const Y = Math.round(y - t / 2);
    ctx.fillStyle = '#05070a';
    ctx.fillRect(X - 1, Y - 1, t + 2, t + 2);
    ctx.fillStyle = cor;
    ctx.fillRect(X, Y, t, t);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(X, Y, t - 1, 1);
    ctx.fillRect(X, Y, 1, t - 1);
  }

  // ---------------------------------------------------------------- o andar de um prédio

  /**
   * A planta do andar como o mapa de masmorra de um jogo antigo: o piso em ladrilhos escuros,
   * as paredes acesas (a de fora clara, a de dentro mais apagada), as portas em dourado, as
   * escadas (▲ ▼) que trocam o andar, o nome de cada cômodo, o do grupo em vermelho (acende
   * com a varredura quando o grupo entra) e as peças.
   */
  private desenharAndar(ctx: CanvasRenderingContext2D, p: LocalPredio, andar: string, W: number, H: number, alvos: Alvo[]) {
    const camp = this.host.campanha();
    const a = p.andares.find((x) => x.nome === andar);
    if (!camp || !a) return;
    const cur = this.host.cenaAtual();
    const parsed = a.cenas
      .map((id) => this.cena(id))
      .filter((s): s is SceneInfo => !!s)
      .map((s) => {
        const pos = camp.layout[s.id] ?? { x: 0, y: 0 };
        const raw = this.hm(s);
        const rot = (x: number, y: number) => rotatePt(raw, pos.r ?? 0, x, y);
        const porta = s.aberto ? null : rot(s.door.x, s.door.y);
        return { s, raw, hm: rotateHm(raw, pos.r ?? 0), p: pos, rot, porta };
      });
    if (!parsed.length) return;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const { hm, p: q } of parsed) {
      x0 = Math.min(x0, q.x);
      y0 = Math.min(y0, q.y);
      x1 = Math.max(x1, q.x + hm.width);
      y1 = Math.max(y1, q.y + hm.height);
    }
    const bw = Math.max(1, x1 - x0);
    const bh = Math.max(1, y1 - y0);
    // arrastando um cômodo, a escala fica parada (senão a planta foge do mouse)
    if (!this.drag) {
      const sozinho = parsed.length === 1;
      const teto = sozinho ? Math.min((W * 0.6) / bw, (H * 0.7) / bh) : Infinity;
      this.S = Math.max(1.5, Math.min(teto, (W - PAD * 2) / bw, (H - PAD * 2) / bh));
      this.O = { x: Math.round(PAD + (W - PAD * 2 - bw * this.S) / 2 - x0 * this.S), y: Math.round(PAD + (H - PAD * 2 - bh * this.S) / 2 - y0 * this.S) };
    }
    const S = this.S;
    const O = this.O;
    // de quem é cada casa do andar
    const dono = new Map<string, number>();
    for (const { s, hm, p: q, porta } of parsed)
      for (let y = 0; y < hm.height; y++)
        for (let x = 0; x < hm.width; x++) {
          if (hm.tiles[y]?.[x] === null || hm.tiles[y]?.[x] === undefined || (porta && x === porta[0] && y === porta[1])) continue;
          dono.set(`${q.x + x},${q.y + y}`, s.id);
        }
    // o estado de cada cômodo pinta o piso e a parede dele
    const estado = (id: number) => (id === cur ? 'aqui' : this.sel?.id === id ? 'sel' : this.hover === `cena:${id}` ? 'foco' : '');
    const PISO: Record<string, [number, number, number]> = {
      '': [cor('#26303b'), cor('#2a3540'), cor('#323e4b')],
      foco: [cor('#2f3b49'), cor('#33404f'), cor('#3c4a5a')],
      sel: [cor('#22405c'), cor('#264663'), cor('#2e5272')],
      aqui: [cor('#4a2226'), cor('#52262b'), cor('#5e2e33')],
    };
    const PAREDE: Record<string, [number, number]> = {
      '': [cor('#a9c6e4'), cor('#5d7186')],
      foco: [cor('#d6e8f8'), cor('#7d93a8')],
      sel: [cor('#8fd0ff'), cor('#6aa6d0')],
      aqui: [cor('#ff6a52'), cor('#d0503e')],
    };
    const PORTA = cor('#e0b45a');
    const px = new Pix(bw * P, bh * P);
    const escadas: { x: number; y: number; sobe: boolean; andar: string; rotulo: string }[] = [];
    const nomes: { txt: string; x: number; y: number; w: number; h: number; atual: boolean }[] = [];
    for (const { s, hm, p: q, rot } of parsed) {
      const est = estado(s.id);
      const [p1, p2, p3] = PISO[est];
      const [fora, dentro] = PAREDE[est];
      const meu = (x: number, y: number) => dono.get(`${q.x + x},${q.y + y}`) === s.id;
      // as portas da cena (na planta girada), e quais são escadas para outro andar
      const portas = new Map<string, number>();
      for (const pt of s.portals) {
        const [ppx, ppy] = rot(pt.x, pt.y);
        if (!meu(ppx, ppy)) continue;
        const outro = p.andares.find((x) => x.cenas.includes(pt.link));
        if (outro && outro.nome !== andar) {
          escadas.push({ x: q.x + ppx, y: q.y + ppy, sobe: outro.nivel > a.nivel, andar: outro.nome, rotulo: outro.rotulo });
          continue;
        }
        portas.set(`${ppx},${ppy}`, pt.link);
      }
      for (let y = 0; y < hm.height; y++)
        for (let x = 0; x < hm.width; x++) {
          if (!meu(x, y)) continue;
          const bx = (q.x + x - x0) * P;
          const by = (q.y + y - y0) * P;
          const base = (x + y) % 2 ? p1 : p2;
          for (let yy = 0; yy < P; yy++) for (let xx = 0; xx < P; xx++) px.put(bx + xx, by + yy, ruido(bx + xx, by + yy, 3) < 0.06 ? p3 : base);
          // a parede: clara por fora, apagada entre dois cômodos; a porta abre um vão dourado
          const lados: [number, number, (i: number) => [number, number]][] = [
            [x, y - 1, (i) => [bx + i, by]],
            [x, y + 1, (i) => [bx + i, by + P - 1]],
            [x - 1, y, (i) => [bx, by + i]],
            [x + 1, y, (i) => [bx + P - 1, by + i]],
          ];
          const ehPorta = portas.has(`${x},${y}`);
          for (const [nx, ny, ponto] of lados) {
            if (meu(nx, ny)) continue;
            const vizinho = dono.get(`${q.x + nx},${q.y + ny}`);
            const c = vizinho === undefined ? fora : dentro;
            for (let i = 0; i < P; i++) {
              const [X, Y] = ponto(i);
              px.put(X, Y, ehPorta && i > 0 && i < P - 1 ? PORTA : c);
            }
          }
        }
      nomes.push({ txt: nomeCurto(s.name), x: O.x + q.x * S, y: O.y + q.y * S, w: hm.width * S, h: hm.height * S, atual: s.id === cur });
    }
    const camada = px.canvas();
    ctx.save();
    ctx.shadowColor = 'rgba(143,176,210,0.35)';
    ctx.shadowBlur = 10;
    ctx.drawImage(camada, Math.round(O.x + x0 * S), Math.round(O.y + y0 * S), Math.round(bw * S), Math.round(bh * S));
    ctx.restore();
    // a varredura do cômodo onde o grupo acabou de entrar
    const atual = nomes.find((n) => n.atual);
    if (atual && this.hatch.room === cur && this.hatch.t < 1) {
      const t = this.hatch.t;
      ctx.save();
      ctx.beginPath();
      ctx.rect(atual.x, atual.y, atual.w, atual.h);
      ctx.clip();
      ctx.fillStyle = `rgba(255,106,82,${(0.35 * (1 - t)).toFixed(3)})`;
      ctx.fillRect(atual.x, atual.y, atual.w, atual.h);
      const yy = Math.round(atual.y + atual.h * t);
      ctx.fillStyle = 'rgba(255,190,170,0.9)';
      ctx.fillRect(atual.x, yy - 1, atual.w, 2);
      ctx.restore();
    }
    // os alvos (a forma de cada cômodo, casa por casa)
    for (const { s, hm, p: q } of parsed) {
      const forma = new Path2D();
      for (let y = 0; y < hm.height; y++)
        for (let x = 0; x < hm.width; x++) if (dono.get(`${q.x + x},${q.y + y}`) === s.id) forma.rect(O.x + (q.x + x) * S, O.y + (q.y + y) * S, S + 0.35, S + 0.35);
      alvos.push({ tipo: 'cena', id: s.id, nome: nomeCurto(s.name), x: O.x + q.x * S, y: O.y + q.y * S, w: hm.width * S, h: hm.height * S, forma });
    }
    // o nome de cada cômodo, quando cabe
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of nomes) {
      let f = 11;
      ctx.font = `500 ${f}px ${FONTE}`;
      let tw = ctx.measureText(n.txt).width;
      if (tw > n.w - 6) {
        f = Math.max(8, (f * (n.w - 6)) / tw);
        ctx.font = `500 ${f.toFixed(1)}px ${FONTE}`;
        tw = ctx.measureText(n.txt).width;
      }
      if (tw > n.w - 3 || f + 2 > n.h) continue;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(5,7,10,0.85)';
      ctx.strokeText(n.txt, Math.round(n.x + n.w / 2), Math.round(n.y + n.h / 2));
      ctx.fillStyle = n.atual ? '#ffb4a6' : HUD.texto;
      ctx.fillText(n.txt, Math.round(n.x + n.w / 2), Math.round(n.y + n.h / 2));
    }
    ctx.restore();
    // as escadas: ▲ sobe, ▼ desce (clicar troca o andar); ganham dos cômodos no clique
    for (const e of escadas) {
      const cx = Math.round(O.x + (e.x + 0.5) * S);
      const cy = Math.round(O.y + (e.y + 0.5) * S);
      const r = Math.max(4, Math.min(6, S * 0.8));
      const foco = this.hover === `andar:${e.andar}`;
      ctx.beginPath();
      if (e.sobe) (ctx.moveTo(cx, cy - r), ctx.lineTo(cx + r, cy + r * 0.75), ctx.lineTo(cx - r, cy + r * 0.75));
      else (ctx.moveTo(cx, cy + r), ctx.lineTo(cx + r, cy - r * 0.75), ctx.lineTo(cx - r, cy - r * 0.75));
      ctx.closePath();
      ctx.fillStyle = foco ? '#fff1c4' : HUD.ouro;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#05070a';
      ctx.stroke();
      const m = r + 3;
      alvos.push({ tipo: 'andar', id: e.andar, nome: `${e.sobe ? 'Subir' : 'Descer'} para ${e.rotulo}`, x: cx - m, y: cy - m, w: m * 2, h: m * 2 });
    }
    // as peças
    for (const { s, p: q, rot } of parsed)
      for (const u of s.users) {
        const [ux, uy] = rot(u.x, u.y);
        this.peca(ctx, u.id, O.x + (q.x + ux + 0.5) * S, O.y + (q.y + uy + 0.5) * S);
      }
  }
}

// ------------------------------------------------------------------ pixel art

/** Cor para o buffer de pixels (ABGR, como o ImageData guarda). */
function cor(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
}

/** Um quadro de pixels pequeno (a arte), ampliado depois sem suavizar. */
class Pix {
  readonly img: ImageData;
  readonly d: Uint32Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.img = new ImageData(Math.max(1, w), Math.max(1, h));
    this.d = new Uint32Array(this.img.data.buffer);
  }
  put(x: number, y: number, c: number) {
    x |= 0;
    y |= 0;
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  get(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0;
  }
  /** disco cheio: `pinta(dx, dy, d2)` diz a cor de cada pixel (0 = não pinta) */
  disco(cx: number, cy: number, r: number, pinta: (dx: number, dy: number, d2: number) => number) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > r * r + r * 0.6) continue;
        const c = pinta(dx, dy, d2);
        if (c) this.put(cx + dx, cy + dy, c);
      }
  }
  canvas() {
    const c = document.createElement('canvas');
    c.width = this.img.width;
    c.height = this.img.height;
    c.getContext('2d')!.putImageData(this.img, 0, 0);
    return c;
  }
}

const PAL = {
  grama: [cor('#40703a'), cor('#4f8244'), cor('#36602f')],
  sombra: cor('#2c4c28'),
  terra: [cor('#b08a55'), cor('#8a6a3e'), cor('#c8a066')],
  pedra: [cor('#9c988e'), cor('#88847a'), cor('#6a665e')],
  arada: [cor('#6e4a2c'), cor('#563a20')],
  agua: [cor('#2f5f8f'), cor('#5f94c4'), cor('#1d4166')],
  pier: [cor('#8a6440'), cor('#6a4a2c')],
  copa: [cor('#2f5c28'), cor('#3c6e30'), cor('#6aa04a'), cor('#16290f')],
  moita: [cor('#3f7a32'), cor('#4e8c3c'), cor('#7cb456'), cor('#1c3414')],
  cerca: [cor('#5a3a1c'), cor('#9a6a38')],
  milho: [cor('#78a83c'), cor('#d6c050')],
  pedraFonte: [cor('#a8a49a'), cor('#3e3a34'), cor('#5b8fc0'), cor('#cfe4f4')],
  feno: [cor('#d8b860'), cor('#f0d47a'), cor('#8a6a30')],
  madeira: [cor('#7a5232'), cor('#3a2414'), cor('#222018')],
  capacho: cor('#d6c09a'),
  borda: cor('#120c08'),
};

/** Telhado de quatro águas: [norte (claro), lados, sul (escuro), telhas, cumeeira]. */
const TELHADO: Record<string, string[]> = {
  casarao: ['#c0583a', '#a2452d', '#7a2e1c', '#8e3a24', '#e07a52'],
  celeiro: ['#a83c2a', '#8a3424', '#5e2016', '#702a1c', '#c85a40'],
  galpao: ['#9a7650', '#7a5a3e', '#56402a', '#664a32', '#b89064'],
  '': ['#8a867c', '#6e6a62', '#4e4a44', '#5e5a52', '#a8a49a'],
};

/** O terreno inteiro em pixel art: o chão casa por casa e o que está nele (P pixels por casa). */
function pixelTerreno(s: SceneInfo, raw: Heightmap): HTMLCanvasElement {
  const linhas = (s.terreno ?? '').replace(/\r/g, '').split('\n');
  const ch = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= raw.width || y >= raw.height) return '';
    const c = linhas[y]?.[x] ?? '.';
    return raw.tiles[y]?.[x] === null && c !== 'a' ? 'a' : c;
  };
  const caminho = (c: string) => c === 't' || c === 'd' || c === 'p' || c === 'm';
  const px = new Pix(raw.width * P, raw.height * P);
  for (let ty = 0; ty < raw.height; ty++)
    for (let tx = 0; tx < raw.width; tx++) {
      const c = ch(tx, ty);
      for (let yy = 0; yy < P; yy++)
        for (let xx = 0; xx < P; xx++) {
          const X = tx * P + xx;
          const Y = ty * P + yy;
          const n = ruido(X, Y);
          // a beira: o pixel da casa que encosta numa casa de outro tipo
          const beira = (ok: (v: string) => boolean) =>
            (xx === 0 && !ok(ch(tx - 1, ty))) || (xx === P - 1 && !ok(ch(tx + 1, ty))) || (yy === 0 && !ok(ch(tx, ty - 1))) || (yy === P - 1 && !ok(ch(tx, ty + 1)));
          let v: number;
          if (c === 'a') v = beira((q) => q === 'a' || q === 'm' || q === '') ? PAL.agua[2] : (X + Y * 3 + Math.floor(n * 2)) % 9 === 0 && yy % 2 === 0 ? PAL.agua[1] : PAL.agua[0];
          else if (c === 'm') v = yy % 2 ? PAL.pier[1] : PAL.pier[0];
          else if (c === 'l') v = yy % 2 ? PAL.arada[1] : PAL.arada[0];
          else if (c === 'p') v = beira(caminho) ? PAL.pedra[2] : ((X >> 1) + (Y >> 1)) % 2 ? PAL.pedra[0] : PAL.pedra[1];
          else if (c === 't' || c === 'd') v = beira(caminho) ? PAL.terra[1] : n < 0.07 ? PAL.terra[2] : PAL.terra[0];
          else v = n < 0.09 ? PAL.grama[1] : n > 0.9 ? PAL.grama[2] : PAL.grama[0];
          px.put(X, Y, v);
        }
    }
  const simb = s.simbolos ?? [];
  const de = (k: string) => simb.filter((q) => q[0] === k);
  // as plantações: fileiras de milho
  for (const [, x, y, w] of de('plantacao'))
    for (let i = 0; i < w * P; i++) {
      px.put(x * P + i, y * P + 1, (x * P + i) % 3 ? PAL.milho[0] : PAL.milho[1]);
      px.put(x * P + i, y * P + 2, PAL.milho[0]);
    }
  // a cerca: tracinho de casa em casa e os mourões
  const cerca = new Set(de('cerca').map(([, x, y]) => `${x},${y}`));
  for (const k of cerca) {
    const [x, y] = k.split(',').map(Number);
    const cx = x * P + (P >> 1);
    const cy = y * P + (P >> 1);
    if (cerca.has(`${x + 1},${y}`)) for (let i = 0; i <= P; i++) px.put(cx + i, cy, PAL.cerca[0]);
    if (cerca.has(`${x},${y + 1}`)) for (let i = 0; i <= P; i++) px.put(cx, cy + i, PAL.cerca[0]);
    if ((x + y) % 2 === 0) px.put(cx, cy, PAL.cerca[1]);
  }
  // o resto, pequeno: a fonte, o feno, a carroça, a porteira, as entradas
  for (const [k, x, y, w, hh] of simb) {
    const X = x * P;
    const Y = y * P;
    if (k === 'fonte') {
      const r = Math.max(2, Math.round((Math.min(w, hh) * P) / 2) - 1);
      const cx = X + Math.round((w * P) / 2);
      const cy = Y + Math.round((hh * P) / 2);
      const [pedra, borda, agua, brilho] = PAL.pedraFonte;
      px.disco(cx, cy, r, (dx, dy, d2) => (d2 > (r - 1) * (r - 1) ? borda : d2 > (r - 2) * (r - 2) ? pedra : dx === -1 && dy === -1 ? brilho : agua));
      px.put(cx, cy, pedra);
    } else if (k === 'feno' || k === 'sacas') {
      const [c1, c2, c3] = PAL.feno;
      for (let i = 0; i < 3; i++) (px.put(X + i, Y + 1, c2), px.put(X + i, Y + 2, c1), px.put(X + i, Y + 3, c3));
    } else if (k === 'carroca') {
      const [c1, c2, roda] = PAL.madeira;
      for (let yy = 1; yy < hh * P - 1; yy++) for (let xx = 1; xx < w * P - 1; xx++) px.put(X + xx, Y + yy, xx === 1 || yy === 1 || xx === w * P - 2 || yy === hh * P - 2 ? c2 : c1);
      for (const [a, b] of [[0, 2], [w * P - 1, 2], [0, hh * P - 3], [w * P - 1, hh * P - 3]]) (px.put(X + a, Y + b, roda), px.put(X + a, Y + b + 1, roda));
    } else if (k === 'porteira') {
      for (let i = 0; i < Math.max(w, hh) * P; i += 2) px.put(w >= hh ? X + i : X + 1, w >= hh ? Y + 1 : Y + i, PAL.cerca[1]);
    } else if (k === 'entrada') {
      for (let xx = 1; xx < P - 1; xx++) (px.put(X + xx, Y, PAL.capacho), px.put(X + xx, Y + 1, PAL.capacho));
    } else if (k === 'placa') {
      px.put(X + 1, Y + 1, PAL.cerca[1]);
      px.put(X + 2, Y + 1, PAL.cerca[1]);
    }
  }
  // as árvores e as moitas: copa redonda com sombra, de trás para a frente
  const copas = [...de('arvore').map((q) => [q, 1] as const), ...de('arbusto').map((q) => [q, 0] as const)].sort((a, b) => a[0][2] - b[0][2]);
  for (const [[, x, y], grande] of copas) {
    const r = grande ? (ruido(x, y, 5) < 0.4 ? 4 : 3) : 2;
    const cx = x * P + (P >> 1) + Math.round((ruido(x, y, 6) - 0.5) * 2);
    const cy = y * P + (P >> 1) + Math.round((ruido(x, y, 7) - 0.5) * 2);
    px.disco(cx + 1, cy + 2, r, () => PAL.sombra);
    const [base, meio, luz, borda] = grande ? PAL.copa : PAL.moita;
    px.disco(cx, cy, r, (dx, dy, d2) => (d2 > (r - 0.8) * (r - 0.8) ? borda : dx + dy < -r * 0.6 ? luz : ruido(cx + dx, cy + dy, 2) < 0.3 ? meio : base));
  }
  // os prédios: sombra, telhado de quatro águas com as telhas e a cumeeira
  for (const m of s.marcos ?? []) {
    const [norte, lado, sul, telha, cume] = (TELHADO[m.kind ?? ''] ?? TELHADO['']).map(cor);
    const x0 = m.x * P;
    const y0 = m.y * P;
    const W = m.w * P;
    const H = m.h * P;
    for (let yy = 2; yy < H + 2; yy++) for (let xx = 2; xx < W + 2; xx++) if (xx >= W || yy >= H) px.put(x0 + xx, y0 + yy, PAL.sombra);
    for (let yy = 0; yy < H; yy++)
      for (let xx = 0; xx < W; xx++) {
        const dT = yy;
        const dB = H - 1 - yy;
        const dL = xx;
        const dR = W - 1 - xx;
        const min = Math.min(dT, dB, dL, dR);
        let v: number;
        if (xx === 0 || yy === 0 || xx === W - 1 || yy === H - 1) v = PAL.borda;
        else if ((min === dT && (min === dL || min === dR)) || (min === dB && (min === dL || min === dR)) || (W >= H ? Math.abs(dT - dB) <= 0 && dL > dT && dR > dT : Math.abs(dL - dR) <= 0 && dT > dL && dB > dL)) v = cume;
        else if (min === dT) v = dT % 3 === 2 ? telha : norte;
        else if (min === dB) v = dB % 3 === 2 ? PAL.borda : sul;
        else v = (min === dL ? dL : dR) % 3 === 2 ? telha : lado;
        px.put(x0 + xx, y0 + yy, v);
      }
  }
  return px.canvas();
}

/** Os nomes que o chão forma sozinho: plantações (as roças juntas), lago e rio. */
function rotulosDoChao(s: SceneInfo, raw: Heightmap) {
  const linhas = (s.terreno ?? '').replace(/\r/g, '').split('\n');
  const ch = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= raw.width || y >= raw.height) return '';
    const c = linhas[y]?.[x] ?? '.';
    return raw.tiles[y]?.[x] === null && c !== 'a' ? 'a' : c;
  };
  const grupos = (sim: (x: number, y: number) => boolean, min: number, raio: number) => {
    const visto = new Set<string>();
    const out: { cx: number; cy: number; n: number; w: number; h: number }[] = [];
    for (let y = 0; y < raw.height; y++)
      for (let x = 0; x < raw.width; x++) {
        if (!sim(x, y) || visto.has(`${x},${y}`)) continue;
        const fila = [[x, y]];
        visto.add(`${x},${y}`);
        let sx = 0;
        let sy = 0;
        let n = 0;
        let ax = x;
        let bx = x;
        let ay = y;
        let by = y;
        while (fila.length) {
          const [a, b] = fila.pop()!;
          sx += a;
          sy += b;
          n++;
          ax = Math.min(ax, a);
          bx = Math.max(bx, a);
          ay = Math.min(ay, b);
          by = Math.max(by, b);
          for (let dy = -raio; dy <= raio; dy++)
            for (let dx = -raio; dx <= raio; dx++) {
              const k = `${a + dx},${b + dy}`;
              if (!visto.has(k) && sim(a + dx, b + dy)) (visto.add(k), fila.push([a + dx, b + dy]));
            }
        }
        if (n >= min) out.push({ cx: sx / n + 0.5, cy: sy / n + 0.5, n, w: bx - ax + 1, h: by - ay + 1 });
      }
    return out;
  };
  const cultivo = new Set((s.simbolos ?? []).filter((q) => q[0] === 'plantacao').map(([, x, y]) => `${x},${y}`));
  for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) if (ch(x, y) === 'l') cultivo.add(`${x},${y}`);
  const out: { txt: string; x: number; y: number }[] = [];
  for (const q of grupos((x, y) => cultivo.has(`${x},${y}`), 24, 4)) out.push({ txt: q.n > 120 ? 'Plantações' : 'Plantação', x: q.cx, y: q.cy });
  for (const q of grupos((x, y) => ch(x, y) === 'a' || ch(x, y) === 'm', 8, 2)) out.push({ txt: Math.max(q.w, q.h) >= Math.min(q.w, q.h) * 3 ? 'Rio' : 'Lago', x: q.cx, y: q.cy });
  return out;
}

// ------------------------------------------------------------------ peças do HUD

/** A moldura do mapa: a borda escura, o fio azul do HUD e o brilho. */
function moldura(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(143,176,210,0.45)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#05070a';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.restore();
  ctx.fillStyle = HUD.borda;
  ctx.fillRect(x - 2, y - 2, w + 4, 1);
  ctx.fillRect(x - 2, y + h + 1, w + 4, 1);
  ctx.fillRect(x - 2, y - 2, 1, h + 4);
  ctx.fillRect(x + w + 1, y - 2, 1, h + 4);
}

function medirPlaca(ctx: CanvasRenderingContext2D, nome: string) {
  ctx.save();
  ctx.font = `600 11px ${FONTE}`;
  const corte = nome.length > 13 && nome.includes(' ') ? (nome.lastIndexOf(' ', 13) > 0 ? nome.lastIndexOf(' ', 13) : nome.indexOf(' ')) : -1;
  const linhas = corte > 0 ? [nome.slice(0, corte), nome.slice(corte + 1)] : [nome];
  const tw = Math.max(...linhas.map((l) => ctx.measureText(l).width));
  ctx.restore();
  return { linhas, w: Math.ceil(tw) + 10, h: 12 * linhas.length + 5 };
}

/** A plaquinha do HUD: caixa escura, fio azul (vermelho no lugar do grupo, dourado na saída). */
function desenharPlaca(ctx: CanvasRenderingContext2D, m: { linhas: string[]; w: number; h: number }, c: Caixa, tom: '' | 'foco' | 'aqui' | 'saida') {
  const fio = tom === 'aqui' ? HUD.aqui : tom === 'foco' ? HUD.texto : tom === 'saida' ? HUD.ouro : HUD.borda;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(c.x + 2, c.y + 2, c.w, c.h);
  ctx.fillStyle = HUD.fundo;
  ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.fillStyle = fio;
  ctx.fillRect(c.x, c.y, c.w, 1);
  ctx.fillRect(c.x, c.y + c.h - 1, c.w, 1);
  ctx.fillRect(c.x, c.y, 1, c.h);
  ctx.fillRect(c.x + c.w - 1, c.y, 1, c.h);
  ctx.font = `600 11px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tom === 'aqui' ? '#ffcfc4' : tom === 'saida' ? HUD.ouro : HUD.texto;
  m.linhas.forEach((l, i) => ctx.fillText(l, c.x + c.w / 2, c.y + 3 + 6 + i * 12));
  ctx.restore();
}

/** Nome solto no chão (plantação, lago): letra clara com contorno escuro. */
function textoSolto(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number) {
  ctx.save();
  ctx.font = `500 10px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(5,7,10,0.8)';
  ctx.strokeText(txt, Math.round(x), Math.round(y));
  ctx.fillStyle = '#eef4f8';
  ctx.fillText(txt, Math.round(x), Math.round(y));
  ctx.restore();
}

/** O selo com os quadradinhos de quem está lá dentro. */
function selo(ctx: CanvasRenderingContext2D, cores: string[], direita: number, y: number) {
  const n = Math.min(4, cores.length);
  const t = 5;
  const w = n * (t + 2) + 4 + (cores.length > 4 ? 10 : 0);
  const x = Math.round(direita - w);
  ctx.save();
  ctx.fillStyle = HUD.fundo;
  ctx.fillRect(x, y, w, t + 6);
  ctx.fillStyle = HUD.borda;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + t + 5, w, 1);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cores[i];
    ctx.fillRect(x + 3 + i * (t + 2), y + 3, t, t);
  }
  if (cores.length > 4) {
    ctx.fillStyle = HUD.texto;
    ctx.font = `600 8px ${FONTE}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${cores.length - 4}`, x + w - 11, y + 3 + t / 2);
  }
  ctx.restore();
}

/** A seta vermelha em cima da plaquinha do lugar do grupo. */
function seta(ctx: CanvasRenderingContext2D, cx: number, base: number) {
  const x = Math.round(cx);
  ctx.save();
  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.moveTo(x - 6, base - 9);
  ctx.lineTo(x + 6, base - 9);
  ctx.lineTo(x, base + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = HUD.aqui;
  ctx.shadowColor = HUD.aqui;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(x - 4, base - 8);
  ctx.lineTo(x + 4, base - 8);
  ctx.lineTo(x, base - 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** O norte, no canto do mapa. */
function rosa(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const x = Math.round(cx - 9);
  const y = Math.round(cy - 10);
  ctx.save();
  ctx.fillStyle = HUD.fundo;
  ctx.fillRect(x, y, 18, 20);
  ctx.fillStyle = HUD.borda;
  ctx.fillRect(x, y, 18, 1);
  ctx.fillRect(x, y + 19, 18, 1);
  ctx.fillRect(x, y, 1, 20);
  ctx.fillRect(x + 17, y, 1, 20);
  ctx.fillStyle = HUD.aqui;
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 3);
  ctx.lineTo(x + 13, y + 9);
  ctx.lineTo(x + 5, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 9px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = HUD.texto;
  ctx.fillText('N', x + 9, y + 14);
  ctx.restore();
}

/** A régua em metros, no canto de baixo do mapa. */
function escala(ctx: CanvasRenderingContext2D, S: number, x: number, y: number) {
  const m = (60 / S) * M_CASA;
  const total = [5, 10, 20, 25, 50, 100, 200].find((v) => v >= m * 0.8) ?? 200;
  const w = Math.round((total / M_CASA) * S);
  const X = Math.round(x);
  const Y = Math.round(y);
  ctx.save();
  ctx.font = `500 9px ${FONTE}`;
  const rot = `${total} m`;
  const tw = Math.ceil(ctx.measureText(rot).width);
  ctx.fillStyle = HUD.fundo;
  ctx.fillRect(X - 3, Y - 8, w + tw + 12, 12);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#05070a' : HUD.fraco;
    ctx.fillRect(X + (i * w) / 4, Y - 3, w / 4, 3);
  }
  ctx.fillStyle = HUD.texto;
  ctx.textBaseline = 'middle';
  ctx.fillText(rot, X + w + 5, Y - 2);
  ctx.restore();
}

/** A caixa R ampliada até encher o painel, sem deformar. */
function encaixar(R: Caixa, W: number, H: number): Caixa {
  const k = Math.min((W - PAD * 2) / R.w, (H - PAD * 2) / R.h);
  return { x: (W - R.w * k) / 2, y: (H - R.h * k) / 2, w: R.w * k, h: R.h * k };
}

/** Planta girada em quartos de volta (r) no sentido horário, para encaixar o cômodo na planta. */
export function rotateHm(hm: Heightmap, r: number): Heightmap {
  const k = ((r % 4) + 4) % 4;
  if (!k) return hm;
  const W = k % 2 ? hm.height : hm.width;
  const H = k % 2 ? hm.width : hm.height;
  const tiles = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      const [ox, oy] = k === 1 ? [y, hm.height - 1 - x] : k === 2 ? [hm.width - 1 - x, hm.height - 1 - y] : [hm.width - 1 - y, x];
      return hm.tiles[oy]?.[ox] ?? null;
    }),
  );
  return { width: W, height: H, tiles };
}

/** Uma casa (x, y) do cômodo na planta girada. */
export function rotatePt(hm: Heightmap, r: number, x: number, y: number): [number, number] {
  const k = ((r % 4) + 4) % 4;
  if (k === 1) return [hm.height - 1 - y, x];
  if (k === 2) return [hm.width - 1 - x, hm.height - 1 - y];
  if (k === 3) return [y, hm.width - 1 - x];
  return [x, y];
}
