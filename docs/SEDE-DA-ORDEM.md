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
- **Portas dos cômodos** (as passagens): 0,9 m por 2,1 m. Com o clique duplo do mestre, ficam aberta, fechada ou trancada (com tranca e cadeado); fechada ou trancada, ninguém passa. A textura de cada porta vem depois, todas juntas.
- Tudo isso (cor, partículas, piso, andar) o mestre também ajusta em **Configurar cena**. A quantidade de partículas fica no ☀ **Clima da cena**, junto da névoa e da escuridão.

## Formato dos móveis

**Revisto em 02/10:** os móveis vêm em folhas de objetos como a primeira do Códex (`client/public/arte/mobiliario/props-ordo-realitas.png`): até 12 objetos por folha, separados, fundo transparente, vistos de cima e de lado com a frente para baixo à esquerda. O construtor redesenha cada um na grade do tabuleiro (`scripts/3d/moveis.py`). O formato completo está no [`ARTE.md`](ARTE.md) (seção 5); o que falta, folha por folha, no [`CHECKLIST-ARTE.md`](CHECKLIST-ARTE.md).

- **Já no jogo nos 4 giros (02/10):** o bar inteiro (a lista está abaixo), uma folha por móvel em `mobiliario/folhas/`, no tamanho de verdade (formato no [`ARTE.md`](ARTE.md), "Móvel nos 4 giros").
- **Já no jogo, só de frente (folha 1, 02/10; o jogo espelha os outros giros):** bancada de computadores (`console`), arquivo de aço (`cabinet_file`), cadeira de escritório (`chair_office`), caixote (`crate_wood`), leito (`hospital_bed`), estante (`bookshelf`), mesa de escritório (`desk_wood`) e bancada de armas (`gun_table`).
- Os tamanhos abaixo (casas de largura × fundo, altura em metros) são os do jogo: o desenho segue essa proporção.

## Cômodo por cômodo

Tamanho em casas (largura × fundo), altura em metros. ✱ = o móvel é importante para a cena e vale caprichar primeiro.

**Arrumação (02/10):** cada cômodo é arrumado como seria de verdade. As paredes da frente não aparecem no tabuleiro, então o móvel de encostar (armário, pia, bancada, arquivo) vai nas paredes do fundo, virado para a sala; encostado na beira da frente, ele mostraria só as costas. Divisória alta na frente de outro móvel tapa o de trás: o que precisa ser visto fica à esquerda dela na parede da esquerda, ou longe dela.

### Bar (térreo)

O Suvaco Seco, o bar de fachada: velho, marrom e acolhedor, com o fliperama piscando. Arrumado como a planta da Sede desenhada pelo Códex e a descrição da wiki: o balcão comprido no fundo, com o corredor do atendente entre ele e as prateleiras (a entrada fica no fim do balcão); as geladeiras no canto de cima, a amarela por último; o fliperama na parede da esquerda; as mesas amarelas, a sinuca e a pilha de cadeiras no canto. O chão e a parede têm textura desenhada (tábuas e lambri).

