import { getLayout, RoomMap, type AvatarLook, type Door, type FloorItem, type Hint, type LogIcon, type Loot, type WallItem } from '@croma/shared';
import type { Database, RoomData, TokenData } from './db';

export const SYSTEM_OWNER = 'CROMA';

type FloorSeed = [defId: string, x: number, y: number, rot: number, hint?: Hint, state?: number];
type WallSeed = [defId: string, wall: 'l' | 'r', plane: number, pos: number, z: number, hint?: Hint];

const hint = (icon: Hint['icon'], title: string, text: string): Hint => ({ icon, title, text, visible: true });

function buildRoom(
  db: Database,
  name: string,
  description: string,
  layoutId: string | { heightmap: string; door: Door },
  floor: FloorSeed[],
  wall: WallSeed[],
  darkness: number,
): RoomData {
  const layout = typeof layoutId === 'string' ? getLayout(layoutId)! : layoutId;
  const map = new RoomMap(layout.heightmap, layout.door);
  const items: FloorItem[] = [];
  for (const [defId, x, y, rot, h, state] of floor) {
    const res = map.canPlace(defId, x, y, rot);
    if (!res.ok) {
      console.warn(`[seed] ${name}: ${defId} em ${x},${y} ignorado (${res.reason})`);
      continue;
    }
    const it: FloorItem = { id: db.nextItemId++, defId, x, y, z: res.z, rot, state: state ?? 0 };
    if (h) it.hint = h;
    map.addItem(it);
    items.push(it);
  }
  const wallItems: WallItem[] = [];
  for (const [defId, w, plane, pos, z, h] of wall) {
    const res = map.canPlaceWall(defId, w, plane, pos, z);
    if (!res.ok) {
      console.warn(`[seed] ${name}: ${defId} na parede ${w}${plane}@${pos} ignorado (${res.reason})`);
      continue;
    }
    const it: WallItem = { id: db.nextItemId++, defId, wall: w, plane, pos, z, state: 0 };
    if (h) it.hint = h;
    wallItems.push(it);
  }
  return {
    id: db.nextRoomId++,
    name,
    description,
    owner: SYSTEM_OWNER,
    heightmap: layout.heightmap,
    door: layout.door,
    items,
    wallItems,
    publicBuild: true,
    darkness,
  };
}

const SEED_VERSION = 8;

/** Liga as Passagens de `a` (na ordem) aos quartos de `targets`. */
function linkPortals(room: RoomData, targets: number[]) {
  let i = 0;
  for (const it of room.items) if (it.defId === 'portal' && i < targets.length) it.link = targets[i++];
}

