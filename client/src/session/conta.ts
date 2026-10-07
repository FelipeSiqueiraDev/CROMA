import type { PapelConta } from '@crona/shared';

/**
 * A sessão da conta neste aparelho (tela de entrada): o código que o servidor deu ao entrar,
 * o nome e o papel. Vai no login; "Encerrar sessão" esquece.
 */
export interface SessaoConta {
  sessao: string;
  nome: string;
  papel: PapelConta;
}

const CHAVE = 'crona.sessao';

export function lerSessao(): SessaoConta | null {
  try {
    const o = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as SessaoConta | null;
    return o && typeof o.sessao === 'string' && (o.papel === 'mestre' || o.papel === 'jogador') ? o : null;
  } catch {
    return null;
  }
}

export function guardarSessao(s: SessaoConta) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(s));
  } catch {
    /* sem armazenamento: vale só nesta aba */
  }
}

export function esquecerSessao() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
}
