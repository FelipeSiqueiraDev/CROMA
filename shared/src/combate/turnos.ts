/**
 * As regras da ordem de iniciativa, da rodada e do turno (LR p. 83–88;
 * docs/COMBATE.md, seções 3 a 5 e 10 a 11). Funções puras: recebem o combate
 * e devolvem uma cópia mudada, ou o motivo da recusa.
 */
import { condicao as condicaoDoCatalogo } from '../regras/dados';
import { consequencia, METROS_POR_CASA, textoMetros } from './ataque';
import { casasEmpurrao, empurraUmQuadrado, manobra as defManobra, type ManobraId } from './manobra';
import {
  LADOS,
  type AcaoCombate,
  type AcoesTurno,
  type Combate,
  type Contexto,
  type Entrada,
  type FichaAmeaca,
  type Lado,
  type MudancaVitais,
  type Participante,
  type PecaCombate,
  type Resultado,
  type ResultadoAtaque,
  type Saida,
  type TipoAcao,
  type TipoRegistro,
} from './tipos';

const MAX_REGISTRO = 400;
const MAX_TEXTO = 200;

/** Id do lugar do mestre na ordem de iniciativa. */
export const ID_MESTRE = 'mestre';
/** Id do lugar de um agente na ordem de iniciativa. */
export const idAgente = (id: number) => `p:${id}`;

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const texto = (v: unknown, max = MAX_TEXTO) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const inteiro = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : undefined;
const livre = (): AcoesTurno => ({ padrao: false, movimento: false, completa: false, pe: 0 });

/** Inimigos e neutros agem no turno do mestre (LR p. 169). */
export const doMestre = (p: Participante) => p.lado !== 'agente';

function participanteNovo(p: PecaCombate, desde: number): Participante {
  return { id: p.id, nome: p.nome, lado: p.agente ? 'agente' : 'inimigo', ciente: true, iniciativa: null, desempate: 0, desde, morrendo: 0, enlouquecendo: 0, reacao: false };
}

/** Combate novo, montando, com as peças que estão na cena. */
export function novoCombate(cena: number, pecas: PecaCombate[], agora: number): Combate {
  return {
    fase: 'montando',
    cena,
    rodada: 0,
    vez: null,
    agiram: [],
    participantes: pecas.filter((p) => p.naCena).map((p) => participanteNovo(p, 1)),
    mestre: { iniciativa: null, desempate: 0 },
    acoes: {},
    preparadas: [],
    registro: [],
    inicio: agora,
  };
}

/** A ordem de iniciativa: um lugar por agente e um para o mestre (se ele tiver seres), do maior para o menor. */
export function entradas(c: Combate): Entrada[] {
  const out: Entrada[] = [];
  for (const p of c.participantes)
    if (p.lado === 'agente' && p.iniciativa !== null) out.push({ id: idAgente(p.id), valor: p.iniciativa, desempate: p.desempate, participantes: [p.id], mestre: false });
  const doM = c.participantes.filter(doMestre);
  if (doM.length && c.mestre.iniciativa !== null)
    out.push({ id: ID_MESTRE, valor: c.mestre.iniciativa, desempate: c.mestre.desempate, participantes: doM.map((p) => p.id), mestre: true });
  // empate que o desempate não resolveu: o agente vai antes (o mestre pede a rolagem de desempate na montagem)
  return out.sort((a, b) => b.valor - a.valor || b.desempate - a.desempate || Number(a.mestre) - Number(b.mestre));
}

export function entrada(c: Combate, id: string | null): Entrada | undefined {
  return id ? entradas(c).find((e) => e.id === id) : undefined;
}

export function participante(c: Combate, id: number): Participante | undefined {
  return c.participantes.find((p) => p.id === id);
}

/** Surpreendido: não percebeu os inimigos; desprevenido e sem turno na rodada 1 (LR p. 83–84). */
export const surpreendido = (c: Combate, p: Participante) => c.rodada <= 1 && !p.ciente;

/** Quem do lugar pode agir numa rodada: dentro do combate, já chegou e não está surpreendido. */
export function ativosDa(c: Combate, e: Entrada, rodada = c.rodada): Participante[] {
  const out: Participante[] = [];
  for (const id of e.participantes) {
    const p = participante(c, id);
    if (p && !p.fora && p.desde <= rodada && !(rodada === 1 && !p.ciente)) out.push(p);
  }
  return out;
}

/** Nome do lugar na ordem: o agente, ou "Turno do mestre". */
export function nomeEntrada(c: Combate, e: Entrada): string {
  return e.mestre ? 'Turno do mestre' : (participante(c, e.participantes[0])?.nome ?? '?');
}

/** Empates que o desempate não resolveu (o mestre pede uma rolagem entre eles, LR p. 83). */
export function empates(c: Combate): Entrada[][] {
  const out: Entrada[][] = [];
  const es = entradas(c);
  for (let i = 0; i < es.length; ) {
    let j = i + 1;
    while (j < es.length && es[j].valor === es[i].valor && es[j].desempate === es[i].desempate) j++;
    if (j - i > 1) out.push(es.slice(i, j));
    i = j;
  }
  return out;
}

/** O que um ser da vez já usou no turno. */
export function acoesDe(c: Combate, id: number): AcoesTurno {
  return c.acoes[String(id)] ?? livre();
}

function registrar(c: Combate, agora: number, tipo: TipoRegistro, t: string, destaque?: string[]) {
  c.registro.push({ em: agora, rodada: c.rodada, tipo, texto: t, ...(destaque?.length ? { destaque } : {}) });
  if (c.registro.length > MAX_REGISTRO) c.registro.splice(0, c.registro.length - MAX_REGISTRO);
}

