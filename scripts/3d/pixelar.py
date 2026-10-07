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


def reduzir(cor, normal, k, escuro=55):
    """
    Pixel grosso: cada bloco k×k da filmagem vira 1 pixel. Fica corpo quando metade
    do bloco é corpo; a cor é a que mais aparece no bloco (sem misturar: pixel art não
    tem cor de meio-termo); a normal é a média.
    """
    escuro_min = escuro
    H, W = cor.shape[:2]
    h, w = H // k, W // k
    c = cor[:h * k, :w * k].reshape(h, k, w, k, 4).transpose(0, 2, 1, 3, 4).reshape(h, w, k * k, 4)
    n = normal[:h * k, :w * k].reshape(h, k, w, k, 4).transpose(0, 2, 1, 3, 4).reshape(h, w, k * k, 4)
    op = c[:, :, :, 3] > 127
    alfa = op.sum(axis=2) * 2 >= k * k
    # a cor mais frequente entre as do bloco que são corpo
    chave = (c[:, :, :, 0].astype(np.int64) << 16) | (c[:, :, :, 1].astype(np.int64) << 8) | c[:, :, :, 2]
    chave = np.where(op, chave, -1)
    out_c = np.zeros((h, w, 4), dtype=np.uint8)
    out_n = np.zeros((h, w, 4), dtype=np.uint8)
    for yy in range(h):
        for xx in range(w):
            if not alfa[yy, xx]:
                continue
            ks = chave[yy, xx][chave[yy, xx] >= 0]
            vals, cont = np.unique(ks, return_counts=True)
            v = vals[cont.argmax()]
            # traço fino e escuro (aro dos óculos, olho, sobrancelha, cinto) não some na redução:
            # se um pedaço do bloco é bem mais escuro que o resto, ele ganha
            lum = lambda c: 0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255)
            escuro_c = vals[np.argmin([lum(x) for x in vals])]
            if escuro_min and lum(escuro_c) < lum(v) - escuro_min:
                v = escuro_c
            out_c[yy, xx, :3] = ((v >> 16) & 255, (v >> 8) & 255, v & 255)
            out_c[yy, xx, 3] = 255
            m = op[yy, xx]
            nn = n[yy, xx][m][:, :3].astype(float).mean(axis=0)
            out_n[yy, xx, :3] = nn.round().astype(np.uint8)
            out_n[yy, xx, 3] = 255
    return out_c, out_n


