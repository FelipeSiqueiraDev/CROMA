import { Z_PER_M, type FurniDef } from '@croma/shared';
import { N, V, type FVisual } from './furniKit';
import { iso } from './iso';
import type { Painter } from './painter';

/**
 * Móveis com arte (imagem) no lugar do desenho por código. A lista fica em
 * /arte/mobiliario/moveis.json (quem escreve é o scripts/3d/moveis.py). Cada móvel
 * tem uma imagem por giro (desenhado nos 4 giros) ou, quando só existe o desenho
 * da frente, a frente e as costas, que o espelho vira nos outros dois giros. Cada
 * imagem diz o ponto que cai no chão (a âncora). Enquanto a imagem não chega, fica
 * o desenho por código.
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
  const alto = Math.max(0.1, def.height / Z_PER_M);
  if (a.giros) {
    // todas as vistas precisam ter chegado: senão o móvel troca de cara ao girar
    const prontas: Partial<Record<string, Imagens>> = {};
    for (const [g, v] of Object.entries(a.giros)) {
      const img = v && pronta(v.arquivo);
      if (!img) return null;
      prontas[g] = img;
    }
    return V([N([0, def.depth, 0, def.width, 0, alto], (p) => desenharGiro(p, a, prontas))], base.lights);
  }
  if (!a.frente) return null;
  const frente = pronta(a.frente.arquivo);
  const costas = a.costas ? pronta(a.costas.arquivo) : null;
  if (!frente || (a.costas && !costas)) return null;
  return V([N([0, def.depth, 0, def.width, 0, alto], (p) => desenhar(p, a, frente, costas))], base.lights);
}

function pintar(p: Painter, img: HTMLCanvasElement, ax: number, ay: number, k: number, centro: boolean) {
  const w = p.m.box([0, p.m.D, 0, p.m.W, 0, 0]);
  // a âncora: a quina da frente da base (a de baixo na tela) ou o centro da base
  const [bx, by] = centro ? iso((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, w.z0) : iso(w.x1, w.y1, w.z0);
  const ctx = p.ctx;
  const suave = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, bx - ax * k, by - ay * k, img.width * k, img.height * k);
  ctx.imageSmoothingEnabled = suave;
}

/** Desenhado nos 4 giros: a imagem do giro, como ela é. */
function desenharGiro(p: Painter, a: MovelArte, prontas: Partial<Record<string, Imagens>>) {
  const g = String(p.m.rot);
  const vista = a.giros?.[g as '4'] ?? a.giros?.['4'];
  const imgs = prontas[g] ?? prontas['4'];
  if (!vista || !imgs) return;
  pintar(p, imgs.normal, vista.ax, vista.ay, a.escala, vista.ancora === 'centro');
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