/** Começo do turno de um lugar (COMBATE.md, seção 4.3). */
function comecarTurno(c: Combate, e: Entrada, ctx: Contexto) {
  const ps = ativosDa(c, e);
  c.acoes = {};
  for (const p of ps) {
    c.acoes[String(p.id)] = livre();
    // a defesa especial volta no começo do próprio turno (DC-7)
    p.reacao = false;
  }
  registrar(c, ctx.agora, 'turno', e.mestre ? `Turno do mestre: ${ps.map((p) => p.nome).join(', ')}.` : `Vez de ${nomeEntrada(c, e)}.`);
  // ação preparada que não foi usada até aqui se perde (LR p. 86)
  const i = c.preparadas.findIndex((x) => x.entrada === e.id);
  if (i >= 0) {
    const [x] = c.preparadas.splice(i, 1);
    registrar(c, ctx.agora, 'estado', `${nomeEntrada(c, e)} não usou a ação preparada (${x.texto}).`);
  }
  // contadores de morrendo e enlouquecendo dos agentes (LR p. 88). Ameaça a 0 PV: o mestre tira do combate (DC-16)
  for (const p of ps) {
    if (p.lado !== 'agente') continue;
    const v = ctx.vitais(p.id);
    if (!v) continue;
    if (v.pv <= 0) {
      p.morrendo += 1;
      if (p.morrendo >= 3) {
        p.fora = 'morto';
        registrar(c, ctx.agora, 'estado', `${p.nome} começou o 3º turno morrendo nesta cena e morreu (LR p. 88).`);
        continue;
      }
      registrar(c, ctx.agora, 'estado', `${p.nome} começa o turno morrendo (${p.morrendo}/3).`);
    }
    if (v.san <= 0) {
      p.enlouquecendo += 1;
      if (p.enlouquecendo >= 3) {
        p.fora = 'insano';
        registrar(c, ctx.agora, 'estado', `${p.nome} começou o 3º turno enlouquecendo nesta cena e chegou à insanidade: passa para o mestre (LR p. 88).`);
        continue;
      }
      registrar(c, ctx.agora, 'estado', `${p.nome} começa o turno enlouquecendo (${p.enlouquecendo}/3).`);
    }
  }
  for (const p of ps) {
    if (p.fora) continue;
    // ritual sustentado: 1 PE (ação livre) ou o ritual acaba (LR p. 120)
    if (p.sustenta) registrar(c, ctx.agora, 'estado', `${p.nome} sustenta ${p.sustenta}: paga 1 PE agora ou o ritual acaba (LR p. 120).`);
    const cs = p.condicoes ?? [];
    if (cs.includes('em-chamas')) registrar(c, ctx.agora, 'estado', `${p.nome} está em chamas: sofre 1d6 de fogo (LR p. 310).`);
    if (cs.includes('sangrando')) registrar(c, ctx.agora, 'estado', `${p.nome} está sangrando: Vigor DT 20; passou, estabiliza; falhou, perde 1d6 PV (LR p. 311).`);
    if (cs.includes('confuso')) registrar(c, ctx.agora, 'estado', `${p.nome} está confuso: role 1d6 (LR p. 310).`);
    const agarrado = c.participantes.find((q) => q.agarra === p.id && !q.fora);
    if (agarrado) registrar(c, ctx.agora, 'estado', `${p.nome} está agarrado por ${agarrado.nome}: soltar-se é ação padrão com teste de manobra (LR p. 85).`);
    const preso = p.agarra ? participante(c, p.agarra) : undefined;
    if (preso && !preso.fora) registrar(c, ctx.agora, 'estado', `${p.nome} agarra ${preso.nome}: uma mão ocupada, anda à metade; soltar é ação livre (LR p. 85).`);
  }
}

function comCondicao(p: Participante, id: string) {
  p.condicoes = [...new Set([...(p.condicoes ?? []), id])];
}

function semCondicao(p: Participante, id: string) {
  const s = (p.condicoes ?? []).filter((x) => x !== id);
  if (s.length) p.condicoes = s;
  else delete p.condicoes;
}

/** Quem agarra `p` deixa de agarrar (o alvo se soltou, saiu ou perdeu a condição). */
function largarQuemAgarra(c: Combate, p: Participante) {
  for (const q of c.participantes) if (q.agarra === p.id) delete q.agarra;
}

/** `p` solta quem ele agarra; o alvo sai do agarrado se ninguém mais o segura. */
function soltarAgarrado(c: Combate, p: Participante): Participante | undefined {
  const alvo = p.agarra ? participante(c, p.agarra) : undefined;
  delete p.agarra;
  if (alvo && !c.participantes.some((q) => q.agarra === alvo.id)) semCondicao(alvo, 'agarrado');
  return alvo;
}

/** Passa a vez para o próximo lugar que pode agir; quando todos agiram, começa outra rodada. */
function proximo(c: Combate, ctx: Contexto) {
  for (let guarda = 0; guarda < 500; guarda++) {
    const prox = entradas(c).find((e) => !c.agiram.includes(e.id) && ativosDa(c, e).length > 0);
    if (!prox) {
      if (!entradas(c).some((e) => ativosDa(c, e, c.rodada + 1).length > 0)) {
        c.vez = null;
        c.acoes = {};
        registrar(c, ctx.agora, 'estado', 'Ninguém mais pode agir.');
        return;
      }
      c.rodada += 1;
      c.agiram = [];
      registrar(c, ctx.agora, 'rodada', `Rodada ${c.rodada}.`);
      continue;
    }
    c.vez = prox.id;
    comecarTurno(c, prox, ctx);
    if (ativosDa(c, prox).length > 0) return;
    // morreu ou enlouqueceu no começo do turno: a vez passa
    c.agiram.push(prox.id);
  }
}

/** Muda a Iniciativa de um lugar (o agente, ou o grupo do mestre). */
function porIniciativa(c: Combate, e: Entrada, valor: number, desempate: number) {
  if (e.mestre) c.mestre = { iniciativa: valor, desempate };
  else {
    const p = participante(c, e.participantes[0]);
    if (p) {
      p.iniciativa = valor;
      p.desempate = desempate;
    }
  }
}

/**
 * Presença perturbadora das criaturas no combate (LR p. 180): quem as vê faz
 * Vontade; com várias, vale a de maior VD, +1d6 por criatura a mais. O mestre
 * pede o teste uma vez por cena para cada personagem (DC-15).
 */
function lembrarPresenca(c: Combate, ctx: Contexto, quemChega?: Participante) {
  if (!ctx.ameaca) return;
  const com = c.participantes
    .filter((p) => !p.fora && p.lado !== 'agente')
    .map((p) => ({ p, f: ctx.ameaca!(p.id) }))
    .filter((x): x is { p: Participante; f: FichaAmeaca & { presenca: NonNullable<FichaAmeaca['presenca']> } } => !!x.f?.presenca);
  if (!com.length || (quemChega && !com.some((x) => x.p.id === quemChega.id))) return;
  const maior = com.reduce((a, b) => ((b.f.vd ?? 0) > (a.f.vd ?? 0) ? b : a));
  const pr = maior.f.presenca;
  const extra = com.length - 1;
  const quem = com.length > 1 ? ` (${com.length} criaturas; vale a de ${maior.p.nome})` : ` de ${maior.p.nome}`;
  registrar(
    c,
    ctx.agora,
    'estado',
    `Presença perturbadora${quem}: quem a vê faz Vontade DT ${pr.dt}; falhou, ${pr.dano}${extra ? `+${extra}d6` : ''} de dano mental; passou, metade. NEX ${pr.nex}% ou mais é imune (LR p. 180; uma vez por cena, DC-15).`,
  );
}

const NOME_SAIDA: Record<Saida, string> = { morto: 'morreu', insano: 'chegou à insanidade', saiu: 'saiu do combate' };
const NOME_ACAO: Record<TipoAcao, string> = { padrao: 'ação padrão', movimento: 'ação de movimento', completa: 'ação completa', livre: 'ação livre', reacao: 'reação' };

