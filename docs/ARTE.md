# Arte do CROMA — como entregar

Quem faz a arte entrega **só arquivos de imagem**. Todo o código (encaixar, animar, ligar aos botões) é feito por quem constrói o jogo. Este guia diz o formato, o tamanho, o nome e a pasta de cada arte.

- **O que falta desenhar, para todas as telas, está numa lista só: [`CHECKLIST-ARTE.md`](CHECKLIST-ARTE.md).** Este guia diz o formato de cada tipo de arte.
- A referência de estilo são as telas novas (`docs/referencias/`: `mapa.webp`, `fichas.webp`, `fichas-celular.webp` e `combate.webp`, com o emblema oficial coberto): pixel art pintada, isométrica, investigação paranormal, luz quente de velas e lamparinas, sombras fundas, papel envelhecido.
- A interface é desenhada para uma tela de **1536×1024**. Entregue as peças da interface no **dobro** do tamanho listado (ex.: 266×453 → 532×906), para ficarem nítidas em telas grandes.

## Regras que valem para tudo

- **PNG com fundo transparente.** As exceções estão indicadas.
- **Sem texto, sem números e sem ícones pintados** nas peças da interface. O texto é colocado pelo jogo, para poder mudar e animar.
- **Sem sombra projetada** em volta da peça; o jogo aplica a sombra. Sombras internas (dobra, mancha, queimado) fazem parte da arte.
- **Mesma luz em tudo:** luz quente vinda de cima e do centro da tela.
- **Nomes em minúsculas, sem acento e sem espaço** (use hífen), exatamente como nas tabelas.
- Tudo vai em **`client/public/arte/`**, nas subpastas abaixo.

## Tabuleiro: o modelo e a grade (decidido em 30/09)

Vale para tudo o que fica no tabuleiro: os bonecos e o mapa (piso, paredes e móveis), que recebem a arte no mesmo estilo.

- **Modelo:** pixel art chibi, com cabeça grande e cerca de 3 cabeças de altura, como o modelo dos quatro agentes aprovado em 30/09 e como os bonecos das referências do mapa e do combate.
- **Grade 2:1:** 1 pixel da arte = 2 pixels da tela no zoom normal. Tudo no tabuleiro usa o mesmo tamanho de pixel; pixel grosso ao lado de pixel fino não combina.

| Peça | Na arte (pixels) | Na tela, no zoom normal |
|---|---|---|
| Casa do chão | losango de 32×16 | 64×32 |
| 1 m de altura | ~29 | 57,6 |
| Pessoa (1,75 m) | ~52 de altura | 104 |
| Porta (2,15 m) | ~62 | 124 |
| Mesa (0,8 m) | ~23 | 46 |

- **Pixel duro:** cores chapadas, sem anti-aliasing, sem desfoque e sem brilho em volta. Os bonecos têm contorno escuro; o cenário pode ter contorno mais suave, para os bonecos se destacarem.
- **Luz neutra em tudo:** a luz vem do jogo (escuridão, lamparinas, névoa e o brilho das telas e lâmpadas).
- **Proporção dos móveis:** desenhados para o corpo do chibi (a mesa bate na cintura, como nas referências). As alturas do jogo se ajustam na primeira leva de móveis.
- **O que o jogo faz:** desenha a arte sem suavizar e com zoom em múltiplos do pixel (0,5×, 1×, 1,5×, 2×...), para cada pixel da arte ficar inteiro na tela.

## 1. Personagens

Pasta: `client/public/arte/personagens/<nome>/`, com `<nome>` = `tepes`, `catarina`, `alosi`, `cora-falcao` (ou o nome de um personagem novo).

**Decidido em 30/09:** a folha de sprite de hoje de cada agente (`folha.webp`, pintada) é a **arte de referência** dele: aparece grande na FICHAS e vai para a Hand do jogador (tela que vem depois). O **tabuleiro** vai ganhar arte nova para cada agente, no modelo chibi e na grade 2:1 (seção acima), com todos os ângulos e as animações de andar. As poses paradas já têm formato ("Poses do tabuleiro", abaixo); o das animações entra aqui antes de ser feito.

