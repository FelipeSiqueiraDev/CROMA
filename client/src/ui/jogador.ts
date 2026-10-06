/**
 * A tela do jogador no celular ("modo jogo", referências docs/ref-jogador-*.webp; o plano em
 * docs/TELA-DO-JOGADOR.md). Em cima, quem ele é, PV/PE/SAN (com − e +, ele mexe nos dele) e os
 * números da rodada; embaixo, seis abas: Agente (os atributos em volta do corpo e o Armado),
 * Mochila, Poderes, Rituais, Docs (o que o mestre entregou) e Notas. A ficha inteira fica na
 * engrenagem.
 *
 * Tudo que muda a ficha vai pelo `fichaSalvar` (o servidor confere o que o jogador pode); a
 * mochila e o Armado, pelo `mochila`; os documentos, por `docMarcar` e `docEquipe`.
 */
import {
  documentoParaJogador,
  nomeTipoDocumento,
  regras,
  vitalConditions,
  type AcaoMochila,
  type AvatarLook,
  type Documento,
  type FichaSalva,
  type GrupoDocumento,
  type NotaDiario,
  type TipoDocumento,
} from '@crona/shared';
import { portraitCanvas } from '../render/portrait';
import { sprites } from '../render/sprites';
import type { App } from './app';
import { arteDoItem } from './arteItem';
import { CorpoView } from './corpo';
import { h, toast } from './dom';
import { botao, confirmar, janela } from './fichaModal';
import { infoItem, NOME_ELEMENTO, textoRef } from './fichaRegras';
import { arte, arteOu, ic, type NomeIcone } from './icons';
import { sfx } from './sfx';
import { vestirTema } from './temaUi';

type Calc = regras.Calculado;
type Aba = 'agente' | 'mochila' | 'poderes' | 'rituais' | 'docs' | 'notas';
const cat = regras.catalogo;

const ABAS: { id: Aba; rotulo: string; icone: NomeIcone; pintado?: string }[] = [
  { id: 'agente', rotulo: 'Agente', icone: 'pessoa', pintado: 'titulo-atributos' },
  { id: 'mochila', rotulo: 'Mochila', icone: 'mochila', pintado: 'titulo-inventario' },
  { id: 'poderes', rotulo: 'Poderes', icone: 'estrela', pintado: 'titulo-poderes' },
  { id: 'rituais', rotulo: 'Rituais', icone: 'pentagrama', pintado: 'titulo-rituais' },
  { id: 'docs', rotulo: 'Docs', icone: 'documento' },
  { id: 'notas', rotulo: 'Notas', icone: 'pena', pintado: 'titulo-anotacoes' },
];

/** Os atributos em volta do corpo: três de um lado, dois do outro. */
const ATR_ESQ: regras.AtributoId[] = ['for', 'agi', 'vig'];
const ATR_DIR: regras.AtributoId[] = ['int', 'pre'];
const ICONE_ATR: Record<regras.AtributoId, NomeIcone> = { agi: 'correr', for: 'punho', int: 'cerebro', pre: 'olho', vig: 'escudo' };

const ICONE_DOC: Record<TipoDocumento, NomeIcone> = { relatorio: 'documento', mapa: 'mapa', comunicacao: 'email', registro: 'livro', foto: 'imagem', objeto: 'caixa', outro: 'documento' };
const COR_ELEMENTO: Record<regras.Elemento, string> = { sangue: '#d9302c', morte: '#8d8d93', conhecimento: '#e2b53a', energia: '#a45cff', medo: '#f1efe9' };
const NOME_TIPO_PODER: Record<regras.OrigemPoder, string> = { classe: 'Poder de classe', habilidade: 'Habilidade de classe', trilha: 'Trilha', origem: 'Origem', paranormal: 'Poder paranormal' };

type FiltroPoder = 'classe' | 'trilha' | 'origem' | 'paranormal';
const FILTROS_PODER: { id: FiltroPoder; rotulo: string; icone: NomeIcone; tipos: regras.OrigemPoder[] }[] = [
  { id: 'classe', rotulo: 'Classe', icone: 'espadas', tipos: ['classe', 'habilidade'] },
  { id: 'trilha', rotulo: 'Trilha', icone: 'pino', tipos: ['trilha'] },
  { id: 'origem', rotulo: 'Origem', icone: 'ficha', tipos: ['origem'] },
  { id: 'paranormal', rotulo: 'Paranormal', icone: 'olho', tipos: ['paranormal'] },
];

const agora = () => new Date().toISOString();
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const numero = (n: number) => String(n).replace('.', ',');

function lookDe(charId: number | undefined): AvatarLook | null {
  if (!charId) return null;
  return { skin: '#e8b98f', hair: '#3b2618', hairStyle: 0, top: '#2b2a30', pants: '#1c1b1f', shoes: '#3d3a40', outfit: 1, extra: 0, charId };
}

/** "Hoje, 21:14", "Ontem, 9:02" ou "12/10, 20:41". */
function quando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 86_400_000);
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(d, hoje)) return `Hoje, ${hora}`;
  if (mesmoDia(d, ontem)) return `Ontem, ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hora}`;
}

/** O ícone pintado do kit (arte/icones/<nome>.png), com o de linha enquanto não chega. */
const pintado = (nome: string | undefined, icone: NomeIcone) => (nome ? arteOu([`/arte/icones/${nome}.png`], ic(icone)) : ic(icone));

