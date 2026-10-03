# Leitura dos livros de Ordem Paranormal para o Veríssimo (só leitura).
#
#   python livro.py texto LR 82 84        -> texto das páginas 82 a 84 (número impresso no rodapé)
#   python livro.py busca LR "Tiro Certeiro"  -> páginas impressas onde o termo aparece
#   python livro.py imagem SAH 88 89      -> PNGs das páginas 88 e 89 (o SaH é só imagem)
#   python livro.py recorte SAH 90 0.5 0.4 1 0.7  -> PNG ampliado de um pedaço da página
#                                                 (x0 y0 x1 y1 de 0 a 1)
#
# Os PDFs ficam fora do repositório. O caminho de cada um vem de
# server/data/verissimo/livros.json (fora do git):
#   {"LR": "C:/.../LIVRO DE REGRAS.pdf", "SAH": "C:/.../sobrevivendo-ao-horror.pdf",
#    "marca": ["trechos da marca d'água do comprador, para esconder"]}
# ou das variáveis CRONA_LR_PDF e CRONA_SAH_PDF.
#
# Os PDFs têm marca d'água do comprador (nome e e-mail): as linhas com e-mail
# ou com os trechos de "marca" somem do texto. Nas imagens ela aparece: nunca
# copiar. O texto do livro é protegido: resumir com palavras próprias.
import json
import os
import re
import sys

import fitz  # PyMuPDF

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
PASTA = os.path.join(RAIZ, "server", "data", "verissimo")
SAIDA = os.path.join(PASTA, "paginas")

# página do PDF = página impressa + deslocamento (conferido em 29 e 30/09/2026)
DESLOCAMENTO = {"LR": 2, "SAH": 1}

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")


def config():
    cfg = {}
    arq = os.path.join(PASTA, "livros.json")
    if os.path.exists(arq):
        with open(arq, encoding="utf-8") as f:
            cfg = json.load(f)
    for livro, var in (("LR", "CRONA_LR_PDF"), ("SAH", "CRONA_SAH_PDF")):
        # o nome antigo (CROMA_..._PDF) continua valendo
        valor = os.environ.get(var) or os.environ.get(var.replace("CRONA", "CROMA"))
        if valor:
            cfg[livro] = valor
    return cfg


def abrir(livro):
    cfg = config()
    caminho = cfg.get(livro)
    if not caminho or not os.path.exists(caminho):
        print(f"Não achei o PDF de {livro}. Configure server/data/verissimo/livros.json ou {('CRONA_LR_PDF' if livro == 'LR' else 'CRONA_SAH_PDF')}.")
        sys.exit(0)
    return fitz.open(caminho), cfg


def esconder(cfg):
    termos = [t.lower() for t in cfg.get("marca", []) if t]
    return lambda linha: EMAIL.search(linha) or any(t in linha.lower() for t in termos)


def pdf(livro, impressa):
    return impressa + DESLOCAMENTO[livro]


def texto(livro, a, b):
    doc, cfg = abrir(livro)
    tirar = esconder(cfg)
    for p in range(a, b + 1):
        i = pdf(livro, p) - 1
        if i < 0 or i >= len(doc):
            continue
        linhas = [l for l in doc[i].get_text("text").splitlines() if not tirar(l)]
        print(f"\n===== {livro} p. {p} (PDF {i + 1}) =====")
        print("\n".join(linhas))
    if livro == "SAH":
        print("\n(O SaH é só imagem: use `imagem SAH <página>` e abra o PNG.)")


def busca(livro, termo):
    doc, _ = abrir(livro)
    achou = [i + 1 - DESLOCAMENTO[livro] for i, pg in enumerate(doc) if termo.lower() in pg.get_text("text").lower()]
    print(f"páginas impressas de {livro} com \"{termo}\":", achou or "nenhuma")


def imagem(livro, a, b):
    doc, _ = abrir(livro)
    os.makedirs(SAIDA, exist_ok=True)
    for p in range(a, b + 1):
        i = pdf(livro, p) - 1
        if i < 0 or i >= len(doc):
            continue
        arq = os.path.join(SAIDA, f"{livro}-p{p:03d}.png")
        if not os.path.exists(arq):
            doc[i].get_pixmap(matrix=fitz.Matrix(1.6, 1.6)).save(arq)
        print(arq)


def recorte(livro, p, x0, y0, x1, y1):
    doc, _ = abrir(livro)
    os.makedirs(SAIDA, exist_ok=True)
    pg = doc[pdf(livro, p) - 1]
    r = pg.rect
    clip = fitz.Rect(r.width * x0, r.height * y0, r.width * x1, r.height * y1)
    arq = os.path.join(SAIDA, f"{livro}-p{p:03d}-recorte-{int(x0*100)}-{int(y0*100)}-{int(x1*100)}-{int(y1*100)}.png")
    pg.get_pixmap(matrix=fitz.Matrix(3, 3), clip=clip).save(arq)
    print(arq)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 4:
        print(__doc__ or "uso: livro.py texto|busca|imagem|recorte LR|SAH ...")
        sys.exit(0)
    modo, livro = sys.argv[1], sys.argv[2].upper()
    if livro == "SAH" and modo == "busca":
        print("O SaH não tem texto: procure pelo sumário (imagem SAH 3) ou pela página citada no catálogo.")
        sys.exit(0)
    if modo == "texto":
        a = int(sys.argv[3])
        texto(livro, a, int(sys.argv[4]) if len(sys.argv) > 4 else a)
    elif modo == "busca":
        busca(livro, " ".join(sys.argv[3:]))
    elif modo == "imagem":
        a = int(sys.argv[3])
        imagem(livro, a, int(sys.argv[4]) if len(sys.argv) > 4 else a)
    elif modo == "recorte":
        recorte(livro, int(sys.argv[3]), *[float(x) for x in sys.argv[4:8]])
    else:
        print("modos: texto, busca, imagem, recorte")
