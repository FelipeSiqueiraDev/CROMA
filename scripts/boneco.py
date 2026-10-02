"""
O boneco do tabuleiro em peças, animado (npm run arte:boneco -- alosi).

Parte das poses paradas de cada direção (idle-<estado>-<direção>.png, as que
`npm run arte:poses` monta a partir da imagem do gerador) e das marcações de
scripts/bonecos/<personagem>.json: as juntas de cada direção (quadril, joelho,
tornozelo, ombro, pulso, pescoço, cabeça) e onde fica cada peça (polígonos).

Recorta o personagem em peças: cabeça, pontas do cabelo, tronco, barra do
casaco, e de cada lado braço, antebraço, mão, coxa, canela e bota. O que fica
escondido atrás de uma peça é preenchido com o que está em volta (para nada
abrir buraco quando ela se mexe). De lado, o braço e a perna do lado de longe
são cópias mais escuras dos de perto.

O movimento é de um esqueleto 3D, projetado na grade do tabuleiro em cada
direção:
- andar: um ciclo (dois passos) por casa, com contato, passagem e impulso; o
  pé que apoia vai para trás no chão e o outro passa no ar; o joelho dobra; o
  quadril desce no contato e sobe na passagem e leva o peso para o lado da
  perna que apoia; os braços vão ao contrário das pernas, com o cotovelo
  dobrando na ida; o tronco inclina um pouco e os ombros giram ao contrário
  do quadril; a bota rola do calcanhar para a ponta;
- parado: a respiração (peito, ombros, pescoço, cabeça e braços sobem um
  pouco, cada um um tempo depois do outro);
- o cabelo e a barra do casaco vão atrás, com mola.

As peças do tronco e da roupa deslizam linha a linha (cisalhamento, como o
animador de pixel art faz nas inclinações pequenas); as dos membros giram em
volta da junta, sem amassar. Tudo em pixel duro (vizinho mais próximo).

Grava na pasta das poses do personagem:
- parado-<estado>-<direção>.png e andar-<estado>-<direção>.png: tiras com os
  quadros lado a lado; a segunda linha (quando a direção mostra os olhos) é
  igual com os olhos fechados, para o jogo piscar quando quiser;
- anim.json: tamanho e âncora (o chão embaixo do corpo) de cada direção,
  quantos quadros, o tempo do parado, a fase do andar no meio da casa e onde
  ficam os pés em cada quadro (a sombra de contato vai embaixo de cada um).

Uso:
  python scripts/boneco.py <personagem> [--estado desarmado] [--previa saida.png]

Precisa de Python com PyMuPDF e numpy (os mesmos do Veríssimo).
"""
import argparse
import json
import math
import os
import sys

import fitz
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERSONAGENS = os.path.join(RAIZ, 'client', 'public', 'arte', 'personagens')
BONECOS = os.path.join(RAIZ, 'scripts', 'bonecos')
SUB = 'tabuleiro-32bits'
DIRECOES = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw']
N_ANDAR, N_PARADO, MS_PARADO = 16, 24, 150
# margens do quadro em volta da pose parada (andando, pernas e braços saem dela); depois tudo é recortado
ML, MT, MR, MB = 24, 8, 24, 12
CONTORNO = np.array([16, 10, 10])

# ---------------------------------------------------------------- imagem


def ler_rgba(caminho):
    pix = fitz.Pixmap(caminho)
    if pix.n - pix.alpha < 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4).copy()


def gravar_rgba(a, caminho):
    h, w = a.shape[:2]
    fitz.Pixmap(fitz.csRGB, w, h, np.ascontiguousarray(a).tobytes(), True).save(caminho)


# ---------------------------------------------------------------- geometria e máscaras


def poligono(pts, H, W):
    """Máscara dos pixels cujo centro está dentro do polígono (regra par-ímpar)."""
    yy, xx = np.mgrid[0:H, 0:W]
    px, py = xx + 0.5, yy + 0.5
    dentro = np.zeros((H, W), dtype=bool)
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if y1 == y2:
            continue
        dentro ^= ((y1 > py) != (y2 > py)) & (px < (x2 - x1) * (py - y1) / (y2 - y1) + x1)
    return dentro


def regiao(spec, H, W):
    """Uma ou mais formas: {"poli": [[x, y], ...]} ou {"caixa": [x0, y0, x1, y1]} (x1, y1 inclusos)."""
    m = np.zeros((H, W), dtype=bool)
    for f in spec if isinstance(spec, list) else [spec]:
        if 'poli' in f:
            m |= poligono(f['poli'], H, W)
        elif 'caixa' in f:
            x0, y0, x1, y1 = f['caixa']
            m[max(0, y0):y1 + 1, max(0, x0):x1 + 1] = True
    return m


def vizinhos(m):
    return m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)


def pedacos_de(m):
    """Os pedaços ligados (lado e cima/baixo) de uma máscara, cada um como lista de (y, x)."""
    H, W = m.shape
    visto = np.zeros((H, W), dtype=bool)
    out = []
    for y0, x0 in zip(*np.nonzero(m)):
        if visto[y0, x0]:
            continue
        pilha, peca = [(y0, x0)], []
        visto[y0, x0] = True
        while pilha:
            y, x = pilha.pop()
            peca.append((y, x))
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not visto[yy, xx]:
                    visto[yy, xx] = True
                    pilha.append((yy, xx))
        out.append(peca)
    return out


