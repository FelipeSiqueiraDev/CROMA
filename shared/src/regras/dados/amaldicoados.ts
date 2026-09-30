// Itens amaldiçoados de Ordem Paranormal RPG: os especiais (LR p. 148–151 e
// SaH p. 57–61, Tab. 1.6 na p. 58) e as maldições de armas, proteções e
// acessórios (LR p. 145–147). Identidade do produto: só nome, números e
// página. Conferido nas páginas dos dois livros e no C.R.I.S. As regras gerais
// (LR p. 144–148) estão nas constantes do fim do arquivo.
//
// Elemento que varia (Proteção Elemental, Dedo Decepado, Selos Paranormais):
// uma entrada por elemento, porque o elemento pesa no preço da maldição e no
// choque entre elementos. As variantes contam como a mesma maldição (ou o
// mesmo item) na regra de que iguais não se acumulam.
import type { AtributoId, Elemento, ItemAmaldicoado, Maldicao } from '../tipos';

const LR = (pagina: number) => ({ fonte: 'LR' as const, pagina });
const SAH = (pagina: number) => ({ fonte: 'SaH' as const, pagina });

const DEDO = ['vestido', 'funciona após 1 semana vestido', 'elemento = o do poder paranormal que concede'];
const EFEITOS_DEDO: ItemAmaldicoado['efeitos'] = [{ alvo: 'pericia', pericia: 'diplomacia', valor: -10, condicional: 'quando alguém o vê usando o dedo' }];
const SELO = ['empunhado', 'consumível', 'elemento = o do ritual', 'categoria = círculo do ritual (1º I, 2º II, 3º III, 4º IV)'];