export class TelaJogador {
  readonly el: HTMLElement;
  private fs: FichaSalva | null = null;
  private calc: Calc | null = null;
  private equipe: { id: number; nome: string }[] = [];
  private docs: Documento[] = [];
  private aba: Aba = 'agente';
  private corpo = new CorpoView();
  private timer = 0;
  private retratoTimer = 0;
  // o que fica escolhido em cada aba
  private itemSel: number | null = null;
  private filtroPoder: FiltroPoder = 'classe';
  private poderSel: string | null = null;
  private ritualSel: string | null = null;
  private filtroDoc: GrupoDocumento | 'todos' = 'todos';
  private docSel: number | null = null;
  private soFixadas = false;
  private notaSel: string | null = null;
  // as partes da tela
  private perfil = h('section', { class: 'jg-perfil' });
  private vitais = h('section', { class: 'jg-vitais' });
  private numeros = h('section', { class: 'jg-numeros' });
  private conteudo = h('main', { class: 'jg-conteudo' });
  private nav = h('nav', { class: 'jg-nav', role: 'tablist' });

  constructor(
    private app: App,
    private acoes: { fichaCompleta: () => void; menu: () => void; sair: () => void },
  ) {
    const topo = h(
      'header',
      { class: 'jg-topo' },
      h('div', { class: 'jg-marca' }, h('b', null, 'ORDO REALITAS'), h('span', null, 'SEDE DA ORDEM')),
      h(
        'div',
        { class: 'jg-topo-bts' },
        h('button', { class: 'jg-topo-bt', type: 'button', title: 'Menu e ficha completa', 'aria-label': 'Menu', onclick: () => (sfx.click(), acoes.menu()) }, pintado('topo-config', 'engrenagem')),
        h('button', { class: 'jg-topo-bt sair', type: 'button', title: 'Sair', 'aria-label': 'Sair', onclick: () => acoes.sair() }, pintado('topo-sair', 'sair')),
      ),
    );
    this.el = h('div', { class: 'jg' }, topo, this.perfil, this.vitais, this.numeros, this.conteudo, this.nav);
    this.renderNav();
  }

  setFicha(fs: FichaSalva | null) {
    // a mudança que o jogador ainda não mandou vale mais que a cópia do servidor
    if (this.timer && this.fs && fs && fs.id === this.fs.id) return;
    this.fs = fs ? clone(fs) : null;
    // escrevendo uma nota: o resto da tela atualiza, o campo fica como está
    const foco = document.activeElement;
    this.render(!(foco && this.conteudo.contains(foco) && /^(INPUT|TEXTAREA)$/.test(foco.tagName)));
  }

  setEquipe(equipe: { id: number; nome: string }[]) {
    this.equipe = equipe;
  }

  setDocs(docs: Documento[]) {
    this.docs = this.fs ? docs.map((d) => documentoParaJogador(d, this.fs!.id)) : docs;
    if (this.aba === 'docs') this.renderConteudo();
  }

  // ---------------------------------------------------------------- guardar

