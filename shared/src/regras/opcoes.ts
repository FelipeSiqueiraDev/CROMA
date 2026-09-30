/**
 * O que pode ser escolhido em cada lugar da ficha, com o motivo de cada opção
 * bloqueada ("Precisa de Força 2 (tem 1)"). A tela de criação mostra tudo:
 * liberado para escolher ou travado com o motivo.
 */
import * as cat from './dados';
import { circuloMaximo, montarEstado, type Estado } from './estado';
import type { Ficha, ValorEscolha } from './ficha';
import { atende, descreverRequisito } from './requisitos';
import type { AtributoId, ElementoAfinidade, Nex, PericiaId, Ref, Requisito } from './tipos';
import { ATRIBUTOS, ELEMENTOS_AFINIDADE, GRAUS } from './tipos';

export interface Opcao {
  id: string;
  nome: string;
  ref?: Ref;
  resumo?: string;
  /** pode escolher */
  ok: boolean;
  /** por que não pode */
  motivos: string[];
  /** o que o mestre confere */
  avisos: string[];
  /** requisitos em texto curto */
  requisitos?: string[];
}

function conferir(reqs: Requisito[] | undefined, st: Estado, f: Ficha, nex: Nex, extra: { escolha?: ValorEscolha; elemento?: Opcao['id']; proprio?: string } = {}) {
  const motivos: string[] = [];
  const avisos: string[] = [];
  for (const r of reqs ?? []) {
    const res = atende(r, { estado: st, ficha: f, nex, escolha: extra.escolha, elemento: extra.elemento as never, proprio: extra.proprio });
    motivos.push(...res.motivos);
    avisos.push(...res.avisos);
  }
  return { motivos, avisos, requisitos: (reqs ?? []).map(descreverRequisito) };
}

/** Origens (todas liberadas; o SaH só se a campanha usa). */
export function opcoesOrigem(f: Ficha): Opcao[] {
  return cat.CATALOGO.origens
    .filter((o) => cat.disponivel(o, f.regras))
    .map((o) => ({ id: o.id, nome: o.nome, ref: o.ref, resumo: o.resumo, ok: true, motivos: [], avisos: Array.isArray(o.pericias) ? [] : [o.pericias.texto ? `Perícias: ${o.pericias.texto}.` : 'As perícias desta origem são escolhidas pelo mestre.'] }));
}

/** Classes de agente. */
export function opcoesClasse(): Opcao[] {
  return cat.CATALOGO.classes.filter((c) => c.id !== 'mundano').map((c) => ({ id: c.id, nome: c.nome, ref: c.ref, ok: true, motivos: [], avisos: [] }));
}

/** Trilhas da classe, conferidas em NEX 10%. */
export function opcoesTrilha(f: Ficha): Opcao[] {
  if (!f.classe) return [];
  const st = montarEstado(f, 10, { nex: 10, lugar: 'trilha' });
  return cat.CATALOGO.trilhas
    .filter((t) => t.classe === f.classe && cat.disponivel(t, f.regras))
    .map((t) => {
      const c = conferir(t.requisitos, st, f, 10, { proprio: t.id });
      return { id: t.id, nome: t.nome, ref: t.ref, resumo: t.resumo, ok: !c.motivos.length, ...c };
    });
}

/** Poderes de classe (e gerais do SaH) para o poder do NEX indicado. `lugar`: o poder do NEX ou a versatilidade. */
export function opcoesPoder(f: Ficha, nex: Nex, lugar: 'poder' | 'versatilidade' = 'poder'): Opcao[] {
  if (!f.classe) return [];
  const st = montarEstado(f, nex, { nex, lugar });
  const tem = new Set(st.poderes.map((p) => p.id));
  return cat.CATALOGO.poderes
    .filter((p) => cat.disponivel(p, f.regras) && (p.classes.includes(f.classe!) || p.classes.includes('geral')))
    .map((p) => {
      const c = conferir(p.requisitos, st, f, nex, { proprio: p.id });
      if (!p.repetivel && tem.has(p.id)) c.motivos.unshift('Já escolhido.');
      return { id: p.id, nome: p.nome, ref: p.ref, resumo: p.resumo, ok: !c.motivos.length, ...c };
    });
}

/** Primeiro poder das outras trilhas da classe (versatilidade, NEX 50%). */
export function opcoesVersatilidadeTrilha(f: Ficha): Opcao[] {
  if (!f.classe) return [];
  return cat.CATALOGO.trilhas
    .filter((t) => t.classe === f.classe && t.id !== f.trilha && cat.disponivel(t, f.regras))
    .map((t) => {
      const h = t.habilidades.find((x) => x.nex === 10);
      return { id: t.id, nome: `${t.nome}: ${h?.nome ?? '?'}`, ref: h?.ref ?? t.ref, resumo: h?.resumo, ok: !!h, motivos: h ? [] : ['Trilha sem habilidade de NEX 10%.'], avisos: [] };
    });
}

