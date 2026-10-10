import { montarLocais, nomeCurto, parseHeightmap, type CampaignState, type Heightmap, type Locais, type LocalPredio, type SceneInfo } from '@crona/shared';
import { clear, h } from './dom';
import { janela } from './fichaModal';
import { existeArte, ic } from './icons';
import { pencilShade, reduced, wait } from './motion';
import { sfx } from './sfx';

/**
 * O minimapa da tela MAPA: a planta do lugar em níveis, Terreno › Prédio › Andar › Cômodo.
 *
 * - No terreno (a cena ao ar livre), o mapa desenhado à mão: o chão, as árvores, a cerca, as
 *   plantações, os prédios com o telhado e a plaquinha, as saídas e as peças.
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

const TINTA = '#1d1a17';
const FONTE_PLACA = '11px "Special Elite", "Courier Prime", monospace';
const PAD = 8;
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
  private camadas = new Map<number, { sig: string; c: HTMLCanvasElement }>();
  private granito: CanvasPattern | null = null;
  private alfineteImg: HTMLImageElement | null = null;

  constructor(private host: MinimapaHost) {
    this.ligar();
    void existeArte('/arte/interface/alfinete.png').then((ok) => {
      if (!ok) return;
      const im = new Image();
      im.onload = () => ((this.alfineteImg = im), this.desenhar());
      im.src = '/arte/interface/alfinete.png';
    });
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
    sfx.paper();
    this.mostrar({ tipo: 'terreno', cena: p.terreno });
  }

  private descer(p: LocalPredio) {
    sfx.paper();
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

  /** A cena aberta mudou: o lápis pinta o cômodo novo (como antes, na planta). */
  animarAtual(delay: number) {
    const room = this.host.cenaAtual() ?? -1;
    this.fade = { room: this.hatch.room, t: 0 };
    this.hatch = { room, t: 0 };
    const run = async () => {
      if (delay) await wait(delay);
      // espera o minimapa se desenhar no nível novo (os alvos são do último quadro)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (this.hatch.room !== room) return;
      // ao ar livre não tem cômodo para pintar
      const r = this.vista?.tipo === 'predio' ? this.alvos.find((x) => x.tipo === 'cena' && x.id === room) : undefined;
      if (!r) {
        this.hatch.t = 1;
        this.fade = { room: -1, t: 1 };
        return this.desenhar();
      }
      const lines = hatchLines(r);
      const cr = this.canvas.getBoundingClientRect();
      const k = cr.width / (this.canvas.clientWidth || 1);
      const pts: { x: number; y: number }[] = [];
      lines.forEach(([x0, y0, x1, y1], i) => {
        const a = { x: cr.left + x0 * k, y: cr.top + y0 * k };
        const b = { x: cr.left + x1 * k, y: cr.top + y1 * k };
        if (i % 2) pts.push(b, a);
        else pts.push(a, b);
      });
      await pencilShade(pts, 950, (t) => {
        if (this.hatch.room !== room) return;
        this.hatch.t = t;
        this.fade.t = Math.min(1, t * 1.6);
        this.desenhar();
      });
      this.hatch.t = 1;
      this.fade = { room: -1, t: 1 };
      this.desenhar();
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
        sfx.paper();
        this.mostrar({ tipo: 'predio', predio: this.vista.predio, andar: a.id as string }, false);
        return;
      }
      if (a.tipo === 'saida') {
        sfx.paper();
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
    sfx.paper();
    const cur = this.host.cenaAtual();
    const ondeCur = cur !== undefined ? l.onde.get(cur) : undefined;
    if (ondeCur?.predio) (this.abertos.add(ondeCur.predio), this.abertos.add(`${ondeCur.predio}/${ondeCur.andar}`));
    const j = janela(camp.title ? camp.title.toUpperCase() : 'LUGARES', 'camadas', () => {}, 52);
    const lista = h('div', { class: 'mm-lugares' });
    j.corpo.append(lista);
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
        sfx.paper();
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
    ctx.clearRect(0, 0, W, c.clientHeight || H);
    const v = this.vista;
    if (!v || !this.locais) return;
    const a = this.anim;
    if (a) {
      const p = Math.min(1, (performance.now() - a.t0) / a.dur);
      const ease = 1 - (1 - p) ** 3;
      const e = a.dir > 0 ? ease : 1 - ease;
      // o prédio no terreno cresce até encher o papel, e a planta dele nasce do telhado
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
    return { S, O: { x: (W - raw.width * S) / 2, y: (H - raw.height * S) / 2 }, raw };
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
    // o que não muda (o chão, as árvores, os prédios) fica guardado numa camada
    const dpr = Math.min(2, devicePixelRatio || 1);
    const sig = JSON.stringify([W, H, dpr, s.terreno?.length, s.marcos, s.simbolos?.length, s.heightmap.length]);
    let cam = this.camadas.get(s.id);
    if (!cam || cam.sig !== sig) {
      const c = document.createElement('canvas');
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      const g = c.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.chao(g, s, raw, S, O);
      cam = { sig, c };
      this.camadas.set(s.id, cam);
    }
    ctx.drawImage(cam.c, 0, 0, W, H);
    // os prédios: o mouse em cima clareia; o do grupo fica vermelho com o alfinete
    const ondeCur = cur !== undefined ? l.onde.get(cur) : undefined;
    const telhados: (Caixa & { id: string; nome: string; atual: boolean; gente: string[] })[] = [];
    for (const id of lt?.predios ?? []) {
      const p = this.predio(id);
      if (!p?.marco) continue;
      const m = p.marco;
      const x = O.x + m.x * S;
      const y = O.y + m.y * S;
      const w = m.w * S;
      const hh = m.h * S;
      const forma = new Path2D();
      forma.rect(x, y, w, hh);
      alvos.push({ tipo: 'predio', id, nome: `${p.nome} — clique para ver dentro`, x, y, w, h: hh });
      const atual = ondeCur?.predio === id;
      if (atual) {
        ctx.save();
        ctx.shadowColor = 'rgba(220,40,28,0.9)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#c4281c';
        ctx.lineWidth = 2.2;
        ctx.stroke(forma);
        ctx.restore();
        ctx.fillStyle = 'rgba(196,40,28,0.28)';
        ctx.fill(forma);
      }
      if (this.hover === `predio:${id}`) {
        ctx.fillStyle = 'rgba(255,246,228,0.28)';
        ctx.fill(forma);
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = 1.6;
        ctx.stroke(forma);
      }
      telhados.push({ id, nome: p.nome, x, y, w, h: hh, atual, gente: this.genteEm(p.cenas) });
    }
    // as plaquinhas: no telhado quando cabe; senão embaixo, em cima ou do lado, sem tampar outra
    const ocupado: Caixa[] = [];
    const bate = (a: Caixa, b: Caixa) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const t of telhados) {
      const m = this.medirPlaca(ctx, t.nome);
      const lugares = [
        ...(m.w <= t.w * 1.3 && m.h <= t.h * 1.2 ? [[t.x + t.w / 2, t.y + t.h / 2]] : []),
        [t.x + t.w / 2, t.y + t.h + m.h / 2 + 3],
        [t.x + t.w / 2, t.y - m.h / 2 - 3],
        [t.x + t.w + m.w / 2 + 3, t.y + t.h / 2],
        [t.x - m.w / 2 - 3, t.y + t.h / 2],
      ];
      const caixa = ([cx, cy]: number[]) => ({ x: cx - m.w / 2, y: cy - m.h / 2, w: m.w, h: m.h });
      const livre = lugares.find((l) => {
        const c = caixa(l);
        return c.x >= 0 && c.y >= 0 && c.x + c.w <= W && c.y + c.h <= H && !ocupado.some((o) => bate(c, o)) && !telhados.some((o) => o.id !== t.id && bate(c, o));
      });
      const [cx, cy] = livre ?? lugares[0];
      const c = caixa([cx, cy]);
      ocupado.push(c);
      this.desenharPlaca(ctx, m, cx, cy, t.atual);
      alvos.push({ tipo: 'predio', id: t.id, nome: `${t.nome} — clique para ver dentro`, ...c });
      // quem está lá dentro: as bolinhas num selo no canto do telhado
      if (t.gente.length) this.selo(ctx, t.gente, t.x + t.w - 2, t.y + 2);
      // o alfinete espetado na plaquinha
      if (t.atual) this.alfinete(ctx, cx, c.y - 6, 4.2);
    }
    // as saídas para outro terreno (a porteira para os arredores)
    for (const sd of lt?.saidas ?? []) {
      const nome = l.terrenos.find((t) => t.cena === sd.para)?.nome ?? '';
      const x = O.x + (sd.x + 0.5) * S;
      const y = O.y + (sd.y + 0.5) * S;
      const esq = sd.x < raw.width / 2;
      ctx.save();
      ctx.font = '700 11px Caveat, cursive';
      ctx.textBaseline = 'middle';
      ctx.textAlign = esq ? 'left' : 'right';
      const txt = esq ? `← ${nome}` : `${nome} →`;
      const tw = ctx.measureText(txt).width;
      const tx = esq ? x + 4 : x - 4;
      const ty = y - 9;
      const ativa = this.hover === `saida:${sd.para}`;
      ctx.fillStyle = 'rgba(239,230,209,0.85)';
      ctx.fillRect(esq ? tx - 2 : tx - tw - 2, ty - 7, tw + 4, 13);
      ctx.fillStyle = ativa ? '#c4281c' : '#7a1a12';
      ctx.fillText(txt, tx, ty);
      ctx.restore();
      alvos.push({ tipo: 'saida', id: sd.para, nome: `Ir para o mapa de ${nome}`, x: esq ? tx - 2 : tx - tw - 2, y: ty - 8, w: tw + 4, h: 16 });
    }
    // as peças ao ar livre
    for (const u of s.users) this.peca(ctx, u.id, O.x + (u.x + 0.5) * S, O.y + (u.y + 0.5) * S, Math.max(2.4, Math.min(4, S * 0.6)));
    this.rosa(ctx, W - 20, 22);
    this.escala(ctx, S, PAD + 4, H - PAD - 4);
    // o chão inteiro também é um alvo (o último da lista de baixo: os prédios ganham dele)
    alvos.unshift({ tipo: 'cena', id: s.id, nome: lt?.nome ?? nomeCurto(s.name), x: O.x, y: O.y, w: raw.width * S, h: raw.height * S });
    if (this.sel?.id === s.id) {
      ctx.strokeStyle = 'rgba(29,26,23,0.85)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.4;
      ctx.strokeRect(O.x - 2, O.y - 2, raw.width * S + 4, raw.height * S + 4);
      ctx.setLineDash([]);
    }
  }

  /** O chão do terreno e tudo o que está nele, desenhado à mão (fica na camada guardada). */
  private chao(g: CanvasRenderingContext2D, s: SceneInfo, raw: Heightmap, S: number, O: { x: number; y: number }) {
    const linhas = (s.terreno ?? '').replace(/\r/g, '').split('\n');
    const ch = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= raw.width || y >= raw.height) return '';
      const c = linhas[y]?.[x] ?? '.';
      return raw.tiles[y]?.[x] === null && c !== 'a' ? 'a' : c;
    };
    const COR: Record<string, string> = { '.': '#a6aa74', g: '#a6aa74', t: '#d8c49a', l: '#a98563', p: '#cdc5b3', d: '#b99b70', m: '#9a7350', a: '#86a8b2' };
    // o chão: uma casa = um ponto, ampliado com suavidade (vira mancha de aquarela)
    const mini = document.createElement('canvas');
    mini.width = raw.width;
    mini.height = raw.height;
    const mg = mini.getContext('2d')!;
    for (let y = 0; y < raw.height; y++)
      for (let x = 0; x < raw.width; x++) {
        mg.fillStyle = COR[ch(x, y)] ?? COR['.'];
        mg.fillRect(x, y, 1, 1);
      }
    g.save();
    g.beginPath();
    g.rect(O.x, O.y, raw.width * S, raw.height * S);
    g.clip();
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(mini, O.x, O.y, raw.width * S, raw.height * S);
    // textura: pontinhos na grama, sulcos na terra arada, marolas na água
    for (let y = 0; y < raw.height; y++)
      for (let x = 0; x < raw.width; x++) {
        const c = ch(x, y);
        const X = O.x + x * S;
        const Y = O.y + y * S;
        if (c === '.' || c === 'g') {
          if (ruido(x, y) < 0.5) {
            g.fillStyle = ruido(x, y, 1) < 0.5 ? 'rgba(60,74,34,0.28)' : 'rgba(236,232,196,0.3)';
            g.fillRect(X + ruido(x, y, 2) * S, Y + ruido(x, y, 3) * S, 1, 1);
          }
        } else if (c === 'l') {
          g.strokeStyle = 'rgba(74,48,28,0.35)';
          g.lineWidth = 0.6;
          g.beginPath();
          g.moveTo(X, Y + S * 0.3);
          g.lineTo(X + S, Y + S * 0.3);
          g.moveTo(X, Y + S * 0.75);
          g.lineTo(X + S, Y + S * 0.75);
          g.stroke();
        } else if (c === 'a' && ruido(x, y, 4) < 0.22) {
          g.strokeStyle = 'rgba(236,244,244,0.55)';
          g.lineWidth = 0.7;
          g.beginPath();
          g.moveTo(X, Y + S * 0.5);
          g.quadraticCurveTo(X + S * 0.5, Y + S * 0.2, X + S, Y + S * 0.5);
          g.stroke();
        }
      }
    // a margem da água e da estrada a nanquim
    const borda = (alvo: (c: string) => boolean, cor: string, lw: number) => {
      g.strokeStyle = cor;
      g.lineWidth = lw;
      g.lineCap = 'round';
      g.beginPath();
      for (let y = 0; y < raw.height; y++)
        for (let x = 0; x < raw.width; x++) {
          if (!alvo(ch(x, y))) continue;
          const X = O.x + x * S;
          const Y = O.y + y * S;
          const t = (a: number, b: number) => (ruido(a, b, 9) - 0.5) * S * 0.25;
          if (!alvo(ch(x, y - 1)) && ch(x, y - 1)) (g.moveTo(X + t(x, y), Y + t(y, x)), g.lineTo(X + S + t(x + 1, y), Y + t(y, x + 1)));
          if (!alvo(ch(x, y + 1)) && ch(x, y + 1)) (g.moveTo(X + t(x, y + 1), Y + S + t(y + 1, x)), g.lineTo(X + S + t(x + 1, y + 1), Y + S + t(y + 1, x + 1)));
          if (!alvo(ch(x - 1, y)) && ch(x - 1, y)) (g.moveTo(X + t(x, y), Y + t(y, x)), g.lineTo(X + t(x, y + 1), Y + S + t(y + 1, x)));
          if (!alvo(ch(x + 1, y)) && ch(x + 1, y)) (g.moveTo(X + S + t(x + 1, y), Y + t(y, x + 1)), g.lineTo(X + S + t(x + 1, y + 1), Y + S + t(y + 1, x + 1)));
        }
      g.stroke();
    };
    borda((c) => c === 'a', 'rgba(38,70,82,0.75)', 0.9);
    borda((c) => c === 't' || c === 'p', 'rgba(92,70,44,0.35)', 0.6);
    // o que está no chão
    const simb = s.simbolos ?? [];
    const de = (k: string) => simb.filter((q) => q[0] === k);
    // as plantações: fileiras verdes
    for (const [, x, y, w, hh] of de('plantacao')) {
      const X = O.x + x * S;
      const Y = O.y + y * S;
      g.strokeStyle = 'rgba(62,92,34,0.8)';
      g.lineWidth = Math.max(0.8, S * 0.32);
      g.beginPath();
      g.moveTo(X, Y + (hh * S) / 2);
      g.lineTo(X + w * S, Y + (hh * S) / 2);
      g.stroke();
      g.fillStyle = 'rgba(196,176,74,0.7)';
      g.fillRect(X + S * 0.3, Y + (hh * S) / 2 - 0.6, 1, 1.2);
    }
    // os rótulos soltos (plantação, lago), pelos grupos que o chão forma
    const grupos = (sim: (x: number, y: number) => boolean, min: number, raio = 2) => {
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
          let x0 = x;
          let x1 = x;
          let y0 = y;
          let y1 = y;
          while (fila.length) {
            const [a, b] = fila.pop()!;
            sx += a;
            sy += b;
            n++;
            x0 = Math.min(x0, a);
            x1 = Math.max(x1, a);
            y0 = Math.min(y0, b);
            y1 = Math.max(y1, b);
            for (let dy = -raio; dy <= raio; dy++)
              for (let dx = -raio; dx <= raio; dx++) {
                const k = `${a + dx},${b + dy}`;
                if (!visto.has(k) && sim(a + dx, b + dy)) (visto.add(k), fila.push([a + dx, b + dy]));
              }
          }
          if (n >= min) out.push({ cx: sx / n + 0.5, cy: sy / n + 0.5, n, w: x1 - x0 + 1, h: y1 - y0 + 1 });
        }
      return out;
    };
    const cultivo = new Set(de('plantacao').map(([, x, y]) => `${x},${y}`));
    for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) if (ch(x, y) === 'l') cultivo.add(`${x},${y}`);
    const rotulos: { txt: string; x: number; y: number }[] = [];
    for (const q of grupos((x, y) => cultivo.has(`${x},${y}`), 24, 4)) rotulos.push({ txt: q.n > 120 ? 'Plantações' : 'Plantação', x: q.cx, y: q.cy });
    for (const q of grupos((x, y) => ch(x, y) === 'a' || ch(x, y) === 'm', 8)) rotulos.push({ txt: Math.max(q.w, q.h) >= Math.min(q.w, q.h) * 3 ? 'Rio' : 'Lago', x: q.cx, y: q.cy });
    // a cerca: tracinho de casa em casa, com os mourões
    const cerca = new Set(de('cerca').map(([, x, y]) => `${x},${y}`));
    g.strokeStyle = 'rgba(64,44,28,0.85)';
    g.lineWidth = Math.max(0.7, S * 0.16);
    g.beginPath();
    for (const k of cerca) {
      const [x, y] = k.split(',').map(Number);
      const X = O.x + (x + 0.5) * S;
      const Y = O.y + (y + 0.5) * S;
      if (cerca.has(`${x + 1},${y}`)) (g.moveTo(X, Y), g.lineTo(X + S, Y));
      if (cerca.has(`${x},${y + 1}`)) (g.moveTo(X, Y), g.lineTo(X, Y + S));
    }
    g.stroke();
    g.fillStyle = 'rgba(52,36,22,0.9)';
    for (const k of cerca) {
      const [x, y] = k.split(',').map(Number);
      if ((x + y) % 3) continue;
      g.fillRect(O.x + (x + 0.5) * S - 0.8, O.y + (y + 0.5) * S - 0.8, 1.6, 1.6);
    }
    // o resto, pequeno: a fonte, o feno, a carroça, a porteira, as entradas
    for (const [k, x, y, w, hh] of simb) {
      const X = O.x + x * S;
      const Y = O.y + y * S;
      const cx = X + (w * S) / 2;
      const cy = Y + (hh * S) / 2;
      if (k === 'fonte') {
        const r = (Math.min(w, hh) * S) / 2;
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.fillStyle = '#c8c0ae';
        g.fill();
        g.strokeStyle = TINTA;
        g.lineWidth = 0.9;
        g.stroke();
        g.beginPath();
        g.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
        g.fillStyle = '#7fa6b2';
        g.fill();
        g.beginPath();
        g.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
        g.fillStyle = '#9a9282';
        g.fill();
      } else if (k === 'feno' || k === 'sacas') {
        g.fillStyle = k === 'feno' ? '#d2b45e' : '#d8ccaa';
        g.strokeStyle = 'rgba(80,60,30,0.8)';
        g.lineWidth = 0.6;
        g.fillRect(X + S * 0.15, Y + S * 0.2, S * 0.7, S * 0.6);
        g.strokeRect(X + S * 0.15, Y + S * 0.2, S * 0.7, S * 0.6);
      } else if (k === 'carroca') {
        g.fillStyle = '#7a5a3a';
        g.strokeStyle = TINTA;
        g.lineWidth = 0.8;
        g.fillRect(X + S * 0.2, Y + S * 0.2, w * S - S * 0.4, hh * S - S * 0.4);
        g.strokeRect(X + S * 0.2, Y + S * 0.2, w * S - S * 0.4, hh * S - S * 0.4);
      } else if (k === 'porteira') {
        g.strokeStyle = '#5a3c22';
        g.lineWidth = 1.2;
        g.setLineDash([1.5, 1.2]);
        g.strokeRect(X + 0.5, Y + 0.5, w * S - 1, hh * S - 1);
        g.setLineDash([]);
      } else if (k === 'entrada') {
        g.fillStyle = 'rgba(236,224,196,0.9)';
        g.fillRect(X + S * 0.1, Y, S * 0.8, S * 0.7);
      } else if (k === 'placa') {
        g.fillStyle = '#6a4a2c';
        g.fillRect(cx - 1.5, cy - 1, 3, 2);
      }
    }
    // as árvores e os arbustos: copa redonda recortada, com a sombra, de trás para a frente
    const copas = [...de('arvore').map((q) => [q, 1] as const), ...de('arbusto').map((q) => [q, 0] as const)].sort((a, b) => a[0][2] - b[0][2]);
    for (const [[, x, y], grande] of copas) {
      const r = S * (grande ? 0.95 + ruido(x, y, 5) * 0.35 : 0.55);
      const cx = O.x + (x + 0.5 + (ruido(x, y, 6) - 0.5) * 0.4) * S;
      const cy = O.y + (y + 0.5 + (ruido(x, y, 7) - 0.5) * 0.4) * S;
      g.beginPath();
      g.ellipse(cx + r * 0.3, cy + r * 0.4, r, r * 0.8, 0, 0, Math.PI * 2);
      g.fillStyle = 'rgba(28,36,18,0.28)';
      g.fill();
      const copa = new Path2D();
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (0.86 + ruido(x + i, y, 8) * 0.14);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (!i) copa.moveTo(px, py);
        else {
          const am = ((i - 0.5) / n) * Math.PI * 2;
          copa.quadraticCurveTo(cx + Math.cos(am) * rr * 1.18, cy + Math.sin(am) * rr * 1.18, px, py);
        }
      }
      const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
      gr.addColorStop(0, grande ? '#7d9a52' : '#8aa45a');
      gr.addColorStop(1, grande ? '#3f5c2c' : '#557a36');
      g.fillStyle = gr;
      g.fill(copa);
      g.strokeStyle = 'rgba(26,34,18,0.85)';
      g.lineWidth = 0.7;
      g.stroke(copa);
    }
    // os prédios: sombra, telhado de quatro águas, a cumeeira e as telhas
    for (const m of s.marcos ?? []) this.telhado(g, m, S, O);
    g.restore();
    // a borda do terreno, a nanquim
    g.strokeStyle = TINTA;
    g.lineWidth = 1.4;
    g.strokeRect(O.x, O.y, raw.width * S, raw.height * S);
    // os nomes soltos, à mão
    g.save();
    g.font = '600 12px Caveat, cursive';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const r of rotulos) {
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(239,232,212,0.75)';
      g.strokeText(r.txt, O.x + r.x * S, O.y + r.y * S);
      g.fillStyle = 'rgba(42,34,26,0.9)';
      g.fillText(r.txt, O.x + r.x * S, O.y + r.y * S);
    }
    g.restore();
  }

  private telhado(g: CanvasRenderingContext2D, m: NonNullable<SceneInfo['marcos']>[number], S: number, O: { x: number; y: number }) {
    const x = O.x + m.x * S;
    const y = O.y + m.y * S;
    const w = m.w * S;
    const hh = m.h * S;
    const COR: Record<string, [string, string]> = { casarao: ['#a2452d', '#7a2e1c'], celeiro: ['#8a3424', '#5e2016'], galpao: ['#7a5a3e', '#56402a'] };
    const [claro, escuro] = COR[m.kind ?? ''] ?? ['#7a746a', '#55504a'];
    g.fillStyle = 'rgba(30,22,14,0.35)';
    g.fillRect(x + S * 0.6, y + S * 0.8, w, hh);
    // a cumeeira corre no lado comprido
    const deitado = w >= hh;
    const meio = (deitado ? hh : w) / 2;
    const [a, b] = deitado ? [[x + meio, y + hh / 2], [x + w - meio, y + hh / 2]] : [[x + w / 2, y + meio], [x + w / 2, y + hh - meio]];
    const face = (pts: number[][], cor: string) => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.closePath();
      g.fillStyle = cor;
      g.fill();
    };
    const c00 = [x, y];
    const c10 = [x + w, y];
    const c11 = [x + w, y + hh];
    const c01 = [x, y + hh];
    if (deitado) {
      face([c00, c10, b, a], claro);
      face([c01, c11, b, a], escuro);
      face([c00, a, c01], mistura(claro, escuro));
      face([c10, b, c11], escuro);
    } else {
      face([c00, c01, b, a], claro);
      face([c10, c11, b, a], escuro);
      face([c00, a, c10], mistura(claro, escuro));
      face([c01, b, c11], escuro);
    }
    // as telhas: riscos paralelos à beira, bem leves
    g.save();
    g.beginPath();
    g.rect(x, y, w, hh);
    g.clip();
    g.strokeStyle = 'rgba(30,14,8,0.22)';
    g.lineWidth = 0.6;
    g.beginPath();
    const passo = Math.max(2, S * 0.55);
    if (deitado) for (let yy = y + passo; yy < y + hh; yy += passo) (g.moveTo(x, yy), g.lineTo(x + w, yy));
    else for (let xx = x + passo; xx < x + w; xx += passo) (g.moveTo(xx, y), g.lineTo(xx, y + hh));
    g.stroke();
    g.restore();
    g.strokeStyle = TINTA;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(c00[0], c00[1]);
    g.lineTo(a[0], a[1]);
    g.lineTo(c01[0], c01[1]);
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.moveTo(c10[0], c10[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(c11[0], c11[1]);
    g.stroke();
    g.lineWidth = 1.5;
    g.strokeRect(x, y, w, hh);
  }

  /** O tamanho da plaquinha (o nome comprido quebra em duas linhas). */
  private medirPlaca(ctx: CanvasRenderingContext2D, nome: string) {
    ctx.save();
    ctx.font = FONTE_PLACA;
    const corte = nome.length > 12 && nome.includes(' ') ? (nome.lastIndexOf(' ', 12) > 0 ? nome.lastIndexOf(' ', 12) : nome.indexOf(' ')) : -1;
    const linhas = corte > 0 ? [nome.slice(0, corte), nome.slice(corte + 1)] : [nome];
    const tw = Math.max(...linhas.map((l) => ctx.measureText(l).width));
    ctx.restore();
    return { linhas, w: tw + 10, h: 11 * linhas.length + 5 };
  }

  /** A plaquinha de papel com o nome do prédio. */
  private desenharPlaca(ctx: CanvasRenderingContext2D, m: { linhas: string[]; w: number; h: number }, cx: number, cy: number, atual: boolean) {
    const lh = 11;
    const { w, h: hh, linhas } = m;
    ctx.save();
    ctx.font = FONTE_PLACA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(cx, cy);
    ctx.rotate(-0.015);
    ctx.fillStyle = 'rgba(28,20,12,0.35)';
    ctx.fillRect(-w / 2 + 1.5, -hh / 2 + 2, w, hh);
    ctx.fillStyle = atual ? '#f6e6d6' : '#efe4cc';
    ctx.fillRect(-w / 2, -hh / 2, w, hh);
    ctx.strokeStyle = atual ? '#b3261e' : '#3a2c20';
    ctx.lineWidth = atual ? 1.2 : 0.8;
    ctx.strokeRect(-w / 2, -hh / 2, w, hh);
    ctx.fillStyle = atual ? '#9c1f17' : '#231c16';
    linhas.forEach((l, i) => ctx.fillText(l, 0, -((linhas.length - 1) * lh) / 2 + i * lh + 0.5));
    ctx.restore();
  }

  /** O selo com as bolinhas de quem está lá dentro. */
  private selo(ctx: CanvasRenderingContext2D, cores: string[], dx: number, y: number) {
    const n = Math.min(4, cores.length);
    const r = 3.2;
    const w = n * (r * 2 + 1.5) + 4 + (cores.length > 4 ? 9 : 0);
    const x = dx - w;
    ctx.save();
    ctx.fillStyle = 'rgba(24,20,16,0.82)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, r * 2 + 4, r + 2);
    ctx.fill();
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(x + 2 + r + i * (r * 2 + 1.5), y + 2 + r, r, 0, Math.PI * 2);
      ctx.fillStyle = cores[i];
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#f6efe2';
      ctx.stroke();
    }
    if (cores.length > 4) {
      ctx.fillStyle = '#f6efe2';
      ctx.font = '700 8px "Courier Prime", monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${cores.length - 4}`, x + w - 10, y + 2 + r);
    }
    ctx.restore();
  }

  private peca(ctx: CanvasRenderingContext2D, uid: number, x: number, y: number, r: number) {
    const pm = this.host.campanha()?.party.find((q) => q.id === uid);
    ctx.beginPath();
    ctx.arc(x + 0.6, y + 0.9, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = pm?.color ?? '#fff';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#f6efe2';
    ctx.stroke();
  }

  /** A rosa dos ventos a nanquim. */
  private rosa(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const r = 9;
    ctx.save();
    ctx.fillStyle = 'rgba(239,230,209,0.82)';
    ctx.beginPath();
    ctx.arc(cx, cy - 1, r + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    const ponta = (ang: number, cheia: boolean) => {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      ctx.beginPath();
      ctx.moveTo(cx + c * r, cy + s * r);
      ctx.lineTo(cx - s * 2.2, cy + c * 2.2);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = cheia ? TINTA : '#efe6d1';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + c * r, cy + s * r);
      ctx.lineTo(cx + s * 2.2, cy - c * 2.2);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = cheia ? '#efe6d1' : TINTA;
      ctx.fill();
      ctx.stroke();
    };
    for (let i = 0; i < 4; i++) ponta(-Math.PI / 2 + (i * Math.PI) / 2, i % 2 === 0);
    ctx.font = '700 8px "Courier Prime", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = TINTA;
    ctx.fillText('N', cx, cy - r - 2);
    ctx.restore();
  }

  /** A régua em metros, embaixo à esquerda. */
  private escala(ctx: CanvasRenderingContext2D, S: number, x: number, y: number) {
    const m = (60 / S) * M_CASA;
    const total = [5, 10, 20, 25, 50, 100, 200].find((v) => v >= m * 0.8) ?? 200;
    const w = (total / M_CASA) * S;
    ctx.save();
    ctx.fillStyle = 'rgba(239,230,209,0.82)';
    ctx.fillRect(x - 4, y - 13, w + 24, 18);
    ctx.strokeStyle = TINTA;
    ctx.fillStyle = TINTA;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y - 2, w / 2, 2.5);
    ctx.strokeRect(x, y - 2, w, 2.5);
    ctx.font = '8px "Courier Prime", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0', x, y - 5);
    ctx.fillText(`${total} m`, x + w, y - 5);
    ctx.restore();
  }

  /** O alfinete do lugar do grupo: a arte (alfinete.png) ou o marcador desenhado. */
  private alfinete(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    if (this.alfineteImg) {
      const w = r * 2.4;
      const hh = w * 1.4;
      ctx.drawImage(this.alfineteImg, cx - w / 2, cy - hh * 0.8, w, hh);
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 1.7);
    ctx.bezierCurveTo(cx - r * 0.45, cy + r * 0.9, cx - r, cy + r * 0.3, cx - r, cy - r * 0.15);
    ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0);
    ctx.bezierCurveTo(cx + r, cy + r * 0.3, cx + r * 0.45, cy + r * 0.9, cx, cy + r * 1.7);
    ctx.closePath();
    ctx.fillStyle = '#c4281c';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#4a120d';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.15, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#f6efe3';
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- o andar de um prédio

  /**
   * Uma planta de arquitetura: os cômodos de pedra cinza com o contorno grosso por fora e o
   * fino entre eles, as portas na parede, as escadas (▲ ▼), o nome de cada um, o atual em
   * vermelho (o lápis pinta quando o grupo entra) e as peças.
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
      this.S = Math.max(1.5, Math.min(teto, (W - PAD * 2) / bw, (H - PAD * 2 - 6) / bh));
      this.O = { x: PAD + (W - PAD * 2 - bw * this.S) / 2 - x0 * this.S, y: PAD + 3 + (H - PAD * 2 - 6 - bh * this.S) / 2 - y0 * this.S };
    }
    const S = this.S;
    const O = this.O;
    const granito = this.padraoGranito(ctx);
    const dono = new Map<string, number>();
    const formas = new Map<number, Path2D>();
    for (const { s, hm, p: q, porta } of parsed) {
      const forma = new Path2D();
      for (let y = 0; y < hm.height; y++)
        for (let x = 0; x < hm.width; x++) {
          if (hm.tiles[y]?.[x] === null || hm.tiles[y]?.[x] === undefined || (porta && x === porta[0] && y === porta[1])) continue;
          dono.set(`${q.x + x},${q.y + y}`, s.id);
          forma.rect(O.x + (q.x + x) * S, O.y + (q.y + y) * S, S + 0.35, S + 0.35);
        }
      formas.set(s.id, forma);
    }
    ctx.save();
    ctx.translate(1.4, 1.8);
    ctx.fillStyle = 'rgba(46,34,24,0.26)';
    for (const f of formas.values()) ctx.fill(f);
    ctx.restore();
    ctx.fillStyle = granito;
    for (const f of formas.values()) ctx.fill(f);
    const nomes: { txt: string; x: number; y: number; w: number; h: number; atual: boolean }[] = [];
    const escadas: Alvo[] = [];
    for (const { s, hm, p: q, rot } of parsed) {
      const ox = O.x + q.x * S;
      const oy = O.y + q.y * S;
      const atual = s.id === cur;
      const rect = { x: ox, y: oy, w: hm.width * S, h: hm.height * S };
      const forma = formas.get(s.id)!;
      const tile = (x: number, y: number) => dono.get(`${q.x + x},${q.y + y}`) === s.id;
      ctx.fillStyle = 'rgba(42,38,34,0.55)';
      for (let y = 0; y < hm.height; y++)
        for (let x = 0; x < hm.width; x++) {
          if (!tile(x, y) || !tile(x - 1, y) || !tile(x + 1, y) || !tile(x, y - 1) || !tile(x, y + 1)) continue;
          if (ruido(q.x + x, q.y + y) < 0.045) ctx.fillRect(ox + (x + 0.2) * S, oy + (y + 0.3) * S, S * 0.6, S * 0.4);
        }
      if (atual) {
        const anima = this.hatch.room === s.id ? this.hatch.t : 1;
        ctx.save();
        ctx.clip(forma);
        ctx.fillStyle = `rgba(196,40,28,${(0.4 * Math.min(1, anima / 0.7)).toFixed(3)})`;
        ctx.fill(forma);
        if (anima < 1) {
          const lines = hatchLines(rect);
          const drawn = anima * lines.length;
          ctx.strokeStyle = `rgba(150,28,20,${(0.8 * (1 - anima)).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          lines.forEach(([ax, ay, bx, by], i) => {
            if (i >= drawn) return;
            const f = Math.min(1, drawn - i);
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
          });
          ctx.stroke();
        }
        ctx.restore();
      } else if (s.id === this.fade.room && this.fade.t < 1) {
        ctx.fillStyle = `rgba(190,36,26,${0.45 * (1 - this.fade.t)})`;
        ctx.fill(forma);
      }
      const escolhido = this.sel?.id === s.id;
      if (this.hover === `cena:${s.id}` || escolhido) {
        ctx.fillStyle = escolhido ? 'rgba(255,240,200,0.32)' : 'rgba(255,246,228,0.22)';
        ctx.fill(forma);
      }
      // as paredes: fina entre dois cômodos, grossa por fora
      const fina: [number, number, number, number][] = [];
      const grossa: [number, number, number, number][] = [];
      for (let y = 0; y < hm.height; y++)
        for (let x = 0; x < hm.width; x++) {
          if (!tile(x, y)) continue;
          const X = ox + x * S;
          const Y = oy + y * S;
          for (const [nx, ny, seg] of [
            [x, y - 1, [X, Y, X + S, Y]],
            [x, y + 1, [X, Y + S, X + S, Y + S]],
            [x - 1, y, [X, Y, X, Y + S]],
            [x + 1, y, [X + S, Y, X + S, Y + S]],
          ] as [number, number, [number, number, number, number]][]) {
            const v = dono.get(`${q.x + nx},${q.y + ny}`);
            if (v === s.id) continue;
            (v === undefined ? grossa : fina).push(seg);
          }
        }
      const traco = (segs: [number, number, number, number][], cor: string, lw: number) => {
        if (!segs.length) return;
        ctx.strokeStyle = cor;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (const [a1, b1, c1, d1] of segs) (ctx.moveTo(a1 + tremor(a1, b1), b1 + tremor(b1, a1)), ctx.lineTo(c1 + tremor(c1, d1), d1 + tremor(d1, c1)));
        ctx.stroke();
      };
      traco(fina, 'rgba(30,26,22,0.7)', 1);
      traco(grossa, TINTA, Math.max(1.6, Math.min(2.4, S * 0.42)));
      if (atual) traco([...fina, ...grossa], 'rgba(122,18,12,0.85)', 1.2);
      else if (escolhido) traco(grossa.length ? grossa : fina, 'rgba(20,16,12,0.95)', 2.2);
      // as portas e as escadas
      for (const pt of s.portals) {
        const [px, py] = rot(pt.x, pt.y);
        if (!tile(px, py)) continue;
        const X = ox + px * S;
        const Y = oy + py * S;
        const outroAndar = p.andares.find((x) => x.cenas.includes(pt.link));
        if (outroAndar && outroAndar.nome !== andar) {
          // escada: ▲ sobe, ▼ desce
          const sobe = outroAndar.nivel > a.nivel;
          const r = Math.max(2.4, Math.min(4.5, S * 0.7));
          const cx = X + S / 2;
          const cy = Y + S / 2;
          ctx.beginPath();
          if (sobe) (ctx.moveTo(cx, cy - r), ctx.lineTo(cx + r, cy + r * 0.8), ctx.lineTo(cx - r, cy + r * 0.8));
          else (ctx.moveTo(cx, cy + r), ctx.lineTo(cx + r, cy - r * 0.8), ctx.lineTo(cx - r, cy - r * 0.8));
          ctx.closePath();
          ctx.fillStyle = '#efe6d1';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = TINTA;
          ctx.stroke();
          const m = Math.max(r + 3, 6);
          escadas.push({ tipo: 'andar', id: outroAndar.nome, nome: `${sobe ? 'Subir' : 'Descer'} para ${outroAndar.rotulo}`, x: cx - m, y: cy - m, w: m * 2, h: m * 2 });
          if (this.hover === `andar:${outroAndar.nome}`) {
            ctx.beginPath();
            ctx.arc(cx, cy, m, 0, Math.PI * 2);
            ctx.strokeStyle = '#a3221a';
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
          continue;
        }
        ctx.fillStyle = '#26201b';
        const e = Math.max(1.6, S * 0.32);
        if (!tile(px, py - 1)) ctx.fillRect(X + S * 0.2, Y - e / 2, S * 0.6, e);
        else if (!tile(px, py + 1)) ctx.fillRect(X + S * 0.2, Y + S - e / 2, S * 0.6, e);
        else if (!tile(px - 1, py)) ctx.fillRect(X - e / 2, Y + S * 0.2, e, S * 0.6);
        else if (!tile(px + 1, py)) ctx.fillRect(X + S - e / 2, Y + S * 0.2, e, S * 0.6);
      }
      nomes.push({ txt: nomeCurto(s.name), ...rect, atual });
      alvos.push({ tipo: 'cena', id: s.id, nome: nomeCurto(s.name), ...rect, forma });
    }
    // as escadas ganham dos cômodos no clique
    alvos.push(...escadas);
    // o nome de cada cômodo, quando cabe
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of nomes) {
      let f = 10;
      ctx.font = `${f}px "Special Elite", "Courier Prime", monospace`;
      let tw = ctx.measureText(n.txt).width;
      if (tw > n.w - 6) {
        f = Math.max(7, (f * (n.w - 6)) / tw);
        ctx.font = `${f.toFixed(1)}px "Special Elite", "Courier Prime", monospace`;
        tw = ctx.measureText(n.txt).width;
      }
      if (tw > n.w - 3 || f + 2 > n.h) continue;
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = 'rgba(240,234,220,0.8)';
      ctx.strokeText(n.txt, n.x + n.w / 2, n.y + n.h / 2);
      ctx.fillStyle = n.atual ? '#7a120c' : '#1d1a17';
      ctx.fillText(n.txt, n.x + n.w / 2, n.y + n.h / 2);
    }
    ctx.restore();
    // as peças
    for (const { s, p: q, rot } of parsed)
      for (const u of s.users) {
        const [ux, uy] = rot(u.x, u.y);
        this.peca(ctx, u.id, O.x + (q.x + ux + 0.5) * S, O.y + (q.y + uy + 0.5) * S, Math.max(2, Math.min(3.4, S * 0.4)));
      }
  }

  /** O granito dos cômodos: pedra cinza salpicada, com uns veios (como a referência). */
  private padraoGranito(ctx: CanvasRenderingContext2D): CanvasPattern | string {
    if (this.granito) return this.granito;
    const T = 72;
    const p = document.createElement('canvas');
    p.width = T;
    p.height = T;
    const g = p.getContext('2d');
    if (!g) return '#9d9993';
    let semente = 9;
    const r = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    g.fillStyle = '#928e87';
    g.fillRect(0, 0, T, T);
    const mancha = (x: number, y: number, rx: number, ry: number, cor: string) => {
      for (const dx of [-T, 0, T])
        for (const dy of [-T, 0, T]) {
          g.beginPath();
          g.ellipse(x + dx, y + dy, rx, ry, r() * 3, 0, Math.PI * 2);
          g.fillStyle = cor;
          g.fill();
        }
    };
    for (let i = 0; i < 26; i++) mancha(r() * T, r() * T, 3 + r() * 7, 2 + r() * 5, r() < 0.55 ? 'rgba(70,66,60,0.16)' : 'rgba(225,221,212,0.18)');
    for (let i = 0; i < 160; i++) {
      g.fillStyle = r() < 0.6 ? 'rgba(52,48,44,0.38)' : 'rgba(232,228,220,0.35)';
      g.fillRect(Math.floor(r() * T), Math.floor(r() * T), r() < 0.3 ? 2 : 1, r() < 0.3 ? 2 : 1);
    }
    g.strokeStyle = 'rgba(46,42,38,0.38)';
    g.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) {
      let x = r() * T;
      let y = r() * T;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        x += (r() - 0.5) * 18;
        y += (r() - 0.5) * 18;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    this.granito = ctx.createPattern(p, 'repeat');
    return this.granito ?? '#9d9993';
  }
}

