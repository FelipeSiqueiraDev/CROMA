// A cópia do banco para os testes visuais (croma_visual): o banco de verdade (croma) só é lido.
//
//   node scripts/dev/visual.mjs criar    faz a cópia (o servidor de verdade precisa estar parado)
//   node scripts/dev/visual.mjs apagar   apaga a cópia
//   node scripts/dev/visual.mjs subir    sobe o `npm run dev` apontando para a cópia (cria se faltar)
//
// O "croma-visual" do .claude/launch.json roda o `subir`: o painel do navegador do app abre o jogo
// nessa cópia, e mexer nas peças lá não estraga as sessões de verdade.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = fs.readFileSync(path.join(REPO, 'server', '.env'), 'utf8');
const url = /^CROMA_DB_URL=(.*)$/m.exec(env)?.[1]?.trim();
if (!url) throw new Error('sem CROMA_DB_URL no server/.env');
const user = decodeURIComponent(/^postgres(?:ql)?:\/\/([^:@/]+)/.exec(url)?.[1] ?? '');
if (!user) throw new Error('sem usuário no CROMA_DB_URL');
const psql = (sql) => execFileSync('docker', ['exec', 'croma-postgres', 'psql', '-U', user, '-d', 'postgres', '-tAc', sql], { encoding: 'utf8' }).trim();

function criar() {
  const ativos = psql("SELECT count(*) FROM pg_stat_activity WHERE datname = 'croma'");
  if (ativos !== '0') {
    console.log(`O banco croma tem ${ativos} conexão(ões) abertas (o servidor de verdade está no ar?). Pare o servidor e rode de novo.`);
    process.exit(1);
  }
  psql('DROP DATABASE IF EXISTS croma_visual');
  psql('CREATE DATABASE croma_visual TEMPLATE croma');
  console.log('croma_visual criada a partir de croma.');
}

const cmd = process.argv[2];
if (cmd === 'criar') criar();
else if (cmd === 'apagar') {
  psql("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'croma_visual'");
  psql('DROP DATABASE IF EXISTS croma_visual');
  console.log('croma_visual apagada.');
} else if (cmd === 'subir') {
  if (psql("SELECT count(*) FROM pg_database WHERE datname = 'croma_visual'") === '0') criar();
  const visual = url.replace(/\/croma(\?|$)/, '/croma_visual$1');
  if (!visual.includes('/croma_visual')) throw new Error('não consegui apontar para croma_visual');
  const p = spawn('npm run dev', { cwd: REPO, shell: true, stdio: 'inherit', env: { ...process.env, CROMA_DB_URL: visual } });
  p.on('exit', (c) => process.exit(c ?? 0));
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => p.kill(s));
} else console.log('uso: node scripts/dev/visual.mjs criar | apagar | subir');
