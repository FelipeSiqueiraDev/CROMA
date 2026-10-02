import { RoomMap, type AvatarLook, type Door, type FloorItem, type FloorStyle, type LightMode, type ParticleKind } from '@croma/shared';
import type { Database, RoomData, TokenData } from './db';
import { buildRoom, plan, type FloorSeed, type WallSeed } from './seed';

/**
 * Sede da Ordem (Ordo Realitas), a partir da planta "Mapa Base Ordo Realitas":
 * o bar no térreo (a fachada) e a sede no subsolo, cômodo por cômodo. A porta
 * da sede fica atrás da única geladeira do bar, no canto: com a senha 0413 ela
 * desliza e mostra a escada que desce para o salão.
 *
 * Os móveis são só os móveis (sem pistas nem itens dentro); a arte de cada um
 * entra depois (docs/SEDE-DA-ORDEM.md). Cada casa tem ~0,7 m: os cômodos têm
 * folga de 2 a 3 casas entre os grupos de móveis.
 */

export const SEDE = 'Sede · ';
export const SEDE_CODE = '0413';
/** Versão da montagem da Sede: subiu, a Sede é refeita no lugar (mesmos cômodos, peças e registro). */
export const SEDE_REV = 20;

/** Planta retangular com a porta na parede de cima (y = 0), na coluna doorX. */
export function planTop(w: number, h: number, doorX: number): { heightmap: string; door: Door } {
  const rows = [Array.from({ length: w }, (_, x) => (x === doorX ? '0' : 'x')).join('')];
  for (let y = 0; y < h; y++) rows.push('0'.repeat(w));
  return { heightmap: rows.join('\n'), door: { x: doorX, y: 0, dir: 4 } };
}

/** Salão: 34×14 com o canto de cima à esquerda vazado (é o banheiro) e a porta da escada na parede esquerda. */
function salaoPlan(): { heightmap: string; door: Door } {
  const W = 34;
  const rows: string[] = [];
  for (let y = 0; y < 14; y++) {
    let row = y === 9 ? '0' : 'x';
    for (let x = 1; x <= W; x++) row += y <= 4 && x <= 7 ? 'x' : '0';
    rows.push(row);
  }
  return { heightmap: rows.join('\n'), door: { x: 0, y: 9, dir: 2 } };
}

interface RoomSpec {
  key: string;
  name: string;
  /** nomes antigos do mesmo cômodo (para refazer no lugar) */
  was?: string[];
  description: string;
  layout: { heightmap: string; door: Door };
  floorName: 'Térreo' | 'Subsolo';
  style: FloorStyle;
  darkness: number;
  fog?: number;
  light?: LightMode;
  floor: FloorSeed[];
  wall?: WallSeed[];
  /** passagens: [x, y, chave do cômodo de destino] */
  links: [number, number, string][];
  /** cor do ambiente (tinge o escuro) e partículas */
  ambient?: string;
  particles?: ParticleKind[];
  /** lâmpadas do teto: quentes (padrão) ou fluorescentes, frias */
  lamp?: 'fluorescent';
  /** posição na planta do andar (células) e giro em quartos de volta */
  plan: { x: number; y: number; r?: number };
}

/** Mesa de bar com cadeiras em volta (só nos lados pedidos: o = oeste, l = leste, n = norte, s = sul). */
const table = (x: number, y: number, sides: string): FloorSeed[] => [
  ['table_bar', x, y, 0],
  ...(sides.includes('o') ? [['chair_bar', x - 1, y, 2] as FloorSeed] : []),
  ...(sides.includes('l') ? [['chair_bar', x + 1, y, 6] as FloorSeed] : []),
  ...(sides.includes('n') ? [['chair_bar', x, y - 1, 4] as FloorSeed] : []),
  ...(sides.includes('s') ? [['chair_bar', x, y + 1, 0] as FloorSeed] : []),
];

/**
 * Cela da prisão (4 casas de largura): cama encostada no fundo, vaso no canto
 * e a frente de grade com a porta (fechada). bx = primeira coluna; bedY,
 * sideY e barsY = linhas; rot = para onde a grade olha.
 */
const cell = (bx: number, bedY: number, sideY: number, barsY: number, rot: number): FloorSeed[] => [
  ['bed', bx, bedY, 2],
  ['toilet', bx + 3, sideY, 6],
  ['cell_bars', bx, barsY, rot],
  ['cell_door', bx + 1, barsY, rot],
  ['cell_bars', bx + 2, barsY, rot],
  ['cell_bars', bx + 3, barsY, rot],
];

/** Divisória baixa em pé (corre em y), de y0 a y1: separa as celas sem esconder as camas. */
const wallY = (x: number, y0: number, y1: number): FloorSeed[] => Array.from({ length: y1 - y0 + 1 }, (_, i) => ['iwall_low', x, y0 + i, 2] as FloorSeed);
/** Grade deitada (corre em x), de x0 a x1: entre as celas de costas. */
const barsX = (y: number, x0: number, x1: number): FloorSeed[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => ['cell_bars', x0 + i, y, 4] as FloorSeed);
/** Várias lâmpadas penduradas. */
const lamps = (...at: [number, number][]): FloorSeed[] => at.map(([x, y]) => ['ceiling_lamp', x, y, 0] as FloorSeed);

