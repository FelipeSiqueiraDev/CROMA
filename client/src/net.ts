import type { ClientMsg, ServerMsg } from '@crona/shared';

export class Net {
  private ws: WebSocket | null = null;
  private queue: ClientMsg[] = [];
  onMessage: (m: ServerMsg) => void = () => {};
  onOpen: () => void = () => {};
  onClose: (code: number) => void = () => {};

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      for (const m of this.queue.splice(0)) ws.send(JSON.stringify(m));
      this.onOpen();
    };
    ws.onmessage = (e) => {
      try {
        this.onMessage(JSON.parse(String(e.data)) as ServerMsg);
      } catch (err) {
        console.error('[net]', err);
      }
    };
    ws.onclose = (e) => {
      if (this.ws === ws) this.ws = null;
      this.onClose(e.code);
    };
  }

  /** fecha sem reconectar */
  close() {
    this.onClose = () => {};
    this.ws?.close();
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(m: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
    else this.queue.push(m);
  }
}
