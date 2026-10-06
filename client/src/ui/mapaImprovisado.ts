import { M_POR_CASA, tamanhoDoMapa } from '@crona/shared';
import type { App } from './app';
import { h, toast } from './dom';
import { botao, janela } from './fichaModal';
import { sfx } from './sfx';

/**
 * Mapa improvisado (docs/FERRAMENTAS-DA-MESA.md): o mestre sobe uma imagem (a planta de um lugar que
 * ainda não foi montado, um mapa de batalha) e ela vira uma cena vista de cima. Ele diz quantos
 * quadrados de 1,5 m a imagem tem de largura; a grade aparece por cima da prévia para conferir.
 */
export function abrirMapaImprovisado(app: App) {
  if (!app.state.room?.isOwner) return;
  let arquivo: File | null = null;
  let img: HTMLImageElement | null = null;
  let enviando = false;
  const j = janela('MAPA IMPROVISADO', 'imagem', () => {}, 60);

  const escolher = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'mi-arquivo' }) as HTMLInputElement;
  const nome = h('input', { class: 'fx-inp', maxlength: 30, placeholder: 'Ex.: Beco atrás do bar' }) as HTMLInputElement;
  const quadrados = h('input', { class: 'fx-inp mi-num', type: 'number', min: 2, max: 80, step: 1, value: 20 }) as HTMLInputElement;
  const levar = h('input', { type: 'checkbox', checked: true }) as HTMLInputElement;
  const medida = h('span', { class: 'mi-medida' }, 'Escolha a imagem.');
  const grade = h('canvas', { class: 'mi-grade', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const previa = h('div', { class: 'mi-previa vazia' }, h('span', { class: 'mi-vazio' }, 'Nenhuma imagem'), grade);
  const criar = botao('Criar o mapa', 'ok', 'forte', () => void enviar());
  criar.disabled = true;

  /** O tamanho em casas, a medida em metros e a grade por cima da prévia. */
  const atualizar = () => {
    const q = Math.max(2, Math.min(80, Math.round(Number(quadrados.value) || 20)));
    if (!img) return;
    const t = tamanhoDoMapa(q, img.naturalWidth, img.naturalHeight);
    const m = (casas: number) => (casas * M_POR_CASA).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    medida.textContent = `${t.largura / 2} × ${t.altura / 2} quadrados · ${m(t.largura)} × ${m(t.altura)} m`;
    const r = img.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    grade.width = Math.round(r.width * dpr);
    grade.height = Math.round(r.height * dpr);
    grade.style.width = `${r.width}px`;
    grade.style.height = `${r.height}px`;
    grade.style.left = `${img.offsetLeft}px`;
    grade.style.top = `${img.offsetTop}px`;
    const g = grade.getContext('2d')!;
    g.clearRect(0, 0, grade.width, grade.height);
    // a grade de 1,5 m (2 casas), na proporção da imagem
    const passoX = grade.width / (t.largura / 2);
    const passoY = grade.height / (t.altura / 2);
    g.strokeStyle = 'rgba(255, 236, 200, 0.55)';
    g.lineWidth = Math.max(1, dpr);
    g.beginPath();
    for (let x = passoX; x < grade.width - 1; x += passoX) (g.moveTo(Math.round(x) + 0.5, 0), g.lineTo(Math.round(x) + 0.5, grade.height));
    for (let y = passoY; y < grade.height - 1; y += passoY) (g.moveTo(0, Math.round(y) + 0.5), g.lineTo(grade.width, Math.round(y) + 0.5));
    g.stroke();
  };

  escolher.addEventListener('change', () => {
    const f = escolher.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast('Envie uma imagem PNG, JPG ou WEBP.', 'error');
    if (f.size > 12 * 1024 * 1024) return toast('Imagem grande demais (máx. 12 MB).', 'error');
    arquivo = f;
    if (!nome.value.trim()) nome.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 30);
    const novo = new Image();
    novo.onload = () => {
      img = novo;
      previa.classList.remove('vazia');
      previa.replaceChildren(novo, grade);
      criar.disabled = false;
      requestAnimationFrame(atualizar);
    };
    novo.src = URL.createObjectURL(f);
  });
  quadrados.addEventListener('input', atualizar);

  const enviar = async () => {
    const me = app.state.me;
    if (enviando || !arquivo || !img || !me) return;
    const t = tamanhoDoMapa(Math.max(2, Math.min(80, Math.round(Number(quadrados.value) || 20))), img.naturalWidth, img.naturalHeight);
    enviando = true;
    criar.disabled = true;
    medida.textContent = 'Enviando a imagem…';
    try {
      const res = await fetch(`/api/mapas?token=${encodeURIComponent(me.token)}`, { method: 'POST', headers: { 'Content-Type': arquivo.type }, body: arquivo });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Não foi possível enviar a imagem.');
      app.net.send({ t: 'mapaImprovisado', nome: nome.value.trim() || 'Mapa improvisado', url: data.url, largura: t.largura, altura: t.altura, levar: levar.checked });
      sfx.paper();
      j.fechar();
    } catch (e) {
      toast((e as Error).message, 'error');
      enviando = false;
      criar.disabled = false;
      atualizar();
    }
  };

  j.corpo.append(
    h('p', { class: 'mi-dica' }, 'A imagem vira uma cena vista de cima, com a grade de 1,5 m e as peças em fichas. Uma Entrada liga o mapa à cena de agora.'),
    h('div', { class: 'mi-linha' }, h('label', { class: 'fx-bt mi-escolher' }, 'Escolher a imagem…', escolher), medida),
    previa,
    h('div', { class: 'mi-campos' }, h('label', { class: 'fj-campo' }, h('span', null, 'Nome'), nome), h('label', { class: 'fj-campo' }, h('span', null, 'Largura, em quadrados de 1,5 m'), quadrados)),
    h('label', { class: 'fj-check' }, levar, 'Levar os agentes desta cena'),
  );
  j.rodape.append(h('span', { class: 'fj-esp' }), botao('Cancelar', 'fechar', '', () => j.fechar()), criar);
}