const ROOMS: RoomSpec[] = [
  // ------------------------------------------------------------ térreo
  {
    key: 'bar',
    ambient: '#c0782a',
    particles: ['dust', 'smoke'],
    name: SEDE + 'Bar',
    description: 'O Suvaco Seco: bar velho de fachada, marrom e acolhedor, com o fliperama piscando. A geladeira amarela do canto, a do teclado numérico, zumbe mais alto que as outras.',
    layout: plan(20, 15, 11),
    floorName: 'Térreo',
    style: 'madeira',
    darkness: 0.52,
    fog: 0.12,
    plan: { x: 0, y: 0 },
    // Arrumado como a planta da Sede desenhada pelo Códex (cenarios/base-ordo-realitas.png) e a descrição
    // do Suvaco Seco (wiki de Ordem Paranormal): o balcão comprido no fundo, as geladeiras no canto de
    // cima, o fliperama na parede da esquerda, as mesas amarelas, a sinuca e a pilha de cadeiras no canto.
    floor: [
      // a escada escondida vem antes: a geladeira amarela fica em cima dela (e desliza para a esquerda)
      ['stairs_down', 20, 0, 4],
      ['beer_fridge', 20, 0, 4],
      // o fundo: prateleiras de garrafas e os dois frigobares de trás do balcão; no canto, mais duas geladeiras
      ['bar_shelf', 1, 0, 4],
      ['bar_shelf', 3, 0, 4],
      ['minibar', 5, 0, 4],
      ['minibar', 6, 0, 4],
      ['bar_shelf', 7, 0, 4],
      ['bar_shelf', 9, 0, 4],
      ['beer_crate', 11, 0, 4],
      ['beer_crate', 11, 0, 4],
      ['keg', 12, 0, 0],
      ['beer_crate', 13, 0, 4],
      ['fridge_drinks', 16, 0, 4],
      ['fridge_drinks', 17, 0, 4],
      // o balcão de madeira: entre ele e as prateleiras fica o corredor do atendente (y 1 e 2), com a entrada no fim (x 13)
      ['bar_counter', 1, 3, 4],
      ['bar_counter', 3, 3, 4],
      ['bar_counter', 5, 3, 4],
      ['bar_counter', 7, 3, 4],
      ['bar_counter', 9, 3, 4],
      ['bar_counter', 11, 3, 4],
      ['beer_glass', 4, 3, 0],
      ['beer_glass', 8, 3, 0],
      ['beer_crate', 11, 3, 0],
      ['stool_bar', 2, 4, 0],
      ['stool_bar', 4, 4, 0],
      ['stool_bar', 6, 4, 0],
      ['stool_bar', 8, 4, 0],
      ['stool_bar', 10, 4, 0],
      ['stool_bar', 12, 4, 0],
      // parede da esquerda: a poltrona, a planta, o fliperama de Tetris e, no canto, a pilha de cadeiras
      ['armchair_red', 1, 5, 2],
      ['plant', 1, 6, 0],
      ['arcade', 1, 8, 2],
      ['plant', 1, 13, 0],
      ['chair_stack', 1, 14, 2],
      // as mesas amarelas, com copos e cinzeiros que ninguém tirou
      ...table(5, 6, 'olns'),
      ['beer_glass', 5, 6, 0],
      ...table(10, 7, 'olns'),
      ['ashtray', 10, 7, 0],
      ...table(5, 10, 'olns'),
      ['beer_glass', 5, 10, 0],
      ...table(8, 13, 'ol'),
      ['ashtray', 8, 13, 0],
      // a sinuca, perto do meio, e os tapetes vermelhos
      ['pool_table', 14, 7, 4],
      ['rug_ornate', 10, 10, 0],
      ['rug_worn', 15, 4, 2],
      // parede da direita: o aparador com as garrafas e, no canto de baixo, o armarinho
      ['sideboard', 20, 8, 6],
      ['bar_cabinet', 20, 13, 6],
      ['plant', 20, 14, 0],
      // perto da entrada, o sofá vermelho
      ['sofa_booth', 13, 14, 0],
      ...lamps([4, 2], [9, 2], [7, 6], [12, 9], [7, 11], [16, 11], [17, 2]),
      // sujeira
      ['dirt', 13, 1, 0],
      ['dirt', 2, 2, 2],
      ['dirt', 18, 2, 0],
      ['dirt', 12, 5, 4],
      ['dirt', 7, 9, 6],
      ['dirt', 3, 13, 0],
      ['dirt', 18, 11, 2],
      ['dirt', 10, 14, 4],
      ['dirt', 13, 12, 0],
    ],
    wall: [
      ['neon_bar', 'r', 0, 14.5, 3.4],
      ['clock', 'r', 0, 5.5, 4.1],
      ['sconce', 'l', 1, 9.4, 3.2],
      ['sconce', 'l', 1, 12.6, 3.2],
      // a TV do futebol, no alto, e o ventilador
      ['tv_wall', 'r', 0, 12.6, 3.3],
      ['fan_wall', 'l', 1, 7.0, 3.9],
    ],
    links: [[20, 0, 'salao']],
  },
  // ------------------------------------------------------------ subsolo
  {
    key: 'salao',
    ambient: '#6a7a8c',
    particles: ['dust'],
    lamp: 'fluorescent',
    name: SEDE + 'Salão Principal',
    description: 'O coração da Sede: mesas de trabalho, a mesa redonda da equipe e a escada que sobe para o bar.',
    layout: salaoPlan(),
    floorName: 'Subsolo',
    style: 'concreto',
    darkness: 0.5,
    fog: 0.1,
    plan: { x: 29, y: 12 },
    floor: [
      ['stairs_up', 1, 9, 2],
      ['portal', 16, 0, 4],
      ['portal', 8, 2, 2],
      ['portal', 19, 13, 0],
      ['portal', 28, 13, 0],
      // mesas de trabalho, cadeiras dos dois lados
      ['table_work', 11, 3, 2],
      ['chair_office', 10, 3, 2],
      ['chair_office', 10, 4, 2],
      ['chair_office', 10, 5, 2],
      ['chair_office', 13, 3, 6],
      ['chair_office', 13, 4, 6],
      ['chair_office', 13, 5, 6],
      ['table_work', 17, 3, 2],
      ['chair_office', 16, 4, 2],
      ['chair_office', 16, 5, 2],
      ['chair_office', 19, 3, 6],
      ['chair_office', 19, 4, 6],
      ['chair_office', 19, 5, 6],
      ['table_work', 23, 3, 2],
      ['chair_office', 22, 3, 2],
      ['chair_office', 22, 4, 2],
      ['chair_office', 22, 5, 2],
      ['chair_office', 25, 3, 6],
      ['chair_office', 25, 4, 6],
      ['chair_office', 25, 5, 6],
      // mesa redonda da equipe
      ['table_round', 29, 2, 0],
      ['chair_red', 29, 1, 4],
      ['chair_red', 30, 1, 4],
      ['chair_red', 28, 2, 2],
      ['chair_red', 28, 3, 2],
      ['chair_red', 31, 2, 6],
      ['chair_red', 31, 3, 6],
      ['chair_red', 29, 4, 0],
      ['chair_red', 30, 4, 0],
      // mesa oval do canto, com poltrona
      ['table_meeting', 31, 8, 2],
      ['chair_red', 30, 8, 2],
      ['chair_red', 30, 10, 2],
      ['armchair', 33, 9, 6],
      ['table_small', 34, 11, 0],
      ['cabinet_file', 33, 0, 4],
      ['cabinet_file', 34, 0, 4],
      // xadrez perto da escada
      ['table_chess', 4, 11, 0],
      ['armchair', 3, 11, 2],
      ['armchair', 5, 11, 6],
      ['bench', 10, 13, 0],
      ['bench', 13, 13, 0],
      ['floor_lamp', 8, 11, 0],
      ['plant', 8, 0, 0],
      ['plant', 34, 13, 0],
      ['compass_floor', 16, 7, 0],
      ...lamps([6, 8], [14, 8], [21, 8], [27, 8], [31, 11]),
    ],
    wall: [
      ['board_investigation', 'r', 0, 12.0, 2.6],
      ['screen', 'r', 0, 21.5, 2.7],
      ['clock', 'r', 0, 18.2, 3.9],
      ['pipes', 'r', 0, 26.0, 4.2],
      ['sconce', 'l', 1, 11.6, 3.2],
      ['emergency_light', 'l', 8, 3.6, 3.6],
    ],
    links: [
      [1, 9, 'bar'],
      [16, 0, 'corredor'],
      [8, 2, 'banheiro'],
      [19, 13, 'enfermaria'],
      [28, 13, 'arsenal'],
    ],
  },
  {
    key: 'corredor',
    ambient: '#5a6a82',
    particles: ['dust'],
    lamp: 'fluorescent',
    name: SEDE + 'Corredor',
    description: 'Corredor comprido de concreto. As portas levam à prisão, às salas e ao salão.',
    layout: plan(36, 3, 1),
    floorName: 'Subsolo',
    style: 'concreto',
    darkness: 0.6,
    fog: 0.15,
    plan: { x: 29, y: 8 },
    floor: [
      ['portal', 1, 1, 2],
      ['portal', 7, 0, 4],
      ['portal', 21, 0, 4],
      ['portal', 27, 0, 4],
      ['portal', 16, 2, 0],
      ['portal', 36, 1, 6],
      ['vent', 5, 1, 0],
      ['vent', 13, 2, 0],
      ['vent', 31, 1, 0],
      ['bench', 10, 0, 4],
      ['plant', 24, 0, 0],
      ...lamps([4, 1], [11, 1], [18, 1], [25, 1], [32, 1]),
    ],
    wall: [
      ['pipes', 'r', 0, 3.5, 4.2],
      ['pipes', 'r', 0, 14.5, 4.2],
      ['pipes', 'r', 0, 33.5, 4.2],
      ['emergency_light', 'r', 0, 9.5, 3.7],
      ['emergency_light', 'r', 0, 30.5, 3.7],
      ['extinguisher', 'r', 0, 18.5, 1.8],
    ],
    links: [
      [1, 1, 'prisao'],
      [7, 0, 'laboratorio'],
      [21, 0, 'tecnologia'],
      [27, 0, 'gabinete'],
      [16, 2, 'salao'],
      [36, 1, 'rituais'],
    ],
  },
  {
    key: 'prisao',
    ambient: '#4a6a90',
    particles: ['dust'],
    lamp: 'fluorescent',
    name: SEDE + 'Prisão',
    was: [SEDE + 'Alojamentos'],
    description: 'Celas com cama e vaso, grade na frente. As portas abrem com clique duplo; fechadas, ninguém sai.',
    layout: plan(24, 20, 10),
    floorName: 'Subsolo',
    style: 'concreto',
    darkness: 0.6,
    fog: 0.12,
    plan: { x: 4, y: 0, r: 2 },
    floor: [
      ['portal', 1, 10, 2],
      ['portal', 24, 13, 6],
      // celas do fundo (grade virada para o corredor de cima)
      ...wallY(5, 0, 3),
      ...wallY(10, 0, 3),
      ...wallY(15, 0, 3),
      ...wallY(20, 0, 3),
      ...cell(1, 0, 1, 3, 4),
      ...cell(6, 0, 1, 3, 4),
      ...cell(11, 0, 1, 3, 4),
      ...cell(16, 0, 1, 3, 4),
      ...cell(21, 0, 1, 3, 4),
      // bloco do meio: celas costas com costas, separadas por grade
      ...barsX(10, 5, 20),
      ...wallY(5, 7, 9),
      ...wallY(10, 7, 9),
      ...wallY(15, 7, 9),
      ...wallY(20, 7, 9),
      ...wallY(5, 11, 13),
      ...wallY(10, 11, 13),
      ...wallY(15, 11, 13),
      ...wallY(20, 11, 13),
      ...cell(6, 9, 8, 7, 4),
      ...cell(11, 9, 8, 7, 4),
      ...cell(16, 9, 8, 7, 4),
      ...cell(6, 11, 12, 13, 0),
      ...cell(11, 11, 12, 13, 0),
      ...cell(16, 11, 12, 13, 0),
      // celas da frente (grade virada para o corredor de baixo)
      ...wallY(5, 17, 19),
      ...wallY(10, 17, 19),
      ...wallY(15, 17, 19),
      ...wallY(20, 17, 19),
      ...cell(1, 19, 18, 17, 4),
      ...cell(6, 19, 18, 17, 4),
      ...cell(11, 19, 18, 17, 4),
      ...cell(16, 19, 18, 17, 4),
      ...cell(21, 19, 18, 17, 4),
      // posto do carcereiro
      ['desk_metal', 23, 5, 2],
      ['chair_office', 22, 6, 2],
      ['locker', 24, 4, 6],
      ...lamps([3, 5], [12, 5], [21, 5], [3, 15], [12, 15], [21, 15], [2, 10], [23, 10]),
    ],
    wall: [
      ['emergency_light', 'r', 0, 7.5, 3.8],
      ['emergency_light', 'r', 0, 17.5, 3.8],
      ['clock', 'l', 1, 6.5, 3.9],
    ],
    links: [
      [1, 10, 'corredor'],
      [24, 13, 'camara'],
    ],
  },
  {
    key: 'camara',
    ambient: '#c89a3a',
    particles: ['dust', 'smoke', 'embers'],
    name: SEDE + 'Câmara do Selo',
    description: 'Um cômodo escuro e abafado. No chão, um selo dourado que ninguém lembra de ter pintado.',
    layout: plan(7, 7, 3),
    floorName: 'Subsolo',
    style: 'pedra',
    darkness: 0.82,
    fog: 0.5,
    light: 'flicker',
    plan: { x: -4, y: 3, r: 2 },
    floor: [
      ['portal', 1, 3, 2],
      ['sigil_gold', 3, 2, 0],
      ['skull', 4, 3, 4],
      ['candles', 3, 1, 0],
      ['candles', 5, 1, 0],
      ['candles', 6, 3, 0],
      ['candles', 3, 5, 0],
      ['candles', 5, 5, 0],
      ['candelabra', 7, 0, 0],
      ['candelabra', 7, 6, 0],
      ['rubble', 1, 5, 0],
    ],
    links: [[1, 3, 'prisao']],
  },
  {
    key: 'laboratorio',
    ambient: '#3ab0b8',
    particles: ['dust'],
    lamp: 'fluorescent',
    name: SEDE + 'Laboratório',
    description: 'Bancadas nas paredes e uma ilha no meio: microscópio, frascos e o computador das análises.',
    layout: planTop(9, 10, 2),
    floorName: 'Subsolo',
    style: 'azulejo',
    darkness: 0.42,
    plan: { x: 30, y: -3, r: 2 },
    floor: [
      ['portal', 2, 1, 4],
      // a estante no canto; as bancadas da parede do fundo, com o microscópio e o computador
      ['bookshelf', 0, 1, 4],
      ['lab_bench', 3, 1, 4],
      ['microscope', 3, 1, 4],
      ['flasks', 4, 1, 4],
      ['stool_lab', 3, 2, 0],
      ['lab_bench', 5, 1, 4],
      ['monitor', 5, 1, 4],
      ['chair_office', 5, 2, 0],
      ['cabinet_file', 7, 1, 4],
      ['cabinet_file', 8, 1, 4],
      // a bancada da parede esquerda, com o radar
      ['lab_bench', 0, 3, 2],
      ['monitor_green', 0, 3, 2],
      ['chair_office', 1, 3, 6],
      ['lab_bench', 0, 5, 2],
      ['flasks', 0, 6, 2],
      // a ilha no meio, de frente para a sala, com as banquetas
      ['lab_bench', 4, 5, 4],
      ['microscope', 4, 5, 4],
      ['lab_bench', 6, 5, 4],
      ['flasks', 7, 5, 4],
      ['stool_lab', 4, 6, 0],
      ['stool_lab', 6, 6, 0],
      ['trolley', 7, 8, 0],
      ...lamps([2, 3], [5, 4], [5, 8]),
    ],
    wall: [
      ['board_investigation', 'r', 1, 4.6, 2.4],
      ['notes_wall', 'l', 0, 7.5, 2.6],
    ],
    links: [[2, 1, 'corredor']],
  },
  {
    key: 'tecnologia',
    ambient: '#8a5ad0',
    particles: ['dust'],
    lamp: 'fluorescent',
    name: SEDE + 'Sala de Tecnologia',
    was: [SEDE + 'Sala de Reunião'],
    description: 'As estações de trabalho na parede do fundo, embaixo do painel das câmeras; os servidores, a impressora e as fitas na parede da esquerda; o quadro branco no meio do carpete roxo.',
    layout: planTop(13, 10, 2),
    floorName: 'Subsolo',
    style: 'carpete',
    darkness: 0.5,
    plan: { x: 40, y: -3, r: 2 },
    floor: [
      ['portal', 2, 1, 4],
      // as estações de trabalho na parede do fundo, cada uma com a sua cadeira
      ['console', 4, 1, 4],
      ['chair_office', 5, 2, 0],
      ['console', 7, 1, 4],
      ['chair_office', 8, 2, 0],
      ['console', 10, 1, 4],
      ['chair_office', 11, 2, 0],
      // na parede da esquerda: os servidores com o nobreak, a impressora, as fitas e o bebedouro
      ['server_rack', 0, 2, 2],
      ['server_rack', 0, 3, 2],
      ['ups', 0, 4, 2],
      ['cables_floor', 1, 3, 4],
      ['printer_dot', 0, 6, 2],
      ['media_shelf', 0, 8, 2],
      ['water_cooler', 0, 10, 2],
      // o quadro branco no meio, virado para a sala, e as caixas de peças no canto
      ['whiteboard', 5, 6, 4],
      ['parts_boxes', 11, 9, 4],
      ['parts_boxes', 12, 9, 6],
      ...lamps([3, 4], [9, 4], [8, 8]),
    ],
    wall: [
      ['monitor_wall', 'r', 1, 8.0, 2.9],
      ['shelf_wall', 'r', 1, 4.8, 2.7],
      ['ac_wall', 'r', 1, 11.6, 4.3],
      ['shelf_wall', 'l', 0, 6.0, 2.9],
    ],
    links: [[2, 1, 'corredor']],
  },
  {
    key: 'gabinete',
    ambient: '#c0622a',
    particles: ['dust', 'smoke'],
    name: SEDE + 'Gabinete',
    description: 'A mesa de quem manda na Sede, quatro poltronas de couro para quem vem prestar contas e um tapete antigo.',
    layout: planTop(9, 10, 6),
    floorName: 'Subsolo',
    style: 'taco',
    darkness: 0.5,
    plan: { x: 54, y: -3, r: 2 },
    floor: [
      ['portal', 6, 1, 4],
      // a mesa de quem manda: de costas para a parede da esquerda, de frente para a sala;
      // quem vem prestar contas senta do outro lado, no tapete
      ['rug_ornate', 2, 3, 2],
      ['armchair_leather', 0, 5, 2],
      ['desk_wood', 1, 4, 6],
      ['desk_lamp', 1, 4, 6],
      ['armchair_leather', 2, 4, 6],
      ['armchair_leather', 2, 5, 6],
      ['papers', 4, 6, 0],
      // o canto de conversa, com o candelabro
      ['armchair_leather', 1, 8, 2],
      ['table_small', 2, 8, 4],
      ['books_stack', 2, 8, 4],
      ['armchair_leather', 3, 8, 6],
      ['candelabra', 0, 7, 0],
      ['plant', 0, 10, 0],
      // o que se guarda, na parede do fundo, ao lado da porta
      ['cabinet_file', 7, 1, 4],
      ['locker', 8, 1, 4],
      ...lamps([3, 5], [4, 8]),
    ],
    wall: [
      ['painting', 'l', 0, 5.0, 2.6],
      ['painting', 'r', 1, 2.5, 2.7],
      ['clock', 'r', 1, 4.5, 3.9],
    ],
    links: [[6, 1, 'corredor']],
  },
  {
    key: 'rituais',
    ambient: '#c02a24',
    particles: ['dust', 'smoke', 'embers'],
    name: SEDE + 'Sala de Rituais',
    description: 'Um círculo vermelho pintado no chão, a mesa das ferramentas e o balcão dos frascos. O ar pesa aqui dentro.',
    layout: plan(9, 11, 8),
    floorName: 'Subsolo',
    style: 'musgo',
    darkness: 0.74,
    fog: 0.4,
    plan: { x: 66, y: 1 },
    floor: [
      ['portal', 1, 8, 2],
      // o círculo no meio da sala: o crânio no centro, velas nos quatro lados, sangue
      ['sigil_floor', 4, 4, 0],
      ['skull', 5, 5, 4],
      ['candles', 5, 3, 0],
      ['candles', 3, 5, 0],
      ['candles', 7, 5, 0],
      ['candles', 5, 7, 0],
      ['blood_pool', 6, 6, 0],
      ['blood_drops', 4, 4, 0],
      ['blood_drops', 7, 7, 0],
      // na parede do fundo: a estante, o balcão dos frascos e a mesa redonda do canto
      ['bookshelf', 1, 0, 4],
      ['counter_wood', 3, 0, 4],
      ['flasks', 3, 0, 4],
      ['candles', 4, 0, 4],
      ['counter_wood', 5, 0, 4],
      ['books_stack', 5, 0, 4],
      ['flasks', 6, 0, 4],
      ['table_round', 8, 0, 0],
      ['papers', 8, 0, 0],
      ['chair_wood', 8, 2, 0],
      // na parede da esquerda: a mesa das ferramentas (a faca, o giz, a tigela) e mais balcão
      ['table_tools', 1, 3, 2],
      ['stool', 2, 3, 6],
      ['counter_wood', 1, 5, 2],
      ['skull', 1, 5, 2],
    ],
    wall: [
      ['poster_sigil', 'r', 0, 4.5, 2.6],
      ['poster_sigil', 'l', 1, 7.0, 2.6],
      ['sconce', 'l', 1, 2.5, 3.2],
      ['sconce', 'l', 1, 5.5, 3.2],
      ['sconce', 'r', 0, 7.5, 3.2],
    ],
    links: [[1, 8, 'corredor']],
  },
  {
    key: 'banheiro',
    ambient: '#6aa89a',
    particles: [],
    lamp: 'fluorescent',
    name: SEDE + 'Banheiro',
    description: 'Duas pias com espelhos manchados na parede da porta e, no fundo, duas cabines com vaso.',
    layout: plan(6, 4, 2),
    floorName: 'Subsolo',
    style: 'xadrez',
    darkness: 0.45,
    plan: { x: 30, y: 13, r: 2 },
    floor: [
      ['portal', 1, 2, 2],
      ['sink', 1, 0, 2],
      ['sink', 1, 1, 2],
      ['stall_panel', 3, 0, 2],
      ['stall_panel', 3, 1, 2],
      ['toilet', 4, 0, 4],
      ['stall_panel', 5, 0, 2],
      ['stall_panel', 5, 1, 2],
      ['toilet', 6, 0, 4],
      ['trash_bin', 1, 3, 2],
      ['dirt', 5, 3, 0],
      ...lamps([4, 2]),
    ],
    wall: [
      ['mirror', 'l', 1, 0.5, 2.9],
      ['mirror', 'l', 1, 1.5, 2.9],
      ['towel_dispenser', 'l', 1, 3.4, 2.5],
    ],
    links: [[1, 2, 'salao']],
  },
  {
    key: 'enfermaria',
    ambient: '#a0d0dc',
    particles: ['dust'],
    lamp: 'fluorescent',
    name: SEDE + 'Enfermaria',
    description: 'Seis leitos separados por divisórias, o balcão dos remédios e o posto da enfermagem.',
    layout: planTop(20, 13, 17),
    floorName: 'Subsolo',
    style: 'ladrilho',
    darkness: 0.38,
    plan: { x: 31, y: 26 },
    floor: [
      ['portal', 17, 1, 4],
      // leitos de cima (cabeceira na parede)
      ['hospital_bed', 1, 1, 4],
      ['hospital_bed', 5, 1, 4],
      ['hospital_bed', 9, 1, 4],
      ['iv_stand', 2, 1, 0],
      ['iv_stand', 6, 1, 0],
      ['iv_stand', 10, 1, 0],
      ['divider', 4, 1, 2],
      ['divider', 4, 2, 2],
      ['divider', 8, 1, 2],
      ['divider', 8, 2, 2],
      // leitos de baixo
      ['hospital_bed', 1, 11, 0],
      ['hospital_bed', 5, 11, 0],
      ['hospital_bed', 9, 11, 0],
      ['iv_stand', 2, 13, 0],
      ['iv_stand', 6, 13, 0],
      ['iv_stand', 10, 13, 0],
      ['divider', 4, 12, 2],
      ['divider', 4, 13, 2],
      ['divider', 8, 12, 2],
      ['divider', 8, 13, 2],
      // remédios na parede de cima, ao lado da porta
      ['medical_cabinet', 13, 1, 4],
      ['medical_cabinet', 15, 1, 4],
      ['cabinet_file', 18, 1, 4],
      ['sink', 19, 1, 4],
      // a bancada encostada na parede da esquerda, entre os leitos, com a pia na ponta
      ['sink', 0, 4, 2],
      ['lab_bench', 0, 5, 2],
      ['vitals_monitor', 0, 5, 2],
      ['lab_bench', 0, 7, 2],
      ['med_tray', 0, 7, 2],
      ['lab_bench', 0, 9, 2],
      // o posto de enfermagem de frente para a porta
      ['desk_metal', 16, 4, 4],
      ['computer_old', 16, 4, 4],
      ['chair_office', 16, 5, 0],
      ['trolley', 12, 7, 0],
      ...lamps([3, 7], [7, 7], [11, 3], [14, 5], [13, 11]),
    ],
    wall: [
      ['clock', 'r', 1, 19.5, 3.9],
      ['emergency_light', 'l', 0, 7.0, 3.6],
    ],
    links: [[17, 1, 'salao']],
  },
  {
    key: 'arsenal',
    ambient: '#6a8a4a',
    particles: ['dust'],
    lamp: 'fluorescent',
    name: SEDE + 'Arsenal',
    description: 'Os armários de armas dos dois lados da porta, os de munição e os baús nas paredes, e a bancada em U onde tudo é limpo e conferido.',
    layout: planTop(14, 10, 6),
    floorName: 'Subsolo',
    style: 'metal',
    darkness: 0.6,
    fog: 0.08,
    plan: { x: 51, y: 26 },
    floor: [
      ['portal', 6, 1, 4],
      // os armários de armas na parede do fundo, dos dois lados da porta, e os de munição no canto
      ['weapon_rack', 0, 1, 4],
      ['weapon_rack', 2, 1, 4],
      ['weapon_rack', 8, 1, 4],
      ['weapon_rack', 10, 1, 4],
      ['locker_ammo', 12, 1, 4],
      ['locker_ammo', 13, 1, 4],
      // mais armários de munição e os baús na parede da esquerda
      ['locker_ammo', 0, 4, 2],
      ['locker_ammo', 0, 5, 2],
      ['locker_ammo', 0, 6, 2],
      ['chest_army', 0, 8, 2],
      ['chest_army', 0, 10, 2, undefined, 1],
      // a bancada em U no meio, as bancadas viradas para dentro, com as banquetas
      ['gun_table', 4, 4, 4],
      ['gun_table', 7, 4, 4],
      ['gun_table', 4, 5, 2],
      ['gun_table', 9, 5, 6],
      ['stool_metal', 6, 6, 0],
      ['stool_metal', 7, 6, 0],
      ['oil_stain', 6, 8, 0],
      // as caixas de munição empilhadas no canto da frente
      ['ammo_box', 12, 9, 4],
      ['ammo_box', 13, 9, 4],
      ['ammo_box', 13, 8, 2],
      ['ammo_box', 13, 9, 4],
      ...lamps([5, 3], [10, 3], [7, 8]),
    ],
    wall: [
      ['blade_rack', 'r', 1, 5.0, 2.3],
      ['emergency_light', 'r', 1, 5.0, 4.4],
      ['tool_board', 'l', 0, 2.7, 1.8],
      ['target_paper', 'l', 0, 9.0, 1.9],
    ],
    links: [[6, 1, 'salao']],
  },
];