### Poses de referência do tabuleiro — Tepes, estilo 32 bits

Entrega de quatro imagens estáticas escolhidas por Felipe, com luz neutra e pose idle, em `client/public/arte/personagens/tepes/tabuleiro-32bits/`:

| Arquivo | Estado |
|---|---|
| `idle-desarmado.png` | Normal, mãos vazias |
| `idle-armado.png` | Normal, corrente e escudo |
| `idle-armado-machucado.png` | Machucado, corrente e escudo |
| `idle-desarmado-machucado.png` | Machucado, mãos vazias |

Formato: PNG RGBA, 1024×1536, corpo inteiro, frente em três quartos voltada para a direita. Os arquivos preservam as imagens escolhidas na conversa, com canal alfa; a limpeza final de eventuais halos e o alinhamento entre estados ficam para a montagem da folha. Luz neutra nas peças, conforme decisão de Felipe, para o ambiente do jogo aplicar sua iluminação.

Armado: corrente sem acessório na ponta, enrolada no antebraço e com trecho solto até o início da bota; escudo pequeno, redondo, de madeira, abaixado junto ao corpo. Machucado: cortes, hematoma e roupa rasgada/manchada, preservando a identidade.

Não substituem `folha.webp` nem os `retrato-*.png`. São do modelo realista, de antes da decisão do chibi: ficam no tabuleiro até chegarem as poses chibi do Tepes, e depois servem de referência (por exemplo, o corpo grande da FICHAS). **Desde 30/09 elas já estão no tabuleiro** (na tela do mestre e na mesa): a peça do Tepes usa a pose do estado dela e muda na hora. Ainda sem as outras direções, quadros de piscar ou caminhada: virado para outro lado, ele mostra a mesma pose; andando, ela desliza com um balanço.

### Poses do tabuleiro: uma imagem por estado e direção

É o formato das próximas entregas: os quatro agentes no modelo chibi, nas 8 direções e nos 4 estados. Cada imagem é o personagem parado, numa direção e num estado.

- **Pasta:** `client/public/arte/personagens/<nome>/tabuleiro-32bits/`.
- **Nome:** `idle-<estado>-<direção>.png`, com `<estado>` = `desarmado`, `armado`, `desarmado-machucado` ou `armado-machucado`. As quatro imagens sem direção no nome (as entregues) valem como `se`.
- **Direções** (na tela), as 4 primeiro:

| Direção | Pose |
|---|---|
| `se` | frente virada para a direita ↘ (a entregue) |
| `sw` | frente virada para a esquerda ↙ |
| `nw` | costas viradas para a esquerda ↖ |
| `ne` | costas viradas para a direita ↗ |
| `s` | de frente ↓ (só com 8 direções) |
| `e` | de lado, olhando para a direita → (só com 8) |
| `n` | de costas ↑ (só com 8) |
| `w` | de lado, olhando para a esquerda ← (só com 8) |

- **Tamanho:** na grade 2:1 (a pessoa com ~52 pixels de altura), corpo inteiro, **na mesma escala e com os pés no mesmo ponto** em todas as direções e estados. O jogo mede a altura das poses sem machucado e usa essa escala em todas; a âncora é o meio da faixa de baixo do corpo (entre os pés).
- **Como entregar:** pode vir a imagem do gerador como saiu, com os quatro agentes numa grade 2×2 (em cima Catarina e Alosi, embaixo Cora e Tepes) e fundo transparente ou verde puro `#00FF00`. O construtor recorta, acerta a grade de pixel e grava `idle-<estado>-<direção>.png` na pasta de cada um.
- **Fundo transparente de verdade (ou o verde chapado), sem chão, sem sombra, sem anel e sem texto.** Luz neutra.
- **Como o jogo escolhe:** o estado vem do botão **Armado** (no painel da peça) e dos PV (**menos da metade = machucado**, como no livro); a direção vem da peça (↺ ↻, Q e E). Faltando uma direção, usa a vizinha; faltando um estado, o mais parecido. No carregamento, o quase transparente em volta some e o corpo fica totalmente opaco.
- **As poses realistas do Tepes** (1024×1536, ~1,5 MB cada) aparecem reduzidas pela metade no zoom normal e pesam no tablet. Na grade 2:1, cada pose tem poucos KB.

