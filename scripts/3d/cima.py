"""
A arte vista de cima (mapa tático) para dentro do jogo.

Cada <folha>-cima.png vai para o móvel daquela folha isométrica (as fichas de
scripts/3d/fichas/ dizem qual móvel usa qual folha): client/public/arte/mobiliario/
<móvel>/cima.png, e entra no moveis.json ("cima"). O estado que muda o que se vê de
cima vem como <folha>-cima-<estado>.png (o baú aberto, a porta da cela aberta) e entra
em "cimaEstados", pelo número do estado da ficha. A parede (parede-cima-<piso>.png) e as
fichas das peças (ficha-agente.png, ficha-ameaca.png) vão para client/public/arte/tatico/.

Junto vai o recorte do móvel na imagem ("caixa": onde o alfa começa e acaba, em pixels): o
jogo põe esse recorte no tamanho de verdade do móvel ("real"), na casa de agora, seja qual
for a escala em que a imagem foi desenhada.

O formato está no docs/ARTE.md ("Vista de cima"). Uso:

    python scripts/3d/cima.py <pasta com as PNGs>
"""
import glob
import json
import os
import re
import shutil
import sys

import fitz
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MOBILIARIO = os.path.join(REPO, 'client', 'public', 'arte', 'mobiliario')
TATICO = os.path.join(REPO, 'client', 'public', 'arte', 'tatico')
FICHAS = ('ficha-agente.png', 'ficha-ameaca.png')


def recorte(caminho):
    """Onde o desenho está na imagem: [x0, y0, x1, y1] em pixels (o alfa acima de quase nada)."""
    pix = fitz.Pixmap(caminho)
    if not pix.alpha:
        return [0, 0, pix.width, pix.height]
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[..., 3]
    ys, xs = np.nonzero(a > 8)
    if not len(xs):
        return [0, 0, pix.width, pix.height]
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def folhas():
    """O nome de cada folha isométrica (sem o .png) e os móveis que saem dela."""
    out = {}
    for f in sorted(glob.glob(os.path.join(REPO, 'scripts', '3d', 'fichas', 'moveis-*.json'))):
        for m in json.load(open(f, encoding='utf-8')).get('moveis', []):
            if m.get('folha'):
                out.setdefault(os.path.basename(m['folha'])[:-4], []).append(m)
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pasta = sys.argv[1]
    mapa = folhas()
    arq_lista = os.path.join(MOBILIARIO, 'moveis.json')
    lista = json.load(open(arq_lista, encoding='utf-8'))
    os.makedirs(TATICO, exist_ok=True)
    feitos = []
    sobras = []
    for caminho in sorted(glob.glob(os.path.join(pasta, '*.png'))):
        nome = os.path.basename(caminho)
        if nome in FICHAS:
            shutil.copyfile(caminho, os.path.join(TATICO, nome))
            feitos.append(f'{nome} -> tatico/{nome}')
            continue
        m = re.fullmatch(r'parede-cima-(.+)\.png', nome)
        if m:
            destino = f'parede-{m.group(1)}.png'
            shutil.copyfile(caminho, os.path.join(TATICO, destino))
            feitos.append(f'{nome} -> tatico/{destino}')
            continue
        m = re.fullmatch(r'(.+)-cima(?:-(.+))?\.png', nome)
        if not m or m.group(1) not in mapa:
            sobras.append(f'{nome} (nenhuma ficha usa a folha {m.group(1) if m else nome})')
            continue
        base, estado = m.group(1), m.group(2)
        for mv in mapa[base]:
            d = mv['def']
            ent = lista.get(d)
            if ent is None:
                sobras.append(f'{nome} ({d} ainda sem arte no moveis.json)')
                continue
            if estado:
                # o número do estado: o da ficha cuja folha tem o nome dele ("aberta", "aberto")
                num = next((k for k, v in (mv.get('estados') or {}).items() if estado in os.path.basename(v)), None)
                if num is None:
                    sobras.append(f'{nome} (a ficha de {d} não tem o estado "{estado}")')
                    continue
                arquivo = f'{d}/cima-{num}.png'
                ent.setdefault('cimaEstados', {})[num] = {'arquivo': arquivo, 'caixa': recorte(caminho)}
            else:
                arquivo = f'{d}/cima.png'
                ent['cima'] = {'arquivo': arquivo, 'caixa': recorte(caminho)}
            os.makedirs(os.path.join(MOBILIARIO, d), exist_ok=True)
            shutil.copyfile(caminho, os.path.join(MOBILIARIO, arquivo))
            feitos.append(f'{nome} -> mobiliario/{arquivo}')
    with open(arq_lista, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(lista, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('\n'.join(feitos))
    print(f'{len(feitos)} imagens no jogo.')
    if sobras:
        print('Sem lugar:')
        for s in sobras:
            print('  ' + s)


if __name__ == '__main__':
    main()