/** Os quatro agentes começam no bar, perto da porta da rua. */
function partyTokens(db: Database, charIdOf: (name: string) => number | null): TokenData[] {
  const base = { shoes: '#3d3a40', pants: '#1c1b1f' };
  const tk = (name: string, x: number, y: number, dir: number, color: string, capacity: number, look: Partial<AvatarLook>): TokenData => ({
    id: db.nextItemId++,
    name,
    x,
    y,
    dir,
    color,
    capacity,
    look: { skin: '#e8b98f', hair: '#1a1412', hairStyle: 0, top: '#2b2a30', outfit: 0, extra: 0, ...base, charId: charIdOf(name), ...look } as AvatarLook,
  });
  return [
    tk('D.Tepes', 2, 10, 2, '#e3a94c', 10, { hair: '#3b2618', hairStyle: 1, extra: 2, top: '#5c4632', outfit: 1 }),
    tk('Catarina Albuquerque', 3, 11, 2, '#d83a2e', 10, { skin: '#f3d2b3', hair: '#a8321e', hairStyle: 3, top: '#2b2a30', outfit: 1 }),
    tk('Alosi Walker', 2, 12, 2, '#3f6fd8', 12, { hair: '#1a1412', extra: 1, top: '#d8d0c0', outfit: 2 }),
    tk('Cora Falcão', 3, 9, 2, '#f2efe6', 10, { hair: '#c9c4bc', hairStyle: 2, top: '#1c1b1f' }),
  ];
}

