import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { regras, type ClientMsg, type ServerMsg } from "@crona/shared";
import { Hotel } from "../src/hotel";
import { seedDb, upgradeDb } from "../src/seed";

type Msg<T extends ServerMsg["t"]> = Extract<ServerMsg, { t: T }>;

/** Uma conexão de teste: guarda tudo o que o servidor manda. */
class Peer {
  inbox: ServerMsg[] = [];
  readonly client;
  constructor(
    private hotel: Hotel,
    local = false,
  ) {
    this.client = hotel.attach(
      (m) => this.inbox.push(JSON.parse(JSON.stringify(m)) as ServerMsg),
      undefined,
      local,
    );
  }
  send(m: ClientMsg) {
    this.hotel.receive(this.client, m);
  }
  /** Espera a próxima mensagem do tipo (a senha vira hash fora da linha principal). */
  async espera<T extends ServerMsg["t"]>(t: T): Promise<Msg<T>> {
    for (let i = 0; i < 300; i++) {
      const k = this.inbox.findIndex((m) => m.t === t);
      if (k >= 0) return this.inbox.splice(k, 1)[0] as Msg<T>;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error(`não chegou ${t}`);
  }
}

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
beforeEach(() => {
  const db = seedDb();
  upgradeDb(db);
  hotel = new Hotel({ db, persist: false, timers: false });
});

async function criar(p: Peer, nome: string, email: string, senha = "segredo1") {
  p.send({ t: "contaCriar", nome, email, senha });
  return p.espera("conta");
}

describe("contas da plataforma", () => {
  test("a primeira conta é de mestre, e a sessão dela entra com o tabuleiro inteiro", async () => {
    const p = new Peer(hotel);
    const r = await criar(p, "Felipe", "Mestre@Crona.test");
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.papel, "mestre");
    assert.equal(r.nome, "Felipe");
    // a senha não fica guardada, só o hash
    const conta = hotel.db.contas![0];
    assert.equal(conta.email, "mestre@crona.test");
    assert.ok(conta.senha.startsWith("scrypt$") && !conta.senha.includes("segredo1"));
    p.send({ t: "login", name: "qualquer", look, sessao: r.sessao });
    const w = await p.espera("welcome");
    assert.equal(w.role, "gm");
    assert.equal(w.name, "Felipe");
  });

  test("depois da primeira, a conta é de jogador; criada no computador do servidor, é de mestre", async () => {
    await criar(new Peer(hotel), "Felipe", "mestre@crona.test");
    const j = await criar(new Peer(hotel), "Alosi", "alosi@crona.test");
    assert.ok(j.ok && j.papel === "jogador");
    const m2 = await criar(new Peer(hotel, true), "Outro Mestre", "outro@crona.test");
    assert.ok(m2.ok && m2.papel === "mestre");
  });

  test("e-mail repetido, nome repetido, senha curta e senha errada", async () => {
    const p = new Peer(hotel);
    await criar(p, "Felipe", "mestre@crona.test");
    const rep = await criar(p, "Outro", "MESTRE@crona.test");
    assert.ok(!rep.ok && /e-mail/.test(rep.erro));
    const nome = await criar(p, "felipe", "novo@crona.test");
    assert.ok(!nome.ok && /nome/.test(nome.erro));
    const curta = await criar(p, "Curta", "curta@crona.test", "123");
    assert.ok(!curta.ok && /senha/.test(curta.erro));
    p.send({ t: "contaEntrar", email: "mestre@crona.test", senha: "errada!!" });
    const errada = await p.espera("conta");
    assert.ok(!errada.ok && /não conferem/.test(errada.erro));
    p.send({ t: "contaEntrar", email: "ninguem@crona.test", senha: "segredo1" });
    const ninguem = await p.espera("conta");
    assert.ok(!ninguem.ok && /não conferem/.test(ninguem.erro));
    p.send({ t: "contaEntrar", email: "mestre@crona.test", senha: "segredo1" });
    assert.ok((await p.espera("conta")).ok);
  });

  test("entra pelo nome da conta também; a regra da senha curta é só para criar", async () => {
    const p = new Peer(hotel);
    await criar(p, "Felipe", "mestre@crona.test");
    p.send({ t: "contaEntrar", email: "FELIPE", senha: "segredo1" });
    const r = await p.espera("conta");
    assert.ok(r.ok && r.nome === "Felipe");
    // a conta criada fora do formulário (scripts/dev/conta.mts), com a senha curta, entra
    const { hashSenha } = await import("../src/contas");
    hotel.db.contas!.push({ id: 99, nome: "admin", email: "admin@crona.local", senha: await hashSenha("admin"), papel: "mestre", sessoes: [], criadaEm: Date.now() });
    p.send({ t: "contaEntrar", email: "admin", senha: "admin" });
    const a = await p.espera("conta");
    assert.ok(a.ok && a.papel === "mestre");
    p.send({ t: "contaEntrar", email: "admin", senha: "errada" });
    const e = await p.espera("conta");
    assert.ok(!e.ok && /não conferem/.test(e.erro));
  });

  test("muitas senhas erradas seguidas: a conexão espera um pouco", async () => {
    const p = new Peer(hotel);
    await criar(p, "Felipe", "mestre@crona.test");
    for (let i = 0; i < 5; i++) {
      p.send({ t: "contaEntrar", email: "mestre@crona.test", senha: "errada!!" });
      await p.espera("conta");
    }
    p.send({ t: "contaEntrar", email: "mestre@crona.test", senha: "segredo1" });
    const r = await p.espera("conta");
    assert.ok(!r.ok && /Espere/.test(r.erro));
  });

  test("a sessão vale até sair; depois, o login pede para entrar de novo", async () => {
    const p = new Peer(hotel);
    const r = await criar(p, "Felipe", "mestre@crona.test");
    assert.ok(r.ok);
    if (!r.ok) return;
    p.send({ t: "contaSair", sessao: r.sessao });
    const q = new Peer(hotel);
    q.send({ t: "login", name: "Felipe", look, sessao: r.sessao });
    const e = await q.espera("conta");
    assert.ok(!e.ok && e.expirou);
    assert.ok(!q.inbox.some((m) => m.t === "welcome"));
  });

  test("o jogador que abre o link da ficha com a conta fica com ela; depois, entra direto nela", async () => {
    await criar(new Peer(hotel), "Felipe", "mestre@crona.test");
    const agora = new Date().toISOString();
    const ficha = { id: 1, nome: "Alosi", ficha: regras.novaFicha("Alosi"), criadaEm: agora, atualizadaEm: agora, chave: "chave-de-teste-123" };
    hotel.db.fichas = [ficha];
    const p = new Peer(hotel);
    const r = await criar(p, "Alosi", "alosi@crona.test");
    assert.ok(r.ok && r.papel === "jogador" && !r.fichaKey);
    if (!r.ok) return;
    p.send({ t: "login", name: "x", look, sessao: r.sessao, fichaKey: "chave-de-teste-123" });
    assert.equal((await p.espera("welcome")).role, "player");
    assert.equal(hotel.db.contas!.find((c) => c.nome === "Alosi")!.fichaId, ficha.id);
    // entrando de novo, a conta já traz a chave da ficha
    const q = new Peer(hotel);
    q.send({ t: "contaEntrar", email: "alosi@crona.test", senha: "segredo1" });
    const de = await q.espera("conta");
    assert.ok(de.ok && de.fichaKey === "chave-de-teste-123");
    // o mestre trocou o link: com a conta, a ficha continua dela
    ficha.chave = "chave-nova-456";
    if (!de.ok) return;
    q.send({ t: "login", name: "x", look, sessao: de.sessao, fichaKey: "chave-de-teste-123" });
    assert.equal((await q.espera("welcome")).role, "player");
    assert.ok(q.inbox.some((m) => m.t === "fichas"), "recebe a ficha");
  });
});
