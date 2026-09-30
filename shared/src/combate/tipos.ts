/**
 * Combate: quem está na luta, a ordem de iniciativa, a rodada e o turno.
 * A regra está em docs/COMBATE.md; a tela, em docs/TELA-COMBATE.md.
 *
 * Montar o combate, Iniciativa, rodadas e turnos, atrasar, preparar, quem
 * chega depois, surpresa, as ações usadas no turno, os contadores de morrendo
 * e enlouquecendo, o ataque com o dano, as condições, o PE gasto, o ritual
 * sustentado e o registro. Só o mestre mexe; os dados são físicos (o mestre
 * digita os resultados).
 */
import type { TipoDano } from '../regras/tipos';

/** Lado de cada ser: os agentes têm turno próprio; inimigos e neutros agem no turno do mestre. */
export type Lado = 'agente' | 'inimigo' | 'neutro';
export const LADOS: Lado[] = ['agente', 'inimigo', 'neutro'];

export type Fase = 'montando' | 'andamento' | 'encerrado';

/** Por que um ser saiu do combate. */
export type Saida = 'morto' | 'insano' | 'saiu';

export interface Participante {
  /** id da peça no tabuleiro */
  id: number;
  nome: string;
  lado: Lado;
  /** ciente dos inimigos no começo; quem não está fica surpreendido na rodada 1 (LR p. 83) */
  ciente: boolean;
  /** Iniciativa do agente (os seres do mestre usam a do grupo) */
  iniciativa: number | null;
  /** desempate: o maior age antes */
  desempate: number;
  /** age a partir desta rodada (quem chega depois age na seguinte, LR p. 83) */
  desde: number;
  /** saiu do combate */
  fora?: Saida;
  /** turnos começados morrendo e enlouquecendo nesta cena (LR p. 88) */
  morrendo: number;
  enlouquecendo: number;
  /** já usou a defesa especial (bloqueio, esquiva ou contra-ataque) desde o começo do próprio turno */
  reacao: boolean;
  /** condições marcadas no combate (ids do catálogo). As dos agentes ficam na ficha deles. */
  condicoes?: string[];
  /** ritual que o ser sustenta: paga 1 PE no começo de cada turno (LR p. 120) */
  sustenta?: string;
}

/** Ação preparada: acontece como reação até o próximo turno de quem preparou (LR p. 86). */
export interface Preparada {
  entrada: string;
  texto: string;
  rodada: number;
}

export type TipoRegistro = 'rodada' | 'turno' | 'acao' | 'estado' | 'nota';

export interface LinhaRegistro {
  em: number;
  rodada: number;
  tipo: TipoRegistro;
  texto: string;
  /** trechos do texto em vermelho (acerto crítico, machucado) */
  destaque?: string[];
}

/** O que a vez já usou no turno (LR p. 84), e o PE gasto (o limite de PE vale para o turno, LR p. 23). */
export interface AcoesTurno {
  padrao: boolean;
  movimento: boolean;
  completa: boolean;
  /** PE gastos desde o começo do turno */
  pe?: number;
}

export type ResultadoAtaque = 'erro' | 'acerto' | 'critico';

/** O último ataque confirmado: a mesa mostra a linha e o carimbo por um instante. */
export interface UltimoAtaque {
  quem: number;
  alvo: number;
  resultado: ResultadoAtaque;
  multiplicador?: number;
  em: number;
}

export interface Combate {
  fase: Fase;
  /** cena onde o combate começou */
  cena: number;
  /** 0 enquanto monta */
  rodada: number;
  /** entrada da vez: "p:<id>" (agente) ou "mestre" */
  vez: string | null;
  /** entradas que já tiveram o turno nesta rodada */
  agiram: string[];
  participantes: Participante[];
  /** Iniciativa do grupo do mestre: um teste por todos, com o menor bônus (LR p. 83) */
  mestre: { iniciativa: number | null; desempate: number };
  /** o que cada ser da vez já usou (no turno do mestre, cada ser tem as próprias ações), pelo id da peça */
  acoes: Record<string, AcoesTurno>;
  preparadas: Preparada[];
  registro: LinhaRegistro[];
  /** quando começou (ms) */
  inicio: number;
  ultimo?: UltimoAtaque;
}

/** Um lugar na ordem de iniciativa: um agente, ou o turno do mestre com todos os seres dele. */
export interface Entrada {
  id: string;
  valor: number;
  desempate: number;
  participantes: number[];
  mestre: boolean;
}

/** Peça que pode entrar no combate (o servidor monta a lista a partir do tabuleiro). */
export interface PecaCombate {
  id: number;
  nome: string;
  /** peça ligada a uma ficha de agente */
  agente: boolean;
  /** está na cena onde o combate começa */
  naCena: boolean;
}

/** Tipos de ação para declarar (o que gastam do turno). */
export type TipoAcao = 'padrao' | 'movimento' | 'completa' | 'livre' | 'reacao';

/** Um ataque que o mestre confirmou na tela (os números já saem da tela; o servidor confere a forma e aplica). */
export interface AtaqueConfirmado {
  quem: number;
  alvo: number;
  /** nome da arma ou do ataque */
  arma: string;
  /** ação que o ataque gasta */
  qual: 'padrao' | 'completa';
  /** o teste: dados, bônus, o d20 que ficou, o total e a Defesa contra */
  teste: { dados: number; bonus: number; d20: number; total: number; defesa: number };
  /** situações que pesaram (nomes curtos, para o registro) */
  situacoes: string[];
  /** chance de falha (camuflagem): a chance, o d10 e se falhou */
  falha?: { chance: number; d10: number; falhou: boolean };
  resultado: ResultadoAtaque;
  multiplicador?: number;
  /** o dano: a fórmula rolada, a soma dos dados, o total e o que ficou depois de resistência e RD */
  dano?: { formula: string; soma: number; total: number; tipo: string; conta: string; final: number; naoLetal?: boolean };
  /** defesa especial que o alvo usou */
  reacao?: 'esquiva' | 'bloqueio';
  /** errou um golpe corpo a corpo e o alvo pode contra-atacar (lembrete no registro) */
  contraAtaque?: boolean;
}

