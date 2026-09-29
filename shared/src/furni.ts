export type FurniCategory =
  | 'mobilia'
  | 'escritorio'
  | 'laboratorio'
  | 'ocultismo'
  | 'iluminacao'
  | 'armazenamento'
  | 'decoracao'
  | 'estrutura'
  | 'parede';

export const CATEGORY_NAMES: Record<FurniCategory, string> = {
  estrutura: 'Estrutura',
  mobilia: 'Mobília',
  escritorio: 'Escritório',
  laboratorio: 'Laboratório',
  ocultismo: 'Ocultismo',
  iluminacao: 'Iluminação',
  armazenamento: 'Armazenamento',
  decoracao: 'Decoração',
  parede: 'Parede',
};

/**
 * Mobi de chão. Dimensões canônicas: `width` ao longo de v (lateral) e `depth`
 * ao longo de u (frente). A frente aponta para a direção da rotação.
 */
export interface FurniDef {
  id: string;
  name: string;
  category: FurniCategory;
  kind: string;
  width: number;
  depth: number;
  /** altura de empilhamento/assento */
  height: number;
  walkable?: boolean;
  sit?: boolean;
  stackable?: boolean;
  /** decalque plano (sangue, sigilo, papéis) */
  flat?: boolean;
  /** quantidade de estados (clique duplo alterna) */
  states?: number;
  /** fica transparente quando o seu avatar passa atrás (paredes internas) */
  xray?: boolean;
  /** Passagem para outro quarto */
  portal?: boolean;
  rotations: number[];
  colors: string[];
  desc?: string;
}

/** Mobi de parede. Tamanho em pixels de tela. */
export interface WallFurniDef {
  id: string;
  name: string;
  category: 'parede';
  kind: string;
  w: number;
  h: number;
  states?: number;
  colors: string[];
  desc?: string;
}

const ALL = [0, 2, 4, 6];

