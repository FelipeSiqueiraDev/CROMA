// Origens: as 26 do livro de regras (LR cap. 1, p. 16–21; Tab. 1.1 na p. 19)
// e as 20 do Sobrevivendo ao Horror (SaH cap. 1, p. 7–13; Tab. 1.1 do SaH na
// p. 12). As do SaH vieram do C.R.I.S e foram conferidas, uma a uma, nas
// páginas do SaH; a página de cada uma é a do texto da origem (o poder do
// Inventor Paranormal fica na página seguinte).
// Cada origem dá duas perícias treinadas e um poder. O nome do poder segue o
// texto da origem: a Tab. 1.1 do LR ainda traz nomes antigos em seis delas
// (anotados abaixo). Resumos com nossas palavras, só para o LR (conteúdo
// aberto); o SaH fica com nome, números e página.
//
// "Teste de ataque" é um teste de perícia (Luta ou Pontaria, LR p. 82): um
// bônus em "testes de perícia" já vale no ataque, sem efeito de ataque à parte.
import type { Efeito, Origem, PericiaId, Ref } from '../tipos';

const LR = (pagina: number): Ref => ({ fonte: 'LR', pagina });
const SAH = (pagina: number): Ref => ({ fonte: 'SaH', pagina });

/** Perícias de Intelecto e de Presença (LR p. 15; Tab. 2.1). */
const DE_INT: PericiaId[] = ['atualidades', 'ciencias', 'investigacao', 'medicina', 'ocultismo', 'profissao', 'sobrevivencia', 'tatica', 'tecnologia'];
const DE_PRE: PericiaId[] = ['adestramento', 'artes', 'diplomacia', 'enganacao', 'intimidacao', 'intuicao', 'percepcao', 'religiao', 'vontade'];

/** +valor em cada perícia da lista, só na situação indicada (vira aviso). */
const bonus = (pericias: PericiaId[], valor: number, condicional: string): Efeito[] =>
  pericias.map((pericia): Efeito => ({ alvo: 'pericia', pericia, valor, condicional }));
const nota = (texto: string): Efeito => ({ alvo: 'nota', texto });

