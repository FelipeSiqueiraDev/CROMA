import crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import {
  getLayout,
  MAX_NAME,
  sanitizeCharPatch,
  sanitizeLook,
  type CharacterDef,
  type InvItem,
  DEFAULT_CAPACITY,
  parseHeightmap,
  playerColorFor,
  type CampaignState,
  type LogIcon,
  type PartyMember,
  type RoomSummary,
  type SceneInfo,
  type ServerMsg,
} from '@croma/shared';
import { loadDb, saveDbNow, scheduleSave, type CampaignData, type Database, type RoomData, type UserData } from './db';
import { RoomInstance, type Client, type HotelApi } from './roomInstance';
import { seedDb, SYSTEM_OWNER, upgradeDb } from './seed';

const NAME_RE = /^[\p{L}\p{N}_\-. ]+$/u;
const STARTER: string[] = ['chair_wood', 'table_small', 'candles', 'crate_wood', 'plant'];

export class Hotel implements HotelApi {
  db: Database;
  rooms = new Map<number, RoomInstance>();
  private clients = new Map<number, Client>();
  private byToken = new Map<string, Client>();
  private nextClientId = 1;
  private listTimer: NodeJS.Timeout | null = null;
  private touchTimer: NodeJS.Timeout | null = null;

  constructor() {
    const loaded = loadDb();
    this.db = loaded ?? seedDb();
    if (upgradeDb(this.db) || !loaded) saveDbNow(this.db);
    for (const r of this.db.rooms) this.rooms.set(r.id, new RoomInstance(r, this));
    console.log(`[hotel] ${this.rooms.size} quarto(s), ${this.db.characters.length} personagem(ns)`);
    setInterval(() => this.pushScenes(), 1500);
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

  touch() {
    if (this.touchTimer) return;
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
      heightmap: r.data.heightmap,
      door: r.data.door,
      portals: r.portals(),
      users: r.userPositions(),
    }));
    // planta: posiciona cenas novas lado a lado
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
    // grupo = as peças de todas as cenas da campanha
    const load = new Map<string, number>();
    for (const r of rooms) for (const l of r.heldLoot()) load.set(l.holder.toLowerCase(), (load.get(l.holder.toLowerCase()) ?? 0) + l.weight);
    const party = new Map<string, PartyMember>();
    for (const r of rooms)
      for (const t of r.tokenList())
        party.set(`t${t.id}`, {
          name: t.name,
          id: t.id,
          look: t.look,
          load: Math.round((load.get(t.name.toLowerCase()) ?? 0) * 10) / 10,
          capacity: t.capacity ?? DEFAULT_CAPACITY,
          roomId: r.data.id,
          color: t.color ?? playerColorFor(t.name),
        });
    return {
      key,
      title: camp.title,
      subtitle: camp.subtitle,
      objectives: camp.objectives,
      layout: camp.layout,
      log: camp.log.slice(-30),
      party: [...party.values()].sort((a, b) => (a.id ?? 0) > (b.id ?? 0) ? -1 : 1),
      scenes,
    };
  }

  private pushScenes() {
    const cache = new Map<number, string>();
    for (const c of this.clients.values()) {
      if (!c.name || !c.room) continue;
      const rid = c.room.data.id;
      let json = cache.get(rid);
      if (json === undefined) {
        const group = this.sceneGroup(rid);
        json = JSON.stringify(this.campaignState(group));
        for (const id of group) cache.set(id, json);
      }
      if (json !== c.lastScenes) {
        c.lastScenes = json;
        c.send({ t: 'campaign', state: JSON.parse(json) as CampaignState });
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
      case 'objAdd': {
        const text = txt(m.text, 80);
        if (!text || camp.objectives.length >= 20) return;
        camp.objectives.push({ id: this.nextItemId(), text, done: false });
        break;
      }
      case 'objToggle': {
        const o = camp.objectives.find((x) => x.id === m.id);
        if (!o) return;
        o.done = !o.done;
        if (o.done) this.log(room.data.id, 'obj', `Objetivo concluído: ${o.text}.`);
        break;
      }
      case 'objRemove':
        camp.objectives = camp.objectives.filter((x) => x.id !== m.id);
        break;
      case 'campaignSet':
        camp.title = txt(m.title, 40) || camp.title;
        camp.subtitle = txt(m.subtitle, 40);
        break;
      case 'layoutSet': {
        if (typeof m.roomId !== 'number' || typeof m.x !== 'number' || typeof m.y !== 'number') return;
        camp.layout[m.roomId] = { x: Math.max(-40, Math.min(120, Math.round(m.x))), y: Math.max(-40, Math.min(120, Math.round(m.y))) };
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
    scheduleSave(this.db);
  }
  flush() {
    saveDbNow(this.db);
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
    if (this.listTimer) return;
    this.listTimer = setTimeout(() => {
      this.listTimer = null;
      const msg: ServerMsg = { t: 'roomList', rooms: this.roomList() };
      for (const c of this.clients.values()) if (c.name) c.send(msg);
    }, 300);
  }

  roomExists(roomId: number) {
    return this.rooms.has(roomId);
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
  connect(ws: WebSocket) {
    const c: Client = {
      id: this.nextClientId++,
      name: null,
      key: '',
      look: sanitizeLook(null),
      token: crypto.randomBytes(18).toString('base64url'),
      room: null,
      lastChat: 0,
      send: (msg) => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
      },
      kick: () => {
        c.room?.leave(c);
        c.name = null;
        c.key = '';
        ws.close(4000, 'replaced');
      },
    };
    this.clients.set(c.id, c);
    this.byToken.set(c.token, c);
    c.send({ t: 'hello', characters: this.db.characters });

    ws.on('message', (data) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object' || typeof (msg as { t?: unknown }).t !== 'string') return;
      try {
        this.handle(c, msg as Record<string, unknown>);
      } catch (e) {
        console.error('[hotel] erro tratando mensagem', e);
      }
    });
    // Sem este listener, um frame inválido/grande demais derrubaria o processo.
    ws.on('error', (e) => console.warn(`[ws] cliente ${c.id}: ${e.message}`));
    ws.on('close', () => {
      c.room?.leave(c);
      this.clients.delete(c.id);
      this.byToken.delete(c.token);
    });
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
    switch (m.t) {
      case 'rooms':
        c.send({ t: 'roomList', rooms: this.roomList() });
        return;
      case 'createRoom':
        this.createRoom(c, m);
        return;
      case 'join': {
        const room = typeof m.roomId === 'number' ? this.rooms.get(m.roomId) : undefined;
        if (!room) return c.send({ t: 'error', msg: 'Quarto não encontrado.' });
        c.room?.leave(c);
        room.join(c);
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
      case 'capacitySet':
        this.campaignEdit(c, m);
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
    // mesma pessoa abrindo em outra aba: a conexão nova assume
    for (const o of this.clients.values()) if (o !== c && o.key === key) o.kick?.();
    c.name = name;
    c.key = key;
    c.look = sanitizeLook(m.look);
    if (c.look.charId && !this.db.characters.some((ch) => ch.id === c.look.charId)) c.look.charId = null;
    const isNew = !this.db.users[key];
    const ud = this.userData(c);
    ud.name = name;
    ud.look = c.look;
    if (isNew) for (const defId of STARTER) ud.inventory.push({ id: this.nextItemId(), defId });
    this.save();
    c.send({ t: 'welcome', id: c.id, name, look: c.look, token: c.token, inventory: ud.inventory, home: this.db.home });
    c.send({ t: 'roomList', rooms: this.roomList() });
    console.log(`[hotel] ${name} entrou`);
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

  private canEditChar(c: Client, ch: CharacterDef) {
    return ch.owner.toLowerCase() === c.key;
  }

  private charUpdate(c: Client, m: Record<string, unknown>) {
    const ch = this.db.characters.find((x) => x.id === m.id);
    if (!ch) return;
    if (!this.canEditChar(c, ch)) return c.send({ t: 'error', msg: 'Só quem enviou pode editar esse personagem.' });
    Object.assign(ch, sanitizeCharPatch(m.patch));
    if (ch.dirs.length !== ch.rows) {
      const base = ['sw', 'se', 'nw', 'ne'] as const;
      ch.dirs = Array.from({ length: ch.rows }, (_, i) => ch.dirs[i] ?? base[i % 4]);
    }
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
    if (!this.canEditChar(c, this.db.characters[i])) return c.send({ t: 'error', msg: 'Só quem enviou pode apagar.' });
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