✅ = já desenhado (`client/public/arte/mobiliario/folhas/`), no tamanho de verdade.

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✅ Mesa de bar | `table_bar` | 4 | 1×1 | 0,75 m | Quadrada, tampo amarelo de plástico, pés de metal. |
| ✅ Cadeira de bar | `chair_bar` | 14 | 1×1 | 0,46 m de assento | Amarela, de plástico. |
| ✅ Balcão do bar | `bar_counter` | 6 | 2×1 | 1,1 m | Madeira escura, frente vermelha frisada; emenda com o vizinho. |
| ✅ Banqueta de balcão | `stool_bar` | 6 | 1×1 | 0,75 m | Assento redondo vermelho, pé de metal com apoio de pé. |
| ✅ Prateleira de garrafas | `bar_shelf` | 4 | 2×1 | 2,0 m | Estante de parede cheia de garrafas coloridas, portas embaixo. |
| ✅ Geladeira amarela | `beer_fridge` | 1 | 1×1 | 2,0 m | Porta de vidro com garrafas, teclado numérico do lado; desliza e mostra a passagem. Faltam as costas. |
| ✱ Escada secreta | `stairs_down` | 1 | 1×1 | — | Vão escuro na parede com degraus descendo, luz vermelha lá no fundo. Só aparece quando a geladeira sai. |
| ✅ Fliperama | `arcade` | 1 | 1×1 | 1,8 m | Roxo e azul, tela de Tetris acesa. |
| ✅ Expositor de bebidas | `fridge_drinks` | 2 | 1×1 | 2,0 m | Vermelho, porta de vidro, cervejas e refrigerantes. Faltam as costas. |
| ✅ Frigobar | `minibar` | 2 | 1×1 | 0,9 m | Cinza, porta de vidro (atrás do balcão). Faltam as costas. |
| ✅ Mesa de sinuca | `pool_table` | 1 | 2×4 | 0,85 m | Feltro verde, caçapas de rede. |
| ✅ Engradado de cerveja | `beer_crate` | 4 | 1×1 | 0,35 m | Plástico amarelo com garrafas marrons; empilha. |
| ✅ Pilha de cadeiras | `chair_stack` | 1 | 1×1 | 1,3 m | Cadeiras amarelas empilhadas. |
| ✅ Aparador | `sideboard` | 1 | 2×1 | 0,9 m | Madeira escura, garrafas e copos em cima. |
| ✅ Armarinho | `bar_cabinet` | 1 | 1×1 | 1,0 m | Madeira, duas portas. |
| ✅ Poltrona vermelha | `armchair_red` | 1 | 1×1 | 0,45 m de assento | Couro vermelho gasto. |
| ✅ Sofá vermelho | `sofa_booth` | 1 | 2×1 | 0,45 m de assento | Couro vermelho gasto, dois lugares. |
| ✅ Planta | `plant` | 3 | 1×1 | 1,1 m | Vaso de barro (vale para a Sede inteira). |
| ✅ Barril de chope | `keg` | 1 | 1×1 | 0,6 m | Metal. |
| ✅ Lâmpada pendurada | `ceiling_lamp` | 7 | 1×1 | — | Cúpula preta de metal, luz quente (vale para os cômodos com ela). |
| ✅ Copo, cinzeiro | `beer_glass`, `ashtray` | 4, 2 | 1×1 | pequenos | Em cima das mesas e do balcão. |
| ✅ Tapete gasto | `rug_worn` | 1 | 2×3 | chão | Visto de cima. |
| Tapete persa | `rug_ornate` | 1 | 3×4 | chão | Vermelho-escuro, medalhão, franjas; visto de cima. |
| Sujeira | `dirt` | 9 | 1×1 | chão | Manchas, bitucas, tampinhas, papel amassado (decalque no chão). |
| ✅ Relógio, arandela | `clock`, `sconce` (parede) | 1, 2 | — | — | Isométricos, presos na parede; a arandela acesa e apagada. |
| ✅ TV de tubo, ventilador | `tv_wall`, `fan_wall` (parede) | 1, 1 | — | — | A TV passando futebol, no alto; o ventilador na parede da esquerda. |
| Letreiro neon | `neon_bar` (parede) | 1 | 64×26 px | — | "BAR" em neon rosa: fica no desenho do jogo (a arte não leva texto). |

### Salão Principal

