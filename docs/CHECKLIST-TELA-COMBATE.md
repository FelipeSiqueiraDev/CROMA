# Checklist: tela COMBATE igual à referência

Para a tela ficar como `docs/referencias/combate.webp`. Marque com `x` o que ficar pronto (`- [x]`).

- **Você:** arte feita com o ChatGPT/Codex, ou um dado e uma decisão que só você tem.
- **Claude:** código.

Tamanhos já no **dobro** (é o tamanho de entrega). PNG com fundo transparente, sem texto e sem número pintado; sombra em volta da peça não vai (o jogo faz), sombras internas vão. Detalhes em `docs/ARTE.md` e `docs/TELA-COMBATE.md`.

Enquanto a arte não chega, a tela funciona com o desenho padrão: papéis desenhados em código, ícones de linha (Lucide) e marcações do tabuleiro desenhadas em código. Quando um arquivo chega na pasta, o jogo usa na hora (`/api/arte`).

---

## 1. Antes de tudo

- [x] **Claude:** guardar a referência em `docs/referencias/combate.webp` (com o emblema oficial coberto; a original fica fora do git)
- [x] **Claude:** a tela na mesma escala das outras (desenho em 1672×941, 1rem = 10 px)
- [x] **Você:** decidir quem mexe na tela: só o mestre; os jogadores assistem na mesa (30/09)

## 2. Papéis

Os mesmos da FICHAS e do MAPA (`papel-painel.png`, `placa-escura.png`). Nada novo aqui: quando eles chegarem, entram nos seis painéis desta tela também.

## 3. Retratos e peças dos inimigos

Ameaças no **mesmo formato dos agentes**, na pasta `client/public/arte/personagens/<id>/` (a lista completa, para o Codex, está em [`CHECKLIST-ARTE.md`](CHECKLIST-ARTE.md), seção 8).

- [ ] **Você:** folha de sprite de cada ameaça, `personagens/<id>/folha.png`, no formato das folhas dos agentes (`docs/ARTE.md`, seção 1) (ex.: `ocultista`, `acolito`)
- [ ] **Você:** retrato de cada ameaça, `personagens/<id>/retrato-desarmado.png` (e, se quiser, `-machucado` e `-olhos-fechados`), no estilo dos retratos dos agentes
- [ ] **Claude:** cadastrar cada ameaça que chegar (a folha e o retrato passam a valer para a peça)
- [x] **Claude:** sem folha, a peça usa o avatar padrão, com a base vermelha do lado

## 4. Marcações do tabuleiro

Pasta: `client/public/arte/combate/`. Vistas no ângulo do tabuleiro (isométrico), no tamanho de uma casa (ou de quatro, quando indicado).

- [ ] **Você (opcional):** `base-agente.png` e `base-inimigo.png`, 256×128, o anel de luz embaixo da peça (ciano e vermelho). Sem elas, o jogo desenha o anel
- [ ] **Você (opcional):** `mira.png`, 256×256, a mira vermelha em volta do alvo
- [ ] **Você (opcional):** `circulo-ritual.png`, 512×256, o círculo de símbolos no chão (ritual sustentado ou em conjuração). Crie símbolos próprios: os oficiais são de Ordem Paranormal e o repositório é público
- [x] **Claude (padrão):** linha até o alvo com a etiqueta, anéis de alcance, casas do movimento, áreas (esfera, cone, linha, cubo), escudo da cobertura e caveira do morrendo, tudo desenhado em código

## 5. Carimbo do resultado

- [ ] **Você:** `client/public/arte/combate/carimbo.png`, 520×280, a moldura de um carimbo de borracha vermelho, meio falhado, **sem texto** (o jogo escreve ERROU, ACERTO ou ACERTO CRÍTICO ×3 por cima)
- [x] **Claude:** o carimbo desenhado em código até a arte chegar, com a animação de bater na tela

## 6. Ícones

A biblioteca Lucide cobre quase tudo (espadas, escudo, dado, régua, alvo, sol, névoa, montanha, ampulheta, relógio, setas, caveira). Arte própria só se quiser igual à referência:

- [ ] **Você (opcional):** `client/public/arte/icones/` 128×128: `atrasar.png`, `preparar.png`, `passar-turno.png`, `manobra.png`, `ritual.png`, `habilidade.png`, `movimento.png`, `caido.png`, `morrendo.png`, `sustentado.png`
- [x] **Claude:** o resto com a biblioteca

## 7. O que é código (Claude)

- [x] Estado do combate no servidor (etapa A do `COMBATE.md`): participantes, lados, surpresa, Iniciativa, rodada, turno, atrasar, preparar, registro e desfazer
- [x] Ordem de iniciativa com o turno do mestre agrupado e os ícones de estado
- [x] Efeitos e pendências do começo do turno (o que a etapa A já sabe: morrendo, enlouquecendo, surpresa, quem chega, ações preparadas)
- [x] Tabuleiro do combate (o mesmo motor da tela MAPA) com as marcações: base por lado, deitado, caveira, círculo de ritual, anel de alcance, linha até o alvo, cobertura, mira, medir e área
- [x] Resolução do ataque: faixa de quem age, abas, passos, arma, situação, rolagem com o carimbo e dano, com Desfazer e Confirmar
- [x] Resolução das outras abas com passos próprios: manobra com teste oposto e ritual com resistências e Custo do Paranormal (30/09)
- [x] As 74 ameaças do livro na ficha rápida ("Do livro"), com ataques ×N e presença perturbadora (30/09)
- [x] Registro com filtro, destaque, notas e desfazer
- [x] Alvo da ameaça com a ficha rápida do mestre (o catálogo do livro fica para a etapa H)
- [x] Os estados sem referência: sem combate, montar o combate e fim
- [x] A mesa mostrando o que é público durante o combate: a vez, a ordem, os caídos, a linha do ataque e o carimbo
- [ ] Captura lado a lado com a referência e os ajustes finos (segunda passada em 30/09; falta a arte)
