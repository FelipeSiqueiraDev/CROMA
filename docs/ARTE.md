# Arte do CROMA — como entregar

Quem faz a arte entrega **só arquivos de imagem**. Todo o código (encaixar, animar, ligar aos botões) é feito por quem constrói o jogo. Este guia diz o formato, o tamanho, o nome e a pasta de cada arte.

- A referência de estilo é `docs/ref-mapa.webp`: pixel art pintada, isométrica, investigação paranormal, luz quente de velas e lamparinas, sombras fundas, papel envelhecido.
- A interface é desenhada para uma tela de **1536×1024**. Entregue as peças da interface no **dobro** do tamanho listado (ex.: 266×453 → 532×906), para ficarem nítidas em telas grandes.

## Regras que valem para tudo

- **PNG com fundo transparente.** As exceções estão indicadas.
- **Sem texto, sem números e sem ícones pintados** nas peças da interface. O texto é colocado pelo jogo, para poder mudar e animar.
- **Sem sombra projetada** em volta da peça; o jogo aplica a sombra. Sombras internas (dobra, mancha, queimado) fazem parte da arte.
- **Mesma luz em tudo:** luz quente vinda de cima e do centro da tela.
- **Nomes em minúsculas, sem acento e sem espaço** (use hífen), exatamente como nas tabelas.
- Tudo vai em **`client/public/arte/`**, nas subpastas abaixo.

## 1. Personagens

Pasta: `client/public/arte/personagens/<nome>/`, com `<nome>` = `tepes`, `catarina`, `alosi`, `cora-falcao` (ou o nome de um personagem novo).

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

### Retrato: `retrato.png` e `retrato-olhos-fechados.png`

- **512×512**, busto de frente, olhando para a câmera, fundo escuro liso (este pode ser opaco).
- A versão de olhos fechados é **idêntica**, só com os olhos fechados: o jogo alterna as duas para o retrato piscar.

## 2. Itens

Pasta: `client/public/arte/itens/`.

| Arquivo | Tamanho | O que é |
|---|---|---|
| `<nome-do-item>.png` | 128×128 | Ícone de um item específico. Ex.: `faca-de-cozinha.png`, `diario-rasgado.png`, `chave-da-escrivaninha.png` |
| `tipo-<tipo>.png` | 128×128 | Ícone genérico do tipo, usado quando o item não tem ícone próprio. Tipos: `arma`, `documento`, `chave`, `carta`, `consumivel`, `midia`, `caixa`, `item` |

Os ícones são objetos soltos, sem moldura e sem o quadrado do inventário (o jogo desenha o quadrado).

## 3. Interface (a tela MAPA)

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

**Formato em decisão.** As duas opções:

- **A. Cena pintada inteira:** uma imagem 1536×1024 por cômodo, com chão, paredes e móveis. É a mais próxima da referência. O jogo marca por cima onde dá para andar e onde estão os objetos clicáveis.
- **B. Móveis separados:** cada móvel é uma imagem isométrica própria (casa de 64×32 px), e o jogo monta o cômodo. O mestre pode mudar os móveis de lugar.

Até a decisão, não produza cenários nem móveis.

## Como entregar

1. Trabalhe numa branch `codex/arte-<assunto>` (ex.: `codex/arte-personagens`).
2. Faça commit só de arquivos dentro de `client/public/arte/`, sem mexer em código.
3. Abra um pull request para `main` listando o que entregou.

O construtor encaixa a arte no jogo e ajusta o que precisar.

> **Atenção:** o repositório `FelipeSiqueiraDev/CROMA` é **público**. Tudo o que entra nele, inclusive a arte, fica visível para qualquer pessoa.