export const ITENS_AMALDICOADOS: ItemAmaldicoado[] = [
  // ── Livro de regras (LR p. 148–151). Sem outra indicação: categoria II,
  // 1 espaço e conta como uma maldição (LR p. 148).
  // Sangue
  { id: 'coracao-pulsante', nome: 'Coração Pulsante', ref: LR(148), elemento: 'sangue', categoria: 2, espacos: 1, especial: ['empunhado'] },
  { id: 'coroa-de-espinhos', nome: 'Coroa de Espinhos', ref: LR(148), elemento: 'sangue', categoria: 2, espacos: 1, especial: ['vestido', 'funciona após 1 semana vestido'] },
  { id: 'frasco-de-vitalidade', nome: 'Frasco de Vitalidade', ref: LR(148), elemento: 'sangue', categoria: 2, espacos: 1 },
  { id: 'perola-de-sangue', nome: 'Pérola de Sangue', ref: LR(148), elemento: 'sangue', categoria: 2, espacos: 1, especial: ['consumível'] },
  { id: 'punhos-enraivecidos', nome: 'Punhos Enraivecidos', ref: LR(148), elemento: 'sangue', categoria: 2, espacos: 1, especial: ['soqueiras', 'ataques desarmados'], efeitos: [{ alvo: 'nota', texto: 'ataques desarmados: 1d8 de dano de Sangue' }] },
  { id: 'seringa-de-transfiguracao', nome: 'Seringa de Transfiguração', ref: LR(148), elemento: 'sangue', categoria: 2, espacos: 1 },
  // Morte
  { id: 'amarras-mortais', nome: 'Amarras Mortais', ref: LR(148), elemento: 'morte', categoria: 2, espacos: 1, especial: ['vestido'] },
  { id: 'casaco-de-lodo', nome: 'Casaco de Lodo', ref: LR(149), elemento: 'morte', categoria: 2, espacos: 1, especial: ['vestido'], efeitos: [{ alvo: 'resistencia', dano: 'corte', valor: 5 }, { alvo: 'resistencia', dano: 'impacto', valor: 5 }, { alvo: 'resistencia', dano: 'perfuracao', valor: 5 }, { alvo: 'resistencia', dano: 'morte', valor: 5 }, { alvo: 'nota', texto: 'vulnerável a balístico e Energia' }] },
  { id: 'coletora', nome: 'Coletora', ref: LR(149), elemento: 'morte', categoria: 2, espacos: 1, especial: ['punhal', 'PE guardados: só após 1 semana portando'] },
  { id: 'cranio-espiral', nome: 'Crânio Espiral', ref: LR(149), elemento: 'morte', categoria: 2, espacos: 1, especial: ['empunhado'] },
  { id: 'frasco-de-lodo', nome: 'Frasco de Lodo', ref: LR(149), elemento: 'morte', categoria: 2, espacos: 1, especial: ['consumível'] },
  { id: 'vislumbre-do-fim', nome: 'Vislumbre do Fim', ref: LR(149), elemento: 'morte', categoria: 2, espacos: 1, especial: ['óculos'] },
  // Conhecimento (o Peitoral da Segunda Chance está sob Conhecimento no livro)
  { id: 'aneis-do-elo-mental', nome: 'Anéis do Elo Mental', ref: LR(149), elemento: 'conhecimento', categoria: 2, espacos: 1, especial: ['vestido', 'par: duas pessoas', 'funciona após 24 h de uso'] },
  { id: 'lanterna-reveladora', nome: 'Lanterna Reveladora', ref: LR(149), elemento: 'conhecimento', categoria: 2, espacos: 1, especial: ['empunhado'] },
  { id: 'mascara-das-pessoas-nas-sombras', nome: 'Máscara das Pessoas nas Sombras', ref: LR(149), elemento: 'conhecimento', categoria: 2, espacos: 1, especial: ['vestido'], efeitos: [{ alvo: 'resistencia', dano: 'conhecimento', valor: 10 }] },
  { id: 'municao-jurada', nome: 'Munição Jurada', ref: LR(150), elemento: 'conhecimento', categoria: 2, espacos: 1, especial: ['uma bala de arma de fogo'],
    efeitos: [{ alvo: 'defesa', valor: -2, condicional: 'com a munição já vinculada a um ser' }, { alvo: 'ataque', escopo: 'todos', valor: -2, condicional: 'com a munição vinculada, contra outros alvos' }] },
  { id: 'peitoral-da-segunda-chance', nome: 'Peitoral da Segunda Chance', ref: LR(150), elemento: 'conhecimento', categoria: 2, espacos: 1, especial: ['vestido'] },
  { id: 'pergaminho-da-pertinacia', nome: 'Pergaminho da Pertinácia', ref: LR(150), elemento: 'conhecimento', categoria: 2, espacos: 1 },
  // Energia
  // A arma não vira ataque na ficha (item amaldiçoado não é arma): os números ficam em `especial`.
  { id: 'arcabuz-dos-moretti', nome: 'Arcabuz dos Moretti', ref: LR(150), elemento: 'energia', categoria: 2, espacos: 1, especial: ['empunhado', 'arma simples de fogo, uma mão', 'não usa munição', '+2 nos testes de ataque', 'alcance curto, crítico x3', 'dano pelo 1d6 rolado com o ataque: 2d4, 2d6, 2d8, 2d10, 2d12 ou 2d20'] },
  { id: 'bateria-reversa', nome: 'Bateria Reversa', ref: LR(150), elemento: 'energia', categoria: 2, espacos: 1 },
  { id: 'relogio-de-arnaldo', nome: 'Relógio de Arnaldo', ref: LR(150), elemento: 'energia', categoria: 2, espacos: 1 },
  { id: 'talisma-da-sorte', nome: 'Talismã da Sorte', ref: LR(150), elemento: 'energia', categoria: 2, espacos: 1, especial: ['vestido'] },
  { id: 'teclado-de-conexao-neural', nome: 'Teclado de Conexão Neural', ref: LR(150), elemento: 'energia', categoria: 2, espacos: 1 },
  { id: 'tela-do-pesadelo', nome: 'Tela do Pesadelo', ref: LR(151), elemento: 'energia', categoria: 2, espacos: 1 },
  // O livro não dá categoria nem espaço: vale o padrão (II, 1).
  { id: 'veiculo-energizado', nome: 'Veículo Energizado', ref: LR(151), elemento: 'energia', categoria: 2, espacos: 1, especial: ['veículo'] },
  // Medo
  { id: 'jaqueta-de-verissimo', nome: 'Jaqueta de Veríssimo', ref: LR(151), elemento: 'medo', categoria: 2, espacos: 1, especial: ['vestido'], efeitos: [{ alvo: 'resistencia', dano: 'paranormal', valor: 15 }] },
  // Varia: Dedo Decepado tem o elemento do poder que concede. Medo também:
  // Aprender Ritual conta como poder do elemento do ritual (LR p. 114), e há
  // rituais de Medo de 1º a 3º círculo.
  { id: 'dedo-decepado-sangue', nome: 'Dedo Decepado (Sangue)', ref: LR(151), elemento: 'sangue', categoria: 2, espacos: 1, especial: DEDO, efeitos: EFEITOS_DEDO },
  { id: 'dedo-decepado-morte', nome: 'Dedo Decepado (Morte)', ref: LR(151), elemento: 'morte', categoria: 2, espacos: 1, especial: DEDO, efeitos: EFEITOS_DEDO },
  { id: 'dedo-decepado-conhecimento', nome: 'Dedo Decepado (Conhecimento)', ref: LR(151), elemento: 'conhecimento', categoria: 2, espacos: 1, especial: DEDO, efeitos: EFEITOS_DEDO },
  { id: 'dedo-decepado-energia', nome: 'Dedo Decepado (Energia)', ref: LR(151), elemento: 'energia', categoria: 2, espacos: 1, especial: DEDO, efeitos: EFEITOS_DEDO },
  { id: 'dedo-decepado-medo', nome: 'Dedo Decepado (Medo)', ref: LR(151), elemento: 'medo', categoria: 2, espacos: 1, especial: DEDO, efeitos: EFEITOS_DEDO },
  // Varia: Selos Paranormais têm o elemento do ritual; categoria mínima I, que sobe com o círculo
  { id: 'selos-paranormais-sangue', nome: 'Selos Paranormais (Sangue)', ref: LR(151), elemento: 'sangue', categoria: 1, espacos: 1, especial: SELO },
  { id: 'selos-paranormais-morte', nome: 'Selos Paranormais (Morte)', ref: LR(151), elemento: 'morte', categoria: 1, espacos: 1, especial: SELO },
  { id: 'selos-paranormais-conhecimento', nome: 'Selos Paranormais (Conhecimento)', ref: LR(151), elemento: 'conhecimento', categoria: 1, espacos: 1, especial: SELO },
  { id: 'selos-paranormais-energia', nome: 'Selos Paranormais (Energia)', ref: LR(151), elemento: 'energia', categoria: 1, espacos: 1, especial: SELO },
  { id: 'selos-paranormais-medo', nome: 'Selos Paranormais (Medo)', ref: LR(151), elemento: 'medo', categoria: 1, espacos: 1, especial: SELO },

  // ── Sobrevivendo ao Horror (SaH p. 57–61; categoria, elemento e espaço da Tab. 1.6)
  // Sangue
  { id: 'conector-de-membros', nome: 'Conector de Membros', ref: SAH(57), elemento: 'sangue', categoria: 3, espacos: 1 },
  { id: 'dose-d-a-praga', nome: "Dose d'A Praga", ref: SAH(57), elemento: 'sangue', categoria: 3, espacos: 1, especial: ['consumível'] },
  { id: 'mandibula-agonizante', nome: 'Mandíbula Agonizante', ref: SAH(57), elemento: 'sangue', categoria: 2, espacos: 1, especial: ['arremessada'] },
  { id: 'retalho-tenebroso', nome: 'Retalho Tenebroso', ref: SAH(57), elemento: 'sangue', categoria: 2, espacos: 1, especial: ['vestido'],
    efeitos: [{ alvo: 'nota', texto: 'faro e visão no escuro; vulnerável a Morte' }, { alvo: 'nota', texto: '−2d20 em perícias de interação social (Diplomacia, Enganação...)' }] },
  // Morte
  { id: 'ampulheta-do-tempo-sofrido', nome: 'Ampulheta do Tempo Sofrido', ref: SAH(58), elemento: 'morte', categoria: 2, espacos: 1, especial: ['empunhado'] },
  { id: 'injecao-de-lodo', nome: 'Injeção de Lodo', ref: SAH(59), elemento: 'morte', categoria: 2, espacos: 0.5, especial: ['consumível'] },
  { id: 'instantaneo-mortal', nome: 'Instantâneo Mortal', ref: SAH(59), elemento: 'morte', categoria: 2, espacos: 0.5, especial: ['empunhado'] },
  { id: 'projetil-de-lodo-curto', nome: 'Projétil de Lodo, Curto', ref: SAH(59), elemento: 'morte', categoria: 1, espacos: 1, especial: ['munição: balas curtas', 'todo o dano da arma vira Morte', 'a arma se desfaz no fim da cena'] },
  { id: 'projetil-de-lodo-longo', nome: 'Projétil de Lodo, Longo', ref: SAH(59), elemento: 'morte', categoria: 2, espacos: 1, especial: ['munição: balas longas', 'todo o dano da arma vira Morte', 'a arma se desfaz no fim da cena'] },
  { id: 'radio-chiador', nome: 'Rádio Chiador', ref: SAH(59), elemento: 'morte', categoria: 2, espacos: 1 },
  // Conhecimento (a Tab. 1.6 chama a Tábula de "Tablet do saber custoso")
  { id: 'camera-obscura', nome: 'Câmera Obscura', ref: SAH(59), elemento: 'conhecimento', categoria: 3, espacos: 1 },
  { id: 'enxame-fantasmagorico', nome: 'Enxame Fantasmagórico', ref: SAH(60), elemento: 'conhecimento', categoria: 3, espacos: 1, especial: ['vestido'],
    efeitos: [{ alvo: 'nota', texto: 'invisível enquanto vestido; 1 de dano mental no início de cada turno, que ignora resistência' }] },
  { id: 'repositorio-do-fracasso', nome: 'Repositório do Fracasso', ref: SAH(60), elemento: 'conhecimento', categoria: 2, espacos: 1, especial: ['até 6 cargas'] },
  { id: 'tabula-do-saber-custoso', nome: 'Tábula do Saber Custoso', ref: SAH(60), elemento: 'conhecimento', categoria: 2, espacos: 1, especial: ['empunhado'] },
  // Energia
  { id: 'arreio-neural', nome: 'Arreio Neural', ref: SAH(60), elemento: 'energia', categoria: 2, espacos: 1, especial: ['vestido'] },
  { id: 'centrifugador-existencial', nome: 'Centrifugador Existencial', ref: SAH(60), elemento: 'energia', categoria: 3, espacos: 1 },
  { id: 'espelho-refletor', nome: 'Espelho Refletor', ref: SAH(61), elemento: 'energia', categoria: 2, espacos: 1 },
  { id: 'fuzil-alheio', nome: 'Fuzil Alheio', ref: SAH(61), elemento: 'energia', categoria: 4, espacos: 2, especial: ['empunhado', 'fuzil de precisão com mira telescópica e mira laser', 'dano de Energia; não usa munição'] },
  // Medo
  { id: 'a-primeira-adaga', nome: 'A Primeira Adaga', ref: SAH(61), elemento: 'medo', categoria: 3, espacos: 1, especial: ['componente ritualístico'] },
];

