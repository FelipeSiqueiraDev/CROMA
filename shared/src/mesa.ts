import type { Point } from './room';

/**
 * Ferramentas do mestre para mostrar a cena na mesa (docs/FERRAMENTAS-DA-MESA.md): o ponto de
 * atenção, o desenho rápido por cima do mapa e a névoa revelada aos poucos.
 */

// ---------------------------------------------------------------------------
// marcas rápidas: o ponto de atenção e o desenho (somem sozinhos)

/** Formato do traço: à mão livre, uma seta (de A até B) ou um círculo (do meio até a borda). */
export type FormaTraco = 'livre' | 'seta' | 'circulo';
export const FORMAS_TRACO: FormaTraco[] = ['livre', 'seta', 'circulo'];

/** A cor do giz. */
export type CorGiz = 'giz' | 'sangue' | 'ouro';
export const CORES_GIZ: CorGiz[] = ['giz', 'sangue', 'ouro'];

/**
 * Uma marca do mestre no tabuleiro, em casas (com fração: o meio da casa 3,4 é 3,5 / 4,5), no chão.
 * `apagar` tira os desenhos que ainda estão na tela.
 */
export type MarcaMesa =
  | { tipo: 'ponto'; x: number; y: number }
  | { tipo: 'traco'; forma: FormaTraco; cor: CorGiz; pts: [number, number][] }
  | { tipo: 'apagar' };

/** Quanto tempo cada marca fica na tela. */
export const MARCA_PONTO_MS = 4500;
export const MARCA_TRACO_MS = 9000;
/** pontos de um traço à mão livre, no máximo */
export const MAX_PONTOS_TRACO = 400;

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const preso = (v: number, a: number, b: number) => Math.round(Math.max(a, Math.min(b, v)) * 100) / 100;

/** A marca que veio do mestre, conferida (dentro da planta w × h), ou null. */
export function sanitizeMarca(m: unknown, w: number, h: number): MarcaMesa | null {
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  if (o.tipo === 'apagar') return { tipo: 'apagar' };
  if (o.tipo === 'ponto') {
    if (!num(o.x) || !num(o.y)) return null;
    return { tipo: 'ponto', x: preso(o.x, 0, w), y: preso(o.y, 0, h) };
  }
  if (o.tipo !== 'traco' || !FORMAS_TRACO.includes(o.forma as FormaTraco) || !CORES_GIZ.includes(o.cor as CorGiz) || !Array.isArray(o.pts)) return null;
  const forma = o.forma as FormaTraco;
  const pts: [number, number][] = [];
  for (const p of o.pts.slice(0, MAX_PONTOS_TRACO)) {
    if (!Array.isArray(p) || !num(p[0]) || !num(p[1])) return null;
    pts.push([preso(p[0], -1, w + 1), preso(p[1], -1, h + 1)]);
  }
  // a seta e o círculo são dois pontos; o traço livre, pelo menos dois
  if (forma === 'livre' ? pts.length < 2 : pts.length !== 2) return null;
  return { tipo: 'traco', forma, cor: o.cor as CorGiz, pts };
}

// ---------------------------------------------------------------------------
// o mapa improvisado: uma imagem que vira cena

/** O tamanho do mapa improvisado, em casas (0,75 m): de um lado e no total. */
export const MAPA_MIN = 4;
export const MAPA_MAX = 160;
export const MAPA_AREA_MAX = 9000;
/** a imagem enviada pelo mestre (POST /api/mapas) */
export const URL_MAPA_RE = /^\/uploads\/[0-9a-f]{20}\.(png|jpg|webp)$/;

/** Largura e altura do mapa, em casas, a partir do tamanho da imagem e de quantos quadrados de 1,5 m ela tem de largura. */
export function tamanhoDoMapa(quadrados: number, imgW: number, imgH: number): { largura: number; altura: number } {
  const largura = Math.max(MAPA_MIN, Math.min(MAPA_MAX, Math.round(quadrados * 2)));
  let altura = Math.max(MAPA_MIN, Math.min(MAPA_MAX, Math.round((largura * imgH) / Math.max(1, imgW))));
  if (largura * altura > MAPA_AREA_MAX) altura = Math.max(MAPA_MIN, Math.floor(MAPA_AREA_MAX / largura));
  return { largura, altura };
}

