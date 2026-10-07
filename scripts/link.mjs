// O link do CRONA para entrar de qualquer lugar (como o do C.R.I.S): um túnel da Cloudflare
// (cloudflared, grátis, sem conta) até o jogo do Docker neste computador.
//
//   node scripts/link.mjs            sobe o túnel e mantém no ar (cai, sobe de novo)   (npm run crona:link)
//   node scripts/link.mjs instalar   sobe sozinho a cada login do Windows, escondido
//   node scripts/link.mjs remover    tira do login
//
// O link muda a cada vez que o túnel sobe (o fixo da Cloudflare é pago). O de agora fica em
// server/data/link.txt e o histórico em server/data/link.log; o `npm run crona:logs` mostra.
//
// SEGURANÇA: o túnel vai para a porta da REDE (CRONA_IP:CRONA_PORTA, a da mesa), nunca para a
// 127.0.0.1: lá o servidor trata todo mundo como mestre. Quem chega pelo link entra pela tela de
// entrada (a conta) ou pelos links da mesa e da ficha, como no tablet.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(REPO, 'server', 'data');
const LINK = path.join(DATA, 'link.txt');
const LOG = path.join(DATA, 'link.log');
const ATALHO = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'CRONA link.lnk');

function env() {
  const txt = fs.existsSync(path.join(REPO, '.env')) ? fs.readFileSync(path.join(REPO, '.env'), 'utf8') : '';
  const ip = /^CRONA_IP=(.+)$/m.exec(txt)?.[1]?.trim();
  const porta = /^CRONA_PORTA=(\d+)/m.exec(txt)?.[1] ?? '8080';
  if (!ip || ip === '127.0.0.1') throw new Error('Sem o IP da rede no .env: rode `npm run crona` antes.');
  return { ip, porta };
}

function log(msg) {
  fs.mkdirSync(DATA, { recursive: true });
  const linha = `${new Date().toLocaleString('pt-BR')} - ${msg}`;
  fs.appendFileSync(LOG, linha + '\n');
  console.log(`[link] ${msg}`);
}

function subir() {
  const { ip, porta } = env();
  log(`Subindo o túnel para http://${ip}:${porta} ...`);
  const p = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://${ip}:${porta}`], { windowsHide: true });
  let achou = false;
  const ler = (buf) => {
    const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(String(buf));
    if (m && !achou) {
      achou = true;
      fs.writeFileSync(LINK, m[0] + '\n');
      log(`LINK DE AGORA: ${m[0]}   (mesa: ${m[0]}/?mesa)`);
    }
  };
  p.stdout.on('data', ler);
  p.stderr.on('data', ler);
  p.on('error', (e) => log(`Não consegui rodar o cloudflared: ${e.message}`));
  p.on('exit', () => {
    try {
      fs.rmSync(LINK, { force: true });
    } catch {
      /* nada */
    }
    log('O túnel caiu: sobe de novo em 5 s.');
    setTimeout(subir, 5000);
  });
}

const cmd = process.argv[2];
if (cmd === 'instalar') {
  // um atalho na pasta Inicializar (não precisa de administrador): o node roda escondido
  const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${ATALHO.replace(/'/g, "''")}');$s.TargetPath='powershell.exe';$s.Arguments='-NoProfile -WindowStyle Hidden -Command "node ''${path.join(REPO, 'scripts', 'link.mjs').replace(/'/g, "''''")}''"';$s.WorkingDirectory='${REPO.replace(/'/g, "''")}';$s.WindowStyle=7;$s.Save()`;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
  console.log(`[link] Instalado: sobe sozinho a cada login (${ATALHO}).`);
} else if (cmd === 'remover') {
  fs.rmSync(ATALHO, { force: true });
  console.log('[link] Removido do login. (Se estiver rodando agora, feche o processo node do link.)');
} else if (!cmd) subir();
else console.log('uso: node scripts/link.mjs [instalar | remover]');