### Folha de sprite: `folha.png`

- **Grade de 4 colunas.** Cada linha é uma direção e cada coluna um quadro do personagem parado.
- **Quadros:** colunas 1, 2 e 4 são o personagem respirando, com variações pequenas. A **coluna 3 tem os olhos fechados** (o piscar).
- **Todas as células do mesmo tamanho** (ex.: 313×313), com o personagem na mesma escala e os **pés na mesma altura** em todas.
- **Sem chão, sem sombra, sem anel e sem texto.**
- **4 direções = 4 linhas, nesta ordem:**
  1. frente virada para a direita ↘
  2. frente virada para a esquerda ↙
  3. costas viradas para a esquerda ↖
  4. costas viradas para a direita ↗
- **8 direções = 8 linhas:** as 4 acima e mais estas, nesta ordem:
  5. de frente ↓
  6. de lado, olhando para a direita →
  7. de costas ↑
  8. de lado, olhando para a esquerda ←

  Com 8 direções, o personagem que anda na diagonal da grade (na tela, reto para cima, para baixo ou para o lado) usa a pose certa, em vez da diagonal mais próxima.

### Retratos das cartas: um por estado

As cartas do grupo (tela do mestre) mostram o personagem **de corpo inteiro, olhando para a direita**, recortado da cabeça até a cintura. São quatro estados:

| Arquivo | Quando aparece |
|---|---|
| `retrato-desarmado.png` | normal |
| `retrato-armado.png` | o mestre marcou "Armado" |
| `retrato-desarmado-machucado.png` | menos da metade dos PV (condição "machucado" do livro) |
| `retrato-armado-machucado.png` | armado e machucado |

- Para piscar: a **mesma imagem** com os olhos fechados, `retrato-<estado>-olhos-fechados.png` (mesmo tamanho e pose).
- Fundo transparente ou branco liso (o jogo tira o branco). Tamanho livre; ~1024×1536 funciona bem.
- O jogo acha os arquivos sozinho, sem reiniciar. Enquanto não houver retrato, a carta recorta o rosto da folha de sprite.
- A respiração é feita pelo jogo, pela ficha: normal, irregular e calma (machucado), rápida (sanidade abaixo da metade) e bem devagar (PE abaixo da metade).

## 2. Itens

Pasta: `client/public/arte/itens/`.

| Arquivo | Tamanho | O que é |
|---|---|---|
| `<nome-do-item>.png` | 128×128 | Ícone de um item específico. Ex.: `faca-de-cozinha.png`, `diario-rasgado.png`, `chave-da-escrivaninha.png` |
| `tipo-<tipo>.png` | 128×128 | Ícone genérico do tipo, usado quando o item não tem ícone próprio. Tipos: `arma`, `documento`, `chave`, `carta`, `consumivel`, `midia`, `caixa`, `item` |

Os ícones são objetos soltos, sem moldura e sem o quadrado do inventário (o jogo desenha o quadrado).

### Arte pintada dos itens (aba ITENS do MAPA)

A aba ITENS (referência `docs/ref-itens.jpg`, fora do git) mostra cada item como uma **ilustração pintada**: o fuzil, a faca, o colete, o amuleto, o kit médico, o pendrive, a munição, o livro, a chave, a lanterna, o frasco. É outro estilo do ícone de traço da FICHAS, então tem pasta própria:

