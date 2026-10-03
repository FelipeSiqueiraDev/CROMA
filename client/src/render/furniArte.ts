import { Z_PER_M, type FurniDef } from '@croma/shared';
import { rgba } from './color';
import { N, V, type FVisual } from './furniKit';
import { iso } from './iso';
import { drawFlame, type LBox, type Painter } from './painter';

/**
 * Móveis com arte (imagem) no lugar do desenho por código. A lista fica em
 * /arte/mobiliario/moveis.json (quem escreve é o scripts/3d/moveis.py). Cada móvel
 * tem uma imagem por giro (desenhado nos 4 giros) ou, quando só existe o desenho
 * da frente, a frente e as costas, que o espelho vira nos outros dois giros. Cada
 * imagem diz o ponto que cai no chão (a âncora). O tapete é uma imagem vista de cima,
 * deitada no chão. Enquanto a imagem não chega, fica o desenho por código.
 *
 * Outros modelos do mesmo móvel ("gun_table~b", "gun_table~c": outra arma em cima, outros
 * papéis na mesa) entram sozinhos: cada peça sorteia o seu pelo número dela, sempre o mesmo.
 * A arte de um material ("portal@metal") vale nos cômodos daquele piso (a porta de metal do
 * arsenal e da prisão).
 */

export interface VistaArte {
  arquivo: string;
  /** a âncora, em pixels da imagem */
  ax: number;
  ay: number;
  /** de que lado da imagem fica a face principal (a frente ou as costas) */
  lado?: 'esquerda' | 'direita';
  /** a âncora é a quina da frente da base (caixas) ou o centro da base (planta, cadeira) */
  ancora?: 'quina' | 'centro';
}

export interface MovelArte {
  /** pixels do tabuleiro (zoom 1) por pixel da imagem */
  escala: number;
  /** desenhado nos 4 giros: a imagem de cada um, como ela é (sem espelho) */
  giros?: Partial<Record<'0' | '2' | '4' | '6', VistaArte>>;
  frente?: VistaArte;
  costas?: VistaArte;
  /** onde o móvel fica no cômodo, para a ordem de quem fica na frente (a lâmpada, presa no teto): [u0, u1, v0, v1, z0, z1], z em metros */
  caixa?: LBox;
  /** o brilho da lâmpada acesa, em pixels da imagem (o centro e o raio) */
  brilho?: { x: number; y: number; r: number; cor?: string };
  /** tapete: a imagem vista de cima, em pé (a largura dela na lateral do móvel, a altura no comprimento) */
  chao?: { arquivo: string };
  /** item de parede: a vista presa na parede da direita ('r') e na da esquerda ('l'), e os outros estados ('r-1'...); a âncora é o ponto de encosto */
  parede?: Record<string, VistaArte>;
  /**
   * tela acesa: o brilho em cada giro que mostra a tela, em pixels da imagem. modo 'cores'
   * (o fliperama: troca de cor a cada ms), 'pulso' (o monitor do leito: bate como um
   * coração a cada ms) ou 'tv' (o computador: tremula entre as cores). forca: o brilho máximo.
   */
  tela?: { cores: string[]; ms: number; modo?: 'cores' | 'pulso' | 'tv'; forca?: number; giros: Partial<Record<'0' | '2' | '4' | '6', { x: number; y: number; r: number }>> };
  /** a lâmpada de tubo falha de vez em quando (duas piscadas rápidas) */
  falha?: boolean;
  /** chamas que mexem, por giro ou parede ('r', 'l'): [x, y, altura] em pixels da imagem (a base da chama) */
  chamas?: Record<string, [number, number, number][]>;
  /** a lâmpada no fio balança de leve: o ângulo máximo e o tempo de uma ida e volta */
  pendulo?: { graus: number; ms: number };
  /** os outros estados do móvel (o armário aberto, o candelabro apagado): as vistas de cada um, no lugar das do estado 0 */
  estados?: Record<string, { giros: Partial<Record<'0' | '2' | '4' | '6', VistaArte>>; chamas?: Record<string, [number, number, number][]> }>;
  /** só os giros que têm vista usam a arte; nos outros fica o desenho por código (a porta nas paredes da frente) */
  soGiros?: boolean;
  /** o tamanho de verdade, em metros: [largura ao longo da frente, fundo, altura] (o mapa tático desenha o móvel nele) */
  real?: [number, number, number];
  /** encostado no fundo da casa (a prateleira na parede), em vez de no meio */
  encosta?: boolean;
  /** o móvel visto de cima (mapa tático), com a frente para baixo; a imagem tem a pegada inteira, 128 px por casa (scripts/3d/cima.py) */
  cima?: { arquivo: string };
  /** os estados que mudam o que se vê de cima (o baú aberto) */
  cimaEstados?: Record<string, { arquivo: string }>;
}