/** Campanha de exemplo: três cenas da mesma casa, ligadas por Passagens. */
function seedCasa(db: Database) {
  const sala = buildRoom(
    db,
    'Casa Abandonada · Sala',
    'Cena 1. A porta do porão está entreaberta.',
    'corredor',
    [
      ['rug_worn', 8, 4, 0],
      ['sofa_leather', 7, 5, 2],
      ['table_small', 9, 5, 0],
      ['candles', 9, 5, 0],
      ['bookshelf', 8, 0, 4],
      ['plant', 12, 1, 0],
      ['ceiling_lamp', 9, 2, 0],
      ['ceiling_lamp', 3, 5, 0],
      ['blood_drops', 11, 6, 0],
      ['papers', 10, 3, 0, hint('document', 'Carta amassada', '"Não desçam depois da meia-noite. Ele escuta." — assinada só com um R.')],
      // parede interna separando o lavabo à esquerda
      ['iwall_door', 5, 4, 2],
      ['iwall', 5, 5, 2],
      ['iwall_window', 5, 6, 2],
      ['iwall', 5, 7, 2],
      ['crate_wood', 1, 7, 2],
      ['skull', 1, 7, 2],
      ['portal', 10, 0, 4],
      ['portal', 12, 4, 6],
    ],
    [
      ['window_barred', 'r', 0, 7.9, 2.2],
      ['poster_sigil', 'l', 1, 7.0, 2.0],
      ['emergency_light', 'r', 0, 11.5, 3.2],
      ['clock', 'r', 0, 9.2, 3.4],
    ],
    0.6,
  );
  sala.fog = 0.25;
  sala.lightMode = 'normal';
  const porao = buildRoom(
    db,
    'Casa Abandonada · Porão',
    'Cena 2. Cheiro de cera e ferro.',
    'poco',
    [
      ['sigil_floor', 5, 4, 0, hint('inspect', 'Sigilo recente', 'O sangue ainda não secou. No centro, marcas de joelhos.')],
      ['candles', 4, 3, 0],
      ['candles', 8, 3, 0],
      ['candles', 4, 7, 0],
      ['candles', 8, 7, 0],
      ['skull', 6, 5, 2],
      ['barrel', 1, 1, 0],
      ['crate_wood', 11, 1, 0],
      ['portal', 6, 0, 4],
    ],
    [['emergency_light', 'r', 0, 3.0, 4.2], ['pipes', 'l', 1, 8.0, 5.0]],
    0.78,
  );
  porao.fog = 0.7;
  porao.lightMode = 'flicker';
  const quarto = buildRoom(
    db,
    'Casa Abandonada · Quarto',
    'Cena 3. Alguém dormia aqui até ontem.',
    'interrogatorio',
    [
      ['chair_wood', 5, 1, 4],
      ['table_small', 5, 2, 0],
      ['desk_lamp', 5, 2, 4],
      ['cabinet_file', 6, 0, 4, hint('interact', 'Gaveta emperrada', 'Faça um teste de Força para abrir. Dentro: um diário com páginas arrancadas.')],
      ['ceiling_lamp', 3, 3, 0],
      ['portal', 3, 0, 4],
    ],
    [['window_barred', 'r', 0, 5.3, 2.3], ['notes_wall', 'l', 1, 4.2, 2.1]],
    0.65,
  );
  quarto.fog = 0.2;
  linkPortals(sala, [porao.id, quarto.id]);
  linkPortals(porao, [sala.id]);
  linkPortals(quarto, [sala.id]);
  db.rooms.push(sala, porao, quarto);
}

/** Itens, interações e objetivos de exemplo na Casa Abandonada. */
function seedCasaRpg(db: Database) {
  const byName = (n: string) => db.rooms.find((r) => r.name === n);
  const id = () => db.nextItemId++;
  const put = (room: RoomData | undefined, defId: string, loot: [string, number, Loot['kind']][], actions: [string, number][]) => {
    const it = room?.items.find((i) => i.defId === defId);
    if (!it) return;
    it.loot = loot.map(([name, weight, kind]) => ({ id: id(), name, weight, kind, revealed: false }));
    it.actions = actions.map(([label, dt]) => ({ id: id(), label, dt }));
  };
  const sala = byName('Casa Abandonada · Sala');
  const porao = byName('Casa Abandonada · Porão');
  const quarto = byName('Casa Abandonada · Quarto');
  put(quarto, 'cabinet_file', [['Diário Rasgado', 1, 'document'], ['Faca de Cozinha', 2, 'weapon']], [['Forçar a gaveta', 15], ['Investigar', 12]]);
  put(sala, 'bookshelf', [['Chave Enferrujada', 0.1, 'key'], ['Carta Lacrada', 0.2, 'letter']], [['Procurar entre os livros', 10]]);
  put(porao, 'barrel', [['Fita VHS', 0.5, 'tape'], ['Frasco de Sangue', 0.5, 'potion']], [['Abrir o barril', 12]]);
  if (sala) {
    db.campaigns ??= {};
    db.campaigns[String(sala.id)] = {
      title: 'Casa Abandonada',
      subtitle: 'Rua das Almas, 13',
      objectives: [
        { id: id(), text: 'Investigar a sala', done: false },
        { id: id(), text: 'Encontrar a chave', done: false },
        { id: id(), text: 'Descer ao porão', done: false },
        { id: id(), text: 'Descobrir quem é "R"', done: false },
      ],
      layout: {},
      log: [],
    };
  }
}

