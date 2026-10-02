"""
Poses do tabuleiro a partir da imagem do gerador (docs/ARTE.md, "Poses do tabuleiro").

Recebe a imagem com as 8 direções de um personagem parado numa grade 4x2 (em
cima: costas, costas virado para a direita, de lado para a direita, frente
virado para a direita; embaixo: frente, frente virado para a esquerda, de lado
para a esquerda, costas virado para a esquerda), com fundo transparente ou
verde puro. Recorta cada direção, reduz para a altura do tabuleiro em pixel
duro (a cor mais frequente de cada bloco, sem misturar), deixa o corpo
opaco e grava, na pasta do personagem:

- idle-<estado>-<direção>.png: a pose parada;
- com --passos, também andar-<estado>-<direção>-<1..8>.png: um passo simples
  montado da pose parada (só as pernas de baixo se mexem). O boneco animado
  de verdade (respirando, piscando e com o ciclo de andar inteiro) sai de
  scripts/boneco.py, a partir destas poses paradas: npm run arte:boneco.

Todos os quadros de uma direção têm o mesmo tamanho e os pés no mesmo ponto.

Uso:
  python scripts/poses.py <imagem.png> <personagem> [--estado desarmado] [--altura 104] [--passos]

Precisa de Python com PyMuPDF e numpy (os mesmos do Veríssimo).
"""
import argparse
import os
import sys

import fitz
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, 'client', 'public', 'arte', 'personagens')
SUB = 'tabuleiro-32bits'
ESTADOS = ['desarmado', 'armado', 'desarmado-machucado', 'armado-machucado']
# a grade da imagem: linha a linha, coluna a coluna
ORDEM = [['n', 'ne', 'e', 'se'], ['s', 'sw', 'w', 'nw']]
QUADROS = 8
# folga em volta da pose, para as pernas e o tronco se mexerem dentro do quadro
FOLGA_LADO = 8
FOLGA_CIMA = 4


def ler(caminho):
    pix = fitz.Pixmap(caminho)
    if pix.n - pix.alpha < 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4).copy()
    # fundo verde puro (#00FF00) vira transparente
    verde = (a[:, :, 0] < 60) & (a[:, :, 1] > 200) & (a[:, :, 2] < 60)
    a[verde] = 0
    return a


def gravar(a, caminho):
    h, w = a.shape[:2]
    pix = fitz.Pixmap(fitz.csRGB, w, h, np.ascontiguousarray(a).tobytes(), True)
    pix.save(caminho)


def faixas(v, minimo=3):
    out, dentro, ini = [], False, 0
    for i, x in enumerate(v):
        if x >= minimo and not dentro:
            dentro, ini = True, i
        elif x < minimo and dentro:
            dentro = False
            out.append((ini, i - 1))
    if dentro:
        out.append((ini, len(v) - 1))
    return out


def recortar(img):
    """As 8 poses da grade 4x2, cada uma recortada no corpo, com o corpo opaco e o halo fora."""
    op = img[:, :, 3] >= 128
    cols = faixas(op.sum(axis=0))
    lins = faixas(op.sum(axis=1))
    if len(cols) != 4 or len(lins) != 2:
        raise SystemExit(f'Esperava uma grade 4x2 de poses; achei {len(cols)} colunas e {len(lins)} linhas.')
    poses = {}
    for r, (ya, yb) in enumerate(lins):
        for c, (xa, xb) in enumerate(cols):
            cel = img[ya:yb + 1, xa:xb + 1].copy()
            m = cel[:, :, 3] >= 128
            ys, xs = np.nonzero(m)
            cel = cel[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            m = cel[:, :, 3] >= 128
            cel[~m] = 0
            cel[m, 3] = 255
            poses[ORDEM[r][c]] = cel
    return poses


def reduzir(rgba, escala):
    """Pixel duro: cada pixel novo pega a cor mais frequente do bloco (agrupada), e só fica opaco se o bloco for mais da metade corpo."""
    h, w = rgba.shape[:2]
    oh, ow = max(1, int(round(h * escala))), max(1, int(round(w * escala)))
    out = np.zeros((oh, ow, 4), dtype=np.uint8)
    op = rgba[:, :, 3] >= 128
    for v in range(oh):
        y0 = int(v / escala)
        y1 = max(y0 + 1, int((v + 1) / escala))
        for u in range(ow):
            x0 = int(u / escala)
            x1 = max(x0 + 1, int((u + 1) / escala))
            bloco = op[y0:y1, x0:x1]
            if bloco.size == 0 or bloco.mean() < 0.5:
                continue
            cores = rgba[y0:y1, x0:x1, :3][bloco].astype(int)
            chave = (cores[:, 0] // 24) * 10000 + (cores[:, 1] // 24) * 100 + cores[:, 2] // 24
            vals, cont = np.unique(chave, return_counts=True)
            out[v, u, :3] = cores[chave == vals[cont.argmax()]].mean(axis=0).round().astype(np.uint8)
            out[v, u, 3] = 255
    return out


def limpar(a):
    """Tira pixel solto (opaco com menos de 2 vizinhos opacos) e fecha furo de 1 pixel."""
    op = a[:, :, 3] > 0
    pad = np.pad(op, 1)
    viz = pad[:-2, 1:-1].astype(int) + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]
    b = a.copy()
    b[op & (viz < 2)] = 0
    furo = ~op & (viz == 4)
    if furo.any():
        ys, xs = np.nonzero(furo)
        for y, x in zip(ys, xs):
            vz = [a[yy, xx] for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))]
            b[y, x] = np.mean(vz, axis=0).astype(np.uint8)
            b[y, x, 3] = 255
    return b


