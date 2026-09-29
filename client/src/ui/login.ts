import { defaultLook, MAX_NAME, randomLook, sanitizeLook, type AvatarLook } from '@croma/shared';
import { drawSigil } from '../render/furniFloor';
import type { App } from './app';
import { clear, h } from './dom';
import { AvatarPreview, characterPicker, lookEditor } from './lookEditor';

const KEY = 'croma.login';

function loadSaved(): { name: string; look: AvatarLook } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { name: typeof o.name === 'string' ? o.name : '', look: sanitizeLook(o.look) };
    }
  } catch {
    /* sem storage */
  }
  return { name: '', look: { ...randomLook(), charId: null } };
}

export function saveLogin(name: string, look: AvatarLook) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, look }));
  } catch {
    /* sem storage */
  }
}

export class LoginScreen {
  readonly el: HTMLElement;
  private app: App;
  private look: AvatarLook;
  private preview: AvatarPreview;
  private nameInput: HTMLInputElement;
  private tabBody: HTMLElement;
  private tab: 'chars' | 'pixel' = 'chars';
  private tabs: HTMLElement;
  private err: HTMLElement;
  private btn: HTMLButtonElement;
  private bg: HTMLCanvasElement;
  private raf = 0;

  constructor(app: App, onSubmit: (name: string, look: AvatarLook) => void) {
    this.app = app;
    const saved = loadSaved();
    this.look = saved.look ?? defaultLook();
    this.tab = this.look.charId ? 'chars' : 'pixel';
    this.preview = new AvatarPreview(this.look, 170, 230);
    this.nameInput = h('input', { class: 'input', maxlength: MAX_NAME, placeholder: 'Seu nome', autocomplete: 'off', spellcheck: false, value: saved.name });
    this.tabBody = h('div', { class: 'login-tabbody' });
    this.tabs = h('div', { class: 'tabs' });
    this.err = h('div', { class: 'form-error', role: 'alert' });
    this.btn = h('button', { class: 'btn primary big', type: 'submit' }, 'Entrar');
    this.bg = h('canvas', { class: 'login-bg' });
    const form = h(
      'form',
      {
        class: 'login-card',
        onsubmit: (e: Event) => {
          e.preventDefault();
          const n = this.nameInput.value.trim();
          if (n.length < 2) return this.error('Digite um nome com pelo menos 2 letras.');
          this.btn.disabled = true;
          this.err.textContent = '';
          saveLogin(n, this.look);
          onSubmit(n, this.look);
        },
      },
      h('div', { class: 'brand' }, h('h1', null, 'CROMA'), h('p', null, 'Tabuleiro digital · quartos, personagens e mistério')),
      h(
        'div',
        { class: 'login-grid' },
        h('div', { class: 'login-left' }, this.preview.canvas, h('small', { class: 'muted' }, 'clique para girar')),
        h(
          'div',
          { class: 'login-right' },
          h('label', { class: 'field-label' }, 'Nome'),
          this.nameInput,
          this.tabs,
          this.tabBody,
          this.err,
          this.btn,
        ),
      ),
    );
    this.el = h('div', { class: 'login' }, this.bg, form);
    this.renderTabs();
    app.on('characters', () => this.renderTabs());
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.drawBg();
    };
    this.raf = requestAnimationFrame(loop);
  }

  error(msg: string) {
    this.err.textContent = msg;
    this.btn.disabled = false;
  }

  /** Envia o formulário (usado pelo ?auto em desenvolvimento). */
  submit(name?: string) {
    if (name) this.nameInput.value = name;
    if (this.nameInput.value.trim().length >= 2) this.btn.click();
  }

  hide() {
    cancelAnimationFrame(this.raf);
    this.preview.destroy();
    this.el.remove();
  }

  private setLook(l: AvatarLook) {
    this.look = l;
    this.preview.setLook(l);
  }

  private renderTabs() {
    const chars = this.app.state.characters;
    clear(this.tabs);
    const mk = (id: 'chars' | 'pixel', label: string) =>
      h(
        'button',
        {
          type: 'button',
          class: `tab${this.tab === id ? ' on' : ''}`,
          onclick: () => {
            this.tab = id;
            if (id === 'pixel') this.setLook({ ...this.look, charId: null });
            this.renderTabs();
          },
        },
        label,
      );
    this.tabs.append(mk('chars', `Personagens (${chars.length})`), mk('pixel', 'Avatar pixel'));
    clear(this.tabBody);
    if (this.tab === 'chars') {
      if (!chars.length)
        this.tabBody.append(h('p', { class: 'muted' }, 'Nenhum personagem enviado ainda. Entre com o avatar pixel e envie sua sprite sheet na janela Personagem.'));
      else this.tabBody.append(characterPicker(chars, this.look.charId, (id) => this.setLook({ ...this.look, charId: id })));
    } else this.tabBody.append(lookEditor(this.look, (l) => this.setLook({ ...l, charId: null })));
  }

  private drawBg() {
    const c = this.bg;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = innerWidth;
    const hh = innerHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(hh * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(hh * dpr);
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#070508';
    ctx.fillRect(0, 0, w, hh);
    const t = performance.now() / 1000;
    const R = Math.min(w, hh) * 0.42;
    ctx.save();
    ctx.translate(w / 2, hh / 2);
    ctx.rotate(t * 0.03);
    ctx.globalAlpha = 0.22 + Math.sin(t * 1.3) * 0.03;
    drawSigil(ctx, 0, 0, R, '#8a1010', 7, false);
    ctx.restore();
    const g = ctx.createRadialGradient(w / 2, hh / 2, R * 0.2, w / 2, hh / 2, Math.max(w, hh) * 0.7);
    g.addColorStop(0, 'rgba(60,20,10,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hh);
  }
}
