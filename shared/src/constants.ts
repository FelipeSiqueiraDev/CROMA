/** Duração de um passo (servidor autoritativo, igual ao ciclo clássico de 500ms). */
export const TICK_MS = 500;
/** Diferença máxima de altura para subir um degrau. */
export const MAX_STEP_UP = 1.5;
/** Diferença máxima de altura para descer. */
export const MAX_STEP_DOWN = 3;
export const MAX_CHAT = 140;
export const MAX_NAME = 16;
/** Nome de personagem (peça): cabe nome e sobrenome. */
export const MAX_TOKEN_NAME = 24;
/** Altura máxima de empilhamento de mobis. */
export const STACK_LIMIT = 12;
/** Altura das paredes (em unidades de altura) acima do piso mais alto. */
export const WALL_HEIGHT = 5;
/** Pixels de tela (eixo x) por tile ao longo de uma parede. */
export const WALL_PX_PER_TILE = 32;
/** Pixels de tela por unidade de altura. */
export const Z_PX = 32;
/**
 * Escala do mundo: unidades de altura por metro. O personagem (~1,75 m) tem
 * ~104 px na tela e a parede (5 unidades) ~2,8 m; os mobis são medidos em
 * metros e convertidos com isto (mesa 0,8 m, estante 2,2 m, porta 2,15 m).
 */
export const Z_PER_M = 1.8;
export const MAX_ROOM_SIZE = 40;
