/**
 * Acesso de mestre. O link do mestre traz ?mestre=CHAVE: a chave fica guardada
 * neste navegador e sai da barra de endereço (para não aparecer num
 * compartilhamento de tela). ?jogador abre como jogador mesmo com a chave guardada.
 */
const KEY = 'croma.gmKey';

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
  if (url.searchParams.has('jogador')) return undefined;
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
