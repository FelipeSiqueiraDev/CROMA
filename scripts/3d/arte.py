"""
O personagem a partir da arte dele: a folha com as 8 direções (parado), 4 x 2.

1. Câmeras: o ângulo, o tamanho e o centro de cada vista (o volume que cabe em
   todas as silhuetas ao mesmo tempo, o mais justo possível).
2. Casca: o volume que cabe nas 8 silhuetas (visual hull), em voxels.
3. Peças: o corpo (cabeça, tronco e pernas, uma malha só) e os dois braços (cada
   um a sua), separados pelas juntas da ficha. Nas vistas de lado os braços colam
   no tronco: separados, eles balançam sem arrastar a jaqueta.
4. Pesos: quanto cada osso do esqueleto manda em cada vértice.
5. Cor por direção: cada direção do tabuleiro usa a própria vista da arte em tudo
   o que aquela vista vê (parado, fica igual ao desenho); o que ela não vê vem da
   vista que vê melhor; o que ninguém vê, dos vizinhos.

Uso: python arte.py <ficha.json> [--cameras]
  --cameras refaz o ajuste das câmeras (senão usa o arquivo da ficha, se existir).
Grava <pecas>/pecas.npz (malhas, pesos e cores) e prévias em <pecas>/.

As medidas ficam em metros, no espaço do personagem: frente para -Y, a esquerda
dele para +X, a sola em z = 0.
"""
import json
import math
import os
import sys

import fitz
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
RAIZ = os.environ.get('CROMA_3D', 'C:/Users/felip/CROMA-3D')
R2 = math.sqrt(0.5)
# para onde a frente olha em cada direção, no chão do tabuleiro (como no filmar.py)
FRENTE = {'ne': (0.0, -1.0), 'e': (R2, -R2), 'se': (1.0, 0.0), 's': (R2, R2), 'sw': (0.0, 1.0), 'w': (-R2, R2), 'nw': (-1.0, 0.0), 'n': (-R2, -R2)}
OSSOS = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
         'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r',
         'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r']


def caminho(p):
    return p if os.path.isabs(p) else os.path.join(RAIZ, p)


def ler(p):
    pix = fitz.Pixmap(p)
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4).copy()


def gravar(a, p):
    h, w = a.shape[:2]
    if a.shape[2] == 3:
        a = np.concatenate([a, np.full((h, w, 1), 255, np.uint8)], axis=2)
    fitz.Pixmap(fitz.csRGB, w, h, np.ascontiguousarray(a).tobytes(), True).save(p)


def vistas(arq, ordem):
    a = ler(arq)
    lin, col = len(ordem), len(ordem[0])
    ch, cw = a.shape[0] // lin, a.shape[1] // col
    return {ordem[r][c]: a[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] for r in range(lin) for c in range(col)}


# ---------------------------------------------------------------- câmeras

def angulo(d):
    """O giro do personagem (em Z) na direção d, como no filmar.py (frente local = -Y)."""
    fx, fy = FRENTE[d]
    return math.atan2(-fy, fx) - math.atan2(-1, 0)


def base_camera(theta):
    c, s = math.cos(theta), math.sin(theta)
    R = np.array([R2, R2, 0.0])
    F = np.array([-R2 * c, R2 * c, -s])
    return R, np.cross(R, F), F


def girar(p, a):
    ca, sa = math.cos(a), math.sin(a)
    return np.stack([p[:, 0] * ca - p[:, 1] * sa, p[:, 0] * sa + p[:, 1] * ca, p[:, 2]], axis=1)


def projetar(p, d, cam):
    """p (N,3) no espaço do personagem -> (u, v, profundidade) na imagem da vista d."""
    q = girar(p, angulo(d))
    R, U, F = base_camera(cam['theta'])
    u0, v0 = cam['o'][d]
    return u0 + cam['S'] * (q @ R), v0 - cam['S'] * (q @ U), q @ F