/** Peças de exemplo na Sala. */
function seedTokens(db: Database) {
  const sala = db.rooms.find((r) => r.name === 'Casa Abandonada · Sala');
  if (!sala) return;
  const base = { shoes: '#3d3a40', pants: '#1c1b1f', charId: null };
  const mk = (name: string, x: number, y: number, dir: number, look: Partial<AvatarLook>) => ({
    id: db.nextItemId++,
    name,
    x,
    y,
    dir,
    look: { skin: '#e8b98f', hair: '#1a1412', hairStyle: 0, top: '#2b2a30', outfit: 0, extra: 0, ...base, ...look } as AvatarLook,
  });
  sala.tokens = [
    mk('Arthur', 10, 6, 4, { hair: '#3b2618', hairStyle: 1, extra: 2, top: '#5c4632', outfit: 1 }),
    mk('Cora', 9, 7, 6, { skin: '#f3d2b3', hair: '#a8321e', hairStyle: 3, top: '#2b2a30', outfit: 1 }),
    mk('Miguel', 11, 5, 4, { hair: '#1a1412', extra: 1, top: '#d8d0c0', outfit: 2 }),
    mk('Teps', 8, 7, 2, { hair: '#c9c4bc', hairStyle: 2, top: '#1c1b1f' }),
  ];
}

/** Planta retangular com a porta na parede esquerda. */
function plan(w: number, h: number, doorY: number): { heightmap: string; door: Door } {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) rows.push((y === doorY ? '0' : 'x') + '0'.repeat(w));
  return { heightmap: rows.join('\n'), door: { x: 0, y: doorY, dir: 2 } };
}

/** Liga a Passagem que está em (x,y) à cena `to`. */
function linkAt(room: RoomData, x: number, y: number, to: number) {
  const it = room.items.find((i) => i.defId === 'portal' && i.x === x && i.y === y);
  if (it) it.link = to;
  else console.warn(`[seed] ${room.name}: sem passagem em ${x},${y}`);
}

/**
 * Campanha "Sombras de Arvendal" — a mesma situação da tela de referência:
 * sete cenas da Mansão Alvarez, o grupo no Escritório investigando a
 * Escrivaninha, cargas 6/10, 9/10, 4/12 e 10/10.
 */
