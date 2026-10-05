/**
 * Veríssimo: o que mudou nas regras e nas fichas desde a última conferência.
 *
 * Guarda em server/data/verissimo/ (fora do git) uma cópia dos arquivos de
 * regra conferidos e, de cada ficha, as escolhas por NEX e os números que o
 * motor calculou. Assim o /verissimo confere só o que é novo: um NEX a mais,
 * uma escolha trocada, um número que mudou porque o código mudou.
 *
 * Uso (da raiz do projeto):
 *   npx tsx .claude/skills/verissimo/verissimo.ts pendente [codigo|fichas|<ficha>] [tudo]
 *   npx tsx .claude/skills/verissimo/verissimo.ts diff <arquivo>
 *   npx tsx .claude/skills/verissimo/verissimo.ts ficha <id ou nome>
 *   npx tsx .claude/skills/verissimo/verissimo.ts marcar [codigo|fichas|<ficha>|tudo] [--nota "texto"]
 *   npx tsx .claude/skills/verissimo/verissimo.ts base [--nota "texto"]
 *   npx tsx .claude/skills/verissimo/verissimo.ts historico
 *
 * Só lê o banco (nunca grava nele) e só escreve em server/data/verissimo/.
 * Sai sempre com código 0: um erro vira texto, para o /verissimo não abortar.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import * as regras from '../../../shared/src/regras';
import type { FichaSalva } from '../../../shared/src/fichas';

type Ficha = regras.Ficha;

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PASTA = path.join(RAIZ, 'server/data/verissimo');
const ARQ_ESTADO = path.join(PASTA, 'estado.json');
const PASTA_COPIAS = path.join(PASTA, 'conferido');
const CMD = 'npx tsx .claude/skills/verissimo/verissimo.ts';

/** Arquivos que o Veríssimo acompanha (pastas entram inteiras). */
const RASTREADOS = [
  'shared/src/regras',
  'shared/src/combate',
  'server/src/combate',
  'shared/src/vitals.ts',
  'shared/src/dice.ts',
  'shared/src/fichas.ts',
  'client/src/ui/fichaRegras.ts',
  'server/test/regras.test.ts',
  'server/test/combate.test.ts',
  'docs/REGRAS.md',
  'docs/COMBATE.md',
  'docs/AUDITORIA-REGRAS.md',
  'docs/CRIACAO-DE-PERSONAGEM.md',
];

/** Linhas de diff mostradas por arquivo no `pendente` (o resto sai no `diff <arquivo>`). */
const MAX_LINHAS_DIFF = 160;

type Resumo = Record<string, string>;

interface FichaConferida {
  nome: string;
  nex: number;
  /** as escolhas inteiras, para refazer as contas com o código de agora */
  ficha?: Ficha;
  /** escolhas por lugar ("criação", "NEX 25%", "mochila"...), em JSON */
  passos: Record<string, string>;
  /** números e listas que o motor calculou na conferência */
  resumo: Resumo;
  em: string;
}

interface Estado {
  versao: 1;
  codigo?: { commit: string; em: string };
  fichas: Record<string, FichaConferida>;
  historico: { em: string; tipo: 'base' | 'conferencia'; escopo: string; commit: string; nota?: string }[];
}

// ------------------------------------------------------------------ utilidades