| Arquivo | Tamanho | O que é |
|---|---|---|
| `pintados/<id>.png` | 256×256 | Item do livro, pelo id do catálogo (ex.: `pintados/fuzil-de-caca.png`, `pintados/protecao-leve.png`) |
| `pintados/<nome-do-item>.png` | 256×256 | Item achado no cenário, pelo nome em minúsculas e com hífen (ex.: `pintados/chave-do-arsenal.png`, `pintados/diario-do-maluco.png`) |
| `pintados/tipo-<tipo>.png` | 256×256 | O item do cenário sem desenho próprio, pelo tipo: `arma`, `documento`, `chave`, `carta`, `consumivel`, `midia`, `caixa`, `item` |

- Fundo transparente, sem moldura e sem a casa escura (o jogo põe a casa). O objeto sozinho, em três quartos, ocupando ~80% do quadro, com luz quente vinda de cima, como na referência.
- O jogo procura nesta ordem: a pintada, o ícone de traço (`itens/<id>.png`) e, sem nenhum, o desenho de linha. Entram sozinhos.

## 3. Interface (a tela MAPA) — referência nova, 16:9

A referência de 29/09 (`docs/referencias/mapa.webp`) é **16:9**: a tela passa a ser desenhada em **1920×1080**. Os tamanhos abaixo são em 1920×1080; entregue no **dobro** as peças que ficam na frente (papéis, botões, molduras). Os números são aproximados, medidos na referência: o construtor ajusta no encaixe.

### O que é código e o que é arte

A análise completa, elemento por elemento, está em [`TELA-MAPA.md`](TELA-MAPA.md), e a lista para ir marcando, em [`CHECKLIST-TELA-MAPA.md`](CHECKLIST-TELA-MAPA.md). Em resumo:
- **Não precisa desenhar:** textos e números, ícones de linha (o jogo usa a biblioteca Lucide, licença ISC), botões, abas, etiquetas, molduras (polaroid, retrato, miniatura), barras de PV/PE/SAN, espaços do inventário, a moldura do tabuleiro, o carimbo da Ordem (desenhado com o logo) e a luz.
- **Precisa de arte:** os papéis envelhecidos, o clipe, as fitas, a rosa dos ventos, a pilha de papéis e, na sala, os móveis e as texturas.

### Fontes (decidido em 29/09; o jogo carrega)

| Uso | Fonte | Onde aparece |
|---|---|---|
| Marca | Cinzel | "ORDO REALITAS / SEDE DA ORDEM" |
| Títulos e botões | Special Elite (e Courier Prime Bold onde precisar de negrito) | SUBSOLO, SALA DE TECNOLOGIA, MAPA, AÇÕES |
| Texto corrido | Courier Prime | descrições, lista "Contém", nomes nas cartas |
| Anotações à mão | Caveat | "Instalações Técnicas", "Acesso Restrito" na planta |
| Títulos e números da FICHA | Roboto Serif, condensada | IDENTIFICAÇÃO, ATRIBUTOS, os valores dos atributos e derivados, as abas do topo |
| Texto da FICHA | Roboto Condensed | nomes, perícias, tabelas, botões |

### Peças a desenhar

Pasta: `client/public/arte/interface/`; o logo em `client/public/arte/local/` (fora do git: é o símbolo oficial de Ordem Paranormal e o repositório é público). Tamanho em 1920×1080; entregue no dobro. PNG transparente, sem texto e sem ícone pintado.

