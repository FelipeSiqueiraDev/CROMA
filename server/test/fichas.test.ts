import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { regras, type ClientMsg, type FichaSalva, type ServerMsg } from '@crona/shared';
import { Hotel } from '../src/hotel';
import { seedDb, upgradeDb } from '../src/seed';
import { SEDE } from '../src/seedSede';

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
function fichaNova(nome: string, personagem?: number): FichaSalva {
  const f = regras.novaFicha(nome);
  f.atributos = { agi: 2, for: 2, int: 1, pre: 1, vig: 3 };
  f.origem = 'militar';
  f.classe = 'combatente';
  f.pericias.grupos = ['luta', 'fortitude'];
  f.pericias.livres = ['atletismo', 'percepcao'];
  const agora = new Date().toISOString();
  return { id: 0, nome, personagem, ficha: f, criadaEm: agora, atualizadaEm: agora };
}

let hotel: Hotel;
let gm: Peer;
beforeEach(() => {
  const db = seedDb();
  upgradeDb(db);
  hotel = new Hotel({ db, persist: false, timers: false });
  gm = new Peer(hotel, true);
  gm.send({ t: 'login', name: 'Mestre', look });
});

describe('fichas', () => {
  test('o mestre cria e recebe a lista; o jogador comum não cria', () => {
    assert.deepEqual(gm.last('fichas')?.fichas, []);
    gm.send({ t: 'fichaSalvar', ficha: fichaNova('Teste') });
    const m = gm.last('fichas')!;
    assert.equal(m.fichas.length, 1);
    assert.equal(m.nova, m.fichas[0].id);
    const outro = new Peer(hotel);
    outro.send({ t: 'login', name: 'Fulano', look });
    outro.send({ t: 'fichaSalvar', ficha: fichaNova('Invasor') });
    assert.equal(hotel.db.fichas!.length, 1);
  });

  test('ficha ligada ao personagem: os máximos vão para a peça e o PV da peça volta para a ficha', () => {
    const bar = [...hotel.rooms.values()].find((r) => r.data.name === SEDE + 'Bar')!;
    const tk = bar.tokenList()[0];
    const charId = tk.look.charId!;
    gm.send({ t: 'join', roomId: bar.data.id });
    gm.send({ t: 'fichaSalvar', ficha: fichaNova('Ligada', charId) });
    const calc = regras.calcular(hotel.db.fichas![0].ficha);
    const v = bar.tokenList().find((x) => x.id === tk.id)!.vitals!;
    assert.equal(v.pvMax, calc.pv);
    assert.equal(v.sanMax, calc.san);
    gm.send({ t: 'vitals', tokenId: tk.id, key: 'pv', delta: -3 });
    assert.equal(hotel.db.fichas![0].atual?.pv, calc.pv - 3);
  });

  test('ao subir o servidor, a peça de agente sem PV/PE/SAN pega os da ficha; a que já tem fica como está', () => {
    const db = seedDb();
    upgradeDb(db);
    const pecas = db.rooms.flatMap((r) => r.tokens ?? []).filter((t) => t.look.charId);
    const sem = pecas[0];
    const com = pecas.find((t) => t.look.charId !== sem.look.charId)!;
    delete sem.vitals;
    com.vitals = { pv: 3, pvMax: 9, pe: 1, peMax: 2, san: 4, sanMax: 8 };
    db.fichas = [
      { ...fichaNova('Sem', sem.look.charId!), id: 1 },
      { ...fichaNova('Com', com.look.charId!), id: 2 },
    ];
    const h = new Hotel({ db, persist: false, timers: false });
    const calc = regras.calcular(db.fichas[0].ficha);
    const peca = (id: number) => [...h.rooms.values()].flatMap((r) => r.tokenList()).find((t) => Math.abs(t.id) === id)!;
    assert.deepEqual(peca(sem.id).vitals, { pv: calc.pv, pvMax: calc.pv, pe: calc.pe, peMax: calc.pe, san: calc.san, sanMax: calc.san });
    assert.deepEqual(peca(com.id).vitals, { pv: 3, pvMax: 9, pe: 1, peMax: 2, san: 4, sanMax: 8 });
  });

  test('link do jogador: vê só a própria ficha, sem a chave; NEX e patente ficam com o mestre', () => {
    gm.send({ t: 'fichaSalvar', ficha: fichaNova('Dele') });
    gm.send({ t: 'fichaSalvar', ficha: fichaNova('Outra') });
    const dele = gm.last('fichas')!.fichas.find((f) => f.nome === 'Dele')!;
    gm.send({ t: 'fichaLink', id: dele.id });
    const chave = gm.last('fichas')!.fichas.find((f) => f.id === dele.id)!.chave!;
    assert.ok(chave);

    const jog = new Peer(hotel);
    jog.send({ t: 'login', name: 'Jogador', look, fichaKey: chave });
    const minhas = jog.last('fichas')!.fichas;
    assert.deepEqual(minhas.map((f) => f.nome), ['Dele']);
    assert.equal(minhas[0].chave, undefined);

    // muda o nome e tenta subir o NEX e os PP: nome muda, NEX e PP não
    const f = structuredClone(minhas[0]);
    f.nome = 'Novo nome';
    f.ficha.nex = 50;
    f.ficha.pp = 200;
    jog.send({ t: 'fichaSalvar', ficha: f });
    const salva = hotel.db.fichas!.find((x) => x.id === dele.id)!;
    assert.equal(salva.nome, 'Novo nome');
    assert.equal(salva.ficha.nex, 5);
    assert.equal(salva.ficha.pp, 0);
    assert.equal(salva.chave, chave, 'a chave continua');

    // a ficha de outro não
    const outra = structuredClone(gm.last('fichas')!.fichas.find((x) => x.nome === 'Outra')!);
    outra.nome = 'Hackeada';
    jog.send({ t: 'fichaSalvar', ficha: outra });
    assert.ok(!hotel.db.fichas!.some((x) => x.nome === 'Hackeada'));
    jog.send({ t: 'fichaApagar', id: dele.id });
    assert.ok(hotel.db.fichas!.some((x) => x.id === dele.id), 'jogador não apaga');
  });

  test('link inválido não entra', () => {
    const jog = new Peer(hotel);
    jog.send({ t: 'login', name: 'Jogador', look, fichaKey: 'errada' });
    assert.equal(jog.last('welcome'), undefined);
    assert.match(jog.last('error')!.msg, /inválido/);
  });
});
