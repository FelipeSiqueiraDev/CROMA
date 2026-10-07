// O CRONA rodando direto no Windows (06/10): leve e rápido de atualizar. Só o banco fica no Docker.
//
//   node scripts/jogo.mjs              sobe o jogo na porta 8080 e mantém no ar (caiu, sobe de novo)
//   node scripts/jogo.mjs atualizar    WebP da arte nova + build da interface + reinicia o jogo   (npm run crona)
//   node scripts/jogo.mjs parar        desliga o jogo                                            (npm run crona:parar)
//   node scripts/jogo.mjs instalar     sobe sozinho, escondido, a cada login do Windows
//   node scripts/jogo.mjs remover      tira do login
//
// Mestre: quem abre em http://localhost:8080 neste computador, ou entra pela conta de mestre de
// qualquer lugar (pelo link do túnel, scripts/link.mjs). A mesa e os celulares: http://IP:8080/?mesa.
// O log fica em server/data/jogo.log.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(REPO, 'server', 'data');
const LOG = path.join(DATA, 'jogo.log');
const PID = path.join(DATA, 'jogo.pid');
const ATALHO = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'CRONA jogo.lnk');
const PORTA = '8080';

fs.mkdirSync(DATA, { recursive: true });
const log = (msg) => {
  const linha = `${new Date().toLocaleString('pt-BR')} - ${msg}`;
  fs.appendFileSync(LOG, linha + '\n');
  console.log(`[jogo] ${msg}`);
};

/** O IP deste computador na rede de casa (para a mesa e os celulares). */
function ipDaRede() {
  const virtual = /vethernet|wsl|docker|virtualbox|vmware|hyper-v|loopback/i;
  const ips = [];
  for (const [nome, lista] of Object.entries(os.networkInterfaces()))
    for (const a of lista ?? []) if (a.family === 'IPv4' && !a.internal && !virtual.test(nome)) ips.push(a.address);
  const nota = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2);
  return ips.sort((a, b) => nota(a) - nota(b))[0] ?? '127.0.0.1';
}

/** O IP vai para o .env da raiz (o túnel lê de lá). */
function gravarIp(ip) {
  const env = path.join(REPO, '.env');
  const linhas = fs.existsSync(env) ? fs.readFileSync(env, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('CRONA_IP=')) : [];
  linhas.push(`CRONA_IP=${ip}`);
  fs.writeFileSync(env, linhas.join('\n') + '\n');
}

/** O banco no Docker (leve); o jogo antigo do Docker (crona-app) fica parado. */
function banco() {
  spawnSync('docker', ['compose', 'up', '-d', '--wait', 'banco'], { cwd: REPO, stdio: 'ignore' });
  spawnSync('docker', ['update', '--restart=no', 'crona-app'], { stdio: 'ignore' });
  spawnSync('docker', ['stop', 'crona-app'], { stdio: 'ignore' });
}

function build() {
  log('Convertendo a arte nova para WebP e montando a interface…');
  spawnSync('node', ['scripts/webp.mjs', 'client/public/arte'], { cwd: REPO, stdio: 'inherit', shell: true });
  const r = spawnSync('npm', ['run', 'build'], { cwd: REPO, stdio: 'inherit', shell: true });
  if (r.status !== 0) throw new Error('o build falhou');
}

function subir() {
  const ip = ipDaRede();
  gravarIp(ip);
  banco();
  if (!fs.existsSync(path.join(REPO, 'client', 'dist', 'index.html'))) build();
  const rodar = () => {
    log(`Subindo o jogo: mestre em http://localhost:${PORTA}, mesa em http://${ip}:${PORTA}/?mesa`);
    const p = spawn('npx', ['tsx', 'src/index.ts', '--prod'], {
      cwd: path.join(REPO, 'server'),
      shell: true,
      windowsHide: true,
      env: { ...process.env, CRONA_PORT: PORTA, CRONA_IP: ip, NODE_ENV: 'production' },
    });
    fs.writeFileSync(PID, String(p.pid));
    const out = fs.createWriteStream(LOG, { flags: 'a' });
    p.stdout.pipe(out);
    p.stderr.pipe(out);
    p.on('exit', (c) => {
      log(`O jogo parou (código ${c}). Sobe de novo em 3 s.`);
      if (fs.existsSync(path.join(DATA, 'jogo.parar'))) {
        fs.rmSync(path.join(DATA, 'jogo.parar'), { force: true });
        log('Desligado a pedido.');
        process.exit(0);
      }
      setTimeout(rodar, 3000);
    });
  };
  rodar();
}

/** Derruba o servidor que está no ar (a árvore de processos dele): o lançador sobe de novo. */
function derrubar() {
  if (!fs.existsSync(PID)) return false;
  const pid = fs.readFileSync(PID, 'utf8').trim();
  try {
    execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const cmd = process.argv[2];
if (!cmd) subir();
else if (cmd === 'atualizar') {
  build();
  if (derrubar()) log('Jogo atualizado: reiniciando com a versão nova.');
  else log('Build pronto. O jogo não estava no ar: rode `node scripts/jogo.mjs` (ou entre de novo no Windows).');
} else if (cmd === 'parar') {
  fs.writeFileSync(path.join(DATA, 'jogo.parar'), '1');
  if (!derrubar()) fs.rmSync(path.join(DATA, 'jogo.parar'), { force: true });
  console.log('[jogo] Desligado.');
} else if (cmd === 'instalar') {
  const alvo = path.join(REPO, 'scripts', 'jogo.mjs').replace(/'/g, "''''");
  const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${ATALHO.replace(/'/g, "''")}');$s.TargetPath='powershell.exe';$s.Arguments='-NoProfile -WindowStyle Hidden -Command "node ''${alvo}''"';$s.WorkingDirectory='${REPO.replace(/'/g, "''")}';$s.WindowStyle=7;$s.Save()`;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
  console.log(`[jogo] Instalado: sobe sozinho a cada login (${ATALHO}).`);
} else if (cmd === 'remover') {
  fs.rmSync(ATALHO, { force: true });
  console.log('[jogo] Removido do login.');
} else console.log('uso: node scripts/jogo.mjs [atualizar | parar | instalar | remover]');
