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

Cada cômodo do casarão é girado para a porta principal ficar numa parede do fundo (as da frente não aparecem). Na planta ele volta para a posição da planta original (`plan.r`).

## Falta

- **Lugares dos arredores:** Santo Berço, a mata e a rodovia ainda não têm cena. Hoje só as placas.
- **Ligar a Sede aos arredores:** ainda é uma decisão. Uma passagem entre as duas junta as campanhas numa só (campanha = cenas ligadas por passagens), com o registro, os objetivos e a planta da Sede.
- **Arte para deixar bonito:**
  - os prédios vistos de fora, nos 4 giros;
  - a porteira;
  - a cerca;
  - árvores e arbustos variados;
  - a fonte;
  - as plantações;
  - o feno;
  - a carroça;
  - as texturas de grama, estrada, terra arada e água;
  - os móveis de casa de fazenda (fogão a lenha, pia, armários, camas, banheira);
  - os animais das baias.
- **Andar mais rápido ao ar livre:** a peça anda uma casa a cada 500 ms. Atravessar a fazenda leva uns 30 s.
