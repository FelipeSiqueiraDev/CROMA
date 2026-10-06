import { h, Win } from './dom';

const ROWS: [string, string][] = [
  ['Comandar', 'clique num personagem (ou no retrato, ou tecla 1–9)'],
  ['Andar', 'com um personagem ativo, clique no piso; ele desvia dos mobis'],
  ['Girar', 'Q e E giram o personagem parado (ou os botões ↺ ↻ no painel dele)'],
  ['Sentar', 'clique numa cadeira, banqueta ou sofá'],
  ['Cenas', 'Passagem leva para outra cena · lista à esquerda troca a cena vista'],
  ['Planta', 'arraste as cenas para montar o mapa · clique para ir'],
  ['Câmera', 'arraste com o mouse · roda = zoom · ◎ enquadra'],
  ['Mobis', 'clique mostra no painel · clique duplo usa (luz, gaveta, porta)'],
  ['Colocar', 'R ou botão direito gira · Shift coloca vários · Esc cancela'],
  ['Clima', 'nuvem no topo: normal, piscando, apagão e névoa'],
];

export class HelpWin {
  readonly win: Win;

  constructor() {
    this.win = new Win('Como usar', { width: 460, y: 70 });
    this.win.body.append(
      h('dl', { class: 'help' }, ...ROWS.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
      h('p', { class: 'muted' }, 'Personagem → Enviar sprite sheet: imagem 4×4 (linhas ↙ ↘ ↖ ↗, colunas = quadros). Fundo branco sai sozinho.'),
    );
  }

  toggle() {
    this.win.toggle();
  }
}
