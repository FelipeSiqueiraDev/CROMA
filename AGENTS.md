# CROMA — guia para quem trabalha no código (Claude e Codex)

## O que é

Tabuleiro digital isométrico para sessões de **Ordem Paranormal RPG**. O mestre controla a sessão e os jogadores acompanham na mesma sessão; a tela principal (MAPA) segue a referência `docs/ref-mapa.webp` (1536×1024). O plano do MVP está em `docs/guia-mvp.html`; o contrato entre interface e servidor, em `docs/CONTRATO.md`.

## Rodar

```bash
npm install
npm run dev        # cliente em http://localhost:5173 + servidor em http://localhost:3001
npm run typecheck  # shared, server e client (inclui os testes)
npm test           # regras da sessão (server/test)
npm run build
npm start          # produção: tudo servido pela porta 3001 (ou PORT / CROMA_PORT)
```

- Ao subir, o servidor imprime o **link do mestre** (`?mestre=CHAVE`) e o dos jogadores. Sem a chave, a pessoa entra como jogador e só acompanha. A chave fica em `server/data/db.json` (`gmKey`).
- Em desenvolvimento, `?auto=Nome` entra direto: mestre em `http://localhost:5173/?auto=Mestre&mestre=CHAVE` (depois do primeiro uso a chave fica guardada no navegador) e jogador em `http://localhost:5173/?auto=Mesa&jogador`.
- O Vite faz proxy de `/ws`, `/api` e `/uploads` para o servidor.
- Os dados ficam em `server/data/` (fora do git). Apagar a pasta recria a campanha de exemplo.
- A pasta do projeto fica no OneDrive: o Vite usa polling para perceber mudanças.

## Estrutura

| Pasta | O que tem |
|---|---|
| `shared/src/` | Tipos e regras usados pelos dois lados: mensagens entre cliente e servidor (`protocol.ts`), cenas e objetos (`room.ts`, `furni.ts`), campanha, itens e registro (`rpg.ts`), caminho (`pathfinding.ts`), planta (`heightmap.ts`, `layouts.ts`) |
| `server/src/` | Servidor autoritativo: conexões, campanhas e cenas (`hotel.ts`), cena ao vivo com peças, movimento a cada 500 ms, itens, entregas e registro (`roomInstance.ts`), persistência em JSON (`db.ts`), conteúdo de exemplo (`seed.ts`) |
| `client/src/room/`, `client/src/render/` | Motor do tabuleiro: canvas isométrico, luz, névoa, sprites |
| `client/src/ui/` | Interface: tela MAPA (`shell.ts`, `shell.css`), papel desenhado (`paperArt.ts`), animações (`motion.ts`), sons (`sfx.ts`), bilhetes de confirmação (`note.ts`), janelas |
| `shared/src/session.ts` | Contrato da sessão: `Session`, `Scene`, `Token`, `Character`, `Item`, `Objective`, `GameEvent`, ações e conversão casa ↔ ponto 0..1 |
| `client/src/session/` | `SessionStore` (estado da sessão e ações para a interface) e chave do mestre |
| `client/src/net.ts`, `client/src/ui/app.ts` | Conexão com o servidor e estado do cliente |
| `server/test/` | Testes das regras (`npm test`) |
| `client/src/main.ts` | Liga rede, estado e interface (trata as mensagens do servidor) |
| `docs/` | Referências visuais e o guia do MVP |

## Divisão de trabalho

- **Codex — visual e interação da tela:** `client/src/ui/**`, `client/src/room/**`, `client/src/render/**`, `client/src/style.css`, `client/index.html` e a arte.
- **Claude — funcionamento:** `shared/**`, `server/**`, `client/src/session/**`, `client/src/net.ts` e `client/src/ui/app.ts` (sessão, permissões, persistência, sincronização, regras de inventário e registro).
- `client/src/main.ts` e `shared/src/protocol.ts` são a fronteira entre os dois: mudança ali é descrita no pull request antes de o outro lado depender dela.
- Ninguém reescreve do zero o que o outro fez; a mudança é proposta no pull request.

## Como trabalhar

- Cada um em sua branch (`claude/...` ou `codex/...`), com pull request para `main`. Nada de push direto na `main`.
- Antes de começar, atualizar a branch com a `main`.
- Antes de abrir o pull request: `npm run typecheck`, `npm test` e `npm run build` sem erros.
- Textos da interface, comentários e mensagens de commit em português.

## Estado em 29/09/2026

- Tela MAPA completa com dados de exemplo: campanha "Sombras de Arvendal", 7 cenas da Mansão Alvarez, Arthur, Cora, Miguel e Teps.
- O tabuleiro ainda é desenhado por código. O plano é trocar por cenas em imagem (ver `docs/guia-mvp.html`).
- Mestre e jogadores na mesma sessão: o jogador segue a cena que o mestre abrir e acompanha em tempo real as peças, as entregas, os objetivos e o registro. O servidor recusa qualquer ação de jogador. Abrir duas janelas com o mesmo nome derruba a mais antiga (jogador não derruba o mestre).
- O contrato (`docs/CONTRATO.md`) e o `SessionStore` existem; a tela MAPA atual ainda usa as mensagens antigas.
- Para o jogador, a tela ainda mostra o menu da engrenagem e textos de mestre ("clique no chão para ele andar"): o servidor recusa as ações, mas a interface deveria esconder.
- Os bilhetes de confirmação (`client/src/ui/note.ts`) e o carimbo SUCESSO/FALHA ainda não têm estilo.
- Testes automáticos só das regras da sessão (`server/test/session.test.ts`).