export const MALDICOES: Maldicao[] = [
  // ── Armas de qualquer tipo (LR p. 145–146). Empuxo: só armas corpo a corpo.
  { id: 'antielemento', nome: 'Antielemento', ref: LR(145), elemento: 'conhecimento', para: ['arma'] },
  { id: 'ritualistica', nome: 'Ritualística', ref: LR(145), elemento: 'conhecimento', para: ['arma'] },
  { id: 'senciente', nome: 'Senciente', ref: LR(146), elemento: 'conhecimento', para: ['arma'] },
  { id: 'empuxo', nome: 'Empuxo', ref: LR(146), elemento: 'energia', para: ['arma'], efeitos: [{ alvo: 'nota', texto: 'arma: arremessável em alcance curto (se já era, +1 categoria de alcance); arremessada, +1 dado de dano e volta no mesmo turno' }] },
  { id: 'energetica', nome: 'Energética', ref: LR(146), elemento: 'energia', para: ['arma'] },
  { id: 'vibrante', nome: 'Vibrante', ref: LR(146), elemento: 'energia', para: ['arma'], efeitos: [{ alvo: 'nota', texto: 'arma: Ataque Extra (ou −1 PE nele, se já tiver)' }] },
  { id: 'consumidora', nome: 'Consumidora', ref: LR(146), elemento: 'morte', para: ['arma'], efeitos: [{ alvo: 'nota', texto: 'arma: alvo atingido fica lento até o fim da cena' }] },
  { id: 'erosiva', nome: 'Erosiva', ref: LR(146), elemento: 'morte', para: ['arma'], efeitos: [{ alvo: 'nota', texto: 'arma: +1d8 de dano de Morte' }] },
  { id: 'repulsora', nome: 'Repulsora', ref: LR(146), elemento: 'morte', para: ['arma'], efeitos: [{ alvo: 'defesa', valor: 2 }, { alvo: 'defesa', valor: 5, condicional: 'num bloqueio, gastando 2 PE' }] },
  { id: 'lancinante', nome: 'Lancinante', ref: LR(146), elemento: 'sangue', para: ['arma'], efeitos: [{ alvo: 'nota', texto: 'arma: +1d8 de dano de Sangue, multiplicado no crítico' }] },
  { id: 'predadora', nome: 'Predadora', ref: LR(146), elemento: 'sangue', para: ['arma'], efeitos: [{ alvo: 'nota', texto: 'arma: margem de ameaça duplicada; anula camuflagem e cobertura (não a total); à distância, alcance +1 categoria' }] },
  { id: 'sanguinaria', nome: 'Sanguinária', ref: LR(146), elemento: 'sangue', para: ['arma'], efeitos: [{ alvo: 'nota', texto: 'arma: alvo atingido fica sangrando (cumulativo); no crítico, o alvo fica fraco e você ganha 2d10 PV temporários' }] },

  // ── Proteções (LR p. 146–147)
  { id: 'abascanta', nome: 'Abascanta', ref: LR(146), elemento: 'conhecimento', para: ['protecao'], efeitos: [{ alvo: 'resistenciaTeste', valor: 5, condicional: 'contra rituais' }] },
  { id: 'profetica', nome: 'Profética', ref: LR(146), elemento: 'conhecimento', para: ['protecao'], efeitos: [{ alvo: 'resistencia', dano: 'conhecimento', valor: 10 }] },
  { id: 'sombria', nome: 'Sombria', ref: LR(147), elemento: 'conhecimento', para: ['protecao'], efeitos: [{ alvo: 'pericia', pericia: 'furtividade', valor: 5 }] },
  { id: 'cinetica', nome: 'Cinética', ref: LR(147), elemento: 'energia', para: ['protecao'], efeitos: [{ alvo: 'defesa', valor: 2 }] },
  { id: 'lepida', nome: 'Lépida', ref: LR(147), elemento: 'energia', para: ['protecao'], efeitos: [{ alvo: 'pericia', pericia: 'atletismo', valor: 10 }, { alvo: 'deslocamento', valor: 3 }] },
  { id: 'voltaica', nome: 'Voltaica', ref: LR(147), elemento: 'energia', para: ['protecao'], efeitos: [{ alvo: 'resistencia', dano: 'energia', valor: 10 }] },
  { id: 'letargica', nome: 'Letárgica', ref: LR(147), elemento: 'morte', para: ['protecao'], efeitos: [{ alvo: 'defesa', valor: 2 }, { alvo: 'nota', texto: 'chance de ignorar o dano extra de críticos e ataques furtivos: 25% (proteção leve) ou 50% (pesada)' }] },
  { id: 'repulsiva', nome: 'Repulsiva', ref: LR(147), elemento: 'morte', para: ['protecao'], efeitos: [{ alvo: 'resistencia', dano: 'morte', valor: 10 }] },
  { id: 'regenerativa', nome: 'Regenerativa', ref: LR(147), elemento: 'sangue', para: ['protecao'], efeitos: [{ alvo: 'resistencia', dano: 'sangue', valor: 10 }] },
  { id: 'sadica', nome: 'Sádica', ref: LR(147), elemento: 'sangue', para: ['protecao'], efeitos: [{ alvo: 'nota', texto: 'no início do turno: +1 no ataque e no dano a cada 10 de dano sofrido desde o fim do seu último turno' }] },

  // ── Acessórios: utensílios e vestimentas (LR p. 147)
  { id: 'carisma', nome: 'Carisma', ref: LR(147), elemento: 'conhecimento', para: ['acessorio'], efeitos: [{ alvo: 'atributo', atributo: 'pre', valor: 1 }] },
  { id: 'conjuracao', nome: 'Conjuração', ref: LR(147), elemento: 'conhecimento', para: ['acessorio'] },
  { id: 'escudo-mental', nome: 'Escudo Mental', ref: LR(147), elemento: 'conhecimento', para: ['acessorio'], efeitos: [{ alvo: 'resistencia', dano: 'mental', valor: 10 }] },
  { id: 'reflexao', nome: 'Reflexão', ref: LR(147), elemento: 'conhecimento', para: ['acessorio'] },
  { id: 'sagacidade', nome: 'Sagacidade', ref: LR(147), elemento: 'conhecimento', para: ['acessorio'], efeitos: [{ alvo: 'atributo', atributo: 'int', valor: 1 }] },
  { id: 'defesa', nome: 'Defesa', ref: LR(147), elemento: 'energia', para: ['acessorio'], efeitos: [{ alvo: 'defesa', valor: 5 }] },
  { id: 'destreza', nome: 'Destreza', ref: LR(147), elemento: 'energia', para: ['acessorio'], efeitos: [{ alvo: 'atributo', atributo: 'agi', valor: 1 }] },
  { id: 'esforco-adicional', nome: 'Esforço Adicional', ref: LR(147), elemento: 'morte', para: ['acessorio'], efeitos: [{ alvo: 'pe', fixo: 5 }, { alvo: 'nota', texto: 'os +5 PE só valem depois de um dia de uso' }] },
  { id: 'disposicao', nome: 'Disposição', ref: LR(147), elemento: 'sangue', para: ['acessorio'], efeitos: [{ alvo: 'atributo', atributo: 'vig', valor: 1 }] },
  { id: 'pujanca', nome: 'Pujança', ref: LR(147), elemento: 'sangue', para: ['acessorio'], efeitos: [{ alvo: 'atributo', atributo: 'for', valor: 1 }] },
  { id: 'vitalidade', nome: 'Vitalidade', ref: LR(147), elemento: 'sangue', para: ['acessorio'], efeitos: [{ alvo: 'pv', fixo: 15 }, { alvo: 'nota', texto: 'os +15 PV só valem depois de um dia de uso' }] },
  // Proteção Elemental: o acessório passa a ser do elemento contra o qual protege.
  // O livro diz "um elemento" sem restringir; fica sem Medo, que não tem preço
  // de maldição (p. 145) nem elemento opressor: o mestre decide.
  { id: 'protecao-elemental-sangue', nome: 'Proteção Elemental (Sangue)', ref: LR(147), elemento: 'sangue', para: ['acessorio'], efeitos: [{ alvo: 'resistencia', dano: 'sangue', valor: 10 }] },
  { id: 'protecao-elemental-morte', nome: 'Proteção Elemental (Morte)', ref: LR(147), elemento: 'morte', para: ['acessorio'], efeitos: [{ alvo: 'resistencia', dano: 'morte', valor: 10 }] },
  { id: 'protecao-elemental-conhecimento', nome: 'Proteção Elemental (Conhecimento)', ref: LR(147), elemento: 'conhecimento', para: ['acessorio'], efeitos: [{ alvo: 'resistencia', dano: 'conhecimento', valor: 10 }] },
  { id: 'protecao-elemental-energia', nome: 'Proteção Elemental (Energia)', ref: LR(147), elemento: 'energia', para: ['acessorio'], efeitos: [{ alvo: 'resistencia', dano: 'energia', valor: 10 }] },
];

