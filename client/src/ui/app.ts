import type { AvatarLook, CharacterDef, InvItem, RoomInfo, RoomSummary } from '@croma/shared';
import type { Net } from '../net';
import type { RoomView } from '../room/RoomView';

export interface Me {
  id: number;
  name: string;
  look: AvatarLook;
  token: string;
}

export interface AppState {
  me: Me | null;
  inventory: InvItem[];
  characters: CharacterDef[];
  rooms: RoomSummary[];
  room: RoomInfo | null;
}

export type AppEvent = 'me' | 'inventory' | 'characters' | 'rooms' | 'room' | 'selection' | 'items' | 'placement';

export class App {
  state: AppState = { me: null, inventory: [], characters: [], rooms: [], room: null };
  net: Net;
  view!: RoomView;
  /** peça a comandar assim que a cena carregar */
  pendingActive: number | null = null;
  private listeners = new Map<AppEvent, Set<() => void>>();

  constructor(net: Net) {
    this.net = net;
  }

  on(evt: AppEvent, fn: () => void) {
    let s = this.listeners.get(evt);
    if (!s) this.listeners.set(evt, (s = new Set()));
    s.add(fn);
  }

  emit(evt: AppEvent) {
    for (const fn of this.listeners.get(evt) ?? []) fn();
  }

  get canBuild() {
    return !!this.state.room?.canBuild;
  }
}
