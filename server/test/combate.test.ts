import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { combate, type ClientMsg, type ServerMsg } from '@croma/shared';
import { Hotel } from '../src/hotel';
import { seedDb, upgradeDb } from '../src/seed';

type Combate = combate.Combate;
type Acao = combate.AcaoCombate;

// ---------------------------------------------------------------- regras puras

/** Peças de teste: três agentes e dois inimigos na cena, e um agente em outra cena. */
const PECAS: combate.PecaCombate[] = [
  { id: 1, nome: 'Cora', agente: true, naCena: true },
  { id: 2, nome: 'Tepes', agente: true, naCena: true },
  { id: 3, nome: 'Catarina', agente: true, naCena: true },
  { id: 10, nome: 'Ocultista', agente: false, naCena: true },
  { id: 11, nome: 'Acólito', agente: false, naCena: true },
  { id: 4, nome: 'Alosi', agente: true, naCena: false },
];

let vitais: Map<number, Partial<combate.Vitais>>;
let relogio = 1000;
const ctx = (): combate.Contexto => ({ agora: relogio++, cena: 7, pecas: PECAS, vitais: (id) => ({ pv: 20, pvMax: 20, pe: 5, peMax: 5, san: 20, sanMax: 20, ...vitais.get(id) }) });

function aplicar(c: Combate | null, a: Acao): Combate {
  const r = combate.aplicar(c, a, ctx());
  if (!r.ok) throw new Error(r.motivo);
  assert.ok(r.combate, 'combate existe');
  return r.combate;
}
function recusa(c: Combate | null, a: Acao): string {
  const r = combate.aplicar(c, a, ctx());
  assert.equal(r.ok, false, 'devia recusar');
  return (r as { ok: false; motivo: string }).motivo;
}
/** Nome de quem está na vez. */
function vez(c: Combate): string {
  const e = combate.entrada(c, c.vez);
  return e ? combate.nomeEntrada(c, e) : '—';
}

/** Combate montado: Cora 22, Tepes 18, mestre 14, Catarina 12. */
function montado(): Combate {
  let c = aplicar(null, { tipo: 'abrir' });
  c = aplicar(c, { tipo: 'participante', id: 1, iniciativa: 22 });
  c = aplicar(c, { tipo: 'participante', id: 2, iniciativa: 18 });
  c = aplicar(c, { tipo: 'participante', id: 3, iniciativa: 12 });
  return aplicar(c, { tipo: 'iniciativaMestre', valor: 14 });
}

beforeEach(() => {
  vitais = new Map();
});

describe('combate: montagem e iniciativa', () => {
  test('abre com as peças da cena; agente com ficha tem turno próprio, o resto é do mestre', () => {
    const c = aplicar(null, { tipo: 'abrir' });
    assert.equal(c.fase, 'montando');
    assert.equal(c.cena, 7);
    assert.deepEqual(
      c.participantes.map((p) => `${p.nome}:${p.lado}`),
      ['Cora:agente', 'Tepes:agente', 'Catarina:agente', 'Ocultista:inimigo', 'Acólito:inimigo'],
    );
    assert.equal(recusa(c, { tipo: 'abrir' }), 'Já existe um combate aberto nesta campanha.');
  });

  test('só começa com a Iniciativa de todos os agentes e a do grupo do mestre', () => {
    let c = aplicar(null, { tipo: 'abrir' });
    assert.match(recusa(c, { tipo: 'comecar' }), /Falta a Iniciativa de Cora, Tepes, Catarina/);
    c = aplicar(c, { tipo: 'participante', id: 1, iniciativa: 22 });
    c = aplicar(c, { tipo: 'participante', id: 2, iniciativa: 18 });
    c = aplicar(c, { tipo: 'participante', id: 3, iniciativa: 12 });
    assert.equal(recusa(c, { tipo: 'comecar' }), 'Falta a Iniciativa do grupo do mestre.');
  });

  test('ordem do maior para o menor, com um turno só para todos os seres do mestre (LR p. 83, 169)', () => {
    const c = aplicar(montado(), { tipo: 'comecar' });
    assert.deepEqual(
      combate.entradas(c).map((e) => `${combate.nomeEntrada(c, e)} ${e.valor}`),
      ['Cora 22', 'Tepes 18', 'Turno do mestre 14', 'Catarina 12'],
    );
    const m = combate.entrada(c, combate.ID_MESTRE)!;
    assert.deepEqual(m.participantes, [10, 11]);
    assert.equal(c.rodada, 1);
    assert.equal(vez(c), 'Cora');
  });

  test('empate: aponta os empatados; o desempate decide', () => {
    let c = montado();
    c = aplicar(c, { tipo: 'participante', id: 2, iniciativa: 22 });
    assert.deepEqual(
      combate.empates(c).map((g) => g.map((e) => combate.nomeEntrada(c, e))),
      [['Cora', 'Tepes']],
    );
    c = aplicar(c, { tipo: 'participante', id: 2, desempate: 1 });
    assert.deepEqual(combate.empates(c), []);
    assert.equal(combate.nomeEntrada(c, combate.entradas(c)[0]), 'Tepes');
  });

  test('tirar da montagem e incluir peça de outra cena da campanha', () => {
    let c = aplicar(null, { tipo: 'abrir' });
    c = aplicar(c, { tipo: 'participante', id: 11, incluir: false });
    c = aplicar(c, { tipo: 'participante', id: 4, lado: 'agente', iniciativa: 9 });
    assert.deepEqual(
      c.participantes.map((p) => p.nome),
      ['Cora', 'Tepes', 'Catarina', 'Ocultista', 'Alosi'],
    );
    assert.equal(recusa(c, { tipo: 'participante', id: 99 }), 'Peça não encontrada.');
  });
});