def so_o_maior(m, minimo=15):
    """A máscara sem os pedaços menores que `minimo` pixels (o maior sempre fica)."""
    pecas = pedacos_de(m)
    if not pecas:
        return m
    maior = max(len(p) for p in pecas)
    out = np.zeros_like(m)
    for p in pecas:
        if len(p) >= minimo or len(p) == maior:
            ys, xs = zip(*p)
            out[list(ys), list(xs)] = True
    return out


# ---------------------------------------------------------------- cores


def tons(a):
    return (a[..., i].astype(int) for i in range(3))


def eh_contorno(a):
    r, g, b = tons(a)
    return r + g + b < 75


def eh_cabelo(a):
    r, g, b = tons(a)
    return (r < 150) & (r >= g) & (g >= b - 6) & (r + g + b < 330) & ~eh_contorno(a)


def eh_pele(a):
    r, g, b = tons(a)
    return (r > 170) & (g > 100) & (g < 215) & (b < 175) & (r - b > 55)


def mais_perto(cores, paleta):
    d = ((cores[:, None, :].astype(float) - paleta[None, :, :]) ** 2).sum(axis=2)
    return paleta[d.argmin(axis=1)]


def preencher(tex, alvo):
    """
    Pinta os pixels `alvo` (vazios em `tex`) com a média dos vizinhos já
    pintados, de fora para dentro, na cor mais perto das que a peça já tem (sem
    cor nova no pixel art). O contorno só entra se não houver outra cor perto:
    assim o escondido sai com cara de tecido, e não riscado.
    """
    out = tex.copy()
    feito = out[:, :, 3] > 0
    if not feito.any():
        return out
    contorno = feito & eh_contorno(out)
    paleta = np.unique(out[feito][:, :3].astype(int), axis=0)
    falta = alvo & ~feito
    while falta.any():
        acc = np.zeros(out.shape[:2] + (3,))
        n = np.zeros(out.shape[:2])
        acc2 = np.zeros(out.shape[:2] + (3,))
        n2 = np.zeros(out.shape[:2])
        bom = feito & ~contorno
        cor = out[:, :, :3].astype(float)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            c = np.roll(np.roll(cor, dy, 0), dx, 1)
            peso = 1.0 if dy == 0 or dx == 0 else 0.6
            v = np.roll(np.roll(bom, dy, 0), dx, 1) * peso
            acc += c * v[:, :, None]
            n += v
            v2 = np.roll(np.roll(feito, dy, 0), dx, 1) * peso
            acc2 += c * v2[:, :, None]
            n2 += v2
        novos = falta & ((n > 0) | (n2 > 0))
        if not novos.any():
            break
        usa_bom = (n[novos] > 0)[:, None]
        media = np.where(usa_bom, acc[novos] / np.maximum(n[novos], 1e-9)[:, None], acc2[novos] / np.maximum(n2[novos], 1e-9)[:, None])
        out[novos, :3] = mais_perto(media, paleta)
        out[novos, 3] = 255
        feito |= novos
        contorno |= novos & eh_contorno(out)
        falta &= ~novos
    return out


# ---------------------------------------------------------------- direções e projeção

# para onde a peça olha, no chão do tabuleiro (x, y em casas)
R2 = math.sqrt(0.5)
FRENTE = {'ne': (0.0, -1.0), 'e': (R2, -R2), 'se': (1.0, 0.0), 's': (R2, R2), 'sw': (0.0, 1.0), 'w': (-R2, R2), 'nw': (-1.0, 0.0), 'n': (-R2, -R2)}
# na altura: 1 m = 1,8 unidade de altura × 32 pixels
PX_POR_M = 57.6


def tela_do_chao(x, y):
    return np.array([(x - y) * 32.0, (x + y) * 16.0])


def eixos(direcao):
    """Na tela (pixels por metro): para a frente, para a direita da peça e para cima (1 casa = 1 m)."""
    fx, fy = FRENTE[direcao]
    return tela_do_chao(fx, fy), tela_do_chao(-fy, fx), np.array([0.0, -PX_POR_M])


# ---------------------------------------------------------------- o esqueleto 3D


