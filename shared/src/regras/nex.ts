/**
 * O que cada NEX dá (LR p. 23 e Tab. 1.3, 1.4 e 1.5). Iguais para as três
 * classes, fora as habilidades fixas de cada uma e os rituais do ocultista.
 */
import type { ClasseId, Nex } from './tipos';
import { NEX_LISTA } from './tipos';

/** Um ganho de um patamar de NEX. Os que pedem escolha viram pendência até serem escolhidos. */
export type Ganho =
  /** NEX 0%: pessoa comum (atributos com 3 pontos, origem, perícias) */
  | { tipo: 'pessoaComum' }
  /** NEX 5% de quem começou como pessoa comum: escolhe a classe, +1 ponto de atributo (até 3) e as perícias da classe */
  | { tipo: 'treinamento' }
  /** NEX 5% de quem já começa agente: atributos, origem, classe e perícias */
  | { tipo: 'criacao' }
  /** escolhe a trilha e recebe a 1ª habilidade (10%) */
  | { tipo: 'trilha' }
  /** 2ª, 3ª ou 4ª habilidade da trilha (40, 65, 99%) */
  | { tipo: 'habilidadeTrilha' }
  /** um poder de classe (15, 30, 45, 60, 75, 90%) */
  | { tipo: 'poder' }
  /** +1 num atributo, até 5 (20, 50, 80, 95%) */
  | { tipo: 'atributo' }
  /** perícias treinadas sobem um grau (35, 70%) */
  | { tipo: 'grau' }
  /** poder de classe ou 1º poder de outra trilha da classe (50%) */
  | { tipo: 'versatilidade' }
  /** escolhe o elemento de afinidade (50%) */
  | { tipo: 'afinidade' }
  /** ocultista: um ritual novo de círculo que já possa lançar (todo NEX a partir de 10%) */
  | { tipo: 'ritual' };

const PODER: Nex[] = [15, 30, 45, 60, 75, 90];
const ATRIBUTO: Nex[] = [20, 50, 80, 95];
const GRAU: Nex[] = [35, 70];
const TRILHA: Nex[] = [40, 65, 99];

/** Patamar do NEX: 5% = 1 … 95% = 19, 99% = 20 (e 0% = 0). */
export function patamar(nex: Nex): number {
  if (nex === 0) return 0;
  if (nex === 99) return 20;
  return nex / 5;
}

/** Limite de PE por turno (Tab. 1.2). A pessoa comum usa 1. */
export function limitePeDoNex(nex: Nex): number {
  return Math.max(1, patamar(nex));
}

/** NEX de 0 (ou 5) até `ate`, na ordem. */
export function nexAte(ate: Nex, desde: Nex = 0): Nex[] {
  return NEX_LISTA.filter((n) => n >= desde && n <= ate);
}

/** Próximo NEX (99% não tem próximo). */
export function proximoNex(nex: Nex): Nex | null {
  const i = NEX_LISTA.indexOf(nex);
  return i >= 0 && i < NEX_LISTA.length - 1 ? NEX_LISTA[i + 1] : null;
}

/**
 * Ganhos de um NEX para uma classe. `comecouMundano`: a ficha começou em
 * NEX 0% (então o 5% é o treinamento, não a criação).
 */
export function ganhosDoNex(classe: ClasseId | null, nex: Nex, comecouMundano: boolean): Ganho[] {
  if (nex === 0) return [{ tipo: 'pessoaComum' }];
  const out: Ganho[] = [];
  if (nex === 5) out.push(comecouMundano ? { tipo: 'treinamento' } : { tipo: 'criacao' });
  if (nex === 10) out.push({ tipo: 'trilha' });
  if (TRILHA.includes(nex)) out.push({ tipo: 'habilidadeTrilha' });
  if (PODER.includes(nex)) out.push({ tipo: 'poder' });
  if (ATRIBUTO.includes(nex)) out.push({ tipo: 'atributo' });
  if (GRAU.includes(nex)) out.push({ tipo: 'grau' });
  if (nex === 50) out.push({ tipo: 'versatilidade' }, { tipo: 'afinidade' });
  if (classe === 'ocultista' && nex >= 10) out.push({ tipo: 'ritual' });
  return out;
}

/** Quantos patamares passaram de `a` (exclusivo) até `b` (inclusivo). */
export function patamaresEntre(a: Nex, b: Nex): number {
  return Math.max(0, patamar(b) - patamar(a));
}
