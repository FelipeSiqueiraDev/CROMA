import type { ClientMsg } from '@crona/shared';
import { h } from './dom';

/**
 * A tela de entrada da plataforma: a arte do Felipe (a mesa de RPG à luz de vela, com o painel
 * do CRONA) ocupa a tela, e os campos de verdade ficam exatamente em cima dos desenhados. Duas
 * artes, uma para o computador (1672×941) e uma para o celular (941×1672); o "palco" escala a
 * arte inteira para cobrir a tela, sempre com o painel à vista.
 *
 * Por cima, o que dá vida: a chama da vela tremulando e iluminando a mesa, o céu piscando, a
 * lua, a fumaça da caneca, o emblema brilhando com faíscas, a poeira na luz, o brilho correndo
 * no botão, e as transições de entrar, trocar de modo, errar e sair.
 *
 * Modos: entrar (e-mail e senha), criar conta (nome, e-mail e senha) e o aviso do jogador que
 * ainda não tem ficha ligada à conta. A conta é do servidor (`contaEntrar`, `contaCriar`); a
 * resposta chega pela mensagem `conta` e o main.ts chama `resposta`.
 */

type Modo = 'entrar' | 'criar' | 'semFicha';
/** [y, altura] em pixels do palco */
type Caixa = [number, number];
interface Ret {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  nome: 'computador' | 'celular';
  w: number;
  h: number;
  fundo: string;
  /** tamanho da letra e dos ícones (1 = computador) */
  u: number;
  /** a área de dentro do painel que os campos cobrem (o título e o rodapé da arte ficam à vista) */
  painel: Ret;
  /** o painel inteiro, com o emblema: fica sempre à vista */
  moldura: Ret;
  /** os campos e botões: de onde a onde, na horizontal */
  campo: { x: number; w: number };
  entrar: { email: Caixa; senha: Caixa; botao: Caixa; ou: number; outro: Caixa };
  criar: { nome: Caixa; email: Caixa; senha: Caixa; botao: Caixa; ou: number; outro: Caixa };
  /** x, y e raio do brilho */
  chama: [number, number, number];
  lua: [number, number, number];
  fumaca: [number, number];
  emblema: [number, number, number];
  /** x0, y0, x1, y1: onde o céu pisca */
  ceu: [number, number, number, number];
}

/** As medidas saíram da própria arte (as bordas dos campos desenhados). */
const COMPUTADOR: Layout = {
  nome: 'computador',
  w: 1672,
  h: 941,
  fundo: '/arte/login/fundo-computador.webp',
  u: 1,
  painel: { x: 862, y: 384, w: 510, h: 368 },
  moldura: { x: 845, y: 92, w: 550, h: 735 },
  campo: { x: 905, w: 421 },
  entrar: { email: [398, 59], senha: [475, 59], botao: [553, 61], ou: 653, outro: [678, 50] },
  criar: { nome: [396, 52], email: [458, 52], senha: [520, 52], botao: [584, 56], ou: 656, outro: [678, 50] },
  chama: [430, 88, 230],
  lua: [1448, 27, 64],
  fumaca: [1530, 232],
  emblema: [1118, 178, 150],
  ceu: [1250, 0, 1672, 110],
};
const CELULAR: Layout = {
  nome: 'celular',
  w: 941,
  h: 1672,
  fundo: '/arte/login/fundo-celular.webp',
  u: 1.36,
  painel: { x: 176, y: 716, w: 598, h: 480 },
  moldura: { x: 155, y: 355, w: 635, h: 935 },
  campo: { x: 217, w: 506 },
  entrar: { email: [740, 79], senha: [839, 79], botao: [941, 80], ou: 1063, outro: [1097, 69] },
  criar: { nome: [736, 68], email: [818, 68], senha: [900, 68], botao: [984, 72], ou: 1076, outro: [1097, 69] },
  chama: [300, 215, 260],
  lua: [720, 85, 72],
  fumaca: [855, 470],
  emblema: [470, 478, 175],
  ceu: [505, 0, 941, 250],
};

