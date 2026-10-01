/**
 * Janela "Adicionar item": o catálogo do livro (armas, proteções,
 * equipamentos e amaldiçoados), com busca e o aviso do limite da patente.
 * A FICHAS põe o item no rascunho; a aba ITENS do MAPA grava na hora.
 */
import { espacosDoItemFicha, kindDoItem, regras, type LootKind } from '@croma/shared';
import { h } from './dom';
import { janela } from './fichaModal';
import { NOME_ELEMENTO, romano, textoRef } from './fichaRegras';
import { ic } from './icons';
import { sfx } from './sfx';

const cat = regras.catalogo;

/**
 * Abre o catálogo para a ficha `f`. Cada escolha entra em `f.inventario` (o
 * contador e os avisos acompanham) e vai para `aoEscolher`.
 */
export function adicionarDoCatalogo(f: regras.Ficha, aoEscolher: (it: regras.ItemFicha) => void, aoFechar: () => void) {
  type Aba = regras.TipoItemCatalogo;
  let aba: Aba = 'arma';
  const j = janela('Adicionar item', 'mochila', aoFechar, 74);
  const abas = h('div', { class: 'fj-abas' });
  const busca = h('input', { class: 'fx-inp fj-busca', type: 'search', placeholder: 'Procurar…' }) as HTMLInputElement;
  const lista = h('div', { class: 'fj-lista' });
  const cont = h('span', { class: 'fj-cont' });
  const contar = () => (cont.textContent = `${f.inventario.length} ${f.inventario.length === 1 ? 'item' : 'itens'} na mochila`);
  const desenhar = () => {
    const c = regras.calcular(f);
    abas.replaceChildren(
      ...(
        [
          ['arma', 'Armas'],
          ['protecao', 'Proteções'],
          ['equipamento', 'Equipamentos'],
          ['amaldicoado', 'Amaldiçoados'],
        ] as [Aba, string][]
      ).map(([id, nome]) => h('button', { class: `fj-aba${aba === id ? ' on' : ''}`, type: 'button', onclick: () => ((aba = id), desenhar()) }, nome)),
    );
    const q = busca.value.trim().toLowerCase();
    const fonte: { id: string; nome: string; categoria: number; espacos: number; ref: regras.Ref; extra: string }[] =
      aba === 'arma'
        ? cat.CATALOGO.armas.map((a) => ({ id: a.id, nome: a.nome, categoria: a.categoria, espacos: a.espacos, ref: a.ref, extra: `${a.dano} · ${a.critico.margem}/x${a.critico.multiplicador} · ${a.proficiencia}` }))
        : aba === 'protecao'
          ? cat.CATALOGO.protecoes.map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria, espacos: p.espacos, ref: p.ref, extra: `Defesa +${p.defesa}` }))
          : aba === 'equipamento'
            ? cat.CATALOGO.equipamentos.map((e) => ({ id: e.id, nome: e.nome, categoria: e.categoria, espacos: e.espacos, ref: e.ref, extra: e.resumo ?? '' }))
            : cat.CATALOGO.amaldicoados.map((x) => ({ id: x.id, nome: x.nome, categoria: x.categoria, espacos: x.espacos, ref: x.ref, extra: NOME_ELEMENTO[x.elemento] }));
    lista.replaceChildren();
    for (const x of fonte) {
      if (!cat.disponivel(x, f.regras)) continue;
      if (q && !x.nome.toLowerCase().includes(q)) continue;
      const lim = x.categoria >= 1 ? c.itens.find((l) => l.categoria === x.categoria) : undefined;
      const aviso = lim && lim.usados >= lim.limite ? `Categoria ${romano(x.categoria)} já no limite da patente (${lim.usados}/${lim.limite}).` : aba === 'amaldicoado' && f.pp < 50 ? 'Itens amaldiçoados só a partir de agente especial (LR p. 144).' : '';
      const bt = h(
        'button',
        {
          class: 'fo',
          type: 'button',
          onclick: () => {
            const it: regras.ItemFicha = { id: x.id, tipo: aba };
            f.inventario.push(it);
            aoEscolher(it);
            sfx.drop();
            bt.classList.add('on');
            setTimeout(() => bt.classList.remove('on'), 500);
            contar();
          },
        },
        h('span', { class: 'fo-marca' }, ic('mais')),
        h('span', { class: 'fo-txt' }, h('span', { class: 'fo-nome' }, x.nome, h('small', null, ` ${romano(x.categoria)} · ${x.espacos} esp. · ${textoRef(x.ref)}`)), x.extra ? h('span', { class: 'fo-resumo' }, x.extra) : null, aviso ? h('div', { class: 'fo-avisos' }, ic('alerta'), aviso) : null),
      );
      lista.append(bt);
    }
  };
  contar();
  j.corpo.append(abas, h('div', { class: 'fj-filtros' }, busca, cont), lista);
  busca.addEventListener('input', desenhar);
  j.rodape.append(h('span', { class: 'fj-esp' }), h('button', { class: 'fx-bt forte', type: 'button', onclick: () => j.fechar() }, ic('ok'), h('span', null, 'Pronto')));
  desenhar();
  setTimeout(() => busca.focus(), 30);
}

/** Item do livro com esse nome (para pôr no cenário: a faca da gaveta vira arma de verdade). */
export function doCatalogoPeloNome(nome: string): { tipo: regras.TipoItemCatalogo; id: string; espacos: number; kind: LootKind } | null {
  const q = nome.trim().toLowerCase();
  if (!q) return null;
  const listas: [regras.TipoItemCatalogo, { id: string; nome: string }[]][] = [
    ['arma', cat.CATALOGO.armas],
    ['protecao', cat.CATALOGO.protecoes],
    ['equipamento', cat.CATALOGO.equipamentos],
    ['amaldicoado', cat.CATALOGO.amaldicoados],
  ];
  for (const [tipo, l] of listas) {
    const x = l.find((i) => i.nome.toLowerCase() === q);
    if (x) {
      const it = { id: x.id, tipo };
      return { tipo, id: x.id, espacos: espacosDoItemFicha(it), kind: kindDoItem(it) };
    }
  }
  return null;
}

let lista: HTMLDataListElement | null = null;
/** Lista de nomes do livro para um campo de texto (`list`): o id dela. */
export function listaDoCatalogo(): string {
  if (!lista) {
    lista = document.createElement('datalist');
    lista.id = 'croma-catalogo-itens';
    const nomes = [...cat.CATALOGO.armas, ...cat.CATALOGO.protecoes, ...cat.CATALOGO.equipamentos, ...cat.CATALOGO.amaldicoados].map((x) => x.nome);
    for (const n of [...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt'))) lista.append(h('option', { value: n }));
    document.body.append(lista);
  }
  return lista.id;
}