/**
 * Ataque confirmado na tela: gasta a ação, marca a defesa especial do alvo,
 * escreve o teste e o dano no registro e devolve os PV novos do alvo (LR p.
 * 82, 85, 88; COMBATE.md, seções 6 e 8). Os números vêm da tela do mestre, que
 * fez a conta com as mesmas regras (ataque.ts).
 */
function ataque(c: Combate, x: unknown, ctx: Contexto, e: Entrada | undefined): Resultado {
  const erro = (motivo: string): Resultado => ({ ok: false, motivo });
  if (!x || typeof x !== 'object') return erro('Ataque inválido.');
  const o = x as Record<string, unknown>;
  if (!e) return erro('Não há turno em andamento.');
  const quem = participante(c, inteiro(o.quem, 1, 1e9) ?? 0);
  if (!quem || quem.fora || !e.participantes.includes(quem.id)) return erro('Quem ataca não está na vez.');
  const alvo = participante(c, inteiro(o.alvo, 1, 1e9) ?? 0);
  if (!alvo || alvo.fora) return erro('O alvo não está no combate.');
  const ac = { ...acoesDe(c, quem.id) };
  const vezes = inteiro(o.vezes, 1, 6) ?? 1;
  let golpe = '';
  if (o.qual === 'completa') {
    if (ac.padrao || ac.movimento || ac.completa) return erro('A ação completa precisa do turno inteiro livre.');
    ac.completa = true;
  } else {
    if (ac.completa) return erro('A ação completa já gastou o turno.');
    if (ac.padrao) {
      // o "×2" da ameaça: mais um ataque na mesma ação (LR p. 179)
      if (!ac.golpes) return erro('A ação padrão já foi usada neste turno.');
      ac.golpes -= 1;
      golpe = ' (outro ataque da mesma ação)';
    } else {
      ac.padrao = true;
      if (vezes > 1) ac.golpes = vezes - 1;
    }
  }
  const reacao = o.reacao === 'esquiva' || o.reacao === 'bloqueio' ? o.reacao : null;
  if (reacao) {
    if (alvo.lado !== 'agente') return erro('Ameaças não usam defesas especiais (LR p. 179).');
    if (alvo.reacao) return erro(`${alvo.nome} já usou a defesa especial desta rodada.`);
  }
  const t = (o.teste && typeof o.teste === 'object' ? o.teste : {}) as Record<string, unknown>;
  const d20 = inteiro(t.d20, 1, 20);
  const total = inteiro(t.total, -99, 999);
  const defesa = inteiro(t.defesa, -99, 999);
  if (d20 === undefined || total === undefined || defesa === undefined) return erro('Falta o resultado do teste.');
  const resultado: ResultadoAtaque = o.resultado === 'critico' || o.resultado === 'acerto' ? o.resultado : 'erro';
  const mult = resultado === 'critico' ? (inteiro(o.multiplicador, 2, 10) ?? 2) : undefined;
  const arma = texto(o.arma, 60) || 'ataque';
  const sits = Array.isArray(o.situacoes) ? o.situacoes.map((s) => texto(s, 40)).filter(Boolean).slice(0, 10) : [];

  if (reacao) alvo.reacao = true;
  c.acoes[String(quem.id)] = ac;
  let linha = `${quem.nome} ataca ${alvo.nome} com ${arma}${golpe}${reacao ? ` (${alvo.nome} usa ${reacao})` : ''}: d20 ${d20}, total ${total} contra Defesa ${defesa}`;
  if (sits.length) linha += ` (${sits.join(', ')})`;
  const f = o.falha && typeof o.falha === 'object' ? (o.falha as Record<string, unknown>) : null;
  const d10 = f ? inteiro(f.d10, 1, 10) : undefined;
  const chance = f ? inteiro(f.chance, 0, 100) : undefined;
  if (d10 !== undefined && chance) linha += `; falha ${chance}%: d10 ${d10}${f!.falhou ? ', falhou' : ''}`;
  const rotulo = resultado === 'erro' ? 'errou' : resultado === 'critico' ? `acerto crítico ×${mult}` : 'acertou';
  registrar(c, ctx.agora, 'acao', `${linha} — ${rotulo}.`, resultado === 'erro' ? undefined : [rotulo]);
  if (resultado === 'erro' && o.contraAtaque === true) registrar(c, ctx.agora, 'estado', `${alvo.nome} pode contra-atacar (Luta treinada, uma defesa especial por rodada; LR p. 88).`);

  const vitais: MudancaVitais[] = [];
  const d = o.dano && typeof o.dano === 'object' ? (o.dano as Record<string, unknown>) : null;
  if (resultado !== 'erro' && d) aplicarDano(c, alvo, d, ctx, vitais);
  c.ultimo = { quem: quem.id, alvo: alvo.id, resultado, ...(mult ? { multiplicador: mult } : {}), em: ctx.agora };
  return { ok: true, combate: c, vitais };
}

/**
 * Aplica um dano que a tela já contou: PV novos, machucado, dano massivo e 0
 * PV (LR p. 88). A 0 PV a peça deita (DC-19); a ameaça sai pelo mestre (DC-16).
 */
function aplicarDano(c: Combate, alvo: Participante, d: Record<string, unknown>, ctx: Contexto, vitais: MudancaVitais[]) {
  const final = inteiro(d.final, 0, 9999) ?? 0;
  const conta = texto(d.conta, 90);
  const formula = texto(d.formula, 30);
  const naoLetal = d.naoLetal === true;
  const v = ctx.vitais(alvo.id);
  if (!v) {
    registrar(c, ctx.agora, 'acao', `Dano ${formula}: ${conta}. ${alvo.nome} não tem PV marcados na peça.`);
    return;
  }
  // danos seguidos na mesma ação (ex.: mais de um alvo) partem dos PV já mudados
  const antes = vitais.find((m) => m.id === alvo.id)?.pv ?? v.pv;
  const q = consequencia({ pv: antes, pvMax: v.pvMax }, final);
  const estado = q.zerou ? '0 PV' : q.machucado ? 'machucado' : '';
  registrar(c, ctx.agora, 'acao', `Dano${naoLetal ? ' não letal' : ''} ${formula}: ${conta}. ${alvo.nome}: PV ${antes} → ${q.pv}${estado ? ` (${estado})` : ''}.`, estado ? [estado] : undefined);
  if (q.pv !== antes) {
    const m = vitais.find((x) => x.id === alvo.id);
    if (m) m.pv = q.pv;
    else vitais.push({ id: alvo.id, pv: q.pv });
  }
  if (q.massivo) registrar(c, ctx.agora, 'estado', `Dano massivo: ${alvo.nome} faz Fortitude DT ${q.massivo}; se falhar, vai a 0 PV (LR p. 88).`);
  if (q.zerou) {
    comCondicao(alvo, 'caido');
    registrar(
      c,
      ctx.agora,
      'estado',
      alvo.lado === 'agente'
        ? naoLetal
          ? `${alvo.nome} cai inconsciente (dano não letal, sem morrendo; LR p. 88).`
          : `${alvo.nome} cai inconsciente e morrendo (LR p. 88).`
        : `${alvo.nome} chegou a 0 PV: tire do combate (morte ou fora de combate, DC-16).`,
    );
  }
}

