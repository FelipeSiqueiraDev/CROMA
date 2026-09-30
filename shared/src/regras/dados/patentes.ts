// Patentes e pontos de prestígio (LR p. 51–53, Tab. 3.1 na p. 52 e Tab. 3.2 na
// p. 53), conferidas com as tabelas e com os exemplos do livro (operador = três
// itens I e um II; 58 PP = agente especial, com mais um item II e um III).
import type { Patente } from '../tipos';

const LR52 = { fonte: 'LR' as const, pagina: 52 };

export const PATENTES: Patente[] = [
  { id: 'recruta', nome: 'Recruta', ref: LR52, pp: 0, credito: 'baixo', itens: { 1: 2, 2: 0, 3: 0, 4: 0 } },
  { id: 'operador', nome: 'Operador', ref: LR52, pp: 20, credito: 'medio', itens: { 1: 3, 2: 1, 3: 0, 4: 0 } },
  { id: 'agente-especial', nome: 'Agente especial', ref: LR52, pp: 50, credito: 'medio', itens: { 1: 3, 2: 2, 3: 1, 4: 0 } },
  { id: 'oficial-de-operacoes', nome: 'Oficial de operações', ref: LR52, pp: 100, credito: 'alto', itens: { 1: 3, 2: 3, 3: 2, 4: 1 } },
  { id: 'agente-de-elite', nome: 'Agente de elite', ref: LR52, pp: 200, credito: 'ilimitado', itens: { 1: 3, 2: 3, 3: 3, 4: 2 } },
];

/** Níveis de crédito, do menor para o maior (LR p. 52). */
export const CREDITOS = ['baixo', 'medio', 'alto', 'ilimitado'] as const;

/** PP ganhos ou perdidos no fim de uma missão (LR p. 53, Tab. 3.2). */
export const PP_POR_MISSAO = {
  casoResolvido: 10,
  pistaExtra: 2,
  inocenteMorto: -2,
  agenteMorto: -5,
} as const;

/** Pessoa comum (NEX 0%): sem patente; um item de categoria I e quantos de categoria 0 quiser (LR p. 171). */
export const ITENS_NEX_ZERO = { 1: 1, 2: 0, 3: 0, 4: 0 } as const;

/** Patente pelos pontos de prestígio. */
export function patentePorPP(pp: number): Patente {
  let atual = PATENTES[0];
  for (const p of PATENTES) if (pp >= p.pp) atual = p;
  return atual;
}
