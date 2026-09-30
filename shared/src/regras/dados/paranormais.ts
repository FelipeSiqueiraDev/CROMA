// Poderes paranormais (vêm do poder de classe Transcender): os 22 do livro de
// regras (LR p. 114–116) e os 8 do Sobrevivendo ao Horror (descrições em
// SaH p. 46–47, Tabela 1.6 na p. 47), vindos do C.R.I.S e conferidos nas
// páginas do SaH.
//
// Identidade do produto: só nome, números e página, sem descrição.
// - "Elemento N" = já ter N OUTROS poderes paranormais do mesmo elemento (LR p. 114).
// - `afinidade`: o poder tem a linha "Afinidade"; com afinidade no elemento
//   dele, pode ser escolhido de novo, e os efeitos com `afinidade` passam a
//   valer (somados aos do poder).
// - Aprender Ritual e Resistir a <Elemento> não têm elemento fixo: contam
//   como poder do elemento do ritual / do elemento escolhido (LR p. 114). No
//   campo `elemento` ficam com 'medo', que nenhum poder paranormal tem, só
//   para marcar isso: o elemento de verdade sai da escolha.
import type { Elemento, PoderParanormal, Ref } from '../tipos';

const LR = (pagina: number): Ref => ({ fonte: 'LR', pagina });
const SAH = (pagina: number): Ref => ({ fonte: 'SaH', pagina });

const QUATRO_ELEMENTOS: Elemento[] = ['conhecimento', 'energia', 'morte', 'sangue'];
const MACHUCADO = 'enquanto machucado; Agilidade ou Força, à escolha a cada vez';

