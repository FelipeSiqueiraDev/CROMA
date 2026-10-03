"""
Auditoria da arte dos móveis: para cada vista de cada móvel das fichas,
- o pedaço da folha encosta na borda da folha (pode ter vindo cortado);
- a caixa de outro pedaço invade este (o recorte apaga o que cai lá dentro);
- o ângulo em que o gerador desenhou (as bordas de cima: 45° e 30° é o certo);
- caminho da caixa: quanto do desenho fica fora da caixa (é cortado no tabuleiro);
- a imagem final encosta na borda (cortada no recorte).
Grava um relatório e uma folha por ficha: o pedaço original ao lado da vista final,
com o que ficou de fora da caixa pintado de vermelho.

Uso: python scripts/3d/auditoria.py <pasta de saída> [moveis-bar.json ...]
(sem fichas, confere todas as moveis-*.json de scripts/3d/fichas/)
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import moveis as mv  # noqa: E402

saida = sys.argv[1]
os.makedirs(saida, exist_ok=True)
R = mv.REPO + '/'
FICHAS = sys.argv[2:] or sorted(f for f in os.listdir(R + 'scripts/3d/fichas') if f.startswith('moveis-'))
lista = json.load(open(R + 'client/public/arte/mobiliario/moveis.json', encoding='utf-8'))
rel = []


def borda(op, m=1):
    return bool(op[:m].any() or op[-m:].any() or op[:, :m].any() or op[:, -m:].any())


def caixa_bonita(img, alvo_h):
    """Redimensiona para a altura alvo (só para a folha de conferência)."""
    h, w = img.shape[:2]
    k = alvo_h / h
    return mv.reamostrar(img, max(1, round(w * k)), max(1, round(h * k)))


def colar(lona, img, x, y):
    h, w = img.shape[:2]
    reg = lona[y:y + h, x:x + w]
    a = img[:, :, 3:4] / 255.0
    reg[:, :, :3] = img[:, :, :3] * a + reg[:, :, :3] * (1 - a)


for nome in FICHAS:
    cfg = json.load(open(R + 'scripts/3d/fichas/' + nome, encoding='utf-8'))
    folhas = {}
    linhas_img = []
    for m in cfg['moveis']:
        if 'giros' not in m and 'parede' not in m:
            continue
        arq = m.get('folha', cfg.get('folha'))
        if arq not in folhas:
            f = mv.ler(R + arq)
            if cfg.get('limpar'):
                f[:, :, 3] = np.where(f[:, :, 3] < cfg['limpar'], 0, f[:, :, 3])
            folhas[arq] = (f, mv.pedacos(f[:, :, 3] > 16))
        folha, caixas = folhas[arq]
        H, W = folha.shape[:2]
        vistas = m.get('giros') or {k: v[0] for k, v in m['parede'].items()}
        for giro, qual in vistas.items():
            pedaco, espelho = (qual, False) if isinstance(qual, int) else (qual['pedaco'], qual.get('espelho', False))
            if pedaco >= len(caixas):
                rel.append((m['def'], giro, ['PEDAÇO NÃO EXISTE na folha']))
                continue
            x0, y0, x1, y1 = caixas[pedaco]
            avisos = []
            if x0 <= 2 or y0 <= 2 or x1 >= W - 2 or y1 >= H - 2:
                avisos.append('encosta na borda da folha')
            # caixas de outros pedaços que invadem esta (o recorte apaga o que cai nelas)
            apagado = 0
            sub = folha[y0:y1, x0:x1, 3] > 100
            for j, (a0, b0, a1, b1) in enumerate(caixas):
                if j == pedaco:
                    continue
                ix0, iy0, ix1, iy1 = max(a0, x0), max(b0, y0), min(a1, x1), min(b1, y1)
                if ix0 < ix1 and iy0 < iy1:
                    apagado += int(sub[iy0 - y0:iy1 - y0, ix0 - x0:ix1 - x0].sum())
            if apagado > 30:
                avisos.append(f'recorte apagou {apagado} px (caixa do vizinho)')
            # o pedaço inteiro, sem apagar nada, para mostrar o que o recorte tira
            cheio = folha[y0:y1, x0:x1].copy()
            marca = np.zeros(cheio.shape[:2], dtype=bool)
            for j, (a0, b0, a1, b1) in enumerate(caixas):
                if j == pedaco:
                    continue
                ix0, iy0, ix1, iy1 = max(a0, x0), max(b0, y0), min(a1, x1), min(b1, y1)
                if ix0 < ix1 and iy0 < iy1:
                    marca[iy0 - y0:iy1 - y0, ix0 - x0:ix1 - x0] = True
            marca &= cheio[:, :, 3] > 100
            rec = mv.recortar(folha, caixas, pedaco)
            if espelho:
                rec = rec[:, ::-1].copy()
            if m.get('retificar'):
                rec, _ = mv.retificar(rec)
            ang = mv.angulos_do_desenho(rec)
            if ang:
                a, t = np.degrees(ang[0]), np.degrees(ang[1])
                if abs(a - 45) > 7 or abs(t - 30) > 7:
                    avisos.append(f'desenhado a {a:.0f}° e {t:.0f}° (o certo é 45° e 30°)')
            elif 'giros' in m and not m.get('pendurado'):
                avisos.append('bordas de cima não dão ângulo (de frente?)')
            fora = None
            if 'giros' in m and not m.get('como_esta') and not m.get('pendurado') and m.get('real'):
                troca = giro in ('2', '6')
                real = m['real']
                wr, dr, hr = (real[1], real[0], real[2]) if troca else (real[0], real[1], real[2])
                cam, nota = mv.ajustar_camera(rec[:, :, 3] > 100, wr, dr, hr, livre='tudo',
                                               angulos=mv.angulos_do_desenho(rec) if m.get('angulos') else None)
                u, v = mv.proj(mv.cantos(cam['W'], cam['D'], cam['H']), cam)
                casco = mv.poligono(mv.casco(np.stack([u, v], axis=1)), *rec.shape[:2])
                op = rec[:, :, 3] > 100
                fora = op & ~casco
                n = int(fora.sum())
                frac = n / max(1, int(op.sum()))
                if frac > 0.02:
                    avisos.append(f'{frac * 100:.0f}% do desenho fica fora da caixa (cortado)')
            ent = lista.get(m['def'], {})
            vista = (ent.get('giros') or {}).get(giro) or (ent.get('parede') or {}).get(giro)
            final = None
            if vista and 'arquivo' in vista:
                final = mv.ler(R + 'client/public/arte/mobiliario/' + vista['arquivo'])
                if not m.get('como_esta') and 'giros' in m and borda(final[:, :, 3] > 100):
                    avisos.append('imagem final encosta na borda (cortada)')
            rel.append((m['def'], giro, avisos))
            # a linha da folha: o pedaço (com o que fica fora em vermelho) e a vista final
            serio = [x for x in avisos if not x.startswith('desenhado') and not x.startswith('bordas')]
            if serio:
                c0 = cheio.copy()
                c0[marca] = [255, 0, 255, 255]
                orig = rec.copy()
                if fora is not None:
                    orig[fora] = [255, 40, 60, 255]
                a = np.concatenate([caixa_bonita(c0, 220), np.zeros((220, 20, 4), np.uint8), caixa_bonita(orig, 220)], axis=1)
                b = caixa_bonita(final, 220) if final is not None else None
                linhas_img.append((f"{m['def']} {giro}", a, b, avisos))
    # a folha desta ficha
    if linhas_img:
        Lw = 1400
        alt = 250 * len(linhas_img)
        lona = np.full((alt, Lw, 4), 40, dtype=float)
        lona[:, :, 3] = 255
        for i, (rot, a, b, av) in enumerate(linhas_img):
            y = i * 250 + 15
            colar(lona, a.astype(float), 20, y)
            if b is not None:
                colar(lona, b.astype(float), 40 + a.shape[1], y)
        mv.gravar(lona.clip(0, 255).astype(np.uint8), os.path.join(saida, nome.replace('.json', '.png')))
        with open(os.path.join(saida, nome.replace('.json', '.txt')), 'w', encoding='utf-8') as fo:
            for i, (rot, a, b, av) in enumerate(linhas_img):
                fo.write(f'linha {i + 1}: {rot}: ' + '; '.join(av) + '\n')

with open(os.path.join(saida, 'relatorio.txt'), 'w', encoding='utf-8') as fo:
    for d, g, av in rel:
        fo.write(f"{d:18s} {g:4s} " + ('; '.join(av) if av else 'ok') + '\n')
print('vistas:', len(rel), 'com aviso:', sum(1 for r in rel if r[2]))
