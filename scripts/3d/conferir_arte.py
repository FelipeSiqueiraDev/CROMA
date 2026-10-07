"""
A conferência da arte que chegou, antes de entrar no jogo: mede cada imagem do moveis.json contra a
medida pedida (o "real" da ficha, o mesmo do gabarito) e diz o que volta para o gerador.

  python scripts/3d/conferir_arte.py [--so id1,id2] [--tudo]

- Móvel de chão: pela largura do desenho na tela e pela medida de verdade (largura na frente + fundo,
  nos dois eixos do chão), a base desenhada. Se ela passa das casas do móvel: VOLTA (o jogo encolhe a
  peça até caber, e ela fica mais baixa). Quanto o desenho é maior que a medida vai junto, como nota
  (a planta e a mesa redonda não são caixa: a nota não vale para elas).
- Item de parede: as bordas de cima e de baixo têm que seguir a parede (2 para 1: 0,5). Mais de 0,06
  de diferença: VOLTA (o jogo endireita o que é retângulo, mas o certo é vir certo). O que não tem
  borda reta (a arandela, a câmera) não dá para medir e fica de fora.
- Porta (portal): a largura na parede tem que ser a de 1 casa (0,75 m).

Sem --tudo, mostra só o que está fora da medida.
"""
import json
import os
import sys

import fitz
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PASTA = os.path.join(REPO, 'client', 'public', 'arte', 'mobiliario')
CASA = 0.75
PX_X = 32 / CASA


def ler(p):
    pix = fitz.Pixmap(p)
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4)


def largura(img):
    xs = np.nonzero((img[:, :, 3] > 40).any(axis=0))[0]
    return int(xs.max() - xs.min() + 1) if len(xs) else 0


def borda(alfa, de_cima):
    """A reta da borda de cima (ou de baixo) no miolo do desenho: a inclinação e o erro médio, em pixels."""
    cols = np.nonzero(alfa.any(axis=0))[0]
    x0, x1 = cols.min(), cols.max()
    xs, ys = [], []
    for x in range(int(x0 + (x1 - x0) * 0.2), int(x1 - (x1 - x0) * 0.2) + 1):
        col = np.nonzero(alfa[:, x])[0]
        if len(col):
            xs.append(x)
            ys.append(col.min() if de_cima else col.max())
    if len(xs) < 4:
        return None
    a, b = np.polyfit(xs, ys, 1)
    return a, float(np.abs(np.polyval([a, b], xs) - ys).mean())


def casas_do_movel():
    """As casas (largura × fundo) de cada móvel, lidas do furni.ts."""
    import re
    texto = open(os.path.join(REPO, 'shared', 'src', 'furni.ts'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"\{ id: '([^']+)'[^\n]*?width: ([\d.]+), depth: ([\d.]+)", texto):
        out[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    return out


def main():
    so = sys.argv[sys.argv.index('--so') + 1].split(',') if '--so' in sys.argv else None
    tudo = '--tudo' in sys.argv
    moveis = json.load(open(os.path.join(PASTA, 'moveis.json'), encoding='utf-8'))
    casas = casas_do_movel()
    voltam = 0
    for chave, a in sorted(moveis.items()):
        base_id = chave.split('~')[0].split('@')[0]
        if so and chave not in so and base_id not in so:
            continue
        linhas = []
        if a.get('parede'):
            for lado, vista in sorted(a['parede'].items()):
                if '-' in lado:
                    continue
                alfa = ler(os.path.join(PASTA, vista['arquivo']))[:, :, 3] > 100
                cima, baixo = borda(alfa, True), borda(alfa, False)
                alvo = 0.5 if lado == 'r' else -0.5
                # a mesma regra do jogo (inclinacaoDoDesenho, em furniArte.ts): as duas bordas retas e
                # paralelas, ou uma só bem reta
                inc = None
                if cima and baixo and cima[1] <= 1.6 and baixo[1] <= 1.6 and abs(cima[0] - baixo[0]) <= 0.07:
                    inc = (cima[0] + baixo[0]) / 2
                else:
                    reta = min((b for b in (cima, baixo) if b), key=lambda b: b[1], default=None)
                    if reta and reta[1] <= 0.6:
                        inc = reta[0]
                if inc is None:
                    linhas.append((True, f'parede {lado}: sem borda reta (não é retângulo), não dá para medir'))
                    continue
                ok = abs(inc - alvo) <= 0.06
                linhas.append((ok, f'parede {lado}: bordas a {inc:+.2f} (a parede: {alvo:+.1f})'))
        elif a.get('giros') and a.get('real') and base_id in casas:
            rw, rd, rh = a['real']
            W, D = casas[base_id]
            larguras = [largura(ler(os.path.join(PASTA, v['arquivo']))) * a['escala'] for v in a['giros'].values() if v]
            medida = sorted(larguras)[len(larguras) // 2]
            vezes = medida / ((rw + rd) * PX_X)
            if base_id == 'portal':
                parede = medida / PX_X - rd
                ok = abs(parede - W * CASA) <= 0.04
                linhas.append((ok, f'porta: {parede:.2f} m na parede (a casa: {W * CASA:.2f} m)'))
            else:
                bw, bd = rw * vezes, rd * vezes
                cabe = bw <= W * CASA * 1.01 and bd <= D * CASA * 1.01
                ok = cabe
                nota = '' if cabe else f'; a base ({bw:.2f} x {bd:.2f} m) passa das casas ({W * CASA:.2f} x {D * CASA:.2f} m)'
                linhas.append((ok, f'desenho {vezes:.2f}x o tamanho de verdade ({rw:.2f} x {rd:.2f} x {rh:.2f} m){nota}'))
        for ok, t in linhas:
            if not ok:
                voltam += 1
            if tudo or not ok:
                print(f"{'ok   ' if ok else 'VOLTA'}  {chave:24} {t}")
    print(f'\n{voltam} fora da medida.')


if __name__ == '__main__':
    main()
