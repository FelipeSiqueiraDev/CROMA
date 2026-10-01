import crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import {
  DIR_KEYS,
  getLayout,
  MAX_NAME,
  sanitizeCharPatch,
  sanitizeLook,
  type CharacterDef,
  type InvItem,
  DEFAULT_CAPACITY,
  parseHeightmap,
  playerColorFor,
  SESSION_ACTIONS,
  sceneShortName,
  type CampaignState,
  type Character,
  type Item,
  type LogIcon,
  type NormPoint,
  type PartyMember,
  type Role,
  type RoomSummary,
  type SceneInfo,
  type SceneObject,
  type ServerMsg,
  type Session,
  type SessionActionType,
  type Tile,
  type Token,
  type VitalKey,
  type Vitals,
  VITAL_LABEL,
  regras,
  combate as cmb,
  sanitizarFicha,
  type FichaSalva,
  ACOES_MOCHILA,
  itemParaLoot,
  lootParaItem,
  type AcaoMochila,
  type Loot,
} from '@croma/shared';
import { loadDb, saveDbNow, scheduleSave, type CampaignData, type Database, type RoomData, type UserData } from './db';
import { RoomInstance, type Client, type HotelApi } from './roomInstance';
import { refreshPortraits } from './portraits';
import { seedDb, SYSTEM_OWNER, upgradeDb } from './seed';

const NAME_RE = /^[\p{L}\p{N}_\-. ]+$/u;
const STARTER: string[] = ['chair_wood', 'table_small', 'candles', 'crate_wood', 'plant'];

/** Mensagens que mudam o tabuleiro: só o mestre manda (o resto recebe "Só o mestre..."). */
const GM_ONLY = new Set([
  'createRoom',
  'charUpdate',
  'charDelete',
  'sendTo',
  'objAdd',
  'objToggle',
  'objRemove',
  'campaignSet',
  'layoutSet',
  'planNota',
  'capacitySet',
  'tokenAdd',
  'tokenEdit',
  'tokenRemove',
  'tokenWalk',
  'tokenFace',
  'tokenScene',
  'vitals',
  'fichaApagar',
  'fichaLink',
  'mochila',
  'place',
  'placeWall',
  'moveItem',
  'moveWallItem',
  'pickup',
  'use',
  'setHint',
  'roomSettings',
  'roomFx',
  'setLink',
  'unlock',
  'relock',
  'lootAdd',
  'lootRemove',
  'lootGive',
  'lootReveal',
  'actionAdd',
  'actionRemove',
  'actionLog',
  'floorPlan',
  'combate',
  'ameaca',
]);

/** Quantos estados do combate o "Desfazer" guarda por campanha. */
const MAX_DESFAZER = 40;

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface HotelOptions {
  /** banco em memória (testes); sem ele, lê server/data/db.json */
  db?: Database;
  /** false = não grava nada em disco (testes) */
  persist?: boolean;
  /** false = nada roda sozinho; o teste chama pushNow() e room.step() */
  timers?: boolean;
}

export class Hotel implements HotelApi {
  db: Database;
  rooms = new Map<number, RoomInstance>();
  readonly timers: boolean;
  private persist: boolean;
  private clients = new Map<number, Client>();
  private byToken = new Map<string, Client>();
  private nextClientId = 1;
  private listTimer: NodeJS.Timeout | null = null;
  private touchTimer: NodeJS.Timeout | null = null;

  constructor(opts: HotelOptions = {}) {
    this.persist = opts.persist ?? true;
    this.timers = opts.timers ?? true;
    const loaded = opts.db ? null : loadDb();
    this.db = opts.db ?? loaded ?? seedDb();
    let dirty = upgradeDb(this.db) || (!loaded && !opts.db);
    if (!this.db.gmKey) {
      this.db.gmKey = crypto.randomBytes(9).toString('base64url');
      dirty = true;
    }
    if (refreshPortraits(this.db.characters)) dirty = true;
    for (const r of this.db.rooms) this.rooms.set(r.id, new RoomInstance(r, this));
    if (this.migrarMochilas()) dirty = true;
    if (dirty && this.persist) saveDbNow(this.db);
    // peças de agente que ainda não têm PV/PE/SAN pegam os da ficha (a MAPA e o combate usam)
    for (const f of this.db.fichas ?? [])
      if (f.personagem)
        try {
          this.fichaParaPecas(f, true);
        } catch (e) {
          console.error(`[fichas] ficha ${f.id} com erro nas regras`, e);
        }
    if (this.persist) console.log(`[hotel] ${this.rooms.size} quarto(s), ${this.db.characters.length} personagem(ns)`);
    if (this.timers) {
      setInterval(() => this.pushScenes(), 1500);
      // retratos e poses do tabuleiro novos na pasta do personagem aparecem sem reiniciar o servidor
      setInterval(() => this.checkPortraits(), 5000);
    }
  }

  /** Procura retratos e poses do tabuleiro novos (ou removidos) nas pastas dos personagens. */
  checkPortraits() {
    if (!refreshPortraits(this.db.characters)) return;
    this.save();
    this.broadcastCharacters();
  }

  /** Chave do link do mestre. */
  get gmKey() {
    return this.db.gmKey!;
  }