O coração da Sede: operações, a mesa da equipe e a escada que sobe para o bar.

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Mesa de trabalho | `table_work` | 3 | 3×2 | 0,78 m | Mesa preta comprida com papéis espalhados. |
| ✱ Escada que sobe | `stairs_up` | 1 | 1×2 | até 0,9 m | Degraus de madeira subindo para a porta, corrimão. |
| Mesa redonda | `table_round` | 1 | 2×2 | 0,76 m | Madeira escura, redonda. |
| Cadeira estofada | `chair_red` | 10 | 1×1 | 0,46 m | Vermelha. |
| Cadeira de escritório | `chair_office` | 17 | 1×1 | 0,5 m | Preta, de rodinhas. |
| Mesa oval | `table_meeting` | 1 | 3×2 | 0,8 m | Mesa comprida de madeira marrom (na planta é oval). |
| Mesa de xadrez | `table_chess` | 1 | 1×1 | 0,72 m | Tabuleiro quadriculado, peças. |
| Poltrona | `armchair` | 3 | 1×1 | 0,45 m | Couro escuro: duas no xadrez, uma de cada lado, e uma na mesa oval. |
| Banco de madeira | `bench` | 2 | 2×1 | 0,45 m | — |
| Luminária de chão, arquivo, planta | `floor_lamp`, `cabinet_file`, `plant` | 1, 2, 2 | 1×1 | 1,2–1,9 m | Os arquivos na parede do fundo, ao lado da mesa redonda. |
| Quadro, tela de projeção | `board_investigation`, `screen` (parede) | 1, 1 | — | — | Quadro de cortiça com fios vermelhos; tela branca com o mapa projetado. |

### Corredor

Com arte desde 02/10. Corredor comprido de blocos de concreto com a faixa verde, vigiado por duas câmeras nas pontas. Na parede de cima: o banco, os armários do vestiário, o quadro de avisos de frente para a porta do Salão, o extintor, a caixa de força, a planta e as lixeiras perto das portas. No fim, a limpeza pela metade: o carrinho do zelador, a poça e a placa de piso molhado. Chão de concreto com rachaduras (estilo `bloco`, só dele: o Salão continua com o concreto e a pedra dele).

| Item | Id | Qtd | Casas | Altura |
|---|---|---|---|---|
| Passagem | `portal` | 6 | 1×1 | 0,9 × 2,1 m (aberta, fechada ou trancada) |
| Armários de vestiário | `locker_row` | 2 | 2×1 | 1,9 m (três portas; emendam) |
| Carrinho de limpeza | `janitor_cart` | 1 | 1×1 | 1,1 m |
| Placa de piso molhado, lixeira de metal | `wet_sign`, `trash_can` | 1, 3 | 1×1 | 0,6 m |
| Grade de ventilação, poça | `vent`, `puddle` | 3, 1 | 1×1 | chão |
| Banco, planta | `bench`, `plant` | 1, 1 | — | — |
| Câmera, quadro de avisos, caixa de força, extintor | `cctv`, `notice_board`, `power_box`, `extinguisher` (parede) | 2, 1, 1, 1 | — | — |
| Canos, luz de emergência, fluorescente | `pipes`, `emergency_light`, `fluorescent` | 3, 2, 5 | — | — |

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

Com arte desde 02/10. As bancadas de inox da enfermaria ficam encostadas na parede do fundo (com o microscópio e o computador) e na da esquerda (com o radar), e duas formam a ilha no meio, de frente para a sala, com as banquetas. A estante fica no canto, ao lado da porta, e os arquivos, na outra ponta. Chão de lajotas brancas e azuis; parede de azulejo branco com faixa azul e reboco cinza em cima.

| Item | Id | Qtd | Casas | Altura | Estados |
|---|---|---|---|---|---|
| ✱ Bancada de laboratório | `lab_bench` | 6 | 2×1 | 0,92 m | — (emendam) |
| Microscópio | `microscope` | 2 | em cima da bancada | 0,42 m | — |
| Frascos (tubos de ensaio, erlenmeyers, placas de Petri) | `flasks` | 3 | em cima da bancada | 0,25 m | — |
| Computador de tela plana | `monitor` | 1 | em cima da bancada | 0,45 m | ligado (a tela brilha) / desligado |
| Monitor de radar | `monitor_green` | 1 | em cima da bancada | 0,42 m | — (a tela pulsa) |
| Banqueta de laboratório | `stool_lab` | 3 | 1×1 | 0,62 m | — |
| Estante de livros | `bookshelf` | 1 | 2×1 | 2,2 m | — (também na Sala de Rituais) |
| Arquivos, cadeiras, carrinho | `cabinet_file`, `chair_office`, `trolley` | 2, 2, 1 | — | — | — |
| Quadro de investigação, anotações | `board_investigation`, `notes_wall` (parede) | 1, 1 | — | — | — |