const dois = (n: number) => String(n).padStart(2, '0');
/** Data e hora locais: "2026-09-30 07:12". */
function local(d: Date | string = new Date()): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${dois(x.getMonth() + 1)}-${dois(x.getDate())} ${dois(x.getHours())}:${dois(x.getMinutes())}`;
}
/** Nome do relatório desta conferência, na hora local: "2026-09-30-07h12.md". */
const nomeRelatorio = (d = new Date()) => `${local(d).slice(0, 10)}-${dois(d.getHours())}h${dois(d.getMinutes())}.md`;
const rel =(p: string) => path.relative(RAIZ, p).split(path.sep).join('/');

function lerEstado(): Estado | null {
  if (!fs.existsSync(ARQ_ESTADO)) return null;
  return JSON.parse(fs.readFileSync(ARQ_ESTADO, 'utf8')) as Estado;
}

function gravarEstado(e: Estado) {
  fs.mkdirSync(PASTA, { recursive: true });
  fs.writeFileSync(ARQ_ESTADO, JSON.stringify(e, null, 2) + '\n', 'utf8');
}

function git(...args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    // git diff sai com 1 quando há diferença: o texto vem mesmo assim
    const out = (e as { stdout?: string }).stdout;
    return typeof out === 'string' ? out.trim() : '';
  }
}

function listarArquivos(): string[] {
  const out: string[] = [];
  const andar = (abs: string) => {
    if (!fs.existsSync(abs)) return;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      for (const nome of fs.readdirSync(abs)) andar(path.join(abs, nome));
    } else if (st.isFile()) out.push(rel(abs));
  };
  for (const r of RASTREADOS) andar(path.join(RAIZ, r));
  return out.sort();
}

function listarCopias(): string[] {
  const out: string[] = [];
  const andar = (abs: string) => {
    if (!fs.existsSync(abs)) return;
    for (const nome of fs.readdirSync(abs)) {
      const p = path.join(abs, nome);
      if (fs.statSync(p).isDirectory()) andar(p);
      else out.push(path.relative(PASTA_COPIAS, p).split(path.sep).join('/'));
    }
  };
  andar(PASTA_COPIAS);
  return out.sort();
}

const lerTexto = (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null);

/** Diff unificado entre a cópia conferida e o arquivo de agora. */
function diffArquivo(arquivo: string): string {
  const copia = path.join(PASTA_COPIAS, arquivo);
  const atual = path.join(RAIZ, arquivo);
  const vazio = path.join(PASTA, '.vazio');
  fs.mkdirSync(PASTA, { recursive: true });
  if (!fs.existsSync(vazio)) fs.writeFileSync(vazio, '');
  const a = fs.existsSync(copia) ? copia : vazio;
  const b = fs.existsSync(atual) ? atual : vazio;
  const out = git('diff', '--no-index', '--no-color', '-U3', '--ignore-cr-at-eol', a, b);
  // tira os caminhos locais do cabeçalho
  return out
    .split('\n')
    .filter((l) => !l.startsWith('diff --git') && !l.startsWith('index ') && !l.startsWith('--- ') && !l.startsWith('+++ '))
    .join('\n');
}

function contarDiff(d: string) {
  let mais = 0;
  let menos = 0;
  for (const l of d.split('\n')) {
    if (l.startsWith('+')) mais++;
    else if (l.startsWith('-')) menos++;
  }
  return { mais, menos };
}

// ------------------------------------------------------------------ fichas

function lerEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  const txt = lerTexto(path.join(RAIZ, 'server/.env'));
  for (const l of (txt ?? '').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

/** As fichas do banco (só leitura). Sem CRONA_DB_URL, lê o db.json. `ok` = conseguiu ler. */
async function lerFichas(): Promise<{ fichas: FichaSalva[]; ok: boolean; aviso?: string }> {
  const env = lerEnv();
  const url = process.env.CRONA_DB_URL ?? env.CRONA_DB_URL;
  if (!url) {
    const txt = lerTexto(path.join(RAIZ, 'server/data/db.json'));
    if (!txt) return { fichas: [], ok: false, aviso: 'sem CRONA_DB_URL e sem server/data/db.json: não há fichas para ler' };
    const db = JSON.parse(txt) as { fichas?: FichaSalva[] };
    return { fichas: db.fichas ?? [], ok: true, aviso: 'sem CRONA_DB_URL: fichas lidas do server/data/db.json' };
  }
  const sql = postgres(url, { max: 1, connect_timeout: 5, onnotice: () => {} });
  try {
    const linhas = await sql<{ dados: FichaSalva }[]>`select dados from fichas order by id`;
    return { fichas: linhas.map((l) => (typeof l.dados === 'string' ? JSON.parse(l.dados) : l.dados)), ok: true };
  } catch (e) {
    return { fichas: [], ok: false, aviso: `não consegui ler o banco (${e instanceof Error ? e.message : String(e)}). Suba com \`npm run banco\`.` };
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