| Arquivo | Tamanho (1×) | O que é |
|---|---|---|
| `papel-planta.png` | 540×320 | Folha envelhecida da planta, rasgada, com a folha de trás aparecendo no canto |
| `papel-sala.png` | 540×185 | Folha mais clara do cartão da sala |
| `papel-objeto.png` | 540×290 | Folha do objeto selecionado |
| `papel-rpg.png` | 390×790 | Folha grande do painel da direita |
| `papel-inventario.png` | 585×150 | Folha do inventário rápido |
| `carta-player.png` | 370×160 | Cartão claro de cada personagem; borda de 24 px sem detalhe único, para o jogo esticar o meio |
| `clipe.png` | 26×62 | Clipe de metal (prende a planta ao cartão da sala) |
| `fita-1.png` a `fita-3.png` | ~80×22 | Fita crepe translúcida |
| `rosa-dos-ventos.png` | 90×90 | Rosa dos ventos a nanquim com o "N" |
| `pilha-papeis.png` | 300×260 | Pilha de fichas e papéis carimbados, no canto de baixo à direita (sai pela borda) |
| `logo-ordem.png` | 72×72 | O emblema. Pode ser branco sobre preto: o jogo usa o branco como forma. Sem o arquivo, o topo mostra só o texto |
| opcional: `fundo-mesa.jpg` | 1920×1080 | Fundo quase preto com textura suave (JPG opaco); sem ele, o jogo usa um ruído |
| opcional: `asas-marca.png` | 80×60 | Asas bem apagadas no canto do painel do objeto |

### A sala do tabuleiro (Sala de Tecnologia)

Formato em [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md), na grade 2:1 do tabuleiro (casa de 32×16 pixels de arte, 1 m de altura ≈ 29 pixels de arte, imagem de frente e de costas):
- **Piso:** carpete roxo, uma casa que repete.
- **Parede:** tijolo escuro, que repete.
- **Móveis:** porta de madeira escura (fechada e aberta); bancada com 1, 2 e 3 monitores; cadeira de escritório nas 4 direções; lâmpada fluorescente (apagada e acesa).
- O brilho das telas, das lâmpadas e da fita roxa embaixo das bancadas é feito pelo jogo.

### A tela antiga (1536×1024)

As peças abaixo eram da primeira referência (`docs/ref-mapa.webp`). As que servem na tela nova foram repetidas acima; o resto não precisa mais.

Pasta: `client/public/arte/interface/`. Tamanhos em 1×; entregue no dobro.

### Fundo e barra do topo

| Arquivo | Tamanho | O que é |
|---|---|---|
| `fundo-mesa.jpg` | 1536×1024 | Superfície escura com sujeira (pode ser JPG opaco). O centro (x 290–1020, y 75–850) fica neutro, porque o mapa entra ali |
| `barra-topo.png` | 1536×75 | Faixa escura do topo com a borda de baixo |
| `sigilo.png` | 70×70 | Sigilo vermelho do logo, sem quadrado atrás |
| `placa-direita.png` | 513×762 | Placa escura atrás do painel da direita |

### Abas do topo (normal e ativa)

Papel rasgado com os pregos nos cantos; na versão ativa o papel é mais claro.

| Arquivo | Tamanho |
|---|---|
| `aba-mapa.png` e `aba-mapa-ativa.png` | 122×58 |
| `aba-combate.png` e `-ativa` | 144×52 |
| `aba-interludio.png` e `-ativa` | 130×46 |
| `aba-personagens.png` e `-ativa` | 153×47 |
| `aba-itens.png` e `-ativa` | 95×50 |
| `aba-notas.png` e `-ativa` | 107×47 |
| `traco-aba-ativa.png` | 70×8, traço de tinta vermelha sob o nome da aba ativa |
| `fio-vermelho.png` | 300×90, o fio que sai do sigilo e amarra a aba ativa |

### Papéis dos painéis (em branco)