describe('combate: rodadas e turnos', () => {
  test('passar percorre a ordem e vira a rodada', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    const vistos = [vez(c)];
    for (let i = 0; i < 4; i++) {
      c = aplicar(c, { tipo: 'passar' });
      vistos.push(vez(c));
    }
    assert.deepEqual(vistos, ['Cora', 'Tepes', 'Turno do mestre', 'Catarina', 'Cora']);
    assert.equal(c.rodada, 2);
    assert.ok(c.registro.some((l) => l.tipo === 'rodada' && l.texto === 'Rodada 2.'));
  });

  test('surpreendido não tem turno na rodada 1 e age na 2 (LR p. 83–84)', () => {
    let c = montado();
    c = aplicar(c, { tipo: 'participante', id: 3, ciente: false });
    c = aplicar(c, { tipo: 'comecar' });
    assert.ok(c.registro.some((l) => /Surpreendidos na rodada 1.*Catarina/.test(l.texto)));
    const ordem = [vez(c)];
    for (let i = 0; i < 3; i++) {
      c = aplicar(c, { tipo: 'passar' });
      ordem.push(vez(c));
    }
    // rodada 1 sem a Catarina; na 2 ela entra na vez dela
    assert.deepEqual(ordem, ['Cora', 'Tepes', 'Turno do mestre', 'Cora']);
    c = aplicar(aplicar(aplicar(c, { tipo: 'passar' }), { tipo: 'passar' }), { tipo: 'passar' });
    assert.equal(vez(c), 'Catarina');
    assert.equal(c.rodada, 2);
  });

  test('o turno do mestre pula a rodada 1 se todos os seres dele foram surpreendidos', () => {
    let c = montado();
    c = aplicar(c, { tipo: 'participante', id: 10, ciente: false });
    c = aplicar(c, { tipo: 'participante', id: 11, ciente: false });
    c = aplicar(aplicar(aplicar(c, { tipo: 'comecar' }), { tipo: 'passar' }), { tipo: 'passar' });
    assert.equal(vez(c), 'Catarina');
  });

  test('atrasar: age mais tarde na mesma rodada, e a Iniciativa nova fica (LR p. 87)', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    assert.equal(recusa(c, { tipo: 'atrasar', valor: 22 }), 'Para atrasar, a Iniciativa nova precisa ser menor que 22.');
    assert.equal(recusa(c, { tipo: 'atrasar', valor: 20 }), 'Para agir depois de Tepes, a Iniciativa nova precisa ser 18 ou menos.');
    c = aplicar(c, { tipo: 'atrasar', valor: 13 });
    assert.equal(vez(c), 'Tepes');
    const ordem = [vez(c)];
    for (let i = 0; i < 3; i++) {
      c = aplicar(c, { tipo: 'passar' });
      ordem.push(vez(c));
    }
    assert.deepEqual(ordem, ['Tepes', 'Turno do mestre', 'Cora', 'Catarina']);
    assert.equal(combate.participante(c, 1)?.iniciativa, 13);
  });

  test('atrasar para a mesma Iniciativa de quem vem depois: fica logo depois dele', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(c, { tipo: 'atrasar', valor: 18 });
    assert.equal(vez(c), 'Tepes');
    c = aplicar(c, { tipo: 'passar' });
    assert.equal(vez(c), 'Cora');
  });

  test('o último da rodada não tem como atrasar', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    for (let i = 0; i < 3; i++) c = aplicar(c, { tipo: 'passar' });
    assert.equal(vez(c), 'Catarina');
    assert.equal(recusa(c, { tipo: 'atrasar', valor: 5 }), 'Ninguém mais age nesta rodada: não há como atrasar.');
  });

  test('preparar: a ação acontece como reação e a Iniciativa passa para logo acima (LR p. 86)', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(c, { tipo: 'preparar', texto: 'atirar no primeiro que passar pela porta' });
    assert.equal(vez(c), 'Tepes');
    c = aplicar(c, { tipo: 'passar' });
    assert.equal(vez(c), 'Turno do mestre');
    c = aplicar(c, { tipo: 'usarPreparada', entrada: combate.idAgente(1) });
    assert.equal(combate.participante(c, 1)?.iniciativa, 14);
    // fica logo acima do mestre na ordem, e não age de novo nesta rodada
    assert.deepEqual(
      combate.entradas(c).map((e) => combate.nomeEntrada(c, e)),
      ['Tepes', 'Cora', 'Turno do mestre', 'Catarina'],
    );
    c = aplicar(aplicar(c, { tipo: 'passar' }), { tipo: 'passar' });
    assert.equal(c.rodada, 2);
    assert.equal(vez(c), 'Tepes');
  });

  test('ação preparada não usada se perde no começo do próximo turno', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(c, { tipo: 'preparar', texto: 'esperar' });
    for (let i = 0; i < 3; i++) c = aplicar(c, { tipo: 'passar' });
    assert.equal(vez(c), 'Cora');
    assert.deepEqual(c.preparadas, []);
    assert.ok(c.registro.some((l) => l.texto === 'Cora não usou a ação preparada (esperar).'));
  });

  test('quem chega no meio age a partir da rodada seguinte (LR p. 83)', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    assert.equal(recusa(c, { tipo: 'entrar', id: 4, lado: 'agente' }), 'Diga a Iniciativa de quem chega.');
    c = aplicar(c, { tipo: 'entrar', id: 4, lado: 'agente', iniciativa: 30 });
    assert.equal(combate.participante(c, 4)?.desde, 2);
    for (let i = 0; i < 3; i++) c = aplicar(c, { tipo: 'passar' });
    assert.equal(vez(c), 'Catarina');
    c = aplicar(c, { tipo: 'passar' });
    assert.equal(c.rodada, 2);
    assert.equal(vez(c), 'Alosi');
  });
});