// ---------------------------------------------------------------------------
// a névoa revelada aos poucos

/**
 * A névoa da cena: as casas que a mesa vê. O resto fica coberto na mesa (o chão, os móveis e as
 * peças que estiverem lá); o mestre vê tudo, com o que está escondido marcado.
 */
export interface NevoaCena {
  /** uma letra por casa, linha por linha da planta: '1' = a mesa vê, '0' = escondida */
  vista: string;
  /** a largura da planta quando a névoa foi feita (mudou a planta, a névoa começa de novo) */
  largura: number;
  /** abre sozinha em volta dos agentes, conforme eles andam */
  auto?: boolean;
  /** o raio da abertura automática, em casas */
  raio?: number;
}

export const NEVOA_RAIO_PADRAO = 5;
export const NEVOA_RAIO_MAX = 20;
/** casas pintadas numa mensagem, no máximo */
export const MAX_CASAS_PINCEL = 2000;

/**
 * O que o mestre faz com a névoa: ligar (a cena toda coberta) ou desligar, mostrar tudo ou
 * esconder tudo, pintar casas (mostrar ou esconder) e a abertura automática em volta dos agentes.
 */
export type AcaoNevoa =
  | { acao: 'ligar' | 'desligar' | 'tudo' | 'nada' }
  | { acao: 'pintar'; casas: [number, number][]; vista: boolean }
  | { acao: 'auto'; auto: boolean; raio?: number };

/** A névoa cobrindo a cena inteira. */
export function nevoaNova(w: number, h: number, auto = true): NevoaCena {
  return { vista: '0'.repeat(w * h), largura: w, ...(auto ? { auto: true } : {}) };
}

/** A névoa é desta planta (o mesmo tamanho)? */
export function nevoaServe(n: NevoaCena | undefined | null, w: number, h: number): n is NevoaCena {
  return !!n && n.largura === w && n.vista.length === w * h && /^[01]*$/.test(n.vista);
}

/** A mesa vê a casa? (fora da planta, sim: não tem nada lá para esconder) */
export function casaVista(n: NevoaCena, x: number, y: number): boolean {
  const w = n.largura;
  const h = n.vista.length / w;
  if (x < 0 || y < 0 || x >= w || y >= h) return true;
  return n.vista.charCodeAt(y * w + x) === 49;
}

/** Mostra (vista = true) ou esconde as casas. Devolve a névoa nova, ou a mesma se nada mudou. */
export function pintarNevoa(n: NevoaCena, casas: Iterable<Point>, vista: boolean): NevoaCena {
  const w = n.largura;
  const h = n.vista.length / w;
  let s: string[] | null = null;
  const c = vista ? '1' : '0';
  for (const p of casas) {
    if (!Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) continue;
    const i = p.y * w + p.x;
    if (n.vista[i] === c) continue;
    s ??= n.vista.split('');
    s[i] = c;
  }
  return s ? { ...n, vista: s.join('') } : n;
}

/** As casas no círculo de raio r em volta de (x, y). */
export function casasEmVolta(x: number, y: number, r: number): Point[] {
  const out: Point[] = [];
  const rr = r * r + r;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= rr) out.push({ x: x + dx, y: y + dy });
  return out;
}

/** Quantas casas do chão (as que `chao` aceita) a mesa vê, e quantas são. */
export function contarNevoa(n: NevoaCena, chao: (x: number, y: number) => boolean): { vistas: number; total: number } {
  const w = n.largura;
  const h = n.vista.length / w;
  let vistas = 0;
  let total = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!chao(x, y)) continue;
      total++;
      if (n.vista.charCodeAt(y * w + x) === 49) vistas++;
    }
  return { vistas, total };
}
