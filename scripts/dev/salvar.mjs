// Recebe imagens (data URL de PNG) da página do jogo e grava numa pasta, para conferir o
// tabuleiro em tamanho real (a captura do painel do navegador vem pequena). Só escuta em 127.0.0.1.
//
//   node scripts/dev/salvar.mjs [pasta]        (padrão: <temp>/croma-capturas)
//
// Na página (console ou javascript_tool):
//   const v = window.__croma.view; v.frame();
//   fetch('http://127.0.0.1:5999/?nome=sala.png', { method: 'POST', body: v.canvas.toDataURL('image/png') })
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const DIR = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'croma-capturas'));
fs.mkdirSync(DIR, { recursive: true });

http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const url = new URL(req.url, 'http://x');
    const nome = (url.searchParams.get('nome') || 'img.png').replace(/[^a-z0-9._-]/gi, '_');
    if (req.method !== 'POST') return res.end('ok');
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const m = /^data:image\/png;base64,(.*)$/s.exec(body);
      if (!m) {
        res.statusCode = 400;
        return res.end('sem png');
      }
      fs.writeFileSync(path.join(DIR, nome), Buffer.from(m[1], 'base64'));
      res.end('gravado ' + nome);
    });
  })
  .listen(5999, '127.0.0.1', () => console.log('salvando em', DIR));
