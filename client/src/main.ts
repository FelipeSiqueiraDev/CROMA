import './style.css';
import './ui/shell.css';
import './ui/table.css';
import './ui/tema.css';
import './ui/mapa.css';
import './ui/fichas.css';
import { anyFurniName, getFurni, getWallFurni, type ServerMsg } from '@croma/shared';
import { Net } from './net';
import { clearIconCache } from './render/bubbles';
import { sprites } from './render/sprites';
import { RoomView } from './room/RoomView';
import { App } from './ui/app';
import { CatalogWin, InventoryWin } from './ui/catalog';
import { CharactersWin } from './ui/characters';
import { closeTopWindow, h, toast } from './ui/dom';
import { FxWin } from './ui/fx';
import { HelpWin } from './ui/help';
import { HintViewer } from './ui/infostand';
import { Shell } from './ui/shell';
import { loadLogin, saveLogin } from './ui/login';
import { TableScreen } from './ui/table';
import { esquecerChaveFicha, lerChaveFicha, TelaFicha } from './ui/telaFicha';
import { NavigatorWin } from './ui/navigator';
import { RoomSettingsWin } from './ui/roomSettings';
import { forgetGmKey, readGmKey, tableName, tableRequested } from './session/access';

const LAST_ROOM = 'croma.lastRoom';
const HOME_SEEN = 'croma.homeSeen';
const net = new Net();
const app = new App(net);
/** chave do link do mestre (?mestre=...), para mestre em outro aparelho */
const gmKey = readGmKey();
/**
 * Duas telas: a do mestre (a interface completa, só ele vê) e a da mesa (só o
 * tabuleiro, no tablet que os jogadores veem). ?mesa pede a da mesa; sem isso,
 * quem o servidor disser que é mestre fica com a interface.
 */
const tableMode = tableRequested();
/** link da ficha do jogador (?ficha=CHAVE): só a ficha dele, no celular */
const fichaKey = tableMode ? null : lerChaveFicha();
const fichaMode = !!fichaKey;
const root = document.getElementById('app')!;
const canvas = h('canvas', { class: 'room-canvas', 'aria-label': 'Tabuleiro' });

const usedInv = new Set<number>();

function endPlacement() {
  app.view.cancelPlacement();
  shell?.setPlacement(null);
  usedInv.clear();
}

function startPlace(defId: string, invId?: number) {
  usedInv.clear();
  const name = anyFurniName(defId);
  if (getWallFurni(defId)) app.view.startPlacement({ kind: 'wall', defId, invId });
  else {
    const def = getFurni(defId);
    if (!def) return;
    app.view.startPlacement({ kind: 'floor', defId, rot: def.rotations.includes(2) ? 2 : def.rotations[0], invId });
  }
  shell?.setPlacement(`Colocando ${name}: clique para colocar · R ou botão direito gira · Shift coloca vários · Esc cancela`);
}