/** A caixa R ampliada até encher o papel, sem deformar. */
function encaixar(R: Caixa, W: number, H: number): Caixa {
  const k = Math.min((W - PAD * 2) / R.w, (H - PAD * 2) / R.h);
  return { x: (W - R.w * k) / 2, y: (H - R.h * k) / 2, w: R.w * k, h: R.h * k };
}

function mistura(a: string, b: string) {
  const n = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [x, y] = [n(a), n(b)];
  return `rgb(${x.map((v, i) => Math.round((v + y[i]) / 2)).join(',')})`;
}

/** Traço de nanquim: cada ponta desvia um pouco, sempre igual (as paredes que se encontram continuam emendadas). */
function tremor(x: number, y: number) {
  const v = Math.sin(Math.round(x * 10) * 12.9898 + Math.round(y * 10) * 78.233) * 43758.5453;
  return (v - Math.floor(v) - 0.5) * 0.9;
}

/** Hachuras a 45° dentro do retângulo do cômodo. */
function hatchLines(r: Caixa) {
  const out: [number, number, number, number][] = [];
  const step = 3.2;
  for (let c = r.x + r.y + step; c < r.x + r.w + r.y + r.h; c += step) {
    const x0 = Math.max(r.x, c - (r.y + r.h));
    const x1 = Math.min(r.x + r.w, c - r.y);
    out.push([x0, c - x0, x1, c - x1]);
  }
  return out;
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
