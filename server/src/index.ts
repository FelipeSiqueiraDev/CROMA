import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { UPLOAD_DIR } from './db';
import { Hotel } from './hotel';

// Em desenvolvimento o Vite usa PORT; o servidor fica na 3001 (ou CROMA_PORT).
// Com --prod (npm start) respeita PORT, como a maioria das hospedagens espera.
const PROD = process.argv.includes('--prod');
const PORT = Number(process.env.CROMA_PORT ?? (PROD ? process.env.PORT : undefined) ?? 3001);
const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const MAX_UPLOAD = 12 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const hotel = new Hotel();

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function serveFile(res: http.ServerResponse, file: string, cache = false) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end('Não encontrado');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': cache ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    const stream = fs.createReadStream(file);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

/** Detecta o formato pela assinatura do arquivo (não confia na extensão enviada). */
function imageExt(buf: Buffer): '.png' | '.jpg' | '.webp' | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return '.webp';
  return null;
}

function handleUpload(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  const client = hotel.clientByToken(url.searchParams.get('token') ?? '');
  if (!client?.name) return sendJson(res, 401, { error: 'Entre no hotel antes de enviar.' });
  if (client.role !== 'gm') return sendJson(res, 403, { error: 'Só o mestre envia sprites.' });
  const chunks: Buffer[] = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c: Buffer) => {
    size += c.length;
    if (size > MAX_UPLOAD) {
      aborted = true;
      sendJson(res, 413, { error: 'Imagem grande demais (máx. 12 MB).' });
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    const buf = Buffer.concat(chunks);
    const ext = imageExt(buf);
    if (!ext) return sendJson(res, 400, { error: 'Envie uma imagem PNG, JPG ou WEBP.' });
    try {
      const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20);
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, `${hash}${ext}`), buf);
      const name = (url.searchParams.get('name') ?? '').replace(/[\u0000-\u001f]/g, '').trim();
      const def = hotel.addCharacter(client, `/uploads/${hash}${ext}`, name);
      sendJson(res, 200, { id: def.id });
    } catch (e) {
      console.error('[upload]', e);
      sendJson(res, 500, { error: 'Falha ao salvar a imagem.' });
    }
  });
}

const server = http.createServer((req, res) => {
  try {
    route(req, res);
  } catch (e) {
    console.error('[http]', e);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

function route(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/api/characters' && req.method === 'POST') return handleUpload(req, res, url);
  if (url.pathname.startsWith('/uploads/')) {
    const file = path.join(UPLOAD_DIR, path.basename(url.pathname));
    return serveFile(res, file, true);
  }
  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true });

  // Cliente compilado (npm run build). Em desenvolvimento o Vite serve o cliente.
  if (!fs.existsSync(CLIENT_DIST)) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Servidor CROMA rodando. Em desenvolvimento, abra o cliente do Vite (npm run dev).');
    return;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  // normaliza como caminho absoluto de URL antes de juntar (".." nunca sobe acima da raiz)
  let file = path.resolve(CLIENT_DIST, '.' + path.posix.normalize('/' + decoded.replace(/\\/g, '/')));
  if (file !== CLIENT_DIST && !file.startsWith(CLIENT_DIST + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(CLIENT_DIST, 'index.html');
  serveFile(res, file, file.includes(`${path.sep}assets${path.sep}`));
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * A conexão vem deste computador? Em desenvolvimento o Vite repassa as
 * conexões e informa a origem em x-forwarded-for (a última entrada é a real).
 */
function isLocal(req: http.IncomingMessage) {
  if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) return false;
  const fwd = req.headers['x-forwarded-for'];
  const list = (Array.isArray(fwd) ? fwd.join(',') : (fwd ?? '')).split(',').map((s) => s.trim()).filter(Boolean);
  return !list.length || LOOPBACK.has(list[list.length - 1]);
}

/** Endereço deste computador na rede (para o link do tablet). */
function lanAddress() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) return a.address;
  return 'localhost';
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
wss.on('connection', (ws, req) => hotel.connect(ws, isLocal(req)));

server.listen(PORT, () => {
  console.log(`[croma] servidor em http://localhost:${PORT}`);
  // em desenvolvimento a página vem do Vite (5173); em produção, deste servidor
  const port = PROD ? PORT : 5173;
  const lan = lanAddress();
  console.log(`[croma] mestre (este computador): http://localhost:${port}`);
  console.log(`[croma] mesa (tablet):            http://${lan}:${port}/?mesa`);
  console.log(`[croma] mestre em outro aparelho: http://${lan}:${port}/?mestre=${hotel.gmKey}`);
});

function shutdown() {
  try {
    hotel.flush();
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
