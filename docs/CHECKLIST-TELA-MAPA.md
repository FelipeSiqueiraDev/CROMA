# Checklist: tela MAPA igual à referência

Para a tela ficar como `docs/referencias/mapa.webp`. Marque com `x` o que ficar pronto (`- [x]`).

- **Você:** arte feita com o ChatGPT/Codex, ou um dado e uma decisão que só você tem.
- **Claude:** código.

Tamanhos já no **dobro** (é o tamanho de entrega). PNG com fundo transparente, sem texto e sem ícone pintado; sombra em volta da peça não vai (o jogo faz), sombras internas (dobra, mancha, queimado) vão. Detalhes em `docs/ARTE.md` e `docs/TELA-MAPA.md`.

**Combinado:** a arte vem toda de uma vez, quando a sua parte do checklist estiver pronta. Até lá, a tela usa o desenho padrão (papel, ícones e móveis desenhados em código), já na disposição da referência. Quando um arquivo chega na pasta, o jogo usa na hora (o servidor lista a arte que existe: `/api/arte`). Por onde começar a arte: os papéis (item 2) mudam a tela inteira; depois os móveis da Sala de Tecnologia (item 7).

---

## 1. Antes de tudo

- [x] **Claude:** guardar a imagem de referência em `docs/referencias/mapa.webp` (com o emblema oficial coberto; a original fica fora do git)
- [x] **Claude:** guardar o logo em `client/public/arte/local/logo-ordem.png` (fora do git)
- [x] **Claude:** tela em 16:9 (desenho em 1672×941, a medida da referência), escalando para qualquer monitor
- [x] **Claude:** fontes no projeto: Cinzel, Courier Prime, Caveat, Special Elite (e Roboto Serif e Roboto Condensed na FICHAS)
- [x] **Claude:** ícones de linha (Lucide) nas partes novas

## 2. Papéis (a cara da tela)

Pasta: `client/public/arte/interface/`. Papel envelhecido, borda rasgada, manchas leves; cada um um pouco diferente.

- [ ] **Você:** `papel-planta.png`, 1080×640, com a folha de trás aparecendo no canto de cima
- [ ] **Você:** `papel-sala.png`, 1080×370, mais claro
- [ ] **Você:** `papel-objeto.png`, 1080×580
- [ ] **Você:** `papel-rpg.png`, 780×1580, a folha grande da direita
- [ ] **Você:** `papel-inventario.png`, 1170×300
- [ ] **Você:** `carta-player.png`, 740×320, cartão claro de cada personagem; 48 px de borda sem detalhe único (o jogo estica o meio)
- [ ] **Claude:** encaixar os papéis nos painéis (hoje são desenhados em código)

## 3. Peças soltas

Pasta: `client/public/arte/interface/`.

- [ ] **Você:** `clipe.png`, 52×124, clipe de metal (hoje: desenhado em código)
- [ ] **Você:** `fita-1.png`, `fita-2.png`, `fita-3.png`, ~160×44, fita crepe translúcida
- [ ] **Você:** `rosa-dos-ventos.png`, 180×180, a nanquim, com o "N" (hoje: desenho padrão em código)
- [ ] **Você:** `pilha-papeis.png`, 600×520, fichas e papéis carimbados (hoje: três papéis desenhados)
- [ ] **Você (opcional):** `fundo-mesa.jpg`, 1920×1080, fundo quase preto com textura suave
- [ ] **Você (opcional):** `asas-marca.png`, 160×120, asas bem apagadas

## 4. Barra do topo

- [x] **Claude:** faixa escura com filete embaixo
- [x] **Claude:** emblema com "ORDO REALITAS / SEDE DA ORDEM" (Cinzel)
- [x] **Claude:** botões MAPA, COMBATE e FICHAS, com o ativo em vermelho
- [x] **Claude:** pena apagada e o nome da operação (aparece quando a campanha tem operação)
- [x] **Claude:** "SEDE DA ORDEM / ANDAR SUBSOLO": campanha e andar da cena aberta
- [x] **Claude:** botões quadrados: clima, configurações, objetivos e registro (documento) e sair (vermelho)
- [x] **Claude:** campo para o nome da operação (clique no emblema: "Operação em andamento")
- [ ] **Você:** o nome da operação atual (ex.: "Fulgor")

## 5. Coluna da esquerda

Planta:
- [x] **Claude:** título do andar e as etiquetas TÉRREO / SUBSOLO
- [x] **Claude:** salas em cinza com textura de pedra, contorno grosso e portas
- [x] **Claude:** sala atual em vermelho; nome das salas
- [x] **Claude:** alfinete na sala atual e o nome das salas em plaquinhas (o alfinete troca pela arte `interface/alfinete.png` quando ela chegar)
- [x] **Claude:** rosa dos ventos (desenho padrão)
- [x] **Claude:** anotações à mão na planta (Caveat, inclinadas), que o mestre escreve: o lápis no canto da planta anota; arrastar move; dois cliques mudam ou apagam
- [ ] **Você:** as anotações de cada andar (ex.: "Instalações Técnicas", "Acesso Restrito")