function seedMansao(db: Database) {
  const P = 'Mansão Alvarez · ';
  const hall = buildRoom(
    db,
    P + 'Hall de Entrada',
    'A porta da frente range. Um lustre apagado balança sem vento.',
    plan(7, 8, 4),
    [
      ['rug_worn', 3, 3, 0],
      ['chest_military', 5, 0, 4, hint('interact', 'Baú da Equipe', 'O equipamento que o grupo trouxe. Cada um pegou o que era seu.')],
      ['candelabra', 1, 0, 0],
      ['candelabra', 7, 0, 0],
      ['plant', 1, 7, 0],
      ['plant', 7, 7, 0],
      ['chair_wood', 1, 1, 2],
      ['table_small', 1, 2, 0],
      ['candles', 1, 2, 0],
      ['ceiling_lamp', 4, 4, 0],
      ['portal', 1, 4, 2],
      ['portal', 3, 0, 4],
      ['portal', 7, 4, 6],
      ['portal', 4, 7, 0],
    ],
    [
      ['clock', 'r', 0, 5.6, 3.4],
      ['sconce', 'l', 1, 2.2, 2.3],
      ['sconce', 'l', 1, 6.4, 2.3],
      ['poster_sigil', 'r', 0, 2.2, 2.0],
    ],
    0.62,
  );
  hall.fog = 0.2;
  const estar = buildRoom(
    db,
    P + 'Sala de Estar',
    'Móveis cobertos por lençóis. Um deles está no chão.',
    plan(9, 7, 3),
    [
      ['rug_worn', 4, 2, 0],
      ['sofa_leather', 3, 1, 4, hint('inspect', 'Sofá rasgado', 'O estofado foi aberto com uma lâmina. Algo estava escondido aqui dentro.')],
      ['sofa_leather', 6, 4, 0],
      ['table_small', 5, 3, 0],
      ['candles', 5, 3, 0],
      ['floor_lamp', 1, 0, 0],
      ['bookshelf', 6, 0, 4],
      ['plant', 9, 0, 0],
      ['ceiling_lamp', 3, 4, 0],
      ['portal', 9, 3, 6],
    ],
    [
      ['window_barred', 'r', 0, 4.2, 2.2],
      ['antlers', 'l', 1, 5.8, 3.0],
    ],
    0.6,
  );
  const biblio = buildRoom(
    db,
    P + 'Biblioteca',
    'Estantes até o teto. Um dos livros está virado ao contrário.',
    plan(8, 8, 4),
    [
      ['bookshelf', 1, 0, 4],
      ['bookshelf', 3, 0, 4],
      ['bookshelf', 6, 0, 4],
      ['bookshelf', 1, 2, 2],
      ['bookshelf', 1, 5, 2],
      ['table_meeting', 3, 3, 0],
      ['books_stack', 4, 3, 0, hint('inspect', 'Livro fora do lugar', '"Genealogia dos Alvarez" — a última página foi arrancada.')],
      ['candles', 5, 4, 0],
      ['chair_wood', 3, 5, 4],
      ['chair_wood', 5, 5, 4],
      ['candelabra', 8, 0, 0],
      ['portal', 4, 7, 0],
    ],
    [
      ['sconce', 'r', 0, 5.2, 2.6],
      ['sconce', 'l', 1, 6.6, 2.4],
    ],
    0.66,
  );
  biblio.fog = 0.15;
  const escr = buildRoom(
    db,
    P + 'Escritório',
    'O escritório do velho Alvarez. A lareira ainda está morna.',
    plan(10, 9, 5),
    [
      ['desk_wood', 6, 4, 0, hint('inspect', 'Escrivaninha', 'Uma escrivaninha de madeira escura, com várias gavetas.\nHá papéis espalhados e instrumentos de uso recente.')],
      ['papers', 6, 4, 0],
      ['desk_lamp', 7, 4, 0],
      ['chair_office', 6, 5, 0],
      ['books_stack', 8, 1, 0],
      ['cabinet_file', 1, 7, 2],
      ['table_small', 3, 8, 0],
      ['crate_wood', 10, 7, 0],
      ['shelf_metal', 9, 0, 4],
      ['rug_worn', 4, 4, 0],
      ['bookshelf', 1, 0, 4],
      ['bookshelf', 3, 0, 4],
      ['bookshelf', 6, 0, 4],
      ['bookshelf', 1, 2, 2],
      ['candles', 3, 8, 0],
      ['plant', 5, 0, 0],
      ['plant', 10, 2, 0],
      ['plant', 1, 8, 0],
      ['floor_lamp', 8, 0, 0],
      ['sofa_leather', 3, 7, 0],
      ['chair_wood', 9, 5, 6],
      ['ceiling_lamp', 5, 3, 0],
      ['portal', 1, 5, 2],
      ['portal', 5, 8, 0],
    ],
    [
      ['window_barred', 'r', 0, 5.2, 2.2],
      ['board_investigation', 'r', 0, 8.3, 1.8],
      ['sconce', 'l', 1, 4.5, 2.4],
      ['sconce', 'r', 0, 2.6, 2.6],
      ['clock', 'l', 1, 7.4, 3.3],
    ],
    0.58,
  );
  escr.fog = 0.18;
  const cozinha = buildRoom(
    db,
    P + 'Cozinha',
    'Panelas no chão. A gaveta dos talheres está vazia.',
    plan(8, 6, 3),
    [
      ['lab_bench', 1, 1, 2, hint('inspect', 'Bancada', 'Falta a faca maior do cepo. Há marcas de dedos na farinha.')],
      ['flasks', 1, 1, 2],
      ['table_small', 4, 2, 0],
      ['chair_wood', 4, 3, 4],
      ['barrel', 8, 0, 0],
      ['crate_wood', 7, 0, 0],
      ['shelf_metal', 4, 0, 4],
      ['blood_drops', 5, 4, 0],
      ['ceiling_lamp', 4, 2, 0],
      ['portal', 2, 0, 4],
      ['portal', 4, 5, 0],
    ],
    [
      ['window_barred', 'r', 0, 6.4, 2.2],
      ['pipes', 'r', 0, 2.6, 4.4],
    ],
    0.68,
  );
  const quarto = buildRoom(
    db,
    P + 'Quarto Principal',
    'A cama está feita. Ninguém dorme aqui há anos — mas o travesseiro está quente.',
    plan(8, 7, 3),
    [
      ['rug_worn', 4, 2, 0],
      ['locker', 1, 1, 2, hint('interact', 'Guarda-roupa', 'Trancado por dentro.')],
      ['chest_military', 6, 0, 4],
      ['table_small', 7, 3, 0],
      ['desk_lamp', 7, 3, 0],
      ['chair_wood', 2, 5, 0],
      ['candelabra', 8, 6, 0],
      ['ceiling_lamp', 4, 3, 0],
      ['portal', 4, 0, 4],
    ],
    [
      ['window_barred', 'r', 0, 3.2, 2.3],
      ['notes_wall', 'l', 1, 4.8, 2.1],
    ],
    0.7,
  );
  quarto.fog = 0.25;
  const jardim = buildRoom(
    db,
    P + 'Jardim',
    'Os canteiros foram revirados. Algo foi enterrado — ou desenterrado.',
    plan(11, 7, 3),
    [
      ['plant', 1, 0, 0],
      ['plant', 3, 0, 0],
      ['plant', 7, 0, 0],
      ['plant', 11, 0, 0],
      ['plant', 1, 6, 0],
      ['plant', 11, 6, 0],
      ['sigil_floor', 5, 2, 0, hint('inspect', 'Terra revirada', 'No centro do canteiro, um símbolo desenhado com cal.')],
      ['barrel', 10, 3, 0],
      ['crate_wood', 10, 4, 0],
      ['candles', 4, 5, 0],
      ['portal', 5, 0, 4],
    ],
    [],
    0.74,
  );
  jardim.fog = 0.6;
  jardim.lightMode = 'flicker';

  linkAt(hall, 1, 4, estar.id);
  linkAt(hall, 3, 0, biblio.id);
  linkAt(hall, 7, 4, escr.id);
  linkAt(hall, 4, 7, cozinha.id);
  linkAt(estar, 9, 3, hall.id);
  linkAt(biblio, 4, 7, hall.id);
  linkAt(escr, 1, 5, hall.id);
  linkAt(escr, 5, 8, quarto.id);
  linkAt(cozinha, 2, 0, hall.id);
  linkAt(cozinha, 4, 5, jardim.id);
  linkAt(quarto, 4, 0, escr.id);
  linkAt(jardim, 5, 0, cozinha.id);

  // itens: o que está no cenário e o que o grupo já carrega
  const id = () => db.nextItemId++;
  const loot = (room: RoomData, defId: string, list: [string, number, Loot['kind'], string?][], actions: [string, number][] = []) => {
    const it = room.items.find((i) => i.defId === defId);
    if (!it) return console.warn(`[seed] ${room.name}: ${defId} sem lugar para itens`);
    it.loot = list.map(([name, weight, kind, holder]) => ({ id: id(), name, weight, kind, revealed: true, ...(holder ? { holder } : {}) }));
    it.actions = actions.map(([label, dt]) => ({ id: id(), label, dt }));
  };
  loot(
    escr,
    'desk_wood',
    [
      ['Faca de Cozinha', 2, 'weapon'],
      ['Diário Rasgado', 1, 'document', 'Cora'],
      ['Chave da Escrivaninha', 0.1, 'key', 'Arthur'],
    ],
    [
      ['Investigar', 15],
      ['Abrir a gaveta', 10],
    ],
  );
  loot(escr, 'books_stack', [['Página Arrancada', 0.1, 'document']], [['Folhear', 10]]);
  loot(escr, 'cabinet_file', [['Chave Enferrujada', 0.1, 'key'], ['Carta Lacrada', 0.2, 'letter']], [['Forçar o arquivo', 14]]);
  loot(escr, 'table_small', [['Frasco de Láudano', 0.3, 'potion']]);
  loot(escr, 'shelf_metal', [['Fita Cassete', 0.2, 'tape']]);
  loot(escr, 'crate_wood', [['Caixa de Charutos', 0.5, 'box']], [['Abrir o caixote', 8]]);
  loot(hall, 'chest_military', [
    ['Revólver .38', 2, 'weapon', 'Arthur'],
    ['Lanterna', 1, 'misc', 'Arthur'],
    ['Mochila de Campo', 2.9, 'box', 'Arthur'],
    ['Pé de Cabra', 3, 'weapon', 'Cora'],
    ['Kit de Primeiros Socorros', 2, 'box', 'Cora'],
    ['Rádio Portátil', 3, 'misc', 'Cora'],
    ['Câmera Fotográfica', 2, 'misc', 'Miguel'],
    ['Caderno de Anotações', 1, 'document', 'Miguel'],
    ['Lanterna', 1, 'misc', 'Miguel'],
    ['Espingarda', 5, 'weapon', 'Teps'],
    ['Munição', 2, 'box', 'Teps'],
    ['Corda', 3, 'misc', 'Teps'],
  ]);

  // o grupo no Escritório, como na referência
  const base = { shoes: '#3d3a40', pants: '#1c1b1f', charId: null };
  const tk = (name: string, x: number, y: number, dir: number, color: string, capacity: number, look: Partial<AvatarLook>): TokenData => ({
    id: id(),
    name,
    x,
    y,
    dir,
    color,
    capacity,
    look: { skin: '#e8b98f', hair: '#1a1412', hairStyle: 0, top: '#2b2a30', outfit: 0, extra: 0, ...base, ...look } as AvatarLook,
  });
  escr.tokens = [
    tk('Arthur', 4, 3, 4, '#e3a94c', 10, { hair: '#3b2618', hairStyle: 1, extra: 2, top: '#5c4632', outfit: 1 }),
    tk('Cora', 4, 6, 6, '#d83a2e', 10, { skin: '#f3d2b3', hair: '#a8321e', hairStyle: 3, top: '#2b2a30', outfit: 1 }),
    tk('Miguel', 7, 6, 6, '#3f6fd8', 12, { hair: '#1a1412', extra: 1, top: '#d8d0c0', outfit: 2 }),
    tk('Teps', 2, 4, 2, '#f2efe6', 10, { hair: '#c9c4bc', hairStyle: 2, top: '#1c1b1f' }),
  ];

  db.rooms.push(hall, estar, biblio, escr, cozinha, quarto, jardim);

  // campanha: título, objetivos, planta do andar e últimas ações
  const now = Date.now();
  const entry = (minAgo: number, icon: LogIcon, text: string) => ({ at: now - minAgo * 60000, icon, text });
  db.campaigns ??= {};
  db.campaigns[String(hall.id)] = {
    title: 'Sombras de Arvendal',
    subtitle: 'Mansão Alvarez',
    objectives: [
      { id: id(), text: 'Investigar o Escritório', done: true },
      { id: id(), text: 'Encontrar a chave', done: false },
      { id: id(), text: 'Buscar documentos', done: false },
      { id: id(), text: 'Verificar andar superior', done: false },
    ],
    layout: {
      [biblio.id]: { x: 10, y: 0 },
      [estar.id]: { x: 0, y: 9 },
      [hall.id]: { x: 10, y: 8 },
      [escr.id]: { x: 18, y: 6 },
      [cozinha.id]: { x: 9, y: 16 },
      [quarto.id]: { x: 19, y: 15 },
      [jardim.id]: { x: 8, y: 22 },
    },
    log: [
      entry(19, 'give', 'Arthur entregou a Chave da Escrivaninha.'),
      entry(3, 'user', 'Cora investigou a Escrivaninha (DT 15) — Sucesso (18).'),
      entry(0, 'user', 'Miguel abriu a gaveta — encontrou Faca de Cozinha.'),
    ],
  };
  db.home = escr.id;
}

