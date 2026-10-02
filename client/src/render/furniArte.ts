import { Z_PER_M, type FurniDef } from '@croma/shared';
import { N, V, type FVisual } from './furniKit';
import { iso } from './iso';
import type { Painter } from './painter';

/**
 * Móveis com arte (imagem) no lugar do desenho por código. A lista fica em
 * /arte/mobiliario/moveis.json (quem escreve é o scripts/3d/moveis.py): para
 * cada móvel, a imagem da frente e, se houver, a das costas, com o ponto da
 * imagem que cai no chão (a âncora). O espelho da imagem dá os outros dois giros.
 * Enquanto a imagem não chega, fica o desenho por código.
 */

export interface VistaArte {
  arquivo: string;
  /** a âncora, em pixels da imagem */
  ax: number;
  ay: number;
  /** de que lado da imagem fica a face principal (a frente ou as costas) */
  lado: 'esquerda' | 'direita';
  /** a âncora é a quina da frente da base (caixas) ou o centro da base (planta, cadeira) */
  ancora?: 'quina' | 'centro';
}

export interface MovelArte {
  /** pixels do tabuleiro (zoom 1) por pixel da imagem */
  escala: number;
  frente: VistaArte;
  costas?: VistaArte;
}

interface Imagens {
  normal: HTMLCanvasElement;
  espelho: HTMLCanvasElement;
}

let lista: Record<string, MovelArte> | null = null;
const imagens = new Map<string, Imagens | 'carregando' | 'erro'>();

// o tabuleiro se pinta de novo a cada quadro: a arte aparece assim que chega
void fetch('/arte/mobiliario/moveis.json')
  .then((r) => (r.ok ? (r.json() as Promise<Record<string, MovelArte>>) : {}))
  .then((j) => (lista = j))
  .catch(() => (lista = {}));

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
 * As luzes continuam as do desenho por código.
 */
export function visualComArte(def: FurniDef, base: FVisual): FVisual | null {
  const a = lista?.[def.id];
  if (!a) return null;
  const frente = pronta(a.frente.arquivo);
  const costas = a.costas ? pronta(a.costas.arquivo) : null;
  if (!frente || (a.costas && !costas)) return null;
  const alto = Math.max(0.1, def.height / Z_PER_M);
  const no = N([0, def.depth, 0, def.width, 0, alto], (p) => desenhar(p, a, frente, costas));
  return V([no], base.lights);
}

function desenhar(p: Painter, a: MovelArte, frente: Imagens, costas: Imagens | null) {
  const m = p.m;
  const w = m.box([0, m.D, 0, m.W, 0, 0]);
  const rot = m.rot;
  // giros 2 e 4 mostram a frente (2: na face de baixo à direita; 4: à esquerda); 0 e 6, as costas
  const deFrente = rot === 2 || rot === 4;
  const usarCostas = !deFrente && !!costas && !!a.costas;
  const vista = usarCostas ? a.costas! : a.frente;
  const imgs = usarCostas ? costas! : frente;
  const ladoNaTela = rot === 2 || rot === 6 ? 'direita' : 'esquerda';
  const espelhar = vista.lado !== ladoNaTela;
  const img = espelhar ? imgs.espelho : imgs.normal;
  const ax = espelhar ? img.width - vista.ax : vista.ax;
  // a âncora: a quina da frente da base (a de baixo na tela) ou o centro da base
  const [bx, by] = vista.ancora === 'centro' ? iso((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, w.z0) : iso(w.x1, w.y1, w.z0);
  const k = a.escala;
  const ctx = p.ctx;
  const suave = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, bx - ax * k, by - vista.ay * k, img.width * k, img.height * k);
  ctx.imageSmoothingEnabled = suave;
}
