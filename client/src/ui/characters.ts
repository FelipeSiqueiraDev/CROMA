import { ANIM_KEYS, DIR_KEYS, SHEET_TO_DIR, type AnimKey, type AvatarLook, type CharacterDef, type DirKey } from '@croma/shared';

const ANIM_LABEL: Record<AnimKey, string> = { idle: 'parado', walk: 'andando', sit: 'sentado' };
import { drawSprite, sprites, type LoadedChar } from '../render/sprites';
import type { App } from './app';
import { clear, h, icon, toast, Win } from './dom';
import { saveLogin } from './login';
import { AvatarPreview, characterPicker, lookEditor } from './lookEditor';

const DIR_LABEL: Record<DirKey, string> = {
  sw: '↙ frente-esquerda',
  se: '↘ frente-direita',
  nw: '↖ costas-esquerda',
  ne: '↗ costas-direita',
  s: '↓ de frente',
  e: '→ de lado, direita',
  n: '↑ de costas',
  w: '← de lado, esquerda',
};

function setLook(app: App, look: AvatarLook) {
  const me = app.state.me;
  if (!me) return;
  me.look = look;
  app.net.send({ t: 'look', look });
  saveLogin(me.name, look);
  app.emit('me');
}

/** Janela do avatar pixel. */
export class PixelLookWin {
  readonly win: Win;
  private app: App;
  private preview: AvatarPreview | null = null;

  constructor(app: App) {
    this.app = app;
    this.win = new Win('Avatar pixel', { width: 460, x: 120, y: 60 });
    this.win.onClose = () => this.preview?.destroy();
  }

  open() {
    const me = this.app.state.me;
    if (!me) return;
    let look: AvatarLook = { ...me.look, charId: null };
    this.preview?.destroy();
    this.preview = new AvatarPreview(look, 130, 180);
    const b = clear(this.win.body);
    b.append(
      h(
        'div',
        { class: 'pixel-look' },
        h('div', { class: 'pixel-look-prev' }, this.preview.canvas),
        lookEditor(look, (l) => {
          look = l;
          this.preview?.setLook(l);
        }),
      ),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => (setLook(this.app, { ...look, charId: null }), this.win.close()) }, 'Usar este visual')),
    );
    this.win.open();
  }
}

export class CharactersWin {
  readonly win: Win;
  private app: App;
  private pixel: PixelLookWin;
  private editing: number | null = null;
  private raf = 0;

  constructor(app: App) {
    this.app = app;
    this.pixel = new PixelLookWin(app);
    this.win = new Win('Personagem', { width: 520, x: 60, y: 50, cls: 'chars' });
    this.win.onClose = () => cancelAnimationFrame(this.raf);
    app.on('characters', () => this.win.isOpen && this.render());
    app.on('me', () => this.win.isOpen && this.render());
  }

  toggle() {
    if (this.win.isOpen) this.win.close();
    else {
      this.render();
      this.win.open();
    }
  }

  openPixel() {
    this.pixel.open();
  }