/** Aplica conteúdo novo em bancos antigos sem apagar nada. */
export function upgradeDb(db: Database): boolean {
  const v = db.seedVersion ?? 1;
  if (v >= SEED_VERSION) return false;
  for (const r of db.rooms) {
    r.lightMode ??= 'normal';
    r.fog ??= r.id === 1 ? 0.2 : 0;
  }
  if (v < 2) seedCasa(db);
  if (v < 3) seedCasaRpg(db);
  if (v < 4) seedTokens(db);
  if (v < 5) {
    // cores e carga das peças de exemplo (como no layout de referência)
    const meta: Record<string, [string, number]> = { Arthur: ['#e3a94c', 10], Cora: ['#d83a2e', 10], Miguel: ['#3f6fd8', 12], Teps: ['#f2efe6', 10] };
    for (const r of db.rooms)
      for (const t of r.tokens ?? []) {
        const m = meta[t.name];
        if (m) [t.color, t.capacity] = m;
      }
  }
  if (v < 7) {
    // v6 saiu com móveis fora do lugar: refaz a mansão inteira
    const old = db.rooms.filter((r) => r.name.startsWith('Mansão Alvarez · '));
    if (old.length) {
      const ids = new Set(old.map((r) => r.id));
      db.rooms = db.rooms.filter((r) => !ids.has(r.id));
      if (db.campaigns) delete db.campaigns[String(Math.min(...ids))];
    }
    seedMansao(db);
  }
  if (v < 8) {
    // últimas ações da demonstração como na referência
    const ids = db.rooms.filter((r) => r.name.startsWith('Mansão Alvarez · ')).map((r) => r.id);
    const camp = ids.length ? db.campaigns?.[String(Math.min(...ids))] : undefined;
    if (camp) {
      const now = Date.now();
      camp.log = [
        { at: now - 19 * 60000, icon: 'give', text: 'Arthur entregou a Chave da Escrivaninha.' },
        { at: now - 3 * 60000, icon: 'user', text: 'Cora investigou a Escrivaninha (DT 15) — Sucesso (18).' },
        { at: now, icon: 'user', text: 'Miguel abriu a gaveta — encontrou Faca de Cozinha.' },
      ];
      camp.objectives.forEach((o, i) => (o.done = i === 0));
    }
  }
  db.seedVersion = SEED_VERSION;
  return true;
}

