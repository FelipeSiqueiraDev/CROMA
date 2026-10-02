"""
Monta, a partir dos quadros pixelados, o que o jogo lê: uma tira por animação e
direção (os quadros lado a lado, recortados no que a animação ocupa) e o
anim.json (versão 2): tamanho do quadro, âncora (o chão embaixo do corpo),
quantos quadros, como tocar (ms por quadro, ou casas por ciclo no andar) e onde
ficam os pés em cada quadro (para a sombra de contato).

Uso: python exportar.py <pasta pixelada> <filmagem.json> <destino> <tocar.json> [--estado desarmado] [--escala 0.5]
"""
import argparse
import json
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


def pes_do_quadro(ossos, chao, escala):
    """Os dois pés: [dx, dy, altura no ar] em pixels da tela no zoom 1, a partir da âncora."""
    out = []
    for lado in ('l', 'r'):
        b, f = ossos.get(f'ball_{lado}'), ossos.get(f'foot_{lado}')
        if not b or not f:
            continue
        if len(b) >= 6:
            gx, gy = (b[3] + f[3]) / 2, (b[4] + f[4]) / 2
            alt = max(0.0, b[5] - 0.02) * 57.6
        else:
            gx, gy, alt = (b[0] + f[0]) / 2, max(b[1], f[1]), 0.0
        out.append([round((gx - chao[0]) * escala, 1), round((gy - chao[1]) * escala, 1), round(alt, 1)])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pixel')
    ap.add_argument('filmagem')
    ap.add_argument('destino')
    ap.add_argument('tocar')
    ap.add_argument('--estado', default='desarmado')
    ap.add_argument('--escala', type=float, default=0.5)
    a = ap.parse_args()
    info = json.load(open(a.filmagem, encoding='utf-8'))
    tocar = json.load(open(a.tocar, encoding='utf-8'))
    chao = info['chao']
    os.makedirs(a.destino, exist_ok=True)
    caminho_json = os.path.join(a.destino, 'anim.json')
    saida = json.load(open(caminho_json, encoding='utf-8')) if os.path.exists(caminho_json) else {'versao': 2, 'escala': a.escala, 'estados': {}}
    saida['versao'] = 2
    saida['escala'] = a.escala
    estado = saida['estados'].setdefault(a.estado, {})
    for anim, dados in info['animacoes'].items():
        regra = tocar.get(anim, {})
        for d, dd in dados['direcoes'].items():
            pasta = os.path.join(a.pixel, anim, d)
            qs = [ler(os.path.join(pasta, f'{i:02d}.png')) for i in range(dados['quadros'])]
            tudo = np.zeros(qs[0].shape[:2], dtype=bool)
            for q in qs:
                tudo |= q[:, :, 3] > 0
            ys, xs = np.nonzero(tudo)
            x0, y0 = max(0, xs.min() - 1), max(0, ys.min() - 1)
            x1, y1 = min(tudo.shape[1], xs.max() + 2), min(tudo.shape[0], ys.max() + 2)
            w, h = x1 - x0, y1 - y0
            tira = np.zeros((h, w * len(qs), 4), dtype=np.uint8)
            for i, q in enumerate(qs):
                tira[:, i * w:(i + 1) * w] = q[y0:y1, x0:x1]
            arq = f'{anim}-{a.estado}-{d}.png'
            gravar(tira, os.path.join(a.destino, arq))
            ent = {
                'arquivo': arq, 'quadros': len(qs), 'w': int(w), 'h': int(h),
                'ax': round(float(chao[0] - x0), 1), 'ay': round(float(chao[1] - y0), 1),
                'laco': bool(dados.get('laco', True)),
                'pes': [pes_do_quadro(o, chao, a.escala) for o in dd['ossos']],
            }
            for k in ('ms', 'casasPorCiclo', 'fase', 'segura'):
                if k in regra:
                    ent[k] = regra[k]
            estado.setdefault(d, {})[anim] = ent
        print(f'{anim}: {len(dados["direcoes"])} direções')
    with open(caminho_json, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(saida, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print('gravado', caminho_json)


if __name__ == '__main__':
    main()