function passosDe(f: Ficha): Record<string, string> {
  const p: Record<string, string> = {};
  p['criação'] = JSON.stringify({
    classe: f.classe,
    origem: f.origem,
    atributos: f.atributos,
    pericias: f.pericias,
    profissao: f.profissao ?? null,
    comecouMundano: f.comecouMundano,
    regras: f.regras,
  });
  p['trilha'] = JSON.stringify(f.trilha);
  for (const nex of regras.NEX_LISTA) {
    const e = f.progressao[nex];
    if (e && Object.keys(e).length) p[`NEX ${nex}%`] = JSON.stringify(e);
  }
  p['NEX atual'] = JSON.stringify(f.nex);
  p['mochila'] = JSON.stringify(f.inventario);
  p['prestígio (PP)'] = JSON.stringify(f.pp);
  p['ajustes do mestre'] = JSON.stringify(f.ajustes ?? null);
  p['perdas permanentes'] = JSON.stringify(f.perdas ?? null);
  return p;
}

function resumoDe(f: Ficha): Resumo {
  const c = regras.calcular(f);
  const r: Resumo = {};
  const por = (k: string, v: string) => {
    let chave = k;
    for (let i = 2; chave in r; i++) chave = `${k} #${i}`;
    r[chave] = v;
  };
  por('NEX', `${c.nex}%`);
  por('classe', c.classe);
  por('patente', c.patente ? `${c.patente.nome} (crédito ${c.patente.credito})` : '—');
  for (const k of regras.ATRIBUTOS) por(`atributo ${k.toUpperCase()}`, String(c.atributos[k]));
  por('PV máx', String(c.pv));
  por('PE máx', String(c.pe));
  por('SAN máx', String(c.san));
  por('limite de PE', String(c.limitePe));
  por('limite de PE (rituais)', String(c.limitePeRituais));
  por('Defesa', String(c.defesa));
  por('Defesa da proteção', String(c.protecao));
  por('deslocamento', `${c.deslocamento} m`);
  por('carga', `${c.carga.usados}/${c.carga.espacos} (máx ${c.carga.maximo})${c.carga.sobrecarregado ? ', sobrecarregado' : ''}`);
  por('DT rituais', String(c.dtRituais));
  for (const k of regras.ATRIBUTOS) por(`DT habilidades ${k.toUpperCase()}`, String(c.dtHabilidades[k]));
  // todas as perícias: um atributo que sobe muda os dados até das destreinadas
  for (const [id, p] of Object.entries(c.pericias))
    por(`perícia ${id}`, `${p.grau}, ${p.dados}d20${p.bonus >= 0 ? '+' : ''}${p.bonus}${p.penalidadeDados ? ` (${p.penalidadeDados}d20)` : ''} (${p.atributo})${p.podeUsar ? '' : ', não pode usar'}`);
  for (const [tipo, v] of Object.entries(c.resistencias)) por(`resistência ${tipo}`, String(v));
  por('esquiva', c.reacoes.esquiva === null ? '—' : String(c.reacoes.esquiva));
  por('bloqueio', c.reacoes.bloqueio === null ? '—' : String(c.reacoes.bloqueio));
  por('contra-ataque', c.reacoes.contraAtaque ? 'sim' : 'não');
  por('proficiências', [...c.proficiencias].sort().join(', '));
  for (const p of c.poderes) por(`poder ${p.nome}`, `${p.tipo}, NEX ${p.nex}%${p.via ? `, ${p.via}` : ''}${p.escolha ? `, ${JSON.stringify(p.escolha)}` : ''}${p.elemento ? `, ${p.elemento}` : ''}`);
  for (const rt of c.rituais) {
    const custo = c.custoRituais[rt.id];
    por(`ritual ${regras.catalogo.ritual(rt.id)?.nome ?? rt.id}`, `NEX ${rt.nex}%, ${rt.via}${custo ? `, ${custo.pe} PE, DT ${custo.dt}` : ''}`);
  }
  por('rituais por poder', `${c.rituaisPorPoder.usados}/${c.rituaisPorPoder.limite}`);
  for (const l of c.itens) por(`itens categoria ${['0', 'I', 'II', 'III', 'IV'][l.categoria]}`, `${l.usados}/${l.limite}`);
  for (const a of c.ataques)
    por(
      `ataque ${a.nome}`,
      `${a.pericia} ${a.dados}d20${a.bonus >= 0 ? '+' : ''}${a.bonus}${a.penalidadeDados ? ` (${a.penalidadeDados}d20)` : ''}, dano ${a.dano}, crítico ${a.critico.margem}/x${a.critico.multiplicador}${a.alcance ? `, ${a.alcance}` : ''}, ${a.tipoDano.join('/')}${a.notas.length ? `; ${a.notas.join('; ')}` : ''}`,
    );
  for (const x of c.condicionais) por(`condicional ${x.origem}`, x.texto);
  for (const x of c.pendencias) por(`pendência NEX ${x.nex}% ${x.tipo}`, x.texto);
  for (const x of c.problemas) por(`problema NEX ${x.nex}% ${x.onde}`, `${x.severidade}: ${x.texto}`);
  return r;
}