/** Liga as passagens de cada cômodo e fecha a geladeira do bar em cima da escada. */
function wire(built: Map<string, RoomData>) {
  for (const spec of ROOMS) {
    const room = built.get(spec.key)!;
    for (const [x, y, to] of spec.links) {
      const target = built.get(to);
      const it = room.items.find((i) => i.x === x && i.y === y && (i.defId === 'portal' || i.defId.startsWith('stairs')));
      if (!it || !target) {
        console.warn(`[seed] ${room.name}: sem passagem em ${x},${y}`);
        continue;
      }
      it.link = target.id;
    }
  }
  const bar = built.get('bar')!;
  const fridge = bar.items.find((i) => i.defId === 'beer_fridge') as FloorItem | undefined;
  if (fridge) fridge.lock = { code: SEDE_CODE, open: false, slide: { dx: -1, dy: 0 } };
  else console.warn('[seed] Sede: geladeira secreta não coube');
}

/** Aplica a planta, o piso e o clima do cômodo. */
function style(room: RoomData, spec: RoomSpec) {
  room.floor = spec.floorName;
  room.floorStyle = spec.style;
  room.fog = spec.fog ?? 0;
  room.lightMode = spec.light ?? 'normal';
  room.darkness = spec.darkness;
  if (spec.ambient) room.ambient = spec.ambient;
  else delete room.ambient;
  room.particles = spec.particles ?? [];
}

