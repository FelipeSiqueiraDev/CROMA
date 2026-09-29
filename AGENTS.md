# CROMA — guia para quem trabalha no código (Claude e Codex)

## O que é

Tabuleiro digital isométrico para sessões de **Ordem Paranormal RPG**. São duas telas: a do **mestre** (a interface completa, só ele vê; a tela MAPA segue a referência `docs/ref-mapa.webp`, 1536×1024) e a da **mesa** (só o tabuleiro, num tablet que os jogadores olham, sem toque). O plano do MVP está em `docs/guia-mvp.html`; o contrato entre interface e servidor, em `docs/CONTRATO.md`.

## Rodar

```bash
npm install
npm run dev        # cliente em http://localhost:5173 + servidor em http://localhost:3001
npm run typecheck  # shared, server e client (inclui os testes)
npm test           # regras da sessão (server/test)
npm run build
npm start          # produção: tudo servido pela porta 3001 (ou PORT / CROMA_PORT)
```

- **Mestre:** o computador que roda o servidor. Abre direto a interface em `http://localhost:5173`, sem login.
- **Mesa (tablet):** `http://IP-deste-computador:5173/?mesa`. O servidor imprime o link ao subir. Na primeira vez, o Windows pode pedir para liberar o Node no firewall.
- **Mestre em outro aparelho:** link com `?mestre=CHAVE`, também impresso pelo servidor. A chave fica em `server/data/db.json` (`gmKey`).
- Em desenvolvimento, `?auto=Nome` escolhe o nome do mestre.
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
| `docs/` | Referências visuais, o guia do MVP, o contrato da sessão (`CONTRATO.md`) e o guia de arte (`ARTE.md`) |
| `client/public/arte/` | Arte entregue pelo Codex (servida em `/arte/...`) |

## Divisão de trabalho

- **Codex — artista:** só arte. Personagens (folhas de sprite e retratos), móveis, cenários, ícones de itens, peças da interface (papéis, abas, botões, fitas) e efeitos. Entrega **arquivos de imagem** em `client/public/arte/`, no formato de `docs/ARTE.md`, e **não mexe no código**.
- **Claude — construtor:** todo o código. Servidor, tipos, interface, animações, tabuleiro e o encaixe da arte no jogo.
- Pedido de arte novo: entra em `docs/ARTE.md` (formato, tamanho, nome e pasta) antes de ser feito.

## Como trabalhar

- Cada um em sua branch (`claude/...` para código, `codex/arte-...` para arte), com pull request para `main`. Nada de push direto na `main`.
- Antes de começar, atualizar a branch com a `main`.
- Antes de abrir o pull request: `npm run typecheck`, `npm test` e `npm run build` sem erros.
- Textos da interface, comentários e mensagens de commit em português.

## Estado em 29/09/2026

- Tela MAPA completa com dados de exemplo: campanha "Sombras de Arvendal" e 7 cenas da Mansão Alvarez.
- O tabuleiro ainda é desenhado por código. O plano é trocar por cenas em imagem (ver `docs/guia-mvp.html`).
- Duas telas. A da mesa (`client/src/ui/table.ts`) só mostra o tabuleiro: sem painéis, sem ícones de pista e sem toque. Ela segue a cena que o mestre abrir e mostra o nome da cena ao trocar. O servidor recusa qualquer ação que venha da mesa.
- O contrato (`docs/CONTRATO.md`) e o `SessionStore` existem; a tela MAPA ainda usa parte das mensagens antigas.
- Personagens da demonstração com os nomes reais: D.Tepes, Catarina Albuquerque, Alosi Walker e Cora Falcão. As folhas de sprite (4 direções) estão em `client/public/arte/personagens/`; o motor já aceita folhas de 8 direções (`docs/ARTE.md`).
- O mestre gira o personagem parado com os botões ↺ ↻ das cartas do grupo, os do painel dele, ou as teclas Q e E.
- Os bilhetes de confirmação (`client/src/ui/note.ts`) e o carimbo SUCESSO/FALHA ainda não têm estilo.
- Testes automáticos só das regras da sessão (`server/test/session.test.ts`).