describe('combate: ações do turno', () => {
  test('padrão e movimento; a segunda de movimento gasta a padrão; a completa pede o turno livre (LR p. 84)', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(c, { tipo: 'declarar', qual: 'movimento', texto: 'Movimentar-se' });
    c = aplicar(c, { tipo: 'declarar', qual: 'movimento', texto: 'Levantar-se' });
    assert.deepEqual(combate.acoesDe(c, 1), { padrao: true, movimento: true, completa: false, pe: 0 });
    assert.equal(recusa(c, { tipo: 'declarar', qual: 'movimento', texto: 'Sacar' }), 'Não sobra ação de movimento neste turno.');
    assert.equal(recusa(c, { tipo: 'declarar', qual: 'padrao', texto: 'Agredir' }), 'A ação padrão já foi usada neste turno.');
    assert.equal(recusa(c, { tipo: 'declarar', qual: 'completa', texto: 'Investida' }), 'A ação completa precisa do turno inteiro livre.');
    c = aplicar(c, { tipo: 'declarar', qual: 'livre', texto: 'Falar' });
    assert.ok(c.registro.some((l) => l.texto === 'Cora: Levantar-se (ação de movimento, no lugar da padrão).'));
    // o próximo turno começa com tudo livre
    c = aplicar(c, { tipo: 'passar' });
    assert.deepEqual(combate.acoesDe(c, 2), { padrao: false, movimento: false, completa: false, pe: 0 });
  });

  test('no turno do mestre, cada ser tem as próprias ações', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(aplicar(c, { tipo: 'passar' }), { tipo: 'passar' });
    assert.equal(vez(c), 'Turno do mestre');
    c = aplicar(c, { tipo: 'declarar', qual: 'padrao', texto: 'Agredir', quem: 10 });
    c = aplicar(c, { tipo: 'declarar', qual: 'padrao', texto: 'Agredir', quem: 11 });
    assert.equal(combate.acoesDe(c, 10).padrao, true);
    assert.equal(combate.acoesDe(c, 11).padrao, true);
    assert.equal(recusa(c, { tipo: 'declarar', qual: 'padrao', texto: 'Agredir', quem: 1 }), 'Esse ser não está na vez.');
  });

  test('defesa especial: uma por rodada, volta no começo do próprio turno (LR p. 88)', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(c, { tipo: 'declarar', qual: 'reacao', texto: 'Esquiva', quem: 2, especial: true });
    assert.equal(recusa(c, { tipo: 'declarar', qual: 'reacao', texto: 'Bloqueio', quem: 2, especial: true }), 'Tepes já usou a defesa especial desta rodada.');
    // reação comum não tem limite (LR p. 85)
    c = aplicar(c, { tipo: 'declarar', qual: 'reacao', texto: 'Teste de Reflexos', quem: 2 });
    c = aplicar(c, { tipo: 'passar' });
    assert.equal(vez(c), 'Tepes');
    assert.equal(combate.participante(c, 2)?.reacao, false);
  });
});

