// Folha de conferência dos móveis importados (cole no console da página do jogo, ou rode pelo
// javascript_tool do painel do navegador, com o scripts/dev/salvar.mjs no ar).
//
// Cada linha é um móvel; cada coluna, um giro (4, 2, 0, 6). Em cada giro: a pegada no chão (azul),
// a caixa de verdade em arame (amarelo) e uma pessoa de 1,80 m ao lado. A arte tem que caber no
// arame e pisar na base dele. Nunca dê um móvel por certo só pela imagem solta: confira aqui e
// numa captura do tabuleiro.
//
//   await window.__giros('bar.png', ['bar_counter', 'table_bar'], {
//     bar_counter: { W: 1, D: 1, real: [0.75, 0.6, 1.1], encosta: true },
//     table_bar: { W: 1, D: 1, real: [0.7, 0.7, 0.75] },
//   });
//
// W e D: a pegada em casas; real: [largura, fundo, altura] em metros (a da ficha do moveis.py);
// encosta: o móvel fica encostado no fundo da casa. Kz: a escala da folha (0,75 por padrão).
window.__giros = async (nome, defs, reais, Kz = 0.75) => {
  const mj = await fetch('/arte/mobiliario/moveis.json?' + Date.now()).then((r) => r.json());
  // a escala das regras: casa de 0,75 m; 1 m = 60,34 px no chão e 52,26 px na altura (zoom 1)
  const C = 0.75;
  const CW = 330, CH = 300, LW = 140, K = Kz, Z = 2 * K;
  const M = (32 / (C * Math.SQRT1_2)) * Math.cos(Math.PI / 6) * Z;
  const cv = document.createElement('canvas');
  cv.width = LW + CW * 4;
  cv.height = CH * defs.length + 30;
  const c = cv.getContext('2d');
  c.fillStyle = '#20242c';
  c.fillRect(0, 0, cv.width, cv.height);
  c.font = '15px sans-serif';
  const ordem = ['4', '2', '0', '6'];
  const rotulo = { 4: '4  frente ↙', 2: '2  frente ↘', 0: '0  frente ↗ (costas)', 6: '6  frente ↖ (costas)' };
  c.fillStyle = '#fff';
  ordem.forEach((g, i) => c.fillText(rotulo[g], LW + i * CW + 10, 20));
  const carrega = (src) =>
    new Promise((ok) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => ok(null);
      im.src = src;
    });
  for (let r = 0; r < defs.length; r++) {
    const id = defs[r];
    const a = mj[id];
    const y0 = 30 + r * CH;
    const re = reais[id] ?? {};
    c.fillStyle = '#fff';
    c.fillText(id, 8, y0 + CH / 2);
    c.strokeStyle = '#3a404c';
    c.lineWidth = 1;
    c.strokeRect(0, y0, cv.width, CH);
    if (!a?.giros) continue;
    const W = re.W ?? 1, D = re.D ?? 1;
    for (let i = 0; i < 4; i++) {
      const g = ordem[i];
      const v = a.giros[g];
      if (!v) continue;
      const im = await carrega('/arte/mobiliario/' + v.arquivo + '?' + Date.now());
      if (!im) continue;
      const lado = g === '2' || g === '6';
      const Tx = lado ? D : W, Ty = lado ? W : D; // casas
      const bx = LW + i * CW + CW / 2 - 30 + (Tx - Ty) * 16 * Z, by = y0 + CH - 22;
      // ponto (X, Y em casas a partir do canto de trás da pegada, z em metros) na tela
      const P = (X, Y, z = 0) => [bx + (X - Tx - (Y - Ty)) * 32 * Z, by + (X - Tx + (Y - Ty)) * 16 * Z - z * M];
      const poli = (pts, cor, enche) => {
        c.beginPath();
        pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
        if (enche) {
          c.fillStyle = cor;
          c.fill();
        } else {
          c.strokeStyle = cor;
          c.stroke();
        }
      };
      poli([P(0, 0), P(Tx, 0), P(Tx, Ty), P(0, Ty)], 'rgba(120,160,220,0.28)', true);
      const ancoraX = v.ancora === 'centro' ? bx - (Tx - Ty) * 16 * Z : bx;
      const ancoraY = v.ancora === 'centro' ? by - (Tx + Ty) * 8 * Z : by;
      c.drawImage(im, ancoraX - v.ax * K, ancoraY - v.ay * K, im.width * K, im.height * K);
      // a caixa de verdade, no meio (ou encostada no fundo)
      if (re.real) {
        const [rw, rd, rh] = re.real;
        const wx = (lado ? rd : rw) / C, dy = (lado ? rw : rd) / C;
        let ox = (Tx - wx) / 2, oy = (Ty - dy) / 2;
        if (re.encosta) {
          if (g === '4') oy = 0;
          else if (g === '0') oy = Ty - dy;
          else if (g === '2') ox = 0;
          else ox = Tx - wx;
        }
        c.lineWidth = 1.5;
        const base = [P(ox, oy), P(ox + wx, oy), P(ox + wx, oy + dy), P(ox, oy + dy)];
        const topo = [P(ox, oy, rh), P(ox + wx, oy, rh), P(ox + wx, oy + dy, rh), P(ox, oy + dy, rh)];
        poli(base, 'rgba(255,220,60,0.95)');
        poli(topo, 'rgba(255,220,60,0.75)');
        c.beginPath();
        for (let j = 0; j < 4; j++) {
          c.moveTo(...base[j]);
          c.lineTo(...topo[j]);
        }
        c.strokeStyle = 'rgba(255,220,60,0.6)';
        c.stroke();
      }
      // a pessoa de 1,80 m, uma casa à direita da pegada
      const [px, py] = P(Tx + 0.6, Ty * 0.5);
      c.fillStyle = 'rgba(200,200,210,0.35)';
      c.beginPath();
      c.ellipse(px, py, 8 * Z, 4 * Z, 0, 0, 7);
      c.fill();
      c.fillRect(px - 0.2 * M, py - 1.55 * M, 0.4 * M, 1.55 * M);
      c.beginPath();
      c.arc(px, py - 1.68 * M, 0.12 * M, 0, 7);
      c.fill();
    }
  }
  return fetch('http://127.0.0.1:5999/?nome=' + nome, { method: 'POST', body: cv.toDataURL('image/png') }).then((r) => r.text());
};