/** Móveis do cômodo, com as lâmpadas do tipo dele. */
const furnish = (spec: RoomSpec): FloorSeed[] => (spec.lamp ? spec.floor.map((f) => (f[0] === 'ceiling_lamp' ? ([spec.lamp, ...f.slice(1)] as FloorSeed) : f)) : spec.floor);

/** Tira a Sede inteira do banco (cômodos, campanha e peças), para montar de novo. */
export function removeSede(db: Database) {
  const ids = new Set(db.rooms.filter((r) => r.name.startsWith(SEDE)).map((r) => r.id));
  if (!ids.size) return;
  db.rooms = db.rooms.filter((r) => !ids.has(r.id));
  if (db.campaigns) for (const k of Object.keys(db.campaigns)) if (ids.has(Number(k))) delete db.campaigns[k];
  if (db.home !== undefined && ids.has(db.home)) delete db.home;
  if (db.liveScene !== undefined && ids.has(db.liveScene)) delete db.liveScene;
}

/** Monta a Sede da Ordem inteira (bar + subsolo) e a campanha dela. */
export function seedSede(db: Database) {
  if (db.rooms.some((r) => r.name.startsWith(SEDE))) return;
  const built = new Map<string, RoomData>();
  for (const spec of ROOMS) {
    const room = buildRoom(db, spec.name, spec.description, spec.layout, furnish(spec), spec.wall ?? [], spec.darkness);
    style(room, spec);
    built.set(spec.key, room);
  }
  wire(built);
  const bar = built.get('bar')!;
  const charIdOf = (name: string) => db.characters.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null;
  bar.tokens = partyTokens(db, charIdOf);
  db.rooms.push(...built.values());
  db.campaigns ??= {};
  db.campaigns[String(bar.id)] = {
    title: 'Sede da Ordem',
    subtitle: 'Ordo Realitas',
    objectives: [],
    layout: Object.fromEntries(ROOMS.map((s) => [built.get(s.key)!.id, s.plan])),
    log: [],
  };
  db.home = bar.id;
  db.sedeRev = SEDE_REV;
}