def para_camera(d, cam):
    """A direção que aponta para a câmera da vista d, no espaço do personagem."""
    _, _, F = base_camera(cam['theta'])
    c = -F
    a = -angulo(d)
    ca, sa = math.cos(a), math.sin(a)
    return np.array([c[0] * ca - c[1] * sa, c[0] * sa + c[1] * ca, c[2]])


def dilatar(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def erodir(m, r):
    return ~dilatar(~m, r) if r > 0 else m.copy()


def grade(passo):
    xs = np.arange(-0.6, 0.6 + 1e-9, passo)
    zs = np.arange(-0.05, 2.0 + 1e-9, passo)
    return xs, zs


def esculpir(mascaras, cam, passo):
    """Os voxels que caem dentro da silhueta em todas as vistas (uma fatia de altura por vez)."""
    xs, zs = grade(passo)
    X, Y = np.meshgrid(xs, xs, indexing='ij')
    occ = np.zeros((len(xs), len(xs), len(zs)), dtype=bool)
    for k, z in enumerate(zs):
        p = np.stack([X.ravel(), Y.ravel(), np.full(X.size, z)], axis=1)
        dentro = np.ones(len(p), dtype=bool)
        for d, m in mascaras.items():
            u, v, _ = projetar(p, d, cam)
            ui, vi = np.round(u).astype(int), np.round(v).astype(int)
            ok = (ui >= 0) & (ui < m.shape[1]) & (vi >= 0) & (vi < m.shape[0])
            dm = np.zeros(len(p), dtype=bool)
            dm[ok] = m[vi[ok], ui[ok]]
            dentro &= dm
            if not dentro.any():
                break
        occ[:, :, k] = dentro.reshape(X.shape)
    return occ, xs, zs


def nota(mascaras, cam, passo=0.02, red=4):
    """Quanto a casca, vista de novo de cada câmera, cobre a silhueta (média das 8)."""
    occ, xs, zs = esculpir(mascaras, cam, passo)
    idx = np.argwhere(occ)
    pts = np.stack([xs[idx[:, 0]], xs[idx[:, 1]], zs[idx[:, 2]]], axis=1)
    ious = {}
    for d, m in mascaras.items():
        h, w = m.shape[0] // red, m.shape[1] // red
        img = np.zeros((h, w), dtype=bool)
        u, v, _ = projetar(pts, d, cam)
        k = int(math.ceil(passo * cam['S'] / red / 2))
        for dy in range(-k, k + 1):
            for dx in range(-k, k + 1):
                ui = np.floor(u / red + dx * 0.7).astype(int)
                vi = np.floor(v / red + dy * 0.7).astype(int)
                ok = (ui >= 0) & (ui < w) & (vi >= 0) & (vi < h)
                img[vi[ok], ui[ok]] = True
        mm = m[:h * red, :w * red].reshape(h, red, w, red).mean(axis=(1, 3)) > 0.5
        ious[d] = float((img & mm).sum() / max(1, (img | mm).sum()))
    return float(np.mean(list(ious.values()))), ious


def ajustar_cameras(mascaras, rodadas=4):
    o = {}
    for d, m in mascaras.items():
        ys, xs = np.nonzero(m)
        o[d] = [float((xs.min() + xs.max()) / 2), float(ys.max() - 8)]
    cam = {'theta': math.radians(25), 'S': 300.0, 'o': o}
    base, _ = nota(mascaras, cam)
    for rod in range(rodadas):
        passo_px = [8, 4, 2, 1][min(rod, 3)]
        for chave, dd in (('theta', math.radians([4, 2, 1, 0.5][min(rod, 3)])), ('S', cam['S'] * 0.03 / (rod + 1))):
            for sinal in (1, -1):
                while True:
                    novo = json.loads(json.dumps(cam))
                    novo[chave] += sinal * dd
                    n, _ = nota(mascaras, novo)
                    if n <= base + 1e-4:
                        break
                    cam, base = novo, n
        for d in mascaras:
            for eixo in (0, 1):
                for sinal in (1, -1):
                    while True:
                        novo = json.loads(json.dumps(cam))
                        novo['o'][d][eixo] += sinal * passo_px
                        n, _ = nota(mascaras, novo)
                        if n <= base + 1e-4:
                            break
                        cam, base = novo, n
        print('câmeras, rodada', rod, 'encaixe', round(base, 4), 'ângulo', round(math.degrees(cam['theta']), 1), flush=True)
    return cam


# ---------------------------------------------------------------- malha

def borrar(f):
    for ax in range(3):
        a = np.pad(f, [(1, 1) if i == ax else (0, 0) for i in range(3)], mode='edge')
        sl = lambda s, e: tuple(slice(s, a.shape[i] - e if e else None) if i == ax else slice(None) for i in range(3))
        f = (a[sl(0, 2)] + 2 * a[sl(1, 1)] + a[sl(2, 0)]) / 4
    return f


def surface_nets(f, iso=0.5):
    """Malha da superfície f = iso: um vértice por célula cortada, quads entre elas."""
    f = np.pad(f, 1)
    nx, ny, nz = f.shape
    dentro = f > iso
    pos = np.stack(np.meshgrid(np.arange(nx), np.arange(ny), np.arange(nz), indexing='ij'), axis=-1).astype(np.float32)
    cs = (nx - 1, ny - 1, nz - 1)
    soma = np.zeros(cs + (3,), dtype=np.float32)
    cont = np.zeros(cs, dtype=np.float32)
    cantos = [(a, b, c) for a in (0, 1) for b in (0, 1) for c in (0, 1)]
    arestas = [(p, q) for i, p in enumerate(cantos) for q in cantos[i + 1:] if sum(abs(np.subtract(p, q))) == 1]

    def canto(c):
        return tuple(slice(c[i], c[i] + cs[i]) for i in range(3))
    for p0, p1 in arestas:
        f0, f1 = f[canto(p0)], f[canto(p1)]
        muda = (f0 > iso) != (f1 > iso)
        t = np.clip((iso - f0) / np.where(muda, f1 - f0, 1), 0, 1).astype(np.float32)
        soma += (pos[canto(p0)] + t[..., None] * (pos[canto(p1)] - pos[canto(p0)])) * muda[..., None]
        cont += muda
    ativo = cont > 0
    idx = -np.ones(cs, dtype=np.int64)
    idx[ativo] = np.arange(ativo.sum())
    verts = soma[ativo] / cont[ativo][:, None] - 1
    faces = []
    # aresta no eixo a; (b, c) com b x c = a: a ordem (b-,c-) (b+,c-) (b+,c+) (b-,c+) aponta para +a
    for a, b, c in ((0, 1, 2), (1, 2, 0), (2, 0, 1)):
        s0 = [slice(None)] * 3
        s1 = [slice(None)] * 3
        s0[a] = slice(0, -1)
        s1[a] = slice(1, None)
        e0, e1 = dentro[tuple(s0)], dentro[tuple(s1)]
        ii = np.argwhere(e0 != e1)
        quads = []
        for db, dc in ((-1, -1), (0, -1), (0, 0), (-1, 0)):
            q = ii.copy()
            q[:, b] += db
            q[:, c] += dc
            quads.append(idx[tuple(q.T)])
        quads = np.stack(quads, axis=1)
        baixo = e0[tuple(ii.T)]
        quads[~baixo] = quads[~baixo][:, ::-1]
        faces.append(quads)
    q = np.concatenate(faces)
    return verts.astype(np.float64), np.concatenate([q[:, [0, 1, 2]], q[:, [0, 2, 3]]])


def arestas_da_malha(tri):
    e = np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]])
    return np.unique(np.concatenate([e, e[:, ::-1]]), axis=0)


