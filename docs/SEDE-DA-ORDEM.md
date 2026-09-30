# Sede da Ordem — lista do visual, cômodo por cômodo

O mapa da Sede (Ordo Realitas) já funciona no jogo: os agentes andam, passam de um cômodo para outro e mexem nas coisas. Os móveis ainda são desenhos provisórios feitos em código. Esta lista é o roteiro para trocar cada um pela arte final, **cômodo por cômodo, item a item**, junto com o ChatGPT/Codex.

- Referência: a planta "Mapa Base Ordo Realitas" (bar embaixo à esquerda, sede no subsolo).
- O formato das imagens está em [`ARTE.md`](ARTE.md) (seção 5). Por enquanto, a proposta abaixo; ela se confirma na primeira leva.
- **O que é código, não arte:** luz, cor do ambiente, névoa, partículas (poeira, fumaça, brasas), animações (geladeira deslizando, portas de cela) e o piso de cada cômodo. Isso fica no jogo e muda sem imagem nova.

## Como a Sede funciona

| Andar | Cômodo | Piso | Cor do ambiente | Partículas |
|---|---|---|---|---|
| Térreo | Bar (a fachada) | madeira escura | âmbar `#c0782a` | poeira, fumaça |
| Subsolo | Salão Principal | concreto | aço `#6a7a8c` | poeira |
| Subsolo | Corredor | concreto | azul-acinzentado `#5a6a82` | poeira |
| Subsolo | Prisão | concreto | azul frio `#4a6a90` | poeira |
| Subsolo | Câmara do Selo | pedra | dourado `#c89a3a` | poeira, fumaça, brasas |
| Subsolo | Laboratório | azulejo azul | verde-água `#3ab0b8` | poeira |
| Subsolo | Sala de Tecnologia | carpete roxo | violeta `#8a5ad0` | poeira |
| Subsolo | Gabinete | madeira clara | laranja `#c0622a` | poeira, fumaça |
| Subsolo | Sala de Rituais | pedra verde | vermelho `#c02a24` | poeira, fumaça, brasas |
| Subsolo | Banheiro | xadrez | verde-claro `#6aa89a` | — |
| Subsolo | Enfermaria | ladrilho branco | branco frio `#a0d0dc` | poeira |
| Subsolo | Arsenal | chapa de metal | oliva `#6a8a4a` | poeira |

- **A porta da Sede** é a única geladeira do bar, no canto. O mestre digita a senha **0413** no painel da geladeira; ela desliza uma casa para a esquerda e aparece a escada que desce para o salão. Quem sobe pela escada com a passagem fechada abre por dentro, sem senha. Quando não sobra ninguém no bar, a geladeira volta sozinha para cima da escada.
- **Portas de cela** abrem e fecham com clique duplo; fechadas, ninguém passa.
- Tudo isso (cor, partículas, piso, andar) o mestre também ajusta em **Configurar cena**. A quantidade de partículas fica no ☀ **Clima da cena**, junto da névoa e da escuridão.

## Proposta de formato dos móveis

- Visão isométrica 2:1, igual ao tabuleiro: cada casa do chão é um losango de **64×32 px**. Entregue no **dobro** (128×64 por casa) para ficar nítido.
- Escala: **1 m de altura = 57,6 px** (no tamanho normal). Uma pessoa tem ~1,75 m; uma estante, ~2,1 m; uma mesa, ~0,8 m. As alturas estão na lista.
- **Duas imagens por móvel:** frente virada para baixo à esquerda (rotação 4) e costas viradas para cima à direita (rotação 0). As outras duas rotações são essas espelhadas. Móveis que só ficam encostados na parede do fundo precisam só da frente.
- Fundo transparente, sem sombra no chão (o jogo faz a sombra e a luz). Luz vindo de cima.
- Móveis com estados (ligado/desligado, aberta/fechada) têm uma imagem por estado.
- Nome do arquivo = o id da lista (ex.: `beer_fridge.png`, `beer_fridge_costas.png`), na pasta `client/public/arte/moveis/`.

## Cômodo por cômodo

Tamanho em casas (largura × fundo), altura em metros. ✱ = o móvel é importante para a cena e vale caprichar primeiro.

### Bar (térreo)