| Arquivo | Tamanho | Detalhes |
|---|---|---|
| `papel-cenario.png` | 266×453 | Canto de baixo à direita dobrado |
| `papel-cenario-tras.png` | 266×453 | A folha que aparece atrás |
| `papel-andar.png` | 265×244 | Papel quadriculado (grade azul-acinzentada de 11 px) |
| `papel-objetivos.png` | 186×160 | Formato de pasta, com a aba de cima de 113×36 |
| `papel-inspetor.png` | 483×448 | Folha grande do painel da direita |
| `papel-entrega.png` | 477×294 | Painel "Entregar ... para" |
| `papel-inventario.png` | 487×137 | — |
| `papel-log.png` | 431×155 | Com a aba de pasta em cima e o canto dobrado |
| `carta-1.png` a `carta-4.png` | 125×150 | Cartas dos personagens, com rasgos diferentes |
| `carta-tras-1.png` a `carta-tras-4.png` | 125×150 | As folhas atrás de cada carta |
| `nota-g.png`, `nota-m.png`, `nota-p.png` | 290×178, 262×150, 230×128 | Bilhetes para janelas e confirmações |

### Peças pequenas

| Arquivo | Tamanho |
|---|---|
| `fita-1.png` a `fita-3.png` | ~70×18, fita crepe translúcida |
| `clipe.png` e `clipe-pequeno.png` | 22×54 e 14×26 |
| `alfinete.png` | 20×20, alfinete vermelho com a agulha |
| `pincel-selecao.png` | 252×57, pincelada vermelha com ponta de seta (cena atual) |
| `polaroid.png` | 151×143, moldura com o furo transparente |
| `aba-pasta.png` e `aba-pasta-ativa.png` | 119×33, abas DESCRIÇÃO / INTERAÇÕES / ITENS |
| `contorno-aba-ativa.png` | 119×33, contorno vermelho feito à mão por cima da aba ativa |
| `card-item.png` e `card-item-selecionado.png` | 452×75 |
| `botao-escuro.png` | 96×38, botão "Entregar" sem texto; três quadros lado a lado (normal, passando o mouse, apertado) |
| `slot-inventario.png` | 56×58 |
| `moldura-miniatura.png` | 72×47, moldura com rebites e furo transparente |
| `checkbox.png` e `check-vermelho.png` | 14×14 e 18×16 |
| `barra-trilho.png`, `barra-verde.png`, `barra-amarela.png`, `barra-vermelha.png` | 84×12 |
| `carimbo-sucesso.png` e `carimbo-falha.png` | ~160×60, carimbo de tinta para o resultado de um teste |

## 4. Efeitos

Pasta: `client/public/arte/efeitos/`.

- Cada efeito é uma **tira horizontal** de quadros do mesmo tamanho: `<nome>.png`.
- Informe o **número de quadros** e a **velocidade** (quadros por segundo) no nome, assim: `chama-vela_8q_12fps.png`.
- Fundo transparente. Se o efeito for luz (brilho, chama), pinte em cores claras sobre transparente: o jogo soma a luz por cima do mapa.

## 5. Cenários e móveis

**Decidido:** os cenários são montados no jogo (planta, paredes e móveis na grade isométrica), e a arte dos móveis vem depois, para deixar cada cômodo parecido com a referência. Luz, névoa e fumaça são feitas pelo jogo.

A lista dos móveis, cômodo por cômodo, com tamanho, altura e o que desenhar, está em [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md), junto com o formato (pixel art na grade 2:1: casa de 32×16 pixels de arte, 1 m de altura ≈ 29 pixels de arte, duas imagens por móvel: frente e costas). O formato se confirma na primeira leva: comece por um móvel marcado com ✱.

## Como entregar

1. Trabalhe numa branch `codex/arte-<assunto>` (ex.: `codex/arte-personagens`).
2. Faça commit só de arquivos dentro de `client/public/arte/`, sem mexer em código.
3. Abra um pull request para `main` listando o que entregou.

O construtor encaixa a arte no jogo e ajusta o que precisar.

> **Atenção:** o repositório `FelipeSiqueiraDev/CROMA` é **público**. Tudo o que entra nele, inclusive a arte, fica visível para qualquer pessoa.
