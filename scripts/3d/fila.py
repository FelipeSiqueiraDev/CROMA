"""
Três módulos de um móvel lado a lado, como no tabuleiro (giro e passo em casas), para conferir a emenda
(balcão, bancada, prateleira: lado a lado não pode dar degrau). Lê a arte já importada (moveis.json).

Uso: python scripts/3d/fila.py <móvel> <giro> <passo em casas> <saida.png>
     python scripts/3d/fila.py bar_counter 4 1 fila.png
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import moveis  # noqa: E402
R = moveis.REPO + '/client/public/arte/mobiliario/'
defid, giro, passo, saida = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
v = json.load(open(R + 'moveis.json', encoding='utf-8'))[defid]['giros'][giro]
f = moveis.ler(R + v['arquivo']).astype(float)
H, W = f.shape[:2]
# passo em casas ao longo de x (giros 0/4) ou de y (giros 2/6); na imagem em dobro: casa = (64, 32) ou (-64, 32)
dx, dy = (64 * passo, 32 * passo) if giro in ('0', '4') else (-64 * passo, 32 * passo)
pos = [(i * dx, i * dy) for i in range(3)]
x0 = min(p[0] for p in pos); y0 = min(p[1] for p in pos)
lona = np.zeros((H + max(p[1] for p in pos) - y0 + 40, W + max(p[0] for p in pos) - x0 + 40, 4))
for px, py in pos:
    ox, oy = px - x0 + 20, py - y0 + 20
    reg = lona[oy:oy + H, ox:ox + W]
    a = f[:, :, 3:4] / 255
    reg[:, :, :3] = f[:, :, :3] * a + reg[:, :, :3] * (1 - a)
    reg[:, :, 3:4] = np.maximum(reg[:, :, 3:4], f[:, :, 3:4])
c = lona[:, :, :3] * (lona[:, :, 3:4] / 255) + 225 * (1 - lona[:, :, 3:4] / 255)
moveis.gravar(np.concatenate([c.clip(0, 255).astype(np.uint8), np.full(c.shape[:2] + (1,), 255, np.uint8)], axis=2), saida)
print('ok', c.shape)