/** A tela de TV ligada (item de parede): treme de leve entre as cores, bem mais fraca que o fliperama. */
interface TelaParede {
  cores: string[];
  forca: number;
  paredes: Partial<Record<'l' | 'r', { x: number; y: number; r: number }>>;
}

interface Imagens {
  normal: HTMLCanvasElement;
  espelho: HTMLCanvasElement;
}

let lista: Record<string, MovelArte> | null = null;
/** os outros modelos de cada móvel: "gun_table" -> ["gun_table~b", "gun_table~c"] */
const modelos = new Map<string, string[]>();
const imagens = new Map<string, Imagens | 'carregando' | 'erro'>();

// o tabuleiro se pinta de novo a cada quadro: a arte aparece assim que chega
void fetch('/arte/mobiliario/moveis.json')
  .then((r) => (r.ok ? (r.json() as Promise<Record<string, MovelArte>>) : {}))
  .then((j) => {
    lista = j;
    for (const chave of Object.keys(j).sort()) {
      const i = chave.indexOf('~');
      if (i > 0) modelos.set(chave.slice(0, i), [...(modelos.get(chave.slice(0, i)) ?? []), chave]);
    }
  })
  .catch(() => (lista = {}));

/** O material de cada piso, para a arte de material (a porta de metal no arsenal e na prisão). */
const MATERIAL: Record<string, string> = { metal: 'metal', cela: 'metal' };

/**
 * Qual arte vale para esta peça: a do material do cômodo, se houver; senão um dos modelos do
 * móvel, sorteado pelo número da peça (o mesmo sempre, e vizinhos costumam sair diferentes).
 */
export function chaveDaArte(defId: string, seed: number, piso?: string): string {
  if (!lista) return defId;
  const mat = piso ? MATERIAL[piso] : undefined;
  if (mat && lista[`${defId}@${mat}`]) return `${defId}@${mat}`;
  const outros = modelos.get(defId);
  if (!outros?.length) return defId;
  const i = (Math.imul(seed | 0, 2654435761) >>> 0) % (outros.length + 1);
  return i === 0 ? defId : outros[i - 1];
}

function pronta(arquivo: string): Imagens | null {
  const url = `/arte/mobiliario/${arquivo}`;
  const c = imagens.get(url);
  if (c && c !== 'carregando' && c !== 'erro') return c;
  if (!c) {
    imagens.set(url, 'carregando');
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const normal = document.createElement('canvas');
      normal.width = img.naturalWidth;
      normal.height = img.naturalHeight;
      normal.getContext('2d')!.drawImage(img, 0, 0);
      const espelho = document.createElement('canvas');
      espelho.width = normal.width;
      espelho.height = normal.height;
      const g = espelho.getContext('2d')!;
      g.translate(normal.width, 0);
      g.scale(-1, 1);
      g.drawImage(normal, 0, 0);
      imagens.set(url, { normal, espelho });
    };
    img.onerror = () => imagens.set(url, 'erro');
    img.src = url;
  }
  return null;
}

/**
 * O móvel desenhado com a arte dele (uma caixa só, do tamanho do móvel, para a
 * ordem de quem fica na frente), ou null se ele não tem arte (ou ela ainda não chegou).
 * As luzes continuam as do desenho por código. state: o estado do móvel (0 = aceso).
 */