Vazio, sujo e com pouca bebida. Luz amarela, fumaça no ar.

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Geladeira de cerveja | `beer_fridge` | 1 | 1×1 | 2,0 m | Porta de vidro, luz amarela por dentro, poucas garrafas. É a porta secreta: precisa de uma versão "deslizando" (a mesma, só se mexe). |
| ✱ Escada secreta | `stairs_down` | 1 | 1×1 | — | Vão escuro na parede com degraus descendo, luz vermelha lá no fundo. Só aparece quando a geladeira sai. |
| ✱ Balcão do bar | `bar_counter` | 5 | 2×1 | 1,1 m | Balcão vermelho-escuro de madeira com tampo gasto e apoio de pé de latão; emenda com o vizinho. |
| Prateleira de garrafas | `bar_shelf` | 3 | 2×1 | 2,1 m | Prateleiras quase vazias, espelho encardido, uma garrafa deitada. |
| Banqueta de balcão | `stool_bar` | 6 | 1×1 | 0,75 m | Banqueta alta vermelha, pé de metal. |
| Mesa de bar | `table_bar` | 4 | 1×1 | 0,75 m | Mesa quadrada amarelada, marcas de copo. |
| Cadeira de bar | `chair_bar` | 13 | 1×1 | 0,46 m | Cadeira amarela de plástico/madeira; algumas tortas. |
| ✱ Mesa de sinuca | `pool_table` | 1 | 2×4 | 0,85 m | Feltro verde, bolas e taco; luminária comprida pendurada em cima. |
| Jukebox | `jukebox` | 1 | 1×1 | 1,6 m | Rosa e laranja, acesa/apagada. |
| Sofá vermelho | `sofa_booth` | 2 | 2×1 | 0,45 m | Estofado vermelho rasgado. |
| Caixote, barril | `crate_wood`, `barrel` | 2, 1 | 1×1 | 0,8–1,0 m | Engradados de garrafa vazia, barril de chope. |
| Sujeira | `dirt` | 9 | 1×1 | chão | Manchas, bitucas, tampinhas, papel amassado (decalque no chão). |
| Letreiro neon | `neon_bar` (parede) | 1 | 64×26 px | — | "BAR" em neon rosa, aceso/apagado. |
| Alvo de dardos | `dartboard` (parede) | 1 | 28×28 px | — | Com dois dardos cravados. |

### Salão Principal

O coração da Sede: operações, a mesa da equipe e a escada que sobe para o bar.

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Mesa de trabalho | `table_work` | 3 | 3×2 | 0,78 m | Mesa preta comprida com papéis espalhados. |
| ✱ Escada que sobe | `stairs_up` | 1 | 1×1 | até 0,9 m | Degraus de madeira subindo para a porta, corrimão. |
| Mesa redonda | `table_round` | 1 | 2×2 | 0,76 m | Madeira escura, redonda. |
| Cadeira estofada | `chair_red` | 10 | 1×1 | 0,46 m | Vermelha. |
| Cadeira de escritório | `chair_office` | 17 | 1×1 | 0,5 m | Preta, de rodinhas. |
| Mesa oval | `table_meeting` | 1 | 3×2 | 0,8 m | Mesa comprida de madeira marrom (na planta é oval). |
| Mesa de xadrez | `table_chess` | 1 | 1×1 | 0,72 m | Tabuleiro quadriculado, peças. |
| Poltrona | `armchair` | 4 | 1×1 | 0,45 m | Couro escuro. |
| Banco de madeira | `bench` | 2 | 2×1 | 0,45 m | — |
| Luminária de chão, arquivo, planta | `floor_lamp`, `cabinet_file`, `plant` | 1, 2, 2 | 1×1 | 1,2–1,9 m | — |
| Quadro, tela de projeção | `board_investigation`, `screen` (parede) | 1, 1 | — | — | Quadro de cortiça com fios vermelhos; tela branca com o mapa projetado. |

### Corredor

| Item | Id | Qtd | O que desenhar |
|---|---|---|---|
| Passagem | `portal` | 6 | Batente de porta com a escuridão atrás (serve para todas as portas da Sede). |
| Luminária fluorescente | `fluorescent` | 5 | Calha de metal com tubo frio (usada em quase todo o subsolo). |
| Canos, luz de emergência, extintor | `pipes`, `emergency_light`, `extinguisher` (parede) | 3, 2, 1 | — |
| Grade de ventilação, banco, planta | `vent`, `bench`, `plant` | 3, 1, 1 | — |

### Prisão

Dezesseis celas: cama, vaso e a frente de grade com a porta.

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Grade de cela | `cell_bars` | 64 | 1×1 | 2,2 m | Barras de ferro com travessa no meio; emenda com a vizinha. |
| ✱ Porta de cela | `cell_door` | 16 | 1×1 | 2,2 m | Aberta e fechada; fechadura grande. |
| Cama | `bed` | 16 | 1×3 | 0,55 m | Cama de solteiro de ferro, colchão fino, cobertor verde-oliva. |
| Vaso sanitário | `toilet` | 16 | 1×1 | 0,45 m | Aço inox de prisão. |
| Divisória baixa | `iwall_low` | 52 | 1×1 | 1,3 m | Meia parede de concreto entre as celas. |
| Posto do carcereiro | `desk_metal`, `chair_office`, `locker` | 1 cada | — | — | — |

### Câmara do Selo

| Item | Id | Qtd | Casas | O que desenhar |
|---|---|---|---|---|
| ✱ Selo dourado | `sigil_gold` | 1 | 3×3 | Símbolo dourado ornamentado pintado no chão (é o destaque da sala). |
| Velas, candelabros | `candles`, `candelabra` | 5, 2 | 1×1 | — |
| Crânio, entulho | `skull`, `rubble` | 1, 1 | 1×1, 2×2 | Pedaços de concreto e tábuas num canto. |

