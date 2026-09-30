/**
 * Ficha rápida de ameaça: os números que o combate usa, preenchidos pelo
 * mestre a partir do livro (LR p. 178–181; COMBATE.md, seção 17). O catálogo
 * das ameaças do livro fica para a etapa H.
 */
import type { Elemento, TipoDano } from '../regras/tipos';
import { lerTamanho } from './manobra';
import type { AtaqueAmeaca, FichaAmeaca, TesteAmeaca } from './tipos';

export const TIPOS_DANO: TipoDano[] = ['balistico', 'corte', 'impacto', 'perfuracao', 'fisico', 'eletricidade', 'fogo', 'frio', 'quimico', 'mental', 'sangue', 'morte', 'conhecimento', 'energia', 'medo', 'paranormal', 'todos'];

export function fichaAmeacaVazia(): FichaAmeaca {
  return {
    tipo: 'Pessoa',
    defesa: 10,
    fortitude: { dados: 1, bonus: 0 },
    reflexos: { dados: 1, bonus: 0 },
    vontade: { dados: 1, bonus: 0 },
    rd: {},
    imunidades: [],
    vulnerabilidades: [],
    ataques: [],
  };
}

const int = (v: unknown, min: number, max: number, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : padrao);
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const tipoDano = (v: unknown): TipoDano | null => (typeof v === 'string' && (TIPOS_DANO as string[]).includes(v) ? (v as TipoDano) : null);
const ELEMENTOS: Elemento[] = ['sangue', 'morte', 'conhecimento', 'energia', 'medo'];
const elemento = (v: unknown): Elemento | null => (typeof v === 'string' && (ELEMENTOS as string[]).includes(v) ? (v as Elemento) : null);

function teste(v: unknown): TesteAmeaca {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { dados: int(o.dados, -5, 10, 1), bonus: int(o.bonus, -20, 60, 0) };
}

function ataque(v: unknown): AtaqueAmeaca | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const nome = txt(o.nome, 40);
  const dano = txt(o.dano, 30).replace(/[^0-9dD+\-−\s]/g, '');
  if (!nome || !/\d/.test(dano)) return null;
  const alcance = txt(o.alcance, 12);
  return {
    nome,
    pericia: o.pericia === 'pontaria' ? 'pontaria' : 'luta',
    dados: int(o.dados, -5, 10, 1),
    bonus: int(o.bonus, -20, 60, 0),
    dano,
    tipo: tipoDano(o.tipo) ?? 'impacto',
    margem: int(o.margem, 2, 20, 20),
    multiplicador: int(o.multiplicador, 2, 6, 2),
    ...(alcance ? { alcance } : {}),
  };
}

/** Confere a ficha que veio da rede (ou do banco). */
export function lerFichaAmeaca(raw: unknown): FichaAmeaca | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const rd: Partial<Record<TipoDano, number>> = {};
  if (o.rd && typeof o.rd === 'object')
    for (const [k, n] of Object.entries(o.rd as Record<string, unknown>)) {
      const t = tipoDano(k);
      const v = int(n, 0, 99, 0);
      if (t && v > 0) rd[t] = v;
    }
  const lista = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(tipoDano).filter((t): t is TipoDano => !!t))] : []);
  const vd = int(o.vd, 0, 999, -1);
  const notas = txt(o.notas, 300);
  const tamanho = lerTamanho(o.tamanho);
  const el = elemento(o.elemento);
  return {
    tipo: txt(o.tipo, 40) || 'Pessoa',
    ...(vd >= 0 ? { vd } : {}),
    defesa: int(o.defesa, 0, 80, 10),
    fortitude: teste(o.fortitude),
    reflexos: teste(o.reflexos),
    vontade: teste(o.vontade),
    rd,
    imunidades: lista(o.imunidades),
    vulnerabilidades: lista(o.vulnerabilidades),
    ataques: (Array.isArray(o.ataques) ? o.ataques : []).slice(0, 8).map(ataque).filter((a): a is AtaqueAmeaca => !!a),
    ...(tamanho && tamanho !== 'medio' ? { tamanho } : {}),
    ...(o.luta && typeof o.luta === 'object' ? { luta: teste(o.luta) } : {}),
    ...(el ? { elemento: el } : {}),
    ...(notas ? { notas } : {}),
  };
}
