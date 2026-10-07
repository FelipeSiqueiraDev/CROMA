# Fazenda Olhos de Águia

A primeira missão grande, em mundo aberto. As plantas que serviram de base (a vista da fazenda, a do casarão e a da casa de mantimentos com o celeiro) ficam só neste computador.

A ordem foi primeiro fazer funcionar e depois deixar bonito. Por isso o chão, os prédios, a cerca e as árvores estão desenhados em código. Quando a arte chegar, ela entra por cima, como na Sede (`docs/ARTE.md`).

A montagem fica em `server/src/seedFazenda.ts`. Mudou alguma coisa? Suba `FAZENDA_REV`: a fazenda é refeita no lugar, com as mesmas cenas, peças e registro.

## Como funciona

- **Campanha própria:** "Fazenda Olhos de Águia", aberta pelo menu ⚙ → Todas as cenas. A Sede continua sendo a campanha que abre por padrão. Os quatro agentes começam na porteira.
- **Ao ar livre:**
  - A fazenda e os arredores são cenas `aberto`: sem parede, sem teto.
  - O chão vem casa por casa no `terreno` do cômodo. Cada casa é uma letra (`TERRENOS`, em `shared/src/room.ts`):

    | Letra | Chão |
    |---|---|
    | `g` | grama |
    | `t` | estrada |
    | `l` | terra arada |
    | `p` | pedra clara |
    | `d` | terra |
    | `m` | madeira (píer e ponte) |
    | `a` | água |

  - A água fica numa casa vazia da planta: ninguém pisa nela, e o tabuleiro desenha a água mais baixa que a margem.
- **Prédios:**
  - Casarão, celeiro e casa de mantimentos são mobis grandes.
  - Na frente da porta de cada um fica uma **Entrada**, um capacho que é uma passagem: quem para em cima entra.
  - De dentro, a porta da frente leva de volta para a Entrada.
- **Porteira:**
  - Aberta, quem para em cima vai para os **Arredores**. Fechada (clique duplo), ninguém passa.
  - Nos Arredores, a porteira da fazenda leva de volta.
- **Escada do casarão:** a do hall sobe para o corredor de cima, onde o vão da escada (com corrimão) desce de volta. A peça chega sempre no pé da escada.
- **Raio-x:** árvore, prédio ou parede interna na frente de qualquer peça fica transparente.
- **Desempenho:** o tabuleiro não desenha o que está fora da tela. A fazenda tem mais de 400 mobis e roda a 3–5 ms por quadro.
- **Tamanho:** cenas até 80×80 casas (`MAX_ROOM_SIZE`).

## As cenas

| Aba da planta | Cena | O que tem |
|---|---|---|
| Fazenda | Olhos de Águia (72×36) | A porteira, a volta de terra em redor do casarão, o pátio com a fonte, a casa de mantimentos, o celeiro, oito leiras (milharal e canteiros), o lago com o píer, a cerca em volta e a do meio, e as árvores |
| Arredores | Arredores (48×30) | A estrada de terra, o rio com a ponte, a mata e a trilha, as roças dos vizinhos e as placas para Santo Berço, a mata e a rodovia |
| Casarão | Hall, Cozinha, Sala de Jantar, Banheiro de Baixo, Quarto das Crianças, Escritório | O hall leva a todos os cômodos e à escada |
| Casarão 2º | Corredor de Cima, Quarto Principal, Banheiro de Cima, Quartos 1, 2 e 3 | O corredor leva aos quartos, ao banheiro e à escada |
| Galpões | Casa de Mantimentos, Celeiro | Depósito, prateleiras e sacas, as ferramentas e o escritório do capataz; as três baias, o feno, o depósito e a carroça |
| Calabouço | Calabouço, Corredor Escuro, Sala de Sangue | Embaixo do feno do celeiro (03/10): os computadores e os tanques com gente dentro, o altar no estrado redondo, o corredor escuro e a salinha cheia de sangue |

Cada cômodo do casarão é girado para a porta principal ficar numa parede do fundo (as da frente não aparecem). Na planta ele volta para a posição da planta original (`plan.r`).

## O calabouço (03/10)

