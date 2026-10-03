import type { LogIcon, LootKind } from '@crona/shared';

let uid = 0;

/** Ícones "pintados" dos itens (SVG com gradientes e contorno escuro). */
const ART: Record<LootKind, (id: string) => string> = {
  weapon: (id) => `
    <defs><linearGradient id="b${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9eef2"/><stop offset=".55" stop-color="#9aa3ab"/><stop offset="1" stop-color="#5d656c"/></linearGradient>
    <linearGradient id="h${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b4226"/><stop offset="1" stop-color="#3a2212"/></linearGradient></defs>
    <path d="M44 6 L56 8 L30 36 L25 31 Z" fill="url(#b${id})" stroke="#1b1612" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M47 9 L53 10 L31 33" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>
    <path d="M22 30 L32 40 L29 43 L19 33 Z" fill="#8a8f94" stroke="#1b1612" stroke-width="1.4"/>
    <path d="M24 38 L12 52 Q9 56 12 58 Q15 60 18 56 L29 43 Z" fill="url(#h${id})" stroke="#1b1612" stroke-width="1.6"/>
    <circle cx="19" cy="48" r="1.4" fill="#c9a86a"/><circle cx="15" cy="53" r="1.4" fill="#c9a86a"/>`,
  document: (id) => `
    <defs><linearGradient id="p${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe4c8"/><stop offset="1" stop-color="#c9b88f"/></linearGradient></defs>
    <path d="M14 8 L44 6 L50 14 L52 56 L40 53 L30 57 L20 54 L12 56 Z" fill="url(#p${id})" stroke="#2a2018" stroke-width="1.6" stroke-linejoin="round" transform="rotate(-6 32 32)"/>
    <g stroke="#6b5a45" stroke-width="1.6" stroke-linecap="round" transform="rotate(-6 32 32)"><line x1="19" y1="19" x2="44" y2="18"/><line x1="19" y1="26" x2="45" y2="25"/><line x1="19" y1="33" x2="40" y2="32"/><line x1="19" y1="40" x2="43" y2="39"/></g>
    <path d="M44 6 L44 14 L50 14" fill="#d8c9a5" stroke="#2a2018" stroke-width="1.4" transform="rotate(-6 32 32)"/>`,
  key: (id) => `
    <defs><linearGradient id="k${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2cf7c"/><stop offset=".5" stop-color="#b8883a"/><stop offset="1" stop-color="#6e4c18"/></linearGradient></defs>
    <circle cx="20" cy="20" r="11" fill="none" stroke="#1b1612" stroke-width="7"/>
    <circle cx="20" cy="20" r="11" fill="none" stroke="url(#k${id})" stroke-width="4.4"/>
    <path d="M27 27 L50 50" stroke="#1b1612" stroke-width="7" stroke-linecap="round"/>
    <path d="M27 27 L50 50" stroke="url(#k${id})" stroke-width="4" stroke-linecap="round"/>
    <path d="M44 44 L38 50 M50 50 L44 56 M40 40 L36 44" stroke="#1b1612" stroke-width="6" stroke-linecap="round"/>
    <path d="M44 44 L38 50 M50 50 L44 56 M40 40 L36 44" stroke="url(#k${id})" stroke-width="3" stroke-linecap="round"/>`,
  letter: (id) => `
    <defs><linearGradient id="e${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ead9b8"/><stop offset="1" stop-color="#c8b389"/></linearGradient></defs>
    <rect x="8" y="16" width="48" height="33" rx="2" fill="url(#e${id})" stroke="#2a2018" stroke-width="1.8"/>
    <path d="M8 18 L32 36 L56 18" fill="none" stroke="#6b5a45" stroke-width="1.8"/>
    <path d="M8 49 L26 33 M56 49 L38 33" stroke="#8c7a5e" stroke-width="1.2"/>
    <circle cx="32" cy="36" r="5" fill="#9b1d16" stroke="#3a0806" stroke-width="1.2"/>`,
  potion: (id) => `
    <defs><linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9e4e8" stop-opacity=".75"/><stop offset=".6" stop-color="#9fb0b6" stop-opacity=".55"/><stop offset="1" stop-color="#5d6b70" stop-opacity=".8"/></linearGradient>
    <linearGradient id="l${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d23a2e"/><stop offset="1" stop-color="#6e0f0a"/></linearGradient></defs>
    <rect x="26" y="6" width="12" height="9" rx="2" fill="#a7784a" stroke="#1b1612" stroke-width="1.5"/>
    <path d="M27 15 L27 22 Q16 28 16 42 Q16 56 32 56 Q48 56 48 42 Q48 28 37 22 L37 15 Z" fill="url(#g${id})" stroke="#1b1612" stroke-width="1.8"/>
    <path d="M18 38 Q32 34 46 38 Q47 55 32 54 Q17 55 18 38 Z" fill="url(#l${id})"/>
    <path d="M22 28 Q20 34 21 40" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect x="21" y="41" width="22" height="9" rx="1" fill="#e8dcc0" stroke="#3a2e22" stroke-width=".8"/>`,
  tape: (id) => `
    <defs><linearGradient id="t${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8d2c6"/><stop offset=".6" stop-color="#a39d92"/><stop offset="1" stop-color="#6f6a62"/></linearGradient></defs>
    <path d="M9 33 v8 a23 15 0 0 0 46 0 v-8" fill="#7b766e" stroke="#1b1612" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="32" cy="33" rx="23" ry="15" fill="url(#t${id})" stroke="#1b1612" stroke-width="1.8"/>
    <ellipse cx="32" cy="33" rx="11" ry="7" fill="#2a2622" stroke="#1b1612" stroke-width="1.4"/>
    <path d="M16 28 Q24 22 36 22" stroke="#fff" stroke-opacity=".45" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  box: (id) => `
    <defs><linearGradient id="x${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c0392b"/><stop offset="1" stop-color="#6e1510"/></linearGradient></defs>
    <path d="M10 22 L32 12 L54 22 L54 46 L32 56 L10 46 Z" fill="url(#x${id})" stroke="#1b1612" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M10 22 L32 32 L54 22 M32 32 L32 56" fill="none" stroke="#3a0806" stroke-width="1.6"/>
    <path d="M21 17 L43 27" stroke="#e8dcc0" stroke-width="3"/>
    <rect x="37" y="36" width="10" height="7" fill="#e8dcc0" transform="skewY(-24) translate(0 22)" opacity=".85"/>`,
  misc: (id) => `
    <defs><radialGradient id="m${id}" cx=".4" cy=".35"><stop offset="0" stop-color="#8a6a45"/><stop offset="1" stop-color="#3e2a18"/></radialGradient></defs>
    <path d="M22 18 Q32 10 42 18 L46 22 Q56 34 50 48 Q44 58 32 58 Q20 58 14 48 Q8 34 18 22 Z" fill="url(#m${id})" stroke="#1b1612" stroke-width="1.8"/>
    <path d="M22 20 Q32 26 42 20" fill="none" stroke="#c9a86a" stroke-width="2"/>`,
};

export function lootIcon(kind: LootKind, size = 48): SVGSVGElement {
  const id = `li${++uid}`;
  const span = document.createElement('span');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${(ART[kind] ?? ART.misc)(id)}</svg>`;
  return span.firstElementChild as SVGSVGElement;
}

const LOG_ART: Record<LogIcon, string> = {
  user: '<circle cx="12" cy="8.2" r="4.2"/><path d="M4.5 20.5c.8-4.4 3.7-6.6 7.5-6.6s6.7 2.2 7.5 6.6"/>',
  give: '<path d="M3 15.5l4.6-3.6 4.4 2.6 5-1.6 1.8 2.5-6.4 3.6-5.4-.8-2.8 1.9z"/><path d="M14.5 4.5l4 4-4 4-4-4z"/>',
  dice: '<path d="M12 2.8l8.2 4.6v9.2L12 21.2l-8.2-4.6V7.4z"/><path d="M3.8 7.4L12 12l8.2-4.6M12 12v9.2"/>',
  scene: '<path d="M6 21V4l8-1.5V21"/><path d="M14 4.5l4 1V21"/><path d="M11 12.5v1"/>',
  obj: '<path d="M4.5 12.5l4.5 4.5L19.5 6.5"/>',
};

export function logIcon(k: LogIcon, size = 16): SVGSVGElement {
  const span = document.createElement('span');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LOG_ART[k] ?? LOG_ART.user}</svg>`;
  return span.firstElementChild as SVGSVGElement;
}