def suave(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def joelho_e_cotovelo(j):
    """O joelho a 55% da perna e o cotovelo no meio do braço (em todas as direções igual)."""
    for lado in ('d', 'e'):
        if f'quadril_{lado}' in j and f'tornozelo_{lado}' in j:
            j[f'joelho_{lado}'] = j[f'quadril_{lado}'] + 0.55 * (j[f'tornozelo_{lado}'] - j[f'quadril_{lado}'])
        if f'ombro_{lado}' in j and f'pulso_{lado}' in j:
            j[f'cotovelo_{lado}'] = j[f'ombro_{lado}'] + 0.5 * (j[f'pulso_{lado}'] - j[f'ombro_{lado}'])
    return j


class Esqueleto:
    """
    Juntas em metros, no corpo da peça: f para a frente, r para a direita dela,
    u para cima (u = 0 no chão). As medidas vêm da pose de frente (s), na arte.
    """

    def __init__(self, juntas_s, chao):
        cx, cy = chao
        j = joelho_e_cotovelo({k: np.array(v, dtype=float) for k, v in juntas_s.items()})
        self.rep = {k: np.array([0.0, (cx - x) / 45.25, (cy - y) / PX_POR_M]) for k, (x, y) in j.items()}
        r = self.rep
        self.coxa = r['quadril_d'][2] - r['joelho_d'][2]
        self.canela = r['joelho_d'][2] - r['tornozelo_d'][2]
        self.tornozelo = r['tornozelo_d'][2]
        self.pes = {}

    def andar(self, fi, passo=0.19, apoio=0.56, ergue=0.13, balanco=0.014, braco=22.0):
        """A pose do andar na fase fi (0..1): o pé direito pisa em 0 e o esquerdo em 0,5."""
        j = {k: v.copy() for k, v in self.rep.items()}
        # andando, os joelhos ficam um pouco dobrados (o quadril desce 2 cm): sobra perna para o
        # quadril descer no contato (os dois pés no chão) e subir na passagem
        sobe = -0.02 + balanco * math.cos(4 * math.pi * (fi - apoio / 2))
        # o peso vai para a perna que apoia
        lado = 0.012 * math.cos(2 * math.pi * (fi - apoio / 2))
        for k in ('quadril', 'quadril_d', 'quadril_e', 'peito', 'pescoco', 'cabeca', 'ombro_d', 'ombro_e',
                  'cotovelo_d', 'cotovelo_e', 'pulso_d', 'pulso_e'):
            j[k][2] += sobe
            j[k][1] += lado
        # o tronco inclina um pouco para a frente; os ombros giram ao contrário do quadril
        for k, peso in (('peito', 0.6), ('pescoco', 1.0), ('cabeca', 1.0), ('ombro_d', 0.9), ('ombro_e', 0.9)):
            j[k][0] += 0.035 * peso
        giro = 0.022 * math.cos(2 * math.pi * fi)
        j['quadril_d'][0] += giro
        j['quadril_e'][0] -= giro
        j['ombro_d'][0] -= giro * 0.8
        j['ombro_e'][0] += giro * 0.8
        self.pes = {}
        for ld, desl in (('d', 0.0), ('e', 0.5)):
            f = (fi - desl) % 1.0
            quad = j[f'quadril_{ld}']
            if f < apoio:
                # no chão: o pé vai do passo à frente até o passo atrás; no fim, o calcanhar sobe
                # antes de o pé sair (o joelho já começa a dobrar)
                pe_f = passo - 2 * passo * (f / apoio)
                alt = 0.035 * suave((f - (apoio - 0.14)) / 0.14)
                incl = 14 * (1 - suave(f / 0.12)) - 22 * suave((f - (apoio - 0.16)) / 0.16)
            else:
                # no ar: o pé sai de trás chutando um pouco para trás e para cima (o joelho dobra bem,
                # o calcanhar vai para perto da coxa), passa embaixo do corpo e estica para pisar
                a = (f - apoio) / (1 - apoio)
                pe_f = -passo + 2 * passo * suave((a - 0.12) / 0.88) - 0.075 * math.sin(math.pi * min(1.0, a / 0.55))
                alt = 0.035 * (1 - suave(a / 0.25)) + ergue * math.sin(math.pi * min(1.0, a / 0.85)) ** 0.9
                incl = -22 * (1 - suave(a / 0.35)) + 12 * suave((a - 0.55) / 0.45)
            r_pe = self.rep[f'tornozelo_{ld}'][1] + (quad[1] - self.rep[f'quadril_{ld}'][1]) * 0.3
            torn = np.array([quad[0] + pe_f, r_pe, self.tornozelo + alt])
            j[f'joelho_{ld}'] = self._joelho(quad, torn)
            j[f'tornozelo_{ld}'] = torn
            self.pes[ld] = (alt, incl)
        # os braços: ao contrário da perna do mesmo lado, com um pouco de atraso; o cotovelo dobra na ida
        for ld, desl in (('d', 0.0), ('e', 0.5)):
            f = (fi - desl - 0.04) % 1.0
            alfa = -braco * math.cos(2 * math.pi * f)
            # o cotovelo fica sempre um pouco dobrado e dobra mais quando o braço vai para a frente
            beta = 14 + 42 * max(0.0, -math.cos(2 * math.pi * f)) ** 1.2
            self._braco(j, ld, alfa, beta)
        return j

    def _joelho(self, quad, torn):
        """Duas peças no plano da frente (f, u): o joelho dobra para a frente."""
        L1, L2 = self.coxa, self.canela
        d = np.array([torn[0] - quad[0], torn[2] - quad[2]])
        D = min(float(np.hypot(*d)), L1 + L2 - 1e-6)
        a = math.atan2(d[1], d[0])
        b = math.acos(max(-1.0, min(1.0, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))))
        return np.array([quad[0] + L1 * math.cos(a + b), (quad[1] + torn[1]) / 2, quad[2] + L1 * math.sin(a + b)])

    def _braco(self, j, lado, alfa, beta):
        r0 = self.rep

        def gira(v, ang):
            a = math.radians(ang)
            return np.array([v[0] * math.cos(a) - v[2] * math.sin(a), v[1], v[0] * math.sin(a) + v[2] * math.cos(a)])

        # alfa > 0: o braço vai para a frente
        e = j[f'ombro_{lado}'] + gira(r0[f'cotovelo_{lado}'] - r0[f'ombro_{lado}'], alfa)
        j[f'cotovelo_{lado}'] = e
        j[f'pulso_{lado}'] = e + gira(r0[f'pulso_{lado}'] - r0[f'cotovelo_{lado}'], alfa + beta)

    def respirar(self, fi):
        """Parado: inspira em 40% do ciclo e solta em 60%; cada parte sobe um tempo depois da outra."""
        j = {k: v.copy() for k, v in self.rep.items()}

        def ar(atraso):
            x = (fi - atraso) % 1.0
            return suave(x / 0.4) if x < 0.4 else 1 - suave((x - 0.4) / 0.6)

        for k, atraso, amp in (('peito', 0.0, 0.014), ('ombro_d', 0.02, 0.018), ('ombro_e', 0.02, 0.018),
                               ('pescoco', 0.04, 0.017), ('cabeca', 0.07, 0.017),
                               ('cotovelo_d', 0.05, 0.018), ('cotovelo_e', 0.05, 0.018),
                               ('pulso_d', 0.08, 0.018), ('pulso_e', 0.08, 0.018)):
            j[k][2] += amp * ar(atraso)
        self.pes = {'d': (0.0, 0.0), 'e': (0.0, 0.0)}
        return j