const fmtRef = (r?: { fonte: string; pagina: number }) => (r ? `${r.fonte} p. ${r.pagina}` : 'sem página');

/** Páginas do livro que interessam para conferir um lugar da ficha. */
function paginasDoPasso(f: Ficha, lugar: string): string[] {
  const cat = regras.catalogo;
  const out = new Set<string>();
  const classe = f.classe ? cat.classe(f.classe) : null;
  const trilha = f.trilha ? cat.trilha(f.trilha) : undefined;
  const poderRef = (id?: string) => {
    if (!id) return;
    const p = cat.poder(id) ?? cat.paranormal(id);
    out.add(`${p?.nome ?? id}: ${fmtRef(p?.ref)}`);
  };
  if (lugar === 'criação') {
    if (classe) out.add(`classe ${classe.nome}: ${fmtRef(classe.ref)}`);
    const o = f.origem ? cat.origem(f.origem) : undefined;
    if (o) out.add(`origem ${o.nome}: ${fmtRef(o.ref)}`);
    out.add('atributos e perícias na criação: LR p. 14–15, 38–40');
  } else if (lugar === 'trilha') {
    if (trilha) out.add(`trilha ${trilha.nome}: ${fmtRef(trilha.ref)}`);
  } else if (lugar.startsWith('NEX ') && lugar !== 'NEX atual') {
    const nex = Number(lugar.slice(4, -1)) as regras.Nex;
    out.add('tabela de progressão por NEX: LR p. 23');
    if (classe) {
      out.add(`classe ${classe.nome}: ${fmtRef(classe.ref)}`);
      for (const h of classe.habilidades) {
        const escala = regras.catalogo.ESCALAS_CLASSE[h.id]?.find((x) => x.nex === nex);
        if (h.nex === nex || escala) out.add(`${h.nome}${escala ? ` (${escala.texto})` : ''}: ${fmtRef(h.ref)}`);
      }
    }
    if (trilha) for (const h of trilha.habilidades) if (h.nex === nex) out.add(`${trilha.nome}, ${h.nome}: ${fmtRef(h.ref)}`);
    const e = f.progressao[nex];
    if (e) {
      poderRef(e.poder?.id);
      poderRef(e.poder?.escolha?.poder);
      poderRef(e.versatilidade?.poder?.id);
      if (e.versatilidade?.trilha) {
        const t = cat.trilha(e.versatilidade.trilha);
        out.add(`versatilidade, trilha ${t?.nome ?? e.versatilidade.trilha}: ${fmtRef(t?.habilidades[0]?.ref ?? t?.ref)}`);
      }
      for (const id of e.rituais ?? []) out.add(`ritual ${cat.ritual(id)?.nome ?? id}: ${fmtRef(cat.ritual(id)?.ref)}`);
      for (const v of Object.values(e.parametros ?? {})) {
        poderRef(v.poder);
        for (const id of v.rituais ?? []) out.add(`ritual ${cat.ritual(id)?.nome ?? id}: ${fmtRef(cat.ritual(id)?.ref)}`);
      }
    }
  } else if (lugar === 'mochila') {
    for (const it of f.inventario) {
      const item = it.tipo === 'arma' ? cat.arma(it.id) : it.tipo === 'protecao' ? cat.protecao(it.id) : it.tipo === 'equipamento' ? cat.equipamento(it.id) : cat.amaldicoado(it.id);
      out.add(`${item?.nome ?? it.id}: ${fmtRef(item?.ref)}`);
      for (const m of it.modificacoes ?? []) out.add(`modificação ${cat.modificacao(m)?.nome ?? m}: ${fmtRef(cat.modificacao(m)?.ref)}`);
      for (const m of it.maldicoes ?? []) out.add(`maldição ${cat.maldicao(m)?.nome ?? m}: ${fmtRef(cat.maldicao(m)?.ref)}`);
    }
    out.add('carga, categorias e patente: LR p. 51–53');
  } else if (lugar === 'prestígio (PP)') {
    out.add('patentes: LR p. 51–53');
  }
  return [...out];
}