describe('combate: morrendo e enlouquecendo', () => {
  test('agente a 0 PV conta os turnos começados morrendo; no 3º morre e a vez passa (LR p. 88)', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    vitais.set(2, { pv: 0, san: 20 });
    c = aplicar(c, { tipo: 'passar' });
    assert.equal(combate.participante(c, 2)?.morrendo, 1);
    assert.ok(c.registro.some((l) => l.texto === 'Tepes começa o turno morrendo (1/3).'));
    for (let rodada = 0; rodada < 2; rodada++) for (let i = 0; i < 4; i++) c = aplicar(c, { tipo: 'passar' });
    assert.equal(combate.participante(c, 2)?.fora, 'morto');
    assert.ok(c.registro.some((l) => /Tepes começou o 3º turno morrendo nesta cena e morreu/.test(l.texto)));
    // a vez pulou para o próximo
    assert.equal(vez(c), 'Turno do mestre');
  });

  test('SAN 0: enlouquecendo; no 3º turno fica insano', () => {
    // a Cora é a primeira: o turno dela da rodada 1 começa junto com o combate
    vitais.set(1, { pv: 20, san: 0 });
    let c = aplicar(montado(), { tipo: 'comecar' });
    assert.equal(combate.participante(c, 1)?.enlouquecendo, 1);
    for (let rodada = 0; rodada < 2; rodada++) for (let i = 0; i < 4; i++) c = aplicar(c, { tipo: 'passar' });
    assert.equal(combate.participante(c, 1)?.enlouquecendo, 3);
    assert.equal(combate.participante(c, 1)?.fora, 'insano');
  });

  test('ameaça a 0 PV não conta morrendo (o mestre tira do combate)', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    vitais.set(10, { pv: 0, san: 0 });
    c = aplicar(aplicar(c, { tipo: 'passar' }), { tipo: 'passar' });
    assert.equal(combate.participante(c, 10)?.morrendo, 0);
    c = aplicar(c, { tipo: 'sair', id: 10, motivo: 'morto' });
    assert.equal(vez(c), 'Turno do mestre');
    c = aplicar(c, { tipo: 'sair', id: 11 });
    // sem ninguém no turno do mestre, a vez passa
    assert.equal(vez(c), 'Catarina');
  });
});

describe('combate: fim', () => {
  test('encerrar guarda o resumo; fechar tira o combate; na montagem, encerrar cancela', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    assert.equal(recusa(c, { tipo: 'fechar' }), 'Encerre o combate antes de fechar.');
    c = aplicar(c, { tipo: 'encerrar' });
    assert.equal(c.fase, 'encerrado');
    assert.ok(c.registro.some((l) => l.texto === 'Combate encerrado na rodada 1.'));
    const r = combate.aplicar(c, { tipo: 'fechar' }, ctx());
    assert.ok(r.ok && r.combate === null);
    const cancelado = combate.aplicar(montado(), { tipo: 'encerrar' }, ctx());
    assert.ok(cancelado.ok && cancelado.combate === null);
  });

  test('a mesa não recebe o registro nem o texto das ações preparadas', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(c, { tipo: 'preparar', texto: 'segredo' });
    const m = combate.visaoMesa(c)!;
    assert.deepEqual(m.registro, []);
    assert.equal(m.preparadas[0].texto, '');
    assert.equal(m.vez, c.vez);
  });

  test('ação com forma errada é recusada antes das regras', () => {
    assert.equal(combate.lerAcao({ tipo: 'bagunça' }), null);
    assert.equal(combate.lerAcao('passar'), null);
    assert.deepEqual(combate.lerAcao({ tipo: 'passar' }), { tipo: 'passar' });
  });
});

// ---------------------------------------------------------------- servidor

type Msg<T extends ServerMsg['t']> = Extract<ServerMsg, { t: T }>;

class Peer {
  inbox: ServerMsg[] = [];
  readonly client;
  constructor(
    private hotel: Hotel,
    local = false,
  ) {
    this.client = hotel.attach((m) => this.inbox.push(JSON.parse(JSON.stringify(m)) as ServerMsg), undefined, local);
  }
  send(m: ClientMsg) {
    this.hotel.receive(this.client, m);
  }
  combate(a: Acao) {
    this.send({ t: 'combate', a });
  }
  last<T extends ServerMsg['t']>(t: T): Msg<T> | undefined {
    for (let i = this.inbox.length - 1; i >= 0; i--) if (this.inbox[i].t === t) return this.inbox[i] as Msg<T>;
    return undefined;
  }
}

