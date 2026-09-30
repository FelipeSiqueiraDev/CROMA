/**
 * Janela da ficha rápida de ameaça (COMBATE.md, seção 17): o mestre copia do
 * livro só os números que o combate usa. PV ficam na peça, como os dos
 * agentes. O catálogo das ameaças do livro chega na etapa H.
 */
import { combate as cb, type Vitals } from '@croma/shared';
import type { regras } from '@croma/shared';
import { h } from './dom';
import { janela } from './fichaModal';
import { ic, type NomeIcone } from './icons';

type TipoDano = regras.TipoDano;

const FAIXAS: { v: string; rot: string }[] = [
  { v: '', rot: 'corpo a corpo' },
  { v: 'curto', rot: 'curto (9 m)' },
  { v: 'médio', rot: 'médio (18 m)' },
  { v: 'longo', rot: 'longo (36 m)' },
  { v: 'extremo', rot: 'extremo (90 m)' },
];

function botao(rotulo: string, icone: NomeIcone, cls: string, fn: () => void) {
  return h('button', { class: `fx-bt ${cls}`, type: 'button', onclick: fn }, ic(icone), h('span', null, rotulo));
}

const num = (el: HTMLInputElement, padrao: number) => {
  const n = Number(el.value.replace(',', '.'));
  return el.value.trim() !== '' && Number.isFinite(n) ? Math.round(n) : padrao;
};

function campoNum(rotulo: string, valor: number | undefined, cls = ''): [HTMLElement, HTMLInputElement] {
  const inp = h('input', { class: 'fx-inp', type: 'text', inputmode: 'numeric', maxlength: 4, value: valor === undefined ? '' : String(valor), placeholder: '—' });
  return [h('label', { class: `fj-campo cb-fa-num ${cls}` }, h('span', null, rotulo), inp), inp];
}

function selTipo(valor: TipoDano) {
  return h('select', { class: 'fx-inp' }, ...cb.TIPOS_DANO.map((t) => h('option', { value: t, selected: t === valor }, cb.NOME_TIPO_DANO[t])));
}

/**
 * Abre a ficha da ameaça. `gravar` recebe a ficha nova (null = apagar) e os
 * PV novos (atual e total), se o mestre mexeu neles.
 */