  private checkGmKey(key: string) {
    const a = Buffer.from(key);
    const b = Buffer.from(this.gmKey);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  // ---------- minimapa: cenas ligadas por Passagens ----------
  private sceneGroup(roomId: number): number[] {
    const adj = new Map<number, Set<number>>();
    const link = (a: number, b: number) => {
      if (!this.rooms.has(a) || !this.rooms.has(b)) return;
      (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b);
      (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a);
    };
    for (const r of this.rooms.values()) for (const p of r.portals()) link(r.data.id, p.link);
    const seen = new Set([roomId]);
    const queue = [roomId];
    while (queue.length) for (const n of adj.get(queue.shift()!) ?? []) if (!seen.has(n)) (seen.add(n), queue.push(n));
    return [...seen];
  }

  // ---------- campanha (tela MAPA) ----------
  private campaignFor(key: number): CampaignData {
    const all = (this.db.campaigns ??= {});
    let c = all[String(key)];
    if (!c) {
      const r = this.rooms.get(key);
      const [title, sub] = (r?.data.name ?? 'Campanha').split('·').map((s) => s.trim());
      c = { title: title || 'Campanha', subtitle: sub ?? '', objectives: [], layout: {}, log: [] };
      all[String(key)] = c;
    }
    return c;
  }

  private groupKey(roomId: number) {
    return Math.min(...this.sceneGroup(roomId));
  }

  log(roomId: number, icon: LogIcon, text: string) {
    const c = this.campaignFor(this.groupKey(roomId));
    c.log.push({ at: Date.now(), icon, text });
    if (c.log.length > 60) c.log.splice(0, c.log.length - 60);
    this.save();
    this.touch();
  }

  /** Mudanças de PV/PE/SAN esperando para ir ao registro (cliques seguidos viram uma linha). */
  private vitalLog = new Map<string, { roomId: number; name: string; key: VitalKey; from: number; to: number; max: number; timer: NodeJS.Timeout | null }>();

  // ---------- combate (docs/COMBATE.md) ----------
  /** estados anteriores do combate de cada campanha, para o "Desfazer" (só na memória), com os PV/PE/SAN que cada passo mudou */
  private desfazeres = new Map<number, { combate: string; vitais: { id: number; antes: Vitals }[] }[]>();

  /** Peças da campanha e os PV/SAN delas, para as regras do combate. */
  private contextoCombate(group: number[], cena: number): cmb.Contexto {
    const agentes = new Set((this.db.fichas ?? []).map((f) => f.personagem).filter((x): x is number => !!x));
    const pecas: cmb.PecaCombate[] = [];
    const vitais = new Map<number, Vitals>();
    for (const id of group) {
      const r = this.rooms.get(id);
      if (!r) continue;
      for (const t of r.tokensLive()) {
        pecas.push({ id: t.token.id, nome: t.name, agente: !!t.look.charId && agentes.has(t.look.charId), naCena: id === cena });
        if (t.vitals) vitais.set(t.token.id, { ...t.vitals });
      }
    }
    const ameacas = this.campaignFor(Math.min(...group)).ameacas ?? {};
    return { agora: Date.now(), cena, pecas, vitais: (id) => vitais.get(id) ?? null, ameaca: (id) => ameacas[String(id)] ?? null };
  }

  /** Uma ação da tela de combate (só o mestre). */
  private combateAcao(c: Client, m: Record<string, unknown>) {
    const room = c.room;
    if (!room) return;
    const a = cmb.lerAcao(m.a);
    if (!a) return c.send({ t: 'denied', action: 'combate', reason: 'Ação de combate inválida.' });
    const group = this.sceneGroup(room.data.id);
    const key = Math.min(...group);
    const camp = this.campaignFor(key);
    const pilha = this.desfazeres.get(key) ?? [];
    this.desfazeres.set(key, pilha);
    if (a.tipo === 'desfazer') {
      const passo = pilha.pop();
      if (passo === undefined) return c.send({ t: 'denied', action: 'combate', reason: 'Nada para desfazer.' });
      const volta = JSON.parse(passo.combate) as cmb.Combate | null;
      if (volta) camp.combate = volta;
      else delete camp.combate;
      // o que o passo mudou nas peças volta também
      for (const x of passo.vitais) this.mudarVitaisPeca(group, x.id, x.antes);
      this.save();
      this.touch();
      return;
    }
    const antes = camp.combate ?? null;
    const r = cmb.aplicar(antes, a, this.contextoCombate(group, room.data.id));
    if (!r.ok) return c.send({ t: 'denied', action: 'combate', reason: r.motivo });
    const mudou: { id: number; antes: Vitals }[] = [];
    for (const m of r.vitais ?? []) {
      const velho = this.mudarVitaisPeca(group, m.id, m);
      if (velho) mudou.push({ id: m.id, antes: velho });
    }
    pilha.push({ combate: JSON.stringify(antes), vitais: mudou });
    if (pilha.length > MAX_DESFAZER) pilha.splice(0, pilha.length - MAX_DESFAZER);
    if (r.combate) camp.combate = r.combate;
    else delete camp.combate;
    // o começo e o fim do combate vão também para o registro da sessão
    if (a.tipo === 'comecar') this.log(room.data.id, 'dice', 'Combate começou.');
    if (a.tipo === 'encerrar' && antes?.fase === 'andamento') this.log(room.data.id, 'dice', `Combate encerrado na rodada ${antes.rodada}.`);
    this.save();
    this.touch();
  }

  /** PV, PE ou SAN de uma peça da campanha (procura a cena em que ela está). Devolve os de antes. */
  private mudarVitaisPeca(group: number[], tokenId: number, m: { pv?: number; pe?: number; san?: number }): Vitals | null {
    for (const id of group) {
      const antes = this.rooms.get(id)?.mudarVitais(tokenId, m);
      if (antes) return antes;
    }
    return null;
  }

  /** Ficha rápida de ameaça de uma peça (só o mestre), guardada na campanha. */
  private ameacaSalvar(c: Client, m: Record<string, unknown>) {
    const room = c.room;
    if (!room || typeof m.tokenId !== 'number') return;
    const group = this.sceneGroup(room.data.id);
    const existe = group.some((id) => this.rooms.get(id)?.tokensLive().some((t) => t.token.id === m.tokenId));
    if (!existe) return c.send({ t: 'denied', action: 'ameaca', reason: 'Peça não encontrada nesta campanha.' });
    const camp = this.campaignFor(Math.min(...group));
    camp.ameacas ??= {};
    if (m.ficha === null) delete camp.ameacas[String(m.tokenId)];
    else {
      const f = cmb.lerFichaAmeaca(m.ficha);
      if (!f) return c.send({ t: 'denied', action: 'ameaca', reason: 'Ficha inválida.' });
      camp.ameacas[String(m.tokenId)] = f;
    }
    this.save();
    this.touch();
  }


  // ---------- mochila: um inventário só (docs/REGRAS.md, Mochila) ----------
  /** contas de cada ficha (a carga vai na sessão a cada envio), até a ficha mudar */
  private calcCache = new WeakMap<regras.Ficha, regras.Calculado | null>();

  private calcDe(f: FichaSalva): regras.Calculado | null {
    let c = this.calcCache.get(f.ficha);
    if (c === undefined) {
      try {
        c = regras.calcular(f.ficha);
      } catch (e) {
        console.error(`[fichas] ficha ${f.id} com erro nas regras`, e);
        c = null;
      }
      this.calcCache.set(f.ficha, c);
    }
    return c;
  }

  /** Ficha ligada à folha de sprite do personagem. */
  private fichaDoPersonagem(personagem: number | null | undefined): FichaSalva | undefined {
    return personagem ? (this.db.fichas ?? []).find((f) => f.personagem === personagem) : undefined;
  }

  /** Ficha da peça com esse nome na campanha da cena. */
  private fichaPeloNome(roomId: number, nome: string): FichaSalva | undefined {
    const key = nome.toLowerCase();
    for (const id of this.sceneGroup(roomId)) {
      const t = this.rooms.get(id)?.tokensLive().find((x) => x.name.toLowerCase() === key);
      if (t) return this.fichaDoPersonagem(t.look?.charId);
    }
    return undefined;
  }

  /** A cena onde está a peça do personagem (de preferência a do mestre). */
  private salaDoPersonagem(personagem: number | null | undefined, prefere?: RoomInstance | null): RoomInstance | undefined {
    if (!personagem) return undefined;
    if (prefere?.temPersonagem(personagem)) return prefere;
    return [...this.rooms.values()].find((r) => r.temPersonagem(personagem));
  }

  /** Mochila nova (objeto novo: as contas guardadas eram da antiga). */
  private trocarMochila(f: FichaSalva, inventario: regras.ItemFicha[]) {
    f.ficha = { ...f.ficha, inventario };
    f.atualizadaEm = new Date().toISOString();
  }

  /** O Armado das peças do personagem acompanha a mão. */
  private sincronizarArmado(f: FichaSalva): boolean {
    if (!f.personagem) return false;
    const armado = regras.armado(f.ficha.inventario);
    let mudou = false;
    for (const r of this.rooms.values()) mudou = r.definirArmado(f.personagem, armado) || mudou;
    return mudou;
  }

  /** A mochila mudou: o Armado acompanha e todos recebem. */
  private fichaMudou(f: FichaSalva) {
    this.sincronizarArmado(f);
    this.save();
    this.enviarFichas();
    this.touch();
  }

  /** Cabe na carga? Passar do dobro não dá (LR p. 53). null = cabe. */
  private naoCabe(f: FichaSalva, it: regras.ItemFicha): string | null {
    let c: regras.Calculado;
    try {
      c = regras.calcular({ ...f.ficha, inventario: [...f.ficha.inventario, it] });
    } catch {
      return null;
    }
    if (c.carga.usados <= c.carga.maximo) return null;
    return `${f.nome} não aguenta ${regras.nomeDoItem(it)}: seriam ${c.carga.usados} espaços, e o máximo é ${c.carga.maximo} (o dobro da carga, LR p. 53).`;
  }

  /** Registro na campanha onde a peça do personagem está. */
  private logDoPersonagem(f: FichaSalva, icon: LogIcon, text: string, prefere?: RoomInstance | null) {
    const sala = this.salaDoPersonagem(f.personagem, prefere) ?? prefere;
    if (sala) this.log(sala.data.id, icon, text);
  }

  /** Item do cenário entregue a uma peça: com ficha, vai para a mochila (achado na missão). */
  pegarItem(roomId: number, nome: string, l: Loot, quem: string, deOnde: string): boolean | string {
    const f = this.fichaPeloNome(roomId, nome);
    if (!f) return false;
    const it = lootParaItem(l);
    if (!Number.isInteger(it.uid) || (this.db.fichas ?? []).some((x) => x.ficha.inventario.some((y) => y.uid === it.uid))) it.uid = this.nextItemId();
    const erro = this.naoCabe(f, it);
    if (erro) return erro;
    this.trocarMochila(f, [...f.ficha.inventario, it]);
    this.log(roomId, 'give', quem ? `${quem} entregou ${l.name} para ${nome}.` : `${nome} pegou ${l.name} (${deOnde}).`);
    this.fichaMudou(f);
    return true;
  }

  /** Armado na peça com ficha: empunha a primeira arma da mochila (trocando o que estiver na mão) ou guarda as armas. */
  armarPelaPeca(personagem: number | null | undefined, armado: boolean, c: Client): boolean {
    const f = this.fichaDoPersonagem(personagem);
    if (!f) return false;
    let inv = f.ficha.inventario;
    if (armado) {
      if (regras.armado(inv)) return true;
      const arma = inv.find((it) => it.tipo === 'arma' && regras.maosDoItem(it) > 0 && Number.isInteger(it.uid));
      if (!arma) {
        c.send({ t: 'error', msg: `${f.nome} não tem arma na mochila.` });
        return true;
      }
      const r = regras.empunhar(inv, arma.uid!, true);
      if (!r.ok) {
        c.send({ t: 'error', msg: r.motivo });
        return true;
      }
      inv = r.inventario;
    } else
      for (const it of f.ficha.inventario)
        if (it.tipo === 'arma' && regras.lugarDoItem(it) === 'mao') {
          const r = regras.guardar(inv, it.uid!);
          if (r.ok) inv = r.inventario;
        }
    this.trocarMochila(f, inv);
    this.fichaMudou(f);
    return true;
  }

  /** O mestre mexe num item da mochila: mão, roupa, usar, entregar a outra ficha ou largar no chão. */
  private mochila(c: Client, m: Record<string, unknown>) {
    const err = (msg: string) => c.send({ t: 'error', msg });
    const f = (this.db.fichas ?? []).find((x) => x.id === m.fichaId);
    const acao = m.acao as AcaoMochila;
    const uid = typeof m.uid === 'number' ? m.uid : NaN;
    const inv = f?.ficha.inventario ?? [];
    const item = inv.find((x) => x.uid === uid);
    if (!f || !item || !ACOES_MOCHILA.includes(acao)) return err('Item não encontrado.');
    const nome = regras.nomeDoItem(item);
    let r: regras.ResultadoMochila;
    switch (acao) {
      case 'empunhar':
        r = regras.empunhar(inv, uid, m.trocar === true);
        break;
      case 'guardar':
        r = regras.guardar(inv, uid);
        break;
      case 'vestir':
        r = regras.vestir(inv, uid);
        break;
      case 'tirar':
        r = regras.tirar(inv, uid);
        break;
      case 'usar': {
        const u = regras.usar(inv, uid);
        r = u;
        if (u.ok) {
          const resto = u.inventario.find((x) => x.uid === uid);
          const sobra = u.gastou ? (resto ? (resto.qtd ?? 1) : 0) : null;
          this.logDoPersonagem(f, 'user', `${f.nome} usou ${nome}${sobra === null ? '' : sobra > 1 ? ` (sobram ${sobra})` : sobra === 1 ? ' (sobra 1)' : ' (era o último)'}.`, c.room);
        }
        break;
      }
      case 'entregar': {
        const para = (this.db.fichas ?? []).find((x) => x.id === m.para);
        if (!para || para === f) return err('Entregar para quem?');
        const s = regras.retirar(inv, uid);
        if (!s.ok) return err(s.motivo);
        const erro = this.naoCabe(para, s.item);
        if (erro) return err(erro);
        this.trocarMochila(f, s.inventario);
        this.trocarMochila(para, [...para.ficha.inventario, s.item]);
        this.logDoPersonagem(f, 'give', `${f.nome} entregou ${nome} para ${para.nome}.`, c.room);
        this.sincronizarArmado(para);
        this.fichaMudou(f);
        return;
      }
      case 'largar': {
        const sala = this.salaDoPersonagem(f.personagem, c.room);
        if (!sala || !f.personagem) return err(`${f.nome} não está no tabuleiro.`);
        const s = regras.retirar(inv, uid);
        if (!s.ok) return err(s.motivo);
        const e = sala.largarNoChao(f.personagem, itemParaLoot(s.item));
        if (e) return err(e);
        this.trocarMochila(f, s.inventario);
        this.log(sala.data.id, 'give', `${f.nome} largou ${nome} no chão.`);
        this.fichaMudou(f);
        return;
      }
    }
    if (!r.ok) return err(r.motivo);
    if (r.inventario !== inv) this.trocarMochila(f, r.inventario);
    this.fichaMudou(f);
  }

  /**
   * Um inventário só, na subida: cada item das fichas ganha número, o que
   * estava com uma peça de ficha (no cenário, com dono) vai para a mochila
   * dela, e o Armado das peças passa a vir da mão. true = mudou algo.
   */
  private migrarMochilas(): boolean {
    let mudou = false;
    for (const f of this.db.fichas ?? []) mudou = regras.numerarItens(f.ficha.inventario, () => this.nextItemId()) || mudou;
    for (const r of this.rooms.values())
      for (const { nome, loot } of r.tirarItensComDono((n) => !!this.fichaPeloNome(r.data.id, n))) {
        const f = this.fichaPeloNome(r.data.id, nome)!;
        f.ficha = { ...f.ficha, inventario: [...f.ficha.inventario, lootParaItem(loot)] };
        mudou = true;
      }
    for (const f of this.db.fichas ?? []) mudou = this.sincronizarArmado(f) || mudou;
    return mudou;
  }

  // ---------- fichas ----------
  private fichasTimer: NodeJS.Timeout | null = null;

  /** Manda a lista de fichas para quem é mestre (ou só para um cliente). */
  private enviarFichas(so?: Client, nova?: number) {
    const todas = this.db.fichas ?? [];
    const para = (c: Client) => {
      if (c.role === 'gm') return c.send({ t: 'fichas', fichas: todas, nova });
      if (!c.fichaId) return;
      const minha = todas.find((f) => f.id === c.fichaId);
      c.send({ t: 'fichas', fichas: minha ? [{ ...minha, chave: undefined }] : [] });
    };
    if (so) return para(so);
    for (const c of this.clients.values()) para(c);
  }

  private fichaSalvar(c: Client, m: Record<string, unknown>) {
    const f = sanitizarFicha(m.ficha);
    if (!f) return c.send({ t: 'error', msg: 'Ficha inválida.' });
    const lista = (this.db.fichas ??= []);
    const antiga = f.id ? lista.find((x) => x.id === f.id) : undefined;
    if (c.role !== 'gm') {
      // o jogador mexe só na própria ficha; NEX, patente, ligação e link são do mestre
      if (!c.fichaId || !antiga || antiga.id !== c.fichaId) return c.send({ t: 'error', msg: 'Você só pode mexer na sua ficha.' });
      f.ficha.nex = antiga.ficha.nex;
      f.ficha.pp = antiga.ficha.pp;
      f.ficha.regras = antiga.ficha.regras;
      f.personagem = antiga.personagem;
      f.campanha = antiga.campanha;
    }
    if (antiga) f.chave = antiga.chave;
    else delete f.chave;
    let nova: number | undefined;
    if (antiga) {
      f.criadaEm = antiga.criadaEm;
      lista[lista.indexOf(antiga)] = f;
    } else {
      f.id = this.db.nextFichaId = Math.max(this.db.nextFichaId ?? 1, ...lista.map((x) => x.id + 1));
      this.db.nextFichaId = f.id + 1;
      lista.push(f);
      nova = f.id;
    }
    // uma folha de sprite tem uma ficha só
    if (f.personagem) for (const o of lista) if (o !== f && o.personagem === f.personagem) delete o.personagem;
    // itens novos ganham número (um só entre todas as fichas)
    const usados = new Set(lista.filter((o) => o !== f).flatMap((o) => o.ficha.inventario.map((it) => it.uid)));
    for (const it of f.ficha.inventario) if (usados.has(it.uid)) delete it.uid;
    regras.numerarItens(f.ficha.inventario, () => this.nextItemId());
    if (f.personagem) {
      this.fichaParaPecas(f);
      this.sincronizarArmado(f);
    }
    this.save();
    this.enviarFichas(undefined, nova);
    this.touch();
  }

  private fichaApagar(c: Client, m: Record<string, unknown>) {
    const id = typeof m.id === 'number' ? m.id : 0;
    const lista = this.db.fichas ?? [];
    const i = lista.findIndex((x) => x.id === id);
    if (i < 0) return;
    lista.splice(i, 1);
    this.save();
    this.enviarFichas();
    void c;
  }

  private fichaLink(m: Record<string, unknown>) {
    const f = (this.db.fichas ?? []).find((x) => x.id === m.id);
    if (!f) return;
    f.chave = crypto.randomBytes(9).toString('base64url');
    this.save();
    this.enviarFichas();
  }

  /** Link de jogador válido? Devolve a ficha. */
  private fichaPelaChave(chave: string): FichaSalva | undefined {
    const b = Buffer.from(chave);
    return (this.db.fichas ?? []).find((f) => {
      if (!f.chave) return false;
      const a = Buffer.from(f.chave);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
  }

  /** PV/PE/SAN da ficha (máximos pelo motor de regras) para as peças do personagem ligado. `soSemVitais`: só as peças que ainda não têm. */
  private fichaParaPecas(f: FichaSalva, soSemVitais = false) {
    const calc = regras.calcular(f.ficha);
    const a = f.atual ?? { pv: calc.pv, pe: calc.pe, san: calc.san };
    const v: Vitals = { pv: Math.min(a.pv, calc.pv), pvMax: calc.pv, pe: Math.min(a.pe, calc.pe), peMax: calc.pe, san: Math.min(a.san, calc.san), sanMax: calc.san };
    let mudou = false;
    for (const r of this.rooms.values()) mudou = r.definirVitais(f.personagem!, v, soSemVitais) || mudou;
    if (mudou) this.touch();
  }

  /** Peça nova (ou com outra folha): sem PV/PE/SAN, pega os da ficha ligada ao personagem. */
  vitaisDaFicha(personagem: number | null | undefined) {
    if (!personagem) return;
    const f = (this.db.fichas ?? []).find((x) => x.personagem === personagem);
    if (f) this.fichaParaPecas(f, true);
  }

  /** PV/PE/SAN de uma peça mudou no tabuleiro: a ficha ligada ao personagem acompanha. */
  vitaisDaPeca(personagem: number | null | undefined, v: Vitals) {
    if (!personagem) return;
    const f = (this.db.fichas ?? []).find((x) => x.personagem === personagem);
    if (!f) return;
    f.atual = { ...f.atual, pv: v.pv, pe: v.pe, san: v.san };
    this.save();
    if (!this.timers) return this.enviarFichas();
    if (this.fichasTimer) return;
    this.fichasTimer = setTimeout(() => {
      this.fichasTimer = null;
      this.enviarFichas();
    }, 300);
  }

  vitalChanged(roomId: number, tokenId: number, name: string, key: VitalKey, from: number, to: number, max: number) {
    const k = `${tokenId}:${key}`;
    const cur = this.vitalLog.get(k);
    const entry = cur ?? { roomId, name, key, from, to, max, timer: null };
    entry.to = to;
    entry.max = max;
    entry.name = name;
    if (entry.timer) clearTimeout(entry.timer);
    this.vitalLog.set(k, entry);
    const flush = () => {
      this.vitalLog.delete(k);
      if (entry.to === entry.from) return;
      const d = entry.to - entry.from;
      const label = VITAL_LABEL[entry.key];
      const what = d < 0 ? `perdeu ${-d} ${label}` : `recuperou ${d} ${label}`;
      this.log(entry.roomId, 'user', `${entry.name} ${what} (${entry.to}/${entry.max}).`);
    };
    if (this.timers) entry.timer = setTimeout(flush, 2500);
    else flush();
  }

  touch() {
    if (!this.timers || this.touchTimer) return;
    this.touchTimer = setTimeout(() => {
      this.touchTimer = null;
      this.pushScenes();
    }, 60);
  }

  private campaignState(group: number[]): CampaignState {
    const key = Math.min(...group);
    const camp = this.campaignFor(key);
    const rooms = group.map((id) => this.rooms.get(id)!).sort((a, b) => a.data.id - b.data.id);
    const scenes: SceneInfo[] = rooms.map((r) => ({
      id: r.data.id,
      name: r.data.name,
      floor: r.data.floor,
      heightmap: r.data.heightmap,
      door: r.data.door,
      portals: r.portals(),
      users: r.userPositions(),
    }));
    this.ensureLayout(camp, scenes);
    // grupo = as peças de todas as cenas da campanha
    const load = new Map<string, number>();
    for (const r of rooms) for (const l of r.heldLoot()) load.set(l.holder.toLowerCase(), (load.get(l.holder.toLowerCase()) ?? 0) + l.espacos);
    const party = new Map<string, PartyMember>();
    for (const r of rooms)
      for (const t of r.tokenList()) {
        // com ficha, a carga é a da mochila (espaços, LR p. 53)
        const fc = this.fichaDoPersonagem(t.look?.charId);
        const carga = fc ? this.calcDe(fc)?.carga : undefined;
        party.set(`t${t.id}`, {
          name: t.name,
          id: t.id,
          look: t.look,
          load: carga ? carga.usados : Math.round((load.get(t.name.toLowerCase()) ?? 0) * 10) / 10,
          capacity: carga ? carga.espacos : (t.capacity ?? DEFAULT_CAPACITY),
          roomId: r.data.id,
          color: t.color ?? playerColorFor(t.name),
          armed: t.armed,
          hurt: t.hurt,
          vitals: t.vitals,
        });
      }
    return {
      key,
      title: camp.title,
      subtitle: camp.subtitle,
      operacao: camp.operacao,
      objectives: camp.objectives,
      layout: camp.layout,
      log: camp.log.slice(-30),
      party: [...party.values()].sort((a, b) => (a.id ?? 0) > (b.id ?? 0) ? -1 : 1),
      scenes,
      notas: camp.notas ?? [],
    };
  }

  /** Planta: posiciona cenas novas lado a lado. */
  private ensureLayout(camp: CampaignData, scenes: { id: number; heightmap: string }[]) {
    let changed = false;
    let right = 0;
    for (const s of scenes) {
      const p = camp.layout[s.id];
      if (p) right = Math.max(right, p.x + parseHeightmap(s.heightmap).width + 1);
    }
    for (const s of scenes)
      if (!camp.layout[s.id]) {
        camp.layout[s.id] = { x: right, y: 0 };
        right += parseHeightmap(s.heightmap).width + 1;
        changed = true;
      }
    if (changed) this.save();
  }

  /** Estado da sessão para um papel (o "me" de cada pessoa entra no envio). */
  private sessionState(group: number[], role: Role): Omit<Session, 'me'> {
    const key = Math.min(...group);
    const camp = this.campaignFor(key);
    const rooms = group.map((id) => this.rooms.get(id)!).sort((a, b) => a.data.id - b.data.id);
    const scenes = rooms.map((r) => r.sceneInfo());
    this.ensureLayout(camp, scenes);
    const objects: SceneObject[] = [];
    const items: Item[] = [];
    for (const r of rooms) {
      const o = r.sessionObjects(role);
      objects.push(...o.objects);
      items.push(...o.items);
    }
    const load = new Map<string, number>();
    for (const r of rooms) for (const l of r.heldLoot()) load.set(l.holder.toLowerCase(), (load.get(l.holder.toLowerCase()) ?? 0) + l.espacos);
    const characters: Character[] = [];
    const tokens: Token[] = [];
    for (const r of rooms)
      for (const t of r.tokensLive()) {
        tokens.push(t.token);
        const fc = this.fichaDoPersonagem(t.look?.charId);
        const carga = fc ? this.calcDe(fc)?.carga : undefined;
        characters.push({
          id: t.token.id,
          name: t.name,
          color: t.color ?? playerColorFor(t.name),
          capacity: carga ? carga.espacos : (t.capacity ?? DEFAULT_CAPACITY),
          load: carga ? carga.usados : round1(load.get(t.name.toLowerCase()) ?? 0),
          look: t.look,
          sceneId: r.data.id,
          armed: !!t.armed,
          hurt: !!t.hurt,
          vitals: t.vitals,
        });
      }
    characters.sort((a, b) => a.id - b.id);
    const byName = new Map(characters.map((ch) => [ch.name.toLowerCase(), ch.id]));
    for (const it of items) it.holderId = it.holderName ? (byName.get(it.holderName.toLowerCase()) ?? null) : null;
    const cur = camp.currentSceneId;
    const home = this.db.home;
    const currentSceneId = cur !== undefined && group.includes(cur) ? cur : home !== undefined && group.includes(home) ? home : key;
    return {
      id: key,
      title: camp.title,
      subtitle: camp.subtitle,
      currentSceneId,
      scenes,
      objects,
      characters,
      tokens,
      items,
      objectives: camp.objectives,
      events: camp.log.slice(-30),
      layout: camp.layout,
    };
  }

  /** Reenvia campanha e sessão para quem mudou (público para os testes). */
  pushNow() {
    this.pushScenes();
  }

  private pushScenes() {
    const cache = new Map<number, string>();
    const groups = new Map<number, number[]>();
    const snaps = new Map<string, Omit<Session, 'me'>>();
    const combates = new Map<string, string>();
    for (const c of this.clients.values()) {
      if (!c.name || !c.room) continue;
      const rid = c.room.data.id;
      let group = groups.get(rid);
      if (!group) {
        group = this.sceneGroup(rid);
        for (const id of group) groups.set(id, group);
      }
      let json = cache.get(rid);
      if (json === undefined) {
        json = JSON.stringify(this.campaignState(group));
        for (const id of group) cache.set(id, json);
      }
      if (json !== c.lastScenes) {
        c.lastScenes = json;
        c.send({ t: 'campaign', state: JSON.parse(json) as CampaignState });
      }
      // sessão (contrato novo): um estado por papel, com o "me" de cada um
      const role: Role = c.role === 'gm' ? 'gm' : 'player';
      const sk = `${Math.min(...group)}:${role}`;
      let snap = snaps.get(sk);
      if (!snap) {
        snap = this.sessionState(group, role);
        snaps.set(sk, snap);
      }
      const session: Session = { ...snap, me: { name: c.name, role } };
      const sj = JSON.stringify(session);
      if (sj !== c.lastSession) {
        c.lastSession = sj;
        c.send({ t: 'session', session });
      }
      // combate: o mestre recebe tudo; a mesa, só a ordem, a rodada e a vez
      let cj = combates.get(sk);
      if (cj === undefined) {
        const key = Math.min(...group);
        const camp = this.campaignFor(key);
        const cb = camp.combate ?? null;
        const podeDesfazer = role === 'gm' && (this.desfazeres.get(key)?.length ?? 0) > 0;
        // as fichas das ameaças são só do mestre (DC-4)
        cj = JSON.stringify({ t: 'combate', combate: role === 'gm' ? cb : cmb.visaoMesa(cb), ...(role === 'gm' ? { podeDesfazer, ameacas: camp.ameacas ?? {} } : {}) });
        combates.set(sk, cj);
      }
      if (cj !== c.lastCombate) {
        c.lastCombate = cj;
        c.send(JSON.parse(cj) as ServerMsg);
      }
    }
  }

  /** Objetivos, título, planta e carga: só o mestre da cena atual. */
  private campaignEdit(c: Client, m: Record<string, unknown>) {
    const room = c.room;
    if (!room) return;
    if (!room.isOwner(c)) return c.send({ t: 'error', msg: 'Só o mestre edita a campanha.' });
    const camp = this.campaignFor(this.groupKey(room.data.id));
    const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max) : '');
    switch (m.t) {
      case 'objAdd':
        if (this.objectiveAdd(camp, m.text)) return;
        break;
      case 'objToggle': {
        const o = camp.objectives.find((x) => x.id === m.id);
        if (!o) return;
        this.objectiveSet(camp, o.id, !o.done, room.data.id);
        break;
      }
      case 'objRemove':
        this.objectiveRemove(camp, m.id);
        break;
      case 'campaignSet':
        camp.title = txt(m.title, 40) || camp.title;
        camp.subtitle = txt(m.subtitle, 40);
        if (typeof m.operacao === 'string') camp.operacao = txt(m.operacao, 40) || undefined;
        break;
      case 'layoutSet': {
        if (typeof m.roomId !== 'number' || typeof m.x !== 'number' || typeof m.y !== 'number') return;
        camp.layout[m.roomId] = { ...camp.layout[m.roomId], x: Math.max(-40, Math.min(120, Math.round(m.x))), y: Math.max(-40, Math.min(120, Math.round(m.y))) };
        break;
      }
      case 'planNota': {
        camp.notas ??= [];
        const pos = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-60, Math.min(200, Math.round(v * 10) / 10)) : null);
        if (typeof m.id === 'number') {
          const n = camp.notas.find((x) => x.id === m.id);
          if (!n) return;
          const texto = typeof m.texto === 'string' ? txt(m.texto, 40) : null;
          if (m.apagar === true || texto === '') {
            camp.notas = camp.notas.filter((x) => x !== n);
            break;
          }
          if (texto) n.texto = texto;
          n.x = pos(m.x) ?? n.x;
          n.y = pos(m.y) ?? n.y;
        } else {
          const texto = txt(m.texto, 40);
          if (!texto || camp.notas.length >= 60) return;
          camp.notas.push({ id: this.nextItemId(), andar: txt(m.andar, 20), texto, x: pos(m.x) ?? 0, y: pos(m.y) ?? 0 });
        }
        break;
      }
      case 'capacitySet': {
        const k = txt(m.name, 16).toLowerCase();
        const ud = this.db.users[k];
        if (!ud || typeof m.capacity !== 'number') return;
        ud.capacity = Math.max(1, Math.min(99, Math.round(m.capacity)));
        break;
      }
    }
    this.save();
    this.touch();
  }

  /** Novo objetivo. Devolve o motivo quando não dá. */
  private objectiveAdd(camp: CampaignData, raw: unknown): string | null {
    const text = typeof raw === 'string' ? raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) : '';
    if (!text) return 'Escreva o objetivo.';
    if (camp.objectives.length >= 20) return 'Máximo de 20 objetivos.';
    camp.objectives.push({ id: this.nextItemId(), text, done: false });
    return null;
  }

  private objectiveSet(camp: CampaignData, id: unknown, done: boolean, roomId: number): string | null {
    const o = camp.objectives.find((x) => x.id === id);
    if (!o) return 'Objetivo não encontrado.';
    if (o.done === done) return null;
    o.done = done;
    if (done) this.log(roomId, 'obj', `Objetivo concluído: ${o.text}.`);
    return null;
  }

  private objectiveRemove(camp: CampaignData, id: unknown): string | null {
    const n = camp.objectives.length;
    camp.objectives = camp.objectives.filter((x) => x.id !== id);
    return camp.objectives.length === n ? 'Objetivo não encontrado.' : null;
  }

  // ---------- cena atual da sessão ----------
  /** A cena que o mestre deixou aberta na sessão desta cena (se houver). */
  private currentSceneOf(roomId: number): RoomInstance | null {
    const group = this.sceneGroup(roomId);
    const id = this.campaignFor(Math.min(...group)).currentSceneId;
    return id !== undefined && group.includes(id) ? (this.rooms.get(id) ?? null) : null;
  }

  /**
   * Entrar numa cena. O mestre vai para onde quiser e leva os jogadores junto;
   * o jogador sempre vai para a cena que o mestre deixou aberta.
   */
  private enter(c: Client, room: RoomInstance) {
    if (c.role !== 'gm') {
      const live = this.db.liveScene !== undefined ? this.rooms.get(this.db.liveScene) : undefined;
      const target = live ?? this.currentSceneOf(room.data.id) ?? room;
      if (c.room === target) return c.send({ t: 'notice', msg: 'Quem escolhe a cena é o mestre.' });
      c.room?.leave(c);
      target.join(c);
      return;
    }
    if (c.room !== room) {
      c.room?.leave(c);
      room.join(c);
    }
    this.setCurrentScene(room);
  }

  private setCurrentScene(room: RoomInstance) {
    const group = this.sceneGroup(room.data.id);
    const camp = this.campaignFor(Math.min(...group));
    const changed = camp.currentSceneId !== room.data.id;
    camp.currentSceneId = room.data.id;
    this.db.liveScene = room.data.id;
    // a mesa vai junto, mesmo que estivesse em outra campanha
    for (const o of this.clients.values()) {
      if (o.role === 'gm' || !o.name || !o.room || o.room === room) continue;
      o.room.leave(o);
      room.join(o);
    }
    if (changed) this.log(room.data.id, 'scene', `Cena atual: ${sceneShortName(room.data.name)}.`);
    this.save();
    this.touch();
  }

  // ---------- ações do contrato (SessionAction) ----------
  private roomOfToken(tokenId: number) {
    for (const r of this.rooms.values()) if (r.hasToken(tokenId)) return r;
    return null;
  }

  private roomOfLoot(lootId: number) {
    for (const r of this.rooms.values()) if (r.findLoot(lootId)) return r;
    return null;
  }

  private act(c: Client, raw: unknown) {
    const a = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const type = typeof a.type === 'string' ? a.type : '';
    const deny = (reason: string) => c.send({ t: 'denied', action: type, reason });
    if (!SESSION_ACTIONS.includes(type as SessionActionType)) return deny('Ação desconhecida.');
    if (c.role !== 'gm') return deny('Só o mestre pode fazer isso.');
    let err: string | null = null;
    switch (type as SessionActionType) {
      case 'scene.change': {
        const room = isInt(a.sceneId) ? this.rooms.get(a.sceneId) : undefined;
        if (!room) return deny('Cena não encontrada.');
        this.enter(c, room);
        return;
      }
      case 'token.move': {
        const room = isInt(a.tokenId) ? this.roomOfToken(a.tokenId) : null;
        if (!room) return deny('Peça não encontrada.');
        const to = a.to && typeof a.to === 'object' ? (a.to as Record<string, unknown>) : {};
        const mode = a.mode === 'place' ? 'place' : 'walk';
        const tile = to.tile && typeof to.tile === 'object' ? (to.tile as Record<string, unknown>) : null;
        if (tile) {
          if (!isInt(tile.x) || !isInt(tile.y)) return deny('Casa inválida.');
          err = room.moveTokenTo(a.tokenId as number, { x: tile.x, y: tile.y } as Tile, true, mode);
        } else {
          if (!isNum(to.x) || !isNum(to.y)) return deny('Ponto inválido: use x e y entre 0 e 1.');
          const p: NormPoint = { x: Math.max(0, Math.min(1, to.x)), y: Math.max(0, Math.min(1, to.y)) };
          err = room.moveTokenTo(a.tokenId as number, p, false, mode);
        }
        break;
      }
      case 'token.face': {
        const room = isInt(a.tokenId) ? this.roomOfToken(a.tokenId) : null;
        if (!room) return deny('Peça não encontrada.');
        err = room.faceToken(a.tokenId as number, isInt(a.dir) ? a.dir : -1);
        break;
      }
      case 'item.give': {
        const room = isInt(a.itemId) ? this.roomOfLoot(a.itemId) : null;
        if (!room) return deny('Item não encontrado.');
        let toName: string | null = null;
        if (a.to !== null) {
          const holder = isInt(a.to) ? this.roomOfToken(a.to)?.tokensLive().find((t) => t.token.id === a.to) : undefined;
          if (!holder) return deny('Personagem não encontrado.');
          toName = holder.name;
        }
        err = room.giveLoot(c, a.itemId as number, toName);
        break;
      }
      case 'objective.add':
      case 'objective.set':
      case 'objective.remove': {
        if (!c.room) return deny('Entre numa cena primeiro.');
        const camp = this.campaignFor(this.groupKey(c.room.data.id));
        if (type === 'objective.add') err = this.objectiveAdd(camp, a.text);
        else if (type === 'objective.set') err = typeof a.done === 'boolean' ? this.objectiveSet(camp, a.id, a.done, c.room.data.id) : 'Diga se está feito (done).';
        else err = this.objectiveRemove(camp, a.id);
        if (!err) {
          this.save();
          this.touch();
        }
        break;
      }
    }
    if (err) deny(err);
  }

  /** Mestre muda a cena de um jogador (ou de todos no quarto dele). */
  private sendTo(c: Client, m: Record<string, unknown>) {
    const from = c.room;
    const target = typeof m.roomId === 'number' ? this.rooms.get(m.roomId) : undefined;
    if (!from || !target) return;
    if (!from.isOwner(c)) return c.send({ t: 'error', msg: 'Só o mestre muda a cena.' });
    const all = m.userId === 'all';
    const movers = all ? from.clients() : from.clients().filter((o) => o.id === m.userId);
    if (!all && !movers.length) {
      // jogador em outra cena do grupo: o mestre precisa ser dono daquela cena também
      for (const r of this.rooms.values())
        for (const o of r.clients()) if (o.id === m.userId && r.isOwner(c)) movers.push(o);
    }
    for (const o of movers) {
      if (o.room === target) continue;
      const prev = o.room?.data.id;
      o.room?.leave(o);
      target.join(o, prev);
      o.send({ t: 'notice', msg: `O mestre levou você para: ${target.data.name}` });
    }
    const moved = movers.filter((o) => o.room === target).map((o) => o.name);
    if (moved.length) this.log(target.data.id, 'scene', `${moved.join(', ')} ${moved.length > 1 ? 'foram levados' : 'foi levado'} para ${target.data.name}.`);
  }

  // ---------- HotelApi ----------
  save() {
    if (this.persist) scheduleSave(this.db);
  }
  flush() {
    if (this.persist) saveDbNow(this.db);
  }
  nextItemId() {
    return this.db.nextItemId++;
  }
  private userData(c: Client): UserData {
    let u = this.db.users[c.key];
    if (!u) {
      u = { name: c.name ?? c.key, look: c.look, inventory: [] };
      this.db.users[c.key] = u;
    }
    return u;
  }
  inventory(c: Client): InvItem[] {
    return this.userData(c).inventory;
  }
  sendInventory(c: Client) {
    c.send({ t: 'inventory', items: this.inventory(c) });
    this.save();
  }
  /** Contagem de usuários mudou: avisa o navegador (com debounce). */
  roomChanged() {
    if (!this.timers || this.listTimer) return;
    this.listTimer = setTimeout(() => {
      this.listTimer = null;
      const msg: ServerMsg = { t: 'roomList', rooms: this.roomList() };
      for (const c of this.clients.values()) if (c.name) c.send(msg);
    }, 300);
  }

  roomExists(roomId: number) {
    return this.rooms.has(roomId);
  }

  tokenNameTaken(roomId: number, name: string, exceptTokenId?: number) {
    const key = name.toLowerCase();
    return this.sceneGroup(roomId).some((id) => this.rooms.get(id)?.tokenNames(exceptTokenId).includes(key));
  }

  renameHolder(roomId: number, oldName: string, newName: string) {
    for (const id of this.sceneGroup(roomId)) this.rooms.get(id)?.renameHolder(oldName, newName);
    this.touch();
  }

  moveToken(from: RoomInstance, tokenId: number, toRoomId: number) {
    const to = this.rooms.get(toRoomId);
    if (!to || to === from) return;
    const t = from.takeToken(tokenId);
    if (!t) return;
    to.putToken(t, from.data.id);
  }

  teleport(c: Client, roomId: number, fromRoomId: number) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.log(roomId, 'scene', `${c.name} foi para ${room.data.name}.`);
    c.room?.leave(c);
    room.join(c, fromRoomId);
  }

  clientByToken(token: string) {
    return this.byToken.get(token);
  }

  // ---------- conexões ----------
  /**
   * Nova conexão. `send` entrega uma mensagem; `close` encerra (sessão aberta
   * em outro lugar); `local` = vem do próprio computador do servidor (é o mestre).
   */
  attach(send: (msg: ServerMsg) => void, close?: (code: number) => void, local = false): Client {
    const c: Client = {
      id: this.nextClientId++,
      name: null,
      key: '',
      look: sanitizeLook(null),
      token: crypto.randomBytes(18).toString('base64url'),
      room: null,
      lastChat: 0,
      local,
      send,
      kick: () => {
        c.room?.leave(c);
        c.name = null;
        c.key = '';
        c.role = undefined;
        close?.(4000);
      },
    };
    this.clients.set(c.id, c);
    this.byToken.set(c.token, c);
    c.send({ t: 'hello', characters: this.db.characters });
    return c;
  }

  /** Mensagem recebida de uma conexão. */
  receive(c: Client, msg: unknown) {
    if (!msg || typeof msg !== 'object' || typeof (msg as { t?: unknown }).t !== 'string') return;
    try {
      this.handle(c, msg as Record<string, unknown>);
    } catch (e) {
      console.error('[hotel] erro tratando mensagem', e);
    }
  }

  detach(c: Client) {
    c.room?.leave(c);
    this.clients.delete(c.id);
    this.byToken.delete(c.token);
  }

  connect(ws: WebSocket, local = false) {
    const c = this.attach(
      (msg) => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
      },
      (code) => ws.close(code, 'replaced'),
      local,
    );
    ws.on('message', (data) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      this.receive(c, msg);
    });
    // Sem este listener, um frame inválido/grande demais derrubaria o processo.
    ws.on('error', (e) => console.warn(`[ws] cliente ${c.id}: ${e.message}`));
    ws.on('close', () => this.detach(c));
  }

  private roomList(): RoomSummary[] {
    return [...this.rooms.values()]
      .map((r) => ({
        id: r.data.id,
        name: r.data.name,
        description: r.data.description,
        owner: r.data.owner,
        users: r.userCount,
      }))
      .sort((a, b) => b.users - a.users || a.id - b.id);
  }

  private broadcastCharacters() {
    const msg: ServerMsg = { t: 'characters', list: this.db.characters };
    for (const c of this.clients.values()) c.send(msg);
  }

  private handle(c: Client, m: Record<string, unknown>) {
    if (!c.name) {
      if (m.t === 'login') this.login(c, m);
      return;
    }
    if (GM_ONLY.has(m.t as string) && c.role !== 'gm') return c.send({ t: 'error', msg: 'Só o mestre pode fazer isso.' });
    switch (m.t) {
      case 'act':
        this.act(c, m.a);
        return;
      case 'rooms':
        c.send({ t: 'roomList', rooms: this.roomList() });
        return;
      case 'createRoom':
        this.createRoom(c, m);
        return;
      case 'join': {
        const room = typeof m.roomId === 'number' ? this.rooms.get(m.roomId) : undefined;
        if (!room) return c.send({ t: 'error', msg: 'Quarto não encontrado.' });
        this.enter(c, room);
        return;
      }
      case 'peek': {
        // só cenas da mesma campanha da cena atual
        const cur = c.room?.data.id;
        if (typeof m.roomId !== 'number' || cur === undefined || !this.sceneGroup(cur).includes(m.roomId)) return;
        this.rooms.get(m.roomId)?.peek(c);
        return;
      }
      case 'look': {
        c.look = sanitizeLook(m.look);
        if (c.look.charId && !this.db.characters.some((ch) => ch.id === c.look.charId)) c.look.charId = null;
        this.userData(c).look = c.look;
        this.save();
        c.room?.updateLook(c);
        return;
      }
      case 'charUpdate':
        this.charUpdate(c, m);
        return;
      case 'charDelete':
        this.charDelete(c, m);
        return;
      case 'sendTo':
        this.sendTo(c, m);
        return;
      case 'objAdd':
      case 'objToggle':
      case 'objRemove':
      case 'campaignSet':
      case 'layoutSet':
      case 'planNota':
      case 'capacitySet':
        this.campaignEdit(c, m);
        return;
      case 'fichaSalvar':
        this.fichaSalvar(c, m);
        return;
      case 'fichaApagar':
        this.fichaApagar(c, m);
        return;
      case 'mochila':
        this.mochila(c, m);
        return;
      case 'fichaLink':
        this.fichaLink(m);
        return;
      case 'combate':
        this.combateAcao(c, m);
        return;
      case 'ameaca':
        this.ameacaSalvar(c, m);
        return;
    }
    c.room?.handle(c, m);
  }

  private login(c: Client, m: Record<string, unknown>) {
    const name = typeof m.name === 'string' ? m.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > MAX_NAME || !NAME_RE.test(name))
      return c.send({ t: 'error', msg: `Nome inválido (2 a ${MAX_NAME} letras, números, espaço, _ - .).` });
    const key = name.toLowerCase();
    if (key === SYSTEM_OWNER.toLowerCase()) return c.send({ t: 'error', msg: 'Esse nome é reservado.' });
    // a tela da mesa é sempre jogador; mestre = o próprio computador do servidor ou quem tem a chave
    const hasKey = typeof m.gmKey === 'string' && !!m.gmKey && this.checkGmKey(m.gmKey);
    const daFicha = typeof m.fichaKey === 'string' && m.fichaKey ? this.fichaPelaChave(m.fichaKey) : undefined;
    if (typeof m.fichaKey === 'string' && m.fichaKey && !daFicha) return c.send({ t: 'error', msg: 'Link de ficha inválido. Peça um novo ao mestre.' });
    const role: Role = m.mesa === true || daFicha ? 'player' : c.local || hasKey ? 'gm' : 'player';
    c.fichaId = daFicha?.id;
    // mesma pessoa abrindo em outra aba: a conexão nova assume (jogador não derruba o mestre)
    for (const o of this.clients.values())
      if (o !== c && o.key === key && o.role === 'gm' && role !== 'gm') return c.send({ t: 'error', msg: 'Esse nome já está em uso na sessão.' });
    for (const o of this.clients.values()) if (o !== c && o.key === key) o.kick?.();
    c.name = name;
    c.key = key;
    c.role = role;
    c.look = sanitizeLook(m.look);
    if (c.look.charId && !this.db.characters.some((ch) => ch.id === c.look.charId)) c.look.charId = null;
    const isNew = !this.db.users[key];
    const ud = this.userData(c);
    ud.name = name;
    ud.look = c.look;
    if (isNew) for (const defId of STARTER) ud.inventory.push({ id: this.nextItemId(), defId });
    this.save();
    c.send({ t: 'welcome', id: c.id, name, look: c.look, token: c.token, inventory: ud.inventory, home: this.db.home, role });
    c.send({ t: 'roomList', rooms: this.roomList() });
    if (role === 'gm' || c.fichaId) this.enviarFichas(c);
    if (this.persist) console.log(`[hotel] ${name} entrou (${role === 'gm' ? 'mestre' : 'jogador'})`);
  }

  private createRoom(c: Client, m: Record<string, unknown>) {
    const name = typeof m.name === 'string' ? m.name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 30) : '';
    if (name.length < 3) return c.send({ t: 'error', msg: 'O nome do quarto precisa de pelo menos 3 letras.' });
    const layout = typeof m.model === 'string' ? getLayout(m.model) : undefined;
    if (!layout) return c.send({ t: 'error', msg: 'Modelo inválido.' });
    const mine = this.db.rooms.filter((r) => r.owner.toLowerCase() === c.key).length;
    if (mine >= 15) return c.send({ t: 'error', msg: 'Limite de 15 quartos por pessoa.' });
    const data: RoomData = {
      id: this.db.nextRoomId++,
      name,
      description: '',
      owner: c.name!,
      heightmap: layout.heightmap,
      door: { ...layout.door },
      items: [],
      wallItems: [],
      publicBuild: false,
      darkness: 0.55,
    };
    this.db.rooms.push(data);
    this.rooms.set(data.id, new RoomInstance(data, this));
    this.save();
    c.send({ t: 'roomCreated', id: data.id });
    this.roomChanged();
  }

  // ---------- personagens ----------
  addCharacter(owner: Client, sheetUrl: string, name: string): CharacterDef {
    const def: CharacterDef = {
      id: this.db.nextCharId++,
      name: name.slice(0, 24) || 'Personagem',
      owner: owner.name ?? '?',
      sheet: sheetUrl,
      cols: 4,
      rows: 4,
      dirs: ['sw', 'se', 'nw', 'ne'],
      anims: ['idle', 'idle', 'idle', 'idle'],
      height: 104,
      fps: 4,
      sequence: [0, 1, 0, 1, 3, 2, 3, 1],
      removeBg: true,
    };
    this.db.characters.push(def);
    this.save();
    this.broadcastCharacters();
    return def;
  }

  /** Quem controla a sessão (o mestre) ajusta qualquer personagem, inclusive os do repositório. */
  private canEditChar(c: Client, _ch: CharacterDef) {
    return c.role === 'gm';
  }

  private charUpdate(c: Client, m: Record<string, unknown>) {
    const ch = this.db.characters.find((x) => x.id === m.id);
    if (!ch) return;
    if (!this.canEditChar(c, ch)) return c.send({ t: 'error', msg: 'Só o mestre edita personagens.' });
    Object.assign(ch, sanitizeCharPatch(m.patch));
    if (ch.dirs.length !== ch.rows) ch.dirs = Array.from({ length: ch.rows }, (_, i) => ch.dirs[i] ?? DIR_KEYS[i % DIR_KEYS.length]);
    const anims = ch.anims ?? [];
    ch.anims = Array.from({ length: ch.rows }, (_, i) => anims[i] ?? 'idle');
    ch.sequence = ch.sequence.filter((n) => n < ch.cols);
    if (!ch.sequence.length) ch.sequence = [0];
    this.save();
    this.broadcastCharacters();
  }

  private charDelete(c: Client, m: Record<string, unknown>) {
    const i = this.db.characters.findIndex((x) => x.id === m.id);
    if (i < 0) return;
    if (!this.canEditChar(c, this.db.characters[i])) return c.send({ t: 'error', msg: 'Só o mestre apaga personagens.' });
    const [removed] = this.db.characters.splice(i, 1);
    this.save();
    this.broadcastCharacters();
    for (const o of this.clients.values())
      if (o.look.charId === removed.id) {
        o.look = { ...o.look, charId: null };
        o.room?.updateLook(o);
      }
  }
}
