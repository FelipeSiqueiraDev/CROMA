// As imagens da tela de entrada, uma por universo (fantasia, horror, cyberpunk): o Códex edita a
// imagem de hoje, mantendo o enquadramento e o painel, e o jogo escolhe pela cena sorteada
// (client/src/ui/entrada.ts; o pedido é o docs/PROMPT-ENTRADA.txt).
//
//   node scripts/entrada-fundos.mjs bases <pasta>
//     A imagem de hoje no tamanho que o gerador devolve (1536×1024 no computador, 1024×1536 no
//     celular), com uma faixa de sobra em volta: base-computador.png e base-celular.png. É ela que
//     vai anexada no pedido, para o Códex editar.
//
//   node scripts/entrada-fundos.mjs encaixar <entrega.png> <universo> <computador|celular>
//     A imagem que voltou vira a do universo: tira a faixa de sobra, volta ao tamanho da tela
//     (1672×941 ou 941×1672) e recebe o painel da arte de hoje por cima (o painel é a parte que os
//     campos de verdade cobrem: tem que bater no pixel). Grava
//     client/public/arte/login/fundo-<tela>-<universo>.webp e, ao lado da entrega,
//     previa-<tela>-<universo>.png, para conferir.
//
// Precisa do sharp: npm i --no-save sharp
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve(import.meta.dirname, '..');
const LOGIN = path.join(RAIZ, 'client/public/arte/login');
const TELAS = {
  // tamanho da tela, tamanho do gerador e onde a tela fica dentro dele
  computador: { w: 1672, h: 941, gw: 1536, gh: 1024, x: 0, y: 80, iw: 1536, ih: 864 },
  celular: { w: 941, h: 1672, gw: 1024, gh: 1536, x: 80, y: 0, iw: 864, ih: 1536 },
};
/** o contorno do painel em cada tela (retângulo da moldura, o emblema por cima, o enfeite de baixo) */
const PAINEL = {
  computador: [
    [[849, 126], [1391, 126], [1391, 813], [849, 813]],
    [[1118, 70], [1213, 118], [1213, 300], [1023, 300], [1023, 118]],
    [[1096, 808], [1142, 808], [1119, 839]],
  ],
  celular: [
    [[156, 405], [790, 405], [790, 1284], [156, 1284]],
    [[470, 352], [578, 402], [578, 600], [362, 600], [362, 402]],
    [[440, 1280], [500, 1280], [470, 1306]],
  ],
};
const UNIVERSOS = ['fantasia', 'horror', 'cyberpunk'];

async function bases(pasta) {
  fs.mkdirSync(pasta, { recursive: true });
  for (const [tela, T] of Object.entries(TELAS)) {
    const dentro = await sharp(path.join(LOGIN, `fundo-${tela}.webp`)).resize(T.iw, T.ih, { kernel: 'lanczos3' }).png().toBuffer();
    const arq = path.join(pasta, `base-${tela}.png`);
    await sharp(dentro)
      .extend({ top: T.y, bottom: T.gh - T.ih - T.y, left: T.x, right: T.gw - T.iw - T.x, extendWith: 'copy' })
      .png()
      .toFile(arq);
    console.log(`${path.relative(process.cwd(), arq)}  (${T.gw}×${T.gh})`);
  }
}

/** a máscara do painel (branco = painel), com a borda suavizada em 2 px */
function mascara(tela) {
  const T = TELAS[tela];
  const poligonos = PAINEL[tela].map((p) => `<polygon points="${p.map(([x, y]) => `${x},${y}`).join(' ')}" fill="#fff"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T.w}" height="${T.h}"><rect width="100%" height="100%" fill="#000"/>${poligonos}</svg>`;
  return sharp(Buffer.from(svg)).blur(1.2).toColourspace('b-w').raw().toBuffer();
}

async function encaixar(entrega, universo, tela) {
  if (!UNIVERSOS.includes(universo)) throw new Error(`universo "${universo}": use ${UNIVERSOS.join(', ')}`);
  const T = TELAS[tela];
  if (!T) throw new Error(`tela "${tela}": use computador ou celular`);
  // (o sharp faz um resize por vez: cada passo sai num buffer)
  const cheia = await sharp(entrega).resize(T.gw, T.gh, { fit: 'fill' }).png().toBuffer();
  const meio = await sharp(cheia).extract({ left: T.x, top: T.y, width: T.iw, height: T.ih }).png().toBuffer();
  const corpo = await sharp(meio).resize(T.w, T.h, { kernel: 'lanczos3', fit: 'fill' }).removeAlpha().raw().toBuffer();
  const hoje = await sharp(path.join(LOGIN, `fundo-${tela}.webp`)).removeAlpha().raw().toBuffer();
  const m = await mascara(tela);
  const saida = Buffer.alloc(T.w * T.h * 3);
  for (let i = 0; i < T.w * T.h; i++) {
    const a = m[i] / 255;
    for (let c = 0; c < 3; c++) saida[i * 3 + c] = Math.round(corpo[i * 3 + c] * (1 - a) + hoje[i * 3 + c] * a);
  }
  const img = sharp(saida, { raw: { width: T.w, height: T.h, channels: 3 } });
  const destino = path.join(LOGIN, `fundo-${tela}-${universo}.webp`);
  await img.clone().webp({ quality: 95 }).toFile(destino);
  const previa = path.join(path.dirname(entrega), `previa-${tela}-${universo}.png`);
  await img.clone().png().toFile(previa);
  console.log(`${path.relative(process.cwd(), destino)}\n  conferir: ${path.relative(process.cwd(), previa)}`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'bases' && args[0]) await bases(args[0]);
else if (cmd === 'encaixar' && args.length === 3) await encaixar(...args);
else {
  console.log('uso:\n  node scripts/entrada-fundos.mjs bases <pasta>\n  node scripts/entrada-fundos.mjs encaixar <entrega.png> <fantasia|horror|cyberpunk> <computador|celular>');
  process.exit(1);
}