/**
 * Refaz a Sede no lugar quando a montagem muda (SEDE_REV): mesmos cômodos
 * (ids), mesmas peças (numa casa livre se a antiga sumiu), mesmo registro e
 * objetivos. Móveis, pistas e itens dos cômodos voltam aos da montagem nova.
 */
export function rebuildSede(db: Database): boolean {
  if ((db.sedeRev ?? 1) >= SEDE_REV) return false;
  const existing = db.rooms.filter((r) => r.name.startsWith(SEDE));
  if (!existing.length) return false;
  const built = new Map<string, RoomData>();
  for (const spec of ROOMS) {
    const names = [spec.name, ...(spec.was ?? [])];
    let room = existing.find((r) => names.includes(r.name));
    const fresh = buildRoom(db, spec.name, spec.description, spec.layout, furnish(spec), spec.wall ?? [], spec.darkness);
    if (room) {
      // mesmo cômodo: só troca planta e móveis
      db.nextRoomId--;
      Object.assign(room, { name: fresh.name, description: fresh.description, heightmap: fresh.heightmap, door: fresh.door, items: fresh.items, wallItems: fresh.wallItems });
    } else {
      room = fresh;
      db.rooms.push(room);
    }
    style(room, spec);
    built.set(spec.key, room);
  }
  wire(built);
  // peças: continuam onde estavam, se ainda der; senão, perto da porta
  for (const room of built.values()) {
    const map = new RoomMap(room.heightmap, room.door, room.items);
    const taken = new Set<string>();
    for (const t of room.tokens ?? []) {
      let ok = map.walkState(t.x, t.y) === 'walk' && !taken.has(`${t.x},${t.y}`);
      for (let r = 1; !ok && r < 6; r++)
        for (let dy = -r; dy <= r && !ok; dy++)
          for (let dx = -r; dx <= r && !ok; dx++) {
            const x = room.door.x + dx;
            const y = room.door.y + dy;
            if (map.walkState(x, y) === 'walk' && !map.isDoor(x, y) && !taken.has(`${x},${y}`)) {
              t.x = x;
              t.y = y;
              ok = true;
            }
          }
      taken.add(`${t.x},${t.y}`);
    }
  }
  const key = Math.min(...[...built.values()].map((r) => r.id));
  const camp = db.campaigns?.[String(key)];
  if (camp) for (const s of ROOMS) camp.layout[built.get(s.key)!.id] = s.plan;
  db.sedeRev = SEDE_REV;
  return true;
}