  private render() {
    cancelAnimationFrame(this.raf);
    const me = this.app.state.me;
    if (!me) return;
    const b = clear(this.win.body);
    const chars = this.app.state.characters;
    b.append(
      h('h4', { class: 'sec' }, 'Seu visual'),
      characterPicker(chars, me.look.charId, (id) => setLook(this.app, { ...me.look, charId: id })),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => this.pixel.open() }, icon('user', 16), 'Editar avatar pixel')),
      h('h4', { class: 'sec' }, 'Enviar sprite sheet'),
      this.uploadBox(),
    );
    const mine = chars.filter((c) => c.owner.toLowerCase() === me.name.toLowerCase());
    if (mine.length) {
      b.append(h('h4', { class: 'sec' }, 'Seus personagens'));
      const list = h('div', { class: 'my-chars' });
      for (const c of mine)
        list.append(
          h(
            'button',
            { class: `chip${this.editing === c.id ? ' on' : ''}`, onclick: () => ((this.editing = this.editing === c.id ? null : c.id), this.render()) },
            c.name,
          ),
        );
      b.append(list);
      const ed = mine.find((c) => c.id === this.editing);
      if (ed) b.append(this.editor(ed));
    }
  }

  private uploadBox() {
    const name = h('input', { class: 'input', maxlength: 24, placeholder: 'Nome do personagem' });
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'file' });
    const status = h('small', { class: 'muted' }, 'PNG, JPG ou WEBP em grade (padrão 4 colunas × 4 linhas). Fundo branco é removido automaticamente.');
    const drop = h('label', { class: 'dropzone' }, icon('upload', 26), h('span', null, 'Arraste a imagem aqui ou clique para escolher'), file);
    let picked: File | null = null;
    const pick = (f: File | null | undefined) => {
      if (!f) return;
      if (f.type && !['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) return toast('Use PNG, JPG ou WEBP.', 'error');
      picked = f;
      drop.querySelector('span')!.textContent = f.name;
      if (!name.value) name.value = f.name.replace(/\.(png|jpe?g|webp)$/i, '').slice(0, 24);
    };
    file.addEventListener('change', () => pick(file.files?.[0]));
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      pick(e.dataTransfer?.files?.[0]);
    });
    const send = h('button', { class: 'btn primary', type: 'button' }, 'Enviar');
    send.addEventListener('click', async () => {
      const me = this.app.state.me;
      if (!picked || !me) return toast('Escolha uma imagem primeiro.', 'error');
      send.disabled = true;
      status.textContent = 'Enviando…';
      try {
        const res = await fetch(`/api/characters?token=${encodeURIComponent(me.token)}&name=${encodeURIComponent(name.value.trim())}`, {
          method: 'POST',
          headers: { 'Content-Type': picked.type || 'application/octet-stream' },
          body: picked,
        });
        const data = (await res.json()) as { id?: number; error?: string };
        if (!res.ok || !data.id) throw new Error(data.error ?? 'Falha no envio');
        toast('Personagem enviado!');
        this.editing = data.id;
        setLook(this.app, { ...me.look, charId: data.id });
      } catch (e) {
        toast((e as Error).message, 'error');
        status.textContent = 'Não foi possível enviar.';
      } finally {
        send.disabled = false;
      }
    });
    return h('div', { class: 'upload' }, drop, h('div', { class: 'row' }, name, send), status);
  }

  private editor(c: CharacterDef) {
    const d = { ...c, dirs: [...c.dirs], anims: Array.from({ length: c.rows }, (_, i) => c.anims?.[i] ?? 'idle') as AnimKey[], sequence: [...c.sequence] };
    const num = (v: number, min: number, max: number, on: (n: number) => void) => {
      const i = h('input', { class: 'input small', type: 'number', value: String(v), min: String(min), max: String(max) });
      i.addEventListener('change', () => on(Math.max(min, Math.min(max, Math.round(Number(i.value) || min)))));
      return i;
    };
    const nameI = h('input', { class: 'input', maxlength: 24, value: d.name });
    const heightI = h('input', { type: 'range', min: '60', max: '220', value: String(d.height) });
    const heightV = h('span', { class: 'muted' }, `${d.height}px`);
    heightI.addEventListener('input', () => (heightV.textContent = `${heightI.value}px`));
    const seqI = h('input', { class: 'input', value: d.sequence.join(','), placeholder: '0,1,0,1,3,2,3,1' });
    const bg = h('input', { type: 'checkbox', checked: d.removeBg });
    const dirsBox = h('div', { class: 'dir-map' });
    const renderDirs = () => {
      clear(dirsBox);
      for (let r = 0; r < d.rows; r++) {
        const s = h('select', { class: 'input small' }, ...DIR_KEYS.map((k) => h('option', { value: k, selected: d.dirs[r] === k }, DIR_LABEL[k])));
        s.addEventListener('change', () => (d.dirs[r] = s.value as DirKey));
        const a = h('select', { class: 'input small' }, ...ANIM_KEYS.map((k) => h('option', { value: k, selected: d.anims[r] === k }, ANIM_LABEL[k])));
        a.addEventListener('change', () => (d.anims[r] = a.value as AnimKey));
        dirsBox.append(h('label', null, `Linha ${r + 1}`, h('div', { class: 'row nowrap' }, s, a)));
      }
    };
    const colsI = num(d.cols, 1, 16, (n) => (d.cols = n));
    const rowsI = num(d.rows, 1, 8, (n) => {
      d.rows = n;
      while (d.dirs.length < n) d.dirs.push(DIR_KEYS[d.dirs.length % 4]);
      d.dirs.length = n;
      while (d.anims.length < n) d.anims.push(d.anims.length < 4 ? 'idle' : d.anims.length < 8 ? 'walk' : 'sit');
      d.anims.length = n;
      renderDirs();
    });
    const fpsI = num(d.fps, 1, 24, (n) => (d.fps = n));
    renderDirs();

    const dpr = Math.min(2, devicePixelRatio || 1);
    // as direções que a folha tem (4 ou 8), na ordem da lista
    const shown = DIR_KEYS.filter((k) => c.dirs.includes(k));
    const view = shown.length ? shown : DIR_KEYS.slice(0, 4);
    const prev = h('canvas', { class: 'dir-preview', width: 440 * dpr, height: 150 * dpr, style: 'width:440px;height:150px' });
    const sheetBox = h('div', { class: 'sheet-box' });
    let lc: LoadedChar | null = null;
    sprites.load(c).then((l) => {
      lc = l;
      if (l) {
        const s = l.sheet;
        const cv = h('canvas', { width: s.width, height: s.height, class: 'sheet-prev' });
        cv.getContext('2d')!.drawImage(s, 0, 0);
        sheetBox.append(h('small', { class: 'muted' }, 'Folha processada (fundo removido):'), cv);
      }
    });
    const pctx = prev.getContext('2d')!;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.clearRect(0, 0, prev.width, prev.height);
      if (!lc) return;
      // com 8 direções os bonecos ficam menores para caberem lado a lado
      const scale = Math.min(1, 120 / c.height) * (view.length > 4 ? 0.7 : 1);
      pctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      const now = performance.now();
      const step = 440 / view.length;
      view.forEach((k, i) => {
        const x = (step / 2 + i * step) / scale;
        const y = 138 / scale;
        pctx.fillStyle = 'rgba(0,0,0,0.4)';
        pctx.beginPath();
        pctx.ellipse(x, y, 16, 7, 0, 0, Math.PI * 2);
        pctx.fill();
        drawSprite(pctx, c, lc!, SHEET_TO_DIR[k], x, y, now, 0, 'stand');
      });
    };
    this.raf = requestAnimationFrame(loop);

    const save = () => {
      const seq = seqI.value
        .split(/[\s,;]+/)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0 && n < d.cols);
      this.app.net.send({
        t: 'charUpdate',
        id: c.id,
        patch: { name: nameI.value, cols: d.cols, rows: d.rows, dirs: d.dirs, anims: d.anims, height: Number(heightI.value), fps: d.fps, sequence: seq.length ? seq : [0], removeBg: bg.checked },
      });
      toast('Personagem atualizado.');
    };
    return h(
      'div',
      { class: 'char-editor' },
      prev,
      h('div', { class: 'dir-labels', style: `grid-template-columns:repeat(${view.length},1fr)` }, ...view.map((k) => h('span', null, DIR_LABEL[k]))),
      h('div', { class: 'grid2' }, h('label', null, 'Nome', nameI), h('label', null, 'Altura na tela', h('div', { class: 'row' }, heightI, heightV))),
      h('div', { class: 'grid3' }, h('label', null, 'Colunas', colsI), h('label', null, 'Linhas', rowsI), h('label', null, 'Quadros/s', fpsI)),
      h('label', null, 'Sequência de quadros (idle)', seqI),
      h('label', { class: 'check' }, bg, 'Remover fundo branco'),
      h('h5', { class: 'sec' }, 'Direção e animação de cada linha'),
      h('small', { class: 'muted' }, 'Linhas extras de "andando" e "sentado" são usadas automaticamente. Sem elas, o personagem balança ao andar.'),
      dirsBox,
      sheetBox,
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn primary', onclick: save }, 'Salvar'),
        h(
          'button',
          {
            class: 'btn danger',
            onclick: () => {
              if (confirm(`Apagar o personagem "${c.name}"? Quem estiver usando volta para o avatar pixel.`)) {
                this.app.net.send({ t: 'charDelete', id: c.id });
                this.editing = null;
              }
            },
          },
          icon('trash', 16),
          'Apagar',
        ),
      ),
    );
  }
}
