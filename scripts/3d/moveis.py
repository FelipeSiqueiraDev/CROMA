"""
Móveis do tabuleiro a partir de uma folha de objetos desenhados (fundo transparente,
cada objeto separado, vistos de cima e de lado).

Para cada objeto da folha (contados por linha, da esquerda para a direita), a ficha
diz qual móvel do jogo ele é, quantas casas ele ocupa (W de largura, ao longo da
frente; D de fundo) e de que lado do desenho está a frente.

- Móvel de caixa (mesa, armário, estante, cama, sinuca...): o desenho nem sempre
  está no ângulo exato do tabuleiro. O script acha o ângulo dele (a caixa do móvel
  que melhor cobre a silhueta), projeta o desenho na caixa e redesenha a caixa na
  câmera do tabuleiro (45°, 30°): a base cai certinho nas casas. As costas saem da
  mesma caixa: a frente espelhada atrás ('frente', o normal) ou lisas, com a textura
  da lateral ('lado'). 'solido' fecha os buracos de um móvel maciço (armário, caixote).
- Planta, cadeira (ancora 'centro'): a imagem vai como está, pela altura, presa no
  centro da base.

A arte sai em dobro (2 pixels da imagem por pixel do tabuleiro no zoom 1), em
<destino>/<móvel>/<vista>.png, e o <destino>/moveis.json que o jogo lê.

Uso: python moveis.py <ficha.json> [--conferir saida.png]
"""
import json
import os
import sys

import fitz
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CASA = 0.68
# o tabuleiro: casa de 64 x 32 pixels no zoom 1 = câmera a 45° e 30°, 66,55 px por metro no plano da imagem
PX_M_TABULEIRO = 32 / (CASA * np.cos(np.radians(45)))


def ler(p):
    pix = fitz.Pixmap(p)
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 4).copy()


def gravar(a, p):
    h, w = a.shape[:2]
    fitz.Pixmap(fitz.csRGB, w, h, np.ascontiguousarray(a).tobytes(), True).save(p)


def pedacos(alfa, red=4):
    """Os objetos da folha: caixas dos pedaços ligados (numa grade reduzida), em ordem de leitura."""
    h, w = alfa.shape[0] // red, alfa.shape[1] // red
    m = alfa[:h * red, :w * red].reshape(h, red, w, red).max(axis=(1, 3))
    rot = np.where(m, np.arange(h * w).reshape(h, w), -1)
    while True:
        novo = rot.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            viz = np.roll(np.roll(rot, dy, 0), dx, 1)
            ok = (novo >= 0) & (viz >= 0)
            novo = np.where(ok, np.minimum(novo, viz), novo)
        if (novo == rot).all():
            break
        rot = novo
    caixas = []
    for r in np.unique(rot[rot >= 0]):
        ys, xs = np.nonzero(rot == r)
        if len(ys) < 40:
            continue
        caixas.append([xs.min() * red, ys.min() * red, (xs.max() + 1) * red, (ys.max() + 1) * red])
    caixas.sort(key=lambda c: (c[1] + c[3]) / 2)
    linhas, atual = [], []
    for c in caixas:
        if atual and (c[1] + c[3]) / 2 - np.mean([(a[1] + a[3]) / 2 for a in atual]) > 0.25 * (c[3] - c[1]):
            linhas.append(atual)
            atual = []
        atual.append(c)
    if atual:
        linhas.append(atual)
    return [c for ln in linhas for c in sorted(ln, key=lambda c: c[0])]