const SVG = (corpo: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${corpo}</svg>`;
const ICONE = {
  email: SVG('<rect x="3" y="5.5" width="18" height="13"/><path d="M3.5 6.5 12 13l8.5-6.5"/>'),
  senha: SVG('<rect x="5" y="10.5" width="14" height="10"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2.5"/>'),
  nome: SVG('<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20.5c1.2-4 4-5.6 7.5-5.6s6.3 1.6 7.5 5.6"/>'),
  ver: SVG('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>'),
  esconder: SVG('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/><path d="M4 20 20 4"/>'),
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EntradaOpcoes {
  /** manda a mensagem da conta para o servidor */
  enviar(m: ClientMsg): void;
  /** o jogador sem ficha quer só ver o tabuleiro */
  verMesa(): void;
  /** sair da conta (o jogador sem ficha) */
  sairDaConta(): void;
}

export class Entrada {
  readonly el: HTMLElement;
  private palco: HTMLElement;
  private fundo: HTMLImageElement;
  private fx: HTMLElement;
  private poeira: HTMLCanvasElement;
  private painel: HTMLFormElement;
  private campos: Record<'nome' | 'email' | 'senha', { caixa: HTMLElement; input: HTMLInputElement }>;
  private olho: HTMLButtonElement;
  private principal: HTMLButtonElement;
  private outro: HTMLButtonElement;
  private ou: HTMLElement;
  private erroEl: HTMLElement;
  private msg: HTMLElement;
  private layout: Layout | null = null;
  private modo: Modo = 'entrar';
  private esperando = false;
  private quadro = 0;
  private particulas: { x: number; y: number; vx: number; vy: number; r: number; f: number; quente: boolean }[] = [];
  private erroTempo = 0;
  private aoRedimensionar = () => this.ajustar();

  constructor(private op: EntradaOpcoes) {
    this.fundo = h('img', { class: 'ent-fundo', alt: '', draggable: 'false' });
    this.poeira = h('canvas', { class: 'ent-poeira', 'aria-hidden': 'true' });
    this.fx = h('div', { class: 'ent-fx', 'aria-hidden': 'true' });
    const campo = (qual: 'nome' | 'email' | 'senha', rotulo: string, tipo: string, auto: string) => {
      const input = h('input', { class: 'ent-input', type: tipo, placeholder: rotulo, 'aria-label': rotulo, autocomplete: auto, spellcheck: 'false', autocapitalize: 'off' });
      const caixa = h('label', { class: `ent-campo ent-${qual}` }, h('span', { class: 'ent-ic', html: ICONE[qual] }), input);
      return { caixa, input };
    };
    this.campos = {
      nome: campo('nome', 'Nome do personagem', 'text', 'nickname'),
      email: campo('email', 'E-mail', 'email', 'username email'),
      senha: campo('senha', 'Senha', 'password', 'current-password'),
    };
    this.campos.nome.input.autocapitalize = 'words';
    this.olho = h('button', { class: 'ent-olho', type: 'button', 'aria-label': 'Mostrar a senha', html: ICONE.ver, onclick: () => this.alternarSenha() });
    this.campos.senha.caixa.append(this.olho);
    this.principal = h('button', { class: 'ent-botao ent-principal', type: 'submit' }, h('span', { class: 'ent-rotulo' }, 'ENTRAR'));
    this.outro = h('button', { class: 'ent-botao ent-outro', type: 'button', onclick: () => this.trocar() }, h('span', { class: 'ent-rotulo' }, 'CRIAR CONTA'));
    this.ou = h('div', { class: 'ent-ou' }, h('span', null, 'ou'));
    this.erroEl = h('div', { class: 'ent-erro', role: 'alert' });
    this.msg = h('div', { class: 'ent-msg' });
    this.painel = h(
      'form',
      { class: 'ent-painel', novalidate: true, onsubmit: (e: Event) => (e.preventDefault(), this.enviar()) },
      this.campos.nome.caixa,
      this.campos.email.caixa,
      this.campos.senha.caixa,
      this.msg,
      this.principal,
      this.ou,
      this.erroEl,
      this.outro,
    );
    this.palco = h('div', { class: 'ent-palco' }, this.fundo, this.fx, this.poeira, this.painel);
    this.el = h('div', { class: 'entrada', role: 'dialog', 'aria-label': 'Entrar no CRONA' }, this.palco);
    this.fundo.addEventListener('load', () => this.el.classList.add('pronta'), { once: false });
  }

  /** Mostra a tela (com um aviso, se houver: "sua sessão terminou"). */
  mostrar(aviso?: string) {
    if (!this.el.isConnected) document.body.append(this.el);
    addEventListener('resize', this.aoRedimensionar);
    this.ajustar();
    this.definirModo('entrar', false);
    if (aviso) this.erro(aviso);
    this.animar();
    // no computador, o cursor já no e-mail
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => this.campos.email.input.focus(), 700);
  }

  /** A conta respondeu com erro: a mensagem e o painel tremendo. */
  erro(texto: string) {
    this.esperar(false);
    this.erroEl.textContent = texto;
    this.painel.classList.add('com-erro');
    this.painel.classList.remove('treme');
    void this.painel.offsetWidth;
    this.painel.classList.add('treme');
    clearTimeout(this.erroTempo);
    this.erroTempo = window.setTimeout(() => this.painel.classList.remove('com-erro'), 6000);
  }

  /** A conta abriu: o botão diz quem entrou enquanto o tabuleiro carrega. */
  sucesso(nome: string) {
    this.esperando = true;
    this.painel.classList.remove('com-erro');
    this.painel.classList.add('certo');
    this.rotulo(this.principal, `BEM-VINDO, ${nome.toUpperCase()}`);
  }

  /** O jogador entrou, mas a conta dele ainda não tem ficha. */
  semFicha(nome: string) {
    this.esperar(false);
    this.painel.classList.remove('certo');
    this.msg.replaceChildren(
      h('b', null, `Olá, ${nome}!`),
      h('span', null, 'Sua conta ainda não tem ficha. Peça ao mestre o link da sua ficha e abra-o neste aparelho: ela fica ligada à sua conta.'),
    );
    this.definirModo('semFicha');
  }

  /** O tabuleiro abriu: a tela some devagar. */
  sair() {
    if (!this.el.isConnected || this.el.classList.contains('saindo')) return;
    this.el.classList.add('saindo');
    setTimeout(() => this.destruir(), 900);
  }

  destruir() {
    cancelAnimationFrame(this.quadro);
    removeEventListener('resize', this.aoRedimensionar);
    this.el.remove();
  }

  // ---------------------------------------------------------------- formulário
  private enviar() {
    if (this.esperando) return;
    if (this.modo === 'semFicha') return this.op.verMesa();
    const nome = this.campos.nome.input.value.trim();
    const email = this.campos.email.input.value.trim();
    const senha = this.campos.senha.input.value;
    if (this.modo === 'criar') {
      if (nome.length < 2) return this.erro('Escreva o seu nome (pelo menos 2 letras).'), this.campos.nome.input.focus();
      if (!EMAIL_RE.test(email)) return this.erro('Confira o e-mail.'), this.campos.email.input.focus();
      if (senha.length < 6) return this.erro('A senha precisa de pelo menos 6 caracteres.'), this.campos.senha.input.focus();
    } else {
      // entrar: o e-mail ou o nome da conta, e a senha (a regra dos 6 caracteres é só para criar)
      if (email.length < 2) return this.erro('Escreva o e-mail ou o nome da conta.'), this.campos.email.input.focus();
      if (!senha) return this.erro('Escreva a senha.'), this.campos.senha.input.focus();
    }
    this.esperar(true);
    this.op.enviar(this.modo === 'criar' ? { t: 'contaCriar', nome, email, senha } : { t: 'contaEntrar', email, senha });
  }

  private trocar() {
    if (this.esperando) return;
    if (this.modo === 'semFicha') return this.op.sairDaConta();
    this.definirModo(this.modo === 'entrar' ? 'criar' : 'entrar');
  }

  private esperar(sim: boolean) {
    this.esperando = sim;
    this.painel.classList.toggle('esperando', sim);
    for (const c of Object.values(this.campos)) c.input.disabled = sim;
    if (sim) this.rotulo(this.principal, this.modo === 'criar' ? 'CRIANDO...' : 'ENTRANDO...');
    else this.definirModo(this.modo, false);
  }

  private alternarSenha() {
    const i = this.campos.senha.input;
    const ver = i.type === 'password';
    i.type = ver ? 'text' : 'password';
    this.olho.innerHTML = ver ? ICONE.esconder : ICONE.ver;
    this.olho.setAttribute('aria-label', ver ? 'Esconder a senha' : 'Mostrar a senha');
    i.focus();
  }

  private rotulo(b: HTMLButtonElement, texto: string) {
    b.querySelector('.ent-rotulo')!.textContent = texto;
  }

  /** Põe cada peça no lugar do modo (com transição quando muda). */
  private definirModo(modo: Modo, animar = true) {
    const mudou = modo !== this.modo;
    this.modo = modo;
    const L = this.layout;
    if (!L) return;
    this.painel.classList.toggle('sem-transicao', !animar);
    this.painel.dataset.modo = modo;
    const pos = modo === 'criar' ? L.criar : L.entrar;
    const p = L.painel;
    const caixa = (el: HTMLElement, c: Caixa, visivel = true) => {
      el.style.left = `${L.campo.x - p.x}px`;
      el.style.width = `${L.campo.w}px`;
      el.style.top = `${c[0] - p.y}px`;
      el.style.height = `${c[1]}px`;
      el.classList.toggle('oculto', !visivel);
    };
    caixa(this.campos.nome.caixa, modo === 'criar' ? L.criar.nome : L.entrar.email, modo === 'criar');
    caixa(this.campos.email.caixa, pos.email, modo !== 'semFicha');
    caixa(this.campos.senha.caixa, pos.senha, modo !== 'semFicha');
    caixa(this.msg, [pos.email[0], pos.senha[0] + pos.senha[1] - pos.email[0]], modo === 'semFicha');
    caixa(this.principal, pos.botao);
    caixa(this.outro, pos.outro);
    this.ou.style.top = this.erroEl.style.top = `${pos.ou - p.y}px`;
    this.ou.style.left = this.erroEl.style.left = `${L.campo.x - p.x}px`;
    this.ou.style.width = this.erroEl.style.width = `${L.campo.w}px`;
    this.campos.senha.input.autocomplete = modo === 'criar' ? 'new-password' : 'current-password';
    // para entrar, vale o e-mail ou o nome da conta
    const email = this.campos.email.input;
    email.placeholder = modo === 'criar' ? 'E-mail' : 'E-mail ou nome';
    email.setAttribute('aria-label', email.placeholder);
    email.type = modo === 'criar' ? 'email' : 'text';
    if (!this.esperando) {
      this.rotulo(this.principal, modo === 'criar' ? 'CRIAR CONTA' : modo === 'semFicha' ? 'VER O TABULEIRO' : 'ENTRAR');
      this.rotulo(this.outro, modo === 'criar' ? 'JÁ TENHO CONTA' : modo === 'semFicha' ? 'SAIR DA CONTA' : 'CRIAR CONTA');
    }
    if (mudou && animar) {
      this.painel.classList.remove('troca');
      void this.painel.offsetWidth;
      this.painel.classList.add('troca');
      if (modo === 'criar') setTimeout(() => this.campos.nome.input.focus(), 250);
      this.painel.classList.remove('com-erro');
    }
  }

  // ---------------------------------------------------------------- palco
  /** Escala a arte para cobrir a tela, com o painel inteiro à vista. */
  private ajustar() {
    const vw = innerWidth;
    const vh = innerHeight;
    // no celular, o teclado aberto encolhe a tela: não refaz o palco enquanto digita
    const digitando = document.activeElement instanceof HTMLInputElement && this.painel.contains(document.activeElement);
    const L = vw / vh < 0.85 ? CELULAR : COMPUTADOR;
    if (digitando && L === this.layout) return;
    if (L !== this.layout) this.montar(L);
    const m = L.moldura;
    let s = Math.max(vw / L.w, vh / L.h);
    s = Math.min(s, (vw - 16) / m.w, (vh - 16) / m.h);
    let tx = (vw - L.w * s) / 2;
    let ty = (vh - L.h * s) / 2;
    // sem mostrar o vazio além da arte
    if (L.w * s >= vw) tx = Math.min(0, Math.max(vw - L.w * s, tx));
    if (L.h * s >= vh) ty = Math.min(0, Math.max(vh - L.h * s, ty));
    // o painel inteiro à vista
    const x0 = m.x * s + tx;
    const x1 = (m.x + m.w) * s + tx;
    const y0 = m.y * s + ty;
    const y1 = (m.y + m.h) * s + ty;
    if (x1 > vw - 8) tx -= x1 - (vw - 8);
    else if (x0 < 8) tx += 8 - x0;
    if (y1 > vh - 8) ty -= y1 - (vh - 8);
    else if (y0 < 8) ty += 8 - y0;
    this.palco.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }

  /** Monta o palco de um tamanho (computador ou celular). */
  private montar(L: Layout) {
    this.layout = L;
    this.el.dataset.layout = L.nome;
    this.palco.style.width = `${L.w}px`;
    this.palco.style.height = `${L.h}px`;
    this.palco.style.setProperty('--u', String(L.u));
    this.fundo.src = L.fundo;
    this.poeira.width = L.w;
    this.poeira.height = L.h;
    const p = L.painel;
    Object.assign(this.painel.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${p.h}px` });
    this.montarFx(L);
    this.definirModo(this.modo, false);
  }

  /** As luzes e os enfeites que mexem, nos lugares da arte. */
  private montarFx(L: Layout) {
    const em = (x: number, y: number, cls: string, extra = '') => h('i', { class: cls, style: `left:${x}px;top:${y}px;${extra}` });
    const [cx, cy, cr] = L.chama;
    const [lx, ly, lr] = L.lua;
    const [ex, ey, er] = L.emblema;
    const [fx, fy] = L.fumaca;
    const [c0, c1, c2, c3] = L.ceu;
    const nodes: HTMLElement[] = [
      // a luz da vela na mesa inteira, e o halo em volta da chama
      em(cx, cy, 'fx-luz-vela', `--r:${cr * 2.6}px`),
      em(cx, cy, 'fx-chama', `--r:${cr}px`),
      em(lx, ly, 'fx-lua', `--r:${lr}px`),
      em(ex, ey, 'fx-emblema', `--r:${er}px`),
    ];
    // o céu piscando
    for (let i = 0; i < 16; i++) {
      const x = c0 + Math.random() * (c2 - c0);
      const y = c1 + Math.random() * (c3 - c1);
      nodes.push(em(x, y, 'fx-estrela', `animation-delay:${(Math.random() * 4).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 2.6).toFixed(2)}s`));
    }
    // a fumaça da caneca
    for (let i = 0; i < 4; i++) nodes.push(em(fx + (i % 2 ? 10 : -6) * L.u, fy, 'fx-fumaca', `animation-delay:${(i * 1.25).toFixed(2)}s`));
    // as faíscas em volta do emblema
    const faiscas = 7;
    for (let i = 0; i < faiscas; i++) {
      const a = (i / faiscas) * Math.PI * 2 + 0.4;
      const d = er * (0.72 + (i % 3) * 0.14);
      nodes.push(em(ex + Math.cos(a) * d * 1.08, ey + Math.sin(a) * d * 0.72, 'fx-faisca', `animation-delay:${(i * 0.53).toFixed(2)}s`));
    }
    this.fx.replaceChildren(...nodes);
    // a poeira na luz: mais perto da vela, mais quente
    this.particulas = Array.from({ length: L.nome === 'celular' ? 46 : 60 }, () => {
      const perto = Math.random() < 0.55;
      return {
        x: perto ? cx + (Math.random() - 0.5) * cr * 3 : Math.random() * L.w,
        y: perto ? cy + Math.random() * cr * 2.2 : Math.random() * L.h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.05 - Math.random() * 0.12,
        r: 0.8 + Math.random() * 1.8,
        f: Math.random() * Math.PI * 2,
        quente: perto,
      };
    });
  }

  /** A poeira flutuando (pausa quando a aba some ou pede menos movimento). */
  private animar() {
    const ctx = this.poeira.getContext('2d');
    if (!ctx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let antes = performance.now();
    const passo = (agora: number) => {
      this.quadro = requestAnimationFrame(passo);
      const L = this.layout;
      if (!L || document.hidden) return;
      const dt = Math.min(50, agora - antes) / 16.7;
      antes = agora;
      ctx.clearRect(0, 0, L.w, L.h);
      for (const p of this.particulas) {
        p.f += 0.02 * dt;
        p.x += (p.vx + Math.sin(p.f) * 0.08) * dt;
        p.y += p.vy * dt;
        if (p.y < -10 || p.x < -10 || p.x > L.w + 10) {
          p.y = L.h * (0.35 + Math.random() * 0.65);
          p.x = Math.random() * L.w;
        }
        const luz = 0.35 + 0.35 * Math.sin(p.f * 1.7);
        ctx.fillStyle = p.quente ? `rgba(255, 196, 120, ${0.25 + luz * 0.45})` : `rgba(210, 205, 230, ${0.08 + luz * 0.2})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    this.quadro = requestAnimationFrame(passo);
  }
}