// ── Regras gerais dos itens amaldiçoados ──

type ElementoComPreco = Exclude<Elemento, 'medo'>;

/** Categoria que as maldições somam ao item: a primeira, II; cada uma depois, I. Soma com as modificações (LR p. 144). */
export const MALDICAO_CATEGORIA = { primeira: 2, seguinte: 1 } as const;

/** Maldições e itens amaldiçoados só a partir de agente especial (50 PP), seja qual for a categoria (LR p. 144). */
export const MALDICAO_PP_MINIMO = 50;

/** Item amaldiçoado especial sem outra indicação: categoria II, 1 espaço, e conta como uma maldição (LR p. 148). */
export const ESPECIAL_PADRAO = { categoria: 2, espacos: 1, maldicoes: 1 } as const;

/**
 * Quem oprime quem (LR p. 118). Um item não pode ter maldições de dois
 * elementos em que um oprime o outro (LR p. 144): Sangue com Energia pode, e
 * Conhecimento com Morte também. Medo não oprime nem é oprimido.
 */
export const ELEMENTO_OPRIME: Record<ElementoComPreco, ElementoComPreco> = {
  sangue: 'conhecimento',
  conhecimento: 'energia',
  energia: 'morte',
  morte: 'sangue',
};

/**
 * Preço da maldição (LR p. 145): ao falhar num teste baseado num destes
 * atributos, perde `san` de Sanidade por maldição daquele elemento nos seus
 * itens. O livro não dá preço para Medo.
 */
export const PRECO_MALDICAO: { san: number; atributos: Record<ElementoComPreco, AtributoId[]> } = {
  san: 2,
  atributos: { conhecimento: ['int'], energia: ['agi'], morte: ['pre'], sangue: ['for', 'vig'] },
};

/** Cada maldição dá ao item +10 PV, +10 de RD e +10 nos testes de resistência que ele faz sem portador (LR p. 145). */
export const MALDICAO_RESISTENCIA = { pv: 10, rd: 10, testes: 10 } as const;
