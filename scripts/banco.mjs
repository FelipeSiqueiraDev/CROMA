// Cuida do banco do CRONA (Postgres no Docker, container crona-postgres).
// (As cópias croma_*.dump são de antes de 03/10, quando o jogo ainda tinha o nome antigo.)
//   node scripts/banco.mjs backup              cópia em server/data/backups/ (guarda as 30 mais novas)
//   node scripts/banco.mjs restaurar <arquivo> --sim   volta o banco para uma cópia (apaga o que está lá)
// A cópia é binária (pg_dump -Fc) e sai de dentro do container com docker cp:
// nada passa pelo terminal, então acento e emoji chegam intactos.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, 'server', 'data', 'backups');
const CONTAINER = 'crona-postgres';
const MANTER = 30;

const docker = (...args) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();

function rodando(container = CONTAINER) {
  try {
    return docker('inspect', '-f', '{{.State.Running}}', container).trim() === 'true';
  } catch {
    return false;
  }
}

function backup() {
  if (!rodando()) throw new Error('O banco não está ligado: rode `npm run banco`.');
  fs.mkdirSync(PASTA, { recursive: true });
  const agora = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const nome = `crona_${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-${p2(agora.getDate())}_${p2(agora.getHours())}-${p2(agora.getMinutes())}-${p2(agora.getSeconds())}.dump`;
  docker('exec', CONTAINER, 'pg_dump', '-U', 'crona', '-d', 'crona', '-Fc', '-f', '/tmp/crona.dump');
  docker('cp', `${CONTAINER}:/tmp/crona.dump`, path.join(PASTA, nome));
  docker('exec', CONTAINER, 'rm', '-f', '/tmp/crona.dump');
  const todos = fs.readdirSync(PASTA).filter((f) => f.startsWith('crona_') && f.endsWith('.dump')).sort();
  for (const velho of todos.slice(0, Math.max(0, todos.length - MANTER))) fs.rmSync(path.join(PASTA, velho));
  const kb = Math.round(fs.statSync(path.join(PASTA, nome)).size / 1024);
  console.log(`[banco] cópia salva: server/data/backups/${nome} (${kb} KB)`);
}

function restaurar(arquivo, sim) {
  if (!arquivo) throw new Error('Diga qual cópia: npm run banco:restaurar -- server/data/backups/<arquivo>.dump --sim');
  const origem = path.resolve(arquivo);
  if (!fs.existsSync(origem)) throw new Error(`Não achei ${origem}.`);
  if (!sim) {
    console.log('[banco] Isto APAGA o que está no banco agora e põe a cópia no lugar.');
    console.log('[banco] Desligue o servidor do CRONA antes e repita com --sim para confirmar.');
    return;
  }
  // o jogo do Docker guarda tudo na memória: ligado, ele gravaria por cima da cópia restaurada
  if (rodando('crona-app')) throw new Error('O jogo do Docker está ligado: rode `npm run crona:parar` antes.');
  if (!rodando()) throw new Error('O banco não está ligado: rode `npm run banco`.');
  docker('cp', origem, `${CONTAINER}:/tmp/restaurar.dump`);
  docker('exec', CONTAINER, 'pg_restore', '-U', 'crona', '-d', 'crona', '--clean', '--if-exists', '--no-owner', '/tmp/restaurar.dump');
  docker('exec', CONTAINER, 'rm', '-f', '/tmp/restaurar.dump');
  console.log(`[banco] banco restaurado de ${path.basename(origem)}.`);
}

const [cmd, ...resto] = process.argv.slice(2);
try {
  if (cmd === 'backup') backup();
  else if (cmd === 'restaurar') restaurar(resto.find((a) => !a.startsWith('--')), resto.includes('--sim'));
  else console.log('Use: node scripts/banco.mjs backup | restaurar <arquivo> --sim');
} catch (e) {
  console.error(`[banco] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