function acharFicha(fichas: FichaSalva[], alvo: string): FichaSalva | undefined {
  const t = alvo.trim().toLowerCase();
  return fichas.find((f) => String(f.id) === t) ?? fichas.find((f) => f.nome.toLowerCase() === t) ?? fichas.find((f) => f.nome.toLowerCase().includes(t));
}

/** Linhas "chave: antes → depois" entre dois resumos. */
function difResumo(a: Resumo | undefined, b: Resumo): string[] {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b)])) {
    const x = a?.[k];
    const y = b[k];
    if (x === y) continue;
    if (x === undefined) out.push(`  - ${k}: ${y}`);
    else if (y === undefined) out.push(`  - ${k}: saiu (era ${x})`);
    else out.push(`  - ${k}: ${x} → ${y}`);
  }
  return out;
}

// ------------------------------------------------------------------ saída

/** Quantos arquivos mudaram e as linhas da seção. */
function blocoCodigo(estado: Estado | null, tudo: boolean): { linhas: string[]; mudou: number } {
  const out: string[] = ['## Código e documentos de regra'];
  const atuais = listarArquivos();
  const copias = new Set(listarCopias());
  const mudados: { arquivo: string; tipo: 'novo' | 'mudou' | 'apagado' }[] = [];
  for (const a of atuais) {
    const antes = lerTexto(path.join(PASTA_COPIAS, a));
    if (antes === null) mudados.push({ arquivo: a, tipo: 'novo' });
    else if (tudo || antes !== lerTexto(path.join(RAIZ, a))) mudados.push({ arquivo: a, tipo: 'mudou' });
  }
  for (const c of copias) if (!atuais.includes(c)) mudados.push({ arquivo: c, tipo: 'apagado' });
  if (!estado?.codigo) out.push('', 'Ainda sem conferência registrada do código (rode `base` depois de uma conferência completa).');
  else out.push('', `Última conferência do código: ${local(estado.codigo.em)} (commit ${estado.codigo.commit}). As diferenças abaixo são contra a cópia guardada do que foi conferido, não contra o git.`);
  if (!mudados.length) {
    out.push('', 'Nada mudou desde a última conferência.');
    return { linhas: out, mudou: 0 };
  }
  out.push('', `${mudados.length} arquivo(s):`);
  const diffs: string[] = [];
  for (const m of mudados) {
    if (m.tipo === 'apagado') {
      out.push(`- ${m.arquivo}: apagado`);
      continue;
    }
    if (tudo && m.tipo === 'mudou') {
      out.push(`- ${m.arquivo}: conferir inteiro (pedido "tudo")`);
      continue;
    }
    const d = diffArquivo(m.arquivo);
    const { mais, menos } = contarDiff(d);
    out.push(`- ${m.arquivo}: ${m.tipo === 'novo' ? 'novo' : 'mudou'} (+${mais} −${menos})`);
    const linhas = d.split('\n');
    const corte = linhas.length > MAX_LINHAS_DIFF;
    diffs.push(
      `### ${m.arquivo}`,
      '```diff',
      ...linhas.slice(0, MAX_LINHAS_DIFF),
      '```',
      ...(corte ? [`(diff cortado em ${MAX_LINHAS_DIFF} de ${linhas.length} linhas: o resto sai com \`${CMD} diff ${m.arquivo}\`)`] : []),
    );
  }
  if (diffs.length) out.push('', ...diffs);
  return { linhas: out, mudou: mudados.length };
}

