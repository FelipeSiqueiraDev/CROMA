import type { CampaignState } from '@croma/shared';
import type { App } from './app';
import { h } from './dom';
import { reduced, typeInto } from './motion';

/**
 * Tela da mesa: só o tabuleiro, para o tablet que os jogadores veem. Segue a
 * cena que o mestre abrir, sem painéis e sem nada para tocar.
 */
export class TableScreen {
  readonly el: HTMLElement;
  private app: App;
  private stage: HTMLElement;
  private card: HTMLElement;
  private cardTitle: HTMLElement;
  private cardSub: HTMLElement;
  private campaign: CampaignState | null = null;
  private lastRoom: number | null = null;
  private cardTimer = 0;
  private canvas: HTMLCanvasElement | null = null;

  /** notice = aviso para quem abriu sem querer (ex.: mestre sem a chave) */
  constructor(app: App, notice?: string) {
    this.app = app;
    this.cardTitle = h('div', { class: 'mesa-title' });
    this.cardSub = h('div', { class: 'mesa-sub' });
    this.card = h('div', { class: 'mesa-card', 'aria-live': 'polite' }, this.cardSub, this.cardTitle, h('i', { class: 'mesa-rule', 'aria-hidden': 'true' }));
    this.stage = h('div', { class: 'mesa-stage' }, h('div', { class: 'mesa-vignette', 'aria-hidden': 'true' }));
    const hint = h('div', { class: 'mesa-hint' }, 'Toque para tela cheia');
    this.el = h('div', { class: 'mesa hidden' }, this.stage, this.card, hint);
    if (notice) this.el.append(h('div', { class: 'mesa-notice' }, notice));

    // primeiro toque: tela cheia (o navegador só permite depois de um toque)
    const goFull = () => {
      const d = document.documentElement;
      if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => {});
      hint.classList.add('gone');
    };
    this.el.addEventListener('pointerdown', goFull);
    setTimeout(() => hint.classList.add('gone'), 9000);
  }

  /** O canvas do tabuleiro ocupa a tela toda. */
  mountCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.stage.prepend(canvas);
    this.app.view.watchOnly = true;
    this.app.view.setFrame(null);
  }

  show() {
    this.el.classList.remove('hidden');
  }

  setCampaign(s: CampaignState) {
    this.campaign = s;
  }

  /** Entrou numa cena: dissolve o quadro antigo e mostra o nome da cena. */
  onRoom() {
    const r = this.app.state.room;
    if (!r) return;
    const first = this.lastRoom === null;
    if (r.id === this.lastRoom) return;
    this.lastRoom = r.id;
    if (!first) this.fade();
    this.showCard(r.name);
  }

  private fade() {
    const src = this.canvas;
    if (!src || reduced() || !src.width) return;
    const c = document.createElement('canvas');
    c.className = 'mesa-fade';
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d')!.drawImage(src, 0, 0);
    src.after(c);
    c.animate(
      [
        { opacity: 1, filter: 'blur(0px) brightness(1)' },
        { opacity: 0, filter: 'blur(8px) brightness(0.3)' },
      ],
      { duration: 1100, easing: 'cubic-bezier(.4,0,.2,1)' },
    ).onfinish = () => c.remove();
    src.animate([{ opacity: 0, filter: 'brightness(0.2)' }, { opacity: 1, filter: 'brightness(1)' }], { duration: 1300, easing: 'ease-out' });
  }

  /** Nome da cena, como título de filme: surge, fica um pouco e some. */
  private showCard(roomName: string) {
    const [place, scene] = roomName.includes('·') ? roomName.split('·').map((s) => s.trim()) : [this.campaign?.subtitle ?? '', roomName];
    clearTimeout(this.cardTimer);
    const card = this.card;
    card.getAnimations().forEach((a) => a.cancel());
    card.classList.add('on');
    this.cardSub.textContent = (place || '').toUpperCase();
    typeInto(this.cardTitle, scene.toUpperCase(), 700, false);
    if (!reduced()) {
      card.animate([{ opacity: 0, transform: 'translate(-50%, 1.2rem)', letterSpacing: '0.5em' }, { opacity: 1, transform: 'translate(-50%, 0)', letterSpacing: '0.18em' }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
      card.querySelector('.mesa-rule')?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: 300, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'backwards' });
    }
    this.cardTimer = window.setTimeout(() => {
      const out = card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced() ? 0 : 900, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = () => {
        card.classList.remove('on');
        out.cancel();
      };
    }, 3600);
  }
}
