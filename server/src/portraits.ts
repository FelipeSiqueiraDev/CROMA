import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIR_KEYS, PORTRAIT_STATES, type CharacterDef, type DirKey, type PortraitArt, type PortraitState } from '@croma/shared';

/** Pasta das artes dos personagens no repositório (servida em /arte/personagens). */
const ART_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/public/arte/personagens');
const EXTS = ['png', 'webp', 'jpg', 'jpeg'];
/** Subpasta das poses do tabuleiro, dentro da pasta do personagem. */
const POSES_DIR = 'tabuleiro-32bits';

/**
 * Procura, na subpasta `sub` da pasta do personagem da folha `sheet`, a imagem
 * de cada nome (sem extensão). null = a folha não é do repositório ou a pasta não existe.
 */
function finder(sheet: string, dir: string, sub = ''): ((base: string) => string | undefined) | null {
  const m = /^\/arte\/personagens\/([a-z0-9-]+)\//.exec(sheet);
  if (!m) return null;
  let files: string[];
  try {
    files = fs.readdirSync(path.join(dir, m[1], sub));
  } catch {
    return null;
  }
  const has = new Set(files.map((f) => f.toLowerCase()));
  const url = `/arte/personagens/${m[1]}/${sub ? `${sub}/` : ''}`;
  return (base) => {
    const ext = EXTS.find((e) => has.has(`${base}.${e}`));
    return ext ? `${url}${base}.${ext}` : undefined;
  };
}

/**
 * Retratos por estado na pasta do personagem da folha `sheet`
 * (/arte/personagens/<nome>/...): retrato-<estado>.png e, para piscar,
 * retrato-<estado>-olhos-fechados.png. Folhas enviadas pela janela não têm.
 */
export function findPortraits(sheet: string, dir = ART_DIR): CharacterDef['portraits'] {
  const find = finder(sheet, dir);
  if (!find) return undefined;
  const out: Partial<Record<PortraitState, PortraitArt>> = {};
  for (const s of PORTRAIT_STATES) {
    const open = find(`retrato-${s}`);
    if (!open) continue;
    const closed = find(`retrato-${s}-olhos-fechados`);
    out[s] = closed ? { open, closed } : { open };
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Poses do tabuleiro (arte em 32 bits) por estado e direção, em
 * /arte/personagens/<nome>/tabuleiro-32bits/: idle-<estado>-<direção>.png.
 * Sem a direção no nome (idle-<estado>.png), é a frente voltada para a direita (`se`).
 */
export function findPoses(sheet: string, dir = ART_DIR): CharacterDef['poses'] {
  const find = finder(sheet, dir, POSES_DIR);
  if (!find) return undefined;
  const out: Partial<Record<PortraitState, Partial<Record<DirKey, string>>>> = {};
  for (const s of PORTRAIT_STATES) {
    const dirs: Partial<Record<DirKey, string>> = {};
    for (const k of DIR_KEYS) {
      const url = find(`idle-${s}-${k}`) ?? (k === 'se' ? find(`idle-${s}`) : undefined);
      if (url) dirs[k] = url;
    }
    if (Object.keys(dirs).length) out[s] = dirs;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Atualiza os retratos e as poses do tabuleiro de todos os personagens. Devolve true se algo mudou. */
export function refreshPortraits(list: CharacterDef[], dir = ART_DIR): boolean {
  let changed = false;
  for (const def of list) {
    const portraits = findPortraits(def.sheet, dir);
    const poses = findPoses(def.sheet, dir);
    if (JSON.stringify([portraits, poses]) === JSON.stringify([def.portraits, def.poses])) continue;
    if (portraits) def.portraits = portraits;
    else delete def.portraits;
    if (poses) def.poses = poses;
    else delete def.poses;
    changed = true;
  }
  return changed;
}