def mola(alvo, ciclos=4, freq=2.4, amort=0.32):
    """
    Segue `alvo` (um valor por quadro do ciclo, em pixels) com atraso de mola e
    devolve o desvio em relação a ele no último ciclo (já repetindo igual).
    `freq` = oscilações da mola por ciclo.
    """
    alvo = np.asarray(alvo, dtype=float)
    n = len(alvo)
    w = 2 * math.pi * freq
    dt = 1.0 / n
    sub = 8
    x = alvo[0].copy()
    v = np.zeros_like(x)
    saida = []
    for c in range(ciclos):
        for i in range(n):
            a0, a1 = alvo[i], alvo[(i + 1) % n]
            for s in range(sub):
                al = a0 + (a1 - a0) * (s / sub)
                v = v + (-w * w * (x - al) - 2 * amort * w * v) * dt / sub
                x = x + v * dt / sub
            if c == ciclos - 1:
                saida.append(x - a1)
    return np.array(saida[-1:] + saida[:-1])


# ---------------------------------------------------------------- as peças de uma direção

# peça -> (junta de cima, junta de baixo) do osso; None = só desloca com a junta dela
OSSOS = {
    'tronco': ('quadril', 'pescoco'), 'barra': ('quadril', 'pescoco'),
    'cabeca': None, 'pontas': None,
    'braco_d': ('ombro_d', 'cotovelo_d'), 'antebraco_d': ('cotovelo_d', 'pulso_d'), 'mao_d': None,
    'braco_e': ('ombro_e', 'cotovelo_e'), 'antebraco_e': ('cotovelo_e', 'pulso_e'), 'mao_e': None,
    'coxa_d': ('quadril_d', 'joelho_d'), 'canela_d': ('joelho_d', 'tornozelo_d'), 'bota_d': None,
    'coxa_e': ('quadril_e', 'joelho_e'), 'canela_e': ('joelho_e', 'tornozelo_e'), 'bota_e': None,
}
# junta que leva as peças que só deslocam
SEGUE = {'cabeca': 'cabeca', 'pontas': 'cabeca', 'mao_d': 'pulso_d', 'mao_e': 'pulso_e', 'bota_d': 'tornozelo_d', 'bota_e': 'tornozelo_e'}
# os membros giram em volta da junta; o tronco e a roupa deslizam linha a linha
GIRAM = ('braco_', 'antebraco_', 'coxa_', 'canela_')
# a ordem de dentro de cada membro (de trás para a frente)
MEMBRO = {
    'braco_d': ['mao_d', 'antebraco_d', 'braco_d'], 'braco_e': ['mao_e', 'antebraco_e', 'braco_e'],
    'perna_d': ['bota_d', 'canela_d', 'coxa_d'], 'perna_e': ['bota_e', 'canela_e', 'coxa_e'],
}


