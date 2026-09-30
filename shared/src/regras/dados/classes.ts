// Classes (LR cap. 1, p. 22–35) e a pessoa comum de NEX 0% (regra opcional,
// LR p. 171–172). PV e PE somam o atributo (Vigor e Presença) no início e a
// cada NEX novo; a SAN não soma atributo (LR p. 23).
//
// Pessoa comum que chega a NEX 5% (LR p. 172): ganha 1 ponto de atributo (sem
// passar de 3) e a diferença entre a classe e o mundano (ex.: combatente
// +12 PV, +1 PE, +4 SAN). Os totais ficam iguais aos de quem começou em 5%.
import type { Classe } from '../tipos';

const LR = (pagina: number) => ({ fonte: 'LR' as const, pagina });

export const CLASSES: Classe[] = [
  {
    id: 'mundano',
    nome: 'Mundano',
    ref: LR(171),
    pv: { inicial: 8, porNex: 0 },
    pe: { inicial: 1, porNex: 0 },
    san: { inicial: 8, porNex: 0 },
    pericias: { fixas: [], grupos: [], livres: 1 },
    proficiencias: ['armasSimples'],
    habilidades: [
      {
        id: 'empenho',
        nome: 'Empenho',
        ref: LR(172),
        nex: 0,
        custoPe: 1,
        resumo: 'Gasta 1 PE para somar +2 num teste de perícia.',
        efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 2, condicional: 'gastando 1 PE no teste' }],
      },
    ],
    grauTreinamento: 0,
  },
  {
    id: 'combatente',
    nome: 'Combatente',
    ref: LR(24),
    pv: { inicial: 20, porNex: 4 },
    pe: { inicial: 2, porNex: 2 },
    san: { inicial: 12, porNex: 3 },
    pericias: { fixas: [], grupos: [['luta', 'pontaria'], ['fortitude', 'reflexos']], livres: 1 },
    proficiencias: ['armasSimples', 'armasTaticas', 'protecoesLeves'],
    habilidades: [
      {
        id: 'ataque-especial',
        nome: 'Ataque Especial',
        ref: LR(24),
        nex: 5,
        custoPe: 2,
        resumo: 'Ao atacar, gasta PE para somar +5 no ataque ou no dano; o NEX libera mais bônus de +5 por +1 PE cada.',
        efeitos: [{ alvo: 'nota', texto: 'Cada +5 vai no ataque ou no dano, à escolha.' }],
      },
    ],
    grauTreinamento: 1,
  },
  {
    id: 'especialista',
    nome: 'Especialista',
    ref: LR(28),
    pv: { inicial: 16, porNex: 3 },
    pe: { inicial: 3, porNex: 3 },
    san: { inicial: 16, porNex: 4 },
    pericias: { fixas: [], grupos: [], livres: 7 },
    proficiencias: ['armasSimples', 'protecoesLeves'],
    habilidades: [
      {
        id: 'ecletico',
        nome: 'Eclético',
        ref: LR(28),
        nex: 5,
        custoPe: 2,
        resumo: 'Gasta 2 PE num teste para ter os benefícios de ser treinado na perícia.',
      },
      {
        id: 'perito',
        nome: 'Perito',
        ref: LR(28),
        nex: 5,
        custoPe: 2,
        resumo: 'Em duas perícias treinadas (fora Luta e Pontaria), gasta PE para somar um dado extra ao teste; o dado cresce com o NEX.',
        escolha: { tipo: 'pericia', qtd: 2, exceto: ['luta', 'pontaria'], treinada: true },
      },
      {
        id: 'engenhosidade',
        nome: 'Engenhosidade',
        ref: LR(30),
        nex: 40,
        resumo: 'Com Eclético, paga PE a mais para ter os benefícios de veterano (e de expert a partir de NEX 75%).',
      },
    ],
    grauTreinamento: 5,
  },
  {
    id: 'ocultista',
    nome: 'Ocultista',
    ref: LR(32),
    pv: { inicial: 12, porNex: 2 },
    pe: { inicial: 4, porNex: 4 },
    san: { inicial: 20, porNex: 5 },
    pericias: { fixas: ['ocultismo', 'vontade'], grupos: [], livres: 3 },
    proficiencias: ['armasSimples'],
    habilidades: [
      {
        id: 'escolhido-pelo-outro-lado',
        nome: 'Escolhido pelo Outro Lado',
        ref: LR(32),
        nex: 5,
        resumo: 'Conjura rituais: começa com três de 1º círculo e aprende um a cada NEX novo; círculos maiores chegam em NEX 25, 55 e 85%.',
        concedeRituais: { escolha: { tipo: 'ritual', qtd: 3, circuloMax: 1 } },
      },
    ],
    grauTreinamento: 3,
    rituais: { iniciais: 3, porNex: 1, circulos: { 1: 5, 2: 25, 3: 55, 4: 85 } },
  },
];

/**
 * Como as habilidades fixas crescem com o NEX (Tab. 1.3, 1.4 e 1.5).
 * Ataque Especial: PE gastos e bônus total; Perito: PE e o dado; Engenhosidade:
 * PE a mais e o grau; Escolhido pelo Outro Lado: o círculo liberado.
 * O exemplo do Perito no texto (LR p. 28) dá +1d12 em NEX 55%; vale a
 * Tab. 1.4 (p. 29), que dá +1d10 em 55% e +1d12 só em 85%.
 */
export const ESCALAS_CLASSE: Record<string, { nex: 5 | 25 | 40 | 55 | 75 | 85; custoPe?: number; texto: string }[]> = {
  'ataque-especial': [
    { nex: 5, custoPe: 2, texto: '+5' },
    { nex: 25, custoPe: 3, texto: '+10' },
    { nex: 55, custoPe: 4, texto: '+15' },
    { nex: 85, custoPe: 5, texto: '+20' },
  ],
  perito: [
    { nex: 5, custoPe: 2, texto: '+1d6' },
    { nex: 25, custoPe: 3, texto: '+1d8' },
    { nex: 55, custoPe: 4, texto: '+1d10' },
    { nex: 85, custoPe: 5, texto: '+1d12' },
  ],
  engenhosidade: [
    { nex: 40, custoPe: 2, texto: 'veterano' },
    { nex: 75, custoPe: 4, texto: 'expert' },
  ],
  'escolhido-pelo-outro-lado': [
    { nex: 5, texto: '1º círculo' },
    { nex: 25, texto: '2º círculo' },
    { nex: 55, texto: '3º círculo' },
    { nex: 85, texto: '4º círculo' },
  ],
};