/** O que a tela do mestre pede (o servidor confere e aplica). */
export type AcaoCombate =
  /** abre o combate na cena atual, com as peças dela */
  | { tipo: 'abrir' }
  /** montando: inclui, tira ou muda um participante; andamento: corrige a Iniciativa */
  | { tipo: 'participante'; id: number; incluir?: boolean; lado?: Lado; ciente?: boolean; iniciativa?: number | null; desempate?: number }
  | { tipo: 'iniciativaMestre'; valor: number | null; desempate?: number }
  | { tipo: 'comecar' }
  | { tipo: 'passar' }
  | { tipo: 'atrasar'; valor: number }
  | { tipo: 'preparar'; texto: string }
  | { tipo: 'usarPreparada'; entrada: string }
  /** marca ou desmarca à mão o que um ser da vez já usou */
  | { tipo: 'orcamento'; qual: 'padrao' | 'movimento' | 'completa'; usada: boolean; quem?: number }
  /**
   * Declara uma ação: vai para o registro e gasta o que ela custa. `quem` = qual
   * ser age (no turno do mestre); `especial` = reação de defesa especial
   * (bloqueio, esquiva, contra-ataque: uma por rodada).
   */
  | { tipo: 'declarar'; qual: TipoAcao; texto: string; quem?: number; especial?: boolean }
  | { tipo: 'reacao'; id: number; usada: boolean }
  /** alguém chega no meio: age a partir da rodada seguinte */
  | { tipo: 'entrar'; id: number; lado: Lado; iniciativa?: number | null }
  | { tipo: 'sair'; id: number; motivo?: Saida }
  | { tipo: 'nota'; texto: string }
  /** ataque resolvido na tela: aplica o dano no alvo e escreve no registro */
  | { tipo: 'ataque'; ataque: AtaqueConfirmado }
  /** marca ou tira uma condição de um ser do combate */
  | { tipo: 'condicao'; id: number; condicao: string; ativa: boolean }
  /** gasta PE de quem age (habilidade, ritual): conta no limite do turno */
  | { tipo: 'gastarPe'; quem: number; pe: number; motivo: string }
  /** começa ou para de sustentar um ritual */
  | { tipo: 'sustentar'; id: number; ritual: string | null }
  /** muda PV, PE ou SAN de um ser (cura, socorro, dano de fora do ataque), com o motivo no registro */
  | { tipo: 'vitais'; id: number; pv?: number; pe?: number; san?: number; motivo: string }
  | { tipo: 'encerrar' }
  | { tipo: 'fechar' }
  | { tipo: 'desfazer' };

/** O que o servidor sabe na hora de aplicar uma ação. */
export interface Contexto {
  agora: number;
  /** cena atual do mestre (para abrir o combate) */
  cena: number;
  /** as peças da campanha */
  pecas: PecaCombate[];
  /** PV, PE e SAN de cada peça (contadores de morrendo e enlouquecendo, dano, PE gasto) */
  vitais: (id: number) => Vitais | null;
}

/** PV, PE e SAN (igual ao `Vitals` da sessão; repetido aqui para o módulo não depender da sessão). */
export interface Vitais {
  pv: number;
  pvMax: number;
  pe: number;
  peMax: number;
  san: number;
  sanMax: number;
}

/** O que muda fora do combate: os PV, PE e SAN das peças (valores novos). */
export interface MudancaVitais {
  id: number;
  pv?: number;
  pe?: number;
  san?: number;
}

export type Resultado = { ok: true; combate: Combate | null; vitais?: MudancaVitais[] } | { ok: false; motivo: string };

// ------------------------------------------------------------------ ameaças

/** Teste da ameaça em dados + bônus (ex.: Fortitude 2d20+5). */
export interface TesteAmeaca {
  dados: number;
  bonus: number;
}

/** Um ataque da ficha da ameaça (LR p. 178–179). */
export interface AtaqueAmeaca {
  nome: string;
  pericia: 'luta' | 'pontaria';
  dados: number;
  bonus: number;
  /** dano como na ficha: "2d6+3" */
  dano: string;
  tipo: TipoDano;
  margem: number;
  multiplicador: number;
  /** alcance da arma: curto, médio, longo, extremo (sem alcance = corpo a corpo) */
  alcance?: string;
}

/**
 * Ficha rápida de ameaça (NPC ou criatura), preenchida pelo mestre a partir do
 * livro: só os números que o combate usa (COMBATE.md, seção 17). PV ficam na
 * peça, como os dos agentes.
 */
export interface FichaAmeaca {
  /** descritor: Pessoa, Criatura de Sangue... */
  tipo: string;
  vd?: number;
  defesa: number;
  fortitude: TesteAmeaca;
  reflexos: TesteAmeaca;
  vontade: TesteAmeaca;
  rd: Partial<Record<TipoDano, number>>;
  imunidades: TipoDano[];
  vulnerabilidades: TipoDano[];
  ataques: AtaqueAmeaca[];
  notas?: string;
}