/**
 * Manobra confirmada na tela (LR p. 85–86; COMBATE.md, seção 9): gasta a ação
 * padrão (atropelar na investida é livre), escreve o teste oposto no registro e
 * aplica o que a manobra faz quando vence. Empurrões mexem na peça pela tela.
 */
function manobra(c: Combate, x: unknown, ctx: Contexto, e: Entrada | undefined): Resultado {
  const erro = (motivo: string): Resultado => ({ ok: false, motivo });
  if (!x || typeof x !== 'object') return erro('Manobra inválida.');
  const o = x as Record<string, unknown>;
  if (!e) return erro('Não há turno em andamento.');
  const def = typeof o.manobra === 'string' ? defManobra(o.manobra as ManobraId) : undefined;
  if (!def) return erro('Manobra desconhecida.');
  const quem = participante(c, inteiro(o.quem, 1, 1e9) ?? 0);
  if (!quem || quem.fora || !e.participantes.includes(quem.id)) return erro('Quem faz a manobra não está na vez.');
  const alvo = participante(c, inteiro(o.alvo, 1, 1e9) ?? 0);
  if (!alvo || alvo.fora) return erro('O alvo não está no combate.');
  if (alvo.id === quem.id) return erro('A manobra precisa de outro ser.');
  if (def.id === 'esmagar' && quem.agarra !== alvo.id) return erro(`${quem.nome} não está agarrando ${alvo.nome}.`);
  if (def.id === 'soltarse' && alvo.agarra !== quem.id) return erro(`${alvo.nome} não está agarrando ${quem.nome}.`);
  const ac = { ...acoesDe(c, quem.id) };
  if (!(o.qual === 'livre' && def.id === 'atropelar')) {
    if (ac.completa) return erro('A ação completa já gastou o turno.');
    if (ac.padrao) return erro('A ação padrão já foi usada neste turno.');
    ac.padrao = true;
  }
  const lado = (v: unknown) => {
    const t = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    return { d20: inteiro(t.d20, 1, 20), total: inteiro(t.total, -99, 999) };
  };
  const t = (o.teste && typeof o.teste === 'object' ? o.teste : {}) as Record<string, unknown>;
  const a = lado(t.quem);
  const b = lado(t.alvo);
  if (a.d20 === undefined || a.total === undefined || b.d20 === undefined || b.total === undefined) return erro('Falta o resultado dos dois testes.');
  if (a.total === b.total && a.d20 >= 20 === b.d20 >= 20) return erro('Empate: os dois rolam de novo (LR p. 75).');
  const venceu = o.venceu === true;
  const dif = inteiro(o.diferenca, 0, 999) ?? Math.abs(a.total - b.total);
  const mods = Array.isArray(o.modificadores) ? o.modificadores.map((s) => texto(s, 40)).filter(Boolean).slice(0, 10) : [];
  const arma = texto(o.arma, 60);
  c.acoes[String(quem.id)] = ac;
  let linha = `${quem.nome} tenta ${def.verbo} ${alvo.nome}${arma ? ` (${arma})` : ''}: teste de manobra d20 ${a.d20}, total ${a.total} contra d20 ${b.d20}, total ${b.total}`;
  if (mods.length) linha += ` (${mods.join(', ')})`;
  const rotulo = venceu ? `venceu por ${dif}` : `${alvo.nome} venceu`;
  registrar(c, ctx.agora, 'acao', `${linha} — ${rotulo}.`, venceu ? [rotulo] : undefined);
  const vitais: MudancaVitais[] = [];
  const est = (txt: string, destaque?: string[]) => registrar(c, ctx.agora, 'estado', txt, destaque);
  if (!venceu) {
    if (def.id === 'atropelar') est(`${alvo.nome} fica de pé e impede o avanço de ${quem.nome} (LR p. 86).`);
    return { ok: true, combate: c, vitais };
  }
  switch (def.id) {
    case 'agarrar':
      // uma mão agarra um ser: quem já agarrava outro, solta
      if (quem.agarra && quem.agarra !== alvo.id) soltarAgarrado(c, quem);
      quem.agarra = alvo.id;
      comCondicao(alvo, 'agarrado');
      est(`${alvo.nome} fica agarrado por ${quem.nome}: desprevenido e imóvel, só ataca com arma leve e sofre −1d20 nos ataques; ${quem.nome} fica com uma mão ocupada e anda à metade (LR p. 85).`);
      break;
    case 'derrubar':
      comCondicao(alvo, 'caido');
      est(`${alvo.nome} cai${empurraUmQuadrado(dif) ? ' e é empurrado 1 quadrado; perto de uma beirada, Reflexos DT 20 para se segurar' : ''} (LR p. 85).`);
      break;
    case 'desarmar':
      est(`O item de ${alvo.nome} cai ${empurraUmQuadrado(dif) ? `1 quadrado adiante, para onde ${quem.nome} escolher` : 'na casa dele'} (LR p. 85).`);
      break;
    case 'empurrar': {
      const casas = inteiro(o.empurrao, 0, 99) ?? casasEmpurrao(dif);
      est(`${alvo.nome} é empurrado ${textoMetros(casas * METROS_POR_CASA)}; ${quem.nome} pode gastar uma ação de movimento para ir junto (LR p. 85).`);
      break;
    }
    case 'atropelar':
      comCondicao(alvo, 'caido');
      est(`${alvo.nome} cai, e ${quem.nome} passa (LR p. 86).`);
      break;
    case 'soltarse':
      largarQuemAgarra(c, quem);
      semCondicao(quem, 'agarrado');
      est(`${quem.nome} se solta de ${alvo.nome}.`);
      break;
    case 'quebrar': {
      const ob = o.objeto && typeof o.objeto === 'object' ? (o.objeto as Record<string, unknown>) : null;
      const d = o.dano && typeof o.dano === 'object' ? (o.dano as Record<string, unknown>) : null;
      if (ob && d) {
        const quebrou = ob.quebrou === true;
        est(`Dano no item de ${alvo.nome} (${texto(ob.nome, 40) || 'objeto'}): ${texto(d.conta, 90)}${quebrou ? ' — quebrou' : ''} (LR p. 90).`, quebrou ? ['quebrou'] : undefined);
      } else est(`${quem.nome} acerta o item de ${alvo.nome}: role o dano contra a RD e os PV do objeto (LR p. 90).`);
      break;
    }
    case 'esmagar': {
      const d = o.dano && typeof o.dano === 'object' ? (o.dano as Record<string, unknown>) : null;
      if (d) aplicarDano(c, alvo, d, ctx, vitais);
      break;
    }
  }
  return { ok: true, combate: c, vitais };
}