const view = new RoomView(canvas, {
  walk: (x, y) => {
    // jogador só acompanha
    if (!app.isGm) return;
    const id = app.view.myId;
    if (id) net.send({ t: 'tokenWalk', tokenId: id, x, y });
    else toast('Clique num personagem para comandá-lo.');
  },
  lookAt: () => {},
  placeFloor: (p, x, y, keep) => {
    const map = app.view.map;
    if (!map) return;
    const res = map.canPlace(p.defId, x, y, p.rot, p.moveId);
    if (!res.ok) return toast(res.reason ?? 'Não dá para colocar aí.', 'error');
    if (p.moveId) {
      net.send({ t: 'moveItem', id: p.moveId, x, y, rot: p.rot });
      return endPlacement();
    }
    net.send({ t: 'place', defId: p.invId ? undefined : p.defId, invId: p.invId, x, y, rot: p.rot });
    if (p.invId) {
      usedInv.add(p.invId);
      const next = app.state.inventory.find((i) => i.defId === p.defId && !usedInv.has(i.id));
      if (keep && next) p.invId = next.id;
      else endPlacement();
    } else if (!keep) endPlacement();
  },
  placeWall: (p, t, keep) => {
    if (!t.ok) return toast('Não dá para colocar aí.', 'error');
    if (p.moveId) {
      net.send({ t: 'moveWallItem', id: p.moveId, wall: t.wall, plane: t.plane, pos: t.pos, z: t.z });
      return endPlacement();
    }
    net.send({ t: 'placeWall', defId: p.invId ? undefined : p.defId, invId: p.invId, wall: t.wall, plane: t.plane, pos: t.pos, z: t.z });
    if (p.invId) {
      usedInv.add(p.invId);
      const next = app.state.inventory.find((i) => i.defId === p.defId && !usedInv.has(i.id));
      if (keep && next) p.invId = next.id;
      else endPlacement();
    } else if (!keep) endPlacement();
  },
  use: (id) => net.send({ t: 'use', id }),
  select: () => app.emit('selection'),
  openHint: (kind, id) => hintViewer.open(kind, id),
});
app.view = view;
if (import.meta.env.DEV) (window as unknown as { __croma: App }).__croma = app;

const navigator = new NavigatorWin(app);
const catalog = new CatalogWin(app, startPlace);
const inventory = new InventoryWin(app, startPlace);
const characters = new CharactersWin(app);
const settings = new RoomSettingsWin(app);
const help = new HelpWin();
const fx = new FxWin(app);
const hintViewer = new HintViewer(app);
const shell = tableMode || fichaMode
  ? null
  : new Shell(app, {
      navigator: () => navigator.toggle(),
      catalog: () => catalog.toggle(),
      inventory: () => inventory.toggle(),
      characters: () => characters.toggle(),
      settings: () => settings.toggle(),
      fx: () => fx.toggle(),
      help: () => help.toggle(),
      logout: () => {
        net.close();
        sessionEnded();
      },
    });
const params = new URLSearchParams(location.search);
const table = tableMode ? new TableScreen(app) : null;
const telaFicha = fichaMode
  ? new TelaFicha(app, () => {
      net.close();
      sessionEnded();
    })
  : null;
if (shell) {
  shell.mountCanvas(canvas);
  root.append(shell.el);
}
if (table) {
  table.mountCanvas(canvas);
  root.append(table.el);
}
if (telaFicha) {
  document.documentElement.classList.add('modo-ficha');
  root.append(telaFicha.el);
}

app.on('placement', () => {
  const p = app.view.placement;
  if (p) shell?.setPlacement(`Movendo ${anyFurniName(p.defId)}: clique no destino · R gira · Esc cancela`);
});

/** Entra sem tela de login: o mestre com o nome salvo (ou "Mestre"), a mesa com o nome dela. */
function login(fresh = false) {
  const saved = loadLogin();
  const dev = import.meta.env.DEV ? params.get('auto') : null;
  if (fichaMode) {
    // o nome da conexão sai da chave (o mesmo link em outro aparelho assume a sessão)
    net.send({ t: 'login', name: `Agente ${fichaKey!.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 6)}`, look: saved.look, fichaKey: fichaKey! });
    return;
  }
  const name = tableMode ? tableName(fresh) : dev || saved.name || 'Mestre';
  net.send({ t: 'login', name, look: saved.look, gmKey, mesa: tableMode });
}
login();
let loginTries = 0;

/** "Encerrar sessão": desconecta e mostra um aviso para voltar. */
function sessionEnded() {
  document.body.append(
    h(
      'div',
      { class: 'replaced' },
      h('div', { class: 'paper' }, h('h3', { class: 'paper-title' }, 'SESSÃO ENCERRADA'), h('p', null, 'O tabuleiro fica salvo para a próxima sessão.'), h('button', { class: 'pbtn primary', onclick: () => location.reload() }, 'Voltar para a sessão')),
    ),
  );
}