class Direcao:
    def __init__(self, nome, img, anot, esq):
        self.nome, self.img, self.esq = nome, img, esq
        self.H, self.W = img.shape[:2]
        self.j2 = joelho_e_cotovelo({k: np.array(v, dtype=float) for k, v in anot['juntas'].items()})
        cortes = dict(anot.get('cortes', {}))
        for k in list(cortes):
            if k.startswith(('joelho_', 'cotovelo_')) and k in self.j2:
                cortes[k] = int(round(self.j2[k][1]))
        self.a = dict(anot, cortes=cortes)
        self.F, self.R, self.U = eixos(nome)
        self.pecas, self.mascaras, self.ordem = {}, {}, []
        self.sola = {}
        self._recortar()
        self._fechar_olhos()

    # -- recorte
    def _recortar(self):
        H, W, img, a = self.H, self.W, self.img, self.a
        op = img[:, :, 3] > 0
        livre = op.copy()
        bruto = {}
        # na ordem de prioridade: cabeça, braços, pernas; o resto é tronco
        for nome in ('cabeca', 'braco_d', 'braco_e', 'perna_d', 'perna_e'):
            spec = a['pecas'].get(nome)
            if spec is None:
                continue
            m = regiao(spec, H, W) & livre
            if isinstance(spec, dict) and spec.get('cor') == 'pele':
                # só a pele e o contorno colado nela (a mão que aparece, sem o que está em volta)
                pele = m & eh_pele(img)
                m = pele | (vizinhos(pele) & m & eh_contorno(img))
            if nome != 'cabeca':
                # pedacinho solto dentro da caixa (resto de outra coisa) não é da peça
                m = so_o_maior(m, 6)
            bruto[nome] = m
            livre &= ~m
        # o tronco é o que sobra; pedacinho solto dele vai para a peça vizinha (ou some)
        tronco = so_o_maior(livre)
        for peca in pedacos_de(livre & ~tronco):
            viz = {}
            for y, x in peca:
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < H and 0 <= xx < W:
                        for nome, mm in bruto.items():
                            if mm[yy, xx]:
                                viz[nome] = viz.get(nome, 0) + 1
            if viz:
                dono = max(viz, key=viz.get)
                for y, x in peca:
                    bruto[dono][y, x] = True
        bruto['tronco'] = tronco
        if 'pontas' in a:
            bruto['pontas'] = regiao(a['pontas'], H, W) & bruto['cabeca'] & (eh_cabelo(img) | eh_contorno(img))
        if 'barra' in a:
            bruto['barra'] = regiao(a['barra'], H, W) & bruto['tronco']
            bruto['tronco'] &= ~bruto['barra']
        # membros em partes, nas linhas das juntas, com sobra nas juntas (girando, a junta abre uma cunha)
        cortes = a['cortes']
        partes = {}
        yy = np.arange(H)[:, None]
        for ld in ('d', 'e'):
            b = bruto.get(f'braco_{ld}')
            if b is not None and f'cotovelo_{ld}' in cortes:
                yc = cortes[f'cotovelo_{ld}']
                # a mão (do pulso para baixo) vai inteira, só acompanhando o pulso: não entorta
                yw = int(round(self.j2[f'pulso_{ld}'][1])) + 1
                partes[f'braco_{ld}'] = b & (yy < yc + 2)
                partes[f'antebraco_{ld}'] = b & (yy >= yc - 1) & (yy < yw + 1)
                partes[f'mao_{ld}'] = b & (yy >= yw)
            p = bruto.get(f'perna_{ld}')
            if p is not None and f'joelho_{ld}' in cortes:
                yj, yt = cortes[f'joelho_{ld}'], cortes[f'tornozelo_{ld}']
                partes[f'coxa_{ld}'] = p & (yy < yj + 2)
                partes[f'canela_{ld}'] = p & (yy >= yj - 1) & (yy < yt + 1)
                partes[f'bota_{ld}'] = p & (yy >= yt)
                ys = np.nonzero(partes[f'bota_{ld}'].any(axis=1))[0]
                # o meio da pegada da bota, abaixo do tornozelo (a sombra de contato vai ali)
                self.sola[ld] = 0.65 * (ys.max() - self.j2[f'tornozelo_{ld}'][1]) if len(ys) else 6.0
        for nome in ('tronco', 'barra', 'cabeca', 'pontas'):
            if nome in bruto:
                partes[nome] = bruto[nome]
        # a cabeça sem as pontas (elas vão por cima, com 2 linhas de sobra para cima)
        if 'pontas' in partes:
            pt = partes['pontas']
            sobra = np.roll(pt, -1, 0) | np.roll(pt, -2, 0)
            partes['pontas'] = (pt | (sobra & partes['cabeca'])) & op
            partes['cabeca'] = partes['cabeca'] & ~pt
        # de lado, braço e perna do lado de longe: cópias mais escuras dos de perto, um pouco deslocadas
        longe = {}
        for alvo, spec in a.get('longe', {}).items():
            dx, dy = spec['desloca']
            la, ld = alvo[-1], spec['de'][-1]
            perna = alvo.startswith('perna')
            segs = ['coxa', 'canela', 'bota'] if perna else ['braco', 'antebraco', 'mao']
            for jt in (['quadril', 'joelho', 'tornozelo'] if perna else ['ombro', 'cotovelo', 'pulso']):
                self.j2[f'{jt}_{la}'] = self.j2[f'{jt}_{ld}'] + np.array([dx, dy], dtype=float)
            if perna:
                self.sola[la] = self.sola.get(ld, 6.0)
            for sg in segs:
                partes[f'{sg}_{la}'] = np.roll(np.roll(partes[f'{sg}_{ld}'], dy, 0), dx, 1)
                longe[f'{sg}_{la}'] = (f'{sg}_{ld}', dx, dy, spec.get('escurece', 0.62), spec.get('so_mao', False))
        ordem = []
        for nome in a['ordem']:
            ordem.extend(MEMBRO.get(nome, [nome]))
        self.ordem = [n for n in ordem if n in partes]
        # a textura de cada peça, com o escondido embaixo das que vêm depois preenchido
        for i, nome in enumerate(self.ordem):
            m = partes[nome]
            tex = np.zeros_like(img)
            tex[m] = img[m]
            acima = np.zeros((H, W), dtype=bool)
            for outro in self.ordem[i + 1:]:
                acima |= partes[outro]
            perto = m.copy()
            for _ in range(3):
                perto = vizinhos(perto)
            alvo = perto & acima & ~m
            forma = None
            if nome in a.get('oculto', {}):
                # só por dentro da silhueta da arte (o que outra peça cobria), nunca para fora dela
                forma = regiao(a['oculto'][nome], H, W) & (op | m)
                alvo |= forma & ~m
                # o escondido ganha o tecido que estava por cima (as dobras da manga, sem contorno nem pele),
                # e logo abaixo fica um tom mais escuro: parece a lateral do casaco na sombra do braço
                tecido = forma & ~m & op & ~eh_contorno(img) & ~eh_pele(img)
                if tecido.any():
                    pal = np.unique(img[m][:, :3].astype(int), axis=0)
                    tex[tecido, :3] = img[tecido][:, :3]
                    tex[tecido, 3] = 255
            tex = preencher(tex, alvo)
            if forma is not None:
                novo = forma & ~m & (tex[:, :, 3] > 0)
                tudo = tex[:, :, 3] > 0
                perto_fora = vizinhos(vizinhos(~tudo))
                # na sombra do braço, a lateral fica um tom mais escura; perto da borda de fora, dois
                pal = np.unique(img[m][:, :3].astype(int), axis=0)
                for sel, fator in ((novo & ~perto_fora, 0.86), (novo & perto_fora, 0.72)):
                    if sel.any():
                        tex[sel, :3] = mais_perto(tex[sel][:, :3] * fator, pal)
                # onde o que estava escondido dá para fora (o vazio), entra o contorno
                borda = novo & vizinhos(~tudo)
                tex[borda, :3] = CONTORNO
                tex[m] = img[m]
            self.pecas[nome] = tex
        for nome, (de, dx, dy, k, so_mao) in longe.items():
            tex = np.roll(np.roll(self.pecas[de], dy, 0), dx, 1).copy()
            if so_mao:
                # do braço de longe só a mão aparece (a manga fica toda atrás do tronco)
                if nome.startswith('mao'):
                    pele = eh_pele(tex) & (tex[:, :, 3] > 0)
                    tex[~(pele | (vizinhos(pele) & eh_contorno(tex)))] = 0
                else:
                    tex[:] = 0
            tex[:, :, :3] = (tex[:, :, :3].astype(float) * k).astype(np.uint8)
            self.pecas[nome] = tex
        self.mascaras = partes

    def _fechar_olhos(self):
        """A cabeça de olhos fechados: o olho vira pálpebra (pele) e embaixo fica o cílio."""
        ol = self.a.get('olhos')
        if not ol:
            return
        tex = self.pecas['cabeca'].copy()
        for chave, cor in (('pele', ol.get('cor_pele', [222, 150, 106])), ('cilio', ol.get('cor_cilio', [92, 46, 34]))):
            for x, y in ol.get(chave, []):
                tex[y, x, :3] = cor
                tex[y, x, 3] = 255
        self.pecas['cabeca_fechada'] = tex

    # -- desenho
    def proj(self, d):
        return d[0] * self.F + d[1] * self.R + d[2] * self.U

    def junta2d(self, j3, nome):
        return self.j2[nome] + self.proj(j3[nome] - self.esq.rep[nome])

    def quadro(self, j3, extra):
        """Um quadro: cada peça na ordem, deslizando, girando ou só deslocando com a sua junta."""
        Ho, Wo = self.H + MT + MB, self.W + ML + MR
        out = np.zeros((Ho, Wo, 4), dtype=np.uint8)
        off = np.array([ML, MT], dtype=float)
        Y = np.arange(Ho)[:, None] + 0.5
        X = np.arange(Wo)[None, :] + 0.5
        for nome in self.ordem:
            tex = self.pecas['cabeca_fechada'] if nome == 'cabeca' and extra.get('olhos_fechados') and 'cabeca_fechada' in self.pecas else self.pecas[nome]
            osso = OSSOS.get(nome)
            if osso is None:
                desl = self.proj(j3[SEGUE[nome]] - self.esq.rep[SEGUE[nome]])
                if nome == 'pontas':
                    desl = desl + extra.get('cabelo', np.zeros(2))
                rx = X - desl[0] + 0 * Y
                ry = Y - desl[1] + 0 * X
                if nome.startswith('bota_'):
                    # a bota rola: as colunas da ponta sobem (ou descem), em volta do tornozelo
                    tg = extra.get(f'pe_{nome[-1]}', 0.0)
                    ry = ry + tg * (rx - (self.j2[f'tornozelo_{nome[-1]}'][0] + ML))
                rx, ry = rx - off[0], ry - off[1]
            else:
                A0, B0 = self.j2[osso[0]] + off, self.j2[osso[1]] + off
                A1, B1 = self.junta2d(j3, osso[0]) + off, self.junta2d(j3, osso[1]) + off
                if nome == 'barra':
                    A1 = A1 + extra.get('barra', np.zeros(2))
                    B1 = B1 + extra.get('barra', np.zeros(2))
                if nome.startswith(GIRAM):
                    # gira em volta da junta de cima: a largura fica, o comprimento encurta ou estica um pouco
                    d0, d1 = B0 - A0, B1 - A1
                    L0, L1 = float(np.hypot(*d0)), float(np.hypot(*d1))
                    if L0 < 1e-6 or L1 < 1e-6:
                        continue
                    esc = min(1.2, max(0.72, L1 / L0))
                    e0, e1 = d0 / L0, d1 / L1
                    n0, n1 = np.array([-e0[1], e0[0]]), np.array([-e1[1], e1[0]])
                    qx, qy = X - A1[0], Y - A1[1]
                    u = qx * e1[0] + qy * e1[1]
                    v = qx * n1[0] + qy * n1[1]
                    rx = A0[0] + (u / esc) * e0[0] + v * n0[0] - off[0]
                    ry = A0[1] + (u / esc) * e0[1] + v * n0[1] - off[1]
                else:
                    # desliza linha a linha: cada linha anda junto com o ponto do osso na altura dela
                    dy1 = B1[1] - A1[1]
                    if abs(dy1) < 1e-6:
                        continue
                    t = (Y - A1[1]) / dy1
                    rx = X - (A1[0] + t * (B1[0] - A1[0])) + (A0[0] + t * (B0[0] - A0[0])) - off[0]
                    ry = A0[1] + t * (B0[1] - A0[1]) - off[1] + 0 * X
            sx, sy = np.floor(rx).astype(int), np.floor(ry).astype(int)
            ok = (sx >= 0) & (sx < self.W) & (sy >= 0) & (sy < self.H)
            amostra = tex[np.clip(sy, 0, self.H - 1), np.clip(sx, 0, self.W - 1)]
            vis = ok & (amostra[:, :, 3] > 0)
            out[vis] = amostra[vis]
        return out

    def pes2d(self, j3):
        """Os dois pés na tela (o meio da pegada), em pixels a partir da âncora, e a altura do pé no ar."""
        anc = np.array(self.a['chao'], dtype=float)
        out = []
        for ld in ('d', 'e'):
            if f'tornozelo_{ld}' not in self.j2:
                continue
            p = self.junta2d(j3, f'tornozelo_{ld}') + np.array([0.0, self.sola.get(ld, 6.0)])
            alt = self.esq.pes.get(ld, (0.0, 0.0))[0] * PX_POR_M
            # no ar, o pé sobe na tela; a pegada fica no chão, embaixo dele
            out.append([round(float(p[0] - anc[0]), 1), round(float(p[1] - anc[1] + alt), 1), round(float(alt), 1)])
        return out


