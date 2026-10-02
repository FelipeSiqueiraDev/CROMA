"""
Prévias da filmagem pixelada:
- grade: as 8 direções numa grade 4x2, tocando a animação no lugar;
- piso: andando em cima de um piso isométrico na velocidade do tabuleiro
  (1 casa a cada 500 ms; o ciclo cobre `casas` casas), para ver o pé parado no chão.
Uso: python previa_gif.py <pasta pixelada> <filmagem.json> <saída sem extensão> [--casas 1.91]
"""
import argparse
import json
import math
import os
import subprocess
import sys

import fitz
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
ORDEM = [['n', 'ne', 'e', 'se'], ['s', 'sw', 'w', 'nw']]
# para onde cada direção anda na tela (por casa), na arte em dobro: casa = 128x64
PASSO_TELA = {'se': (64, 32), 'sw': (-64, 32), 'nw': (-64, -32), 'ne': (64, -32), 's': (0, 64), 'n': (0, -64), 'e': (128, 0), 'w': (-128, 0)}
# nas diagonais da tela (s, n, e, w) a peça anda de casa em casa na diagonal: cada passo é uma casa na diagonal (1,41 casa)
COMPR = {'se': 1.0, 'sw': 1.0, 'nw': 1.0, 'ne': 1.0, 's': math.sqrt(2), 'n': math.sqrt(2), 'e': math.sqrt(2), 'w': math.sqrt(2)}


def ler(p):
    pix = fitz.Pixmap(p)
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4)


def gravar_rgb(a, p):
    h, w = a.shape[:2]
    fitz.Pixmap(fitz.csRGB, w, h, np.ascontiguousarray(a).tobytes(), False).save(p)


def colar(fundo, q, x0, y0):
    h, w = q.shape[:2]
    H, W = fundo.shape[:2]
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    sub = q[ya - y0:yb - y0, xa - x0:xb - x0]
    al = sub[:, :, 3:4] / 255.0
    fundo[ya:yb, xa:xb] = (sub[:, :, :3] * al + fundo[ya:yb, xa:xb] * (1 - al))


def sombra(fundo, cx, cy, rx, ry, forca=0.45):
    H, W = fundo.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    k = np.where(d < 1, forca * (1 - d * 0.5), 0)[:, :, None]
    fundo *= (1 - k)


def piso(W, H, ox, oy):
    """Piso isométrico quadriculado (casas de 128x64 na arte em dobro), com a casa (0, 0) em (ox, oy)."""
    img = np.zeros((H, W, 3))
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    # coordenadas do tabuleiro de cada pixel: x = (sx/64 + sy/32)/2, y = (sy/32 - sx/64)/2
    sx, sy = xx - ox, yy - oy
    gx = (sx / 64 + sy / 32) / 2
    gy = (sy / 32 - sx / 64) / 2
    xadrez = (np.floor(gx) + np.floor(gy)) % 2
    img[:] = np.where(xadrez[:, :, None] > 0, [46, 58, 54], [52, 66, 61])
    # junta entre as casas
    fx, fy = gx - np.floor(gx), gy - np.floor(gy)
    junta = (fx < 0.015) | (fy < 0.015)
    img[junta] = [34, 42, 40]
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pasta')
    ap.add_argument('filmagem')
    ap.add_argument('saida')
    ap.add_argument('--casas', type=float, default=1.91)
    ap.add_argument('--anim', default='andar')
    ap.add_argument('--reduzir', type=int, default=1, help='o mesmo do pixelar.py (pixel grosso)')
    ap.add_argument('--ampliar', type=int, default=1, help='amplia o GIF (pixel grosso fica visível)')
    a = ap.parse_args()
    info = json.load(open(a.filmagem, encoding='utf-8'))
    chao = [c / a.reduzir for c in info['chao']]
    global PASSO_TELA
    PASSO_TELA = {k: (v[0] / a.reduzir, v[1] / a.reduzir) for k, v in PASSO_TELA.items()}
    n = info['animacoes'][a.anim]['quadros']
    qs = {d: [ler(os.path.join(a.pasta, a.anim, d, f'{i:02d}.png')) for i in range(n)] for l in ORDEM for d in l}
    Hq, Wq = next(iter(qs.values()))[0].shape[:2]
    tmp = a.saida + '-quadros'
    os.makedirs(tmp, exist_ok=True)
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    # 1) grade no lugar
    cw, ch = int(150 / a.reduzir), int(230 / a.reduzir)
    c = 0
    for volta in range(3):
        for i in range(n):
            img = np.zeros((2 * ch, 4 * cw, 3))
            img[:] = (36, 33, 40)
            for r, l in enumerate(ORDEM):
                for col, d in enumerate(l):
                    cx, cy = col * cw + cw // 2, r * ch + ch - int(18 / a.reduzir)
                    sombra(img, cx, cy, 26 / a.reduzir, 10 / a.reduzir)
                    colar(img, qs[d][i], int(cx - chao[0]), int(cy - chao[1]))
            img = np.repeat(np.repeat(img, a.ampliar, 0), a.ampliar, 1)
            gravar_rgb(img.astype(np.uint8), os.path.join(tmp, f'g{c:03d}.png'))
            c += 1
    ms_quadro = 2 * 500 * a.casas / n / 2  # duração de um quadro do ciclo no tabuleiro
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', f'{1000 / ms_quadro:.3f}', '-i', os.path.join(tmp, 'g%03d.png'),
                    '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
                    '-loop', '0', a.saida + '-8direcoes.gif'], check=True)
    # 2) andando no piso: ida e volta em 4 direções (se, sw, e, s)
    W, H = int(760 / a.reduzir), int(420 / a.reduzir)
    ox, oy = W // 2, int(110 / a.reduzir)
    fundo = piso(W, H, ox, oy) if a.reduzir == 1 else piso(W * a.reduzir, H * a.reduzir, ox * a.reduzir, oy * a.reduzir)[::a.reduzir, ::a.reduzir]
    fps = 25
    c = 0
    for d in ('se', 'e', 's', 'sw'):
        vx, vy = PASSO_TELA[d]
        casas_total = 3.0
        t_total = casas_total * 500 * COMPR[d]
        quadros = int(t_total / (1000 / fps))
        # começa num canto de forma que o caminho fique no meio
        x0, y0 = ox - vx * casas_total / 2, oy + 160 / a.reduzir - vy * casas_total / 2
        for k in range(quadros + 8):
            t = min(k, quadros) * (1000 / fps)
            andou = t / (500 * COMPR[d])  # casas andadas
            dist = andou * COMPR[d]  # em casas de 0,68 m (na diagonal da tela é mais longe)
            fase = (dist / a.casas) % 1.0
            img = fundo.copy()
            px, py = x0 + vx * andou, y0 + vy * andou
            q = qs[d][int(fase * n) % n] if k < quadros else qs[d][int(fase * n) % n]
            sombra(img, px, py, 26 / a.reduzir, 10 / a.reduzir)
            colar(img, q, int(round(px - chao[0])), int(round(py - chao[1])))
            img = np.repeat(np.repeat(img, a.ampliar, 0), a.ampliar, 1)
            gravar_rgb(img.astype(np.uint8), os.path.join(tmp, f'p{c:03d}.png'))
            c += 1
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(tmp, 'p%03d.png'),
                    '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
                    '-loop', '0', a.saida + '-piso.gif'], check=True)
    print('ok', a.saida)


if __name__ == '__main__':
    main()