def enquadrar(pose):
    """A pose num quadro com folga em volta (a mesma em todos os quadros da direção)."""
    h, w = pose.shape[:2]
    q = np.zeros((h + FOLGA_CIMA, w + 2 * FOLGA_LADO, 4), dtype=np.uint8)
    q[FOLGA_CIMA:, FOLGA_LADO:FOLGA_LADO + w] = pose
    return q


def colar(base, camada, dx=0, dy=0):
    """Cola a camada por cima da base, deslocada (dx, dy)."""
    h, w = base.shape[:2]
    out = base.copy()
    ys, xs = np.nonzero(camada[:, :, 3] > 0)
    ys2, xs2 = ys + dy, xs + dx
    ok = (ys2 >= 0) & (ys2 < h) & (xs2 >= 0) & (xs2 < w)
    out[ys2[ok], xs2[ok]] = camada[ys[ok], xs[ok]]
    return out


def cisalhar(camada, y0, y1, desloc):
    """Inclina a camada: a linha y0 fica no lugar e a y1 anda `desloc` pixels (a perna vai para a frente ou para trás)."""
    out = np.zeros_like(camada)
    for y in range(camada.shape[0]):
        if y < y0:
            out[y] = camada[y]
            continue
        k = (y - y0) / max(1, y1 - y0)
        d = int(round(desloc * k))
        linha = camada[y]
        if d > 0:
            out[y, d:] = linha[:-d]
        elif d < 0:
            out[y, :d] = linha[-d:]
        else:
            out[y] = linha
    return out


def pedacos(m):
    """Pedaços ligados (vizinhos de lado e de cima/baixo) de uma máscara: lista de listas de (y, x)."""
    vistos = np.zeros_like(m, dtype=bool)
    out = []
    H, W = m.shape
    for y0, x0 in zip(*np.nonzero(m)):
        if vistos[y0, x0]:
            continue
        pilha, peca = [(y0, x0)], []
        vistos[y0, x0] = True
        while pilha:
            y, x = pilha.pop()
            peca.append((y, x))
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not vistos[yy, xx]:
                    vistos[yy, xx] = True
                    pilha.append((yy, xx))
        out.append(peca)
    return out


def trocar_lascas(a, b, minimo=10):
    """Lasca pequena solta numa perna (um fiapo do contorno da outra, cortado no vão) passa para a outra perna."""
    for de, para in ((a, b), (b, a)):
        pecas = pedacos(de[:, :, 3] > 0)
        if len(pecas) < 2:
            continue
        maior = max(len(p) for p in pecas)
        for p in pecas:
            if len(p) < minimo and len(p) < maior:
                for y, x in p:
                    para[y, x] = de[y, x]
                    de[y, x] = 0


def escurecer(camada, k=0.72):
    out = camada.copy()
    m = out[:, :, 3] > 0
    out[m, :3] = (out[m, :3].astype(float) * k).astype(np.uint8)
    return out


