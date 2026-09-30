import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTRAIT_STATES, type CharacterDef, type PortraitArt, type PortraitState } from '@croma/shared';

/** Pasta das artes dos personagens no repositório (servida em /arte/personagens). */
const ART_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/public/arte/personagens');
const EXTS = ['png', 'webp', 'jpg', 'jpeg'];

/**
 * Retratos por estado na pasta do personagem da folha `sheet`
 * (/arte/personagens/<nome>/...): retrato-<estado>.png e, para piscar,
 * retrato-<estado>-olhos-fechados.png. Folhas enviadas pela janela não têm.
 */
export function findPortraits(sheet: string, dir = ART_DIR): CharacterDef['portraits'] {
  const m = /^\/arte\/personagens\/([a-z0-9-]+)\//.exec(sheet);
  if (!m) return undefined;
  const folder = path.join(dir, m[1]);
  let files: string[];
  try {
    files = fs.readdirSync(folder);
  } catch {
    return undefined;
  }
  const has = new Set(files.map((f) => f.toLowerCase()));
  const find = (base: string) => {
    const ext = EXTS.find((e) => has.has(`${base}.${e}`));
    return ext ? `/arte/personagens/${m[1]}/${base}.${ext}` : undefined;
  };
  const out: Partial<Record<PortraitState, PortraitArt>> = {};
  for (const s of PORTRAIT_STATES) {
    const open = find(`retrato-${s}`);
    if (!open) continue;
    const closed = find(`retrato-${s}-olhos-fechados`);
    out[s] = closed ? { open, closed } : { open };
  }
  return Object.keys(out).length ? out : undefined;
}

/** Atualiza os retratos de todos os personagens. Devolve true se algo mudou. */
export function refreshPortraits(list: CharacterDef[], dir = ART_DIR): boolean {
  let changed = false;
  for (const def of list) {
    const next = findPortraits(def.sheet, dir);
    if (JSON.stringify(next) === JSON.stringify(def.portraits)) continue;
    if (next) def.portraits = next;
    else delete def.portraits;
    changed = true;
  }
  return changed;
}
