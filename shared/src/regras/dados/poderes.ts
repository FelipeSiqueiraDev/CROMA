// Poderes de classe do Livro de Regras v1.0 (LR cap. 1: combatente p. 25–26,
// especialista p. 29–30, ocultista p. 33–34) e, do Sobrevivendo ao Horror
// (SaH), os poderes de classe novos e os poderes gerais. O PDF do SaH não tem
// texto: essas entradas vieram do C.R.I.S (tag "SH") e foram conferidas nas
// imagens das páginas do SaH (nome, pré-requisitos, custo, efeitos e página).
// Ficam sem resumo (identidade do produto). Páginas = número impresso no rodapé.
//
// - Aprender Ritual (ocultista) é poder paranormal: fica no catálogo dos paranormais.
// - Poder geral (SaH p. 33): sempre que puder escolher um poder de classe
//   (inclusive na Versatilidade), o agente pode pegar um poder geral no lugar;
//   ele conta como poder de todas as classes.
// - Artista Marcial, Combater com Duas Armas, Saque Rápido e Tiro Certeiro são
//   também poderes gerais no SaH, com o texto do LR. A versão geral é outra
//   entrada ("… (geral)", fonte SaH, para sumir sem o SaH), e cada versão pede
//   não ter a outra: é o mesmo poder, não se escolhe duas vezes.
import type { AtributoId, Efeito, Nex, PericiaId, Poder, Ref, Requisito } from '../tipos';

const LR = (pagina: number): Ref => ({ fonte: 'LR', pagina });
const SAH = (pagina: number): Ref => ({ fonte: 'SaH', pagina });
const atr = (atributo: AtributoId, min: number): Requisito => ({ tipo: 'atributo', atributo, min });
const per = (pericia: PericiaId): Requisito => ({ tipo: 'pericia', pericia });
const nex = (min: Nex): Requisito => ({ tipo: 'nex', min });
/** não ter o poder (versão de classe × versão geral do mesmo poder) */
const semPoder = (poder: string): Requisito => ({ tipo: 'nao', req: { tipo: 'poder', poder } });
/** poderes gerais do SaH: fica treinado na perícia; se já era, +2 nela */
const treino = (pericia: PericiaId): Efeito => ({ alvo: 'treino', pericia, seJa: 2 });

const TODAS: ('combatente' | 'especialista' | 'ocultista')[] = ['combatente', 'especialista', 'ocultista'];