let reconnecting = false;
let wantRoom: number | null = null;

net.onMessage = (m: ServerMsg) => {
  // sessão compartilhada: estado, passos das peças e recusas
  if (app.session.receive(m)) {
    if (m.t === 'denied') toast(m.reason, 'error');
    return;
  }
  const me = app.state.me;
  switch (m.t) {
    case 'hello':
      app.state.characters = m.characters;
      sprites.setDefs(m.characters);
      app.emit('characters');
      if (me && reconnecting) {
        if (fichaMode) net.send({ t: 'login', name: me.name, look: me.look, fichaKey: fichaKey! });
        else net.send({ t: 'login', name: me.name, look: me.look, gmKey, mesa: tableMode });
      }
      break;
    case 'welcome': {
      app.state.me = { id: m.id, name: m.name, look: m.look, token: m.token };
      app.state.inventory = m.inventory;
      app.state.role = m.role;
      if (fichaMode) {
        loginTries = 0;
        telaFicha?.show();
        app.emit('me');
        reconnecting = false;
        break;
      }
      if (!tableMode && m.role !== 'gm') {
        // não é o mestre: esta tela vira a da mesa
        if (gmKey) forgetGmKey();
        location.replace(`${location.pathname}?mesa`);
        return;
      }
      if (!tableMode) saveLogin(m.name, m.look);
      loginTries = 0;
      shell?.show();
      table?.show();
      app.emit('me');
      app.emit('inventory');
      if (reconnecting && app.state.room) wantRoom = app.state.room.id;
      else {
        let last: number | null = null;
        try {
          last = Number(localStorage.getItem(LAST_ROOM)) || null;
          // cena de abertura nova (demonstração): abre uma vez
          if (m.home && localStorage.getItem(HOME_SEEN) !== String(m.home)) {
            localStorage.setItem(HOME_SEEN, String(m.home));
            last = m.home;
          }
        } catch {
          /* sem storage */
        }
        wantRoom = last ?? m.home ?? 1;
      }
      reconnecting = false;
      break;
    }
    case 'error':
      // a mesa não escolhe nome: se o dela estiver em uso, tenta outro
      if (!app.state.me && tableMode && loginTries++ < 3) login(true);
      else if (!app.state.me && fichaMode) {
        if (/inválido/.test(m.msg)) esquecerChaveFicha();
        telaFicha?.erro(m.msg);
      } else toast(m.msg, 'error');
      break;
    case 'notice':
      toast(m.msg);
      break;
    case 'fichas':
      shell?.fichas.setFichas(m.fichas, m.nova);
      telaFicha?.fichas.setFichas(m.fichas, m.nova);
      break;
    case 'roomList':
      app.state.rooms = m.rooms;
      // a ficha do jogador não abre o tabuleiro
      if (fichaMode) break;
      if (wantRoom !== null) {
        const target = m.rooms.find((r) => r.id === wantRoom) ?? m.rooms.find((r) => r.id === 1) ?? m.rooms[0];
        wantRoom = null;
        if (target) net.send({ t: 'join', roomId: target.id });
      }
      app.emit('rooms');
      break;
    case 'roomCreated':
      net.send({ t: 'join', roomId: m.id });
      break;
    case 'roomEnter':
      app.state.room = m.room;
      endPlacement();
      view.enter(m.room, m.items, m.wallItems, m.users, app.pendingActive ?? view.myId);
      if (app.pendingActive && view.users.has(app.pendingActive)) {
        view.setActive(app.pendingActive);
        view.focusUser(app.pendingActive);
      }
      app.pendingActive = null;
      try {
        localStorage.setItem(LAST_ROOM, String(m.room.id));
      } catch {
        /* sem storage */
      }
      app.emit('room');
      app.emit('selection');
      table?.onRoom();
      break;
    case 'roomUpdate':
      app.state.room = m.room;
      view.updateInfo(m.room);
      app.emit('room');
      break;
    case 'userJoin':
      view.addUser(m.user);
      break;
    case 'userLeave':
      view.removeUser(m.id);
      break;
    case 'tokenTravel':
      // a peça comandada atravessou uma passagem: a câmera vai junto para o cômodo novo
      // (a mesa segue o mestre sozinha)
      if (!tableMode && m.tokenId === view.myId && m.roomId !== app.state.room?.id) {
        app.pendingActive = m.tokenId;
        net.send({ t: 'join', roomId: m.roomId });
      }
      break;
    case 'userLook':
      view.setLook(m.id, m.look);
      clearIconCache();
      if (me && m.id === me.id) me.look = m.look;
      app.emit('selection');
      break;
    case 'status':
      for (const s of m.updates) view.applyStatus(s);
      break;
    case 'chat':
      break;
    case 'action':
      view.wave(m.id);
      break;
    case 'itemAdd':
      view.addItem(m.item);
      app.emit('items');
      break;
    case 'itemUpdate':
      view.updateItem(m.item);
      app.emit('items');
      break;
    case 'itemRemove':
      view.removeItem(m.id);
      app.emit('items');
      break;
    case 'wallAdd':
    case 'wallUpdate':
      view.setWallItem(m.item);
      app.emit('items');
      break;
    case 'wallRemove':
      view.removeWallItem(m.id);
      app.emit('items');
      break;
    case 'inventory':
      app.state.inventory = m.items;
      app.emit('inventory');
      break;
    case 'campaign':
      shell?.setCampaign(m.state);
      table?.setCampaign(m.state);
      break;
    case 'peek':
      shell?.onPeek(m.room, m.items, m.wallItems);
      break;
    case 'lockResult':
      shell?.onLockResult(m);
      break;
    case 'characters':
      app.state.characters = m.list;
      sprites.setDefs(m.list);
      clearIconCache();
      app.emit('characters');
      break;
  }
};

