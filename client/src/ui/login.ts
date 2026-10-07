import { randomLook, sanitizeLook, type AvatarLook } from '@crona/shared';

const KEY = 'crona.login';

/** Nome e aparência salvos neste navegador (o mestre entra com eles). */
export function loadLogin(): { name: string; look: AvatarLook } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { name: typeof o.name === 'string' ? o.name : '', look: sanitizeLook(o.look) };
    }
  } catch {
    /* sem storage */
  }
  return { name: '', look: { ...randomLook(), charId: null } };
}

export function saveLogin(name: string, look: AvatarLook) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, look }));
  } catch {
    /* sem storage */
  }
}
