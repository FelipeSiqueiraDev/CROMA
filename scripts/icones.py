"""
Os ícones pintados dos itens para dentro do jogo.

O pedido (PROMPT-ICONES-ITENS.txt, na pasta da arte do GPT) devolve uma PNG de 1024×1024 por item,
com o nome do id do item no catálogo (faca.png, fuzil-de-assalto.png) ou, nos itens do cenário,
o nome que a aba ITENS procura (chave-do-arsenal.png, tipo-chave.png). Aqui cada uma é reduzida
para 256×256 (média dos pixels, sem serrilhar) e vai para client/public/arte/itens/pintados/, onde
a aba ITENS, a FICHAS e o COMBATE procuram (client/src/ui/itens.ts, arteDoItem).

    python scripts/icones.py <zip ou pasta> [<zip ou pasta> ...]

O que já está no jogo é trocado pelo novo; o resto fica.
"""
import io
import os
import sys
import zipfile

import fitz

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(REPO, 'client', 'public', 'arte', 'itens', 'pintados')
LADO = 256


def reduzir(dados: bytes) -> bytes:
    pix = fitz.Pixmap(io.BytesIO(dados).read())
    if not pix.alpha:
        pix = fitz.Pixmap(pix, 1)
    # reduz pela metade enquanto der (média de 2×2: sem serrilhar), e o resto de uma vez
    while pix.width >= LADO * 2 and pix.height >= LADO * 2:
        pix.shrink(1)
    if pix.width != LADO or pix.height != LADO:
        pix = fitz.Pixmap(pix, LADO, LADO, None)
    return pix.tobytes('png')


def pngs(origem):
    """As PNGs de um zip ou de uma pasta: (nome, bytes)."""
    if origem.lower().endswith('.zip'):
        z = zipfile.ZipFile(origem)
        for i in z.infolist():
            if i.filename.lower().endswith('.png') and '/prompts/' not in '/' + i.filename:
                yield os.path.basename(i.filename), z.read(i)
    else:
        for f in sorted(os.listdir(origem)):
            if f.lower().endswith('.png'):
                yield f, open(os.path.join(origem, f), 'rb').read()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    os.makedirs(DESTINO, exist_ok=True)
    feitos = []
    for origem in sys.argv[1:]:
        for nome, dados in pngs(origem):
            open(os.path.join(DESTINO, nome), 'wb').write(reduzir(dados))
            feitos.append(nome)
    print(f'{len(set(feitos))} ícones em client/public/arte/itens/pintados/')


if __name__ == '__main__':
    main()