export function seedDb(): Database {
  const db: Database = {
    version: 1,
    nextRoomId: 1,
    nextItemId: 1,
    nextCharId: 1,
    rooms: [],
    users: {},
    characters: [],
  };

  db.rooms.push(
    buildRoom(
      db,
      'Base da Ordem',
      'QG subterrâneo de investigação paranormal.',
      'bunker',
      [
        // decalques primeiro
        ['sigil_floor', 7, 5, 0],
        ['blood_pool', 9, 7, 0],
        ['blood_drops', 3, 5, 0],
        ['blood_drops', 6, 8, 0],
        ['blood_drops', 11, 3, 0],
        ['vent', 11, 8, 2],
        // parede esquerda
        ['plant', 1, 0, 2],
        ['desk_wood', 1, 1, 2],
        ['monitor', 1, 1, 2],
        ['monitor_green', 1, 2, 2],
        ['desk_wood', 1, 3, 2],
        ['desk_lamp', 1, 3, 2],
        ['papers', 1, 4, 2],
        ['mug', 1, 4, 2],
        ['chair_office', 2, 2, 6],
        ['cabinet_file', 1, 6, 2, hint('document', 'Arquivo 13-B', 'Relatórios de ocorrências de 1998. Várias páginas foram arrancadas às pressas.')],
        ['candles', 1, 6, 2],
        ['cabinet_file', 1, 7, 2],
        ['locker', 1, 8, 2, hint('interact', 'Armário trancado', 'Há arranhões fundos do lado de dentro da porta.')],
        ['crate_wood', 1, 9, 2],
        // parede direita
        ['shelf_metal', 3, 0, 4],
        ['bookshelf', 5, 0, 4],
        ['desk_metal', 7, 0, 4],
        ['monitor', 7, 0, 4],
        ['monitor', 8, 0, 4],
        ['chair_office', 7, 1, 0],
        ['tank', 9, 0, 4, hint('inspect', 'Espécime contido', 'Uma criatura de membros alongados flutua no líquido. Às vezes parece acompanhar você com os olhos.')],
        ['candelabra', 12, 2, 0],
        // mesa central
        ['table_meeting', 4, 3, 4],
        ['sigil_map', 5, 3, 4, hint('inspect', 'Mapa do Sigilo', 'Um mapa da cidade coberto por um sigilo desenhado com sangue. Três pontos estão circulados.')],
        ['books_stack', 4, 3, 4],
        ['candles', 4, 4, 4],
        ['papers', 5, 4, 4],
        ['skull', 6, 4, 4],
        ['stool', 3, 4, 2],
        ['stool', 5, 5, 0],
        ['stool', 7, 3, 6],
        // laboratório
        ['lab_bench', 11, 5, 6],
        ['microscope', 11, 5, 6],
        ['flasks', 11, 6, 6],
        ['stool', 10, 6, 2],
        ['trolley', 3, 8, 2],
        // caixas
        ['crate_wood', 7, 9, 2],
        ['crate_metal', 7, 9, 2],
        ['crate_metal', 8, 9, 0],
        ['chest_military', 10, 9, 4],
        ['crate_wood', 12, 9, 0],
        ['skull', 12, 9, 2],
        ['crate_wood', 12, 8, 2],
        ['barrel', 12, 7, 0],
      ],
      [
        ['board_investigation', 'l', 1, 2.0, 1.7, hint('inspect', 'Quadro de investigação', 'Fotos de três desaparecidos ligadas por fios vermelhos a um mesmo endereço.')],
        ['poster_sigil', 'l', 1, 3.9, 2.1],
        ['sconce', 'l', 1, 4.6, 2.3],
        ['notes_wall', 'l', 1, 7.2, 2.0],
        ['sconce', 'l', 1, 8.9, 2.3],
        ['wall_shelf', 'r', 0, 2.0, 2.5],
        ['antlers', 'r', 0, 4.0, 3.0],
        ['clock', 'r', 0, 6.0, 3.1],
        ['window_barred', 'r', 0, 8.0, 2.1],
        ['pipes', 'r', 0, 10.0, 3.9],
        ['sconce', 'r', 0, 11.3, 2.4],
        ['door_sealed', 'r', 0, 12.35, 0.08, hint('gear', 'Porta Selada', 'O sigilo pintado na porta ainda está úmido. Alguém esteve aqui há pouco.')],
      ],
      0.55,
    ),
  );

  db.rooms.push(
    buildRoom(
      db,
      'Saguão CROMA',
      'Ponto de encontro. Todo mundo pode construir.',
      'saguao',
      [
        ['rug_worn', 7, 6, 0],
        ['sofa_leather', 3, 5, 2],
        ['sofa_leather', 3, 9, 2],
        ['table_small', 5, 7, 0],
        ['candles', 5, 7, 0],
        ['plant', 1, 3, 2],
        ['plant', 16, 3, 0],
        ['floor_lamp', 1, 12, 2],
        ['candelabra', 4, 1, 0],
        ['candelabra', 13, 1, 0],
        ['bookshelf', 7, 0, 4],
        ['bookshelf', 9, 0, 4],
        ['barrel', 15, 12, 0],
        ['crate_wood', 16, 12, 0],
        ['crate_wood', 16, 13, 0],
        ['chair_wood', 12, 7, 6],
        ['chair_wood', 12, 8, 6],
        ['table_small', 11, 7, 0],
        ['table_small', 11, 8, 0],
        ['mug', 11, 7, 0],
      ],
      [
        ['window_barred', 'r', 0, 3.0, 2.5],
        ['window_barred', 'r', 0, 12.0, 2.5],
        ['clock', 'r', 0, 8.5, 3.6],
        ['poster_sigil', 'l', 1, 6.0, 2.0],
        ['sconce', 'l', 1, 10.5, 2.3],
        ['sconce', 'r', 0, 6.0, 3.0],
        ['sconce', 'r', 0, 11.0, 3.0],
      ],
      0.45,
    ),
  );

  db.rooms.push(
    buildRoom(
      db,
      'Sala de Interrogatório',
      'Uma mesa, duas cadeiras e uma lâmpada.',
      'interrogatorio',
      [
        ['table_small', 3, 2, 0],
        ['desk_lamp', 3, 2, 4],
        ['chair_wood', 3, 1, 4],
        ['chair_wood', 3, 3, 0],
        ['blood_drops', 5, 4, 0],
        ['cabinet_file', 6, 0, 4],
      ],
      [
        ['window_barred', 'r', 0, 4.5, 2.3],
        ['notes_wall', 'l', 1, 4.3, 2.0],
      ],
      0.7,
    ),
  );

  return db;
}
