// O CRONA no Docker (docker-compose.yml): o jogo e o banco.
//
//   node scripts/crona.mjs subir    acha o IP da rede, monta a imagem e sobe (npm run crona)
//   node scripts/crona.mjs parar    desliga o jogo; o banco continua (npm run crona:parar)
//   node scripts/crona.mjs logs     o que o servidor está dizendo (npm run crona:logs)
//
// O IP da rede vai para o .env da raiz (fora do git), que o docker-compose lê sozinho: o jogo
// atende a rede nesse IP e este computador em 127.0.0.1. Mudou de rede? Rode `npm run crona` de novo.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = path.join(REPO, '.env');

/** O IP deste computador na rede de casa (não o das redes virtuais do WSL e do Docker). */
function ipDaRede() {
  const virtual = /vethernet|wsl|docker|virtualbox|vmware|hyper-v|loopback/i;
  const ips = [];
  for (const [nome, lista] of Object.entries(os.networkInterfaces()))
    for (const a of lista ?? []) if (a.family === 'IPv4' && !a.internal && !virtual.test(nome)) ips.push(a.address);
  const nota = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
  return ips.sort((a, b) => nota(a) - nota(b))[0] ?? '127.0.0.1';
}

/** Grava uma variável no .env da raiz, mantendo o resto. */
function gravarEnv(chave, valor) {
  const linhas = fs.existsSync(ENV) ? fs.readFileSync(ENV, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith(`${chave}=`)) : ['# O docker-compose lê este arquivo (fora do git). O `npm run crona` escreve o CRONA_IP.'];
  linhas.push(`${chave}=${valor}`);
  fs.writeFileSync(ENV, linhas.join('\n') + '\n');
}

const docker = (...args) => spawnSync('docker', ['compose', ...args], { cwd: REPO, stdio: 'inherit' }).status ?? 1;

const cmd = process.argv[2];
if (cmd === 'subir') {
  const ip = ipDaRede();
  gravarEnv('CRONA_IP', ip);
  console.log(`[crona] IP da rede: ${ip}. Montando a imagem e subindo o jogo e o banco…`);
  const st = docker('up', '-d', '--build', '--wait', 'jogo');
  if (st !== 0) process.exit(st);
  const porta = /^CRONA_PORTA=(\d+)/m.exec(fs.readFileSync(ENV, 'utf8'))?.[1] ?? '8080';
  // a chave do mestre em outro aparelho sai no log do servidor
  let log = '';
  try {
    log = execFileSync('docker', ['logs', 'crona-app'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {}
  const chave = /\?mestre=([A-Za-z0-9_-]+)/.exec(log)?.[1];
  console.log('');
  console.log(`[crona] mestre (este computador): http://localhost:${porta}`);
  console.log(`[crona] mesa (tablet):            http://${ip}:${porta}/?mesa`);
  if (chave) console.log(`[crona] mestre em outro aparelho: http://${ip}:${porta}/?mestre=${chave}`);
} else if (cmd === 'parar') process.exit(docker('stop', 'jogo'));
else if (cmd === 'logs') process.exit(docker('logs', '-f', '--tail', '80', 'jogo'));
else console.log('uso: node scripts/crona.mjs subir | parar | logs');