function blocoFicha(fs_: FichaSalva, antes: FichaConferida | undefined, tudo: boolean): string[] | null {
  const f = fs_.ficha;
  const passos = passosDe(f);
  let resumo: Resumo;
  try {
    resumo = resumoDe(f);
  } catch (e) {
    return [`### ${fs_.nome} (ficha ${fs_.id})`, `- o motor deu erro ao calcular: ${e instanceof Error ? e.message : String(e)}`];
  }
  const base = tudo ? undefined : antes;
  const out: string[] = [`### ${fs_.nome} (ficha ${fs_.id}): ${f.classe ?? 'sem classe'}, NEX ${f.nex}% (conferida: ${antes ? `NEX ${antes.nex}%, ${local(antes.em)}` : 'nunca'})`];

  // escolhas
  const mudouEscolha: string[] = [];
  for (const l of new Set([...Object.keys(passos), ...Object.keys(base?.passos ?? {})])) {
    const a = base?.passos[l];
    const b = passos[l];
    if (a === b || l === 'NEX atual') continue;
    mudouEscolha.push(l);
    if (a === undefined) out.push(`- ${l}: novo → ${b}`);
    else if (b === undefined) out.push(`- ${l}: saiu (era ${a})`);
    else out.push(`- ${l}: ${a} → ${b}`);
    const pgs = paginasDoPasso(f, l);
    if (pgs.length) out.push(`  - páginas: ${pgs.join('; ')}`);
  }
  const mudouNex = !!base && base.passos['NEX atual'] !== passos['NEX atual'];
  if (mudouNex) out.push(`- NEX: ${base!.passos['NEX atual']}% → ${passos['NEX atual']}%`);

  // números
  let porCodigo: string[] = [];
  let porEscolha: string[];
  if (!base) porEscolha = difResumo(undefined, resumo);
  else if (base.ficha) {
    // refaz as escolhas antigas com o código de agora: separa o que o código mudou do que as escolhas mudaram
    let antigoHoje: Resumo | null = null;
    try {
      antigoHoje = resumoDe(base.ficha);
    } catch {
      antigoHoje = null;
    }
    if (antigoHoje) {
      porCodigo = difResumo(base.resumo, antigoHoje);
      porEscolha = difResumo(antigoHoje, resumo);
    } else porEscolha = difResumo(base.resumo, resumo);
  } else porEscolha = difResumo(base.resumo, resumo);

  if (!mudouEscolha.length && !mudouNex && !porCodigo.length && !porEscolha.length) return null;
  if (!base) out.push('- números calculados (ficha ainda não conferida):', ...porEscolha);
  else {
    if (porEscolha.length) out.push(`- números que mudaram ${base.ficha ? 'pelas escolhas' : '(escolhas ou código)'}:`, ...porEscolha);
    if (porCodigo.length) out.push('- números que mudaram pelo código (as escolhas antigas, calculadas com o código de agora):', ...porCodigo);
  }
  return out;
}

