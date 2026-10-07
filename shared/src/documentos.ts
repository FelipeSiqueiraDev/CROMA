/**
 * Documentos da investigação (aba Docs do celular do jogador): relatórios, mapas, e-mails,
 * fotos e pistas que o mestre cria e entrega a um agente ou à equipe. O jogador lê, marca e
 * pode passar para a equipe; criar, mudar e apagar é do mestre.
 */

export type TipoDocumento = 'relatorio' | 'mapa' | 'comunicacao' | 'registro' | 'foto' | 'objeto' | 'outro';
export const TIPOS_DOCUMENTO: { id: TipoDocumento; nome: string }[] = [
  { id: 'relatorio', nome: 'Relatório' },
  { id: 'mapa', nome: 'Mapa' },
  { id: 'comunicacao', nome: 'Comunicação' },
  { id: 'registro', nome: 'Registro' },
  { id: 'foto', nome: 'Foto' },
  { id: 'objeto', nome: 'Objeto' },
  { id: 'outro', nome: 'Outro' },
];

/** O filtro da aba Docs: documento comum, evidência ou pista. */
export type GrupoDocumento = 'documento' | 'evidencia' | 'pista';
export const GRUPOS_DOCUMENTO: { id: GrupoDocumento; nome: string }[] = [
  { id: 'documento', nome: 'Documento' },
  { id: 'evidencia', nome: 'Evidência' },
  { id: 'pista', nome: 'Pista' },
];

export interface Documento {
  id: number;
  titulo: string;
  tipo: TipoDocumento;
  grupo: GrupoDocumento;
  /** de onde veio (Fundação, Médicos...), curto */
  origem?: string;
  /** a imagem (upload do mestre, /uploads/...) */
  imagem?: string;
  /** o texto, uma entrada por página */
  paginas: string[];
  /** as fichas que têm o documento */
  para: number[];
  /** a equipe inteira vê (os agentes da mesma campanha) */
  equipe: boolean;
  /** a campanha do documento (sem = todas) */
  campanha?: number;
  /** as fichas que marcaram o documento */
  marcadoPor?: number[];
  criadoEm: string;
  atualizadoEm: string;
}

export const MAX_DOCUMENTOS = 500;
const MAX_PAGINAS = 30;

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const inteiro = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : undefined);
const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is number => Number.isInteger(x) && x > 0))].slice(0, 50) : []);

/** Confere um documento vindo do cliente (a forma; quem pode mexer é o servidor). */
export function sanitizarDocumento(raw: unknown): Documento | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const titulo = (texto(o.titulo, 100) ?? '').trim();
  if (!titulo) return null;
  const paginas = Array.isArray(o.paginas) ? o.paginas.slice(0, MAX_PAGINAS).map((p) => texto(p, 6000) ?? '') : [];
  const imagem = texto(o.imagem, 200);
  const agora = new Date().toISOString();
  const d: Documento = {
    id: inteiro(o.id, 0, 1e9) ?? 0,
    titulo,
    tipo: TIPOS_DOCUMENTO.some((t) => t.id === o.tipo) ? (o.tipo as TipoDocumento) : 'outro',
    grupo: GRUPOS_DOCUMENTO.some((g) => g.id === o.grupo) ? (o.grupo as GrupoDocumento) : 'documento',
    paginas: paginas.length ? paginas : [''],
    para: ids(o.para),
    equipe: o.equipe === true,
    criadoEm: texto(o.criadoEm, 40) ?? agora,
    atualizadoEm: agora,
  };
  const origem = texto(o.origem, 40)?.trim();
  if (origem) d.origem = origem;
  if (imagem && /^\/uploads\/[a-f0-9]{8,40}\.(png|jpe?g|webp)$/.test(imagem)) d.imagem = imagem;
  const campanha = inteiro(o.campanha, 0, 1e9);
  if (campanha) d.campanha = campanha;
  const marcados = ids(o.marcadoPor);
  if (marcados.length) d.marcadoPor = marcados;
  return d;
}

/** A ficha vê o documento: foi entregue a ela, ou à equipe da campanha dela. */
export function documentoDaFicha(d: Documento, fichaId: number, campanha?: number): boolean {
  if (d.para.includes(fichaId)) return true;
  return d.equipe && (!d.campanha || !campanha || d.campanha === campanha);
}

/** O que o jogador recebe: sem as marcas dos outros. */
export function documentoParaJogador(d: Documento, fichaId: number): Documento {
  const marcado = d.marcadoPor?.includes(fichaId);
  const { marcadoPor: _m, ...resto } = d;
  return { ...resto, ...(marcado ? { marcadoPor: [fichaId] } : {}) };
}

export const nomeTipoDocumento = (t: TipoDocumento) => TIPOS_DOCUMENTO.find((x) => x.id === t)?.nome ?? 'Outro';