/** Poderes paranormais para o Transcender do NEX indicado. */
export function opcoesParanormal(f: Ficha, nex: Nex): Opcao[] {
  const st = montarEstado(f, nex, { nex, lugar: 'paranormal' });
  const vezes = new Map<string, number>();
  for (const p of st.poderes) if (p.tipo === 'paranormal') vezes.set(p.id, (vezes.get(p.id) ?? 0) + 1);
  // o Transcender deste NEX firma a afinidade escolhida em 50% (LR p. 114)
  const afinidadeAtiva = st.afinidadeAtiva || (!!st.afinidade && nex >= 50);
  return cat.CATALOGO.paranormais
    .filter((p) => cat.disponivel(p, f.regras))
    .map((p) => {
      const c = conferir(p.requisitos, st, f, nex, { elemento: p.elemento, proprio: p.id });
      const n = vezes.get(p.id) ?? 0;
      // com elemento escolhido (Resistir a <Elemento>), a repetição depende do elemento: confere na escolha
      if (n >= 1 && p.elementoDaEscolha && !p.repetivel) c.avisos.push('De novo: noutro elemento, ou no mesmo com afinidade nele.');
      else if (n >= 1 && !p.repetivel) {
        if (!p.afinidade) c.motivos.unshift('Já escolhido.');
        else if (n >= 2) c.motivos.unshift('Já escolhido com afinidade.');
        else if (!(afinidadeAtiva && st.afinidade === p.elemento)) c.motivos.unshift(`De novo, só com afinidade em ${p.elemento}.`);
      }
      return { id: p.id, nome: p.nome + (n === 1 && p.afinidade ? ' (afinidade)' : ''), ref: p.ref, ok: !c.motivos.length, ...c };
    });
}

/** Rituais que podem ser aprendidos no NEX (círculo liberado, ainda não conhecidos). */
export function opcoesRitual(f: Ficha, nex: Nex, circuloMax?: number): Opcao[] {
  const st = montarEstado(f, nex, { nex, lugar: 'ritual' });
  const max = circuloMax ?? circuloMaximo(st.classe, nex);
  const sabe = new Set(st.rituais.map((r) => r.id));
  return cat.CATALOGO.rituais
    .filter((r) => cat.disponivel(r, f.regras))
    .map((r) => {
      const motivos: string[] = [];
      if (sabe.has(r.id)) motivos.push('Já conhecido.');
      if (r.concedidoPor) motivos.push(`Só vem de ${r.concedidoPor}.`);
      if (r.circulo > max) motivos.push(max ? `É de ${r.circulo}º círculo; agora só até o ${max}º.` : 'Ainda não conjura rituais.');
      return { id: r.id, nome: r.nome, ref: r.ref, ok: !motivos.length, motivos, avisos: [] };
    });
}

/** Aumento de atributo no NEX (até 5). */
export function opcoesAtributo(f: Ficha, nex: Nex): Opcao[] {
  const st = montarEstado(f, nex, { nex, lugar: 'atributo' });
  const NOMES: Record<AtributoId, string> = { agi: 'Agilidade', for: 'Força', int: 'Intelecto', pre: 'Presença', vig: 'Vigor' };
  return ATRIBUTOS.map((a) => {
    const v = st.atributos[a];
    return { id: a, nome: `${NOMES[a]} (${v} → ${v + 1})`, ok: v < 5, motivos: v < 5 ? [] : ['Já está em 5.'], avisos: a === 'int' ? ['Intelecto maior: escolha mais uma perícia treinada.'] : [] };
  });
}

/** Perícias que podem subir no grau de treinamento (35 e 70%). */
export function opcoesGrau(f: Ficha, nex: Nex): Opcao[] {
  const st = montarEstado(f, nex, { nex, lugar: 'grau' });
  return cat.CATALOGO.pericias.map((p) => {
    const g = st.graus[p.id];
    const motivos: string[] = [];
    if (g === 'destreinado') motivos.push('Precisa ser treinada.');
    else if (g === 'expert') motivos.push('Já é expert.');
    else if (g === 'veterano' && nex < 70) motivos.push('Expert só a partir de NEX 70%.');
    const prox = GRAUS[GRAUS.indexOf(g) + 1];
    return { id: p.id, nome: prox && !motivos.length ? `${p.nome} (${g} → ${prox})` : p.nome, ref: p.ref, ok: !motivos.length, motivos, avisos: [] };
  });
}

/** Perícias para treinar (livres da criação, perícia do Intelecto, Treinamento em Perícia...). */
export function opcoesPericia(f: Ficha, nex: Nex, exceto: PericiaId[] = []): Opcao[] {
  const st = montarEstado(f, nex);
  return cat.CATALOGO.pericias.map((p) => {
    const motivos: string[] = [];
    if (st.graus[p.id] !== 'destreinado' && !exceto.includes(p.id)) motivos.push('Já é treinada.');
    return { id: p.id, nome: p.nome, ref: p.ref, ok: !motivos.length, motivos, avisos: [] };
  });
}

/** Elementos de afinidade (NEX 50%). */
export function opcoesAfinidade(): Opcao[] {
  const NOMES: Record<ElementoAfinidade, string> = { sangue: 'Sangue', morte: 'Morte', conhecimento: 'Conhecimento', energia: 'Energia' };
  return ELEMENTOS_AFINIDADE.map((e) => ({ id: e, nome: NOMES[e], ok: true, motivos: [], avisos: [] }));
}