### Sala de Tecnologia

Com arte desde 02/10. Três estações de trabalho separadas na parede do fundo, cada uma com a sua cadeira, embaixo do painel com as câmeras da Sede; a prateleira de manuais perto da porta e o ar-condicionado no canto. Na parede da esquerda, os dois racks de servidores com o nobreak e os cabos, a impressora matricial, a estante de fitas e o bebedouro. O quadro branco fica no meio do carpete roxo, virado para a sala, e as caixas de peças, no canto da frente. Parede de reboco cinza-arroxeado descascando, com a canaleta dos fios.

| Item | Id | Qtd | Casas | Altura | Estados |
|---|---|---|---|---|---|
| ✱ Bancada de computadores | `console` | 3 | 2×1 | tampo a 0,75 m, monitores a 1,2 m | ligada (as telas brilham) / desligada |
| Cadeira de escritório | `chair_office` | 3 | 1×1 | 1 m | — |
| Rack de servidores | `server_rack` | 2 | 1×1 | 1,3 m (o desenho veio largo: na largura da casa, ficou um rack de meia altura) | — |
| Impressora matricial | `printer_dot` | 1 | 1×1 | 0,65 m | — |
| Quadro branco | `whiteboard` | 1 | 3×1 | 1,8 m | — |
| Estante de mídias, bebedouro, caixas de peças, nobreak | `media_shelf`, `water_cooler`, `parts_boxes`, `ups` | 1, 1, 2, 1 | — | — | — |
| Cabos no chão | `cables_floor` | 1 | 3×1 | chão | — |
| Painel de monitoramento, ar-condicionado, prateleira | `monitor_wall`, `ac_wall`, `shelf_wall` (parede) | 1, 1, 2 | — | — | o painel: ligado / desligado |

### Gabinete

Com arte desde 02/10. A mesa de quem manda fica de costas para a parede da esquerda, de frente para a sala, com o quadro atrás. Quem vem prestar contas senta do outro lado, no tapete. No canto, duas poltronas e a mesinha com os livros, perto do candelabro. O arquivo e o armário de metal ficam na parede do fundo, ao lado da porta. Chão de taco em espinha de peixe; parede de lambri com papel verde.

| Item | Id | Qtd | Casas | Altura | Estados |
|---|---|---|---|---|---|
| ✱ Mesa do gabinete | `desk_wood` | 1 | 2×1 | 0,8 m | — (gavetas e vão das pernas na frente, painel fechado atrás) |
| ✱ Poltrona de couro | `armchair_leather` | 5 | 1×1 | 0,78 m | — |
| Luminária de mesa | `desk_lamp` | 1 | em cima da mesa | 0,45 m | acesa / apagada |
| Armário de metal | `locker` | 1 | 1×1 | 1,95 m | fechado / aberto |
| Candelabro | `candelabra` | 1 | 1×1 | 1,6 m | aceso (as chamas mexem) / apagado |
| Pilha de livros | `books_stack` | 1 | em cima da mesinha | 0,4 m | — (dois giros) |
| Papéis espalhados | `papers` | 1 | 1×1 | chão | — |
| Tapete persa, mesinha, arquivo, planta | `rug_ornate`, `table_small`, `cabinet_file`, `plant` | 1 cada | — | — | — |
| Quadros, relógio | `painting`, `clock` (parede) | 2, 1 | — | — | — |

### Sala de Rituais

Com arte desde 02/10. O círculo ritual fica no meio da sala, com o crânio de vela no centro, um grupo de velas em cada um dos quatro lados e sangue. Na parede do fundo, a estante, o balcão dos frascos (os módulos emendam) e a mesa redonda do canto, com a cadeira. Na parede da esquerda, a mesa das ferramentas (faca, giz, tigela, corda e velas) com a banqueta, e mais um balcão. Cartazes de sigilo e arandelas nas paredes. Chão de lajes de pedra com musgo; parede de pedra antiga com escorridos. Os sigilos são todos inventados.