const look = { skin: '#e8b98f', hair: '#3b2618', hairStyle: 0, top: '#2b2a30', pants: '#1c1b1f', shoes: '#3d3a40', outfit: 1, extra: 0, charId: null };

describe('combate no servidor', () => {
  let hotel: Hotel;
  let gm: Peer;
  let mesa: Peer;
  let escritorio: number;

  beforeEach(() => {
    const db = seedDb();
    upgradeDb(db);
    hotel = new Hotel({ db, persist: false, timers: false });
    escritorio = hotel.db.rooms.find((x) => x.name === 'Mansão Alvarez · Escritório')!.id;
    gm = new Peer(hotel);
    gm.send({ t: 'login', name: 'Mestre', look, gmKey: hotel.gmKey });
    gm.send({ t: 'join', roomId: escritorio });
    mesa = new Peer(hotel);
    mesa.send({ t: 'login', name: 'Mesa', look, mesa: true });
    mesa.send({ t: 'join', roomId: escritorio });
    hotel.pushNow();
  });

  const doMestre = () => gm.last('combate')!;
  const pecas = () => gm.last('session')!.session.characters;

  test('sem combate, todos recebem null', () => {
    assert.equal(doMestre().combate, null);
    assert.equal(mesa.last('combate')?.combate, null);
  });

  test('o mestre abre e monta; a mesa acompanha sem o registro; o jogador não mexe', () => {
    gm.combate({ tipo: 'abrir' });
    hotel.pushNow();
    const aberto = doMestre().combate!;
    assert.equal(aberto.fase, 'montando');
    assert.equal(aberto.cena, escritorio);
    const [a, b] = pecas();
    gm.combate({ tipo: 'participante', id: a.id, lado: 'agente', iniciativa: 15 });
    gm.combate({ tipo: 'participante', id: b.id, lado: 'inimigo' });
    gm.combate({ tipo: 'iniciativaMestre', valor: 10 });
    gm.combate({ tipo: 'comecar' });
    hotel.pushNow();
    const c = doMestre().combate!;
    assert.equal(c.fase, 'andamento');
    assert.equal(c.vez, combate.idAgente(a.id));
    assert.ok(c.registro.length > 0);
    const m = mesa.last('combate')!;
    assert.equal(m.combate?.vez, c.vez);
    assert.deepEqual(m.combate?.registro, []);
    assert.equal(m.podeDesfazer, undefined);
    // a mesa não manda no combate
    mesa.combate({ tipo: 'passar' });
    assert.match(mesa.last('error')?.msg ?? '', /mestre/);
    // o começo vai para o registro da sessão
    assert.ok(gm.last('campaign')!.state.log.some((e) => e.text === 'Combate começou.'));
  });

  test('recusa volta como aviso para o mestre', () => {
    gm.combate({ tipo: 'passar' });
    assert.equal(gm.last('denied')?.reason, 'Não há combate aberto.');
  });

  test('desfazer volta um passo de cada vez', () => {
    gm.combate({ tipo: 'abrir' });
    const [a] = pecas();
    gm.combate({ tipo: 'participante', id: a.id, lado: 'agente', iniciativa: 15 });
    hotel.pushNow();
    assert.equal(doMestre().podeDesfazer, true);
    assert.equal(doMestre().combate?.participantes.find((p) => p.id === a.id)?.iniciativa, 15);
    gm.combate({ tipo: 'desfazer' });
    hotel.pushNow();
    assert.equal(doMestre().combate?.participantes.find((p) => p.id === a.id)?.iniciativa ?? null, null);
    gm.combate({ tipo: 'desfazer' });
    hotel.pushNow();
    assert.equal(doMestre().combate, null);
    gm.combate({ tipo: 'desfazer' });
    assert.equal(gm.last('denied')?.reason, 'Nada para desfazer.');
  });
});

// ---------------------------------------------------------------- ataque (regras puras)

