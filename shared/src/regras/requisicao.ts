/**
 * A requisição de equipamento: o que o agente pode levar para a missão, item por item, e por quê
 * (LR cap. 3). Cada item do catálogo vira uma opção com o que acontece se ele entrar na mochila:
 * o limite da patente por categoria (LR p. 52), a carga (LR p. 53), a proficiência (LR p. 29, 30 e
 * 62), a munição que a arma usa (LR p. 59) e os itens amaldiçoados (só de agente especial em diante).
 * A janela de escolha (client/src/ui/requisicao.ts) desenha isto; o mestre pode passar por cima.
 */
import { calcular, proficiente, type Calculado } from './calcular';
import * as cat from './dados';
import { MALDICAO_PP_MINIMO } from './dados';
import type { Ficha, TipoItemCatalogo } from './ficha';
import type { Categoria, GrupoItem, Proficiencia, Ref } from './tipos';

/** As seções da requisição: como o agente procura o item. */
export type SecaoItem = 'corpoACorpo' | 'disparo' | 'fogo' | 'municao' | 'protecao' | 'explosivo' | 'acessorio' | 'operacional' | 'medicamento' | 'paranormal' | 'amaldicoado' | 'outro';

export const SECOES_ITEM: { id: SecaoItem; nome: string }[] = [
  { id: 'corpoACorpo', nome: 'Armas corpo a corpo' },
  { id: 'disparo', nome: 'Disparo e arremesso' },
  { id: 'fogo', nome: 'Armas de fogo' },
  { id: 'municao', nome: 'Munição' },
  { id: 'protecao', nome: 'Proteções' },
  { id: 'explosivo', nome: 'Explosivos' },
  { id: 'acessorio', nome: 'Acessórios e kits' },
  { id: 'operacional', nome: 'Operacional' },
  { id: 'medicamento', nome: 'Medicamentos' },
  { id: 'paranormal', nome: 'Paranormal' },
  { id: 'amaldicoado', nome: 'Amaldiçoados' },
  { id: 'outro', nome: 'Volumes e outros' },
];

const SECAO_DO_GRUPO: Record<GrupoItem, SecaoItem> = {
  municao: 'municao',
  explosivo: 'explosivo',
  acessorio: 'acessorio',
  kit: 'acessorio',
  utensilio: 'acessorio',
  vestimenta: 'acessorio',
  operacional: 'operacional',
  medicamento: 'medicamento',
  paranormal: 'paranormal',
  veiculo: 'outro',
  outro: 'outro',
};

/** As armas do catálogo que não são um item para levar: o golpe com a coronha e o ataque desarmado. */
const NAO_E_ITEM = new Set(['coronhada', 'ataque-desarmado']);

export interface OpcaoItem {
  tipo: TipoItemCatalogo;
  id: string;
  nome: string;
  ref: Ref;
  secao: SecaoItem;
  categoria: Categoria;
  espacos: number;
  /** pode entrar na mochila (o mestre passa por cima dos motivos) */
  ok: boolean;
  /** por que não pode: o limite da patente, a carga, o amaldiçoado antes de agente especial */
  motivos: string[];
  /** entra, mas com um custo: sem proficiência, sobrecarregado, sem a munição */
  avisos: string[];
  /** a munição que a arma usa e se a mochila já tem */
  municao?: { id: string; nome: string; tem: boolean };
  /** quantos iguais já estão na mochila */
  naMochila: number;
}

const romano = (n: number) => (n === 4 ? 'IV' : 'I'.repeat(n));
/** número com vírgula (1,5) */
const num = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/**
 * Cada item do catálogo que a ficha pode pedir (os do Sobrevivendo ao Horror só com o livro ligado),
 * com o que acontece se UM deles entrar na mochila agora.
 */