export function editarAmeaca(nome: string, atual: cb.FichaAmeaca | null, vit: Vitals | undefined, gravar: (f: cb.FichaAmeaca | null, pv: { pv: number; pvMax: number } | null) => void) {
  const f = structuredClone(atual ?? cb.fichaAmeacaVazia());
  const j = janela(`FICHA · ${nome.toUpperCase()}`, 'caveira', () => {}, 92);

  const tipo = h('input', { class: 'fx-inp', value: f.tipo, maxlength: 40, placeholder: 'Pessoa, Criatura de Sangue…' });
  const [cVd, iVd] = campoNum('VD', f.vd);
  const [cDef, iDef] = campoNum('Defesa', f.defesa);
  const [cPvMax, iPvMax] = campoNum('PV total', vit?.pvMax);
  const [cPv, iPv] = campoNum('PV atual', vit?.pv);
  const testes = (['fortitude', 'reflexos', 'vontade'] as const).map((k) => {
    const [cd, id] = campoNum('d20', f[k].dados, 'mini');
    const [cb2, ib] = campoNum('bônus', f[k].bonus, 'mini');
    return { k, el: h('div', { class: 'cb-fa-teste' }, h('b', null, k[0].toUpperCase() + k.slice(1)), cd, cb2), id, ib };
  });

  // RD por tipo
  const rdLista = h('div', { class: 'cb-fa-rds' });
  const rdLinhas: { tipo: HTMLSelectElement; valor: HTMLInputElement; el: HTMLElement }[] = [];
  const addRd = (t: TipoDano, v: number) => {
    const tipoEl = selTipo(t);
    const valor = h('input', { class: 'fx-inp', type: 'text', inputmode: 'numeric', maxlength: 2, value: String(v) });
    const linha = { tipo: tipoEl, valor, el: h('div', { class: 'cb-fa-rd' }) };
    linha.el.append(
      h('span', null, 'RD'),
      tipoEl,
      valor,
      h('button', { class: 'cb-fa-x', type: 'button', title: 'Tirar', 'aria-label': 'Tirar', onclick: () => (linha.el.remove(), rdLinhas.splice(rdLinhas.indexOf(linha), 1)) }, ic('fechar')),
    );
    rdLinhas.push(linha);
    rdLista.append(linha.el);
  };
  for (const [t, v] of Object.entries(f.rd) as [TipoDano, number][]) addRd(t, v);

  // imunidades e vulnerabilidades
  const marcas = (rotulo: string, lista: TipoDano[]) => {
    const sel = new Set(lista);
    const el = h(
      'div',
      { class: 'cb-fa-marcas' },
      h('small', null, rotulo),
      ...cb.TIPOS_DANO.filter((t) => t !== 'todos').map((t) => {
        const b = h('button', { class: `cb-fa-marca${sel.has(t) ? ' on' : ''}`, type: 'button', 'aria-pressed': String(sel.has(t)) }, cb.NOME_TIPO_DANO[t]);
        b.addEventListener('click', () => {
          if (sel.has(t)) sel.delete(t);
          else sel.add(t);
          b.classList.toggle('on', sel.has(t));
          b.setAttribute('aria-pressed', String(sel.has(t)));
        });
        return b;
      }),
    );
    return { el, sel };
  };
  const imu = marcas('Imune a', f.imunidades);
  const vul = marcas('Vulnerável a', f.vulnerabilidades);

  // ataques
  const atkLista = h('div', { class: 'cb-fa-ataques' });
  const atkLinhas: { el: HTMLElement; ler: () => cb.AtaqueAmeaca | null }[] = [];
  const addAtk = (a: cb.AtaqueAmeaca) => {
    const nomeEl = h('input', { class: 'fx-inp', value: a.nome, maxlength: 40, placeholder: 'Nome' });
    const per = h('select', { class: 'fx-inp' }, h('option', { value: 'luta', selected: a.pericia === 'luta' }, 'Luta'), h('option', { value: 'pontaria', selected: a.pericia === 'pontaria' }, 'Pontaria'));
    const [cD, iD] = campoNum('d20', a.dados, 'mini');
    const [cB, iB] = campoNum('bônus', a.bonus, 'mini');
    const dano = h('input', { class: 'fx-inp', value: a.dano, maxlength: 20, placeholder: '2d6+3' });
    const tipoEl = selTipo(a.tipo);
    const [cM, iM] = campoNum('margem', a.margem, 'mini');
    const [cX, iX] = campoNum('×', a.multiplicador, 'mini');
    const alc = h('select', { class: 'fx-inp' }, ...FAIXAS.map((x) => h('option', { value: x.v, selected: cb.faixaArma(a.alcance) === cb.faixaArma(x.v) }, x.rot)));
    const linha = {
      el: h('div', { class: 'cb-fa-atk' }),
      ler: (): cb.AtaqueAmeaca | null =>
        nomeEl.value.trim() && /\d/.test(dano.value)
          ? {
              nome: nomeEl.value.trim(),
              pericia: per.value === 'pontaria' ? 'pontaria' : 'luta',
              dados: num(iD, 1),
              bonus: num(iB, 0),
              dano: dano.value.trim(),
              tipo: tipoEl.value as TipoDano,
              margem: num(iM, 20),
              multiplicador: num(iX, 2),
              ...(alc.value ? { alcance: alc.value } : {}),
            }
          : null,
    };
    linha.el.append(
      h('label', { class: 'fj-campo cb-fa-nome' }, h('span', null, 'Ataque'), nomeEl),
      h('label', { class: 'fj-campo' }, h('span', null, 'Perícia'), per),
      cD,
      cB,
      h('label', { class: 'fj-campo cb-fa-dano' }, h('span', null, 'Dano'), dano),
      h('label', { class: 'fj-campo' }, h('span', null, 'Tipo'), tipoEl),
      cM,
      cX,
      h('label', { class: 'fj-campo' }, h('span', null, 'Alcance'), alc),
      h('button', { class: 'cb-fa-x', type: 'button', title: 'Tirar o ataque', 'aria-label': 'Tirar o ataque', onclick: () => (linha.el.remove(), atkLinhas.splice(atkLinhas.indexOf(linha), 1)) }, ic('fechar')),
    );
    atkLinhas.push(linha);
    atkLista.append(linha.el);
  };
  for (const a of f.ataques) addAtk(a);
  const notas = h('input', { class: 'fx-inp', value: f.notas ?? '', maxlength: 300, placeholder: 'Habilidades, sentidos, presença perturbadora…' });

  j.corpo.append(
    h(
      'div',
      { class: 'cb-fa' },
      h('div', { class: 'cb-fa-linha' }, h('label', { class: 'fj-campo cb-fa-tipo' }, h('span', null, 'Tipo'), tipo), cVd, cDef, cPv, cPvMax),
      h('div', { class: 'cb-fa-linha' }, ...testes.map((t) => t.el)),
      h('div', { class: 'cb-fa-bloco' }, h('div', { class: 'cb-fa-cab' }, h('b', null, 'Redução de dano'), botao('RD', 'mais', 'mini', () => addRd('balistico', 5))), rdLista),
      imu.el,
      vul.el,
      h('div', { class: 'cb-fa-bloco' }, h('div', { class: 'cb-fa-cab' }, h('b', null, 'Ataques'), botao('Ataque', 'mais', 'mini', () => addAtk({ nome: '', pericia: 'luta', dados: 2, bonus: 0, dano: '1d6', tipo: 'corte', margem: 20, multiplicador: 2 }))), atkLista),
      h('label', { class: 'fj-campo' }, h('span', null, 'Notas'), notas),
      h('p', { class: 'fj-texto' }, 'Copie os números do livro (LR p. 178–181). As contas do ataque e do dano usam esta ficha.'),
    ),
  );

  const ok = () => {
    const rd: Partial<Record<TipoDano, number>> = {};
    for (const l of rdLinhas) {
      const v = num(l.valor, 0);
      if (v > 0) rd[l.tipo.value as TipoDano] = v;
    }
    const nova: cb.FichaAmeaca = {
      tipo: tipo.value.trim() || 'Pessoa',
      ...(iVd.value.trim() ? { vd: num(iVd, 0) } : {}),
      defesa: num(iDef, 10),
      fortitude: { dados: num(testes[0].id, 1), bonus: num(testes[0].ib, 0) },
      reflexos: { dados: num(testes[1].id, 1), bonus: num(testes[1].ib, 0) },
      vontade: { dados: num(testes[2].id, 1), bonus: num(testes[2].ib, 0) },
      rd,
      imunidades: [...imu.sel],
      vulnerabilidades: [...vul.sel],
      ataques: atkLinhas.map((l) => l.ler()).filter((a): a is cb.AtaqueAmeaca => !!a),
      ...(notas.value.trim() ? { notas: notas.value.trim() } : {}),
    };
    const pvMax = num(iPvMax, vit?.pvMax ?? 0);
    const pv = num(iPv, Math.min(vit?.pv ?? pvMax, pvMax));
    const mudouPv = pvMax >= 1 && (pvMax !== vit?.pvMax || pv !== vit?.pv);
    gravar(nova, mudouPv ? { pv: Math.max(0, Math.min(pv, pvMax)), pvMax } : null);
    j.fechar();
  };
  j.rodape.append(
    atual ? botao('Apagar ficha', 'lixo', 'perigo', () => (gravar(null, null), j.fechar())) : h('span'),
    h('span', { class: 'fj-esp' }),
    botao('Cancelar', 'fechar', '', () => j.fechar()),
    botao('Gravar', 'ok', 'forte', ok),
  );
  setTimeout(() => tipo.focus(), 30);
}
