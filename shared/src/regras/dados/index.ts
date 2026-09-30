// Todos os catálogos juntos, com busca por id. `disponivel()` tira o conteúdo
// do Sobrevivendo ao Horror quando a campanha não usa o livro.
import type { Arma, Classe, ClasseId, Equipamento, ItemAmaldicoado, Maldicao, Modificacao, Origem, Patente, Pericia, PericiaId, Poder, PoderParanormal, Protecao, Ref, Ritual, Trilha } from '../tipos';
import { ITENS_AMALDICOADOS, MALDICOES } from './amaldicoados';
import { ARMAS } from './armas';
import { CLASSES } from './classes';
import { CONDICOES } from './condicoes';
import { EQUIPAMENTOS } from './equipamentos';
import { MODIFICACOES } from './modificacoes';
import { ORIGENS } from './origens';
import { PODERES_PARANORMAIS } from './paranormais';
import { PATENTES } from './patentes';
import { PERICIAS } from './pericias';
import { PODERES } from './poderes';
import { PROTECOES } from './protecoes';
import { RITUAIS } from './rituais';
import { TRILHAS } from './trilhas';

export { ELEMENTO_OPRIME, MALDICAO_PP_MINIMO, PRECO_MALDICAO } from './amaldicoados';
export { ESCALAS_CLASSE } from './classes';
export type { Condicao, EfeitoTabuleiro, GrupoCondicao } from './condicoes';
export { BONUS_GRAU, PENALIDADE_CARGA, PENALIDADE_SEM_KIT } from './pericias';
export { CREDITOS, ITENS_NEX_ZERO, PP_POR_MISSAO, patentePorPP } from './patentes';

export const CATALOGO = {
  classes: CLASSES,
  pericias: PERICIAS,
  origens: ORIGENS,
  trilhas: TRILHAS,
  poderes: PODERES,
  paranormais: PODERES_PARANORMAIS,
  rituais: RITUAIS,
  armas: ARMAS,
  protecoes: PROTECOES,
  equipamentos: EQUIPAMENTOS,
  modificacoes: MODIFICACOES,
  amaldicoados: ITENS_AMALDICOADOS,
  maldicoes: MALDICOES,
  patentes: PATENTES,
  condicoes: CONDICOES,
};

function indice<T extends { id: string }>(lista: T[]): Map<string, T> {
  return new Map(lista.map((x) => [x.id, x]));
}

const IDX = {
  classes: indice(CLASSES),
  pericias: indice(PERICIAS),
  origens: indice(ORIGENS),
  trilhas: indice(TRILHAS),
  poderes: indice(PODERES),
  paranormais: indice(PODERES_PARANORMAIS),
  rituais: indice(RITUAIS),
  armas: indice(ARMAS),
  protecoes: indice(PROTECOES),
  equipamentos: indice(EQUIPAMENTOS),
  modificacoes: indice(MODIFICACOES),
  amaldicoados: indice(ITENS_AMALDICOADOS),
  maldicoes: indice(MALDICOES),
  patentes: indice(PATENTES),
  condicoes: indice(CONDICOES),
};

export const classe = (id: ClasseId): Classe => IDX.classes.get(id)!;
export const pericia = (id: PericiaId): Pericia => IDX.pericias.get(id)!;
export const origem = (id: string): Origem | undefined => IDX.origens.get(id);
export const trilha = (id: string): Trilha | undefined => IDX.trilhas.get(id);
export const poder = (id: string): Poder | undefined => IDX.poderes.get(id);
export const paranormal = (id: string): PoderParanormal | undefined => IDX.paranormais.get(id);
export const ritual = (id: string): Ritual | undefined => IDX.rituais.get(id);
export const arma = (id: string): Arma | undefined => IDX.armas.get(id);
export const protecao = (id: string): Protecao | undefined => IDX.protecoes.get(id);
export const equipamento = (id: string): Equipamento | undefined => IDX.equipamentos.get(id);
export const modificacao = (id: string): Modificacao | undefined => IDX.modificacoes.get(id);
export const amaldicoado = (id: string): ItemAmaldicoado | undefined => IDX.amaldicoados.get(id);
export const maldicao = (id: string): Maldicao | undefined => IDX.maldicoes.get(id);
export const patente = (id: string): Patente | undefined => IDX.patentes.get(id);
export const condicao = (id: string) => IDX.condicoes.get(id);

/** O item está disponível com as regras da campanha (SaH ligado ou não)? */
export function disponivel(x: { ref: Ref }, regras: { sah: boolean }): boolean {
  return x.ref.fonte !== 'SaH' || regras.sah;
}
