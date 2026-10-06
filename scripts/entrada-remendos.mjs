// As peças trocáveis da tela de entrada (a caneca, a vela, o mapa da mesa): o Códex redesenha um
// pedaço da arte e o jogo põe o pedaço por cima, na hora (client/src/ui/entradaCena.ts). Os
// retângulos de cada peça ficam em client/src/ui/entradaRemendos.json.
//
//   node scripts/entrada-remendos.mjs gabaritos <pasta>
//     Para cada peça e cada tela (computador, celular), o pedaço da arte ampliado no tamanho que o
//     GPT devolve (1024×1024, 1536×1024 ou 1024×1536): gabarito-<peça>-<tela>.png. É ele que vai
//     junto do pedido, para o Códex desenhar a variante por cima.
//
//   node scripts/entrada-remendos.mjs encaixar <entrega.png> <peça>-<id>-<tela> [...]
//     A imagem que voltou vira o remendo: reduzida ao retângulo da peça, com a borda se misturando
//     na arte, em client/public/arte/login/variantes/<peça>-<id>-<tela>.webp. Ao lado da entrega
//     fica previa-<peça>-<id>-<tela>.png, a arte inteira com o remendo, para conferir.
//     Ex.: node scripts/entrada-remendos.mjs encaixar caneca.png caneca-cerveja-computador
//
// Precisa do sharp: npm i --no-save sharp
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const RETANGULOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'client/src/ui/entradaRemendos.json'), 'utf8'));
const FUNDO = (tela) => path.join(RAIZ, `client/public/arte/login/fundo-${tela}.webp`);
const SAIDA = path.join(RAIZ, 'client/public/arte/login/variantes');
/** os tamanhos que o gerador de imagem devolve */
const TAMANHOS = [
  [1024, 1024],
  [1536, 1024],
  [1024, 1536],
];
/** quantos pixels da borda do remendo se misturam com a arte */
const BORDA = 10;

/**
 * O pedaço da arte que vai para o gabarito: o retângulo da peça, alargado (com a arte em volta)
 * até a proporção do tamanho do GPT mais parecido.
 */
function regiao(tela, peca) {
  const r = RETANGULOS[tela]?.[peca];
  if (!r) throw new Error(`não há a peça "${peca}" na tela "${tela}" (veja entradaRemendos.json)`);
  const [x, y, w, h] = r;
  const prop = w / h;
  const [gw, gh] = TAMANHOS.reduce((a, b) => (Math.abs(Math.log(b[0] / b[1] / prop)) < Math.abs(Math.log(a[0] / a[1] / prop)) ? b : a));
  const alvo = gw / gh;
  let rw = w;
  let rh = h;
  if (prop < alvo) rw = Math.round(h * alvo);
  else rh = Math.round(w / alvo);
  return { ret: r, gw, gh, x0: Math.round(x - (rw - w) / 2), y0: Math.round(y - (rh - h) / 2), rw, rh };
}

/** O pedaço da arte (com a borda repetida onde ele passa da imagem). */
async function recortar(tela, R) {
  const meta = await sharp(FUNDO(tela)).metadata();
  const ex = Math.max(0, R.x0);
  const ey = Math.max(0, R.y0);
  const ew = Math.min(meta.width, R.x0 + R.rw) - ex;
  const eh = Math.min(meta.height, R.y0 + R.rh) - ey;
  return sharp(FUNDO(tela))
    .extract({ left: ex, top: ey, width: ew, height: eh })
    .extend({ left: ex - R.x0, top: ey - R.y0, right: R.x0 + R.rw - (ex + ew), bottom: R.y0 + R.rh - (ey + eh), extendWith: 'copy' })
    .png()
    .toBuffer();
}

async function gabaritos(pasta) {
  fs.mkdirSync(pasta, { recursive: true });
  for (const tela of Object.keys(RETANGULOS))
    for (const peca of Object.keys(RETANGULOS[tela])) {
      const R = regiao(tela, peca);
      const pedaco = await recortar(tela, R);
      const arq = path.join(pasta, `gabarito-${peca}-${tela}.png`);
      // ampliado sem suavizar: os pixels da arte continuam quadrados
      await sharp(pedaco).resize(R.gw, R.gh, { kernel: 'nearest', fit: 'fill' }).png().toFile(arq);
      console.log(`${path.relative(process.cwd(), arq)}  (${R.gw}×${R.gh})`);
    }
}

async function encaixar(entrega, nome) {
  const m = /^(caneca|vela|mapa)-(.+)-(computador|celular)$/.exec(nome);
  if (!m) throw new Error(`nome "${nome}": use <peça>-<id>-<tela>, ex. caneca-cerveja-computador`);
  const [, peca, , tela] = m;
  const R = regiao(tela, peca);
  const [x, y, w, h] = R.ret;
  const k = R.gw / R.rw;
  // a entrega no tamanho do gabarito; dela sai só o retângulo da peça, no tamanho da arte
  const cheio = await sharp(entrega).resize(R.gw, R.gh, { fit: 'fill' }).toBuffer();
  const { data } = await sharp(cheio)
    .extract({ left: Math.round((x - R.x0) * k), top: Math.round((y - R.y0) * k), width: Math.round(w * k), height: Math.round(h * k) })
    .resize(w, h, { kernel: 'lanczos3', fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // a borda se mistura com a arte (menos onde o retângulo encosta na beira da imagem)
  const meta = await sharp(FUNDO(tela)).metadata();
  const livre = { e: x > 0, c: y > 0, d: x + w < meta.width, b: y + h < meta.height };
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++) {
      let d = BORDA;
      if (livre.e) d = Math.min(d, px);
      if (livre.d) d = Math.min(d, w - 1 - px);
      if (livre.c) d = Math.min(d, py);
      if (livre.b) d = Math.min(d, h - 1 - py);
      const t = Math.min(1, (d + 0.5) / BORDA);
      data[(py * w + px) * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
    }
  fs.mkdirSync(SAIDA, { recursive: true });
  const remendo = sharp(data, { raw: { width: w, height: h, channels: 4 } });
  const destino = path.join(SAIDA, `${nome}.webp`);
  await remendo.clone().webp({ quality: 94, alphaQuality: 100 }).toFile(destino);
  const previa = path.join(path.dirname(entrega), `previa-${nome}.png`);
  await sharp(FUNDO(tela))
    .composite([{ input: await remendo.clone().png().toBuffer(), left: x, top: y }])
    .png()
    .toFile(previa);
  console.log(`${path.relative(process.cwd(), destino)}  (${w}×${h})\n  conferir: ${path.relative(process.cwd(), previa)}`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'gabaritos' && args[0]) await gabaritos(args[0]);
else if (cmd === 'encaixar' && args.length >= 2 && args.length % 2 === 0) for (let i = 0; i < args.length; i += 2) await encaixar(args[i], args[i + 1]);
else {
  console.log('uso:\n  node scripts/entrada-remendos.mjs gabaritos <pasta>\n  node scripts/entrada-remendos.mjs encaixar <entrega.png> <peça>-<id>-<tela> [<entrega> <nome> ...]');
  process.exit(1);
}
