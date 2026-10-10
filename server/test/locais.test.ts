import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
  montarLocais,
  nomeCurto,
  rotuloDoAndar,
  type ClientMsg,
  type ServerMsg,
} from "@crona/shared";
import { Hotel } from "../src/hotel";
import { seedDb, upgradeDb } from "../src/seed";
import { FAZENDA } from "../src/seedFazenda";

const look = {
  skin: "#e8b98f",
  hair: "#3b2618",
  hairStyle: 0,
  top: "#2b2a30",
  pants: "#1c1b1f",
  shoes: "#3d3a40",
  outfit: 1,
  extra: 0,
  charId: null,
};

let hotel: Hotel;
let inbox: ServerMsg[];
let client: ReturnType<Hotel["attach"]>;
const send = (m: ClientMsg) => hotel.receive(client, m);
/** As cenas da campanha que o mestre recebe (a do cômodo aberto). */
function cenasDa(roomId: number) {
  send({ t: "join", roomId });
  hotel.pushNow();
  for (let i = inbox.length - 1; i >= 0; i--) {
    const m = inbox[i];
    if (m.t === "campaign" && m.state.scenes.some((s) => s.id === roomId))
      return m.state.scenes;
  }
  throw new Error("sem campanha");
}
const idDe = (nome: string) => {
  const r = hotel.db.rooms.find((x) => x.name === nome);
  assert.ok(r, nome);
  return r.id;
};

beforeEach(() => {
  const db = seedDb();
  upgradeDb(db);
  hotel = new Hotel({ db, persist: false, timers: false });
  inbox = [];
  client = hotel.attach(
    (m) => inbox.push(JSON.parse(JSON.stringify(m)) as ServerMsg),
    undefined,
    true,
  );
  send({ t: "login", name: "Mestre", look });
});

describe("Locais do minimapa", () => {
  test("os rótulos dos andares", () => {
    assert.equal(rotuloDoAndar("Casarão", "Casarão", true), "Térreo");
    assert.equal(rotuloDoAndar("Casarão 2º", "Casarão", false), "2º andar");
    assert.equal(rotuloDoAndar("Galpões", "Celeiro", true), "Térreo");
    assert.equal(rotuloDoAndar("Calabouço", "Celeiro", false), "Calabouço");
    assert.equal(rotuloDoAndar("Subsolo", "", false), "Subsolo");
  });

  test("a fazenda: terreno, prédios com os andares e os cômodos", () => {
    const cenas = cenasDa(idDe(FAZENDA + "Olhos de Águia"));
    const fora = cenas.find((s) => s.name === FAZENDA + "Olhos de Águia")!;
    // o servidor diz que cena cada prédio abre e manda o que tem no chão
    assert.ok(fora.marcos?.every((m) => m.entra !== undefined && m.kind));
    assert.ok(fora.simbolos?.some(([k]) => k === "arvore"));
    const l = montarLocais(cenas);
    assert.deepEqual(
      l.terrenos.map((t) => t.nome),
      ["Olhos de Águia", "Arredores"],
    );
    const t = l.terrenos[0];
    assert.deepEqual(
      t.predios.map((id) => l.predios.find((p) => p.id === id)!.nome).sort(),
      ["Casa de Mantimentos", "Casarão", "Celeiro"],
    );
    assert.deepEqual(
      t.saidas.map((s) => s.para),
      [idDe(FAZENDA + "Arredores")],
    );
    const predio = (nome: string) => l.predios.find((p) => p.nome === nome)!;
    const casarao = predio("Casarão");
    assert.equal(casarao.entrada, idDe(FAZENDA + "Hall do Casarão"));
    assert.deepEqual(
      casarao.andares.map((a) => a.rotulo),
      ["2º andar", "Térreo"],
    );
    assert.equal(casarao.cenas.length, 12);
    // o calabouço é o subsolo do celeiro, e a casa de mantimentos é outro prédio
    assert.deepEqual(
      predio("Celeiro").andares.map((a) => a.rotulo),
      ["Térreo", "Calabouço"],
    );
    assert.deepEqual(
      predio("Celeiro").andares[1].cenas.map((id) =>
        nomeCurto(cenas.find((s) => s.id === id)!.name),
      ),
      ["Calabouço", "Corredor Escuro", "Sala de Sangue"],
    );
    assert.equal(predio("Casa de Mantimentos").cenas.length, 1);
    // toda cena tem um lugar
    for (const s of cenas) assert.ok(l.onde.has(s.id), s.name);
    assert.equal(
      l.onde.get(idDe(FAZENDA + "Quarto 1"))?.predio,
      casarao.id,
    );
  });

  test("a Sede, sem terreno: um prédio só com o térreo e o subsolo", () => {
    const cenas = cenasDa(hotel.db.home!);
    const l = montarLocais(cenas);
    assert.equal(l.terrenos.length, 0);
    assert.equal(l.predios.length, 1);
    assert.equal(l.predios[0].nome, "");
    assert.deepEqual(
      l.predios[0].andares.map((a) => a.rotulo),
      ["Térreo", "Subsolo"],
    );
    assert.equal(l.predios[0].cenas.length, cenas.length);
  });
});
