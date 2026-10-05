// A cópia do banco para os testes visuais (crona_visual): o banco de verdade (crona) só é lido.
//
//   node scripts/dev/visual.mjs criar    faz a cópia (com pg_dump: o jogo do Docker pode estar no ar)
//   node scripts/dev/visual.mjs apagar   apaga a cópia
//   node scripts/dev/visual.mjs subir    sobe o `npm run dev` apontando para a cópia (cria se faltar)
//
// O "crona-visual" do .claude/launch.json roda o `subir`: o painel do navegador do app abre o jogo
// nessa cópia, e mexer nas peças lá não estraga as sessões de verdade.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = fs.readFileSync(path.join(REPO, 'server', '.env'), 'utf8');
// o nome antigo (CROMA_DB_URL) continua valendo
const url = (/^CRONA_DB_URL=(.*)$/m.exec(env) ?? /^CROMA_DB_URL=(.*)$/m.exec(env))?.[1]?.trim();
if (!url) throw new Error('sem CRONA_DB_URL no server/.env');
const user = decodeURIComponent(/^postgres(?:ql)?:\/\/([^:@/]+)/.exec(url)?.[1] ?? '');
if (!user) throw new Error('sem usuário no CRONA_DB_URL');
const psql = (sql) => execFileSync('docker', ['exec', 'crona-postgres', 'psql', '-U', user, '-d', 'postgres', '-tAc', sql], { encoding: 'utf8' }).trim();

function criar() {
  // o jogo do Docker fica sempre conectado ao crona: a cópia sai do pg_dump (lê sem travar), não do TEMPLATE
  psql("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'crona_visual'");
  psql('DROP DATABASE IF EXISTS crona_visual');
  psql('CREATE DATABASE crona_visual');
  execFileSync('docker', ['exec', 'crona-postgres', 'sh', '-c', `pg_dump -U ${user} -d crona -Fc | pg_restore -U ${user} -d crona_visual --no-owner`], { stdio: 'inherit' });
  console.log('crona_visual criada a partir de crona.');
}

const cmd = process.argv[2];
if (cmd === 'criar') criar();
else if (cmd === 'apagar') {
  psql("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'crona_visual'");
  psql('DROP DATABASE IF EXISTS crona_visual');
  console.log('crona_visual apagada.');
} else if (cmd === 'subir') {
  if (psql("SELECT count(*) FROM pg_database WHERE datname = 'crona_visual'") === '0') criar();
  const visual = url.replace(/\/crona(\?|$)/, '/crona_visual$1');
  if (!visual.includes('/crona_visual')) throw new Error('não consegui apontar para crona_visual');
  const p = spawn('npm run dev', { cwd: REPO, shell: true, stdio: 'inherit', env: { ...process.env, CRONA_DB_URL: visual, CROMA_DB_URL: visual } });
  p.on('exit', (c) => process.exit(c ?? 0));
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => p.kill(s));
} else console.log('uso: node scripts/dev/visual.mjs criar | apagar | subir');