net.onClose = (code) => {
  if (code === 4000) {
    // a sessão foi aberta em outra aba
    document.body.append(
      h('div', { class: 'replaced' }, h('div', { class: 'paper' }, h('h3', { class: 'paper-title' }, 'TABULEIRO ABERTO EM OUTRA ABA'), h('p', null, 'Esta aba foi desconectada.'), h('button', { class: 'pbtn primary', onclick: () => location.reload() }, 'Usar esta aba'))),
    );
    return;
  }
  if (app.state.me) {
    toast('Conexão perdida. Reconectando…', 'error');
    reconnecting = true;
  }
  setTimeout(() => net.connect(), 1500);
};
net.connect();

sprites.onLoad = () => {
  clearIconCache();
  app.emit('characters');
};

// ---------- teclado ----------
window.addEventListener('keydown', (e) => {
  const tgt = e.target as HTMLElement;
  if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT')) return;
  // a tela da mesa é só para ver
  if (!app.state.me || !shell) return;
  const v = app.view;
  if (e.key === 'Escape') {
    if (v.placement) endPlacement();
    else if (!closeTopWindow()) v.select(null);
    return;
  }
  if (v.placement && (e.key === 'r' || e.key === 'R')) {
    v.rotatePlacement();
    return;
  }
  if (e.key === 'Delete' && app.canBuild && v.selection && v.selection.kind !== 'user') {
    net.send({ t: 'pickup', id: v.selection.id });
    return;
  }
  // Q e E giram o personagem selecionado (ou o comandado)
  if ((e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') && !v.placement && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const target = v.selection?.kind === 'user' ? v.selection.id : v.myId;
    if (target) shell.turnToken(target, e.key.toLowerCase() === 'e');
    return;
  }
  // 1-9: comanda o personagem da barra
  if (/^[1-9]$/.test(e.key) && !v.placement) {
    const id = shell.partyIds()[Number(e.key) - 1];
    if (id && v.users.has(id)) {
      v.setActive(id);
      v.focusUser(id);
    }
  }
});