export function visualComArte(def: FurniDef, base: FVisual, state = 0, seed = 0, rot?: number, piso?: string): FVisual | null {
  const salvo = lista?.[chaveDaArte(def.id, seed, piso)];
  if (!salvo) return null;
  // a porta: arte só nas paredes do fundo; nas da frente (que não aparecem), a soleira do desenho por código
  if (salvo.soGiros && rot !== undefined && !salvo.giros?.[String(rot) as '4']) return null;
  let a: MovelArte = salvo;
  const alto = Math.max(0.1, def.height / Z_PER_M);
  const caixa: LBox = a.caixa ?? [0, def.depth, 0, def.width, 0, alto];
  if (a.chao) {
    const img = pronta(a.chao.arquivo);
    if (!img) return null;
    return V([N(caixa, (p) => deitar(p, img.normal))], base.lights);
  }
  if (a.giros) {
    // outro estado com as vistas dele (o armário aberto): no lugar das do estado 0
    const outro = state ? a.estados?.[String(state)] : undefined;
    if (outro) a = { ...a, giros: outro.giros, chamas: outro.chamas };
    // todas as vistas precisam ter chegado: senão o móvel troca de cara ao girar
    const prontas: Partial<Record<string, Imagens>> = {};
    for (const [g, v] of Object.entries(a.giros ?? {})) {
      const img = v && pronta(v.arquivo);
      if (!img) return null;
      prontas[g] = img;
    }
    const aceso = state === 0;
    // a tela tinge a luz que ela joga no cômodo e bate junto com ela
    const cor = a.tela && aceso ? corDaTela(a.tela, seed) : null;
    const forca = a.tela && aceso ? forcaDaTela(a.tela, seed) : 1;
    let luzes = cor ? base.lights.map((L) => ({ ...L, color: cor, intensity: L.intensity * (0.75 + 0.25 * forca) })) : base.lights;
    // a lâmpada de tubo que falha: a luz cai junto com o tubo
    const falha = a.falha && aceso ? falhaDoTubo(seed) : 1;
    if (falha < 1) luzes = luzes.map((L) => ({ ...L, intensity: L.intensity * falha }));
    // a lâmpada balança no fio: a luz vai junto, de leve, e respira um pouco
    const ang = a.pendulo ? balanco(a.pendulo, seed) : 0;
    if (a.pendulo) {
      const braco = Math.max(0.2, (a.caixa?.[5] ?? 2.75) - 1.95);
      // para o lado na tela (u e v juntos, no giro 0 da lâmpada): o fundo dela vai para o lado contrário do giro
      const s = (-Math.sin(ang) * braco) / (0.68 * Math.SQRT2);
      const respira = 1 + 0.03 * Math.sin(performance.now() / 1700 + seed);
      luzes = luzes.map((L) => ({ ...L, u: L.u + s, v: L.v + s, intensity: L.intensity * respira }));
    }
    return V([N(caixa, (p) => desenharGiro(p, a, prontas, aceso ? (a.brilho?.cor ?? def.colors[0] ?? '#ffd98a') : null, cor, ang, forca, falha))], luzes);
  }
  if (!a.frente) return null;
  const frente = pronta(a.frente.arquivo);
  const costas = a.costas ? pronta(a.costas.arquivo) : null;
  if (!frente || (a.costas && !costas)) return null;
  return V([N(caixa, (p) => desenhar(p, a, frente, costas))], base.lights);
}

/** O tapete (ou a rosa dos ventos) visto de cima, para o mapa tático; null sem arte ou enquanto ela carrega. */
export function imagemDoChao(defId: string): HTMLCanvasElement | null {
  const a = lista?.[defId];
  return a?.chao ? (pronta(a.chao.arquivo)?.normal ?? null) : null;
}

/** O móvel visto de cima (mapa tático), no estado dele; null sem arte ou enquanto ela carrega. */
export function imagemDeCima(defId: string, estado = 0): HTMLCanvasElement | null {
  const a = lista?.[defId];
  const arquivo = a?.cimaEstados?.[String(estado)]?.arquivo ?? a?.cima?.arquivo;
  return arquivo ? (pronta(arquivo)?.normal ?? null) : null;
}

