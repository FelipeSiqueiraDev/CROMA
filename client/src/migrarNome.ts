/**
 * O jogo mudou de nome (CROMA → CRONA, 03/10). O que cada aparelho guardou no navegador com o nome
 * antigo (a chave do mestre, a ficha do jogador, o nome, o som, a última cena) passa para o nome
 * novo, sem apagar o antigo. Roda antes de qualquer outro módulo (é o primeiro import do main.ts).
 */
try {
  // a lista primeiro: gravar no meio da volta muda a ordem das chaves e pulava algumas
  const velhas = Object.keys(localStorage).filter((k) => k.startsWith('croma.'));
  for (const velha of velhas) {
    const nova = 'crona.' + velha.slice('croma.'.length);
    const valor = localStorage.getItem(velha);
    if (valor !== null && localStorage.getItem(nova) === null) localStorage.setItem(nova, valor);
  }
} catch {
  // navegador sem armazenamento (aba privada, bloqueado): nada a migrar
}

export {};