  /** A ficha mudou aqui: tela na hora, servidor logo depois (um envio só para vários toques). */
  private mudar(fn: (fs: FichaSalva) => void, redesenhar = true) {
    const fs = this.fs;
    if (!fs) return;
    fn(fs);
    fs.atualizadaEm = agora();
    if (redesenhar) this.render();
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      this.app.net.send({ t: 'fichaSalvar', ficha: fs });
    }, 450);
  }

  private mochila(uid: number, acao: AcaoMochila, extra: { para?: number; trocar?: boolean } = {}) {
    if (!this.fs) return;
    this.app.net.send({ t: 'mochila', fichaId: this.fs.id, uid, acao, ...extra });
  }

  // ---------------------------------------------------------------- desenhar

  private render(conteudo = true) {
    const fs = this.fs;
    if (!fs) {
      this.perfil.replaceChildren(h('p', { class: 'jg-vazio' }, 'Carregando a ficha…'));
      this.vitais.replaceChildren();
      this.numeros.replaceChildren();
      this.conteudo.replaceChildren();
      return;
    }
    vestirTema(this.el, fs.tema);
    try {
      this.calc = regras.calcular(fs.ficha);
    } catch {
      this.calc = null;
    }
    this.renderPerfil();
    this.renderVitais();
    this.renderNumeros();
    if (conteudo) this.renderConteudo();
    this.renderNav();
  }

  private vit() {
    const c = this.calc!;
    const a = this.fs!.atual;
    return {
      pv: Math.min(a?.pv ?? c.pv, c.pv),
      pvMax: c.pv,
      pe: Math.min(a?.pe ?? c.pe, c.pe),
      peMax: c.pe,
      san: Math.min(a?.san ?? c.san, c.san),
      sanMax: c.san,
    };
  }

  private renderPerfil() {
    const fs = this.fs!;
    const f = fs.ficha;
    const c = this.calc;
    const classe = f.classe ? cat.classe(f.classe).nome : 'Sem classe';
    const trilha = f.trilha ? cat.trilha(f.trilha)?.nome : undefined;
    const look = lookDe(fs.personagem);
    // o retrato sai da folha do personagem: sem ela ainda (a lista chega depois), desenha de novo daqui a pouco
    if (look && !sprites.def(look.charId!)) {
      clearTimeout(this.retratoTimer);
      this.retratoTimer = window.setTimeout(() => this.fs && this.renderPerfil(), 700);
    }
    // as condições: as do mestre e as que saem dos pontos (machucado, morrendo...)
    const auto = c ? vitalConditions(this.vit()) : null;
    const nomes = [
      ...(auto ? (Object.entries(auto) as [string, boolean][]).filter(([, v]) => v).map(([k]) => cat.condicao(k)?.nome ?? k[0].toUpperCase() + k.slice(1)) : []),
      ...(fs.condicoes ?? []).map((k) => cat.condicao(k)?.nome ?? k),
    ];
    const chips = nomes.length
      ? nomes.slice(0, 3).map((n) => h('span', { class: 'jg-chip ruim' }, ic('alerta'), n))
      : [h('span', { class: 'jg-chip ok' }, ic('pulso'), 'Normal')];
    if (regras.armado(f.inventario)) chips.push(h('span', { class: 'jg-chip arma' }, ic('pistola'), 'Armado'));
    this.perfil.replaceChildren(
      h('div', { class: 'jg-foto' }, look ? portraitCanvas(look, 120) : ic('pessoa')),
      h(
        'div',
        { class: 'jg-quem' },
        h('div', { class: 'jg-nome' }, h('b', null, fs.nome), h('span', null, [classe, trilha, `NEX ${f.nex}%`].filter(Boolean).join(' · '))),
        h('div', { class: 'jg-chips' }, ...chips),
      ),
    );
  }

  private renderVitais() {
    if (!this.calc) return this.vitais.replaceChildren(h('p', { class: 'jg-vazio' }, 'A ficha tem um problema: peça ao mestre para conferir.'));
    const v = this.vit();
    const card = (k: 'pv' | 'pe' | 'san', rotulo: string) => {
      const atual = v[k];
      const max = v[`${k}Max` as const];
      const pct = Math.max(0, Math.min(100, (atual / Math.max(1, max)) * 100));
      const mudar = (d: number) => {
        sfx.click();
        this.mudar((fs) => {
          const vv = this.vit();
          const novo = Math.max(k === 'pv' ? -max : 0, Math.min(max, vv[k] + d));
          fs.atual = { pv: vv.pv, pe: vv.pe, san: vv.san, ...fs.atual, [k]: novo };
        });
      };
      return h(
        'div',
        { class: `jg-vital ${k}` },
        h('div', { class: 'jg-vital-topo' }, h('b', null, rotulo), h('span', null, h('strong', null, String(atual)), `/${max}`)),
        h('div', { class: 'jg-barra' }, h('i', { style: `width:${pct}%` })),
        h(
          'div',
          { class: 'jg-vital-bts' },
          h('button', { type: 'button', 'aria-label': `Tirar 1 de ${rotulo}`, onclick: () => mudar(-1) }, ic('menos')),
          h('button', { type: 'button', 'aria-label': `Somar 1 em ${rotulo}`, onclick: () => mudar(1) }, ic('mais')),
        ),
      );
    };
    this.vitais.replaceChildren(card('pv', 'PV'), card('pe', 'PE'), card('san', 'SAN'));
  }

  private renderNumeros() {
    const c = this.calc;
    if (!c) return this.numeros.replaceChildren();
    const n = (icone: NomeIcone, pint: string | undefined, rotulo: string, valor: string, dica: string) =>
      h('div', { class: 'jg-num', title: dica }, pintado(pint, icone), h('span', null, rotulo), h('b', null, valor));
    this.numeros.replaceChildren(
      n('escudo', 'defesa', 'Defesa', String(c.defesa), 'Defesa: 10 + Agilidade + proteção.'),
      n('correr', 'deslocamento', 'Desloc.', `${numero(c.deslocamento)} m`, 'Deslocamento por ação de movimento.'),
      n('peso', undefined, 'Carga', `${numero(c.carga.usados)}/${c.carga.espacos}`, `Espaços da mochila (até ${c.carga.maximo}, sobrecarregado).`),
      n('raio', 'pe', 'Limite PE', String(c.limitePe), 'PE que dá para gastar por turno.'),
    );
  }

  private renderNav() {
    this.nav.replaceChildren(
      ...ABAS.map((a) =>
        h(
          'button',
          {
            class: `jg-aba${this.aba === a.id ? ' on' : ''}`,
            type: 'button',
            role: 'tab',
            'aria-selected': String(this.aba === a.id),
            onclick: () => {
              if (this.aba === a.id) return;
              sfx.click();
              this.aba = a.id;
              this.renderConteudo();
              this.renderNav();
              this.conteudo.scrollTop = 0;
            },
          },
          pintado(a.pintado, a.icone),
          h('span', null, a.rotulo),
        ),
      ),
    );
  }

  private renderConteudo() {
    if (!this.fs || !this.calc) return this.conteudo.replaceChildren();
    if (this.aba !== 'agente') this.corpo.el.remove();
    const partes: Record<Aba, () => Node[]> = {
      agente: () => this.abaAgente(),
      mochila: () => this.abaMochila(),
      poderes: () => this.abaPoderes(),
      rituais: () => this.abaRituais(),
      docs: () => this.abaDocs(),
      notas: () => this.abaNotas(),
    };
    this.conteudo.dataset.aba = this.aba;
    this.conteudo.replaceChildren(...partes[this.aba]());
  }

  private titulo(texto: string, icone: NomeIcone, extra?: Node | null) {
    return h('div', { class: 'jg-tit' }, ic(icone), h('h2', null, texto), extra ?? null);
  }

  // ---------------------------------------------------------------- Agente

  private abaAgente(): Node[] {
    const fs = this.fs!;
    const c = this.calc!;
    const def = fs.personagem ? this.app.state.characters.find((x) => x.id === fs.personagem) : undefined;
    this.corpo.setPersonagem(def);
    this.corpo.setCondicoes(vitalConditions(this.vit()));
    const atr = (a: regras.AtributoId) => {
      const v = c.atributos[a];
      return h(
        'div',
        { class: 'jg-atr', title: `${regras.NOME_ATRIBUTO[a]}: rola ${v > 0 ? `${v}d20 e fica o maior` : '2d20 e fica o menor'}.` },
        h('span', { class: 'jg-atr-ic' }, arte(`/arte/icones/${a}.png`, ICONE_ATR[a])),
        h('span', { class: 'jg-atr-n' }, regras.NOME_ATRIBUTO[a].toUpperCase()),
        h('b', { class: 'jg-atr-v' }, String(v)),
        h('span', { class: 'jg-atr-d' }, v > 0 ? `${v}d20` : '−2d20'),
      );
    };
    const armado = regras.armado(fs.ficha.inventario);
    const armas = fs.ficha.inventario.filter((it) => it.tipo === 'arma' && regras.maosDoItem(it) > 0 && it.uid);
    const naMao = fs.ficha.inventario.filter((it) => it.tipo === 'arma' && regras.lugarDoItem(it) === 'mao');
    const trocar = h(
      'button',
      {
        class: `jg-armado${armado ? ' on' : ''}`,
        type: 'button',
        disabled: !armado && !armas.length,
        title: armado ? `Na mão: ${naMao.map((x) => regras.nomeDoItem(x)).join(', ')}. Toque para guardar.` : armas.length ? `Saca ${regras.nomeDoItem(armas[0])}.` : 'Nenhuma arma na mochila.',
        onclick: () => {
          sfx.click();
          if (armado) for (const it of naMao) this.mochila(it.uid!, 'guardar');
          else if (armas[0]) this.mochila(armas[0].uid!, 'empunhar', { trocar: true });
        },
      },
      h('span', { class: 'jg-armado-op des' }, ic('mao'), 'Desarmado'),
      h('span', { class: 'jg-armado-op arm' }, ic('pistola'), 'Armado'),
    );
    return [
      h(
        'div',
        { class: 'jg-agente' },
        h('div', { class: 'jg-atr-col' }, ...ATR_ESQ.map(atr)),
        h('div', { class: 'jg-palco' }, h('div', { class: 'jg-palco-fundo' }), this.corpo.el),
        h('div', { class: 'jg-atr-col' }, ...ATR_DIR.map(atr), h('div', { class: 'jg-atr jg-pe-turno', title: 'PE por turno e a DT dos seus rituais.' }, h('span', { class: 'jg-atr-n' }, 'DT RITUAIS'), h('b', { class: 'jg-atr-v' }, String(c.dtRituais)))),
      ),
      trocar,
      h('p', { class: 'jg-nota-armado' }, armado ? `Na mão: ${naMao.map((x) => regras.nomeDoItem(x)).join(', ')}.` : armas.length ? 'A arma fica guardada; Armado saca a primeira da mochila.' : 'Sem arma na mochila.'),
    ];
  }

  // ---------------------------------------------------------------- Mochila

  private abaMochila(): Node[] {
    const fs = this.fs!;
    const c = this.calc!;
    const inv = fs.ficha.inventario.filter((it) => it.uid);
    if (this.itemSel !== null && !inv.some((x) => x.uid === this.itemSel)) this.itemSel = null;
    const cards = inv.map((it) => {
      const inf = infoItem(it, c);
      const lugar = regras.lugarDoItem(it);
      return h(
        'button',
        { class: `jg-item${this.itemSel === it.uid ? ' on' : ''}`, type: 'button', onclick: () => ((this.itemSel = this.itemSel === it.uid ? null : it.uid!), sfx.click(), this.renderConteudo()) },
        h('span', { class: 'jg-item-n' }, inf.nome),
        h('span', { class: 'jg-item-arte' }, arteDoItem(it, inf.icone)),
        (it.qtd ?? 1) > 1 ? h('span', { class: 'jg-item-q' }, `x${it.qtd}`) : null,
        lugar !== 'mochila' ? h('span', { class: 'jg-item-lugar', title: lugar === 'mao' ? 'Na mão' : 'Vestido' }, ic(lugar === 'mao' ? 'mao' : 'colete')) : null,
      );
    });
    const sel = inv.find((x) => x.uid === this.itemSel);
    return [
      this.titulo('MOCHILA', 'mochila', h('span', { class: 'jg-tit-extra' }, h('b', null, `${numero(c.carga.usados)}/${c.carga.espacos}`), ' espaços')),
      inv.length ? h('div', { class: 'jg-itens' }, ...cards) : h('p', { class: 'jg-vazio' }, 'A mochila está vazia. Os itens vêm da requisição (na ficha completa) e do que o mestre entrega.'),
      sel ? this.detalheItem(sel) : null,
    ].filter((x): x is HTMLElement => !!x);
  }

  private detalheItem(it: regras.ItemFicha): HTMLElement {
    const inf = infoItem(it, this.calc);
    const lugar = regras.lugarDoItem(it);
    const uid = it.uid!;
    const acoes: HTMLElement[] = [];
    if (regras.maosDoItem(it) > 0)
      acoes.push(lugar === 'mao' ? botao('Guardar', 'mochila', '', () => this.mochila(uid, 'guardar')) : botao('Empunhar', 'mao', 'forte', () => this.mochila(uid, 'empunhar', { trocar: true })));
    else if (regras.vestivel(it)) acoes.push(lugar === 'vestido' ? botao('Tirar', 'colete', '', () => this.mochila(uid, 'tirar')) : botao('Vestir', 'colete', 'forte', () => this.mochila(uid, 'vestir')));
    if (regras.consumivel(it))
      acoes.push(
        botao('Usar', 'kitMedico', 'forte', async () => {
          if (await confirmar(`USAR ${inf.nome.toUpperCase()}?`, 'O item é gasto, e o mestre vê no registro.', 'Usar')) this.mochila(uid, 'usar');
        }),
      );
    if (this.equipe.length) acoes.push(botao('Entregar', 'pessoa', '', () => this.entregar(it, inf.nome)));
    const linhas = [inf.efeito, inf.obs].filter((x) => x && x !== '—');
    return h(
      'article',
      { class: 'jg-det' },
      h('div', { class: 'jg-det-arte' }, arteDoItem(it, inf.icone)),
      h(
        'div',
        { class: 'jg-det-txt' },
        h('h3', null, inf.nome),
        linhas.length ? h('p', null, linhas.join(' · ')) : null,
        h('p', { class: 'jg-det-meta' }, `${inf.tipo}${inf.categoria ? ` · categoria ${['0', 'I', 'II', 'III', 'IV'][inf.categoria]}` : ''} · ${numero(inf.espacos * (it.qtd ?? 1))} esp.${lugar === 'mao' ? ' · na mão' : lugar === 'vestido' ? ' · vestido' : ''}`),
      ),
      acoes.length ? h('div', { class: 'jg-det-bts' }, ...acoes) : null,
    );
  }

  private entregar(it: regras.ItemFicha, nome: string) {
    const j = janela(`ENTREGAR ${nome.toUpperCase()}`, 'pessoa', () => {}, 34);
    j.corpo.append(
      h('p', { class: 'fj-dica' }, 'Para quem? O item sai da sua mochila na hora.'),
      h(
        'div',
        { class: 'jg-lista-escolha' },
        ...this.equipe.map((o) =>
          h('button', { class: 'fx-bt', type: 'button', onclick: () => (this.mochila(it.uid!, 'entregar', { para: o.id }), this.itemSel = null, j.fechar()) }, ic('pessoa'), h('span', null, o.nome)),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------- Poderes

  private abaPoderes(): Node[] {
    const c = this.calc!;
    const f = this.fs!.ficha;
    const filtros = FILTROS_PODER.filter((x) => c.poderes.some((p) => x.tipos.includes(p.tipo)));
    if (!filtros.some((x) => x.id === this.filtroPoder) && filtros.length) this.filtroPoder = filtros[0].id;
    const filtro = FILTROS_PODER.find((x) => x.id === this.filtroPoder)!;
    const lista = c.poderes.filter((p) => filtro.tipos.includes(p.tipo));
    const linhas = lista.map((p) => {
      const info = this.infoPoder(p);
      return h(
        'button',
        { class: `jg-linha${this.poderSel === p.id ? ' on' : ''}`, type: 'button', onclick: () => ((this.poderSel = this.poderSel === p.id ? null : p.id), sfx.click(), this.renderConteudo()) },
        h('span', { class: 'jg-linha-ic' }, ic(filtro.icone)),
        h('span', { class: 'jg-linha-txt' }, h('span', { class: 'jg-linha-n' }, p.nome, h('em', { class: `jg-selo${info.custo ? ' pe' : ''}` }, info.custo ? `${info.custo} PE` : 'Passivo')), info.resumo ? h('small', null, info.resumo) : null),
        ic('direita'),
      );
    });
    const sel = lista.find((p) => p.id === this.poderSel);
    const nomeGrupo: Record<FiltroPoder, string> = {
      classe: f.classe ? cat.classe(f.classe).nome : 'Classe',
      trilha: (f.trilha && cat.trilha(f.trilha)?.nome) || 'Trilha',
      origem: (f.origem && cat.origem(f.origem)?.nome) || 'Origem',
      paranormal: 'Paranormal',
    };
    return [
      this.titulo('PODERES', 'estrela'),
      filtros.length > 1
        ? h(
            'div',
            { class: 'jg-filtros' },
            ...filtros.map((x) =>
              h('button', { class: `jg-filtro${x.id === this.filtroPoder ? ' on' : ''}`, type: 'button', onclick: () => ((this.filtroPoder = x.id), (this.poderSel = null), sfx.click(), this.renderConteudo()) }, ic(x.icone), h('span', null, x.rotulo)),
            ),
          )
        : null,
      lista.length ? h('div', { class: 'jg-lista' }, ...linhas) : h('p', { class: 'jg-vazio' }, 'Sem poderes ainda.'),
      sel ? this.detalhePoder(sel, nomeGrupo[filtro.id], filtro.icone) : null,
    ].filter((x): x is HTMLElement => !!x);
  }

  private infoPoder(p: regras.PoderObtido) {
    const def = cat.poder(p.id) ?? cat.paranormal(p.id);
    const hab = def ? undefined : buscaHabilidade(p.id);
    const resumo = (def as { resumo?: string } | undefined)?.resumo ?? hab?.resumo ?? '';
    const custo = (def as { custoPe?: number } | undefined)?.custoPe ?? hab?.custoPe;
    const ref = def?.ref ?? hab?.ref;
    const efeitos = p.efeitos.filter((e) => e.alvo !== 'nota').map((e) => regras.textoEfeito(e) + (e.condicional ? ` (${e.condicional})` : ''));
    const notas = p.efeitos.filter((e): e is Extract<regras.Efeito, { alvo: 'nota' }> => e.alvo === 'nota').map((e) => e.texto);
    return { resumo, custo, ref, efeitos, notas };
  }

  private detalhePoder(p: regras.PoderObtido, grupo: string, icone: NomeIcone): HTMLElement {
    const info = this.infoPoder(p);
    const bloco = (titulo: string, ico: NomeIcone, ...txt: (string | null | undefined)[]) => {
      const t = txt.filter((x): x is string => !!x);
      return t.length ? h('div', { class: 'jg-bloco' }, h('h4', null, ic(ico), titulo), ...t.map((x) => h('p', null, x))) : null;
    };
    return h(
      'article',
      { class: 'jg-det jg-det-poder' },
      h('div', { class: 'jg-det-cab' }, h('span', { class: 'jg-linha-ic grande' }, ic(icone)), h('div', null, h('h3', null, p.nome), h('p', { class: 'jg-det-meta' }, `${NOME_TIPO_PODER[p.tipo]} · ${grupo}`)), h('em', { class: `jg-selo grande${info.custo ? ' pe' : ''}` }, info.custo ? `${info.custo} PE` : 'Passivo')),
      h(
        'div',
        { class: 'jg-blocos' },
        bloco('O que faz', 'livro', info.resumo || null, ...info.notas),
        bloco('Efeitos', 'alvo', info.efeitos.length ? info.efeitos.join('; ') + '.' : null),
        bloco('De onde', 'pino', `NEX ${p.nex}%${p.via ? ` (${p.via})` : ''}.`, info.ref ? textoRef(info.ref) : null),
      ),
    );
  }

  // ---------------------------------------------------------------- Rituais

  private abaRituais(): Node[] {
    const fs = this.fs!;
    const c = this.calc!;
    const fav = new Set(fs.favoritos ?? []);
    const rituais = c.rituais
      .map((r) => cat.ritual(r.id))
      .filter((r): r is regras.Ritual => !!r)
      .sort((a, b) => Number(fav.has(b.id)) - Number(fav.has(a.id)) || a.circulo - b.circulo || a.nome.localeCompare(b.nome));
    const conta = (r: regras.Ritual) => c.custoRituais[r.id] ?? { pe: [0, 1, 3, 6, 10][r.circulo], dt: c.dtRituais };
    const estrela = (r: regras.Ritual) =>
      h(
        'button',
        {
          class: `jg-estrela${fav.has(r.id) ? ' on' : ''}`,
          type: 'button',
          title: fav.has(r.id) ? 'Tirar dos favoritos' : 'Marcar favorito',
          'aria-pressed': String(fav.has(r.id)),
          onclick: (e: Event) => {
            e.stopPropagation();
            sfx.click();
            this.mudar((f) => {
              const s = new Set(f.favoritos ?? []);
              if (s.has(r.id)) s.delete(r.id);
              else s.add(r.id);
              f.favoritos = [...s];
            });
          },
        },
        ic('estrela'),
      );
    const campo = (rot: string, icone: NomeIcone, valor: string) => h('span', { class: 'jg-rit-campo' }, h('small', null, rot), h('b', null, ic(icone), valor));
    const cards = rituais.map((r) => {
      const k = conta(r);
      return h(
        'div',
        { class: `jg-rit${this.ritualSel === r.id ? ' on' : ''}`, role: 'button', tabindex: 0, style: `--cor:${COR_ELEMENTO[r.elemento]}`, onclick: () => ((this.ritualSel = this.ritualSel === r.id ? null : r.id), sfx.click(), this.renderConteudo()) },
        h('span', { class: 'jg-rit-arte' }, arteOu([`/arte/rituais/${r.id}.png`, `/arte/icones/sigilo-${r.elemento}.png`], ic('pentagrama'))),
        h(
          'span',
          { class: 'jg-rit-txt' },
          h('span', { class: 'jg-rit-n' }, r.nome),
          h('span', { class: 'jg-rit-campos' }, campo('Círculo', 'mais3', `${r.circulo}º`), campo('Custo', 'raio', `${k.pe} PE`), campo('Execução', 'ampulheta', r.execucao), campo('Alcance', 'alvo', r.alcance), campo('DT', 'olho', r.resistencia ? String(k.dt) : '—')),
        ),
        estrela(r),
      );
    });
    const sel = rituais.find((r) => r.id === this.ritualSel);
    return [
      this.titulo('RITUAIS', 'pentagrama'),
      rituais.length ? h('div', { class: 'jg-rits' }, ...cards) : h('p', { class: 'jg-vazio' }, 'Sem rituais. Eles vêm do ocultista ou do poder Aprender Ritual.'),
      sel ? this.detalheRitual(sel, conta(sel), fav.has(sel.id), estrela(sel)) : null,
    ].filter((x): x is HTMLElement => !!x);
  }

  private detalheRitual(r: regras.Ritual, k: { pe: number; dt: number }, fav: boolean, estrela: HTMLElement): HTMLElement {
    const linha = (rot: string, valor: string) => h('span', { class: 'jg-rit-campo' }, h('small', null, rot), h('b', null, valor));
    const extras = [
      r.discente ? `Discente: +${r.discente.custoExtra} PE${r.discente.circulo ? `, ${r.discente.circulo}º círculo` : ''}.` : '',
      r.verdadeiro ? `Verdadeiro: +${r.verdadeiro.custoExtra} PE${r.verdadeiro.circulo ? `, ${r.verdadeiro.circulo}º círculo` : ''}${r.verdadeiro.afinidade ? ', com afinidade' : ''}.` : '',
    ].filter(Boolean);
    return h(
      'article',
      { class: 'jg-det jg-det-rit', style: `--cor:${COR_ELEMENTO[r.elemento]}` },
      h('div', { class: 'jg-rit-arte grande' }, arteOu([`/arte/rituais/${r.id}.png`, `/arte/icones/sigilo-${r.elemento}.png`], ic('pentagrama'))),
      h(
        'div',
        { class: 'jg-det-txt' },
        h('h3', null, r.nome),
        h('p', { class: 'jg-det-meta' }, `${NOME_ELEMENTO[r.elemento]} · ${r.circulo}º círculo${r.alvo ? ` · ${r.alvo}` : ''} · ${r.duracao}`),
        ...extras.map((x) => h('p', null, x)),
        h('p', { class: 'jg-det-meta' }, textoRef(r.ref)),
      ),
      h('div', { class: 'jg-rit-campos largo' }, linha('Execução', r.execucao), linha('Alcance', r.alcance), linha('Resistência', r.resistencia ?? '—'), linha('DT', r.resistencia ? String(k.dt) : '—'), linha('Custo', `${k.pe} PE`)),
      h('div', { class: 'jg-det-bts' }, estrela, h('span', null, fav ? 'Favorito' : 'Marcar favorito')),
    );
  }

  // ---------------------------------------------------------------- Docs

  private abaDocs(): Node[] {
    const fs = this.fs!;
    const lista = this.docs
      .filter((d) => this.filtroDoc === 'todos' || d.grupo === this.filtroDoc)
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    if (this.docSel !== null && !this.docs.some((d) => d.id === this.docSel)) this.docSel = null;
    const filtros: { id: GrupoDocumento | 'todos'; rotulo: string; icone: NomeIcone }[] = [
      { id: 'todos', rotulo: 'Todos', icone: 'documento' },
      { id: 'evidencia', rotulo: 'Evidências', icone: 'lupa' },
      { id: 'pista', rotulo: 'Pistas', icone: 'mapa' },
    ];
    const meta = (d: Documento) => [nomeTipoDocumento(d.tipo), d.origem, `${d.paginas.length} página${d.paginas.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
    const linhas = lista.map((d) =>
      h(
        'button',
        { class: `jg-doc${this.docSel === d.id ? ' on' : ''}`, type: 'button', onclick: () => ((this.docSel = this.docSel === d.id ? null : d.id), sfx.paper(), this.renderConteudo()) },
        h('span', { class: 'jg-doc-mini' }, d.imagem ? h('img', { src: d.imagem, alt: '', loading: 'lazy', decoding: 'async' }) : ic(ICONE_DOC[d.tipo])),
        h('span', { class: 'jg-linha-txt' }, h('span', { class: 'jg-linha-n' }, d.titulo, d.marcadoPor?.includes(fs.id) ? h('em', { class: 'jg-marca' }, ic('pino')) : null), h('small', null, meta(d))),
        ic('direita'),
      ),
    );
    const sel = this.docs.find((d) => d.id === this.docSel);
    return [
      this.titulo('DOCUMENTOS', 'documento'),
      h(
        'div',
        { class: 'jg-filtros' },
        ...filtros.map((x) =>
          h('button', { class: `jg-filtro${x.id === this.filtroDoc ? ' on' : ''}`, type: 'button', onclick: () => ((this.filtroDoc = x.id), sfx.click(), this.renderConteudo()) }, ic(x.icone), h('span', null, x.rotulo)),
        ),
      ),
      lista.length
        ? h('div', { class: 'jg-lista' }, ...linhas)
        : h('p', { class: 'jg-vazio' }, this.docs.length ? 'Nada neste filtro.' : 'Nenhum documento ainda. O que o mestre entregar (relatórios, fotos, pistas) aparece aqui.'),
      sel ? this.detalheDoc(sel, meta(sel)) : null,
    ].filter((x): x is HTMLElement => !!x);
  }

  private detalheDoc(d: Documento, meta: string): HTMLElement {
    const fs = this.fs!;
    const marcado = !!d.marcadoPor?.includes(fs.id);
    const previa = d.paginas.find((p) => p.trim()) ?? '';
    return h(
      'article',
      { class: 'jg-det jg-det-doc' },
      d.imagem ? h('button', { class: 'jg-det-arte', type: 'button', title: 'Ler', onclick: () => this.lerDoc(d) }, h('img', { src: d.imagem, alt: '' })) : h('div', { class: 'jg-det-arte' }, ic(ICONE_DOC[d.tipo])),
      h('div', { class: 'jg-det-txt' }, h('h3', null, d.titulo), h('p', { class: 'jg-det-meta' }, meta), previa ? h('p', { class: 'jg-doc-previa' }, previa.length > 320 ? `${previa.slice(0, 320)}…` : previa) : null),
      h(
        'div',
        { class: 'jg-det-bts' },
        botao('Ler', 'livro', 'forte', () => this.lerDoc(d)),
        botao(marcado ? 'Marcado' : 'Marcar', 'pino', marcado ? 'on' : '', () => this.app.net.send({ t: 'docMarcar', id: d.id, marcado: !marcado })),
        d.equipe
          ? h('span', { class: 'jg-equipe-ok' }, ic('ok'), 'Com a equipe')
          : botao('Mover para equipe', 'pessoa', '', async () => {
              if (await confirmar('PASSAR PARA A EQUIPE?', `Todos os agentes passam a ver "${d.titulo}". Não dá para desfazer.`, 'Passar')) this.app.net.send({ t: 'docEquipe', id: d.id });
            }),
      ),
    );
  }

  /** O documento inteiro, página por página, na tela toda. */
  private lerDoc(d: Documento) {
    sfx.paper();
    let pag = 0;
    const j = janela(d.titulo.toUpperCase(), 'documento', () => {}, 60);
    j.el.classList.add('tela-toda', 'jg-leitor');
    const pagina = h('div', { class: 'jg-pagina' });
    const cont = h('span', { class: 'jg-pag-n' });
    const ant = botao('Anterior', 'esquerda', '', () => ir(-1));
    const prox = botao('Próxima', 'direita', 'forte', () => ir(1));
    const ir = (n: number) => {
      pag = Math.max(0, Math.min(d.paginas.length - 1, pag + n));
      sfx.paper();
      desenhar();
    };
    const desenhar = () => {
      pagina.replaceChildren(...(pag === 0 && d.imagem ? [h('img', { class: 'jg-pagina-img', src: d.imagem, alt: '' })] : []), ...d.paginas[pag].split(/\n{2,}/).map((p) => h('p', null, p)));
      cont.textContent = d.paginas.length > 1 ? `Página ${pag + 1} de ${d.paginas.length}` : '';
      ant.disabled = pag === 0;
      prox.disabled = pag >= d.paginas.length - 1;
    };
    j.corpo.append(pagina);
    if (d.paginas.length > 1) j.rodape.append(ant, cont, prox);
    else j.rodape.append(h('span', { class: 'fj-esp' }), botao('Fechar', 'ok', 'forte', () => j.fechar()));
    desenhar();
  }

  // ---------------------------------------------------------------- Notas

  private abaNotas(): Node[] {
    const fs = this.fs!;
    const todas = [...(fs.diario ?? [])].sort((a, b) => Number(!!b.fixada) - Number(!!a.fixada) || b.em.localeCompare(a.em));
    const lista = this.soFixadas ? todas.filter((n) => n.fixada) : todas;
    if (this.notaSel && !todas.some((n) => n.id === this.notaSel)) this.notaSel = null;
    const linhas = lista.map((n) =>
      h(
        'button',
        { class: `jg-nota${this.notaSel === n.id ? ' on' : ''}`, type: 'button', onclick: () => ((this.notaSel = this.notaSel === n.id ? null : n.id), sfx.paper(), this.renderConteudo()) },
        ic('documento'),
        h('span', { class: 'jg-linha-txt' }, h('span', { class: 'jg-linha-n' }, n.titulo || 'Sem título'), h('small', null, quando(n.em))),
        n.fixada ? h('em', { class: 'jg-marca' }, ic('pino')) : null,
        ic('direita'),
      ),
    );
    const sel = todas.find((n) => n.id === this.notaSel);
    const filtro = (fix: boolean, rotulo: string, icone: NomeIcone) =>
      h('button', { class: `jg-filtro${this.soFixadas === fix ? ' on' : ''}`, type: 'button', onclick: () => ((this.soFixadas = fix), sfx.click(), this.renderConteudo()) }, ic(icone), h('span', null, rotulo));
    return [
      this.titulo('NOTAS', 'pena', h('button', { class: 'jg-tit-bt', type: 'button', onclick: () => this.novaNota() }, ic('mais'), h('span', null, 'Nova nota'))),
      h('div', { class: 'jg-filtros dois' }, filtro(false, 'Recentes', 'documento'), filtro(true, 'Fixadas', 'pino')),
      lista.length ? h('div', { class: 'jg-lista' }, ...linhas) : h('p', { class: 'jg-vazio' }, this.soFixadas ? 'Nenhuma nota fixada.' : 'Nenhuma nota. Anote pistas, nomes e portas trancadas: só você e o mestre veem.'),
      sel ? this.editorNota(sel) : null,
    ].filter((x): x is HTMLElement => !!x);
  }

  private novaNota() {
    sfx.paper();
    const n: NotaDiario = { id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, titulo: '', texto: '', em: agora() };
    this.notaSel = n.id;
    this.soFixadas = false;
    this.mudar((fs) => (fs.diario = [n, ...(fs.diario ?? [])].slice(0, 200)));
    (this.conteudo.querySelector('.jg-nota-tit') as HTMLInputElement | null)?.focus();
  }

  private editorNota(n: NotaDiario): HTMLElement {
    const titulo = h('input', { class: 'fx-inp jg-nota-tit', value: n.titulo, maxlength: 80, placeholder: 'Título' }) as HTMLInputElement;
    const texto = h('textarea', { class: 'fx-inp jg-nota-txt', maxlength: 4000, placeholder: 'Escreva aqui…' }) as HTMLTextAreaElement;
    texto.value = n.texto;
    const gravar = (extra: Partial<NotaDiario> = {}, redesenhar = true) =>
      this.mudar((fs) => {
        const alvo = fs.diario?.find((x) => x.id === n.id);
        if (!alvo) return;
        Object.assign(alvo, { titulo: titulo.value.trim(), texto: texto.value, em: agora() }, extra);
        if (alvo.fixada === undefined) delete alvo.fixada;
      }, redesenhar);
    // grava sozinho enquanto escreve (sem redesenhar, para não perder o cursor)
    titulo.addEventListener('input', () => gravar({}, false));
    texto.addEventListener('input', () => gravar({}, false));
    return h(
      'article',
      { class: 'jg-det jg-det-nota' },
      h(
        'div',
        { class: 'jg-nota-cab' },
        titulo,
        h('span', { class: 'jg-det-meta' }, quando(n.em)),
        h(
          'button',
          {
            class: 'jg-lixo',
            type: 'button',
            title: 'Apagar a nota',
            'aria-label': 'Apagar a nota',
            onclick: async () => {
              if (!(await confirmar('APAGAR A NOTA?', `"${n.titulo || 'Sem título'}" some de vez.`, 'Apagar', true))) return;
              this.notaSel = null;
              this.mudar((fs) => (fs.diario = (fs.diario ?? []).filter((x) => x.id !== n.id)));
            },
          },
          ic('lixo'),
        ),
      ),
      texto,
      h(
        'div',
        { class: 'jg-det-bts' },
        botao('Salvar', 'salvar', '', () => (gravar(), toast('Nota salva.'))),
        botao(n.fixada ? 'Desafixar' : 'Fixar', 'pino', n.fixada ? 'on' : '', () => gravar({ fixada: !n.fixada || undefined })),
        botao('Nova nota', 'mais', 'forte', () => (gravar(), this.novaNota())),
      ),
    );
  }
}

function buscaHabilidade(id: string): regras.Habilidade | undefined {
  for (const c of cat.CATALOGO.classes) for (const x of c.habilidades) if (x.id === id) return x;
  for (const t of cat.CATALOGO.trilhas) for (const x of t.habilidades) if (x.id === id) return x;
  for (const o of cat.CATALOGO.origens) if (o.poder.id === id) return o.poder;
  return undefined;
}

