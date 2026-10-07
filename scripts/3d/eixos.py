"""
Confere se cada vista vai para um giro com o comprimento do móvel no eixo certo.

Numa caixa isométrica, o canto de cima (o mais alto da silhueta) fica a D/(W+D) da
esquerda: com o comprimento no eixo x (giros 4 e 0) ele fica perto da esquerda; no eixo y
(giros 2 e 6), perto da direita. Para cada móvel comprido (largura bem diferente do fundo),
mede essa fração em cada pedaço da folha e diz se o giro que a ficha deu combina.
Em móvel que não é caixa (microscópio, escada) a conta não vale: confira no olho.

Uso: python scripts/3d/eixos.py [moveis-bar.json ...]   (sem fichas, todas as moveis-*.json)
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import moveis as mv  # noqa: E402

R = mv.REPO + '/'
FICHAS = sys.argv[1:] or sorted(f for f in os.listdir(R + 'scripts/3d/fichas') if f.startswith('moveis-'))
for nome in FICHAS:
    cfg = json.load(open(R + 'scripts/3d/fichas/' + nome, encoding='utf-8'))
    folhas = {}
    for m in cfg['moveis']:
        if 'giros' not in m or not m.get('real') or m.get('pendurado') or m.get('por') == 'imagem':
            continue
        w, d = m['real'][0], m['real'][1]
        if max(w, d) / min(w, d) < 1.35:
            continue
        arq = m.get('folha', cfg.get('folha'))
        if arq not in folhas:
            f = mv.ler(R + arq)
            f[:, :, 3] = np.where(f[:, :, 3] < cfg.get('limpar', 0), 0, f[:, :, 3])
            folhas[arq] = (f, mv.pedacos(f[:, :, 3] > 16))
        folha, caixas = folhas[arq]
        esperado_x = d / (w + d)  # fração do canto de cima com o comprimento no eixo x
        esperado_y = w / (w + d)
        linha = []
        for giro, qual in m['giros'].items():
            pedaco, espelho = (qual, False) if isinstance(qual, int) else (qual['pedaco'], qual.get('espelho', False))
            rec = mv.recortar(folha, caixas, pedaco)
            if espelho:
                rec = rec[:, ::-1]
            op = rec[:, :, 3] > 100
            xs = np.nonzero(op.any(axis=0))[0]
            ys = np.array([np.nonzero(op[:, x])[0].min() for x in xs])
            # o canto de cima: a média dos x no topo (a tampa pode ser chata)
            topo = xs[ys <= ys.min() + 2]
            fr = (topo.mean() - xs.min()) / max(1, xs.max() - xs.min())
            eixo = 'x' if abs(fr - esperado_x) < abs(fr - esperado_y) else 'y'
            quer = 'x' if giro in ('4', '0') else 'y'
            linha.append(f"{giro}<-{pedaco}{'e' if espelho else ''} {fr:.2f}{'' if eixo == quer else ' TROCADO'}")
        ruim = any('TROCADO' in t for t in linha)
        print(f"{'!!' if ruim else '  '} {nome[7:-5]:11s} {m['def']:16s} (x {esperado_x:.2f} / y {esperado_y:.2f})  " + '  '.join(linha))
