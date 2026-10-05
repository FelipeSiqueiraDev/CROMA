/**
 * Bilhetes de papel no lugar das caixas do navegador (confirm/prompt):
 * a folha cai presa por uma fita, o fundo escurece e ela sai amassando.
 */
import { h } from './dom';
import { enter, reduced, shake, typeInto } from './motion';
import { paperize } from './paperArt';
import { sfx } from './sfx';

export interface NoteField {
  label: string;
  value?: string;
  max?: number;
}

interface NoteOpts {
  title: string;
  text?: string;
  fields?: NoteField[];
  ok: string;
  cancel?: string;
  /** botão principal vermelho (ação perigosa) */
  danger?: boolean;
}

let open: HTMLElement | null = null;

function show(o: NoteOpts): Promise<string[] | null> {
  open?.remove();
  return new Promise((resolve) => {
    const inputs = (o.fields ?? []).map((f) => h('input', { class: 'note-in', value: f.value ?? '', maxlength: f.max ?? 60, spellcheck: false }));
    const okBtn = h('button', { class: `dbtn${o.danger ? ' danger' : ''}`, type: 'submit' }, o.ok);
    const text = o.text ? h('p', { class: 'note-text' }) : null;
    const paper = h(
      'form',
      { class: 'note-paper', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title },
      h('span', { class: 'tape note-tape', 'aria-hidden': 'true' }),
      h('h3', { class: 'p-title' }, o.title),
      text,
      ...(o.fields ?? []).map((f, i) => h('label', { class: 'note-field' }, h('span', null, f.label), inputs[i])),
      h('div', { class: 'note-row' }, o.cancel !== undefined ? h('button', { class: 'note-cancel', type: 'button', onclick: () => close(null) }, o.cancel) : null, okBtn),
    );
    const back = h('div', { class: 'note-back' }, paper);
    paperize(paper, { kit: false, seed: 300 + o.title.length, tone: '#d3bca5', burn: 0.85, torn: 2.2, backs: [{ dx: 4, dy: 5, rot: 1.6 }] });
    document.body.append(back);
    open = back;
    sfx.paper();
    back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    if (!reduced())
      paper.animate(
        [
          { transform: 'translateY(-6rem) rotate(-6deg)', opacity: 0 },
          { transform: 'translateY(0.4rem) rotate(1.5deg)', opacity: 1, offset: 0.6 },
          { transform: 'translateY(0) rotate(-0.6deg)', opacity: 1, offset: 0.82 },
          { transform: 'translateY(0) rotate(0)', opacity: 1 },
        ],
        { duration: 560, easing: 'ease-out' },
      );
    if (text && o.text) typeInto(text, o.text, 600);
    paper.querySelectorAll('.note-field, .note-row').forEach((el, i) => enter(el, 'up', 200 + i * 60, 320));

    let done = false;
    const close = async (v: string[] | null) => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey, true);
      sfx.paper();
      if (!reduced()) {
        // aceito: a folha é recolhida para cima; cancelado: amassa e cai
        const out = v
          ? [{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: 'translateY(-4rem) rotate(4deg) scale(0.92)', opacity: 0 }]
          : [{ transform: 'rotate(0) scale(1)', opacity: 1 }, { transform: 'translateY(3rem) rotate(-14deg) scale(0.55)', opacity: 0 }];
        back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 60, fill: 'forwards' });
        // com a aba fora da frente a animação para: não espera mais que meio segundo
        const anim = paper.animate(out, { duration: 320, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }).finished.catch(() => {});
        await Promise.race([anim, new Promise((r) => setTimeout(r, 500))]);
      }
      back.remove();
      if (open === back) open = null;
      resolve(v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        void close(null);
      }
    };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('pointerdown', (e) => {
      if (e.target !== back) return;
      // clicar fora: a folha treme (não fecha sem querer)
      shake(paper, 0.5);
    });
    paper.addEventListener('keydown', (e) => e.stopPropagation());
    paper.addEventListener('submit', (e) => {
      e.preventDefault();
      // o primeiro campo é obrigatório
      if (inputs[0] && !inputs[0].value.trim()) {
        shake(inputs[0], 0.5);
        inputs[0].focus();
        return;
      }
      sfx.click();
      void close(inputs.map((i) => i.value.trim()));
    });
    setTimeout(() => (inputs[0] ?? okBtn).focus(), 60);
  });
}

/** Pergunta sim/não num bilhete. */
export async function askNote(title: string, text: string, ok = 'Confirmar', danger = false): Promise<boolean> {
  return (await show({ title, text, ok, cancel: 'Cancelar', danger })) !== null;
}

/** Pede textos num bilhete (null = cancelado). */
export function promptNote(title: string, fields: NoteField[], ok = 'Salvar'): Promise<string[] | null> {
  return show({ title, fields, ok, cancel: 'Cancelar' });
}
