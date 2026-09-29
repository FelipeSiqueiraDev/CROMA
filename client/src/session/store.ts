import type { Character, ClientMsg, Item, NormPoint, Scene, SceneObject, ServerMsg, Session, SessionAction, Tile, Token } from '@croma/shared';

type Fn<T extends unknown[]> = (...args: T) => void;

/**
 * Estado da sessão compartilhada para a interface (contrato em
 * shared/src/session.ts e docs/CONTRATO.md). A interface lê `session` e chama
 * as ações; o servidor confere a permissão e responde com a sessão atualizada
 * (ou com uma recusa, avisada em onDenied).
 */
export class SessionStore {
  /** último estado recebido (null até o primeiro) */
  session: Session | null = null;
  private changes = new Set<Fn<[Session]>>();
  private steps = new Set<Fn<[number, Token[]]>>();
  private denials = new Set<Fn<[string, string]>>();
  private send: (m: ClientMsg) => void;

  constructor(send: (m: ClientMsg) => void) {
    this.send = send;
  }

  /** O main.ts repassa todas as mensagens do servidor; devolve true se era da sessão. */
  receive(m: ServerMsg): boolean {
    switch (m.t) {
      case 'session':
        this.session = m.session;
        for (const f of this.changes) f(m.session);
        return true;
      case 'tokens': {
        const s = this.session;
        if (s)
          for (const t of m.tokens) {
            const i = s.tokens.findIndex((x) => x.id === t.id);
            if (i >= 0) s.tokens[i] = t;
            else s.tokens.push(t);
          }
        for (const f of this.steps) f(m.sceneId, m.tokens);
        return true;
      }
      case 'denied':
        for (const f of this.denials) f(m.action, m.reason);
        return true;
    }
    return false;
  }

  // ---------- avisos ----------
  /** A sessão mudou (cena, entrega, objetivo, registro...). Chama já com o estado atual. Devolve a função que para de ouvir. */
  subscribe(fn: Fn<[Session]>) {
    this.changes.add(fn);
    if (this.session) fn(this.session);
    return () => this.changes.delete(fn);
  }

  /** As peças deram um passo (a cada TOKEN_STEP_MS), para animar sem esperar a sessão inteira. */
  onTokens(fn: Fn<[sceneId: number, tokens: Token[]]>) {
    this.steps.add(fn);
    return () => this.steps.delete(fn);
  }

  /** O servidor recusou uma ação (tipo da ação e motivo, pronto para mostrar). */
  onDenied(fn: Fn<[action: string, reason: string]>) {
    this.denials.add(fn);
    return () => this.denials.delete(fn);
  }

  // ---------- leitura ----------
  get me() {
    return this.session?.me ?? null;
  }

  get isGm() {
    return this.session?.me.role === 'gm';
  }

  get currentScene(): Scene | null {
    const s = this.session;
    return s?.scenes.find((x) => x.id === s.currentSceneId) ?? null;
  }

  scene(id: number): Scene | null {
    return this.session?.scenes.find((x) => x.id === id) ?? null;
  }

  tokensIn(sceneId: number): Token[] {
    return this.session?.tokens.filter((t) => t.sceneId === sceneId) ?? [];
  }

  objectsIn(sceneId: number): SceneObject[] {
    return this.session?.objects.filter((o) => o.sceneId === sceneId) ?? [];
  }

  character(id: number): Character | null {
    return this.session?.characters.find((c) => c.id === id) ?? null;
  }

  /** Itens guardados num objeto da cena. */
  itemsIn(objectId: number): Item[] {
    return this.session?.items.filter((i) => i.objectId === objectId) ?? [];
  }

  /** Itens com um personagem (das cenas desta sessão). */
  itemsOf(characterId: number): Item[] {
    return this.session?.items.filter((i) => i.holderId === characterId) ?? [];
  }

  // ---------- ações (só o mestre; o servidor confere) ----------
  changeScene(sceneId: number) {
    this.act({ type: 'scene.change', sceneId });
  }

  /** Ponto 0..1 do quadro da cena, ou { tile } para uma casa exata. */
  moveToken(tokenId: number, to: NormPoint | { tile: Tile }, mode: 'walk' | 'place' = 'walk') {
    this.act({ type: 'token.move', tokenId, to, mode });
  }

  /** Vira a peça parada para a direção 0..7 (ver Token.dir e turnFacing). */
  faceToken(tokenId: number, dir: number) {
    this.act({ type: 'token.face', tokenId, dir });
  }

  /** to = id do personagem, ou null para devolver o item ao objeto. */
  giveItem(itemId: number, to: number | null) {
    this.act({ type: 'item.give', itemId, to });
  }

  addObjective(text: string) {
    this.act({ type: 'objective.add', text });
  }

  setObjective(id: number, done: boolean) {
    this.act({ type: 'objective.set', id, done });
  }

  removeObjective(id: number) {
    this.act({ type: 'objective.remove', id });
  }

  act(a: SessionAction) {
    this.send({ t: 'act', a });
  }
}