describe('ataque: medidas e situações', () => {
  test('alcance da arma, faixa da distância e adjacência (COMBATE.md 7.2)', () => {
    assert.equal(combate.faixaArma('médio'), 'medio');
    assert.equal(combate.faixaArma('Curto'), 'curto');
    assert.equal(combate.faixaArma(undefined), null);
    assert.equal(combate.faixaDaDistancia(7.5), 'curto');
    assert.equal(combate.faixaDaDistancia(9), 'curto');
    assert.equal(combate.faixaDaDistancia(9.2), 'medio');
    assert.equal(combate.faixaDaDistancia(120), null);
    assert.equal(combate.textoMetros(combate.metrosDe(10)), '7,5 m');
    assert.equal(combate.textoMetros(9), '9 m');
    assert.ok(combate.adjacente({ x: 0, y: 0 }, { x: 2, y: 2 }));
    assert.ok(!combate.adjacente({ x: 0, y: 0 }, { x: 3, y: 0 }));
  });

  test('situações: cobertura soma; desprevenido e vulnerável não somam; caído depende da distância; falha até 75%', () => {
    const t = combate.montarTeste({ dados: 3, bonus: 5, defesaBase: 15, distancia: true, situacoes: ['cobertura', 'alvoDesprevenido', 'alvoVulneravel', 'emCorpoACorpo', 'flanqueando'] });
    // flanquear só vale no corpo a corpo; alvo em corpo a corpo só à distância
    assert.equal(t.dados, 3);
    assert.equal(t.bonus, 0);
    assert.equal(t.defesa, 15);
    assert.equal(combate.textoDefesa(t, 15), '15 (15 + 5 − 5)');
    const caidoPerto = combate.montarTeste({ dados: 2, bonus: 0, defesaBase: 12, distancia: false, situacoes: ['alvoCaido', 'flanqueando'] });
    assert.equal(caidoPerto.defesa, 7);
    assert.equal(caidoPerto.dados, 3);
    assert.equal(combate.montarTeste({ dados: 2, bonus: 0, defesaBase: 12, distancia: true, situacoes: ['alvoCaido'] }).defesa, 17);
    assert.equal(combate.montarTeste({ dados: 1, bonus: 0, defesaBase: 10, distancia: true, situacoes: ['camuflagemTotal', 'atacanteCego'] }).falha, 75);
  });

  test('o texto da rolagem (DC-1: menos de 1 dado rola 2 − n e fica o menor)', () => {
    assert.equal(combate.textoRolagem(3, 5), 'Role 3d20, fique com o maior, +5');
    assert.equal(combate.textoRolagem(1, -2), 'Role 1d20, -2');
    assert.equal(combate.textoRolagem(0, 3), 'Role 2d20, fique com o menor, +3');
  });

  test('resultado: 20 natural acerta; crítico só acertando na margem; a camuflagem falha no d10 (LR p. 82, 85, 89)', () => {
    assert.equal(combate.resolver({ d20: 20, bonus: 0, defesa: 40, margem: 20, falha: 0 }).resultado, 'critico');
    assert.equal(combate.resolver({ d20: 18, bonus: 5, defesa: 20, margem: 17, falha: 0 }).resultado, 'critico');
    assert.equal(combate.resolver({ d20: 18, bonus: 1, defesa: 20, margem: 17, falha: 0 }).resultado, 'erro');
    assert.equal(combate.resolver({ d20: 12, bonus: 8, defesa: 20, margem: 20, falha: 0 }).resultado, 'acerto');
    assert.equal(combate.resolver({ d20: 12, bonus: 8, defesa: 20, margem: 20, falha: 20, d10: 2 }).resultado, 'erro');
    assert.equal(combate.resolver({ d20: 12, bonus: 8, defesa: 20, margem: 20, falha: 20, d10: 3 }).resultado, 'acerto');
  });

  test('dano: o crítico multiplica só os dados da arma; RD, imunidade e vulnerabilidade (LR p. 82, 312–313)', () => {
    assert.equal(combate.textoDano('3d8+5', 3), 'Role 9d8 (crítico ×3) e some +5');
    assert.equal(combate.textoDano('1d8+1d6+2', 2), 'Role 2d8 + 1d6 (crítico ×2) e some +2');
    assert.equal(combate.textoDano('2d6'), 'Role 2d6');
    const c = combate.contaDano({ soma: 41, fixo: 5, tipo: 'balistico', rd: { balistico: 10 } });
    assert.deepEqual(c, { total: 46, final: 36, conta: '46 − RD balístico 10 = 36' });
    assert.equal(combate.contaDano({ soma: 7, fixo: 2, tipo: 'corte', rd: { fisico: 2 } }).final, 7);
    assert.equal(combate.contaDano({ soma: 7, fixo: 2, tipo: 'fogo', imunidades: ['fogo'] }).final, 0);
    assert.equal(combate.contaDano({ soma: 5, fixo: 1, tipo: 'energia', vulnerabilidades: ['energia'] }).final, 12);
  });

  test('consequência: machucado, 0 PV e dano massivo (LR p. 88)', () => {
    assert.deepEqual(combate.consequencia({ pv: 42, pvMax: 42 }, 36), { pv: 6, machucado: true, zerou: false, massivo: 21 });
    assert.deepEqual(combate.consequencia({ pv: 18, pvMax: 18 }, 21), { pv: 0, machucado: false, zerou: true, massivo: null });
    assert.equal(combate.consequencia({ pv: 30, pvMax: 40 }, 8).massivo, null);
  });
});