const NOME_TESTE_RES: Record<string, string> = { fortitude: 'Fortitude', reflexos: 'Reflexos', vontade: 'Vontade' };
const NOME_FORMA_RIT: Record<string, string> = { basica: 'básica', discente: 'discente', verdadeira: 'verdadeira' };

/**
 * Ritual confirmado na tela (LR p. 117–121; COMBATE.md, seção 15.1): gasta a
 * execução e os PE, confere a concentração, escreve a resistência e o dano de
 * cada alvo, marca as condições, começa o sustentado e aplica o Custo do
 * Paranormal em quem conjura (dano mental; a SAN perdida para sempre vai para a
 * ficha pelo mestre).
 */
function ritual(c: Combate, x: unknown, ctx: Contexto, e: Entrada | undefined): Resultado {
  const erro = (motivo: string): Resultado => ({ ok: false, motivo });
  if (!x || typeof x !== 'object') return erro('Ritual inválido.');
  const o = x as Record<string, unknown>;
  if (!e) return erro('Não há turno em andamento.');
  const quem = participante(c, inteiro(o.quem, 1, 1e9) ?? 0);
  if (!quem || quem.fora || !e.participantes.includes(quem.id)) return erro('Quem conjura não está na vez.');
  const nome = texto(o.ritual, 60);
  if (!nome) return erro('Diga qual é o ritual.');
  const forma = typeof o.forma === 'string' && o.forma in NOME_FORMA_RIT ? o.forma : 'basica';
  const pe = inteiro(o.pe, 0, 99) ?? 0;
  const v = ctx.vitais(quem.id);
  if (pe > 0) {
    if (!v) return erro(`${quem.nome} não tem PE marcados na peça.`);
    if (v.pe < pe) return erro(`${quem.nome} só tem ${v.pe} PE.`);
  }
  // a execução do ritual gasta do turno como as outras ações (LR p. 119)
  const ac = { ...acoesDe(c, quem.id) };
  const qual = o.qual;
  if (qual === 'padrao') {
    if (ac.completa) return erro('A ação completa já gastou o turno.');
    if (ac.padrao) return erro('A ação padrão já foi usada neste turno.');
    ac.padrao = true;
  } else if (qual === 'movimento') {
    if (ac.completa) return erro('A ação completa já gastou o turno.');
    if (!ac.movimento) ac.movimento = true;
    else if (!ac.padrao) ac.padrao = true;
    else return erro('Não sobra ação de movimento neste turno.');
  } else if (qual === 'completa') {
    if (ac.padrao || ac.movimento || ac.completa) return erro('A ação completa precisa do turno inteiro livre.');
    ac.completa = true;
  } else if (qual !== 'livre' && qual !== 'reacao') return erro('Execução inválida.');
  ac.pe = (ac.pe ?? 0) + pe;
  c.acoes[String(quem.id)] = ac;
  const dt = inteiro(o.dt, 1, 99);
  registrar(c, ctx.agora, 'acao', `${quem.nome} conjura ${nome} (${NOME_FORMA_RIT[forma]}${pe ? `, ${pe} PE` : ''}${dt ? `, DT ${dt}` : ''}).`);
  const vitais: MudancaVitais[] = [];
  const minhas: MudancaVitais = { id: quem.id };
  if (pe > 0 && v) minhas.pe = v.pe - pe;
  const lado = (t: unknown) => {
    const r = (t && typeof t === 'object' ? t : null) as Record<string, unknown> | null;
    if (!r) return null;
    const d20 = inteiro(r.d20, 1, 20);
    const total = inteiro(r.total, -99, 999);
    const alvoDt = inteiro(r.dt, 1, 99);
    return d20 === undefined || total === undefined ? null : { d20, total, dt: alvoDt, passou: r.passou === true, nome: texto(r.nome, 12) };
  };
  // concentração: falhou, o ritual não sai e os PE se perdem (LR p. 120)
  const conc = lado(o.concentracao);
  if (conc) {
    registrar(c, ctx.agora, 'acao', `Concentração: Vontade d20 ${conc.d20}, total ${conc.total}${conc.dt ? ` contra DT ${conc.dt}` : ''} — ${conc.passou ? 'passou' : 'falhou'}.`, conc.passou ? undefined : ['falhou']);
    if (!conc.passou) {
      registrar(c, ctx.agora, 'estado', `O ritual não sai, e os PE se perdem (LR p. 120).`);
      if (minhas.pe !== undefined) vitais.push(minhas);
      return { ok: true, combate: c, vitais };
    }
  }
  // cada alvo: resistência, dano e condição
  const alvos = Array.isArray(o.alvos) ? o.alvos.slice(0, 20) : [];
  for (const a of alvos) {
    if (!a || typeof a !== 'object') continue;
    const r = a as Record<string, unknown>;
    const p = participante(c, inteiro(r.id, 1, 1e9) ?? 0);
    if (!p || p.fora) continue;
    const t = lado(r.teste);
    if (t) registrar(c, ctx.agora, 'acao', `${p.nome}: ${NOME_TESTE_RES[t.nome] ?? 'resistência'} d20 ${t.d20}, total ${t.total}${dt ? ` contra DT ${dt}` : ''} — ${t.passou ? 'passou' : 'falhou'}.`);
    const d = r.dano && typeof r.dano === 'object' ? (r.dano as Record<string, unknown>) : null;
    if (d) aplicarDano(c, p, d, ctx, vitais);
    const cond = texto(r.condicao, 30);
    const def = cond ? condicaoDoCatalogo(cond) : undefined;
    if (def) {
      comCondicao(p, cond);
      registrar(c, ctx.agora, 'estado', `${p.nome} entra na condição ${def.nome.toLowerCase()}.`);
    }
  }
  if (o.sustentado === true) {
    quem.sustenta = nome;
    registrar(c, ctx.agora, 'estado', `${quem.nome} sustenta ${nome}: 1 PE no começo de cada turno (LR p. 120).`);
  }
  // Custo do Paranormal (LR p. 121)
  const mental = inteiro(o.mental, 0, 99) ?? 0;
  const perde = inteiro(o.sanPermanente, 0, 3) ?? 0;
  const custo = lado(o.custo);
  if (o.medo === true) registrar(c, ctx.agora, 'estado', `Ritual de Medo: ${quem.nome} sofre ${mental} de dano mental e perde ${perde} de SAN para sempre (LR p. 121).`, perde ? [`perde ${perde} de SAN para sempre`] : undefined);
  else if (custo) {
    registrar(c, ctx.agora, 'acao', `Custo do Paranormal: Ocultismo d20 ${custo.d20}, total ${custo.total}${custo.dt ? ` contra DT ${custo.dt}` : ''} — ${custo.passou ? 'passou' : 'falhou'}.`, custo.passou ? undefined : ['falhou']);
    if (mental) registrar(c, ctx.agora, 'estado', `${quem.nome} sofre ${mental} de dano mental${perde ? ' e perde 1 de SAN para sempre: ajuste o máximo na ficha' : ''} (LR p. 121).`, perde ? ['perde 1 de SAN para sempre'] : undefined);
  }
  if (mental && v) minhas.san = Math.max(0, v.san - mental);
  if (minhas.pe !== undefined || minhas.san !== undefined) {
    const ja = vitais.find((m) => m.id === quem.id);
    if (ja) Object.assign(ja, minhas);
    else vitais.push(minhas);
  }
  return { ok: true, combate: c, vitais };
}

