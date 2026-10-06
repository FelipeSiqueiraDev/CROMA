/**
 * A imagem do mapa improvisado (docs/FERRAMENTAS-DA-MESA.md), carregada uma vez. Até chegar, o
 * tabuleiro desenha o chão de sempre; o quadro seguinte já pega a imagem.
 */
const imagens = new Map<string, HTMLImageElement>();

export function imagemDoMapa(url: string | undefined): HTMLImageElement | null {
  if (!url) return null;
  let img = imagens.get(url);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = url;
    imagens.set(url, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}