describe('combate: ataque, PE, condições e ritual', () => {
  const golpe = (quem: number, alvo: number, extra: Partial<combate.AtaqueConfirmado> = {}): Acao => ({
    tipo: 'ataque',
    ataque: {
      quem,
      alvo,
      arma: 'Faca',
      qual: 'padrao',
      teste: { dados: 2, bonus: 5, d20: 15, total: 20, defesa: 14 },
      situacoes: [],
      resultado: 'acerto',
      dano: { formula: '1d4+2', soma: 3, total: 5, tipo: 'corte', conta: '5', final: 5 },
      ...extra,
    },
  });

  test('o ataque gasta a padrão, escreve o teste e o dano e devolve os PV novos do alvo', () => {
    vitais.set(10, { pv: 12, pvMax: 12 });
    let c = aplicar(montado(), { tipo: 'comecar' });
    const r = combate.aplicar(c, golpe(1, 10), ctx());
    assert.ok(r.ok);
    c = r.combate!;
    assert.deepEqual(r.vitais, [{ id: 10, pv: 7 }]);
    assert.equal(combate.acoesDe(c, 1).padrao, true);
    const linhas = c.registro.slice(-2);
    assert.equal(linhas[0].texto, 'Cora ataca Ocultista com Faca: d20 15, total 20 contra Defesa 14 — acertou.');
    assert.deepEqual(linhas[0].destaque, ['acertou']);
    assert.equal(linhas[1].texto, 'Dano 1d4+2: 5. Ocultista: PV 12 → 7.');
    assert.equal(c.ultimo?.resultado, 'acerto');
    assert.equal(recusa(c, golpe(1, 11)), 'A ação padrão já foi usada neste turno.');
  });

  test('crítico que zera: o alvo deita; o agente fica morrendo; o dano massivo pede Fortitude', () => {
    vitais.set(3, { pv: 18, pvMax: 18 });
    vitais.set(11, { pv: 40, pvMax: 40 });
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(c, golpe(1, 3, { resultado: 'critico', multiplicador: 3, dano: { formula: '6d6', soma: 21, total: 21, tipo: 'balistico', conta: '21', final: 21 } }));
    assert.ok(c.registro.some((l) => l.texto === 'Catarina cai inconsciente e morrendo (LR p. 88).'));
    assert.deepEqual(combate.participante(c, 3)?.condicoes, ['caido']);
    c = aplicar(aplicar(c, { tipo: 'passar' }), { tipo: 'passar' });
    // turno do mestre: um ser dele acerta o outro com dano massivo
    c = aplicar(c, golpe(10, 11, { dano: { formula: '4d8', soma: 20, total: 20, tipo: 'impacto', conta: '20', final: 20 } }));
    assert.ok(c.registro.some((l) => l.texto === 'Dano massivo: Acólito faz Fortitude DT 19; se falhar, vai a 0 PV (LR p. 88).'));
  });

  test('defesa especial: só agentes, uma por rodada; erro no corpo a corpo lembra o contra-ataque', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    assert.equal(recusa(c, golpe(1, 10, { reacao: 'esquiva' })), 'Ameaças não usam defesas especiais (LR p. 179).');
    c = aplicar(c, golpe(1, 2, { reacao: 'esquiva', resultado: 'erro', dano: undefined, contraAtaque: true }));
    assert.equal(combate.participante(c, 2)?.reacao, true);
    assert.ok(c.registro.some((l) => l.texto.startsWith('Tepes pode contra-atacar')));
  });

  test('PE: gasta, conta no turno e recusa quando não tem', () => {
    vitais.set(1, { pe: 3, peMax: 5 });
    let c = aplicar(montado(), { tipo: 'comecar' });
    const r = combate.aplicar(c, { tipo: 'gastarPe', quem: 1, pe: 2, motivo: 'Ataque Especial' }, ctx());
    assert.ok(r.ok);
    c = r.combate!;
    assert.deepEqual(r.vitais, [{ id: 1, pe: 1 }]);
    assert.equal(combate.acoesDe(c, 1).pe, 2);
    assert.equal(recusa(c, { tipo: 'gastarPe', quem: 1, pe: 4, motivo: 'x' }), 'Cora só tem 3 PE.');
  });

  test('condições e ritual sustentado entram no começo do turno', () => {
    let c = aplicar(montado(), { tipo: 'comecar' });
    c = aplicar(c, { tipo: 'condicao', id: 2, condicao: 'em-chamas', ativa: true });
    c = aplicar(c, { tipo: 'sustentar', id: 2, ritual: 'Amaldiçoar Arma' });
    assert.equal(recusa(c, { tipo: 'condicao', id: 2, condicao: 'voando', ativa: true }), 'Condição desconhecida.');
    c = aplicar(c, { tipo: 'passar' });
    const doTurno = c.registro.slice(-3).map((l) => l.texto);
    assert.deepEqual(doTurno, ['Vez de Tepes.', 'Tepes sustenta Amaldiçoar Arma: paga 1 PE agora ou o ritual acaba (LR p. 120).', 'Tepes está em chamas: sofre 1d6 de fogo (LR p. 310).']);
    c = aplicar(c, { tipo: 'condicao', id: 2, condicao: 'em-chamas', ativa: false });
    c = aplicar(c, { tipo: 'sustentar', id: 2, ritual: null });
    assert.equal(combate.participante(c, 2)?.condicoes, undefined);
    assert.equal(combate.participante(c, 2)?.sustenta, undefined);
  });

  test('PV, PE e SAN com motivo (socorro, cura): até o máximo', () => {
    vitais.set(3, { pv: 0, pvMax: 18 });
    const c = aplicar(montado(), { tipo: 'comecar' });
    const r = combate.aplicar(c, { tipo: 'vitais', id: 3, pv: 1, motivo: 'primeiros socorros' }, ctx());
    assert.ok(r.ok);
    assert.deepEqual(r.vitais, [{ id: 3, pv: 1 }]);
    assert.equal(r.combate!.registro.at(-1)?.texto, 'Catarina: PV 0 → 1 (primeiros socorros).');
  });
});