export const PODERES_PARANORMAIS: PoderParanormal[] = [
  // ================= livro de regras =================
  // Repetível, mas só aprende assim um total de rituais igual ao Intelecto
  // (LR p. 119). Círculo do ritual pelo NEX na hora da escolha: 1º; até 2º a
  // partir de 45%; até 3º a partir de 75% (nunca 4º). Cada vez também pode
  // trocar um ritual que já conhece por outro.
  { id: 'aprender-ritual', nome: 'Aprender Ritual', ref: LR(114), elemento: 'medo', elementoDaEscolha: true, repetivel: true, escolha: { tipo: 'ritual', qtd: 1, circuloMax: 3 } },
  { id: 'resistir-a-elemento', nome: 'Resistir a <Elemento>', ref: LR(114), elemento: 'medo', elementoDaEscolha: true, afinidade: true, escolha: { tipo: 'elemento', de: QUATRO_ELEMENTOS }, efeitos: [{ alvo: 'resistencia', dano: 'escolhido', valor: 10 }, { alvo: 'resistencia', dano: 'escolhido', valor: 10, afinidade: true }] },

  // --- Conhecimento ---
  // com afinidade: um segundo poder de outra classe (a nova escolha do poder)
  { id: 'expansao-de-conhecimento', nome: 'Expansão de Conhecimento', ref: LR(114), elemento: 'conhecimento', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true, escolha: { tipo: 'poderClasse', outraClasse: true } },
  { id: 'percepcao-paranormal', nome: 'Percepção Paranormal', ref: LR(114), elemento: 'conhecimento', afinidade: true },
  { id: 'precognicao', nome: 'Precognição', ref: LR(114), elemento: 'conhecimento', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true, efeitos: [{ alvo: 'defesa', valor: 2 }, { alvo: 'resistenciaTeste', valor: 2 }] },
  { id: 'sensitivo', nome: 'Sensitivo', ref: LR(114), elemento: 'conhecimento', afinidade: true, efeitos: [{ alvo: 'pericia', pericia: 'diplomacia', valor: 5 }, { alvo: 'pericia', pericia: 'intimidacao', valor: 5 }, { alvo: 'pericia', pericia: 'intuicao', valor: 5 }] },
  { id: 'visao-do-oculto', nome: 'Visão do Oculto', ref: LR(115), elemento: 'conhecimento', afinidade: true, efeitos: [{ alvo: 'pericia', pericia: 'percepcao', valor: 5 }] },

  // --- Energia ---
  { id: 'afortunado', nome: 'Afortunado', ref: LR(115), elemento: 'energia', afinidade: true },
  { id: 'campo-protetor', nome: 'Campo Protetor', ref: LR(115), elemento: 'energia', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true, efeitos: [{ alvo: 'defesa', valor: 5, condicional: 'ao usar a ação esquiva' }, { alvo: 'pericia', pericia: 'reflexos', valor: 5, afinidade: true }] },
  { id: 'causalidade-fortuita', nome: 'Causalidade Fortuita', ref: LR(115), elemento: 'energia', afinidade: true },
  { id: 'golpe-de-sorte', nome: 'Golpe de Sorte', ref: LR(115), elemento: 'energia', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true, efeitos: [{ alvo: 'margem', escopo: 'todos', valor: 1 }, { alvo: 'multiplicador', escopo: 'todos', valor: 1, afinidade: true }] },
  { id: 'manipular-entropia', nome: 'Manipular Entropia', ref: LR(115), elemento: 'energia', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true, custoPe: 2 },

  // --- Morte ---
  // com afinidade: +2 a mais (total +3)
  { id: 'encarar-a-morte', nome: 'Encarar a Morte', ref: LR(115), elemento: 'morte', afinidade: true, efeitos: [{ alvo: 'limitePe', valor: 1, condicional: 'em cenas de ação' }, { alvo: 'limitePe', valor: 2, condicional: 'em cenas de ação', afinidade: true }] },
  { id: 'escapar-da-morte', nome: 'Escapar da Morte', ref: LR(115), elemento: 'morte', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true },
  // +1 PE por NEX, contado desde o 5% (escolhido em 30%: 6 PE)
  { id: 'potencial-aprimorado', nome: 'Potencial Aprimorado', ref: LR(115), elemento: 'morte', afinidade: true, efeitos: [{ alvo: 'pe', porNex: 1 }, { alvo: 'pe', porNex: 1, afinidade: true }] },
  { id: 'potencial-reaproveitado', nome: 'Potencial Reaproveitado', ref: LR(115), elemento: 'morte', afinidade: true },
  { id: 'surto-temporal', nome: 'Surto Temporal', ref: LR(115), elemento: 'morte', requisitos: [{ tipo: 'elemento', min: 2 }], afinidade: true, custoPe: 3 },

  // --- Sangue ---
  { id: 'anatomia-insana', nome: 'Anatomia Insana', ref: LR(116), elemento: 'sangue', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true },
  { id: 'arma-de-sangue', nome: 'Arma de Sangue', ref: LR(116), elemento: 'sangue', afinidade: true, custoPe: 2 },
  // +2 PV por NEX, contado desde o 5% (escolhido em 50%: 20 PV)
  { id: 'sangue-de-ferro', nome: 'Sangue de Ferro', ref: LR(116), elemento: 'sangue', afinidade: true, efeitos: [{ alvo: 'pv', porNex: 2 }, { alvo: 'pericia', pericia: 'fortitude', valor: 5, afinidade: true }] },
  { id: 'sangue-fervente', nome: 'Sangue Fervente', ref: LR(116), elemento: 'sangue', requisitos: [{ tipo: 'elemento', min: 2 }], afinidade: true, efeitos: [
    { alvo: 'atributo', atributo: 'agi', valor: 1, condicional: MACHUCADO }, { alvo: 'atributo', atributo: 'for', valor: 1, condicional: MACHUCADO },
    { alvo: 'atributo', atributo: 'agi', valor: 1, condicional: MACHUCADO, afinidade: true }, { alvo: 'atributo', atributo: 'for', valor: 1, condicional: MACHUCADO, afinidade: true },
  ] },
  { id: 'sangue-vivo', nome: 'Sangue Vivo', ref: LR(116), elemento: 'sangue', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true },

  // ================= Sobrevivendo ao Horror =================
  { id: 'absorver-conhecimento', nome: 'Absorver Conhecimento', ref: SAH(46), elemento: 'conhecimento', afinidade: true, custoPe: 1, efeitos: [{ alvo: 'custoRitual', valor: -1, elemento: 'conhecimento', condicional: 'ritual com alvo numa pessoa que você possa tocar (exceto você)', afinidade: true }] },
  { id: 'apatia-herege', nome: 'Apatia Herege', ref: SAH(46), elemento: 'conhecimento', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true, custoPe: 2 },
  { id: 'valer-se-do-caos', nome: 'Valer-se do Caos', ref: SAH(47), elemento: 'energia', afinidade: true },
  { id: 'conexao-empatica', nome: 'Conexão Empática', ref: SAH(47), elemento: 'energia', requisitos: [{ tipo: 'elemento', min: 1 }], afinidade: true, custoPe: 2, efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 5, condicional: 'perícias de Intelecto ou Presença feitas com o objeto', afinidade: true }] },
  { id: 'antecipar-vitalidade', nome: 'Antecipar Vitalidade', ref: SAH(46), elemento: 'morte', afinidade: true },
  { id: 'aura-de-pavor', nome: 'Aura de Pavor', ref: SAH(46), elemento: 'morte', afinidade: true, custoPe: 2 },
  { id: 'espreitar-da-besta', nome: 'Espreitar da Besta', ref: SAH(46), elemento: 'sangue', afinidade: true, efeitos: [{ alvo: 'pericia', pericia: 'furtividade', valor: 5 }, { alvo: 'pericia', pericia: 'furtividade', valor: 5, afinidade: true }] },
  { id: 'instintos-sanguinarios', nome: 'Instintos Sanguinários', ref: SAH(46), elemento: 'sangue', afinidade: true, efeitos: [{ alvo: 'resistenciaTeste', valor: 5, condicional: 'contra armadilhas', afinidade: true }] },
];
