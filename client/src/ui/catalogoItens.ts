/**
 * O catálogo de itens do livro pelo nome: o item do cenário que vira item de verdade (a faca da
 * gaveta) e a lista de nomes para os campos de texto. A escolha de itens da ficha é a requisição
 * (requisicao.ts).
 */
import { espacosDoItemFicha, kindDoItem, regras, type LootKind } from '@croma/shared';
import { h } from './dom';

const cat = regras.catalogo;

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