export const ORIGENS: Origem[] = [
  // ================= Livro de regras =================
  // 2d20: 2–8
  {
    id: 'academico', nome: 'Acadêmico', ref: LR(16), pericias: ['ciencias', 'investigacao'],
    resumo: 'Pesquisador ou docente universitário; a pesquisa o levou a mistérios que puseram a Ordem no seu caminho.',
    poder: {
      id: 'saber-e-poder', nome: 'Saber é Poder', ref: LR(16), custoPe: 2,
      resumo: '2 PE dão +5 a um teste feito com Intelecto.',
      efeitos: [...bonus(DE_INT, 5, 'gastando 2 PE'), nota('Vale em qualquer teste com Intelecto, inclusive o do atributo puro.')],
    },
  },
  // 2d20: 9–10
  {
    id: 'agente-de-saude', nome: 'Agente de Saúde', ref: LR(16), pericias: ['intuicao', 'medicina'],
    resumo: 'Profissional da saúde (enfermagem, farmácia, medicina, psicologia, resgate) que topou com o paranormal no trabalho ou socorrendo um agente.',
    poder: {
      id: 'tecnica-medicinal', nome: 'Técnica Medicinal', ref: LR(16),
      resumo: 'Toda cura que você faz recupera, além do normal, PV iguais ao seu Intelecto.',
      efeitos: [nota('Ao curar alguém, soma seu Intelecto aos PV recuperados.')],
    },
  },
  // 2d20: 11
  {
    id: 'amnesico', nome: 'Amnésico', ref: LR(16), pericias: { escolha: 2, texto: 'escolhidas pelo mestre' },
    resumo: 'Perdeu quase toda a memória, talvez por trauma ou ritual; a Ordem virou sua família, e as missões podem revelar quem era.',
    poder: {
      id: 'vislumbres-do-passado', nome: 'Vislumbres do Passado', ref: LR(16),
      resumo: 'Uma vez por missão, teste de Intelecto (DT 10) para reconhecer algo de antes da amnésia: se passar, 1d4 PE temporários e talvez uma informação.',
      efeitos: [nota('1 vez por missão: Intelecto DT 10; se passar, 1d4 PE temporários e, se o mestre quiser, uma informação útil.')],
    },
  },
  // 2d20: 12–13
  {
    id: 'artista', nome: 'Artista', ref: LR(17), pericias: ['artes', 'enganacao'],
    resumo: 'Ator, músico, escritor, dançarino ou influenciador cuja obra nasceu de uma vivência paranormal que o público acha só talento.',
    poder: {
      id: 'magnum-opus', nome: 'Magnum Opus', ref: LR(17),
      resumo: 'Sua obra é famosa: uma vez por missão, alguém numa interação o reconhece, e você ganha +5 em Presença e perícias de Presença com essa pessoa.',
      efeitos: [
        ...bonus(DE_PRE, 5, 'contra quem reconheceu sua obra (1 vez por missão)'),
        nota('Também em testes de Presença contra essa pessoa e, a critério do mestre, onde mais for reconhecido.'),
      ],
    },
  },
  // 2d20: 14–15
  {
    id: 'atleta', nome: 'Atleta', ref: LR(17), pericias: ['acrobacia', 'atletismo'],
    resumo: 'Esportista de competição, sozinho ou em time; seu rendimento pode ter mão paranormal, ou o sobrenatural apareceu num campeonato.',
    poder: {
      id: '110', nome: '110%', ref: LR(17), custoPe: 2,
      resumo: '2 PE dão +5 a um teste de perícia de Força ou Agilidade, salvo Luta e Pontaria.',
      efeitos: bonus(['acrobacia', 'atletismo', 'crime', 'furtividade', 'iniciativa', 'pilotagem', 'reflexos'], 5, 'gastando 2 PE'),
    },
  },
  // 2d20: 16. A Profissão é cozinheiro.
  {
    id: 'chef', nome: 'Chef', ref: LR(17), pericias: ['fortitude', 'profissao'],
    resumo: 'Cozinha por paixão ou por ofício, e a comida o levou ao paranormal sem ninguém saber como. A Profissão treinada é cozinheiro.',
    poder: {
      id: 'ingrediente-secreto', nome: 'Ingrediente Secreto', ref: LR(17),
      resumo: 'No interlúdio, gasta uma ação cozinhando: quem gastar a ação de se alimentar recebe o benefício de dois pratos (iguais se somam).',
      efeitos: [nota('Interlúdio: uma ação cozinhando; quem se alimentar ganha o benefício de dois pratos, que se somam se forem iguais.')],
    },
  },
  // 2d20: 17. O poder está na p. 18.
  {
    id: 'criminoso', nome: 'Criminoso', ref: LR(17), pericias: ['crime', 'furtividade'],
    resumo: 'Ex-criminoso, de pequenos furtos a crime organizado; esbarrou num assunto da Ordem, que achou mais útil tê-lo do seu lado.',
    poder: {
      id: 'o-crime-compensa', nome: 'O Crime Compensa', ref: LR(18),
      resumo: 'No fim da missão, escolhe um item achado nela; na missão seguinte, ele não conta no limite de itens da patente.',
      efeitos: [nota('Um item achado na missão anterior não conta no limite de itens da patente nesta missão.')],
    },
  },
  // 2d20: 18
  {
    id: 'cultista-arrependido', nome: 'Cultista Arrependido', ref: LR(18), pericias: ['ocultismo', 'religiao'],
    resumo: 'Ex-integrante de uma seita paranormal que trocou de lado; o passado ainda deixa marcas, e muitos na Ordem desconfiam dele.',
    poder: {
      id: 'tracos-do-outro-lado', nome: 'Traços do Outro Lado', ref: LR(18),
      resumo: 'Ganha um poder paranormal à escolha; em troca, a Sanidade inicial da classe cai pela metade.',
      escolha: { tipo: 'poderParanormal' },
      efeitos: [{ alvo: 'sanInicial', fator: 0.5 }, nota('Começa com um poder paranormal à escolha.')],
    },
  },
  // 2d20: 19
  {
    id: 'desgarrado', nome: 'Desgarrado', ref: LR(18), pericias: ['fortitude', 'sobrevivencia'],
    resumo: 'Vivia à margem da sociedade, como eremita, sem-teto ou alguém que largou tudo ao conhecer o paranormal; a vida rústica o endureceu.',
    poder: {
      id: 'calejado', nome: 'Calejado', ref: LR(18),
      resumo: '+1 PV a cada 5% de NEX.',
      efeitos: [{ alvo: 'pv', porNex: 1 }],
    },
  },
  // 2d20: 20
  {
    id: 'engenheiro', nome: 'Engenheiro', ref: LR(18), pericias: ['profissao', 'tecnologia'],
    resumo: 'Prefere construir a teorizar, seja engenheiro formado ou inventor amador; algum invento paranormal seu deve ter atraído a Ordem.',
    poder: {
      id: 'ferramentas-favoritas', nome: 'Ferramentas Favoritas', ref: LR(18),
      resumo: 'Escolha um item que não seja arma: para você, a categoria dele é uma a menos.',
      escolha: { tipo: 'texto', rotulo: 'Item (exceto armas)' },
      efeitos: [{ alvo: 'categoria', item: 'escolhido', valor: 1 }],
    },
  },
  // 2d20: 21
  {
    id: 'executivo', nome: 'Executivo', ref: LR(18), pericias: ['diplomacia', 'profissao'],
    resumo: 'Burocrata corporativo (administrador, advogado, contador) até descobrir o segredo paranormal da empresa e trocar a mesa pelo campo.',
    poder: {
      id: 'processo-otimizado', nome: 'Processo Otimizado', ref: LR(18), custoPe: 2,
      resumo: 'Dentro de um teste estendido, cada teste de perícia pode receber +5 por 2 PE.',
      efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 5, condicional: 'em teste estendido, gastando 2 PE' }],
    },
  },
  // 2d20: 22–23
  {
    id: 'investigador', nome: 'Investigador', ref: LR(19), pericias: ['investigacao', 'percepcao'],
    resumo: 'Perito, policial federal ou detetive particular; um caso paranormal, ou o faro para resolver mistérios, o trouxe à Ordem.',
    poder: {
      id: 'faro-para-pistas', nome: 'Faro para Pistas', ref: LR(19), custoPe: 1,
      resumo: 'Uma vez por cena, 1 PE dá +5 a um teste para procurar pistas.',
      efeitos: [{ alvo: 'pericia', pericia: 'todas', valor: 5, condicional: 'procurando pistas, 1 vez por cena, gastando 1 PE' }],
    },
  },
  // 2d20: 24
  {
    id: 'lutador', nome: 'Lutador', ref: LR(19), pericias: ['luta', 'reflexos'],
    resumo: 'Lutador de academia, de ringue ou de rua; um torneio clandestino ou o talento na briga o levou à Ordem.',
    poder: {
      id: 'mao-pesada', nome: 'Mão Pesada', ref: LR(19),
      resumo: 'Ataques corpo a corpo causam +2 de dano.',
      efeitos: [{ alvo: 'dano', escopo: 'corpoACorpo', valor: 2 }],
    },
  },
  // 2d20: 25
  {
    id: 'magnata', nome: 'Magnata', ref: LR(20), pericias: ['diplomacia', 'pilotagem'],
    resumo: 'Rico, por herança de família com laços ocultos, por um negócio bem vendido ou por um prêmio de loteria com números malditos.',
    poder: {
      id: 'patrocinador-da-ordem', nome: 'Patrocinador da Ordem', ref: LR(20),
      resumo: 'Crédito sempre um nível acima do que a patente daria.',
      efeitos: [{ alvo: 'credito', valor: 1 }],
    },
  },
  // 2d20: 26
  {
    id: 'mercenario', nome: 'Mercenário', ref: LR(20), pericias: ['iniciativa', 'intimidacao'],
    resumo: 'Combatente contratado, autônomo ou de empresa militar privada; escoltas e execuções sob encomenda acabaram cruzando com o paranormal.',
    poder: {
      id: 'posicao-de-combate', nome: 'Posição de Combate', ref: LR(20), custoPe: 2,
      resumo: 'No seu primeiro turno de cada cena de ação, 2 PE compram uma ação de movimento extra.',
      efeitos: [nota('1º turno de cada cena de ação: 2 PE por uma ação de movimento extra.')],
    },
  },
  // 2d20: 27. Na Tab. 1.1 o poder ainda é "+1 de dano à distância".
  {
    id: 'militar', nome: 'Militar', ref: LR(20), pericias: ['pontaria', 'tatica'],
    resumo: 'Ex-militar treinado a fundo com armas de fogo; disciplina e missões não são novidade, só o inimigo mudou.',
    poder: {
      id: 'para-bellum', nome: 'Para Bellum', ref: LR(20),
      resumo: 'Ataques com armas de fogo causam +2 de dano.',
      efeitos: [{ alvo: 'dano', escopo: 'fogo', valor: 2 }],
    },
  },
  // 2d20: 28. Na Tab. 1.1 o poder ainda é "Ferramentas da Profissão".
  // Sem escopo "arma escolhida" nos tipos: os +1 ficam como aviso.
  {
    id: 'operario', nome: 'Operário', ref: LR(20), pericias: ['fortitude', 'profissao'],
    resumo: 'Viveu de trabalho braçal, em obra, indústria ou fábrica, e ganhou um olhar prático do mundo, até o paranormal invadir essa rotina.',
    poder: {
      id: 'ferramenta-de-trabalho', nome: 'Ferramenta de Trabalho', ref: LR(20),
      resumo: 'Arma simples ou tática que sirva de ferramenta da profissão: é proficiente nela e ganha +1 em ataque, dano e margem de ameaça.',
      escolha: { tipo: 'arma' },
      efeitos: [
        { alvo: 'ataque', escopo: 'todos', valor: 1, condicional: 'só com a arma escolhida' },
        { alvo: 'dano', escopo: 'todos', valor: 1, condicional: 'só com a arma escolhida' },
        { alvo: 'margem', escopo: 'todos', valor: 1, condicional: 'só com a arma escolhida' },
        nota('Proficiente com a arma escolhida: simples ou tática, que sirva de ferramenta na profissão, a critério do mestre.'),
      ],
    },
  },
  // 2d20: 29–30
  {
    id: 'policial', nome: 'Policial', ref: LR(20), pericias: ['percepcao', 'pontaria'],
    resumo: 'Policial civil ou militar; numa ronda ou ocorrência, deu de cara com o paranormal e sobreviveu.',
    poder: {
      id: 'patrulha', nome: 'Patrulha', ref: LR(20),
      resumo: '+2 na Defesa.',
      efeitos: [{ alvo: 'defesa', valor: 2 }],
    },
  },
  // 2d20: 31. Na Tab. 1.1 o poder ainda é "Exorcismo".
  {
    id: 'religioso', nome: 'Religioso', ref: LR(20), pericias: ['religiao', 'vontade'],
    resumo: 'Fiel ou líder religioso de qualquer crença, dedicado ao amparo espiritual; foi assim que conheceu o paranormal e a Ordem.',
    poder: {
      id: 'acalentar', nome: 'Acalentar', ref: LR(20),
      resumo: '+5 em Religião para acalmar; quem você acalma recupera 1d6 + sua Presença de Sanidade.',
      efeitos: [
        { alvo: 'pericia', pericia: 'religiao', valor: 5, condicional: 'para acalmar' },
        nota('Quem você acalma recupera 1d6 + sua Presença de SAN.'),
      ],
    },
  },
  // 2d20: 32
  {
    id: 'servidor-publico', nome: 'Servidor Público', ref: LR(20), pericias: ['intuicao', 'vontade'],
    resumo: 'Funcionário de órgão público, entre burocracia e atendimento, até descobrir autoridades metidas com cultos e rituais.',
    poder: {
      id: 'espirito-civico', nome: 'Espírito Cívico', ref: LR(20), custoPe: 1,
      resumo: 'Quando ajuda alguém, 1 PE faz sua ajuda valer +2 a mais.',
      efeitos: [nota('Ajudando: 1 PE para somar +2 ao bônus dado.')],
    },
  },
  // 2d20: 33
  {
    id: 'teorico-da-conspiracao', nome: 'Teórico da Conspiração', ref: LR(21), pericias: ['investigacao', 'ocultismo'],
    resumo: 'Vivia caçando conspirações até uma delas se provar paranormal de verdade; a Ordem pôs essa obsessão a seu serviço.',
    poder: {
      id: 'eu-ja-sabia', nome: 'Eu Já Sabia', ref: LR(21),
      resumo: 'Entidades e anomalias não o surpreendem: resistência a dano mental igual ao seu Intelecto.',
      efeitos: [{ alvo: 'resistencia', dano: 'mental', valor: 'int' }],
    },
  },
  // 2d20: 34. Na Tab. 1.1 o poder ainda é "Computação Avançada".
  {
    id: 't-i', nome: 'T.I.', ref: LR(21), pericias: ['investigacao', 'tecnologia'],
    resumo: 'Programador, engenheiro de software ou o técnico de informática de plantão; o talento, ou a curiosidade demais, o pôs no radar da Ordem.',
    poder: {
      id: 'motor-de-busca', nome: 'Motor de Busca', ref: LR(21), custoPe: 2,
      resumo: 'Tendo internet e o aval do mestre, 2 PE deixam você resolver um teste de perícia qualquer com Tecnologia.',
      efeitos: [nota('Com internet, a critério do mestre: 2 PE para trocar um teste de perícia por Tecnologia.')],
    },
  },
  // 2d20: 35. Na Tab. 1.1 o poder ainda é "Trilhas e Rumos".
  {
    id: 'trabalhador-rural', nome: 'Trabalhador Rural', ref: LR(21), pericias: ['adestramento', 'sobrevivencia'],
    resumo: 'Gente do campo ou de lugares remotos (fazendeiro, pescador, biólogo, veterinário), íntima da natureza, que viu lendas de fogueira se provarem reais.',
    poder: {
      id: 'desbravador', nome: 'Desbravador', ref: LR(21), custoPe: 2,
      resumo: '2 PE dão +5 em Adestramento ou Sobrevivência, e terreno difícil não atrasa seu deslocamento.',
      efeitos: [...bonus(['adestramento', 'sobrevivencia'], 5, 'gastando 2 PE'), nota('Terreno difícil não reduz seu deslocamento.')],
    },
  },
  // 2d20: 36
  {
    id: 'trambiqueiro', nome: 'Trambiqueiro', ref: LR(21), pericias: ['crime', 'enganacao'],
    resumo: 'Golpista de pequenos esquemas e apostas clandestinas; passou a perna em quem não devia e acabou trabalhando para a Ordem.',
    poder: {
      id: 'impostor', nome: 'Impostor', ref: LR(21), custoPe: 2,
      resumo: 'Uma vez por cena, 2 PE deixam você resolver um teste de perícia qualquer com Enganação.',
      efeitos: [nota('1 vez por cena: 2 PE para trocar um teste de perícia por Enganação.')],
    },
  },
  // 2d20: 37–38. Na Tab. 1.1 o poder ainda é "Empenho".
  {
    id: 'universitario', nome: 'Universitário', ref: LR(21), pericias: ['atualidades', 'investigacao'],
    resumo: 'Estudante universitário que achou algo paranormal em meio aos estudos e foi convocado pela Ordem.',
    poder: {
      id: 'dedicacao', nome: 'Dedicação', ref: LR(21),
      resumo: 'Ganha 1 PE, mais 1 em cada NEX ímpar (15%, 25%...), e o limite de PE por turno fica 1 maior.',
      efeitos: [{ alvo: 'pe', fixo: 1, porNexImpar: 1 }, { alvo: 'limitePe', valor: 1 }],
    },
  },
  // 2d20: 39–40
  {
    id: 'vitima', nome: 'Vítima', ref: LR(21), pericias: ['reflexos', 'vontade'],
    resumo: 'Sobreviveu a um ataque ou ritual paranormal ainda jovem; fez do trauma motivo para proteger outros e faro para o perigo.',
    poder: {
      id: 'cicatrizes-psicologicas', nome: 'Cicatrizes Psicológicas', ref: LR(21),
      resumo: '+1 de Sanidade a cada 5% de NEX.',
      efeitos: [{ alvo: 'san', porNex: 1 }],
    },
  },

  // ================= Sobrevivendo ao Horror =================
  {
    id: 'amigo-dos-animais', nome: 'Amigo dos Animais', ref: SAH(7), pericias: ['adestramento', 'percepcao'],
    poder: {
      id: 'companheiro-animal', nome: 'Companheiro Animal', ref: SAH(7),
      escolha: { tipo: 'pericia' },
      efeitos: [
        { alvo: 'pericia', pericia: 'escolhida', valor: 2, condicional: 'com o companheiro animal (aliado)' },
        nota('Adestramento muda a atitude de animais. NEX 35%: bônus de um tipo de aliado; NEX 70%: a habilidade dele.'),
        { alvo: 'san', fixo: -10, condicional: 'se o companheiro morrer (permanente; perturbado até o fim da cena)' },
      ],
    },
  },
  {
    id: 'astronauta', nome: 'Astronauta', ref: SAH(8), pericias: ['ciencias', 'fortitude'],
    poder: {
      id: 'acostumado-ao-extremo', nome: 'Acostumado ao Extremo', ref: SAH(8), custoPe: 1,
      efeitos: (['fogo', 'frio', 'mental'] as const).map((dano): Efeito => ({
        alvo: 'resistencia', dano, valor: 5, condicional: 'ao sofrer o dano, gastando 1 PE (+1 PE a cada uso a mais na cena)',
      })),
    },
  },
  // Profissão (cozinheiro)
  {
    id: 'chef-do-outro-lado', nome: 'Chef do Outro Lado', ref: SAH(8), pericias: ['ocultismo', 'profissao'],
    poder: {
      id: 'fome-do-outro-lado', nome: 'Fome do Outro Lado', ref: SAH(8),
      efeitos: [
        nota('Ingrediente de criatura: cat. I, 0,5 espaço. Prato: Profissão (cozinheiro) DT 15 + 1d20; RD 10 ou vulnerabilidade ao elemento dela, até o fim da próxima cena.'),
        { alvo: 'san', fixo: -1, condicional: 'por refeição (permanente)' },
      ],
    },
  },
  {
    id: 'colegial', nome: 'Colegial', ref: SAH(9), pericias: ['atualidades', 'tecnologia'],
    poder: {
      id: 'poder-da-amizade', nome: 'Poder da Amizade', ref: SAH(9),
      escolha: { tipo: 'texto', rotulo: 'Melhor amigo' },
      efeitos: [
        { alvo: 'pericia', pericia: 'todas', valor: 2, condicional: 'em alcance médio do melhor amigo, os dois se vendo' },
        { alvo: 'pe', porNex: -1, condicional: 'se o melhor amigo morrer, até o fim da missão' },
      ],
    },
  },
  {
    id: 'cosplayer', nome: 'Cosplayer', ref: SAH(9), pericias: ['artes', 'vontade'],
    poder: {
      id: 'nao-e-fantasia-e-cosplay', nome: 'Não é Fantasia, é Cosplay!', ref: SAH(9),
      efeitos: [
        { alvo: 'pericia', pericia: 'todas', valor: 2, condicional: 'teste ligado ao cosplay que veste' },
        nota('Disfarce: pode usar Artes no lugar de Enganação.'),
      ],
    },
  },
  {
    id: 'diplomata', nome: 'Diplomata', ref: SAH(9), pericias: ['atualidades', 'diplomacia'],
    poder: {
      id: 'conexoes', nome: 'Conexões', ref: SAH(9), custoPe: 2,
      efeitos: [
        { alvo: 'pericia', pericia: 'diplomacia', valor: 2 },
        nota('Contato com NPC que possa ajudar: 10 min e 2 PE trocam um teste da área dele, até o fim da cena, por Diplomacia.'),
      ],
    },
  },
  {
    id: 'explorador', nome: 'Explorador', ref: SAH(9), pericias: ['fortitude', 'sobrevivencia'],
    poder: {
      id: 'manual-do-sobrevivente', nome: 'Manual do Sobrevivente', ref: SAH(9), custoPe: 2,
      efeitos: [
        { alvo: 'resistenciaTeste', valor: 5, condicional: 'contra armadilha, clima, doença, fome, sede, fumaça, sono, sufocamento ou veneno; gastando 2 PE' },
        nota('Interlúdio: sono precário conta como normal.'),
      ],
    },
  },
  {
    id: 'experimento', nome: 'Experimento', ref: SAH(9), pericias: ['atletismo', 'fortitude'],
    poder: {
      id: 'mutacao', nome: 'Mutação', ref: SAH(9),
      escolha: { tipo: 'pericia', de: ['acrobacia', 'atletismo', 'crime', 'fortitude', 'furtividade', 'iniciativa', 'luta', 'pilotagem', 'pontaria', 'reflexos'] },
      efeitos: [
        { alvo: 'resistencia', dano: 'todos', valor: 2 },
        { alvo: 'pericia', pericia: 'escolhida', valor: 2 },
        { alvo: 'pericia', pericia: 'diplomacia', dados: -1 },
      ],
    },
  },
  {
    id: 'fanatico-por-criaturas', nome: 'Fanático por Criaturas', ref: SAH(10), pericias: ['investigacao', 'ocultismo'],
    poder: {
      id: 'conhecimento-oculto', nome: 'Conhecimento Oculto', ref: SAH(10),
      efeitos: [
        nota('Ocultismo identifica criatura por indícios indiretos (imagem, rastros).'),
        { alvo: 'pericia', pericia: 'todas', valor: 2, condicional: 'contra criatura que identificou com Ocultismo, até o fim da missão' },
      ],
    },
  },
  {
    id: 'fotografo', nome: 'Fotógrafo', ref: SAH(10), pericias: ['artes', 'percepcao'],
    poder: {
      id: 'atraves-da-lente', nome: 'Através da Lente', ref: SAH(10), custoPe: 2,
      efeitos: [
        ...bonus(['investigacao', 'percepcao'], 5, 'olhando por câmera ou fotos, gastando 2 PE'),
        { alvo: 'pericia', pericia: 'todas', valor: 5, condicional: 'para adquirir pistas por câmera ou fotos, gastando 2 PE' },
        nota('Andando enquanto olha pela lente: metade do deslocamento.'),
      ],
    },
  },
  // Profissão (engenheiro). O poder fica na p. 11.
  {
    id: 'inventor-paranormal', nome: 'Inventor Paranormal', ref: SAH(10), pericias: ['profissao', 'vontade'],
    poder: {
      id: 'invencao-paranormal', nome: 'Invenção Paranormal', ref: SAH(11),
      escolha: { tipo: 'ritual', circuloMax: 1 },
      efeitos: [nota('Invento (cat. 0, 1 espaço) com o ritual, sem PE: Profissão (engenheiro) DT 15, +5 por uso na missão; troca o ritual a cada missão.')],
    },
  },
  {
    id: 'jovem-mistico', nome: 'Jovem Místico', ref: SAH(11), pericias: ['ocultismo', 'religiao'],
    poder: {
      id: 'a-culpa-e-das-estrelas', nome: 'A Culpa é das Estrelas', ref: SAH(11), custoPe: 1,
      escolha: { tipo: 'texto', rotulo: 'Número da sorte (1 a 6)' },
      efeitos: [
        { alvo: 'pericia', pericia: 'todas', valor: 2, condicional: 'na cena em que sair seu número (1 PE e 1d6 no início)' },
        nota('Sem acerto, soma mais um número da sorte na próxima vez; acertando, volta a um.'),
      ],
    },
  },
  {
    id: 'legista-do-turno-da-noite', nome: 'Legista do Turno da Noite', ref: SAH(11), pericias: ['ciencias', 'medicina'],
    poder: {
      id: 'luto-habitual', nome: 'Luto Habitual', ref: SAH(11), custoPe: 2,
      efeitos: [
        { alvo: 'pericia', pericia: 'medicina', valor: 5, condicional: 'primeiros socorros ou necropsia, gastando 2 PE' },
        nota('Metade do dano mental por cenas da rotina de um legista.'),
      ],
    },
  },
  {
    id: 'mateiro', nome: 'Mateiro', ref: SAH(12), pericias: ['percepcao', 'sobrevivencia'],
    poder: {
      id: 'mapa-celeste', nome: 'Mapa Celeste', ref: SAH(12), custoPe: 2,
      efeitos: [
        nota('Sobrevivência: 2 PE para rolar de novo e ficar com o melhor.'),
        nota('Vendo o céu, sabe os pontos cardeais e acha lugares onde já esteve.'),
        nota('Interlúdio: sono precário conta como normal.'),
      ],
    },
  },
  {
    id: 'mergulhador', nome: 'Mergulhador', ref: SAH(12), pericias: ['atletismo', 'fortitude'],
    poder: {
      id: 'folego-de-nadador', nome: 'Fôlego de Nadador', ref: SAH(12),
      efeitos: [{ alvo: 'pv', fixo: 5 }, nota('Prende a respiração por 2 × Vigor rodadas; nadando, anda o deslocamento inteiro.')],
    },
  },
  {
    id: 'motorista', nome: 'Motorista', ref: SAH(13), pericias: ['pilotagem', 'reflexos'],
    poder: {
      id: 'maos-no-volante', nome: 'Mãos no Volante', ref: SAH(13), custoPe: 2,
      efeitos: [
        { alvo: 'pericia', pericia: 'pilotagem', valor: 5, condicional: 'pilotando, gastando 2 PE' },
        { alvo: 'resistenciaTeste', valor: 5, condicional: 'pilotando, gastando 2 PE' },
        nota('Sem penalidade de ataque em veículo em movimento.'),
      ],
    },
  },
  {
    id: 'nerd-entusiasta', nome: 'Nerd Entusiasta', ref: SAH(13), pericias: ['ciencias', 'tecnologia'],
    poder: {
      id: 'o-inteligentao', nome: 'O Inteligentão', ref: SAH(13),
      efeitos: [nota('Ler (interlúdio): +2d6 em vez de +1d6.')],
    },
  },
  // Perícias: Vontade e mais uma à escolha, ligada à premonição. Os tipos não
  // têm "uma fixa + uma à escolha": a escolha fica com uma só e a Vontade
  // treinada entra pelo efeito `treino` do poder (se o jogador escolher
  // Vontade de novo, o CRONA avisa que ela já era treinada).
  {
    id: 'profetizado', nome: 'Profetizado', ref: SAH(13), pericias: { escolha: 1, texto: 'além de Vontade, uma ligada à premonição' },
    poder: {
      id: 'luta-ou-fuga', nome: 'Luta ou Fuga', ref: SAH(13),
      escolha: { tipo: 'texto', rotulo: 'Premonição da morte' },
      efeitos: [
        { alvo: 'treino', pericia: 'vontade' },
        { alvo: 'pericia', pericia: 'vontade', valor: 2 },
        nota('+2 PE temporários até o fim da cena quando surge sinal da premonição.'),
      ],
    },
  },
  // Profissão (psicólogo)
  {
    id: 'psicologo', nome: 'Psicólogo', ref: SAH(13), pericias: ['intuicao', 'profissao'],
    poder: {
      id: 'terapia', nome: 'Terapia', ref: SAH(13), custoPe: 2,
      efeitos: [
        nota('Profissão (psicólogo) vale como Diplomacia.'),
        nota('1 vez por rodada, 2 PE: quem falhar em resistência contra dano mental (você ou aliado em alcance curto) usa seu teste de Profissão (psicólogo).'),
      ],
    },
  },
  {
    id: 'reporter-investigativo', nome: 'Repórter Investigativo', ref: SAH(13), pericias: ['atualidades', 'investigacao'],
    poder: {
      id: 'encontrar-a-verdade', nome: 'Encontrar a Verdade', ref: SAH(13), custoPe: 2,
      efeitos: [
        { alvo: 'pericia', pericia: 'investigacao', valor: 5, condicional: 'gastando 2 PE' },
        nota('Investigação no lugar de Diplomacia para persuadir e mudar atitude.'),
      ],
    },
  },
];
