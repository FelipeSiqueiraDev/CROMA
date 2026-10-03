// Os móveis de chão de cada cômodo da Sede, com a pegada (casas), a altura e a folha isométrica de
// referência, em JSON na saída padrão. Quem usa é o scripts/3d/prompt_cima.py (o pedido da vista de cima).
//
//   npx tsx scripts/3d/moveis_de_cima.mts
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Z_PER_M } from '../../shared/src/constants.ts';
import { getFurni } from '../../shared/src/furni.ts';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const seed = readFileSync(path.join(RAIZ, 'server', 'src', 'seedSede.ts'), 'utf-8');
// a folha de cada móvel, pelas fichas de importação
const folha: Record<string, string> = {};
const estados: Record<string, string[]> = {};
const fichas = path.join(RAIZ, 'scripts', '3d', 'fichas');
for (const f of readdirSync(fichas).filter((n) => n.startsWith('moveis-'))) {
  const cfg = JSON.parse(readFileSync(path.join(fichas, f), 'utf-8'));
  for (const m of cfg.moveis ?? []) {
    if (m.folha && !folha[m.def]) folha[m.def] = String(m.folha).split('/').pop()!;
    if (m.estados) estados[m.def] = Object.values(m.estados).map((x) => String(x).split('/').pop()!);
  }
}
const saida: { comodo: string; defs: { id: string; nome: string; w: number; d: number; alto: number; folha?: string; estados?: string[]; kind: string; flat: boolean; vezes: number }[] }[] = [];
for (const p of seed.split(/\n\s*key: '/).slice(1)) {
  const chave = p.split("'")[0];
  const corpo = p.split('links:')[0];
  const chao = corpo.split('wall:')[0];
  const conta: Record<string, number> = {};
  for (const m of chao.matchAll(/\[\s*'([a-z_0-9]+)'\s*,/g)) conta[m[1]] = (conta[m[1]] ?? 0) + 1;
  const lamp = corpo.match(/lamp: '([a-z_]+)'/);
  if (lamp) conta[lamp[1]] = (conta[lamp[1]] ?? 0) + 1;
  const defs = Object.entries(conta)
    .map(([id, vezes]) => {
      const d = getFurni(id);
      if (!d) return null;
      return { id, nome: d.name, w: d.width, d: d.depth, alto: Math.round(((d.height ?? 0) / Z_PER_M) * 100) / 100, folha: folha[id], estados: estados[id], kind: d.kind, flat: !!d.flat, vezes };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  saida.push({ comodo: chave, defs });
}
process.stdout.write(JSON.stringify(saida));