# para onde a peça olha, na tela (x, y): as diagonais andam 2 para o lado e 1 para cima ou para baixo, como a grade
FRENTE = {
    's': (0.0, 0.6), 'n': (0.0, -0.6), 'e': (1.0, 0.0), 'w': (-1.0, 0.0),
    'se': (0.85, 0.42), 'sw': (-0.85, 0.42), 'ne': (0.85, -0.42), 'nw': (-0.85, -0.42),
}


def passos(q, direcao, altura_alvo=104):
    """
    Os 8 quadros do passo a partir da pose parada `q` (já enquadrada).

    Um ciclo tem dois passos. Cada perna tem a sua fase ψ: o pé fica a
    cos(ψ) para a frente; na metade em que volta de trás para a frente, ele
    está no ar (sobe sen); na outra, está no chão. As duas pernas andam em
    oposição. No quadro 0 um pé está na frente e o outro atrás (os dois no
    chão); no 2 e no 6 um pé passa pelo outro no ar, e o tronco fica no alto.
    Só a perna de baixo (do joelho para baixo) se mexe; em cima, uma emenda
    parada cobre as frestas.
    """
    H, W = q.shape[:2]
    op = q[:, :, 3] > 0
    ys, xs = np.nonzero(op)
    topo, base = ys.min(), ys.max()
    alt = base - topo + 1
    k = alt / altura_alvo
    lado = direcao in ('e', 'w')
    # pernas de baixo: da altura do joelho para baixo. De lado, o punho desce mais: o corte fica abaixo dele
    corte = topo + int(round(alt * (0.76 if lado else 0.70)))
    # largura das pernas: de frente e em três quartos, a dos pés (as mãos ficam de fora, dos lados);
    # de lado, a da perna inteira abaixo do corte (as duas botas, para nada da de trás ficar no corpo)
    faixa_pes = op[corte:base + 1] if lado else op[base - max(2, alt // 10):base + 1]
    cx = np.nonzero(faixa_pes.any(axis=0))[0]
    xa, xb = max(0, cx.min() - 1), min(W - 1, cx.max() + 1)
    pernas = np.zeros_like(q)
    pernas[corte:, xa:xb + 1] = q[corte:, xa:xb + 1]
    corpo = q.copy()
    corpo[corte:, xa:xb + 1] = 0
    # emenda parada embaixo de tudo: 3 linhas acima do corte (o tronco sobe sem abrir fresta)
    # e 3 abaixo (a perna desce um pouco sem descolar do joelho)
    emenda = np.zeros_like(q)
    e0, e1 = corte - 3, min(base, corte + 3)
    emenda[e0:e1, xa:xb + 1] = q[e0:e1, xa:xb + 1]
    # o vão entre as pernas (a coluna com menos corpo perto do chão): perna esquerda e direita
    faixa = op[base - alt // 6:base + 1, xa:xb + 1].sum(axis=0)
    meio = (xb - xa) // 2
    janela = range(max(1, meio - (xb - xa) // 4), min(xb - xa - 1, meio + (xb - xa) // 4) + 1)
    vao = xa + min(janela, key=lambda i: (faixa[i], abs(i - meio)))
    esq = pernas.copy()
    esq[:, vao:] = 0
    dir_ = pernas.copy()
    dir_[:, :vao] = 0
    trocar_lascas(esq, dir_)
    vx, vy = FRENTE[direcao]
    perto_lado = None
    if lado:
        # a perna de perto: as colunas da sola que toca o chão (as 3 linhas de baixo), do joelho para baixo
        sola = np.nonzero(op[base - 2:base + 1, xa:xb + 1].any(axis=0))[0]
        n0, n1 = xa + sola.min(), xa + sola.max()
        perto_lado = np.zeros_like(q)
        perto_lado[corte:, n0:n1 + 1] = q[corte:, n0:n1 + 1]
        # a emenda também só na largura da perna de perto (a bota de trás não fica parada no quadro)
        resto = emenda.copy()
        resto[:, n0:n1 + 1] = 0
        emenda[:] = emenda - resto
    # tamanhos do passo, na altura de 104: o pé vai e volta até 5 (de lado, 7) e sobe até 4. São dois
    # passos por casa: com a passada desse tamanho, o pé que apoia quase não escorrega no chão
    avanco = (7 if lado else 5) * k
    subida = 4 * k
    quadros = []
    for i in range(QUADROS):
        fi = 2 * np.pi * i / QUADROS

        def perna(camada, psi):
            frente = np.cos(psi)
            no_ar = max(0.0, -np.sin(psi))
            dx = frente * avanco * vx
            # para a frente na tela (de frente, para baixo) e para cima quando está no ar
            dy = int(round(np.clip(frente * avanco * vy, -3, 3) - no_ar * subida))
            return cisalhar(camada, corte, base, dx), dy

        f = np.zeros_like(q)
        f = colar(f, emenda)
        if lado:
            # de lado as pernas se sobrepõem: a de perto é a da bota que toca o chão; a de trás
            # (a bota que aparece atrás dela) sai, e no lugar vai uma cópia mais escura da de perto
            longe, dl = perna(escurecer(perto_lado, 0.62), fi + np.pi)
            perto, dp = perna(perto_lado, fi)
            f = colar(f, longe, 0, dl)
            f = colar(f, perto, 0, dp)
        else:
            # cada perna é um lado do vão entre as botas; a que está mais para trás na tela vai primeiro
            a, da = perna(esq, fi)
            b, db = perna(dir_, fi + np.pi)
            for camada, d in sorted([(a, da), (b, db)], key=lambda x: x[1]):
                f = colar(f, camada, 0, d)
        # o tronco sobe quando um pé passa pelo outro
        bob = -int(round(2 * k * abs(np.sin(fi))))
        f = colar(f, corpo, 0, bob)
        quadros.append(f)
    return quadros


def main():
    ap = argparse.ArgumentParser(description='Poses do tabuleiro a partir da imagem do gerador (8 direções, 4x2).')
    ap.add_argument('imagem')
    ap.add_argument('personagem', help='pasta em client/public/arte/personagens (ex.: alosi)')
    ap.add_argument('--estado', default='desarmado', choices=ESTADOS)
    ap.add_argument('--altura', type=int, default=104, help='altura da pessoa no tabuleiro, em pixels da arte')
    ap.add_argument('--previa', help='grava também uma prévia ampliada dos quadros')
    ap.add_argument('--passos', action='store_true', help='grava também o passo simples (andar-<estado>-<direção>-<n>.png)')
    a = ap.parse_args()
    destino = os.path.join(PASTA, a.personagem, SUB)
    if not os.path.isdir(os.path.join(PASTA, a.personagem)):
        raise SystemExit(f'Não achei a pasta do personagem: {os.path.join(PASTA, a.personagem)}')
    os.makedirs(destino, exist_ok=True)
    poses = recortar(ler(a.imagem))
    alturas = sorted(p.shape[0] for p in poses.values())
    escala = a.altura / alturas[len(alturas) // 2]
    linhas = []
    for d in ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw']:
        q = enquadrar(limpar(reduzir(poses[d], escala)))
        gravar(q, os.path.join(destino, f'idle-{a.estado}-{d}.png'))
        qs = passos(q, d, a.altura) if a.passos else []
        for i, f in enumerate(qs):
            gravar(f, os.path.join(destino, f'andar-{a.estado}-{d}-{i + 1}.png'))
        linhas.append([q] + qs)
        print(f'{d}: {q.shape[1]}x{q.shape[0]}')
    if a.previa:
        H = max(f.shape[0] for l in linhas for f in l)
        W = max(f.shape[1] for l in linhas for f in l)
        folha = np.zeros((H * len(linhas), W * (QUADROS + 1), 4), dtype=np.uint8)
        folha[:, :, :3] = 64
        folha[:, :, 3] = 255
        for r, l in enumerate(linhas):
            for c, f in enumerate(l):
                y, x = r * H + H - f.shape[0], c * W
                al = f[:, :, 3:4] / 255
                folha[y:y + f.shape[0], x:x + f.shape[1], :3] = (f[:, :, :3] * al + folha[y:y + f.shape[0], x:x + f.shape[1], :3] * (1 - al)).astype(np.uint8)
        gravar(np.repeat(np.repeat(folha, 2, axis=0), 2, axis=1), a.previa)
    print(f'Gravado em {destino}')


if __name__ == '__main__':
    main()