def recortar(folha, caixas, i):
    x0, y0, x1, y1 = caixas[i]
    rec = folha[y0:y1, x0:x1].copy()
    for j, (a0, b0, a1, b1) in enumerate(caixas):
        if j == i:
            continue
        ix0, iy0, ix1, iy1 = max(a0, x0), max(b0, y0), min(a1, x1), min(b1, y1)
        if ix0 < ix1 and iy0 < iy1:
            rec[iy0 - y0:iy1 - y0, ix0 - x0:ix1 - x0, 3] = 0
    ys, xs = np.nonzero(rec[:, :, 3] > 16)
    return rec[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def reamostrar(img, w2, h2):
    """Redimensiona pela média da área (alfa pré-multiplicado: a borda não escurece)."""
    h, w = img.shape[:2]

    def matriz(n_in, n_out):
        M = np.zeros((n_out, n_in))
        esc = n_in / n_out
        for i in range(n_out):
            a, b = i * esc, (i + 1) * esc
            for j in range(int(np.floor(a)), min(n_in, int(np.ceil(b)))):
                M[i, j] = min(b, j + 1) - max(a, j)
        return M / M.sum(axis=1, keepdims=True)
    Ry, Rx = matriz(h, h2), matriz(w, w2)
    f = img.astype(float) / 255.0
    pre = f[:, :, :3] * f[:, :, 3:4]
    al = Ry @ f[:, :, 3] @ Rx.T
    cor = np.stack([Ry @ pre[:, :, c] @ Rx.T for c in range(3)], axis=2)
    cor = cor / np.maximum(al[:, :, None], 1e-6)
    out = np.zeros((h2, w2, 4), dtype=np.uint8)
    out[:, :, :3] = np.clip(cor * 255, 0, 255).round()
    out[:, :, 3] = np.clip(al * 255, 0, 255).round()
    return out


def ancora_centro(img):
    """O centro da base (a elipse do pé, 2:1) de um objeto redondo: planta, cadeira."""
    op = img[:, :, 3] > 100
    ys = np.nonzero(op.any(axis=1))[0]
    baixo = ys.max()
    faixa = op[max(0, baixo - max(2, int(0.08 * (baixo - ys.min())))):baixo + 1]
    xs = np.nonzero(faixa.any(axis=0))[0]
    largura = xs.max() - xs.min() + 1
    return float((xs.min() + xs.max() + 1) / 2), float(baixo + 1 - largura / 4)


# ---------------------------------------------------------------- a caixa

def proj(p, c):
    """Câmera ortográfica: azimute a, elevação t, S px/m, centro (u0, v0). p em metros; z para cima."""
    ca, sa = np.cos(c['a']), np.sin(c['a'])
    ct, st = np.cos(c['t']), np.sin(c['t'])
    u = c['u0'] + c['S'] * (ca * p[..., 0] - sa * p[..., 1])
    v = c['v0'] + c['S'] * (st * (sa * p[..., 0] + ca * p[..., 1]) - ct * p[..., 2])
    return u, v


def cantos(Wm, Dm, H):
    return np.array([[x, y, z] for x in (0, Wm) for y in (0, Dm) for z in (0, H)], dtype=float)


def casco(pts):
    """Fecho convexo 2D."""
    pts = sorted(map(tuple, pts))

    def cruz(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    inf, sup = [], []
    for q in pts:
        while len(inf) >= 2 and cruz(inf[-2], inf[-1], q) <= 0:
            inf.pop()
        inf.append(q)
    for q in reversed(pts):
        while len(sup) >= 2 and cruz(sup[-2], sup[-1], q) <= 0:
            sup.pop()
        sup.append(q)
    return np.array(inf[:-1] + sup[:-1])


def poligono(pol, H, W):
    yy, xx = np.mgrid[0:H, 0:W]
    m = np.ones((H, W), dtype=bool)
    for i in range(len(pol)):
        a, b = pol[i], pol[(i + 1) % len(pol)]
        m &= (b[0] - a[0]) * (yy + 0.5 - a[1]) - (b[1] - a[1]) * (xx + 0.5 - a[0]) >= 0
    return m


def ajustar_camera(mask, Wm, Dm, H0):
    """O ângulo do desenho: a caixa do móvel (a altura pode variar) que melhor cobre a silhueta."""
    ys, xs = np.nonzero(mask)
    alvo = poligono(casco(np.stack([xs, ys], axis=1).astype(float) + 0.5), *mask.shape)
    area = alvo.sum()
    c = {'a': np.radians(45), 't': np.radians(30), 'S': mask.shape[1] / ((Wm + Dm) * 0.7071), 'u0': 0.0, 'v0': 0.0, 'H': H0}
    u, v = proj(cantos(Wm, Dm, H0), c)
    c['u0'] = (xs.min() + xs.max()) / 2 - (u.min() + u.max()) / 2
    c['v0'] = (ys.min() + ys.max()) / 2 - (v.min() + v.max()) / 2

    def nota(c):
        u, v = proj(cantos(Wm, Dm, c['H']), c)
        m = poligono(casco(np.stack([u, v], axis=1)), *mask.shape)
        inter = (m & alvo).sum()
        return inter / max(1, (m | alvo).sum()) - 2.0 * max(0.0, 0.97 - inter / area)
    base = nota(c)
    passos = {'a': np.radians(4), 't': np.radians(4), 'S': c['S'] * 0.04, 'u0': 4.0, 'v0': 4.0, 'H': H0 * 0.06}
    for _ in range(7):
        for k in ('a', 't', 'S', 'u0', 'v0', 'H'):
            for sinal in (1, -1):
                while True:
                    novo = dict(c)
                    novo[k] += sinal * passos[k]
                    novo['t'] = float(np.clip(novo['t'], np.radians(10), np.radians(70)))
                    novo['a'] = float(np.clip(novo['a'], np.radians(15), np.radians(75)))
                    n = nota(novo)
                    if n <= base + 1e-5:
                        break
                    c, base = novo, n
        passos = {k: v * 0.5 for k, v in passos.items()}
    return c, base


def amostrar(img, u, v):
    """Cor (RGBA) da imagem em (u, v), bilinear com alfa pré-multiplicado."""
    h, w = img.shape[:2]
    f = img.astype(float)
    pre = f.copy()
    pre[..., :3] *= f[..., 3:4] / 255.0
    fora = (u < 0) | (u > w) | (v < 0) | (v > h)
    u = np.clip(u - 0.5, 0, w - 1.001)
    v = np.clip(v - 0.5, 0, h - 1.001)
    u0, v0 = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = (u - u0)[..., None], (v - v0)[..., None]
    a = pre[v0, u0] * (1 - fu) + pre[v0, u0 + 1] * fu
    b = pre[v0 + 1, u0] * (1 - fu) + pre[v0 + 1, u0 + 1] * fu
    r = a * (1 - fv) + b * fv
    r[..., :3] = r[..., :3] / np.maximum(r[..., 3:4] / 255.0, 1e-6)
    r[fora] = 0
    return r


def renderizar(desenho, cam, Wm, Dm, H, escala, costas=None, solido=False):
    """
    A caixa com o desenho projetado, vista pela câmera do tabuleiro, em dobro (1/escala px
    por px do tabuleiro). costas: None (a frente, como desenhada), 'lado' (as costas lisas,
    com a textura da lateral) ou 'frente' (a frente espelhada atrás). Devolve a imagem e a
    âncora (a quina de baixo da base).
    """
    tab = {'a': np.radians(45), 't': np.radians(30), 'S': PX_M_TABULEIRO / escala, 'u0': 0.0, 'v0': 0.0}
    u, v = proj(cantos(Wm, Dm, H), tab)
    x0, x1 = int(np.floor(u.min())) - 1, int(np.ceil(u.max())) + 1
    y0, y1 = int(np.floor(v.min())) - 1, int(np.ceil(v.max())) + 1
    tab['u0'], tab['v0'] = -x0, -y0
    Wi, Hi = x1 - x0, y1 - y0
    yy, xx = np.mgrid[0:Hi, 0:Wi].astype(float) + 0.5
    ca, sa, ct, st = np.cos(tab['a']), np.sin(tab['a']), np.cos(tab['t']), np.sin(tab['t'])
    # o ponto do chão (z = 0) de cada pixel; o raio sobe para a câmera na direção w
    inv = np.linalg.inv(np.array([[ca, -sa], [st * sa, st * ca]]) * tab['S'])
    du, dv = xx - tab['u0'], yy - tab['v0']
    chao = np.stack([inv[0, 0] * du + inv[0, 1] * dv, inv[1, 0] * du + inv[1, 1] * dv, np.zeros_like(du)], axis=-1)
    w = np.array([sa * ct, ca * ct, st])
    lo, hi = np.zeros(3), np.array([Wm, Dm, H])
    tmin = np.full(du.shape, -np.inf)
    tmax = np.full(du.shape, np.inf)
    face = np.zeros(du.shape, dtype=int)
    for k in range(3):
        t1 = (lo[k] - chao[..., k]) / w[k]
        t2 = (hi[k] - chao[..., k]) / w[k]
        tn, tf = np.minimum(t1, t2), np.maximum(t1, t2)
        tmin = np.maximum(tmin, tn)
        face = np.where(tf < tmax, k, face)
        tmax = np.minimum(tmax, tf)
    acerta = tmax >= tmin
    p = chao + np.where(acerta, tmax, 0)[..., None] * w
    q = p.copy()
    if costas:
        # de trás: a caixa girada 180°; o ponto de verdade é o do outro lado
        q[..., 0] = Wm - p[..., 0]
        q[..., 1] = Dm - p[..., 1]
        atras = face == 1
        outro = face == 0
        q2 = q.copy()
        if costas == 'lado':
            q2[..., 0] = Wm
            q2[..., 1] = (q[..., 0] / max(Wm, 1e-6)) * Dm
        else:
            q2[..., 1] = Dm
        q = np.where(atras[..., None], q2, q)
        q3 = q.copy()
        q3[..., 0] = Wm
        q = np.where(outro[..., None], q3, q)
    cor = amostrar(desenho, *proj(q, cam))
    if solido:
        # móvel maciço (armário, caixote): onde a caixa pegou fora do desenho, a cor média da face
        for k in range(3):
            m = acerta & (face == k)
            if not m.any():
                continue
            cheio = m & (cor[..., 3] > 200)
            media = cor[cheio][:, :3].mean(axis=0) if cheio.any() else cor[m][:, :3].mean(axis=0)
            a = cor[..., 3:4] / 255.0
            cor[..., :3] = np.where(m[..., None], cor[..., :3] * a + media * (1 - a), cor[..., :3])
            cor[..., 3] = np.where(m, 255, cor[..., 3])
    out = np.zeros((Hi, Wi, 4))
    out[acerta] = cor[acerta]
    ub, vb = proj(np.array([Wm, Dm, 0.0]), tab)
    return np.clip(out, 0, 255).round().astype(np.uint8), (float(ub), float(vb))


# ---------------------------------------------------------------- tudo

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    cfg = json.load(open(args[0], encoding='utf-8'))
    folha = ler(os.path.join(REPO, cfg['folha']))
    destino = os.path.join(REPO, cfg['destino'])
    escala = cfg.get('escala', 0.5)
    caixas = pedacos(folha[:, :, 3] > 16)
    print(len(caixas), 'objetos na folha', flush=True)
    arq_lista = os.path.join(destino, 'moveis.json')
    lista = json.load(open(arq_lista, encoding='utf-8')) if os.path.exists(arq_lista) else {}
    conferir = []
    for m in cfg['moveis']:
        rec = recortar(folha, caixas, m['pedaco'])
        if m.get('lado', 'esquerda') == 'direita':
            # tudo trabalha com a frente à esquerda; o jogo espelha quando precisa
            rec = rec[:, ::-1].copy()
        pasta = os.path.join(destino, m['def'])
        os.makedirs(pasta, exist_ok=True)
        ent = {'escala': escala}
        if m.get('ancora') == 'centro':
            k = m['altura'] * 57.6 / escala / rec.shape[0] * m.get('ajuste', 1.0)
            img = reamostrar(rec, max(1, round(rec.shape[1] * k)), max(1, round(rec.shape[0] * k)))
            ax, ay = ancora_centro(img)
            gravar(img, os.path.join(pasta, 'frente.png'))
            ent['frente'] = {'arquivo': f"{m['def']}/frente.png", 'ax': round(ax, 1), 'ay': round(ay, 1), 'lado': 'esquerda', 'ancora': 'centro'}
            conferir.append((m['def'], img, None))
            print(f"{m['def']}: {img.shape[1]}x{img.shape[0]} (pela altura, centro)", flush=True)
        else:
            Wm, Dm = m['W'] * CASA, m['D'] * CASA
            cam, nota = ajustar_camera(rec[:, :, 3] > 100, Wm, Dm, m['altura'])
            H = cam['H']
            solido = m.get('solido', False)
            vistas = {'frente': renderizar(rec, cam, Wm, Dm, H, escala, solido=solido)}
            if m.get('costas', 'frente') != 'nao':
                vistas['costas'] = renderizar(rec, cam, Wm, Dm, H, escala, costas=m.get('costas', 'frente'), solido=solido)
            for nome, (img, (ax, ay)) in vistas.items():
                gravar(img, os.path.join(pasta, f'{nome}.png'))
                ent[nome] = {'arquivo': f"{m['def']}/{nome}.png", 'ax': round(ax, 1), 'ay': round(ay, 1), 'lado': 'esquerda', 'ancora': 'quina'}
            conferir.append((m['def'], vistas['frente'][0], vistas.get('costas', (None,))[0]))
            print(f"{m['def']}: encaixe {nota:.3f}; desenho a {np.degrees(cam['a']):.0f}° e {np.degrees(cam['t']):.0f}°, "
                  f"altura {H:.2f} m (ficha {m['altura']:.2f})", flush=True)
        lista[m['def']] = ent
    with open(arq_lista, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(lista, f, ensure_ascii=False, indent=1)
        f.write('\n')
    if '--conferir' in sys.argv:
        folha_conf(conferir, sys.argv[sys.argv.index('--conferir') + 1])


def folha_conf(itens, saida):
    blocos = []
    for _, a, b in itens:
        for img in (a, b):
            if img is None:
                continue
            c = np.zeros(img.shape[:2] + (3,))
            c[:] = (40, 40, 48)
            al = img[:, :, 3:4] / 255.0
            c = img[:, :, :3] * al + c * (1 - al)
            blocos.append(c.astype(np.uint8))
    H = max(b.shape[0] for b in blocos)
    linha = np.concatenate([np.pad(b, ((H - b.shape[0], 0), (0, 6), (0, 0)), constant_values=24) for b in blocos], axis=1)
    gravar(np.concatenate([linha, np.full(linha.shape[:2] + (1,), 255, np.uint8)], axis=2), saida)


if __name__ == '__main__':
    main()