export const FURNI_LIST: FurniDef[] = [
  // ---------- Escritório ----------
  { id: 'desk_wood', name: 'Mesa de Escritório', category: 'escritorio', kind: 'desk', width: 2, depth: 1, height: 0.8, stackable: true, rotations: ALL, colors: ['#4b3120', '#2f1f15', '#b8955a'] },
  { id: 'desk_metal', name: 'Mesa Metálica', category: 'escritorio', kind: 'desk', width: 2, depth: 1, height: 0.8, stackable: true, rotations: ALL, colors: ['#3c4046', '#2a2d31', '#8a9098'] },
  { id: 'chair_office', name: 'Cadeira de Escritório', category: 'escritorio', kind: 'office_chair', width: 1, depth: 1, height: 0.5, sit: true, rotations: ALL, colors: ['#242329', '#131216'] },
  { id: 'monitor', name: 'Monitor', category: 'escritorio', kind: 'monitor', width: 1, depth: 1, height: 0.55, states: 2, rotations: ALL, colors: ['#1b1d21', '#5fd3ff'], desc: 'Clique duplo liga/desliga.' },
  { id: 'monitor_green', name: 'Monitor de Radar', category: 'escritorio', kind: 'monitor', width: 1, depth: 1, height: 0.55, states: 2, rotations: ALL, colors: ['#1b1d21', '#4fe39a'] },
  { id: 'keyboard', name: 'Teclado', category: 'escritorio', kind: 'keyboard', width: 1, depth: 1, height: 0.05, stackable: true, rotations: ALL, colors: ['#18181b'] },
  { id: 'papers', name: 'Papéis Espalhados', category: 'escritorio', kind: 'papers', width: 1, depth: 1, height: 0.02, walkable: true, stackable: true, flat: true, rotations: ALL, colors: ['#d8cdb0'] },
  { id: 'mug', name: 'Caneca', category: 'escritorio', kind: 'mug', width: 1, depth: 1, height: 0.2, rotations: ALL, colors: ['#d8d2c4'] },
  { id: 'cabinet_file', name: 'Arquivo de Aço', category: 'escritorio', kind: 'file_cabinet', width: 1, depth: 1, height: 1.35, stackable: true, states: 2, rotations: ALL, colors: ['#4b5057', '#34383d', '#c9c0a4'], desc: 'Clique duplo abre a gaveta.' },

  // ---------- Mobília ----------
  { id: 'table_meeting', name: 'Mesa de Reunião', category: 'mobilia', kind: 'table_big', width: 3, depth: 2, height: 0.8, stackable: true, rotations: ALL, colors: ['#3f2a1b', '#2b1c12', '#9a7a4a'] },
  { id: 'table_small', name: 'Mesinha', category: 'mobilia', kind: 'table', width: 1, depth: 1, height: 0.7, stackable: true, rotations: ALL, colors: ['#4b3120', '#2f1f15'] },
  { id: 'chair_wood', name: 'Cadeira de Madeira', category: 'mobilia', kind: 'chair', width: 1, depth: 1, height: 0.5, sit: true, rotations: ALL, colors: ['#5a3a24', '#3d2718'] },
  { id: 'stool', name: 'Banqueta', category: 'mobilia', kind: 'stool', width: 1, depth: 1, height: 0.55, sit: true, rotations: ALL, colors: ['#3a2a24', '#1d1a18'] },
  { id: 'sofa_leather', name: 'Sofá de Couro', category: 'mobilia', kind: 'sofa', width: 2, depth: 1, height: 0.45, sit: true, rotations: ALL, colors: ['#4a2320'] },
  { id: 'rug_worn', name: 'Tapete Gasto', category: 'mobilia', kind: 'rug', width: 2, depth: 3, height: 0.03, walkable: true, stackable: true, flat: true, rotations: ALL, colors: ['#4a1c1c', '#8a6a3a'] },

  // ---------- Laboratório ----------
  { id: 'lab_bench', name: 'Bancada de Laboratório', category: 'laboratorio', kind: 'lab_bench', width: 2, depth: 1, height: 0.8, stackable: true, rotations: ALL, colors: ['#2f3338', '#8d949c', '#cfcabd'] },
  { id: 'tank', name: 'Tanque de Contenção', category: 'laboratorio', kind: 'tank', width: 2, depth: 2, height: 2.8, states: 2, rotations: ALL, colors: ['#2b2f33', '#3fe0c0'], desc: 'Clique duplo alterna a luz do tanque.' },
  { id: 'trolley', name: 'Carrinho de Laboratório', category: 'laboratorio', kind: 'trolley', width: 1, depth: 1, height: 0.95, rotations: ALL, colors: ['#7d848c', '#8a1414'] },
  { id: 'microscope', name: 'Microscópio', category: 'laboratorio', kind: 'microscope', width: 1, depth: 1, height: 0.55, rotations: ALL, colors: ['#d6d2c6', '#2a2a2a'] },
  { id: 'flasks', name: 'Frascos', category: 'laboratorio', kind: 'flasks', width: 1, depth: 1, height: 0.4, rotations: ALL, colors: ['#9b1b1b', '#3fae5a', '#3f7fbf'] },

  // ---------- Ocultismo ----------
  { id: 'sigil_floor', name: 'Sigilo Ritualístico', category: 'ocultismo', kind: 'sigil', width: 3, depth: 3, height: 0.01, walkable: true, stackable: true, flat: true, rotations: [0], colors: ['#7a0d0d'] },
  { id: 'sigil_map', name: 'Mapa do Sigilo', category: 'ocultismo', kind: 'sigil_map', width: 2, depth: 1, height: 0.02, walkable: true, stackable: true, flat: true, rotations: ALL, colors: ['#cbb994', '#8a1010'] },
  { id: 'blood_pool', name: 'Mancha de Sangue', category: 'ocultismo', kind: 'blood', width: 2, depth: 2, height: 0.01, walkable: true, stackable: true, flat: true, rotations: [0], colors: ['#6e0b0b'] },
  { id: 'blood_drops', name: 'Respingos de Sangue', category: 'ocultismo', kind: 'blood_small', width: 1, depth: 1, height: 0.01, walkable: true, stackable: true, flat: true, rotations: [0], colors: ['#6e0b0b'] },
  { id: 'skull', name: 'Crânio', category: 'ocultismo', kind: 'skull', width: 1, depth: 1, height: 0.3, rotations: ALL, colors: ['#d8cfb8'] },
  { id: 'books_stack', name: 'Pilha de Livros', category: 'ocultismo', kind: 'books', width: 1, depth: 1, height: 0.4, stackable: true, rotations: ALL, colors: ['#5a2320', '#2f3f5a', '#4a4a2a'] },
  { id: 'bookshelf', name: 'Estante de Livros', category: 'ocultismo', kind: 'bookshelf', width: 2, depth: 1, height: 2.2, rotations: ALL, colors: ['#3d2819', '#2a1b11'] },

  // ---------- Iluminação ----------
  { id: 'candles', name: 'Velas', category: 'iluminacao', kind: 'candles', width: 1, depth: 1, height: 0.35, states: 2, rotations: ALL, colors: ['#e8dcc0'], desc: 'Clique duplo acende/apaga.' },
  { id: 'candelabra', name: 'Candelabro', category: 'iluminacao', kind: 'candelabra', width: 1, depth: 1, height: 1.6, states: 2, rotations: ALL, colors: ['#8a6a2a', '#e8dcc0'] },
  { id: 'desk_lamp', name: 'Luminária de Mesa', category: 'iluminacao', kind: 'desk_lamp', width: 1, depth: 1, height: 0.6, states: 2, rotations: ALL, colors: ['#2a2a2a', '#ffc46b'] },
  { id: 'floor_lamp', name: 'Luminária de Chão', category: 'iluminacao', kind: 'floor_lamp', width: 1, depth: 1, height: 1.9, states: 2, rotations: ALL, colors: ['#2a2a2a', '#e8c98a'] },

  // ---------- Armazenamento ----------
  { id: 'shelf_metal', name: 'Estante de Metal', category: 'armazenamento', kind: 'shelf', width: 2, depth: 1, height: 2.2, rotations: ALL, colors: ['#3a3d42', '#23262a'] },
  { id: 'locker', name: 'Armário de Metal', category: 'armazenamento', kind: 'locker', width: 1, depth: 1, height: 2.1, states: 2, rotations: ALL, colors: ['#3d4148', '#2a2d32'], desc: 'Clique duplo abre a porta.' },
  { id: 'crate_wood', name: 'Caixote de Madeira', category: 'armazenamento', kind: 'crate', width: 1, depth: 1, height: 0.8, stackable: true, rotations: ALL, colors: ['#6b4a2e', '#4a321f'] },
  { id: 'crate_metal', name: 'Caixa Metálica', category: 'armazenamento', kind: 'crate_metal', width: 1, depth: 1, height: 0.8, stackable: true, rotations: ALL, colors: ['#35393f', '#24272b', '#7a6a4a'] },
  { id: 'chest_military', name: 'Baú Militar', category: 'armazenamento', kind: 'chest', width: 2, depth: 1, height: 0.7, stackable: true, rotations: ALL, colors: ['#3e3a2c', '#2a271e', '#8a8060'] },
  { id: 'barrel', name: 'Barril', category: 'armazenamento', kind: 'barrel', width: 1, depth: 1, height: 1.0, stackable: true, rotations: ALL, colors: ['#3a3f2e', '#1f2219'] },

  // ---------- Decoração ----------
  { id: 'plant', name: 'Planta', category: 'decoracao', kind: 'plant', width: 1, depth: 1, height: 1.2, rotations: ALL, colors: ['#2f5a2a', '#3d2a1e'] },
  { id: 'pillar', name: 'Pilar de Concreto', category: 'decoracao', kind: 'pillar', width: 1, depth: 1, height: 5, rotations: [0], colors: ['#4a4540'] },
  { id: 'iwall', name: 'Parede Interna', category: 'estrutura', kind: 'iwall', width: 1, depth: 1, height: 3.2, xray: true, rotations: ALL, colors: ['#3b342f'], desc: 'Monte cômodos. Fica transparente quando você passa atrás.' },
  { id: 'iwall_door', name: 'Parede com Vão', category: 'estrutura', kind: 'iwall_door', width: 1, depth: 1, height: 0, walkable: true, xray: true, rotations: ALL, colors: ['#3b342f', '#2a1d14'] },
  { id: 'iwall_window', name: 'Parede com Janela', category: 'estrutura', kind: 'iwall_window', width: 1, depth: 1, height: 3.2, xray: true, rotations: ALL, colors: ['#3b342f', '#2a1d14'] },
  { id: 'portal', name: 'Passagem', category: 'estrutura', kind: 'portal', width: 1, depth: 1, height: 0, walkable: true, portal: true, rotations: ALL, colors: ['#2a1d14'], desc: 'Pare em cima para ir ao quarto ligado (o mestre escolhe o destino).' },
  { id: 'ceiling_lamp', name: 'Lâmpada Pendurada', category: 'iluminacao', kind: 'ceiling_lamp', width: 1, depth: 1, height: 0, walkable: true, stackable: true, states: 2, rotations: [0], colors: ['#ffd98a'], desc: 'Fica no teto; dá para andar embaixo.' },
  { id: 'vent', name: 'Grade de Ventilação', category: 'decoracao', kind: 'vent', width: 1, depth: 1, height: 0.02, walkable: true, stackable: true, flat: true, rotations: ALL, colors: ['#2a2d31'] },
];