/** Aplica uma ação da tela do mestre. O desfazer fica com o servidor (ele guarda os estados anteriores). */
export function aplicar(atual: Combate | null, a: AcaoCombate, ctx: Contexto): Resultado {
  const erro = (motivo: string): Resultado => ({ ok: false, motivo });
  if (a.tipo === 'abrir') {
    if (atual && atual.fase !== 'encerrado') return erro('Já existe um combate aberto nesta campanha.');
    const c = novoCombate(ctx.cena, ctx.pecas, ctx.agora);
    return { ok: true, combate: c };
  }
  if (!atual) return erro('Não há combate aberto.');
  const c = clone(atual);
  const ok = (): Resultado => ({ ok: true, combate: c });
  const naVez = () => (c.fase === 'andamento' && c.vez ? entrada(c, c.vez) : undefined);

  switch (a.tipo) {
    case 'participante': {
      const id = inteiro(a.id, 1, 1e9);
      if (!id) return erro('Peça inválida.');
      let p = participante(c, id);
      if (c.fase === 'montando') {
        if (a.incluir === false) {
          c.participantes = c.participantes.filter((x) => x.id !== id);
          return ok();
        }
        if (!p) {
          const peca = ctx.pecas.find((x) => x.id === id);
          if (!peca) return erro('Peça não encontrada.');
          p = participanteNovo(peca, 1);
          c.participantes.push(p);
        }
        if (a.lado && LADOS.includes(a.lado)) p.lado = a.lado;
        if (typeof a.ciente === 'boolean') p.ciente = a.ciente;
        if (a.iniciativa === null) p.iniciativa = null;
        else {
          const v = inteiro(a.iniciativa, -99, 999);
          if (v !== undefined) p.iniciativa = v;
        }
        const d = inteiro(a.desempate, -99, 99);
        if (d !== undefined) p.desempate = d;
        return ok();
      }
      if (c.fase !== 'andamento') return erro('O combate já acabou.');
      if (!p) return erro('Essa peça não está no combate.');
      const v = inteiro(a.iniciativa, -99, 999);
      const d = inteiro(a.desempate, -99, 99);
      if (v === undefined && d === undefined) return erro('Nada para mudar.');
      if (p.lado !== 'agente' && v !== undefined) return erro('Os seres do mestre usam a Iniciativa do grupo.');
      const antes = p.iniciativa;
      if (v !== undefined) p.iniciativa = v;
      if (d !== undefined) p.desempate = d;
      registrar(c, ctx.agora, 'estado', `Iniciativa de ${p.nome} corrigida: ${antes ?? '—'} → ${p.iniciativa ?? '—'}.`);
      return ok();
    }

    case 'iniciativaMestre': {
      if (c.fase === 'encerrado') return erro('O combate já acabou.');
      const antes = c.mestre.iniciativa;
      if (a.valor === null) {
        if (c.fase === 'andamento') return erro('Com o combate andando, o grupo do mestre precisa de Iniciativa.');
        c.mestre.iniciativa = null;
      } else {
        const v = inteiro(a.valor, -99, 999);
        if (v === undefined) return erro('Iniciativa inválida.');
        c.mestre.iniciativa = v;
      }
      const d = inteiro(a.desempate, -99, 99);
      if (d !== undefined) c.mestre.desempate = d;
      if (c.fase === 'andamento') registrar(c, ctx.agora, 'estado', `Iniciativa do grupo do mestre corrigida: ${antes ?? '—'} → ${c.mestre.iniciativa}.`);
      return ok();
    }

    case 'comecar': {
      if (c.fase !== 'montando') return erro('O combate já começou.');
      if (!c.participantes.length) return erro('Ninguém no combate.');
      const semIni = c.participantes.filter((p) => p.lado === 'agente' && p.iniciativa === null);
      if (semIni.length) return erro(`Falta a Iniciativa de ${semIni.map((p) => p.nome).join(', ')}.`);
      if (c.participantes.some(doMestre) && c.mestre.iniciativa === null) return erro('Falta a Iniciativa do grupo do mestre.');
      c.fase = 'andamento';
      c.rodada = 1;
      c.agiram = [];
      c.inicio = ctx.agora;
      const ordem = entradas(c)
        .map((e) => `${nomeEntrada(c, e)} ${e.valor}`)
        .join(', ');
      registrar(c, ctx.agora, 'estado', `Combate começou. Ordem de iniciativa: ${ordem}.`);
      const surp = c.participantes.filter((p) => !p.ciente);
      if (surp.length) registrar(c, ctx.agora, 'estado', `Surpreendidos na rodada 1 (desprevenidos e sem turno): ${surp.map((p) => p.nome).join(', ')}.`);
      lembrarPresenca(c, ctx);
      registrar(c, ctx.agora, 'rodada', 'Rodada 1.');
      proximo(c, ctx);
      return ok();
    }

    case 'passar': {
      const e = naVez();
      if (!e) return erro('Não há turno em andamento.');
      c.agiram.push(e.id);
      proximo(c, ctx);
      return ok();
    }

    case 'atrasar': {
      const e = naVez();
      if (!e) return erro('Não há turno em andamento.');
      const v = inteiro(a.valor, -99, 999);
      if (v === undefined) return erro('Iniciativa inválida.');
      if (v >= e.valor) return erro(`Para atrasar, a Iniciativa nova precisa ser menor que ${e.valor}.`);
      const depois = entradas(c).filter((x) => x.id !== e.id && !c.agiram.includes(x.id) && ativosDa(c, x).length > 0);
      if (!depois.length) return erro('Ninguém mais age nesta rodada: não há como atrasar.');
      const prox = depois[0];
      if (v > prox.valor) return erro(`Para agir depois de ${nomeEntrada(c, prox)}, a Iniciativa nova precisa ser ${prox.valor} ou menos.`);
      porIniciativa(c, e, v, v === prox.valor ? prox.desempate - 1 : 0);
      registrar(c, ctx.agora, 'turno', `${nomeEntrada(c, e)} atrasa a vez: Iniciativa ${e.valor} → ${v}.`);
      proximo(c, ctx);
      return ok();
    }

    case 'preparar': {
      const e = naVez();
      if (!e) return erro('Não há turno em andamento.');
      const t = texto(a.texto);
      if (!t) return erro('Diga a ação e o gatilho.');
      c.preparadas = c.preparadas.filter((x) => x.entrada !== e.id);
      c.preparadas.push({ entrada: e.id, texto: t, rodada: c.rodada });
      registrar(c, ctx.agora, 'acao', `${nomeEntrada(c, e)} prepara: ${t}.`);
      c.agiram.push(e.id);
      proximo(c, ctx);
      return ok();
    }

    case 'usarPreparada': {
      const cur = naVez();
      if (!cur) return erro('Não há turno em andamento.');
      const x = c.preparadas.find((p) => p.entrada === a.entrada);
      if (!x) return erro('Não há ação preparada.');
      if (x.entrada === cur.id) return erro('Na própria vez, é só agir.');
      const alvo = entrada(c, x.entrada);
      if (!alvo) return erro('Quem preparou não está mais na ordem.');
      // pelo resto do combate, a Iniciativa fica logo acima de onde a ação aconteceu (LR p. 86)
      porIniciativa(c, alvo, cur.valor, cur.desempate + 1);
      c.preparadas = c.preparadas.filter((p) => p !== x);
      if (!c.agiram.includes(alvo.id)) c.agiram.push(alvo.id);
      registrar(c, ctx.agora, 'acao', `${nomeEntrada(c, alvo)} usa a ação preparada: ${x.texto}. A Iniciativa passa para ${cur.valor}, logo acima de ${nomeEntrada(c, cur)}.`);
      return ok();
    }

    case 'orcamento': {
      const e = naVez();
      if (!e) return erro('Não há turno em andamento.');
      const quem = inteiro(a.quem, 1, 1e9) ?? ativosDa(c, e)[0]?.id;
      if (!quem || !e.participantes.includes(quem)) return erro('Esse ser não está na vez.');
      const ac = { ...acoesDe(c, quem) };
      if (a.qual === 'completa') {
        if (a.usada && (ac.padrao || ac.movimento)) return erro('A ação completa gasta a padrão e a de movimento, e uma delas já foi usada.');
        ac.completa = !!a.usada;
      } else if (a.qual === 'padrao' || a.qual === 'movimento') {
        if (a.usada && ac.completa) return erro('A ação completa já gastou o turno.');
        ac[a.qual] = !!a.usada;
      } else return erro('Ação inválida.');
      c.acoes[String(quem)] = ac;
      return ok();
    }

    case 'declarar': {
      const t = texto(a.texto);
      if (!t) return erro('Diga qual é a ação.');
      if (c.fase !== 'andamento') return erro('O combate não está andando.');
      if (a.qual === 'reacao') {
        // reação: a qualquer momento, de qualquer um (LR p. 85)
        const p = participante(c, inteiro(a.quem, 1, 1e9) ?? 0);
        if (!p || p.fora) return erro('Quem reage não está no combate.');
        if (a.especial) {
          if (p.reacao) return erro(`${p.nome} já usou a defesa especial desta rodada.`);
          p.reacao = true;
        }
        registrar(c, ctx.agora, 'acao', `${p.nome}: ${t} (${a.especial ? 'defesa especial' : 'reação'}).`);
        return ok();
      }
      const e = naVez();
      if (!e) return erro('Não há turno em andamento.');
      const quem = inteiro(a.quem, 1, 1e9) ?? ativosDa(c, e)[0]?.id;
      const p = quem ? participante(c, quem) : undefined;
      if (!p || !e.participantes.includes(p.id)) return erro('Esse ser não está na vez.');
      const ac = { ...acoesDe(c, p.id) };
      let rotulo = NOME_ACAO[a.qual];
      if (a.qual === 'padrao') {
        if (ac.completa) return erro('A ação completa já gastou o turno.');
        if (ac.padrao) return erro('A ação padrão já foi usada neste turno.');
        ac.padrao = true;
      } else if (a.qual === 'movimento') {
        if (ac.completa) return erro('A ação completa já gastou o turno.');
        if (!ac.movimento) ac.movimento = true;
        else if (!ac.padrao) {
          // duas de movimento: a padrão vira movimento (LR p. 84)
          ac.padrao = true;
          rotulo = 'ação de movimento, no lugar da padrão';
        } else return erro('Não sobra ação de movimento neste turno.');
      } else if (a.qual === 'completa') {
        if (ac.padrao || ac.movimento || ac.completa) return erro('A ação completa precisa do turno inteiro livre.');
        ac.completa = true;
      } else if (a.qual !== 'livre') return erro('Ação inválida.');
      c.acoes[String(p.id)] = ac;
      registrar(c, ctx.agora, 'acao', `${p.nome}: ${t} (${rotulo}).`);
      return ok();
    }

    case 'reacao': {
      if (c.fase !== 'andamento') return erro('O combate não está andando.');
      const p = participante(c, inteiro(a.id, 1, 1e9) ?? 0);
      if (!p) return erro('Essa peça não está no combate.');
      p.reacao = !!a.usada;
      return ok();
    }

    case 'entrar': {
      if (c.fase !== 'andamento') return erro('O combate não está andando: inclua na montagem.');
      const id = inteiro(a.id, 1, 1e9);
      const peca = ctx.pecas.find((x) => x.id === id);
      if (!id || !peca) return erro('Peça não encontrada.');
      let p = participante(c, id);
      if (p && !p.fora) return erro(`${p.nome} já está no combate.`);
      const lado: Lado = a.lado && LADOS.includes(a.lado) ? a.lado : peca.agente ? 'agente' : 'inimigo';
      const v = inteiro(a.iniciativa, -99, 999);
      if (lado === 'agente' && v === undefined) return erro('Diga a Iniciativa de quem chega.');
      if (lado !== 'agente' && c.mestre.iniciativa === null && v === undefined) return erro('O grupo do mestre ainda não tem Iniciativa: diga a de quem chega.');
      if (!p) {
        p = participanteNovo(peca, c.rodada + 1);
        c.participantes.push(p);
      } else {
        p.fora = undefined;
        p.desde = c.rodada + 1;
      }
      p.lado = lado;
      p.ciente = true;
      if (lado === 'agente') p.iniciativa = v!;
      else if (c.mestre.iniciativa === null) c.mestre.iniciativa = v!;
      registrar(c, ctx.agora, 'estado', `${p.nome} entra no combate e age a partir da rodada ${c.rodada + 1}${lado === 'agente' ? `, com Iniciativa ${v}` : ', no turno do mestre'}.`);
      if (lado !== 'agente') lembrarPresenca(c, ctx, p);
      return ok();
    }

    case 'sair': {
      if (c.fase !== 'andamento') return erro('O combate não está andando.');
      const p = participante(c, inteiro(a.id, 1, 1e9) ?? 0);
      if (!p || p.fora) return erro('Essa peça não está no combate.');
      p.fora = a.motivo && a.motivo in NOME_SAIDA ? a.motivo : 'saiu';
      registrar(c, ctx.agora, 'estado', `${p.nome} ${NOME_SAIDA[p.fora]}.`);
      // quem sai larga quem agarrava, e quem o agarrava larga ele
      if (p.agarra) soltarAgarrado(c, p);
      largarQuemAgarra(c, p);
      // era a vez dele e não sobrou ninguém no lugar: a vez passa
      const e = naVez();
      if (e && ativosDa(c, e).length === 0) {
        c.agiram.push(e.id);
        proximo(c, ctx);
      }
      return ok();
    }

    case 'nota': {
      const t = texto(a.texto, 300);
      if (!t) return erro('Nota vazia.');
      registrar(c, ctx.agora, 'nota', t);
      return ok();
    }

    case 'ataque':
      return ataque(c, a.ataque, ctx, naVez());

    case 'manobra':
      return manobra(c, a.manobra, ctx, naVez());

    case 'ritual':
      return ritual(c, a.ritual, ctx, naVez());

    case 'soltar': {
      const p = participante(c, inteiro(a.id, 1, 1e9) ?? 0);
      if (!p || !p.agarra) return erro('Esse ser não está agarrando ninguém.');
      const alvo = soltarAgarrado(c, p);
      registrar(c, ctx.agora, 'acao', `${p.nome} solta ${alvo?.nome ?? 'quem agarrava'} (ação livre, LR p. 85).`);
      return ok();
    }

    case 'condicao': {
      const p = participante(c, inteiro(a.id, 1, 1e9) ?? 0);
      if (!p) return erro('Essa peça não está no combate.');
      const id = texto(a.condicao, 30);
      const cond = condicaoDoCatalogo(id);
      if (!cond) return erro('Condição desconhecida.');
      const s = new Set(p.condicoes ?? []);
      if (a.ativa ? s.has(id) : !s.has(id)) return ok();
      if (a.ativa) s.add(id);
      else s.delete(id);
      if (s.size) p.condicoes = [...s];
      else delete p.condicoes;
      // saiu do agarrado à mão: quem o agarrava larga
      if (!a.ativa && id === 'agarrado') largarQuemAgarra(c, p);
      registrar(c, ctx.agora, 'estado', a.ativa ? `${p.nome} entra na condição ${cond.nome.toLowerCase()}.` : `${p.nome} sai da condição ${cond.nome.toLowerCase()}.`);
      return ok();
    }

    case 'gastarPe': {
      const p = participante(c, inteiro(a.quem, 1, 1e9) ?? 0);
      if (!p || p.fora) return erro('Esse ser não está no combate.');
      const pe = inteiro(a.pe, 1, 99);
      if (!pe) return erro('Diga quantos PE.');
      const v = ctx.vitais(p.id);
      if (!v) return erro(`${p.nome} não tem PE marcados na peça.`);
      if (v.pe < pe) return erro(`${p.nome} só tem ${v.pe} PE.`);
      const e = naVez();
      if (e?.participantes.includes(p.id)) {
        const ac = { ...acoesDe(c, p.id) };
        ac.pe = (ac.pe ?? 0) + pe;
        c.acoes[String(p.id)] = ac;
      }
      registrar(c, ctx.agora, 'acao', `${p.nome} gasta ${pe} PE: ${texto(a.motivo, 80) || 'habilidade'} (PE ${v.pe} → ${v.pe - pe}).`);
      return { ok: true, combate: c, vitais: [{ id: p.id, pe: v.pe - pe }] };
    }

    case 'sustentar': {
      const p = participante(c, inteiro(a.id, 1, 1e9) ?? 0);
      if (!p) return erro('Essa peça não está no combate.');
      const r = a.ritual === null ? '' : texto(a.ritual, 60);
      if (r) {
        p.sustenta = r;
        registrar(c, ctx.agora, 'estado', `${p.nome} sustenta ${r}: 1 PE no começo de cada turno (LR p. 120).`);
      } else if (p.sustenta) {
        registrar(c, ctx.agora, 'estado', `${p.nome} para de sustentar ${p.sustenta}.`);
        delete p.sustenta;
      }
      return ok();
    }

    case 'vitais': {
      const p = participante(c, inteiro(a.id, 1, 1e9) ?? 0);
      if (!p) return erro('Essa peça não está no combate.');
      const v = ctx.vitais(p.id);
      if (!v) return erro(`${p.nome} não tem PV, PE e SAN marcados na peça.`);
      const m: MudancaVitais = { id: p.id };
      const partes: string[] = [];
      for (const k of ['pv', 'pe', 'san'] as const) {
        const n = inteiro(a[k], 0, 999);
        if (n === undefined) continue;
        const novo = Math.min(v[`${k}Max`], n);
        if (novo === v[k]) continue;
        m[k] = novo;
        partes.push(`${k.toUpperCase()} ${v[k]} → ${novo}`);
      }
      if (!partes.length) return erro('Nada para mudar.');
      registrar(c, ctx.agora, 'estado', `${p.nome}: ${partes.join(', ')} (${texto(a.motivo, 80) || 'ajuste'}).`);
      return { ok: true, combate: c, vitais: [m] };
    }

    case 'encerrar': {
      if (c.fase === 'montando') return { ok: true, combate: null };
      if (c.fase === 'encerrado') return erro('O combate já acabou.');
      c.fase = 'encerrado';
      c.vez = null;
      c.acoes = {};
      registrar(c, ctx.agora, 'estado', `Combate encerrado na rodada ${c.rodada}.`);
      return ok();
    }

    case 'fechar':
      if (c.fase === 'andamento') return erro('Encerre o combate antes de fechar.');
      return { ok: true, combate: null };

    case 'desfazer':
      return erro('Nada para desfazer.');
  }
  return erro('Ação desconhecida.');
}

const TIPOS = new Set<AcaoCombate['tipo']>([
  'ataque',
  'manobra',
  'ritual',
  'soltar',
  'condicao',
  'gastarPe',
  'sustentar',
  'vitais',
  'abrir',
  'participante',
  'iniciativaMestre',
  'comecar',
  'passar',
  'atrasar',
  'preparar',
  'usarPreparada',
  'orcamento',
  'declarar',
  'reacao',
  'entrar',
  'sair',
  'nota',
  'encerrar',
  'fechar',
  'desfazer',
]);

/** Confere a forma de uma ação que veio da rede (os valores, `aplicar` confere). */
export function lerAcao(raw: unknown): AcaoCombate | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.tipo !== 'string' || !TIPOS.has(o.tipo as AcaoCombate['tipo'])) return null;
  return o as unknown as AcaoCombate;
}

/** O que a mesa (tablet) recebe: a ordem, a rodada e a vez, sem o registro nem o texto das ações preparadas. */
export function visaoMesa(c: Combate | null): Combate | null {
  if (!c) return null;
  return { ...clone(c), registro: [], preparadas: c.preparadas.map((p) => ({ ...p, texto: '' })) };
}
