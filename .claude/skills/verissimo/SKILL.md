---
name: verissimo
description: Confere com os livros de Ordem Paranormal só o que mudou desde a última conferência — código e documentos de regra e as fichas (NEX novo, escolhas trocadas, números que mudaram). Só quando o usuário digitar /verissimo.
argument-hint: "[codigo | fichas | <ficha>] [tudo] | base | historico"
disable-model-invocation: true
context: fork
agent: verissimo
allowed-tools: Bash(npx tsx *) Bash(python *) Bash(git diff *) Bash(git log *) Bash(git show *) Bash(git status *) Read Grep Glob Write Edit
---

Pedido do /verissimo. Argumentos: `$ARGUMENTS` (vazio = conferir tudo o que mudou).

## O que mudou desde a última conferência

!`npx tsx "${CLAUDE_SKILL_DIR}/verissimo.ts" pendente $ARGUMENTS`

## Sua tarefa

Conforme os argumentos:

- **vazio, `codigo`, `fichas` ou o nome de uma ficha:** confira, com os livros, só o que a lista acima mostra, seguindo o seu método. Depois escreva o relatório, atualize `docs/verissimo/ABERTOS.md` e `docs/verissimo/CONFERIDO.md` e registre a conferência com o comando `marcar` da seção "Ao terminar".
- **com `tudo`** (ex.: `tudo Catarina`): a lista acima mostra o estado inteiro do alvo, e não só o que mudou. Confira o alvo inteiro, do mesmo jeito.
- **`base`:** não confira nada. Registre o estado de agora como já conferido, com `npx tsx .claude/skills/verissimo/verissimo.ts base --nota "<motivo>"`, e responda em uma linha.
- **`historico`:** responda com a lista de conferências acima, sem conferir nada.

Se a lista disser que nada mudou, responda só isso, em uma linha.
