/**
 * Quantos d20 um teste rola e com qual dado fica (LR p. 11, 14, 75; COMBATE.md,
 * seção 2.1). `dados` é o atributo mais os dados ganhos; `penalidade`, os
 * dados perdidos (0 ou negativo). A ficha e o combate guardam os dois
 * separados porque o livro faz a conta com eles separados.
 */
export interface Rolagem {
  /** quantos d20 se rolam */
  dados: number;
  /** fica com o maior ou com o menor */
  fica: 'maior' | 'menor';
}

export function rolagem(dados: number, penalidade = 0): Rolagem {
  const perdidos = -Math.min(0, penalidade);
  const n = dados - perdidos;
  if (n >= 1) return { dados: n, fica: 'maior' };
  // a penalidade deixaria menos de 1 dado: rola como se ela fosse bônus e fica o pior (LR p. 11)
  if (dados >= 1) return { dados: dados + perdidos, fica: 'menor' };
  // atributo 0: 2d20 e fica o pior (LR p. 14, 75); cada dado perdido soma mais um (DC-1)
  return { dados: 2 + perdidos - dados, fica: 'menor' };
}
