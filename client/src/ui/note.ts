/**
 * As perguntas do jogo no lugar das caixas do navegador (confirm/prompt): a janela de papel do kit
 * (a mesma das escolhas da ficha), no meio da tela, com o fundo escuro. Enter confirma, Esc cancela.
 */
import { h } from './dom';
import { botao, janela } from './fichaModal';
import { shake, typeInto } from './motion';
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

/** Título em letra normal: "ENCERRAR SESSÃO?" vira "Encerrar sessão?". */
const titulo = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t);

function show(o: NoteOpts): Promise<string[] | null> {
  return new Promise((resolve) => {
    let resposta: string[] | null = null;
    const j = janela(titulo(o.title), o.danger ? 'alerta' : o.fields?.length ? 'lapis' : 'documento', () => resolve(resposta), o.fields?.length ? 52 : 46);
    j.el.classList.add('nota-janela', 'tela-toda');
    sfx.paper();
    const inputs = (o.fields ?? []).map((f) => h('input', { class: 'fx-inp', value: f.value ?? '', maxlength: f.max ?? 60, spellcheck: false }) as HTMLInputElement);
    if (o.text) {
      const p = h('p', { class: 'nota-texto' });
      j.corpo.append(p);
      typeInto(p, o.text, 500);
    }
    (o.fields ?? []).forEach((f, i) => j.corpo.append(h('label', { class: 'fj-campo' }, h('span', null, f.label), inputs[i])));
    const confirmar = () => {
      // o primeiro campo é obrigatório
      if (inputs[0] && !inputs[0].value.trim()) {
        shake(inputs[0], 0.5);
        inputs[0].focus();
        return;
      }
      sfx.click();
      resposta = inputs.map((i) => i.value.trim());
      j.fechar();
    };
    const ok = botao(o.ok, o.danger ? 'alerta' : 'ok', o.danger ? 'perigo forte' : 'forte', confirmar);
    j.rodape.append(h('span', { class: 'fj-esp' }));
    if (o.cancel !== undefined) j.rodape.append(botao(o.cancel, 'fechar', '', () => j.fechar()));
    j.rodape.append(ok);
    j.el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        confirmar();
      }
    });
    setTimeout(() => (inputs[0] ?? ok).focus(), 60);
  });
}

/** Pergunta sim/não. */
export async function askNote(title: string, text: string, ok = 'Confirmar', danger = false): Promise<boolean> {
  return (await show({ title, text, ok, cancel: 'Cancelar', danger })) !== null;
}

/** Pede textos (null = cancelado). */
export function promptNote(title: string, fields: NoteField[], ok = 'Salvar'): Promise<string[] | null> {
  return show({ title, fields, ok, cancel: 'Cancelar' });
}