describe('ataque no servidor', () => {
  let hotel: Hotel;
  let gm: Peer;
  let mesa: Peer;

  beforeEach(() => {
    const db = seedDb();
    upgradeDb(db);
    hotel = new Hotel({ db, persist: false, timers: false });
    const escritorio = hotel.db.rooms.find((x) => x.name === 'Mansão Alvarez · Escritório')!.id;
    gm = new Peer(hotel);
    gm.send({ t: 'login', name: 'Mestre', look, gmKey: hotel.gmKey });
    gm.send({ t: 'join', roomId: escritorio });
    mesa = new Peer(hotel);
    mesa.send({ t: 'login', name: 'Mesa', look, mesa: true });
    mesa.send({ t: 'join', roomId: escritorio });
    hotel.pushNow();
  });

  const pecas = () => gm.last('session')!.session.characters;

  test('o dano vai para a peça e o desfazer devolve os PV', () => {
    const [a, b] = pecas();
    gm.send({ t: 'vitals', tokenId: -b.id, key: 'pv', max: 30 });
    gm.send({ t: 'vitals', tokenId: -b.id, key: 'pv', value: 30 });
    gm.combate({ tipo: 'abrir' });
    gm.combate({ tipo: 'participante', id: a.id, lado: 'agente', iniciativa: 15 });
    gm.combate({ tipo: 'participante', id: b.id, lado: 'inimigo' });
    gm.combate({ tipo: 'iniciativaMestre', valor: 10 });
    gm.combate({ tipo: 'comecar' });
    gm.combate({
      tipo: 'ataque',
      ataque: {
        quem: a.id,
        alvo: b.id,
        arma: 'Revólver',
        qual: 'padrao',
        teste: { dados: 2, bonus: 3, d20: 19, total: 22, defesa: 15 },
        situacoes: [],
        resultado: 'critico',
        multiplicador: 3,
        dano: { formula: '6d6', soma: 20, total: 20, tipo: 'balistico', conta: '20', final: 20 },
      },
    });
    hotel.pushNow();
    const pv = () => pecas().find((p) => p.id === b.id)!.vitals!.pv;
    assert.equal(pv(), 10);
    assert.equal(gm.last('combate')!.combate!.ultimo?.resultado, 'critico');
    assert.equal(mesa.last('combate')!.combate!.ultimo?.resultado, 'critico');
    gm.combate({ tipo: 'desfazer' });
    hotel.pushNow();
    assert.equal(pv(), 30);
    assert.equal(gm.last('combate')!.combate!.ultimo, undefined);
  });

  test('a ficha da ameaça fica na campanha e só o mestre recebe', () => {
    const [, b] = pecas();
    gm.send({ t: 'ameaca', tokenId: b.id, ficha: { ...combate.fichaAmeacaVazia(), tipo: 'Pessoa', vd: 40, defesa: 15, rd: { balistico: 10, voar: 3 } } as unknown as combate.FichaAmeaca });
    hotel.pushNow();
    const f = gm.last('combate')!.ameacas?.[String(b.id)];
    assert.equal(f?.defesa, 15);
    assert.deepEqual(f?.rd, { balistico: 10 });
    assert.equal(mesa.last('combate')!.ameacas, undefined);
    mesa.send({ t: 'ameaca', tokenId: b.id, ficha: null });
    assert.match(mesa.last('error')?.msg ?? '', /mestre/);
    gm.send({ t: 'ameaca', tokenId: b.id, ficha: null });
    hotel.pushNow();
    assert.equal(gm.last('combate')!.ameacas?.[String(b.id)], undefined);
  });
});