# ---------------------------------------------------------------- os ciclos e a saída


def ciclo(d, esq, tipo):
    """(pose 3D, extra) de cada quadro do ciclo: o cabelo e a barra vão atrás, com mola."""
    n = N_ANDAR if tipo == 'andar' else N_PARADO
    poses, pes = [], []
    for i in range(n):
        poses.append(esq.andar(i / n) if tipo == 'andar' else esq.respirar(i / n))
        pes.append(dict(esq.pes))
    cab = np.array([d.proj(p['cabeca'] - esq.rep['cabeca']) for p in poses])
    qua = np.array([d.proj(p['quadril'] - esq.rep['quadril']) for p in poses])
    if tipo == 'andar':
        cabelo = mola(cab, freq=2.6, amort=0.35) * 1.15
        barra = mola(qua, freq=2.8, amort=0.4) * np.array([0.0, 0.6])
    else:
        # parado, o cabelo e a barra só vão um pouco depois da cabeça e do quadril
        cabelo = np.array([cab[(i - 3) % n] - cab[i] for i in range(n)])
        barra = np.array([qua[(i - 2) % n] - qua[i] for i in range(n)])
    # quanto a frente da peça anda de lado na tela: é o quanto a bota rola (de frente, nada)
    rola = d.F[0] / max(1e-6, float(np.hypot(*d.F)))
    out = []
    for i, p in enumerate(poses):
        extra = {'cabelo': cabelo[i], 'barra': barra[i]}
        for ld, (alt, incl) in pes[i].items():
            extra[f'pe_{ld}'] = math.tan(math.radians(incl)) * rola
        esq.pes = pes[i]
        out.append((p, extra, d.pes2d(p)))
    return out