| Item | Id | Qtd | Casas | Altura | Estados |
|---|---|---|---|---|---|
| ✱ Círculo ritual | `sigil_floor` | 1 | 3×3 | chão | — |
| Balcão de madeira | `counter_wood` | 3 | 2×1 | 0,9 m | — (emendam; potes na prateleira de baixo) |
| Mesa das ferramentas | `table_tools` | 1 | 2×1 | 0,8 m | — |
| Velas no chão | `candles` | 5 | 1×1 | 0,35 m | acesas (as chamas mexem) / apagadas |
| Crânio com vela | `skull` | 2 | 1×1 | 0,3 m | — |
| Cadeira e banqueta de madeira | `chair_wood`, `stool` | 1, 1 | 1×1 | 0,9 e 0,55 m | — |
| Gotas e poça de sangue | `blood_drops`, `blood_pool` | 2, 1 | 1×1 | chão | — |
| Estante, mesa redonda, livros, frascos, papéis | `bookshelf`, `table_round`, `books_stack`, `flasks`, `papers` | 1 cada (frascos 2) | — | — | — |
| Cartaz de sigilo, arandela | `poster_sigil`, `sconce` (parede) | 2, 3 | — | — | — |

### Banheiro

| Item | Id | Qtd | O que desenhar |
|---|---|---|---|
| Vaso, pia, espelho | `toilet`, `sink`, `mirror` | 2, 2, 2 | No fundo, duas cabines com divisória (`stall_panel`); as pias e os espelhos na parede da porta, com a papeleira e a lixeira perto. A pia de agora veio desenhada de frente (encostada na parede diagonal, parece torta): pedida de novo, girada 45°. |

### Enfermaria

Seis leitos separados por divisórias, o armário dos remédios, a bancada e o posto da enfermagem. Luz fria das fluorescentes.

Os leitos ficam nas paredes de cima e de baixo, com a cabeceira na parede. A bancada, com a pia na ponta, encosta na parede da esquerda, entre os leitos. Os armários de remédio, o arquivo e outra pia ficam na parede da porta. O posto da enfermagem fica perto da porta, de frente para quem entra: a mesa com o computador virado para a cadeira.

| Item | Id | Qtd | Casas | Altura | O que desenhar |
|---|---|---|---|---|---|
| ✱ Leito hospitalar | `hospital_bed` | 6 | 1×3 | 0,7 m | Metal branco, cabeceira levantada, lençol verde-claro, grades baixadas, rodinhas. A frente é o pé da cama. |
| ✱ Divisória hospitalar | `divider` | 8 | 1×1 | 1,6 m | Biombo de um painel, armação branca com rodinhas, cortina verde-clara. |
| ✱ Armário de remédios | `medical_cabinet` | 2 | 2×1 | 1,9 m | Metal branco, portas de vidro em cima com frascos, metal embaixo, cruz verde de farmácia. |
| Suporte de soro | `iv_stand` | 6 | 1×1 | 1,9 m | Haste cromada, bolsa de soro com o tubo, base de 5 pés com rodinhas. |
| Pia | `sink` | 2 | 1×1 | 0,9 m | Louça branca numa coluna, torneira de alavanca. |
| Bancada | `lab_bench` | 3 | 2×1 | 0,9 m | Tampo de inox, gabinete branco com gavetas e portas; os três módulos formam um balcão só. |
| Carrinho de enfermagem | `trolley` | 1 | 1×1 | 0,95 m | Inox, 3 prateleiras com gaze, frascos e luvas, rodinhas. |
| Mesa do posto | `desk_metal` | 1 | 2×1 | 0,8 m | Metal cinza, gaveteiro, papéis e uma prancheta. |
| Cadeira de escritório | `chair_office` | 1 | 1×1 | 0,5 m de assento | Preta, de rodinhas. |
| Arquivo de aço | `cabinet_file` | 1 | 1×1 | 1,35 m | Cinza, 4 gavetas. |
| Monitor de sinais vitais | (novo) | 1 | 1×1 | 0,3 m | Em cima da bancada: tela escura com a linha verde do batimento. |
| Bandeja de remédios | `flasks` | 1 | 1×1 | 0,25 m | Em cima da bancada: inox, frascos, vidro âmbar, seringas. |
| Monitor de computador | `monitor` | 1 | 1×1 | 0,4 m | Em cima da mesa do posto: de tubo, bege, com teclado. |
| Luminária fluorescente | `fluorescent` | 5 | 1×1 | teto | Calha branca com duas lâmpadas tubulares, luz fria. |
| Luz de emergência | `emergency_light` (parede) | 1 | — | — | Caixa branca com dois faroletes; acesa e apagada. |
| ✅ Relógio | `clock` (parede) | 1 | — | — | O mesmo do bar. |
| Chão e parede | estilo `ladrilho` | — | — | — | Lajotas brancas encardidas; azulejo branco até a metade e verde-água em cima. |