export function opcoesDeItens(f: Ficha, c: Calculado = calcular(f)): OpcaoItem[] {
  const profs = new Set<Proficiencia>(c.proficiencias);
  const tem = (tipo: TipoItemCatalogo, id: string) => f.inventario.filter((it) => it.tipo === tipo && it.id === id).reduce((s, it) => s + (it.qtd ?? 1), 0);
  const quem = c.patente ? `a patente ${c.patente.nome.toLowerCase()}` : 'o agente em NEX 0';
  const out: OpcaoItem[] = [];
  const opcao = (tipo: TipoItemCatalogo, x: { id: string; nome: string; ref: Ref; categoria: Categoria; espacos: number }, secao: SecaoItem, extra: (o: OpcaoItem) => void = () => {}) => {
    const o: OpcaoItem = { tipo, id: x.id, nome: x.nome, ref: x.ref, secao, categoria: x.categoria, espacos: x.espacos, ok: true, motivos: [], avisos: [], naMochila: tem(tipo, x.id) };
    // o limite da patente: categoria 0 à vontade; I a IV pela patente (ou pelo NEX 0), com a Profissão
    if (x.categoria >= 1) {
      const lim = c.itens.find((l) => l.categoria === x.categoria);
      if (!lim || lim.limite === 0) o.motivos.push(`Categoria ${romano(x.categoria)}: ${quem} não leva (LR p. 52).`);
      else if (lim.usados + 1 > lim.limite) o.motivos.push(`Limite da patente: categoria ${romano(x.categoria)} já tem ${lim.usados} de ${lim.limite} (LR p. 52).`);
    }
    // a carga: até o dobro dá para levar, sobrecarregado; acima do dobro, não (LR p. 53)
    const depois = c.carga.usados + x.espacos;
    if (depois > c.carga.maximo) o.motivos.push(`Não cabe: ficaria com ${num(depois)} espaços, o máximo é ${num(c.carga.maximo)} (LR p. 53).`);
    else if (x.espacos > 0 && depois > c.carga.espacos) o.avisos.push(`Fica sobrecarregado: ${num(depois)} de ${num(c.carga.espacos)} espaços (−5 na Defesa, −3 m; LR p. 53).`);
    extra(o);
    o.ok = o.motivos.length === 0;
    out.push(o);
  };
  for (const a of cat.CATALOGO.armas) {
    if (NAO_E_ITEM.has(a.id) || !cat.disponivel(a, f.regras)) continue;
    const secao: SecaoItem = a.tipo === 'fogo' ? 'fogo' : a.tipo === 'corpoACorpo' ? 'corpoACorpo' : 'disparo';
    opcao('arma', a, secao, (o) => {
      if (!proficiente(a, profs)) o.avisos.push('Sem proficiência: −2d20 nos ataques com ela.');
      if (a.municao) {
        const m = cat.equipamento(a.municao);
        const temM = tem('equipamento', a.municao) > 0;
        o.municao = { id: a.municao, nome: m?.nome ?? a.municao, tem: temM };
        if (!temM) o.avisos.push(`Usa ${m?.nome ?? a.municao}, e a mochila não tem (LR p. 59).`);
      }
    });
  }
  for (const p of cat.CATALOGO.protecoes) {
    if (!cat.disponivel(p, f.regras)) continue;
    opcao('protecao', p, 'protecao', (o) => {
      // o escudo conta como proteção pesada para a proficiência (LR p. 62)
      const prof: Proficiencia = p.tipo === 'leve' ? 'protecoesLeves' : 'protecoesPesadas';
      if (!profs.has(prof)) o.avisos.push('Sem proficiência: −2d20 nos testes de Força e Agilidade (LR p. 62).');
    });
  }
  for (const e of cat.CATALOGO.equipamentos) {
    if (!cat.disponivel(e, f.regras)) continue;
    opcao('equipamento', e, SECAO_DO_GRUPO[e.grupo]);
  }
  for (const x of cat.CATALOGO.amaldicoados) {
    if (!cat.disponivel(x, f.regras)) continue;
    opcao('amaldicoado', x, 'amaldicoado', (o) => {
      if (c.nex > 0 && f.pp < MALDICAO_PP_MINIMO) o.motivos.push(`Itens amaldiçoados: só a partir de agente especial (${MALDICAO_PP_MINIMO} PP).`);
    });
  }
  return out;
}
