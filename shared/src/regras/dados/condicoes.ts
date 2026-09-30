// Condições do livro (LR p. 310–311), com um resumo nosso do efeito e o que
// muda no tabuleiro. Machucado, morrendo, perturbado e enlouquecendo saem da
// ficha sozinhos (vitals.ts); as outras o mestre marca.
import type { Ref } from '../tipos';

export type GrupoCondicao = 'medo' | 'mental' | 'paralisia' | 'sentidos' | 'fadiga' | 'dano' | 'outra';
/** O que a condição faz com a peça no tabuleiro. */
export type EfeitoTabuleiro = 'deitada' | 'naoAnda' | 'metade' | 'semAcoes' | 'foge' | 'aoAcaso' | 'fogo' | 'sangue';

export interface Condicao {
  id: string;
  nome: string;
  ref: Ref;
  grupo: GrupoCondicao;
  resumo: string;
  /** vem da ficha (PV/SAN), não se marca à mão */
  automatica?: boolean;
  /** condições que esta inclui (ex.: exausto inclui lento) */
  inclui?: string[];
  tabuleiro?: EfeitoTabuleiro[];
}

const R = { fonte: 'LR' as const, pagina: 310 };
const R2 = { fonte: 'LR' as const, pagina: 311 };

export const CONDICOES: Condicao[] = [
  { id: 'machucado', nome: 'Machucado', ref: { fonte: 'LR', pagina: 88 }, grupo: 'dano', automatica: true, resumo: 'PV abaixo da metade. Sem efeito próprio; é requisito de poderes e criaturas.' },
  { id: 'morrendo', nome: 'Morrendo', ref: { fonte: 'LR', pagina: 88 }, grupo: 'dano', automatica: true, inclui: ['inconsciente'], resumo: '0 PV. Morre ao começar 3 turnos assim na mesma cena.', tabuleiro: ['deitada', 'semAcoes'] },
  { id: 'perturbado', nome: 'Perturbado', ref: { fonte: 'LR', pagina: 111 }, grupo: 'medo', automatica: true, resumo: 'SAN abaixo da metade. Sem penalidade própria.' },
  { id: 'enlouquecendo', nome: 'Enlouquecendo', ref: { fonte: 'LR', pagina: 111 }, grupo: 'medo', automatica: true, resumo: 'SAN 0. Fica insano ao começar 3 turnos assim na mesma cena.' },
  { id: 'abalado', nome: 'Abalado', ref: R, grupo: 'medo', resumo: '−1d20 em testes. Abalado de novo: apavorado.' },
  { id: 'agarrado', nome: 'Agarrado', ref: R, grupo: 'paralisia', inclui: ['desprevenido', 'imovel'], resumo: 'Desprevenido e imóvel; só ataca com arma leve, com −1d20.', tabuleiro: ['naoAnda'] },
  { id: 'alquebrado', nome: 'Alquebrado', ref: R, grupo: 'mental', resumo: '+1 PE no custo de habilidades e rituais.' },
  { id: 'apavorado', nome: 'Apavorado', ref: R, grupo: 'medo', resumo: '−2d20 em perícias; foge da fonte do medo.', tabuleiro: ['foge'] },
  { id: 'asfixiado', nome: 'Asfixiado', ref: R, grupo: 'outra', resumo: 'Aguenta Vigor + 1 rodadas; depois fica morrendo.' },
  { id: 'atordoado', nome: 'Atordoado', ref: R, grupo: 'mental', inclui: ['desprevenido'], resumo: 'Desprevenido e sem ações.', tabuleiro: ['semAcoes'] },
  { id: 'caido', nome: 'Caído', ref: R, grupo: 'outra', resumo: '−2d20 no ataque corpo a corpo; Defesa −5 contra corpo a corpo e +5 contra distância; anda 1,5 m.', tabuleiro: ['deitada'] },
  { id: 'cego', nome: 'Cego', ref: R, grupo: 'sentidos', inclui: ['desprevenido', 'lento'], resumo: 'Desprevenido e lento; −2d20 em perícias de Agilidade e Força.', tabuleiro: ['metade'] },
  { id: 'confuso', nome: 'Confuso', ref: R, grupo: 'mental', resumo: '1d6 por turno: anda ao acaso, fica parado, ataca o mais próximo ou a condição acaba.', tabuleiro: ['aoAcaso'] },
  { id: 'debilitado', nome: 'Debilitado', ref: R, grupo: 'fadiga', resumo: '−2d20 em Agilidade, Força e Vigor. De novo: inconsciente.' },
  { id: 'desprevenido', nome: 'Desprevenido', ref: R, grupo: 'outra', resumo: 'Defesa −5 e −1d20 em Reflexos.' },
  { id: 'doente', nome: 'Doente', ref: R, grupo: 'outra', resumo: 'Sob o efeito de uma doença.' },
  { id: 'em-chamas', nome: 'Em chamas', ref: R, grupo: 'dano', resumo: '1d6 de fogo por turno; apaga com ação padrão ou água.', tabuleiro: ['fogo'] },
  { id: 'enjoado', nome: 'Enjoado', ref: R, grupo: 'outra', resumo: 'Só uma ação padrão ou de movimento por rodada.' },
  { id: 'enredado', nome: 'Enredado', ref: R, grupo: 'paralisia', inclui: ['lento', 'vulneravel'], resumo: 'Lento e vulnerável; −1d20 no ataque.', tabuleiro: ['metade'] },
  { id: 'envenenado', nome: 'Envenenado', ref: R, grupo: 'outra', resumo: 'Efeito conforme o veneno.' },
  { id: 'esmorecido', nome: 'Esmorecido', ref: R, grupo: 'mental', resumo: '−2d20 em Intelecto e Presença.' },
  { id: 'exausto', nome: 'Exausto', ref: R, grupo: 'fadiga', inclui: ['debilitado', 'lento', 'vulneravel'], resumo: 'Debilitado, lento e vulnerável. De novo: inconsciente.', tabuleiro: ['metade'] },
  { id: 'fascinado', nome: 'Fascinado', ref: R, grupo: 'mental', resumo: '−2d20 em Percepção; só observa.' },
  { id: 'fatigado', nome: 'Fatigado', ref: R, grupo: 'fadiga', inclui: ['fraco', 'vulneravel'], resumo: 'Fraco e vulnerável. De novo: exausto.' },
  { id: 'fraco', nome: 'Fraco', ref: R, grupo: 'fadiga', resumo: '−1d20 em Agilidade, Força e Vigor. De novo: debilitado.' },
  { id: 'frustrado', nome: 'Frustrado', ref: R, grupo: 'mental', resumo: '−1d20 em Intelecto e Presença. De novo: esmorecido.' },
  { id: 'imovel', nome: 'Imóvel', ref: R, grupo: 'paralisia', resumo: 'Deslocamento 0.', tabuleiro: ['naoAnda'] },
  { id: 'inconsciente', nome: 'Inconsciente', ref: R, grupo: 'outra', inclui: ['indefeso'], resumo: 'Indefeso, sem ações nem reações.', tabuleiro: ['deitada', 'semAcoes'] },
  { id: 'indefeso', nome: 'Indefeso', ref: R, grupo: 'outra', inclui: ['desprevenido'], resumo: 'Defesa −10; falha em Reflexos; pode sofrer golpe de misericórdia.' },
  { id: 'lento', nome: 'Lento', ref: R2, grupo: 'paralisia', resumo: 'Metade do deslocamento; sem correr nem investida.', tabuleiro: ['metade'] },
  { id: 'ofuscado', nome: 'Ofuscado', ref: R2, grupo: 'sentidos', resumo: '−1d20 no ataque e em Percepção.' },
  { id: 'paralisado', nome: 'Paralisado', ref: R2, grupo: 'paralisia', inclui: ['imovel', 'indefeso'], resumo: 'Imóvel e indefeso; só ações mentais.', tabuleiro: ['naoAnda', 'semAcoes'] },
  { id: 'pasmo', nome: 'Pasmo', ref: R2, grupo: 'mental', resumo: 'Sem ações.', tabuleiro: ['semAcoes'] },
  { id: 'petrificado', nome: 'Petrificado', ref: R2, grupo: 'paralisia', inclui: ['inconsciente'], resumo: 'Inconsciente, com RD 10.', tabuleiro: ['naoAnda', 'semAcoes'] },
  { id: 'sangrando', nome: 'Sangrando', ref: R2, grupo: 'dano', resumo: 'Vigor DT 20 no começo do turno; se falhar, perde 1d6 PV.', tabuleiro: ['sangue'] },
  { id: 'surdo', nome: 'Surdo', ref: R2, grupo: 'sentidos', resumo: '−2d20 em Iniciativa; sem Percepção pela audição.' },
  { id: 'surpreendido', nome: 'Surpreendido', ref: R2, grupo: 'outra', inclui: ['desprevenido'], resumo: 'Desprevenido e sem ações.', tabuleiro: ['semAcoes'] },
  { id: 'vulneravel', nome: 'Vulnerável', ref: R2, grupo: 'outra', resumo: 'Defesa −5.' },
];
