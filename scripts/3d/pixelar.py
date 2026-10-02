"""
Transforma a filmagem do Blender (cor sem luz + normal) em pixel art.

- Luz do jeito do pixel art: de cima, da esquerda e um pouco da frente, em
  faixas (sombra, meio, luz), com a sombra puxando para o roxo e a luz para o
  amarelo (como os artistas fazem), mais uma borda de luz fria nas costas.
- Contorno de 1 pixel em volta do corpo, na cor da parte escurecida (não preto
  chapado), e linhas finas onde uma parte passa na frente da outra.
- Paleta: as cores de todos os quadros são juntadas e reduzidas numa paleta só
  do personagem (o mesmo tom em todo quadro: nada tremendo).

Uso: python pixelar.py <pasta da filmagem> <pasta de saída> [--cores 40]
"""
import argparse
import glob
import json
import math
import os
import sys

import fitz
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')


def ler(p):
    pix = fitz.Pixmap(p)
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4).copy()


def gravar(a, p):
    h, w = a.shape[:2]
    fitz.Pixmap(fitz.csRGB, w, h, np.ascontiguousarray(a).tobytes(), True).save(p)


def norm(v):
    v = np.asarray(v, dtype=float)
    return v / np.linalg.norm(v)


# a câmera do tabuleiro, no mundo do Blender
DIREITA = norm((1, 1, 0))
CIMA = norm((-0.354, 0.354, 0.866))
FRENTE_CAM = norm((-0.612, 0.612, -0.5))
PARA_CAMERA = -FRENTE_CAM
LUZ = norm(-0.55 * DIREITA + 0.8 * CIMA + 0.45 * PARA_CAMERA)
BORDA = norm(0.7 * DIREITA + 0.3 * CIMA - 0.6 * PARA_CAMERA)


def srgb_para_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_para_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255.0


def sombrear(cor, normal, alfa):
    """Cor final de cada pixel: a cor da parte, na faixa de luz dele."""
    n = normal[:, :, :3].astype(float) / 255.0 * 2 - 1
    comp = np.linalg.norm(n, axis=2, keepdims=True)
    n = n / np.maximum(comp, 1e-6)
    d = n @ LUZ
    b = n @ BORDA
    alb = srgb_para_linear(cor[:, :, :3].astype(float))
    # faixas: luz forte, meio, sombra
    fator = np.where(d > 0.62, 1.18, np.where(d > 0.12, 1.0, 0.58))[:, :, None]
    sai = alb * fator
    # sombra puxa para o roxo; luz forte para o amarelo quente
    roxo = np.array([0.30, 0.22, 0.42])
    quente = np.array([1.0, 0.92, 0.70])
    em_sombra = (d <= 0.12)[:, :, None]
    em_luz = (d > 0.62)[:, :, None]
    sai = np.where(em_sombra, sai * 0.82 + alb * roxo * 0.18, sai)
    sai = np.where(em_luz, sai * 0.9 + alb * quente * 0.1, sai)
    # borda fria nas costas (separa o corpo do chão escuro)
    borda = ((b > 0.55) & (d <= 0.62))[:, :, None]
    sai = np.where(borda, sai * 0.85 + np.array([0.55, 0.62, 0.75]) * alb.mean(axis=2, keepdims=True) * 0.6, sai)
    out = np.zeros_like(cor)
    out[:, :, :3] = linear_para_srgb(sai).round().astype(np.uint8)
    out[:, :, 3] = np.where(alfa, 255, 0)
    return out, n


def contornar(img, n, alfa, k_borda=0.38, k_dentro=0.68):
    """Contorno de fora (na cor da parte, bem escura) e linhas onde uma parte passa na frente da outra."""
    H, W = alfa.shape
    out = img.copy()
    pad = np.pad(alfa, 1)
    viz = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    fora = viz & ~alfa
    # a cor do contorno de fora: a do vizinho de dentro, escurecida
    cor = img[:, :, :3].astype(float)
    acc = np.zeros((H, W, 3))
    cnt = np.zeros((H, W))
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        a2 = np.roll(np.roll(alfa, dy, 0), dx, 1)
        c2 = np.roll(np.roll(cor, dy, 0), dx, 1)
        acc += c2 * a2[:, :, None]
        cnt += a2
    media = acc / np.maximum(cnt, 1)[:, :, None]
    out[fora, :3] = (media[fora] * k_borda).round().astype(np.uint8)
    out[fora, 3] = 255
    # dentro: quebra forte de normal (um braço na frente do tronco) vira linha
    linha = np.zeros((H, W), dtype=bool)
    for dy, dx in ((1, 0), (0, 1)):
        n2 = np.roll(np.roll(n, -dy, 0), -dx, 1)
        a2 = np.roll(np.roll(alfa, -dy, 0), -dx, 1)
        quebra = (np.sum(n * n2, axis=2) < 0.35) & alfa & a2
        linha |= quebra
    out[linha, :3] = (img[linha, :3].astype(float) * k_dentro).round().astype(np.uint8)
    return out


def paleta_comum(quadros, k=40, iters=12):
    """Reduz as cores de todos os quadros a `k` (k-médias), para o mesmo tom em todo quadro."""
    cores = np.concatenate([q[q[:, :, 3] > 0][:, :3] for q in quadros]).astype(float)
    if len(cores) > 60000:
        cores = cores[np.random.default_rng(0).choice(len(cores), 60000, replace=False)]
    uniq = np.unique(cores, axis=0)
    if len(uniq) <= k:
        return uniq
    rng = np.random.default_rng(1)
    cent = uniq[rng.choice(len(uniq), k, replace=False)]
    for _ in range(iters):
        d = ((cores[:, None, :] - cent[None, :, :]) ** 2).sum(axis=2)
        lab = d.argmin(axis=1)
        for i in range(k):
            m = lab == i
            if m.any():
                cent[i] = cores[m].mean(axis=0)
    return cent


def aplicar_paleta(img, pal):
    out = img.copy()
    m = img[:, :, 3] > 0
    c = img[m][:, :3].astype(float)
    d = ((c[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2)
    out[m, :3] = pal[d.argmin(axis=1)].round().astype(np.uint8)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('filmagem')
    ap.add_argument('saida')
    ap.add_argument('--cores', type=int, default=40)
    a = ap.parse_args()
    info = json.load(open(os.path.join(a.filmagem, 'filmagem.json'), encoding='utf-8'))
    todos = {}
    for anim, dados in info['animacoes'].items():
        for d in dados['direcoes']:
            pasta = os.path.join(a.filmagem, anim, d)
            qs = []
            for i in range(dados['quadros']):
                cor = ler(os.path.join(pasta, f'cor-{i:02d}.png'))
                nor = ler(os.path.join(pasta, f'normal-{i:02d}.png'))
                alfa = cor[:, :, 3] > 127
                img, n = sombrear(cor, nor, alfa)
                qs.append(contornar(img, n, alfa))
            todos[(anim, d)] = qs
    pal = paleta_comum([q for qs in todos.values() for q in qs], a.cores)
    for (anim, d), qs in todos.items():
        pasta = os.path.join(a.saida, anim, d)
        os.makedirs(pasta, exist_ok=True)
        for i, q in enumerate(qs):
            gravar(aplicar_paleta(q, pal), os.path.join(pasta, f'{i:02d}.png'))
    print('paleta', len(pal), 'cores;', sum(len(q) for q in todos.values()), 'quadros em', a.saida)


if __name__ == '__main__':
    main()