def reduzir_na_paleta(cor, normal, k, pal, escuro=55):
    """
    Pixel grosso já na paleta: cada pixel vira a cor mais próxima da paleta, e cada bloco
    k×k fica com a que mais aparece nele (o traço bem mais escuro ganha, se `escuro`).
    """
    H, W = cor.shape[:2]
    h, w = H // k, W // k
    c = cor[:h * k, :w * k]
    n = normal[:h * k, :w * k]
    op = c[:, :, 3] > 127
    idx = np.full((h * k, w * k), -1, dtype=np.int64)
    rgb = c[op][:, :3].astype(float)
    d = ((rgb[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2)
    idx[op] = d.argmin(axis=1)
    bloco = (np.arange(h * k)[:, None] // k) * w + (np.arange(w * k)[None, :] // k)
    P = len(pal)
    cont = np.zeros((h * w, P), dtype=np.int32)
    np.add.at(cont, (bloco[op], idx[op]), 1)
    total = cont.sum(axis=1)
    alfa = total * 2 >= k * k
    moda = cont.argmax(axis=1)
    if escuro:
        lum = pal @ np.array([0.3, 0.59, 0.11])
        presente = cont > 0
        lum_presente = np.where(presente, lum[None, :], np.inf)
        mais_escuro = lum_presente.argmin(axis=1)
        troca = lum[mais_escuro] < lum[moda] - escuro
        moda = np.where(troca, mais_escuro, moda)
    out_c = np.zeros((h * w, 4), dtype=np.uint8)
    out_c[:, :3] = pal[moda].round().astype(np.uint8)
    out_c[:, 3] = np.where(alfa, 255, 0)
    out_c[~alfa, :3] = 0
    # a normal: a média das do bloco que são corpo
    nn = n[:, :, :3].astype(float) * op[:, :, None]
    soma = np.zeros((h * w, 3))
    np.add.at(soma, bloco.ravel(), nn.reshape(-1, 3))
    out_n = np.zeros((h * w, 4), dtype=np.uint8)
    out_n[:, :3] = (soma / np.maximum(total, 1)[:, None]).round().astype(np.uint8)
    out_n[:, 3] = np.where(alfa, 255, 0)
    return out_c.reshape(h, w, 4), out_n.reshape(h, w, 4)


def paleta_da_imagem(caminho, k=32):
    """A paleta da arte do personagem (o que não é fundo), reduzida a `k` cores."""
    a = ler(caminho)
    verde = (a[:, :, 0] < 60) & (a[:, :, 1] > 200) & (a[:, :, 2] < 60)
    branco = (a[:, :, 0] > 245) & (a[:, :, 1] > 245) & (a[:, :, 2] > 245)
    m = (a[:, :, 3] >= 128) & ~verde & ~branco
    fake = np.zeros((1, int(m.sum()), 4), dtype=np.uint8)
    fake[0, :, :3] = a[m][:, :3]
    fake[0, :, 3] = 255
    return paleta_comum([fake], k)


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
    ap.add_argument('--reduzir', type=int, default=1, help='pixel grosso: cada bloco N×N da filmagem vira 1 pixel')
    ap.add_argument('--paleta', help='imagem da arte do personagem: as cores saem dela')
    ap.add_argument('--contorno', type=float, default=0.38, help='quão escuro é o contorno (0 = preto)')
    ap.add_argument('--linha', type=float, default=0.68, help='quão escura é a linha onde uma parte passa na frente da outra (1 = sem linha)')
    ap.add_argument('--escuro', type=float, default=55, help='na redução, o traço escuro ganha do resto do bloco se for tanto mais escuro (0 = não ganha)')
    ap.add_argument('--arte', action='store_true', help='a cor já vem da arte do personagem (montar_arte.py): sem luz por cima')
    a = ap.parse_args()
    info = json.load(open(os.path.join(a.filmagem, 'filmagem.json'), encoding='utf-8'))
    pal_arte = paleta_da_imagem(a.paleta, a.cores) if a.paleta else None
    todos = {}
    for anim, dados in info['animacoes'].items():
        for d in dados['direcoes']:
            pasta = os.path.join(a.filmagem, anim, d)
            qs = []
            for i in range(dados['quadros']):
                cor = ler(os.path.join(pasta, f'cor-{i:02d}.png'))
                nor = ler(os.path.join(pasta, f'normal-{i:02d}.png'))
                if a.reduzir > 1 and a.arte and pal_arte is not None:
                    cor, nor = reduzir_na_paleta(cor, nor, a.reduzir, pal_arte, a.escuro)
                elif a.reduzir > 1:
                    cor, nor = reduzir(cor, nor, a.reduzir, a.escuro)
                alfa = cor[:, :, 3] > 127
                img, n = sombrear(cor, nor, alfa)
                if a.arte:
                    # a cor veio da arte, já com a luz e a sombra do desenho: fica como está
                    img[:, :, :3] = np.where(alfa[:, :, None], cor[:, :, :3], 0)
                qs.append(contornar(img, n, alfa, k_borda=a.contorno, k_dentro=a.linha))
            todos[(anim, d)] = qs
    pal = pal_arte if pal_arte is not None else paleta_comum([q for qs in todos.values() for q in qs], a.cores)
    for (anim, d), qs in todos.items():
        pasta = os.path.join(a.saida, anim, d)
        os.makedirs(pasta, exist_ok=True)
        for i, q in enumerate(qs):
            gravar(aplicar_paleta(q, pal), os.path.join(pasta, f'{i:02d}.png'))
    print('paleta', len(pal), 'cores;', sum(len(q) for q in todos.values()), 'quadros em', a.saida)


if __name__ == '__main__':
    main()