Embaixo de um fardo de feno do celeiro (a quina da pilha, em `4,13`) fica um **alçapão** escondido (`alcapao`, `hidden`). É a passagem secreta da geladeira da Sede, só que **sem senha**: o feno tem `lock.semSenha`.

- **Abrir:** o clique duplo do mestre no feno (ou "Empurrar e revelar" no painel do objeto) empurra o fardo uma casa para trás, e o alçapão aparece. De novo, ele volta e cobre.
- **Regras da passagem secreta:** sem ninguém no celeiro, o feno volta sozinho e esconde o alçapão. Quem sobe do calabouço com a passagem fechada abre por dentro e sai do lado do buraco.
- **A descida:** o alçapão desce por uma **escada de mão** vertical (`escada_vertical`), presa na parede do fundo do calabouço. Quem desce chega no pé dela; quem pisa nela sobe.

As três cenas do andar "Calabouço" são de pedra (`selo`), escuras e com névoa. A referência do clima é uma filmagem de dentro do calabouço, que fica na pasta da arte do GPT (`gabaritos/referencia-calabouco-filmagem.png`).

- **Calabouço (16×14):**
  - **Parede da esquerda:** os computadores e os racks.
  - **Tanques:** três, com gente dentro, e as pistas ocultas contam quem está em cada um.
  - **Mesa e carrinho:** a mesa de trabalho com os frascos e o monitor de sinais vitais.
  - **Estrado do altar:** no meio, redondo e um degrau acima do chão (altura 1, uns 60 cm). Em cima, o círculo de sangue, o altar no fundo, as velas e os crânios na borda.
  - **Clima:** um rastro de sangue até o corredor, poças, as arandelas e o estandarte.
- **Corredor Escuro (3×14):** quase sem luz, com a luz piscando. Tem o rastro de sangue, as correntes, as marcas de contagem e o sigilo riscado, e a porta do fim leva à Sala de Sangue.
- **Sala de Sangue (6×5):** sangue no chão inteiro, a mesa de metal no meio, o ralo entupido, as correntes nas paredes e a luz vermelha.

As pistas do calabouço começam **ocultas** (só o mestre vê); o mestre mostra conforme os jogadores investigam.

## Falta

- **Lugares dos arredores:** Santo Berço, a mata e a rodovia ainda não têm cena. Hoje só as placas.
- **Ligar a Sede aos arredores:** ainda é uma decisão. Uma passagem entre as duas junta as campanhas numa só (campanha = cenas ligadas por passagens), com o registro, os objetivos e a planta da Sede.
- **Arte para deixar bonito:** o pedido inteiro está na pasta da arte do GPT, em `PROMPT-FAZENDA.txt`, que começa pelo teste `fazenda-teste.zip`. A lista também está no [`CHECKLIST-ARTE.md`](CHECKLIST-ARTE.md), em "Fazenda Olhos de Águia e o calabouço". O pedido cobre:
  - o chão de fora e as paredes;
  - os prédios, a porteira, a fonte e a placa;
  - as árvores e a lavoura;
  - os móveis do casarão e dos galpões;
  - o calabouço (alçapão, escada de mão, tanques com corpos, a mesa de contenção, crânios, tocha e estandarte).

  Ainda fora do pedido:
  - os animais das baias;
  - a vista de cima da fazenda.
- **Peças novas do calabouço que ainda não existem no jogo:** a mesa de contenção (hoje é a mesa metálica), a pilha de crânios, a tocha de parede e o estandarte (hoje é o pôster de sigilo). Quando a arte chegar, cada uma vira um mobi novo.
- **O chão do píer e da ponte:** o terreno `m` usa o estilo `taco`, com tacos de sala. Precisa de um estilo de tábuas (`piso-pier.png` no pedido).
- **O chão do calabouço:** hoje usa o `selo`, a pedra da Câmara do Selo. Quando `piso-calabouco.png` e `parede-calabouco.png` chegarem, ele ganha um estilo próprio.
- **Andar mais rápido ao ar livre:** a peça anda uma casa a cada 500 ms. Atravessar a fazenda leva uns 30 s.