### Arsenal

Com arte desde 02/10. Os armários de armas ficam na parede do fundo, dos dois lados da porta, com o suporte de facas e machado entre eles. Os armários de munição ficam no canto do fundo e na parede da esquerda, junto do painel de ferramentas, dos baús (um aberto) e do alvo de papel furado. A bancada em U fica no meio, com as banquetas e uma mancha de óleo no chão, e as caixas de munição ficam empilhadas no canto da frente. Chão de chapa xadrez; parede de blocos verde-oliva e cinza.

| Item | Id | Qtd | Casas | Altura | Estados |
|---|---|---|---|---|---|
| ✱ Bancada de armas | `gun_table` | 4 | 3×1 | 0,85 m | — |
| Armário de armas | `weapon_rack` | 4 | 2×1 | 2,0 m | — (as costas são o espelho de uma vista só: a folha trouxe as duas iguais) |
| Armário de munição | `locker_ammo` | 5 | 1×1 | 1,9 m | fechado / aberto |
| Baú militar | `chest_army` | 2 | 1×1 | 0,45 m | fechado / aberto |
| Caixa de munição | `ammo_box` | 4 | 1×1 | 0,3 m | — (empilha) |
| Banqueta giratória | `stool_metal` | 2 | 1×1 | 0,6 m | — |
| Mancha de óleo | `oil_stain` | 1 | 1×1 | chão | — |
| Painel de ferramentas, suporte de armas brancas, alvo de papel | `tool_board`, `blade_rack`, `target_paper` (parede) | 1 cada | — | — | — |

## Personagens

- **Retratos (cartas do grupo):** 4 estados por personagem, olhando para a direita, corpo inteiro: `retrato-desarmado.png`, `retrato-armado.png`, `retrato-desarmado-machucado.png`, `retrato-armado-machucado.png`, na pasta do personagem (`client/public/arte/personagens/<nome>/`). Para piscar, a mesma imagem de olhos fechados: `retrato-<estado>-olhos-fechados.png`. O jogo acha os arquivos sozinho (sem reiniciar) e tira fundo branco.
- **Quem escolhe o estado:** "machucado" vem da ficha (menos da metade dos PV, como no livro); "armado" é um botão no painel do personagem.
- **Andando:** ainda não há folha de andar. Quando o formato entrar em `docs/ARTE.md`, cada personagem ganha folhas de andar (armado e desarmado) feitas para o CROMA.

## Próximos passos de vida no mapa (código)

- Luz de cada cômodo com a cor da sala ✔ (primeira versão), lâmpadas frias no subsolo ✔, poeira na luz ✔, fumaça e brasas das velas ✔.
- A fazer: luz piscando de verdade em fluorescente velha, vapor na enfermaria, reflexo do neon no chão do bar, faíscas no arsenal, névoa baixa na câmara.
