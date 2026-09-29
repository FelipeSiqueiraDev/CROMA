/**
 * Acesso de mestre. O computador que roda o servidor já é o mestre. Em outro
 * aparelho, o link do mestre traz ?mestre=CHAVE: a chave fica guardada neste
 * navegador e sai da barra de endereço. ?mesa (ou ?jogador) abre a tela da mesa
 * mesmo num navegador que é de mestre.
 */
const KEY = 'croma.gmKey';
const TABLE_NAME = 'croma.mesaNome';

/** O link pede a tela da mesa de propósito (?mesa ou ?jogador). */
export function tableRequested() {
  const q = new URLSearchParams(location.search);
  return q.has('mesa') || q.has('jogador');
}

/** Nome desta tela da mesa no servidor ("Mesa 4K2Q"), o mesmo a cada recarga. */
export function tableName(fresh = false): string {
  const make = () => `Mesa ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  try {
    const saved = localStorage.getItem(TABLE_NAME);
    if (saved && !fresh) return saved;
    const name = make();
    localStorage.setItem(TABLE_NAME, name);
    return name;
  } catch {
    return make();
  }
}

/** Chave a mandar no login (undefined = entrar como jogador). */
export function readGmKey(): string | undefined {
  const url = new URL(location.href);
  const fromUrl = url.searchParams.get('mestre');
  if (fromUrl !== null) {
    try {
      localStorage.setItem(KEY, fromUrl);
    } catch {
      /* sem armazenamento: vale só nesta aba */
    }
    url.searchParams.delete('mestre');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  if (url.searchParams.has('jogador') || url.searchParams.has('mesa')) return undefined;
  if (fromUrl) return fromUrl;
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Esquece a chave guardada (quando o servidor não a aceita mais). */
export function forgetGmKey() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada guardado */
  }
}
