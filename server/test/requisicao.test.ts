import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { regras, type ClientMsg, type FichaSalva, type ServerMsg } from '@crona/shared';
import { Hotel } from '../src/hotel';
import { seedDb, upgradeDb } from '../src/seed';

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
  last<T extends ServerMsg['t']>(t: T): Msg<T> | undefined {
    for (let i = this.inbox.length - 1; i >= 0; i--) if (this.inbox[i].t === t) return this.inbox[i] as Msg<T>;
    return undefined;
  }
}

const look = { skin: '#e8b98f', hair: '#3b2618', hairStyle: 0, top: '#2b2a30', pants: '#1c1b1f', shoes: '#3d3a40', outfit: 1, extra: 0, charId: null };

/** Combatente de NEX 5% (Militar), pronto. */
function ficha(pp = 0): regras.Ficha {
  const f = regras.novaFicha('Teste');
  f.atributos = { agi: 2, for: 2, int: 1, pre: 1, vig: 3 };
  f.origem = 'militar';
  f.classe = 'combatente';
  f.pericias.grupos = ['luta', 'fortitude'];
  f.pericias.livres = ['atletismo', 'percepcao'];
  f.pp = pp;
  return f;
}

describe('requisição: o que se escolhe dentro do item', () => {
  test('o utensílio pede a perícia, e com ela dá +2 na mão', () => {
    assert.equal(regras.escolhaDoItem('equipamento', 'utensilio'), 'pericia');
    assert.equal(regras.escolhaDoItem('equipamento', 'amarras-de-elemento'), 'elemento');
    assert.equal(regras.escolhaDoItem('arma', 'faca'), null);
    assert.ok(!regras.periciasDoItem().some((p) => p.id === 'luta' || p.id === 'pontaria'));
    const f = ficha();
    const antes = regras.calcular(f).pericias.investigacao.bonus;
    f.inventario.push({ id: 'utensilio', tipo: 'equipamento', empunhado: true, escolha: { pericia: 'investigacao' } });
    assert.equal(regras.calcular(f).pericias.investigacao.bonus, antes + 2);
    assert.equal(regras.nomeDoItem({ id: 'amarras-de-elemento', tipo: 'equipamento', escolha: { elemento: 'sangue' } }), 'Amarras de Sangue');
  });
});

describe('requisição: modificações e maldições', () => {
  test('só aparece o que serve para o item; requisito de proteção pesada trava na leve', () => {
    const f = ficha();
    f.inventario.push({ id: 'protecao-leve', tipo: 'protecao' });
    const ops = regras.opcoesDeMelhoria(f, 0);
    assert.ok(ops.length);
    assert.ok(!ops.some((o) => o.id === 'certeira'), 'modificação de arma não aparece na proteção');
    const pesada = ops.find((o) => o.tipo === 'modificacao' && regras.catalogo.modificacao(o.id)?.requisitos?.some((r) => r.tipo === 'texto' && r.texto === 'só em proteção pesada'));
    assert.ok(pesada && !pesada.ok, 'a de proteção pesada fica travada');
  });

  test('maldição: só de agente especial em diante, e elementos que se oprimem não vão juntos', () => {
    const recruta = ficha(0);
    recruta.nex = 10;
    recruta.inventario.push({ id: 'faca', tipo: 'arma' });
    const r = regras.opcoesDeMelhoria(recruta, 0).find((o) => o.tipo === 'maldicao')!;
    assert.ok(!r.ok && r.motivos.some((m) => /agente especial/.test(m)));
    const especial = ficha(60);
    especial.inventario.push({ id: 'faca', tipo: 'arma', maldicoes: ['lancinante'] });
    // sangue oprime conhecimento: Senciente (conhecimento) não vai junto
    const senciente = regras.opcoesDeMelhoria(especial, 0).find((o) => o.id === 'senciente')!;
    assert.ok(!senciente.ok, 'conhecimento com sangue fica travado');
  });
});

describe('requisição no servidor', () => {
  let hotel: Hotel;
  let gm: Peer;
  let id: number;
  const salva = () => hotel.db.fichas!.find((x) => x.id === id)!;
  beforeEach(() => {
    const db = seedDb();
    upgradeDb(db);
    hotel = new Hotel({ db, persist: false, timers: false });
    gm = new Peer(hotel, true);
    gm.send({ t: 'login', name: 'Mestre', look });
    const agora = new Date().toISOString();
    gm.send({ t: 'fichaSalvar', ficha: { id: 0, nome: 'Teste', ficha: ficha(), criadaEm: agora, atualizadaEm: agora } as FichaSalva });
    id = gm.last('fichas')!.nova!;
  });

  test('munição empilha em pacotes; o utensílio guarda a perícia escolhida', () => {
    gm.send({ t: 'mochilaNova', fichaId: id, tipo: 'equipamento', id: 'balas-curtas' });
    gm.send({ t: 'mochilaNova', fichaId: id, tipo: 'equipamento', id: 'balas-curtas' });
    const balas = salva().ficha.inventario.filter((x) => x.id === 'balas-curtas');
    assert.equal(balas.length, 1);
    assert.equal(balas[0].qtd, 2);
    gm.send({ t: 'mochilaNova', fichaId: id, tipo: 'equipamento', id: 'utensilio', escolha: { pericia: 'investigacao' } });
    assert.equal(salva().ficha.inventario.find((x) => x.id === 'utensilio')?.escolha?.pericia, 'investigacao');
  });

  test('o mestre põe e tira uma modificação; o que não serve para o item é recusado', () => {
    gm.send({ t: 'mochilaNova', fichaId: id, tipo: 'arma', id: 'faca' });
    const uid = salva().ficha.inventario.find((x) => x.id === 'faca')!.uid!;
    gm.send({ t: 'mochilaMelhorar', fichaId: id, uid, tipo: 'modificacao', id: 'certeira', por: true });
    assert.deepEqual(salva().ficha.inventario.find((x) => x.uid === uid)?.modificacoes, ['certeira']);
    gm.send({ t: 'mochilaMelhorar', fichaId: id, uid, tipo: 'modificacao', id: 'certeira', por: false });
    assert.equal(salva().ficha.inventario.find((x) => x.uid === uid)?.modificacoes, undefined);
    gm.send({ t: 'mochilaMelhorar', fichaId: id, uid, tipo: 'modificacao', id: 'nao-existe', por: true });
    assert.match(gm.last('error')?.msg ?? '', /não vai/);
  });

  test('o jogador que salva a ficha passando do limite da patente é recusado', () => {
    gm.send({ t: 'fichaLink', id });
    const chave = salva().chave!;
    const jog = new Peer(hotel);
    jog.send({ t: 'login', name: 'Jogador', look, fichaKey: chave });
    const f = structuredClone(salva());
    // recruta: uma vaga de categoria I; pede três
    for (const x of ['submetralhadora', 'submetralhadora', 'submetralhadora']) f.ficha.inventario.push({ id: x, tipo: 'arma' });
    jog.send({ t: 'fichaSalvar', ficha: f });
    assert.match(jog.last('error')?.msg ?? '', /patente/);
    assert.ok(!salva().ficha.inventario.some((x) => x.id === 'submetralhadora'));
  });
});