/** O tamanho de verdade do móvel (metros) e se ele encosta no fundo da casa, pela arte dele; null sem arte. */
export function tamanhoReal(defId: string): { real: [number, number, number]; encosta: boolean } | null {
  const a = lista?.[defId];
  return a?.real ? { real: a.real, encosta: !!a.encosta } : null;
}

/**
 * Item de parede com arte: a vista daquela parede (e do estado), com o ponto onde ele
 * encosta na parede em (x, y). false se ele não tem arte (ou ela ainda não chegou).
 */
export function desenharParedeComArte(ctx: CanvasRenderingContext2D, defId: string, parede: 'l' | 'r', state: number, x: number, y: number, seed = 0): boolean {
  const a = lista?.[chaveDaArte(defId, seed)];
  if (!a?.parede) return false;
  const vista = (state ? a.parede[`${parede}-${state}`] : undefined) ?? a.parede[parede];
  if (!vista) return false;
  const img = pronta(vista.arquivo);
  if (!img) return false;
  const k = a.escala;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img.normal, x - vista.ax * k, y - vista.ay * k, img.normal.width * k, img.normal.height * k);
  ctx.restore();
  const tela = (a as MovelArte & { tela?: TelaParede }).tela as TelaParede | undefined;
  const spot = tela?.paredes?.[parede];
  if (tela && spot && !state) telaDeTv(ctx, tela, spot, x - vista.ax * k, y - vista.ay * k, k, seed);
  if (!state) acenderChamas(ctx, a.chamas?.[parede], x - vista.ax * k, y - vista.ay * k, k, seed);
  return true;
}

/** Onde a imagem vai na tela: o canto de cima à esquerda e o tamanho. */
function lugar(p: Painter, img: HTMLCanvasElement, ax: number, ay: number, k: number, centro: boolean) {
  const w = p.m.box([0, p.m.D, 0, p.m.W, 0, 0]);
  // a âncora: a quina da frente da base (a de baixo na tela) ou o centro da base
  const [bx, by] = centro ? iso((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, w.z0) : iso(w.x1, w.y1, w.z0);
  return { x: bx - ax * k, y: by - ay * k, w: img.width * k, h: img.height * k };
}

function pintar(p: Painter, img: HTMLCanvasElement, ax: number, ay: number, k: number, centro: boolean) {
  const r = lugar(p, img, ax, ay, k, centro);
  const ctx = p.ctx;
  const suave = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, r.x, r.y, r.w, r.h);
  ctx.imageSmoothingEnabled = suave;
  return r;
}

/** O ângulo da lâmpada no fio agora (em radianos): cada uma no seu tempo, pela semente. */
function balanco(p: NonNullable<MovelArte['pendulo']>, seed: number): number {
  const t = performance.now() / p.ms;
  return ((p.graus * Math.PI) / 180) * Math.sin(t * Math.PI * 2 + seed * 1.7) * (0.75 + 0.25 * Math.sin(t * 0.37 + seed));
}