async function blocoFichas(estado: Estado | null, alvo: string | null, tudo: boolean): Promise<{ linhas: string[]; mudou: number; ok: boolean }> {
  const out: string[] = ['## Fichas'];
  const { fichas, ok, aviso } = await lerFichas();
  if (aviso) out.push('', `Aviso: ${aviso}`);
  if (!ok) return { linhas: [...out, '', 'Fichas não conferidas nesta vez.'], mudou: 0, ok };
  let lista = fichas;
  if (alvo) {
    const f = acharFicha(fichas, alvo);
    if (!f) return { linhas: [...out, '', `Não achei a ficha "${alvo}". Fichas: ${fichas.map((x) => `${x.id} ${x.nome}`).join(', ') || 'nenhuma'}.`], mudou: 0, ok: false };
    lista = [f];
  }
  const blocos: string[] = [];
  let mudou = 0;
  for (const f of lista) {
    const b = blocoFicha(f, estado?.fichas[String(f.id)], tudo);
    if (b) {
      blocos.push('', ...b);
      mudou++;
    }
  }
  const apagadas = alvo ? [] : Object.entries(estado?.fichas ?? {}).filter(([id]) => !fichas.some((f) => String(f.id) === id));
  for (const [id, f] of apagadas) {
    blocos.push('', `### ${f.nome} (ficha ${id}): apagada do banco`);
    mudou++;
  }
  if (!blocos.length) out.push('', 'Nenhuma ficha mudou desde a última conferência.');
  else out.push(...blocos);
  return { linhas: out, mudou, ok };
}

async function pendente(args: string[]) {
  const estado = lerEstado();
  const tudo = args.includes('tudo');
  const escopo = args.filter((a) => a !== 'tudo').join(' ').trim();
  if (escopo === 'base' || escopo === 'historico' || escopo === 'histórico') {
    console.log(`# Veríssimo\n\nPedido: ${escopo}. Nada para listar aqui.\n\nConferências registradas:`);
    historico();
    return;
  }
  const out: string[] = ['# Veríssimo: o que falta conferir', '', `Agora: ${local()}.`];
  if (!estado) out.push('Primeira vez: não há conferência registrada. Tudo aparece como novo.');
  else {
    const u = estado.historico[estado.historico.length - 1];
    if (u) out.push(`Última conferência: ${local(u.em)} (${u.tipo}, ${u.escopo}${u.nota ? `: ${u.nota}` : ''}).`);
  }
  const codigo = !escopo || escopo === 'codigo' || escopo === 'código';
  const soCodigo = escopo === 'codigo' || escopo === 'código';
  let total = 0;
  let fichasOk = true;
  if (codigo) {
    const c = blocoCodigo(estado, tudo);
    out.push('', ...c.linhas);
    total += c.mudou;
  }
  if (!soCodigo) {
    const fx = await blocoFichas(estado, escopo && escopo !== 'fichas' ? escopo : null, tudo);
    out.push('', ...fx.linhas);
    total += fx.mudou;
    fichasOk = fx.ok;
  }
  // o que registrar no fim
  const alvoMarcar = !escopo ? (fichasOk ? 'tudo' : 'codigo') : soCodigo ? 'codigo' : escopo === 'fichas' ? 'fichas' : `"${escopo}"`;
  out.push('', '## Ao terminar');
  if (!total) out.push('', 'Nada a conferir: não escreva relatório nem registre nada.');
  else if (!fichasOk && !codigo) out.push('', 'As fichas não puderam ser lidas: não registre nada.');
  else
    out.push(
      '',
      `- relatório: docs/verissimo/relatorios/${nomeRelatorio()}`,
      `- registro: ${CMD} marcar ${alvoMarcar} --nota "resumo curto"${!fichasOk && !soCodigo ? ' (só o código: as fichas não puderam ser lidas)' : ''}`,
    );
  console.log(out.join('\n'));
}

async function verFicha(args: string[]) {
  const { fichas, aviso } = await lerFichas();
  if (aviso) console.log(`Aviso: ${aviso}`);
  const f = acharFicha(fichas, args.join(' '));
  if (!f) {
    console.log(`Não achei a ficha "${args.join(' ')}". Fichas: ${fichas.map((x) => `${x.id} ${x.nome}`).join(', ') || 'nenhuma'}.`);
    return;
  }
  const out = [`# ${f.nome} (ficha ${f.id})`, '', '## Escolhas'];
  for (const [l, v] of Object.entries(passosDe(f.ficha))) out.push(`- ${l}: ${v}`);
  out.push('', '## Números do motor');
  for (const [k, v] of Object.entries(resumoDe(f.ficha))) out.push(`- ${k}: ${v}`);
  console.log(out.join('\n'));
}