def recorte(quadros):
    """A caixa que cabe todos os quadros de uma direção (com 1 pixel de folga)."""
    tudo = np.zeros(quadros[0].shape[:2], dtype=bool)
    for q in quadros:
        tudo |= q[:, :, 3] > 0
    ys, xs = np.nonzero(tudo)
    return max(0, xs.min() - 1), max(0, ys.min() - 1), min(tudo.shape[1], xs.max() + 2), min(tudo.shape[0], ys.max() + 2)


def tira(linhas, x0, y0, x1, y1):
    """As linhas de quadros (abertos e, se houver, fechados) lado a lado numa imagem só."""
    w, h = x1 - x0, y1 - y0
    out = np.zeros((h * len(linhas), w * len(linhas[0]), 4), dtype=np.uint8)
    for r, qs in enumerate(linhas):
        for c, q in enumerate(qs):
            out[r * h:(r + 1) * h, c * w:(c + 1) * w] = q[y0:y1, x0:x1]
    return out


def gerar(personagem, estado, previa=None):
    anot = json.load(open(os.path.join(BONECOS, f'{personagem}.json'), encoding='utf-8'))
    pasta = os.path.join(PERSONAGENS, personagem, SUB)
    s = anot['direcoes']['s']
    esq = Esqueleto(s['juntas'], s['chao'])
    manifesto = {'versao': 1, 'gerado': 'scripts/boneco.py', 'msParado': MS_PARADO, 'quadrosParado': N_PARADO,
                 'quadrosAndar': N_ANDAR, 'estados': {estado: {}}}
    fases = []
    linhas_previa = []
    for nome in DIRECOES:
        if nome not in anot['direcoes']:
            continue
        img = ler_rgba(os.path.join(pasta, f'idle-{estado}-{nome}.png'))
        d = Direcao(nome, img, anot['direcoes'][nome], esq)
        olhos = 'cabeca_fechada' in d.pecas
        res = {}
        for tipo in ('parado', 'andar'):
            abertos, fechados, pes = [], [], []
            for p, extra, pe in ciclo(d, esq, tipo):
                abertos.append(d.quadro(p, extra))
                if olhos:
                    fechados.append(d.quadro(p, dict(extra, olhos_fechados=True)))
                pes.append(pe)
            res[tipo] = (abertos, fechados, pes)
        todos = [q for t in res.values() for q in t[0] + t[1]]
        x0, y0, x1, y1 = recorte(todos)
        anc = np.array(anot['direcoes'][nome]['chao'], dtype=float) + np.array([ML, MT]) - np.array([x0, y0])
        info = {'w': int(x1 - x0), 'h': int(y1 - y0), 'ax': round(float(anc[0]), 1), 'ay': round(float(anc[1]), 1), 'olhos': olhos}
        for tipo, (abertos, fechados, pes) in res.items():
            arq = f'{tipo}-{estado}-{nome}.png'
            gravar_rgba(tira([abertos] + ([fechados] if olhos else []), x0, y0, x1, y1), os.path.join(pasta, arq))
            info[tipo] = {'arquivo': arq, 'quadros': len(abertos)}
            info['pes' + tipo.capitalize()] = pes
        manifesto['estados'][estado][nome] = info
        # a fase do meio da casa: a passagem (os pés mais perto do lugar de parado)
        pes_andar = res['andar'][2]
        pes_parado = res['parado'][2][0]
        fases.append([sum(abs(a - b) for pa, pb in zip(pe, pes_parado) for a, b in zip(pa[:2], pb[:2])) + sum(pa[2] for pa in pe) for pe in pes_andar])
        if previa:
            linhas_previa.append([q[y0:y1, x0:x1] for q in res['parado'][0][:1] + res['andar'][0]])
        print(f'{nome}: {info["w"]}x{info["h"]}, âncora ({info["ax"]}, {info["ay"]}), olhos: {"sim" if olhos else "não"}')
    custo = np.sum(np.array(fases), axis=0)
    manifesto['faseAndar'] = round(float(np.argmin(custo)) / N_ANDAR, 4)
    with open(os.path.join(pasta, 'anim.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifesto, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    if previa and linhas_previa:
        H = max(q.shape[0] for l in linhas_previa for q in l)
        W = max(q.shape[1] for l in linhas_previa for q in l)
        folha = np.zeros((H * len(linhas_previa), W * len(linhas_previa[0]), 4), dtype=np.uint8)
        folha[:, :, :3] = 52
        folha[:, :, 3] = 255
        for r, l in enumerate(linhas_previa):
            for c, q in enumerate(l):
                y, x = r * H + H - q.shape[0], c * W
                al = q[:, :, 3:4] / 255
                reg = folha[y:y + q.shape[0], x:x + q.shape[1], :3]
                folha[y:y + q.shape[0], x:x + q.shape[1], :3] = (q[:, :, :3] * al + reg * (1 - al)).astype(np.uint8)
        gravar_rgba(np.repeat(np.repeat(folha, 2, 0), 2, 1), previa)
    print(f'fase do andar no meio da casa: {manifesto["faseAndar"]}')
    print(f'Gravado em {pasta}')


def main():
    ap = argparse.ArgumentParser(description='O boneco do tabuleiro em peças, animado (parado e andando, nas 8 direções).')
    ap.add_argument('personagem', help='pasta em client/public/arte/personagens e marcações em scripts/bonecos (ex.: alosi)')
    ap.add_argument('--estado', default='desarmado')
    ap.add_argument('--previa', help='grava também uma folha ampliada com os quadros')
    a = ap.parse_args()
    gerar(a.personagem, a.estado, a.previa)


if __name__ == '__main__':
    main()