/** Um número de 0 a 1 que muda aos saltos suaves com o tempo (a cena da TV trocando). */
function ruido(t: number, passo: number, seed: number): number {
  const h = (n: number) => {
    const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const i = Math.floor(t / passo);
  const f = (t / passo) % 1;
  const s = Math.min(1, f / 0.25);
  return h(i - 1) + (h(i) - h(i - 1)) * s * s * (3 - 2 * s);
}

/**
 * Item de parede com tela ligada (a TV): um brilho fraco, que muda de força e de cor
 * como a imagem mudando, em volta da tela daquela vista. (x, y): a tela, na tela.
 */
function telaDeTv(ctx: CanvasRenderingContext2D, t: TelaParede, spot: { x: number; y: number; r: number }, x0: number, y0: number, k: number, seed: number) {
  const agora = performance.now();
  const forca = t.forca * (0.55 + 0.45 * ruido(agora, 640, seed)) * (0.92 + 0.08 * Math.sin(agora / 41));
  const i = Math.floor(ruido(agora, 2300, seed + 5) * t.cores.length) % t.cores.length;
  const cor = t.cores[i];
  const cx = x0 + spot.x * k;
  const cy = y0 + spot.y * k;
  const rr = spot.r * k;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
  g.addColorStop(0, rgba(cor, forca));
  g.addColorStop(1, rgba(cor, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  ctx.restore();
}

/** O tubo que falha: quase sempre 1; de vez em quando (cada lâmpada no seu tempo) cai duas vezes, rápido. */
function falhaDoTubo(seed: number): number {
  const periodo = 9000 + (seed % 7) * 1700;
  const f = (performance.now() + seed * 3331) % periodo;
  return (f > 120 && f < 190) || (f > 260 && f < 300) ? 0.25 : 1;
}

/** A força da tela agora (0 a 1): o coração batendo (lub-dub), a TV tremendo ou a tela firme. */
function forcaDaTela(t: NonNullable<MovelArte['tela']>, seed: number): number {
  const agora = performance.now();
  if (t.modo === 'pulso') {
    const f = (agora + seed * 97) % t.ms;
    const bate = Math.exp(-((f / 60) ** 2)) + 0.55 * Math.exp(-(((f - 170) / 55) ** 2));
    return Math.min(1, 0.3 + 0.7 * bate);
  }
  if (t.modo === 'tv') return 0.55 + 0.45 * ruido(agora, t.ms, seed);
  return 0.85 + 0.1 * Math.sin(agora / 97) + 0.05 * Math.sin(agora / 23);
}

/** A cor da tela agora: cada cor fica um tempo e passa depressa para a próxima, como as peças do Tetris. */
function corDaTela(t: NonNullable<MovelArte['tela']>, seed = 0): string {
  if (t.modo === 'pulso') return t.cores[0];
  if (t.modo === 'tv') return t.cores[Math.floor(ruido(performance.now(), t.ms * 3, seed + 3) * t.cores.length) % t.cores.length];
  const n = t.cores.length;
  const f = performance.now() / t.ms;
  const i = Math.floor(f) % n;
  const s = Math.min(1, Math.max(0, ((f % 1) - 0.7) / 0.3));
  return misturar(t.cores[i], t.cores[(i + 1) % n], s * s * (3 - 2 * s));
}

function misturar(a: string, b: string, t: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const canal = (sh: number) => Math.round(((ca >> sh) & 255) * (1 - t) + ((cb >> sh) & 255) * t);
  return '#' + ((canal(16) << 16) | (canal(8) << 8) | canal(0)).toString(16).padStart(6, '0');
}

/** As chamas do desenho, mexendo: uma chama animada por cima de cada chama parada (cada uma no seu tempo). */
function acenderChamas(ctx: CanvasRenderingContext2D, chamas: [number, number, number][] | undefined, x0: number, y0: number, k: number, seed: number) {
  if (!chamas?.length) return;
  const t = performance.now() / 1000;
  ctx.save();
  chamas.forEach(([cx, cy, alt], i) => drawFlame(ctx, x0 + cx * k, y0 + cy * k, (alt * k) / 7, t + seed * 7.3 + i * 2.1));
  ctx.restore();
}

/** Um brilho redondo somado à imagem, em pixels da imagem. */
function brilhar(p: Painter, r: { x: number; y: number }, k: number, x: number, y: number, raio: number, cor: string, forca: number) {
  const ctx = p.ctx;
  const cx = r.x + x * k;
  const cy = r.y + y * k;
  const rr = raio * k;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
  grad.addColorStop(0, rgba(cor, forca));
  grad.addColorStop(1, rgba(cor, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = grad;
  ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  ctx.restore();
}

/** Desenhado nos 4 giros: a imagem do giro, como ela é (e o brilho da lâmpada acesa e da tela). ang: o balanço da lâmpada. */
function desenharGiro(p: Painter, a: MovelArte, prontas: Partial<Record<string, Imagens>>, luz: string | null, corTela: string | null = null, ang = 0, forcaTela = 1, falha = 1) {
  const g = String(p.m.rot);
  const vista = a.giros?.[g as '4'] ?? a.giros?.['4'] ?? Object.values(a.giros ?? {})[0];
  const imgs = prontas[g] ?? prontas['4'] ?? Object.values(prontas)[0];
  if (!vista || !imgs) return;
  // a lâmpada do teto acesa joga um feixe até o chão: sem teto no desenho, é ele que mostra que ela está lá no alto
  if (a.caixa && a.brilho && luz && p.power > 0.1) {
    const r0 = lugar(p, imgs.normal, vista.ax, vista.ay, a.escala, vista.ancora === 'centro');
    feixe(p, r0.x + a.brilho.x * a.escala, r0.y + a.brilho.y * a.escala, a.brilho.r * a.escala, luz, p.power * falha);
  }
  if (ang) {
    // gira em volta do ponto onde o fio prende (o meio de cima da imagem)
    const r0 = lugar(p, imgs.normal, vista.ax, vista.ay, a.escala, vista.ancora === 'centro');
    const px = r0.x + r0.w / 2;
    p.ctx.save();
    p.ctx.translate(px, r0.y);
    p.ctx.rotate(ang);
    p.ctx.translate(-px, -r0.y);
  }
  const r = pintar(p, imgs.normal, vista.ax, vista.ay, a.escala, vista.ancora === 'centro');
  if (a.brilho && luz && p.power > 0.1) brilhar(p, r, a.escala, a.brilho.x, a.brilho.y, a.brilho.r, luz, 0.55 * p.power * falha);
  const tela = a.tela?.giros[g as '4'];
  if (tela && corTela && p.power > 0.1) brilhar(p, r, a.escala, tela.x, tela.y, tela.r, corTela, (a.tela?.forca ?? 0.42) * forcaTela * p.power);
  if (luz) acenderChamas(p.ctx, a.chamas?.[g], r.x, r.y, a.escala, p.seed ?? 0);
  if (ang) p.ctx.restore();
}

/** O feixe de luz da lâmpada (x, y, o brilho dela na tela) até o chão embaixo, no meio da casa: suave, some antes de chegar. */
function feixe(p: Painter, x: number, y: number, raio: number, cor: string, forca: number) {
  const [bx, by] = p.m.p(0.5, 0.5, 0);
  if (by <= y) return;
  const topo = Math.min(18, raio * 0.45);
  const base = topo * 3.2;
  const ctx = p.ctx;
  const g = ctx.createLinearGradient(0, y, 0, by + base * 0.4);
  g.addColorStop(0, rgba(cor, 0.26 * forca));
  g.addColorStop(0.7, rgba(cor, 0.09 * forca));
  g.addColorStop(1, rgba(cor, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - topo, y);
  ctx.lineTo(x + topo, y);
  ctx.lineTo(bx + base, by);
  ctx.quadraticCurveTo(bx, by + base * 0.5, bx - base, by);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** O tapete: a imagem vista de cima deitada no chão do móvel (a largura na lateral, a altura no comprimento). */
function deitar(p: Painter, img: HTMLCanvasElement) {
  const [x0, y0] = p.m.p(0, 0, 0);
  const [xv, yv] = p.m.p(0, p.m.W, 0);
  const [xu, yu] = p.m.p(p.m.D, 0, 0);
  const ctx = p.ctx;
  ctx.save();
  ctx.transform((xv - x0) / img.width, (yv - y0) / img.width, (xu - x0) / img.height, (yu - y0) / img.height, x0, y0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** Só a frente (e as costas): o espelho faz os outros dois giros. */
function desenhar(p: Painter, a: MovelArte, frente: Imagens, costas: Imagens | null) {
  const rot = p.m.rot;
  // giros 2 e 4 mostram a frente (2: na face de baixo à direita; 4: à esquerda); 0 e 6, as costas
  const deFrente = rot === 2 || rot === 4;
  const usarCostas = !deFrente && !!costas && !!a.costas;
  const vista = usarCostas ? a.costas! : a.frente!;
  const imgs = usarCostas ? costas! : frente;
  const ladoNaTela = rot === 2 || rot === 6 ? 'direita' : 'esquerda';
  const espelhar = (vista.lado ?? 'esquerda') !== ladoNaTela;
  const img = espelhar ? imgs.espelho : imgs.normal;
  const ax = espelhar ? img.width - vista.ax : vista.ax;
  pintar(p, img, ax, vista.ay, a.escala, vista.ancora === 'centro');
}