### Laboratório

Bancadas nas paredes e uma ilha comprida no meio.

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Bancada de laboratório | `lab_bench` | 6 | 2×1 | 0,8 m | Tampo verde-água, como na planta. |
| Microscópio, frascos, monitores | `microscope`, `flasks`, `monitor`, `monitor_green` | 2, 3, 2 | 1×1 | — | Placas de Petri, tubos de ensaio. |
| Estante, arquivos, carrinho | `bookshelf`, `cabinet_file`, `trolley` | 1, 2, 1 | — | — | — |

### Sala de Tecnologia

Computadores contornando as paredes, cadeiras viradas para as telas, o meio vazio.

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Bancada de computadores | `console` | 9 | 2×1 | 0,78 m | Bancada lilás com dois monitores acesos e teclado; ligada/desligada. |
| Cadeira de escritório | `chair_office` | 7 | 1×1 | 0,5 m | — |

### Gabinete

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Mesa do gabinete | `desk_wood` | 1 | 2×1 | 0,8 m | Mesa de madeira nobre com papéis. |
| ✱ Poltrona de couro | `armchair_leather` | 5 | 1×1 | 0,45 m | Couro marrom de botões. |
| Tapete persa | `rug_ornate` | 1 | 4×3 | chão | — |
| Quadros | `painting` (parede) | 2 | 60×40 px | — | Moldura dourada, paisagem escura. |
| Mesinha, arquivo, armário, candelabro, planta | — | 1 cada | — | — | — |

### Sala de Rituais

| Item | Id | Qtd | Casas | O que desenhar |
|---|---|---|---|---|
| ✱ Sigilo ritualístico | `sigil_floor` | 1 | 3×3 | Pentagrama vermelho com escrita em volta, sangue respingado. |
| Balcão de madeira | `counter_wood` | 3 | 2×1 | Balcão em L com frascos e ferramentas. |
| Mesa, mesa redonda, estante | `desk_wood`, `table_round`, `bookshelf` | 2, 1, 1 | — | — |
| Velas, crânios, sangue | `candles`, `skull`, `blood_*` | — | — | — |

### Banheiro

| Item | Id | Qtd | O que desenhar |
|---|---|---|---|
| Vaso, pia, espelho | `toilet`, `sink`, `mirror` | 3, 2, 2 | Cabines com divisória (`iwall_low`), pias numa bancada de madeira. |

### Enfermaria

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Leito hospitalar | `hospital_bed` | 6 | 1×3 | 0,7 m | Cabeceira levantada, lençol verde, grades. |
| Divisória hospitalar | `divider` | 8 | 1×1 | 1,6 m | Cortina verde-clara no trilho. |
| Suporte de soro | `iv_stand` | 6 | 1×1 | 1,9 m | — |
| Armário de remédios | `medical_cabinet` | 2 | 2×1 | 1,9 m | Branco, portas de vidro, cruz vermelha. |
| Balcão, pias, posto, carrinho | `lab_bench`, `sink`, `desk_metal`, `trolley` | — | — | — | — |

### Arsenal

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Bancada de armas | `gun_table` | 4 | 3×1 | 0,9 m | Tampo verde; montada em U no meio da sala. |
| Armário de armas | `weapon_rack` | 4 | 2×1 | 2,0 m | Fuzis em pé, gaveta embaixo. |
| Armários, baú, caixas | `locker`, `chest_military`, `crate_metal` | 6, 1, 4 | 1×1 | — | Verde-escuro militar. |

## Personagens

- **Retratos (cartas do grupo):** 4 estados por personagem, olhando para a direita, corpo inteiro: `retrato-desarmado.png`, `retrato-armado.png`, `retrato-desarmado-machucado.png`, `retrato-armado-machucado.png`, na pasta do personagem (`client/public/arte/personagens/<nome>/`). Para piscar, a mesma imagem de olhos fechados: `retrato-<estado>-olhos-fechados.png`. O jogo acha os arquivos sozinho (sem reiniciar) e tira fundo branco.
- **Quem escolhe o estado:** "machucado" vem da ficha (menos da metade dos PV, como no livro); "armado" é um botão no painel do personagem.
- **Andando:** ainda não há folha de andar. Quando o formato entrar em `docs/ARTE.md`, cada personagem ganha folhas de andar (armado e desarmado) feitas para o CROMA.

## Próximos passos de vida no mapa (código)

- Luz de cada cômodo com a cor da sala ✔ (primeira versão), lâmpadas frias no subsolo ✔, poeira na luz ✔, fumaça e brasas das velas ✔.
- A fazer: luz piscando de verdade em fluorescente velha, vapor na enfermaria, reflexo do neon no chão do bar, faíscas no arsenal, névoa baixa na câmara.
