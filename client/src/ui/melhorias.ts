import { regras } from '@crona/shared';

const romano = (n: number) => (n === 0 ? '0' : n === 4 ? 'IV' : 'I'.repeat(n));

/**
 * As modificações e as maldições de um item como opções da janela de escolha (o motor diz o que
 * pode; LR p. 60 e 144). O mestre passa por cima dos limites: a opção fica liberada, com o motivo
 * escrito como aviso.
 */
export function opcoesMelhoria(f: regras.Ficha, i: number, tipo: 'modificacao' | 'maldicao' | 'todas', mestre: boolean): regras.Opcao[] {
  return regras
    .opcoesDeMelhoria(f, i)
    .filter((o) => tipo === 'todas' || o.tipo === tipo)
    .map((o) => {
      const passa = !o.ok && mestre && !o.tem;
      return {
        id: `${o.tipo}:${o.id}`,
        nome: o.elemento ? `${o.nome} (${regras.NOME_ELEMENTO[o.elemento]})` : o.nome,
        ref: o.ref,
        resumo: o.resumo,
        ok: o.ok || mestre || o.tem,
        motivos: o.ok || mestre || o.tem ? [] : o.motivos,
        avisos: [...(passa ? o.motivos.map((m) => `Passa do limite: ${m}`) : []), ...(o.tem ? [] : [`O item fica na categoria ${romano(o.categoria)}.`]), ...o.avisos],
        requisitos: o.tipo === 'maldicao' ? ['maldição'] : undefined,
      };
    });
}
