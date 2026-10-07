"""
Folha de contato das peças vistas de cima (fundo xadrez escuro, cada uma ampliada até 256 px),
para olhar uma entrega da vista de cima inteira de uma vez antes de importar (scripts/3d/cima.py).

Uso: python scripts/3d/folha_cima.py <pasta com as PNGs> <saida.png>
"""
import glob
import os
import sys

import fitz
import numpy as np

pasta = sys.argv[1]
saida = sys.argv[2]


def ler(p):
    pix = fitz.Pixmap(p)
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4).copy()


arqs = sorted(glob.glob(os.path.join(pasta, '*.png')))
COL = 6
CEL = 270
lin = (len(arqs) + COL - 1) // COL
folha = np.zeros((lin * CEL, COL * CEL, 3), dtype=np.float32)
folha[:] = (30, 28, 26)
for i, a in enumerate(arqs):
    im = ler(a).astype(np.float32)
    h, w = im.shape[:2]
    k = max(1, int(min(256 / w, 256 / h)))
    im = im.repeat(k, axis=0).repeat(k, axis=1)
    h, w = im.shape[:2]
    if w > 256 or h > 256:
        f = max(w, h) / 256
        ys = (np.arange(int(h / f)) * f).astype(int)
        xs = (np.arange(int(w / f)) * f).astype(int)
        im = im[ys][:, xs]
        h, w = im.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    xadrez = np.where(((yy // 16 + xx // 16) % 2)[..., None] == 1, np.array([74, 70, 66], np.float32), np.array([58, 54, 50], np.float32))
    al = im[..., 3:4] / 255
    bloco = im[..., :3] * al + xadrez * (1 - al)
    y0 = (i // COL) * CEL + (CEL - h) // 2
    x0 = (i % COL) * CEL + (CEL - w) // 2
    folha[y0:y0 + h, x0:x0 + w] = bloco
img = np.clip(folha, 0, 255).astype(np.uint8)
fitz.Pixmap(fitz.csRGB, img.shape[1], img.shape[0], np.ascontiguousarray(img).tobytes(), False).save(saida)
for i, a in enumerate(arqs):
    print(i, os.path.basename(a))