export const WALL_FURNI_LIST: WallFurniDef[] = [
  { id: 'poster_sigil', name: 'Pôster de Sigilo', category: 'parede', kind: 'poster_sigil', w: 44, h: 56, colors: ['#cdbf9c', '#8a1010'] },
  { id: 'notes_wall', name: 'Anotações', category: 'parede', kind: 'notes', w: 40, h: 38, colors: ['#d8cdb0'] },
  { id: 'board_investigation', name: 'Quadro de Investigação', category: 'parede', kind: 'board', w: 76, h: 50, colors: ['#6b4a2e', '#b3261e'] },
  { id: 'window_barred', name: 'Janela Gradeada', category: 'parede', kind: 'window', w: 44, h: 54, states: 2, colors: ['#1c2a3a', '#5fa8ff'] },
  { id: 'sconce', name: 'Arandela de Velas', category: 'parede', kind: 'sconce', w: 16, h: 28, states: 2, colors: ['#8a6a2a', '#e8dcc0'] },
  { id: 'door_sealed', name: 'Porta Selada', category: 'parede', kind: 'door_sealed', w: 40, h: 96, colors: ['#5a1414', '#8a1010'] },
  { id: 'pipes', name: 'Tubulação', category: 'parede', kind: 'pipes', w: 64, h: 22, colors: ['#3a3d42'] },
  { id: 'wall_shelf', name: 'Prateleira de Parede', category: 'parede', kind: 'wall_shelf', w: 48, h: 26, colors: ['#3d2819'] },
  { id: 'antlers', name: 'Crânio de Cervo', category: 'parede', kind: 'antlers', w: 40, h: 34, colors: ['#d8cfb8'] },
  { id: 'emergency_light', name: 'Luz de Emergência', category: 'parede', kind: 'emergency', w: 22, h: 16, states: 2, colors: ['#2a2d31', '#ff2a1a'], desc: 'Continua acesa no apagão.' },
  { id: 'clock', name: 'Relógio de Parede', category: 'parede', kind: 'clock', w: 22, h: 22, colors: ['#2a2420', '#d8cfb8'] },
];

export const FURNI: Record<string, FurniDef> = Object.fromEntries(FURNI_LIST.map((d) => [d.id, d]));
export const WALL_FURNI: Record<string, WallFurniDef> = Object.fromEntries(WALL_FURNI_LIST.map((d) => [d.id, d]));

export function getFurni(id: string): FurniDef | undefined {
  return FURNI[id];
}

export function getWallFurni(id: string): WallFurniDef | undefined {
  return WALL_FURNI[id];
}

export function isWallDef(id: string): boolean {
  return id in WALL_FURNI;
}

export function anyFurniName(id: string): string {
  return FURNI[id]?.name ?? WALL_FURNI[id]?.name ?? id;
}

/** Tamanho ocupado no grid para uma rotação. */
export function footprint(def: Pick<FurniDef, 'width' | 'depth'>, rot: number): { sx: number; sy: number } {
  return rot === 2 || rot === 6 ? { sx: def.depth, sy: def.width } : { sx: def.width, sy: def.depth };
}

export function nextRotation(def: FurniDef, rot: number): number {
  const i = def.rotations.indexOf(rot);
  return def.rotations[(i + 1) % def.rotations.length] ?? def.rotations[0];
}