export const PODERES: Poder[] = [
  // ================= combatente (LR p. 25–26) =================
  {
    id: 'armamento-pesado', nome: 'Armamento Pesado', ref: LR(25), classes: ['combatente'],
    requisitos: [atr('for', 2)],
    efeitos: [{ alvo: 'proficiencia', proficiencia: 'armasPesadas' }],
    resumo: 'Libera o uso de armas pesadas sem a penalidade por falta de proficiência.',
  },
  {
    id: 'ataque-de-oportunidade', nome: 'Ataque de Oportunidade', ref: LR(25), classes: ['combatente'],
    custoPe: 1,
    resumo: 'Quando alguém deixa por vontade própria um espaço adjacente ao seu, uma reação e 1 PE rendem um ataque corpo a corpo contra ele.',
  },
  {
    // também geral no SaH: ver combater-com-duas-armas-geral
    id: 'combater-com-duas-armas', nome: 'Combater com Duas Armas', ref: LR(25), classes: ['combatente'],
    requisitos: [atr('agi', 3), { tipo: 'algum', de: [per('luta'), per('pontaria')] }, semPoder('combater-com-duas-armas-geral')],
    efeitos: [{ alvo: 'ataque', escopo: 'todos', dados: -1, condicional: 'fez os dois ataques na ação agredir (até o seu próximo turno)' }],
    resumo: 'Com duas armas (ao menos uma leve), a ação agredir rende um ataque com cada, mas seus ataques sofrem −1d20 até seu próximo turno.',
  },
  {
    id: 'combate-defensivo', nome: 'Combate Defensivo', ref: LR(25), classes: ['combatente'],
    requisitos: [atr('int', 2)],
    efeitos: [
      { alvo: 'defesa', valor: 5, condicional: 'combatendo na defensiva (até o seu próximo turno)' },
      { alvo: 'ataque', escopo: 'todos', dados: -1, condicional: 'combatendo na defensiva (até o seu próximo turno)' },
    ],
    resumo: 'Ao agredir, pode lutar na defensiva: até seu próximo turno, ganha +5 na Defesa e sofre −1d20 nos testes de ataque.',
  },
  {
    // o livro imprime "For +2"; lido como Força 2, igual aos outros poderes
    id: 'golpe-demolidor', nome: 'Golpe Demolidor', ref: LR(25), classes: ['combatente'],
    requisitos: [atr('for', 2), per('luta')],
    custoPe: 1,
    efeitos: [{ alvo: 'dano', escopo: 'todos', dadoExtra: 2, condicional: 'manobra quebrar ou ataque a objeto, gastando 1 PE' }],
    resumo: 'Na manobra quebrar ou atacando um objeto, 1 PE acrescenta dois dados de dano do mesmo tipo da arma.',
  },
  {
    id: 'golpe-pesado', nome: 'Golpe Pesado', ref: LR(25), classes: ['combatente'],
    efeitos: [{ alvo: 'dano', escopo: 'armasCorpoACorpo', dadoExtra: 1 }],
    resumo: 'Armas corpo a corpo causam um dado de dano a mais, do mesmo tipo que já rolam.',
  },
  {
    id: 'incansavel', nome: 'Incansável', ref: LR(25), classes: ['combatente'],
    custoPe: 2,
    resumo: 'Uma vez por cena, 2 PE dão uma ação de investigação a mais, testada com Força ou Agilidade.',
  },
  {
    id: 'presteza-atletica', nome: 'Presteza Atlética', ref: LR(25), classes: ['combatente'],
    custoPe: 1,
    resumo: 'Ao facilitar a investigação, 1 PE permite testar com Força ou Agilidade; passando, o próximo aliado que usar o bônus ganha também +1d20.',
  },
  {
    id: 'protecao-pesada', nome: 'Proteção Pesada', ref: LR(25), classes: ['combatente'],
    requisitos: [nex(30)],
    efeitos: [{ alvo: 'proficiencia', proficiencia: 'protecoesPesadas' }],
    resumo: 'Libera o uso de proteções pesadas sem a penalidade por falta de proficiência.',
  },
  {
    id: 'reflexos-defensivos', nome: 'Reflexos Defensivos', ref: LR(25), classes: ['combatente'],
    requisitos: [atr('agi', 2)],
    efeitos: [
      { alvo: 'defesa', valor: 5, condicional: 'contra inimigos em alcance curto' },
      { alvo: 'resistenciaTeste', valor: 5, condicional: 'contra inimigos em alcance curto' },
    ],
    resumo: 'Ganha +5 na Defesa e nos testes de resistência contra inimigos que estejam em alcance curto.',
  },
  {
    // também geral no SaH: ver saque-rapido-geral
    id: 'saque-rapido', nome: 'Saque Rápido', ref: LR(25), classes: ['combatente'],
    requisitos: [per('iniciativa'), semPoder('saque-rapido-geral')],
    resumo: 'Sacar ou guardar itens passa a ser ação livre, e recarregar arma de disparo cai um degrau de ação (completa, padrão, movimento, livre).',
  },
  {
    // começa na p. 25 e termina na 26; o custo sobe 2 PE a cada ataque extra
    id: 'segurar-o-gatilho', nome: 'Segurar o Gatilho', ref: LR(25), classes: ['combatente'],
    requisitos: [nex(60)],
    custoPe: 2,
    resumo: 'Após um acerto com arma de fogo, ataca o mesmo alvo de novo, pagando 2 PE por ataque já feito no turno; repete até errar.',
  },
  {
    id: 'sentido-tatico', nome: 'Sentido Tático', ref: LR(26), classes: ['combatente'],
    requisitos: [per('percepcao'), per('tatica')],
    custoPe: 2,
    efeitos: [
      { alvo: 'defesa', valor: 5, condicional: 'depois de analisar o ambiente (movimento e 2 PE), até o fim da cena' },
      { alvo: 'resistenciaTeste', valor: 5, condicional: 'depois de analisar o ambiente (movimento e 2 PE), até o fim da cena' },
    ],
    resumo: 'Com uma ação de movimento e 2 PE, analisa o ambiente: +5 na Defesa e nos testes de resistência até o fim da cena.',
  },
  {
    // proteção pesada dá resistência a balístico, corte, impacto e perfuração (LR p. 62) = 'fisico'
    id: 'tanque-de-guerra', nome: 'Tanque de Guerra', ref: LR(26), classes: ['combatente'],
    requisitos: [{ tipo: 'poder', poder: 'protecao-pesada' }],
    efeitos: [
      { alvo: 'defesa', valor: 2, condicional: 'vestindo proteção pesada' },
      { alvo: 'resistencia', dano: 'fisico', valor: 2, condicional: 'vestindo proteção pesada (soma na resistência que ela dá)' },
    ],
    resumo: 'Vestindo proteção pesada, soma +2 à Defesa e +2 à resistência a dano que ela concede.',
  },
  {
    // também geral no SaH: ver tiro-certeiro-geral
    id: 'tiro-certeiro', nome: 'Tiro Certeiro', ref: LR(26), classes: ['combatente'],
    requisitos: [per('pontaria'), semPoder('tiro-certeiro-geral')],
    efeitos: [{ alvo: 'dano', escopo: 'disparo', valor: 'agi' }],
    resumo: 'Com arma de disparo, o dano ganha sua Agilidade, e atirar em alvo engajado em corpo a corpo não sofre penalidade, mesmo sem mirar.',
  },
  {
    id: 'tiro-de-cobertura', nome: 'Tiro de Cobertura', ref: LR(26), classes: ['combatente'],
    custoPe: 1,
    resumo: 'Efeito de medo (arma de fogo, ação padrão, 1 PE): Pontaria contra Vontade; vencendo, o alvo fica parado, com −5 nos ataques, por uma rodada.',
  },

  // ================= especialista (LR p. 29–30) =================
  {
    id: 'balistica-avancada', nome: 'Balística Avançada', ref: LR(29), classes: ['especialista'],
    efeitos: [
      { alvo: 'proficiencia', proficiencia: 'armasTaticasFogo' },
      { alvo: 'dano', escopo: 'taticaFogo', valor: 2 },
    ],
    resumo: 'Armas táticas de fogo: passa a ser proficiente nelas e causa +2 de dano com elas.',
  },
  {
    id: 'conhecimento-aplicado', nome: 'Conhecimento Aplicado', ref: LR(29), classes: ['especialista'],
    requisitos: [atr('int', 2)],
    custoPe: 2,
    resumo: 'Num teste de perícia que não seja Luta nem Pontaria, 2 PE trocam o atributo-base por Intelecto.',
  },
  {
    id: 'hacker', nome: 'Hacker', ref: LR(29), classes: ['especialista'],
    requisitos: [per('tecnologia')],
    efeitos: [{ alvo: 'pericia', pericia: 'tecnologia', valor: 5, condicional: 'para invadir sistemas' }],
    resumo: 'Invadir sistemas com Tecnologia ganha +5, e qualquer invasão leva apenas uma ação completa.',
  },
  {
    id: 'maos-rapidas', nome: 'Mãos Rápidas', ref: LR(29), classes: ['especialista'],
    requisitos: [atr('agi', 3), per('crime')],
    custoPe: 1,
    resumo: 'Com 1 PE, um teste de Crime vira ação livre.',
  },
  {
    id: 'mochila-de-utilidades', nome: 'Mochila de Utilidades', ref: LR(29), classes: ['especialista'],
    escolha: { tipo: 'texto', rotulo: 'item (exceto armas)' },
    efeitos: [
      { alvo: 'categoria', item: 'escolhido', valor: 1 },
      { alvo: 'nota', texto: 'o item escolhido ocupa 1 espaço a menos' },
    ],
    resumo: 'Escolha um item que não seja arma: ele cai uma categoria e ocupa um espaço a menos.',
  },
  {
    id: 'movimento-tatico', nome: 'Movimento Tático', ref: LR(29), classes: ['especialista'],
    requisitos: [per('atletismo')],
    custoPe: 1,
    resumo: '1 PE anula, até o fim do turno, a penalidade de deslocamento por terreno difícil e por escalada.',
  },
  {
    id: 'na-trilha-certa', nome: 'Na Trilha Certa', ref: LR(29), classes: ['especialista'],
    custoPe: 1,
    efeitos: [{ alvo: 'pericia', pericia: 'todas', dados: 1, condicional: 'próximo teste depois de passar em procurar pistas, gastando 1 PE (custo e bônus acumulam)' }],
    resumo: 'Depois de passar num teste de procurar pistas, 1 PE dá +1d20 no teste seguinte; sucessos em sequência somam custo e bônus.',
  },
  {
    id: 'nerd', nome: 'Nerd', ref: LR(29), classes: ['especialista'],
    custoPe: 2,
    resumo: 'Uma vez por cena, 2 PE e Atualidades DT 20 rendem uma informação útil ali, como dica de pista ou fraqueza de inimigo.',
  },
  {
    id: 'ninja-urbano', nome: 'Ninja Urbano', ref: LR(29), classes: ['especialista'],
    efeitos: [
      { alvo: 'proficiencia', proficiencia: 'armasTaticasCorpoACorpo' },
      { alvo: 'dano', escopo: 'taticaCorpoACorpo', valor: 2 },
    ],
    resumo: 'Armas táticas corpo a corpo: passa a ser proficiente nelas e causa +2 de dano com elas.',
  },
  {
    // p. 30 no rodapé (o índice diz 29), como Perito em Explosivos e Primeira Impressão
    id: 'pensamento-agil', nome: 'Pensamento Ágil', ref: LR(30), classes: ['especialista'],
    custoPe: 2,
    resumo: 'Uma vez por rodada, numa cena de investigação, 2 PE dão uma ação de procurar pistas a mais.',
  },
  {
    id: 'perito-em-explosivos', nome: 'Perito em Explosivos', ref: LR(30), classes: ['especialista'],
    resumo: 'Seus explosivos somam seu Intelecto à DT para resistir, e você pode poupar da explosão tantos alvos quanto seu Intelecto.',
  },
  {
    id: 'primeira-impressao', nome: 'Primeira Impressão', ref: LR(30), classes: ['especialista'],
    efeitos: [
      { alvo: 'pericia', pericia: 'diplomacia', dados: 2, condicional: 'só o primeiro teste de Diplomacia, Enganação, Intimidação ou Intuição da cena' },
      { alvo: 'pericia', pericia: 'enganacao', dados: 2, condicional: 'só o primeiro teste de Diplomacia, Enganação, Intimidação ou Intuição da cena' },
      { alvo: 'pericia', pericia: 'intimidacao', dados: 2, condicional: 'só o primeiro teste de Diplomacia, Enganação, Intimidação ou Intuição da cena' },
      { alvo: 'pericia', pericia: 'intuicao', dados: 2, condicional: 'só o primeiro teste de Diplomacia, Enganação, Intimidação ou Intuição da cena' },
    ],
    resumo: 'Em cada cena, o primeiro teste que fizer entre Diplomacia, Enganação, Intimidação e Intuição ganha +2d20.',
  },

  // ================= ocultista (LR p. 33–34) =================
  {
    id: 'camuflar-ocultismo', nome: 'Camuflar Ocultismo', ref: LR(33), classes: ['ocultista'],
    custoPe: 2,
    resumo: 'Ação livre torna seus símbolos e sigilos invisíveis aos outros; +2 PE conjura ritual sem componentes nem gestos, notado só com Ocultismo DT 25.',
  },
  {
    // o custo é o do ritual gravado (varia)
    id: 'criar-selo', nome: 'Criar Selo', ref: LR(33), classes: ['ocultista'],
    resumo: 'Fabrica selos amaldiçoados de um ritual que conhece: uma hora, PE igual ao custo dele e Ocultismo DT 15 + PE gastos. Máximo: sua Presença.',
  },
  {
    id: 'envolto-em-misterio', nome: 'Envolto em Mistério', ref: LR(33), classes: ['ocultista'],
    efeitos: [
      { alvo: 'pericia', pericia: 'enganacao', valor: 5, condicional: 'contra pessoas não treinadas em Ocultismo (o mestre decide quem conta)' },
      { alvo: 'pericia', pericia: 'intimidacao', valor: 5, condicional: 'contra pessoas não treinadas em Ocultismo (o mestre decide quem conta)' },
    ],
    resumo: 'Assusta e manipula leigos supersticiosos: +5 em Enganação e Intimidação contra quem não é treinado em Ocultismo (o mestre decide quem conta).',
  },
  {
    // o livro diz só "um elemento", sem restringir
    id: 'especialista-em-elemento', nome: 'Especialista em Elemento', ref: LR(33), classes: ['ocultista'],
    escolha: { tipo: 'elemento' },
    efeitos: [{ alvo: 'dtRituais', valor: 2, elemento: 'escolhido' }],
    resumo: 'Rituais do elemento escolhido ficam mais difíceis de resistir: DT +2.',
  },
  {
    id: 'ferramentas-paranormais', nome: 'Ferramentas Paranormais', ref: LR(33), classes: ['ocultista'],
    resumo: 'Usa equipamentos paranormais sem gastar os PE que a ativação deles pede.',
  },
  {
    id: 'fluxo-de-poder', nome: 'Fluxo de Poder', ref: LR(33), classes: ['ocultista'],
    requisitos: [nex(60)],
    resumo: 'Uma só ação livre sustenta dois efeitos de rituais ao mesmo tempo, cada um pagando seu próprio custo.',
  },
  {
    id: 'guiado-pelo-paranormal', nome: 'Guiado pelo Paranormal', ref: LR(34), classes: ['ocultista'],
    custoPe: 2,
    resumo: 'Uma vez por cena, 2 PE dão uma ação de investigação a mais.',
  },
  {
    id: 'identificacao-paranormal', nome: 'Identificação Paranormal', ref: LR(34), classes: ['ocultista'],
    efeitos: [{ alvo: 'pericia', pericia: 'ocultismo', valor: 10, condicional: 'para identificar criaturas, objetos ou rituais' }],
    resumo: 'Identificar criaturas, objetos ou rituais com Ocultismo ganha +10.',
  },
  {
    id: 'improvisar-componentes', nome: 'Improvisar Componentes', ref: LR(34), classes: ['ocultista'],
    resumo: 'Uma vez por cena, ação completa e Investigação DT 15: acha objetos que servem de componentes de um elemento à escolha, se o mestre permitir.',
  },
  {
    id: 'intuicao-paranormal', nome: 'Intuição Paranormal', ref: LR(34), classes: ['ocultista'],
    efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 'int', condicional: 'na ação facilitar investigação (Intelecto ou Presença, à escolha)' }],
    resumo: 'Na ação facilitar investigação, o teste recebe seu Intelecto ou sua Presença, à escolha.',
  },
  {
    id: 'mestre-em-elemento', nome: 'Mestre em Elemento', ref: LR(34), classes: ['ocultista'],
    requisitos: [{ tipo: 'poder', poder: 'especialista-em-elemento', mesmaEscolha: true }, nex(45)],
    escolha: { tipo: 'elemento' },
    efeitos: [{ alvo: 'custoRitual', valor: -1, elemento: 'escolhido' }],
    resumo: 'Rituais do elemento em que tem Especialista em Elemento custam 1 PE a menos.',
  },
  {
    // o tipo Efeito não tem cura: a parte da cura vai como nota
    id: 'ritual-potente', nome: 'Ritual Potente', ref: LR(34), classes: ['ocultista'],
    requisitos: [atr('int', 2)],
    efeitos: [
      { alvo: 'dano', escopo: 'ritual', valor: 'int' },
      { alvo: 'nota', texto: 'também soma Intelecto nos efeitos de cura dos rituais' },
    ],
    resumo: 'Seus rituais somam seu Intelecto ao dano ou à cura que causam.',
  },
  {
    // um ritual que já conhece; o custoRitual não aponta um ritual só: vira aviso
    id: 'ritual-predileto', nome: 'Ritual Predileto', ref: LR(34), classes: ['ocultista'],
    escolha: { tipo: 'ritual' },
    efeitos: [{ alvo: 'custoRitual', valor: -1, condicional: 'só no ritual escolhido (acumula com outras reduções)' }],
    resumo: 'Um ritual que você conhece, à escolha, fica 1 PE mais barato; acumula com outras reduções.',
  },
  {
    id: 'tatuagem-ritualistica', nome: 'Tatuagem Ritualística', ref: LR(34), classes: ['ocultista'],
    efeitos: [{ alvo: 'custoRitual', valor: -1, condicional: 'rituais de alcance pessoal que têm você como alvo' }],
    resumo: 'Sigilos na pele barateiam em 1 PE os rituais de alcance pessoal que têm você como alvo.',
  },

  // ================= de mais de uma classe (LR) =================
  {
    // combatente p. 25 e especialista p. 29; também geral no SaH: ver artista-marcial-geral
    id: 'artista-marcial', nome: 'Artista Marcial', ref: LR(25), classes: ['combatente', 'especialista'],
    requisitos: [semPoder('artista-marcial-geral')],
    efeitos: [{ alvo: 'nota', texto: 'ataque desarmado: dano 1d6 (1d8 em NEX 35%, 1d10 em NEX 70%), letal e ágil' }],
    resumo: 'Golpes desarmados causam 1d6 (1d8 em NEX 35%, 1d10 em 70%), podem ser letais e contam como armas ágeis.',
  },
  {
    // combatente p. 26, especialista p. 30, ocultista p. 34; regra em p. 110 e 114.
    // O livro não imprime pré-requisito: só chega a partir de NEX 15%, o primeiro poder de classe.
    id: 'transcender', nome: 'Transcender', ref: LR(26), classes: TODAS,
    repetivel: true,
    escolha: { tipo: 'poderParanormal' },
    efeitos: [{ alvo: 'nota', texto: 'não ganha a Sanidade deste aumento de NEX' }],
    resumo: 'Ganha um poder paranormal à escolha, mas fica sem a Sanidade deste aumento de NEX. Pode ser escolhido várias vezes.',
  },
  {
    // combatente p. 26, especialista p. 30, ocultista p. 34. Sem efeito 'treino': o
    // motor já sobe um grau de cada perícia escolhida (estado.ts, receberPoder); o
    // efeito repetiria a subida e avisaria "já era treinada" a cada escolha.
    id: 'treinamento-em-pericia', nome: 'Treinamento em Perícia', ref: LR(26), classes: TODAS,
    repetivel: true,
    escolha: { tipo: 'pericia', qtd: 2 },
    efeitos: [
      { alvo: 'nota', texto: 'a partir de NEX 35%, pode escolher perícia já treinada para subir a veterano; a partir de NEX 70%, veterana para subir a expert' },
    ],
    resumo: 'Fica treinado em duas perícias; a partir de NEX 35%, pode escolher treinadas para veterano e, de 70%, veteranas para expert. Repetível.',
  },

  // ================= SaH: poderes de classe (conferidos no SaH, sem resumo) =================
  // Página = onde o poder está impresso: combatente p. 14–15, especialista
  // p. 22–23, ocultista p. 26–27 (Sincronia Paranormal começa na 26).

  // combatente
  { id: 'apego-angustiado', nome: 'Apego Angustiado', ref: SAH(14), classes: ['combatente'] },
  { id: 'caminho-para-forca', nome: 'Caminho para Força', ref: SAH(14), classes: ['combatente'], custoPe: 1 },
  {
    id: 'ciente-das-cicatrizes', nome: 'Ciente das Cicatrizes', ref: SAH(14), classes: ['combatente'],
    requisitos: [{ tipo: 'algum', de: [per('luta'), per('pontaria')] }],
  },
  {
    id: 'correria-desesperada', nome: 'Correria Desesperada', ref: SAH(14), classes: ['combatente'],
    efeitos: [{ alvo: 'deslocamento', valor: 3 }, { alvo: 'pericia', pericia: 'todas', dados: 1, condicional: 'testes para fugir numa perseguição' }],
  },
  { id: 'engolir-o-choro', nome: 'Engolir o Choro', ref: SAH(14), classes: ['combatente'] },
  {
    id: 'instinto-de-fuga', nome: 'Instinto de Fuga', ref: SAH(14), classes: ['combatente'],
    requisitos: [per('intuicao')],
    efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 2, condicional: 'cena de perseguição (ou parecida)' }],
  },
  {
    id: 'mochileiro', nome: 'Mochileiro', ref: SAH(14), classes: ['combatente'],
    requisitos: [atr('vig', 2)],
    efeitos: [{ alvo: 'espacos', valor: 5 }, { alvo: 'vestimentas', valor: 1 }],
  },
  {
    id: 'paranoia-defensiva', nome: 'Paranoia Defensiva', ref: SAH(15), classes: ['combatente'],
    custoPe: 3,
    efeitos: [
      { alvo: 'defesa', valor: 5, condicional: 'opção: contra o próximo ataque sofrido na cena' },
      { alvo: 'pericia', pericia: 'todas', valor: 5, condicional: 'opção: um único teste até o fim da cena' },
      { alvo: 'ataque', escopo: 'todos', valor: 5, condicional: 'opção do teste único, se for um ataque' },
    ],
  },
  {
    id: 'sacrificar-os-joelhos', nome: 'Sacrificar os Joelhos', ref: SAH(15), classes: ['combatente'],
    requisitos: [per('atletismo')], custoPe: 2,
  },
  { id: 'sem-tempo-irmao', nome: 'Sem Tempo, Irmão', ref: SAH(15), classes: ['combatente'] },
  {
    id: 'valentao', nome: 'Valentão', ref: SAH(15), classes: ['combatente'],
    custoPe: 1,
    efeitos: [{ alvo: 'atributoPericia', pericia: 'intimidacao', atributo: 'for' }],
  },

  // especialista
  { id: 'acolher-o-terror', nome: 'Acolher o Terror', ref: SAH(22), classes: ['especialista'] },
  { id: 'contatos-oportunos', nome: 'Contatos Oportunos', ref: SAH(22), classes: ['especialista'], requisitos: [per('crime')] },
  {
    id: 'disfarce-sutil', nome: 'Disfarce Sutil', ref: SAH(22), classes: ['especialista'],
    requisitos: [atr('pre', 2), per('enganacao')], custoPe: 1,
    efeitos: [{ alvo: 'pericia', pericia: 'enganacao', valor: 5, condicional: 'disfarce feito com o poder usando kit de disfarces' }],
  },
  { id: 'esconderijo-desesperado', nome: 'Esconderijo Desesperado', ref: SAH(22), classes: ['especialista'] },
  {
    id: 'especialista-diletante', nome: 'Especialista Diletante', ref: SAH(22), classes: ['especialista'],
    requisitos: [nex(30)],
    escolha: { tipo: 'poderClasse', outraClasse: true },
  },
  {
    // recebe o poder da origem escolhida
    id: 'flashback', nome: 'Flashback', ref: SAH(22), classes: ['especialista'],
    escolha: { tipo: 'texto', rotulo: 'origem (outra que não a sua)' },
  },
  { id: 'leitura-fria', nome: 'Leitura Fria', ref: SAH(22), classes: ['especialista'], requisitos: [per('intuicao')] },
  {
    id: 'maos-firmes', nome: 'Mãos Firmes', ref: SAH(22), classes: ['especialista'],
    requisitos: [per('furtividade')], custoPe: 2,
    efeitos: [{ alvo: 'pericia', pericia: 'furtividade', dados: 1, condicional: 'esconder-se ou ação discreta manipulando objeto, gastando 2 PE' }],
  },
  { id: 'plano-de-fuga', nome: 'Plano de Fuga', ref: SAH(23), classes: ['especialista'], custoPe: 2 },
  {
    id: 'remoer-memorias', nome: 'Remoer Memórias', ref: SAH(23), classes: ['especialista'],
    requisitos: [atr('int', 1)], custoPe: 2,
  },
  {
    id: 'resistir-a-pressao', nome: 'Resistir à Pressão', ref: SAH(23), classes: ['especialista'],
    requisitos: [per('investigacao')], custoPe: 5,
    efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 2, condicional: 'na rodada extra de urgência da investigação' }],
  },

  // ocultista
  {
    id: 'deixe-os-sussurros-guiarem', nome: 'Deixe os Sussurros Guiarem', ref: SAH(26), classes: ['ocultista'],
    custoPe: 2,
    efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 2, condicional: 'testes de investigação até o fim da cena' }],
  },
  { id: 'dominio-esoterico', nome: 'Domínio Esotérico', ref: SAH(26), classes: ['ocultista'], requisitos: [atr('int', 3)] },
  {
    id: 'estalos-macabros', nome: 'Estalos Macabros', ref: SAH(26), classes: ['ocultista'],
    custoPe: 1,
    efeitos: [{ alvo: 'pericia', pericia: 'ocultismo', valor: 5, condicional: 'usando Ocultismo para distrair ou fintar pessoa ou animal, gastando 1 PE' }],
  },
  {
    // bônus de 1d6 em perícia: o tipo Efeito só soma número ou d20
    id: 'minha-dor-me-impulsiona', nome: 'Minha Dor me Impulsiona', ref: SAH(26), classes: ['ocultista'],
    requisitos: [atr('vig', 2)], custoPe: 1,
    efeitos: [{ alvo: 'nota', texto: '+1d6 em Acrobacia, Atletismo ou Furtividade (1 PE; depois de sofrer 5 ou mais de dano nos PV)' }],
  },
  {
    id: 'nos-olhos-do-monstro', nome: 'Nos Olhos do Monstro', ref: SAH(26), classes: ['ocultista'],
    custoPe: 3,
    efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 5, condicional: 'contra a criatura encarada, exceto ataques, até o fim da cena' }],
  },
  {
    id: 'olhar-sinistro', nome: 'Olhar Sinistro', ref: SAH(26), classes: ['ocultista'],
    requisitos: [atr('pre', 1)],
    efeitos: [{ alvo: 'atributoPericia', pericia: 'ocultismo', atributo: 'pre' }],
  },
  { id: 'sentido-premonitorio', nome: 'Sentido Premonitório', ref: SAH(26), classes: ['ocultista'], custoPe: 3 },
  {
    id: 'sincronia-paranormal', nome: 'Sincronia Paranormal', ref: SAH(26), classes: ['ocultista'],
    requisitos: [atr('pre', 2)], custoPe: 2,
  },
  {
    id: 'tracado-conjuratorio', nome: 'Traçado Conjuratório', ref: SAH(27), classes: ['ocultista'],
    custoPe: 1,
    efeitos: [
      { alvo: 'pericia', pericia: 'ocultismo', valor: 2, condicional: 'dentro do símbolo traçado' },
      { alvo: 'resistenciaTeste', valor: 2, condicional: 'dentro do símbolo traçado' },
      { alvo: 'dtRituais', valor: 2, condicional: 'dentro do símbolo traçado' },
    ],
  },

  // ================= SaH: poderes gerais (conferidos no SaH, sem resumo) =================
  // Seção nas p. 33–36; a Tabela 2.3 (p. 34) lista os pré-requisitos. Página =
  // onde cada poder está impresso.

  // poderes de classe do LR que o SaH torna gerais (p. 33): texto, pré-requisitos
  // e efeitos do LR (ver as entradas sem "(geral)")
  {
    id: 'artista-marcial-geral', nome: 'Artista Marcial (geral)', ref: SAH(33), classes: ['geral'],
    requisitos: [semPoder('artista-marcial')],
    efeitos: [{ alvo: 'nota', texto: 'ataque desarmado: dano 1d6 (1d8 em NEX 35%, 1d10 em NEX 70%), letal e ágil' }],
  },
  {
    id: 'combater-com-duas-armas-geral', nome: 'Combater com Duas Armas (geral)', ref: SAH(33), classes: ['geral'],
    requisitos: [atr('agi', 3), { tipo: 'algum', de: [per('luta'), per('pontaria')] }, semPoder('combater-com-duas-armas')],
    efeitos: [{ alvo: 'ataque', escopo: 'todos', dados: -1, condicional: 'fez os dois ataques na ação agredir (até o seu próximo turno)' }],
  },
  {
    id: 'saque-rapido-geral', nome: 'Saque Rápido (geral)', ref: SAH(33), classes: ['geral'],
    requisitos: [per('iniciativa'), semPoder('saque-rapido')],
  },
  {
    id: 'tiro-certeiro-geral', nome: 'Tiro Certeiro (geral)', ref: SAH(33), classes: ['geral'],
    requisitos: [per('pontaria'), semPoder('tiro-certeiro')],
    efeitos: [{ alvo: 'dano', escopo: 'disparo', valor: 'agi' }],
  },

  // física e mobilidade
  { id: 'acrobatico', nome: 'Acrobático', ref: SAH(33), classes: ['geral'], requisitos: [atr('agi', 2)], efeitos: [treino('acrobacia')] },
  {
    id: 'atletico', nome: 'Atlético', ref: SAH(33), classes: ['geral'],
    requisitos: [atr('for', 2)], efeitos: [treino('atletismo'), { alvo: 'deslocamento', valor: 3 }],
  },
  { id: 'as-do-volante', nome: 'Ás do Volante', ref: SAH(33), classes: ['geral'], requisitos: [atr('agi', 2)], efeitos: [treino('pilotagem')] },
  { id: 'dedos-ageis', nome: 'Dedos Ágeis', ref: SAH(33), classes: ['geral'], requisitos: [atr('agi', 2)], efeitos: [treino('crime')] },
  {
    // uma perícia diferente a cada vez
    id: 'foco-em-pericia', nome: 'Foco em Perícia', ref: SAH(33), classes: ['geral'],
    repetivel: true,
    escolha: { tipo: 'pericia', treinada: true, exceto: ['luta', 'pontaria'] },
    requisitos: [{ tipo: 'pericia', pericia: 'escolhida' }],
    efeitos: [{ alvo: 'pericia', pericia: 'escolhida', dados: 1 }],
  },
  { id: 'proativo', nome: 'Proativo', ref: SAH(35), classes: ['geral'], requisitos: [atr('agi', 2)], efeitos: [treino('iniciativa')] },
  {
    id: 'resposta-rapida', nome: 'Resposta Rápida', ref: SAH(36), classes: ['geral'],
    requisitos: [atr('agi', 2)], custoPe: 2, efeitos: [treino('reflexos')],
  },
  { id: 'sorrateiro', nome: 'Sorrateiro', ref: SAH(36), classes: ['geral'], requisitos: [atr('agi', 2)], efeitos: [treino('furtividade')] },

  // intelecto e investigação
  {
    id: 'especialista-em-emergencias', nome: 'Especialista em Emergências', ref: SAH(33), classes: ['geral'],
    requisitos: [atr('int', 2)], efeitos: [treino('medicina')],
  },
  { id: 'informado', nome: 'Informado', ref: SAH(34), classes: ['geral'], requisitos: [atr('int', 2)], efeitos: [treino('atualidades')] },
  {
    id: 'inventario-organizado', nome: 'Inventário Organizado', ref: SAH(33), classes: ['geral'],
    requisitos: [atr('int', 2)],
    efeitos: [{ alvo: 'espacos', valor: 'int' }, { alvo: 'nota', texto: 'itens de 0,5 espaço ocupam 0,25' }],
  },
  {
    id: 'observador', nome: 'Observador', ref: SAH(34), classes: ['geral'],
    requisitos: [atr('int', 2)], efeitos: [treino('investigacao'), { alvo: 'pericia', pericia: 'intuicao', valor: 'int' }],
  },
  { id: 'pensamento-tatico', nome: 'Pensamento Tático', ref: SAH(35), classes: ['geral'], requisitos: [atr('int', 2)], efeitos: [treino('tatica')] },
  {
    id: 'personalidade-esoterica', nome: 'Personalidade Esotérica', ref: SAH(35), classes: ['geral'],
    requisitos: [atr('int', 2)], efeitos: [{ alvo: 'pe', fixo: 3 }, treino('ocultismo')],
  },
  {
    id: 'pesquisador-cientifico', nome: 'Pesquisador Científico', ref: SAH(35), classes: ['geral'],
    requisitos: [atr('int', 2)], efeitos: [treino('ciencias')],
  },
  {
    id: 'racionalidade-inflexivel', nome: 'Racionalidade Inflexível', ref: SAH(35), classes: ['geral'],
    requisitos: [atr('int', 3)],
    efeitos: [{ alvo: 'atributoPe', atributo: 'int' }, { alvo: 'atributoPericia', pericia: 'vontade', atributo: 'int' }],
  },
  {
    id: 'rato-de-computador', nome: 'Rato de Computador', ref: SAH(36), classes: ['geral'],
    requisitos: [atr('int', 2)], efeitos: [treino('tecnologia')],
  },
  {
    id: 'sobrevivencialista', nome: 'Sobrevivencialista', ref: SAH(36), classes: ['geral'],
    requisitos: [atr('int', 2)],
    efeitos: [treino('sobrevivencia'), { alvo: 'resistenciaTeste', valor: 2, condicional: 'contra efeitos de clima' }],
  },

  // social e presença
  {
    id: 'atraente', nome: 'Atraente', ref: SAH(33), classes: ['geral'],
    requisitos: [atr('pre', 2)],
    efeitos: [
      { alvo: 'pericia', pericia: 'artes', valor: 5, condicional: 'contra quem possa se sentir atraído por você' },
      { alvo: 'pericia', pericia: 'diplomacia', valor: 5, condicional: 'contra quem possa se sentir atraído por você' },
      { alvo: 'pericia', pericia: 'enganacao', valor: 5, condicional: 'contra quem possa se sentir atraído por você' },
      { alvo: 'pericia', pericia: 'intimidacao', valor: 5, condicional: 'contra quem possa se sentir atraído por você' },
    ],
  },
  {
    id: 'detector-de-mentiras', nome: 'Detector de Mentiras', ref: SAH(33), classes: ['geral'],
    requisitos: [atr('pre', 2)], efeitos: [treino('intuicao')],
  },
  { id: 'interrogador', nome: 'Interrogador', ref: SAH(34), classes: ['geral'], requisitos: [atr('for', 2)], efeitos: [treino('intimidacao')] },
  { id: 'mentiroso-nato', nome: 'Mentiroso Nato', ref: SAH(34), classes: ['geral'], requisitos: [atr('pre', 2)], efeitos: [treino('enganacao')] },
  {
    // o animal é um aliado que dá +2 em duas perícias à escolha (aprovadas pelo mestre)
    id: 'pai-de-pet', nome: 'Pai de Pet', ref: SAH(34), classes: ['geral'],
    requisitos: [atr('pre', 2)],
    escolha: { tipo: 'pericia', qtd: 2, exceto: ['luta', 'pontaria'] },
    efeitos: [treino('adestramento'), { alvo: 'pericia', pericia: 'escolhida', valor: 2, condicional: 'com o animal de estimação (aliado) por perto' }],
  },
  {
    id: 'palavras-de-devocao', nome: 'Palavras de Devoção', ref: SAH(35), classes: ['geral'],
    requisitos: [atr('pre', 2)], custoPe: 3,
    efeitos: [treino('religiao'), { alvo: 'resistencia', dano: 'mental', valor: 5, condicional: 'depois da oração (ação completa e 3 PE), até o fim da cena' }],
  },
  { id: 'parceiro', nome: 'Parceiro', ref: SAH(35), classes: ['geral'], requisitos: [per('diplomacia'), nex(30)] },
  { id: 'persuasivo', nome: 'Persuasivo', ref: SAH(35), classes: ['geral'], requisitos: [atr('pre', 2)], efeitos: [treino('diplomacia')] },
  {
    id: 'sentidos-agucados', nome: 'Sentidos Aguçados', ref: SAH(36), classes: ['geral'],
    requisitos: [atr('pre', 2)], efeitos: [treino('percepcao')],
  },
  { id: 'talentoso', nome: 'Talentoso', ref: SAH(36), classes: ['geral'], requisitos: [atr('pre', 2)], efeitos: [treino('artes')] },
  {
    id: 'teimosia-obstinada', nome: 'Teimosia Obstinada', ref: SAH(36), classes: ['geral'],
    requisitos: [atr('pre', 2)], custoPe: 2,
    efeitos: [treino('vontade'), { alvo: 'pericia', pericia: 'vontade', valor: 5, condicional: 'contra condição mental ou mudança de atitude, gastando 2 PE' }],
  },

  // sobrevivência e combate
  { id: 'estigmado', nome: 'Estigmado', ref: SAH(33), classes: ['geral'] },
  { id: 'tenacidade', nome: 'Tenacidade', ref: SAH(36), classes: ['geral'], requisitos: [atr('vig', 2)], efeitos: [treino('fortitude')] },
  {
    id: 'vitalidade-reforcada', nome: 'Vitalidade Reforçada', ref: SAH(36), classes: ['geral'],
    requisitos: [atr('vig', 2)], efeitos: [{ alvo: 'pv', porNex: 1 }, { alvo: 'pericia', pericia: 'fortitude', valor: 2 }],
  },
  {
    id: 'vontade-inabalavel', nome: 'Vontade Inabalável', ref: SAH(36), classes: ['geral'],
    requisitos: [atr('pre', 2)], efeitos: [{ alvo: 'pe', porDezNex: 1 }, { alvo: 'pericia', pericia: 'vontade', valor: 2 }],
  },
  { id: 'provisoes-de-emergencia', nome: 'Provisões de Emergência', ref: SAH(35), classes: ['geral'] },
];