def taubin(v, ar, it=8, lam=0.5, mu=-0.53):
    grau = np.maximum(np.bincount(ar[:, 0], minlength=len(v)), 1).astype(float)
    for _ in range(it):
        for f in (lam, mu):
            s = np.zeros_like(v)
            np.add.at(s, ar[:, 0], v[ar[:, 1]])
            v = v + f * (s / grau[:, None] - v)
    return v


def maior_parte(v, tri, minimo=0.02):
    """Só os pedaços da malha com pelo menos `minimo` dos vértices (lasquinhas soltas saem)."""
    ar = arestas_da_malha(tri)
    rot = np.arange(len(v))
    while True:
        novo = rot.copy()
        np.minimum.at(novo, ar[:, 0], rot[ar[:, 1]])
        novo = novo[novo]
        if (novo == rot).all():
            break
        rot = novo
    _, inv, cont = np.unique(rot, return_inverse=True, return_counts=True)
    fica = cont[inv] >= minimo * len(v)
    novo_idx = -np.ones(len(v), dtype=np.int64)
    novo_idx[fica] = np.arange(fica.sum())
    t = novo_idx[tri]
    return v[fica], t[(t >= 0).all(axis=1)]


def normais(v, tri):
    fn = np.cross(v[tri[:, 1]] - v[tri[:, 0]], v[tri[:, 2]] - v[tri[:, 0]])
    vn = np.zeros_like(v)
    for k in range(3):
        np.add.at(vn, tri[:, k], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


def amostrar(img, u, v):
    """Cor da imagem em (u, v), bilinear."""
    h, w = img.shape[:2]
    u = np.clip(u, 0, w - 1.001)
    v = np.clip(v, 0, h - 1.001)
    u0, v0 = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = (u - u0)[:, None], (v - v0)[:, None]
    a = img[v0, u0] * (1 - fu) + img[v0, u0 + 1] * fu
    b = img[v0 + 1, u0] * (1 - fu) + img[v0 + 1, u0 + 1] * fu
    return a * (1 - fv) + b * fv


# ---------------------------------------------------------------- juntas e peças

def lados(j):
    """As juntas da ficha (lado direito, x < 0) e o espelho para o esquerdo."""
    out = {k: np.array(v, dtype=float) for k, v in j.items() if k != 'coluna'}
    out['coluna'] = [np.array(p, dtype=float) for p in j['coluna']]
    for k in ('clavicula', 'ombro', 'cotovelo', 'pulso', 'mao', 'coxa', 'joelho', 'tornozelo', 'planta', 'ponta'):
        p = out.pop(k)
        out[k + '_r'] = p
        out[k + '_l'] = p * np.array([-1, 1, 1])
    return out


def ate_linha(p, pontos):
    """Para cada ponto: distância até a linha quebrada, em que trecho cai e onde (0..1) no trecho."""
    melhor = np.full(len(p), np.inf)
    seg = np.zeros(len(p), dtype=int)
    tt = np.zeros(len(p))
    for i in range(len(pontos) - 1):
        a, b = pontos[i], pontos[i + 1]
        ab = b - a
        t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
        d = np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
        m = d < melhor
        melhor[m], seg[m], tt[m] = d[m], i, t[m]
    return melhor, seg, tt


def raio_em(raios, seg, t):
    r = np.asarray(raios, dtype=float)
    return r[seg] * (1 - t) + r[np.minimum(seg + 1, len(r) - 1)] * t


def distancias(p, J, raios):
    """Distância (normalizada pelo raio de cada peça) até o tronco, a cabeça, as pernas e os braços."""
    rx, ry = raios['tronco']
    eixo_y = J['coluna'][0][1]
    z0, z1 = J['quadril'][2] - 0.06, J['pescoco'][2] + 0.04
    fora_z = np.maximum(0, np.maximum(z0 - p[:, 2], p[:, 2] - z1))
    tronco = np.sqrt((p[:, 0] / rx) ** 2 + ((p[:, 1] - eixo_y) / ry) ** 2 + (fora_z / ry) ** 2)
    cabeca = np.linalg.norm(p - J['cabeca'], axis=1) / raios['cabeca']
    d = {'tronco': tronco, 'cabeca': cabeca}
    for l in ('l', 'r'):
        perna = [J[f'{k}_{l}'] for k in ('coxa', 'joelho', 'tornozelo', 'planta', 'ponta')]
        dist, seg, t = ate_linha(p, perna)
        d[f'perna_{l}'] = dist / raio_em(raios['perna'], seg, t)
        braco = [J[f'{k}_{l}'] for k in ('ombro', 'cotovelo', 'pulso', 'mao')]
        dist, seg, t = ate_linha(p, braco)
        d[f'braco_{l}'] = dist / raio_em(raios['braco'], seg, t)
    return d


def separar(p, J, cfg):
    """
    0 = corpo, 1 = braço esquerdo, 2 = braço direito. Braço é o que fica para fora da
    largura do tronco, da mão até o ombro (de lado ele cola no tronco: só a largura separa).
    Perto da perna, decide quem está mais perto (o punho ou a coxa).
    """
    larg = cfg.get('larguraTronco', 0.21)
    fundo = cfg.get('fundoBraco', 0.13)
    d = distancias(p, J, cfg['raios'])
    perna = np.minimum(d['perna_l'], d['perna_r'])
    rot = np.zeros(len(p), dtype=int)
    for i, l, sinal in ((1, 'l', 1), (2, 'r', -1)):
        z_baixo = J[f'mao_{l}'][2] - cfg['raios']['braco'][-1]
        z_cima = J[f'ombro_{l}'][2] + cfg.get('ombroAcima', 0.07)
        fora = (p[:, 0] * sinal > larg) & (p[:, 2] >= z_baixo) & (p[:, 2] <= z_cima)
        # a manga tem a profundidade do desenho de lado: o que a casca põe na frente e atrás dela sai
        cadeia = sorted((J[f'{k}_{l}'] for k in ('ombro', 'cotovelo', 'pulso', 'mao')), key=lambda q: q[2])
        zc = [q[2] for q in cadeia]
        eixo_y = np.interp(p[:, 2], zc, [q[1] for q in cadeia])
        dentro = np.abs(p[:, 1] - eixo_y) <= fundo
        braco = fora & (d[f'braco_{l}'] <= perna)
        rot[braco & dentro] = i
        rot[braco & ~dentro] = -1
    return rot


def suave(a, b, x):
    """0 em a, 1 em b (a > b vale: desce)."""
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def pesos_cadeia(p, pontos, ossos, larguras):
    """Pesos ao longo de uma cadeia (coxa, canela, pé...): cada osso manda no seu trecho, e as juntas misturam."""
    _, seg, t = ate_linha(p, pontos)
    comp = np.array([np.linalg.norm(pontos[i + 1] - pontos[i]) for i in range(len(pontos) - 1)])
    s = np.concatenate([[0], np.cumsum(comp)])
    pos = s[seg] + t * comp[seg]
    W = np.zeros((len(p), len(ossos)))
    for i in range(len(ossos)):
        ini = 1.0 if i == 0 else suave(s[i] - larguras[i - 1], s[i] + larguras[i - 1], pos)
        fim = 1.0 if i == len(ossos) - 1 else 1 - suave(s[i + 1] - larguras[i], s[i + 1] + larguras[i], pos)
        W[:, i] = ini * fim
    return W / np.maximum(W.sum(axis=1, keepdims=True), 1e-9)


def pesos_corpo(v, J):
    W = np.zeros((len(v), len(OSSOS)))
    col = {o: i for i, o in enumerate(OSSOS)}
    z = v[:, 2]
    zp = J['pescoco'][2]
    wcab = suave(zp - 0.07, zp + 0.04, z)
    zq = J['coxa_r'][2]
    wperna = suave(zq + 0.03, zq - 0.07, z) * (1 - wcab)
    esq = suave(-0.03, 0.03, v[:, 0])
    wtronco = np.clip(1 - wcab - wperna, 0, 1)
    # tronco: pelve e as três vértebras, pela altura
    centros = [(J['quadril'][2] + J['coluna'][0][2]) / 2] + [(J['coluna'][i][2] + J['coluna'][i + 1][2]) / 2 for i in range(3)]
    nomes = ['pelvis', 'spine_01', 'spine_02', 'spine_03']
    zc = np.clip(z, centros[0], centros[-1])
    for i, nome in enumerate(nomes):
        h = np.zeros(len(v))
        if i > 0:
            m = (zc >= centros[i - 1]) & (zc <= centros[i])
            h[m] = (zc[m] - centros[i - 1]) / (centros[i] - centros[i - 1])
        if i < len(nomes) - 1:
            m = (zc >= centros[i]) & (zc <= centros[i + 1])
            h[m] = 1 - (zc[m] - centros[i]) / (centros[i + 1] - centros[i])
        if i == 0:
            h[zc <= centros[0]] = 1
        if i == len(nomes) - 1:
            h[zc >= centros[-1]] = 1
        W[:, col[nome]] += wtronco * h
    # cabeça (o pescoço pega o começo da mistura)
    W[:, col['Head']] += wcab * suave(zp - 0.03, zp + 0.02, z)
    W[:, col['neck_01']] += wcab * (1 - suave(zp - 0.03, zp + 0.02, z))
    # pernas
    for l, lado in (('l', esq), ('r', 1 - esq)):
        pts = [J[f'{k}_{l}'] for k in ('coxa', 'joelho', 'tornozelo', 'planta', 'ponta')]
        Wc = pesos_cadeia(v, pts, [f'thigh_{l}', f'calf_{l}', f'foot_{l}', f'ball_{l}'], [0.04, 0.025, 0.02])
        for i, o in enumerate([f'thigh_{l}', f'calf_{l}', f'foot_{l}', f'ball_{l}']):
            W[:, col[o]] += wperna * lado * Wc[:, i]
    return W / np.maximum(W.sum(axis=1, keepdims=True), 1e-9)


def pesos_braco(v, J, l):
    col = {o: i for i, o in enumerate(OSSOS)}
    W = np.zeros((len(v), len(OSSOS)))
    pts = [J[f'{k}_{l}'] for k in ('ombro', 'cotovelo', 'pulso', 'mao')]
    Wc = pesos_cadeia(v, pts, [f'upperarm_{l}', f'lowerarm_{l}', f'hand_{l}'], [0.05, 0.02])
    for i, o in enumerate([f'upperarm_{l}', f'lowerarm_{l}', f'hand_{l}']):
        W[:, col[o]] = Wc[:, i]
    return W


# ---------------------------------------------------------------- cor

def zbuffers(pts, vs, cam, raio=1):
    """A profundidade do que está na frente, em cada vista (os voxels da casca, pintados)."""
    out = {}
    for d, img in vs.items():
        H, W = img.shape[:2]
        u, v, prof = projetar(pts, d, cam)
        zb = np.full((H, W), np.inf)
        for dy in range(-raio, raio + 1):
            for dx in range(-raio, raio + 1):
                ui = np.round(u + dx).astype(int)
                vi = np.round(v + dy).astype(int)
                ok = (ui >= 0) & (ui < W) & (vi >= 0) & (vi < H)
                np.minimum.at(zb, (vi[ok], ui[ok]), prof[ok])
        out[d] = zb
    return out


def cores_por_direcao(v, n, ar, vs, mascaras, zbs, cam, tol=0.02):
    """Para cada direção: a cor de cada vértice (a vista dela onde ela vê; senão a que vê melhor)."""
    dirs = list(vs)
    amostra = np.zeros((len(dirs), len(v), 3))
    peso = np.zeros((len(dirs), len(v)))
    frente_de = np.zeros((len(dirs), len(v)))
    for k, d in enumerate(dirs):
        m = mascaras[d]
        H, W = m.shape
        u, vv, prof = projetar(v, d, cam)
        ui = np.clip(np.round(u).astype(int), 0, W - 1)
        vi = np.clip(np.round(vv).astype(int), 0, H - 1)
        visivel = (prof <= zbs[d][vi, ui] + tol) & m[vi, ui]
        frente = np.clip(n @ para_camera(d, cam), 0, 1)
        amostra[k] = amostrar(vs[d][:, :, :3].astype(float), u, vv)
        # quase preto é o contorno do desenho: só vale onde a vista olha de frente
        lum = amostra[k] @ np.array([0.3, 0.59, 0.11])
        contorno = lum < 40
        frente_de[k] = frente * visivel * np.where(contorno & (frente < 0.5), 0, 1)
        peso[k] = visivel * frente ** 3 * np.where(contorno, 0.02, 1)
    out = {}
    for k, d in enumerate(dirs):
        # a melhor das outras vistas (sem misturar: pixel art não tem meio-termo)
        melhor = np.argmax(peso, axis=0)
        cor = amostra[melhor, np.arange(len(v))]
        tem = peso.max(axis=0) > 1e-6
        # a vista desta direção manda em tudo o que ela vê de frente o bastante
        propria = frente_de[k] > 0.2
        cor[propria] = amostra[k][propria]
        tem |= propria
        # o que ninguém vê: a cor dos vizinhos (o contorno preto do desenho não espalha)
        semente = tem & ((cor @ np.array([0.3, 0.59, 0.11])) >= 40)
        falta = ~tem
        tem = semente.copy()
        for _ in range(400):
            if (tem | ~falta).all():
                break
            s = np.zeros((len(v), 3))
            c = np.zeros(len(v))
            np.add.at(s, ar[:, 0], cor[ar[:, 1]] * tem[ar[:, 1], None])
            np.add.at(c, ar[:, 0], tem[ar[:, 1]].astype(float))
            novo = falta & ~tem & (c > 0)
            cor[novo] = s[novo] / c[novo, None]
            tem |= novo
        out[d] = np.clip(cor, 0, 255).round().astype(np.uint8)
    return out


# ---------------------------------------------------------------- prévia

def previa(pecas, cam, vs, saida):
    """As peças pintadas (cada uma de uma cor) nas vistas s e e, sobre a arte."""
    tons = {'corpo': (90, 170, 255), 'braco_l': (255, 120, 60), 'braco_r': (80, 220, 120)}
    imgs = []
    for d in ('s', 'e', 'se'):
        base = vs[d][:, :, :3].astype(float) * 0.35
        H, W = base.shape[:2]
        zb = np.full((H, W), np.inf)
        cor = base.copy()
        todos_u, todos_v, todos_p, todos_c = [], [], [], []
        for nome, pc in pecas.items():
            u, v, prof = projetar(pc['v'], d, cam)
            nn = np.clip(pc['n'] @ para_camera(d, cam), 0, 1)
            todos_u.append(u)
            todos_v.append(v)
            todos_p.append(prof)
            todos_c.append(np.array(tons[nome])[None, :] * (0.45 + 0.55 * nn)[:, None])
        u, v, prof, c = (np.concatenate(x) for x in (todos_u, todos_v, todos_p, todos_c))
        uu = np.concatenate([np.round(u + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]).astype(int)
        vv = np.concatenate([np.round(v + dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]).astype(int)
        pp = np.tile(prof, 9)
        cc = np.tile(c, (9, 1))
        ok = (uu >= 0) & (uu < W) & (vv >= 0) & (vv < H)
        uu, vv, pp, cc = uu[ok], vv[ok], pp[ok], cc[ok]
        ordem = np.argsort(-pp)  # do mais longe ao mais perto: o mais perto pinta por último
        cor[vv[ordem], uu[ordem]] = cc[ordem]
        imgs.append(cor.astype(np.uint8))
    gravar(np.concatenate(imgs, axis=1), os.path.join(saida, 'pecas.png'))


# ---------------------------------------------------------------- tudo

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    cfg = json.load(open(args[0], encoding='utf-8'))
    saida = caminho(cfg['pecas'])
    os.makedirs(saida, exist_ok=True)
    vs = vistas(caminho(cfg['arte']), cfg['ordem'])
    mascaras = {d: v[:, :, 3] > 127 for d, v in vs.items()}
    arq_cam = caminho(cfg['cameras'])
    if '--cameras' in sys.argv or not os.path.exists(arq_cam):
        cam = ajustar_cameras(mascaras)
        json.dump(cam, open(arq_cam, 'w'), indent=1)
    cam = json.load(open(arq_cam))
    passo = cfg.get('passo', 0.008)
    # a casca sai das silhuetas sem o contorno preto do desenho (o contorno o pixelar.py põe de novo)
    justas = {d: erodir(m, cfg.get('erosao', 3)) for d, m in mascaras.items()}
    occ, xs, zs = esculpir(justas, cam, passo)
    kz = np.nonzero(occ.any(axis=(0, 1)))[0]
    sola = zs[kz.min()]
    print('casca:', int(occ.sum()), 'voxels; altura', round(zs[kz.max()] - sola, 3), 'm', flush=True)
    idx = np.argwhere(occ)
    pts = np.stack([xs[idx[:, 0]], xs[idx[:, 1]], zs[idx[:, 2]] - sola], axis=1)
    J = lados(cfg['juntas'])
    rotulo = separar(pts, J, cfg)
    # quem está na frente em cada vista: só o que ficou (o que saiu da manga não tapa nada)
    zbs = zbuffers(pts[rotulo >= 0] + np.array([0, 0, sola]), vs, cam)
    for i, nome in ((1, 'braco_l'), (2, 'braco_r')):
        b = pts[rotulo == i]
        for z in np.arange(b[:, 2].min(), b[:, 2].max(), 0.06):
            m = (b[:, 2] >= z) & (b[:, 2] < z + 0.06)
            if m.any():
                c = b[m].mean(axis=0)
                print(f'  {nome} z {z:.2f}: centro x {c[0]:+.3f} y {c[1]:+.3f}; x [{b[m][:, 0].min():+.2f}, {b[m][:, 0].max():+.2f}] y [{b[m][:, 1].min():+.2f}, {b[m][:, 1].max():+.2f}]')
    pecas = {}
    for i, nome in enumerate(('corpo', 'braco_l', 'braco_r')):
        o = np.zeros_like(occ)
        sel = idx[rotulo == i]
        o[tuple(sel.T)] = True
        vg, tri = surface_nets(borrar(o.astype(np.float32)))
        v = np.stack([xs[0] + vg[:, 0] * passo, xs[0] + vg[:, 1] * passo, zs[0] + vg[:, 2] * passo - sola], axis=1)
        v, tri = maior_parte(v, tri)
        ar = arestas_da_malha(tri)
        v = taubin(v, ar)
        n = normais(v, tri)
        if nome == 'corpo':
            W = pesos_corpo(v, J)
        else:
            W = pesos_braco(v, J, nome[-1])
        # as cores olham as vistas na posição de antes do ajuste da sola
        cores = cores_por_direcao(v + np.array([0, 0, sola]), n, ar, vs, mascaras, zbs, cam)
        pecas[nome] = {'v': v, 'f': tri, 'n': n, 'W': W, 'cores': cores}
        print(nome, len(v), 'vértices', len(tri), 'triângulos', flush=True)
    dirs = list(vs)
    np.savez_compressed(os.path.join(saida, 'pecas.npz'), ossos=np.array(OSSOS), direcoes=np.array(dirs),
                        **{f'{k}_{c}': (pc[c] if c != 'cores' else np.stack([pc['cores'][dd] for dd in dirs]))
                           for k, pc in pecas.items() for c in ('v', 'f', 'W', 'cores')})
    json.dump({'juntas': {k: (v.tolist() if not isinstance(v, list) else [p.tolist() for p in v]) for k, v in J.items()},
               'sola': float(sola), 'theta': cam['theta']}, open(os.path.join(saida, 'juntas.json'), 'w'), indent=1)
    previa({k: {'v': pc['v'] + np.array([0, 0, sola]), 'n': pc['n']} for k, pc in pecas.items()}, cam, vs, saida)
    print('pronto:', saida, flush=True)


if __name__ == '__main__':
    main()