Cartão da sala:
- [x] **Claude:** polaroid torta com a foto da sala e o clipe
- [ ] **Claude:** fitas nos cantos da polaroid (esperando `fita-*.png`)
- [x] **Claude:** traço vermelho, título e descrição
- [x] **Claude:** plaquinhas com ícones (andar; hoje a segunda mostra quantos cômodos)
- [x] **Claude:** campo "área" em cada cena, em Configurar cena (a segunda plaquinha mostra a área)
- [ ] **Você:** a área de cada cômodo (ex.: "Área técnica")

Objeto selecionado:
- [x] **Claude:** título vermelho com o traço ("OBJETO SELECIONADO"; sem seleção, "NESTA CENA")
- [x] **Claude:** foto do objeto (o próprio móvel desenhado) na moldura
- [x] **Claude:** nome e descrição
- [x] **Claude:** lista "Contém" no estilo da referência: a aba dos itens virou CONTÉM, primeira e em linhas (Descrição e Interações continuam ao lado)
- [x] **Claude:** carimbo da Ordem bem apagado (o anel com o nome; o emblema no meio vem do logo local)

Cartas do grupo (embaixo):
- [x] **Claude:** moldura, retrato e faixa escura com o nome (girar: ↺ ↻ ao passar o mouse, ou Q e E)

## 6. Tabuleiro

- [x] **Claude:** moldura com filete, cantos de mira e riscos no topo
- [x] **Claude:** fundo azul-escuro com pontinhos
- [x] **Claude:** botão de centralizar (losango com mira)

## 7. Sala de Tecnologia (o que está no tabuleiro)

Pasta: `client/public/arte/moveis/`. Isométrico 2:1; casa de 128×64 (já no dobro); 1 m de altura = 115 px (no dobro). Duas imagens por móvel: frente (virada para baixo à esquerda) e `_costas`. Sem sombra no chão. Formato completo em `docs/SEDE-DA-ORDEM.md`.

- [ ] **Você:** `console.png` e `console_costas.png`: bancada 2×1 casas, 0,78 m, dois monitores azuis acesos e teclado
- [ ] **Você:** `console_desligado.png` e `console_desligado_costas.png`: a mesma bancada desligada
- [ ] **Você (opcional):** variações da bancada com 1 e 3 monitores, como na referência
- [ ] **Você:** `chair_office.png` e `chair_office_costas.png`: cadeira de escritório, 1×1 casa, assento a 0,5 m
- [ ] **Você:** `fluorescent.png` e `fluorescent_aceso.png`: tubo de luz fluorescente
- [ ] **Você:** porta de madeira escura na parede do fundo, fechada e aberta
- [ ] **Você:** textura do piso: carpete roxo, uma casa (128×64) que repete sem emenda
- [ ] **Você:** textura da parede: tijolo escuro, que repete sem emenda
- [ ] **Claude:** o motor usar a arte dos móveis, do piso e da parede no lugar do desenho em código
- [ ] **Claude:** luz roxa embaixo das bancadas, brilho azul das telas e luz fria das fluorescentes

## 8. Coluna da direita (PLAYERS)

- [x] **Claude:** abas PLAYERS / INTERLÚDIO / ITENS, com a ativa em contorno e traço vermelhos
- [x] **Claude:** cartão de cada personagem: retrato na moldura, nome, botão "…" e a sala onde está
- [x] **Claude:** barras de PV, PE e SAN no estilo da referência, com o valor dentro
- [x] **Você, decisão:** as três barras (PV, PE e SAN) têm − e +
- [x] **Claude:** − e + nas três barras (Shift: de 5 em 5; clique na barra muda o total)
- [ ] **Claude:** INTERLÚDIO e ITENS (as abas existem; o conteúdo chega depois)

## 9. Rodapé

Inventário rápido:
- [x] **Claude:** título com o losango vermelho
- [x] **Claude:** seis espaços escuros com borda
- [x] **Claude:** ícones dos itens (documento, pendrive, crachá...)

Ações:
- [x] **Claude:** placa escura "AÇÕES" com o traço vermelho
- [x] **Claude:** botões Examinar, Abrir, Usar e Entregar, com o ativo em vermelho
- [x] **Claude:** as ações funcionando sobre o objeto escolhido (examinar abre a pista; abrir abre a porta, a senha ou o que tem dentro; usar liga e desliga; entregar leva aos itens)

## 10. Fechamento

- [x] **Claude:** captura da tela lado a lado com a referência e os ajustes finos (posição, tamanho, cor)
- [ ] **Claude:** conferir a mesa (tablet) com a arte nova
- [ ] **Você:** aprovar