async function marcar(args: string[], tipo: 'base' | 'conferencia') {
  const iNota = args.indexOf('--nota');
  const nota = iNota >= 0 ? args.slice(iNota + 1).join(' ').trim() : undefined;
  const escopoArgs = iNota >= 0 ? args.slice(0, iNota) : args;
  const escopo = tipo === 'base' ? 'tudo' : escopoArgs.join(' ').replace(/^"|"$/g, '').trim() || 'tudo';
  const estado: Estado = lerEstado() ?? { versao: 1, fichas: {}, historico: [] };
  const commit = git('rev-parse', '--short', 'HEAD') || '?';
  const sujo = git('status', '--porcelain', '--', ...RASTREADOS).length > 0;
  const feito: string[] = [];
  const avisos: string[] = [];

  if (escopo === 'tudo' || escopo === 'codigo' || escopo === 'código') {
    fs.rmSync(PASTA_COPIAS, { recursive: true, force: true });
    const arquivos = listarArquivos();
    for (const a of arquivos) {
      const destino = path.join(PASTA_COPIAS, a);
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.copyFileSync(path.join(RAIZ, a), destino);
    }
    estado.codigo = { commit: commit + (sujo ? ' + mudanças sem commit' : ''), em: new Date().toISOString() };
    feito.push(`código (${arquivos.length} arquivos)`);
  }
  if (escopo !== 'codigo' && escopo !== 'código') {
    const { fichas, ok, aviso } = await lerFichas();
    if (!ok) avisos.push(`fichas não marcadas: ${aviso}`);
    else {
      const todas = escopo === 'tudo' || escopo === 'fichas';
      const lista = todas ? fichas : [acharFicha(fichas, escopo)].filter((x): x is FichaSalva => !!x);
      if (!todas && !lista.length) avisos.push(`não achei a ficha "${escopo}": nada marcado nas fichas`);
      for (const f of lista) {
        estado.fichas[String(f.id)] = { nome: f.nome, nex: f.ficha.nex, ficha: f.ficha, passos: passosDe(f.ficha), resumo: resumoDe(f.ficha), em: new Date().toISOString() };
        feito.push(`${f.nome} (NEX ${f.ficha.nex}%)`);
      }
      if (todas) for (const id of Object.keys(estado.fichas)) if (!fichas.some((f) => String(f.id) === id)) delete estado.fichas[id];
    }
  }
  if (!feito.length) {
    console.log(`Nada marcado. ${avisos.join(' ')}`);
    return;
  }
  estado.historico.push({ em: new Date().toISOString(), tipo, escopo, commit, ...(nota ? { nota } : {}) });
  estado.historico = estado.historico.slice(-200);
  gravarEstado(estado);
  console.log(`Marcado como conferido: ${feito.join('; ')}.${avisos.length ? ` Atenção: ${avisos.join(' ')}` : ''}`);
}

function historico() {
  const e = lerEstado();
  if (!e?.historico.length) {
    console.log('Nenhuma conferência registrada.');
    return;
  }
  for (const h of e.historico.slice(-30)) console.log(`- ${local(h.em)} ${h.tipo} (${h.escopo}), commit ${h.commit}${h.nota ? `: ${h.nota}` : ''}`);
}

async function main() {
  const [cmd = 'pendente', ...args] = process.argv.slice(2);
  if (cmd === 'pendente') await pendente(args);
  else if (cmd === 'diff') console.log(args[0] ? diffArquivo(args[0]) || 'Sem diferença.' : 'Diga o arquivo: diff <arquivo>');
  else if (cmd === 'ficha') await verFicha(args);
  else if (cmd === 'marcar') await marcar(args, 'conferencia');
  else if (cmd === 'base') await marcar(args, 'base');
  else if (cmd === 'historico') historico();
  else console.log('Comandos: pendente [codigo|fichas|<ficha>] [tudo], diff <arquivo>, ficha <id|nome>, marcar [escopo] [--nota texto], base [--nota texto], historico');
}

main().catch((e) => {
  console.log(`Erro no verissimo.ts: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
});
