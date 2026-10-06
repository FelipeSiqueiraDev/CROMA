# Tela de entrada: o fundo vivo

A tela de entrada (`client/src/ui/entrada.ts`) é a arte do Felipe: a mesa de RPG à luz de vela, com o painel do CRONA. Desde 06/10 o fundo é **uma cena sorteada a cada visita**, sempre no estilo da arte de hoje e sempre **genérica**: nada dos agentes da campanha aparece aqui (decisão do Felipe em 06/10). O que varia são os elementos da mesa e do ambiente, em vários universos de RPG.

O código da cena fica em `client/src/ui/entradaCena.ts`; os retângulos das peças trocáveis, em `client/src/ui/entradaRemendos.json`.

## O que varia

| O quê | Como | Quem faz |
|---|---|---|
| **A hora** | A do relógio. De dia o céu da janela fica azul, com sol e nuvens, a sala clareia e entram raios de sol; no amanhecer e no entardecer, dourado; de noite, a arte como foi desenhada (lua e estrelas). As janelas do castelo apagam de dia. | código |
| **O clima** | Limpo, nuvens, chuva, neblina ou tempestade (com relâmpago, que clareia a sala). Estrela cadente na noite limpa; pássaros de dia, morcegos de noite. | código |
| **O universo** | Fantasia, Horror cósmico, Paranormal ou Tormenta (não repete o da última visita). Muda a cor da chama (verde no horror, vermelha no paranormal), o clima mais provável (neblina no horror, tempestade rubra na Tormenta), a aurora verde, a névoa na sala, as faíscas de magia, e quais peças trocáveis podem entrar. | código |
| **A vela** | Acesa ou apagada (de noite quase sempre acesa; de dia, quase sempre apagada). Apagada de noite, a sala fica no luar azul e sobe um fio de fumaça do pavio. | código (e a peça `vela-apagada` do Códex, quando chegar) |
| **O monstro** | Às vezes (mais no horror e no paranormal): olhos que brilham e piscam lá fora, na janela, e num canto escuro da sala. Só aparecem com a sala escura (fim de tarde e noite). Com o mapa de monstro do Códex, ele vai para a mesa. | código + Códex |
| **A caneca, a vela e o mapa da mesa** | Peças trocáveis: o Códex redesenha só aquele pedaço da arte, e o jogo põe por cima. Cada uma tem os universos em que pode aparecer. | Códex |

Tudo o que o código faz já funciona sem arte nova. As peças trocáveis entram sozinhas quando o arquivo existe.

## Ver uma cena de propósito

No endereço da tela de entrada:

- `?hora=14.5` (qualquer hora) ou `?hora=ciclo` (o dia inteiro em um minuto);
- `?universo=fantasia` | `horror` | `paranormal` | `tormenta`;
- `?clima=limpo` | `nuvens` | `chuva` | `neblina` | `tempestade`;
- `?vela=apagada` (ou `acesa`);
- `?monstro=sim` (ou `nao`).

Ex.: `http://localhost:5173/?hora=23&universo=horror&clima=neblina&monstro=sim`. Quem pede menos movimento no sistema vê a cena parada, com a hora e o clima certos.

## As peças trocáveis (remendos)

Cada peça é um retângulo fixo da arte (`entradaRemendos.json`), um para o computador e um para o celular. O Códex recebe esse pedaço da arte ampliado (o **gabarito**), desenha a variante por cima e devolve a imagem no mesmo tamanho. O script reduz, mistura a borda com a arte e salva no lugar certo:

```bash
npm i --no-save sharp
node scripts/entrada-remendos.mjs gabaritos <pasta>          # os 6 gabaritos (3 peças × 2 telas)
node scripts/entrada-remendos.mjs encaixar <entrega.png> caneca-cerveja-computador
```

O remendo vai para `client/public/arte/login/variantes/<peça>-<id>-<tela>.webp`, e ao lado da entrega fica `previa-<...>.png`, a arte inteira com o remendo, para conferir. A cena reilumina o remendo junto com o resto (dia, dourado, luar), por isso ele deve vir **na luz da noite à luz de vela**, como a arte de hoje.

| Peça | Gabarito (computador) | Gabarito (celular) |
|---|---|---|
| caneca | 1024×1024 | 1024×1536 |
| vela | 1024×1536 | 1024×1536 |
| mapa (o mapa da mesa, com o que está em cima dele) | 1536×1024 | 1536×1024 |

### A lista (o `id` e onde pode aparecer)

A ordem de entrada é a da lista em `VARIANTES` (`entradaCena.ts`). Marque `- [x]` quando o remendo entrar (computador / celular).

**Vela**
- [ ] `vela-apagada`: a mesma vela, apagada: sem chama, a cera sem brilho por dentro, o pavio preto e curvado. A fumaça o jogo faz. (todos)
- [ ] `vela-castical-cranio`: vela num castiçal de crânio, acesa, cera escorrendo. (horror, paranormal)
- [ ] `vela-lampiao`: lampião de ferro com vidro, aceso. (fantasia, Tormenta)

**Caneca**
- [ ] `caneca-cerveja`: caneca de madeira com aros de ferro, cerveja com espuma escorrendo. Gelada: sem vapor. (fantasia, Tormenta)
- [ ] `caneca-cafe`: caneca de cerâmica lascada com café fumegante. (todos)
- [ ] `caneca-cha-verde`: xícara de porcelana antiga com chá esverdeado, folhas no pires. (horror)
- [ ] `caneca-xicara-rachada`: xícara rachada com borra de café e uma colher de prata. (paranormal, horror)
- [ ] `caneca-chifre`: chifre de beber com bocal de metal, hidromel. Gelada: sem vapor. (fantasia, Tormenta)

**Mapa da mesa** (o mapa e o que está em cima dele: dados, miniaturas genéricas de estanho)
- [ ] `mapa-reino`: mapa de um reino de fantasia com rios, florestas e um castelo. (fantasia)
- [ ] `mapa-ilha-afundada`: carta náutica velha de uma ilha meio afundada, com marcas de sondagem e anotações em tinta. (horror)
- [ ] `mapa-cidade-investigacao`: planta de bairro de uma cidade moderna, com fotos presas, alfinetes e barbante vermelho ligando pontos. Sem símbolos oficiais. (paranormal)
- [ ] `mapa-continente-rubro`: mapa de continente com uma mancha de tempestade vermelha engolindo uma região. (Tormenta)
- [ ] `mapa-masmorra`: planta de masmorra em papel quadriculado, com portas, armadilhas e corredores. (fantasia, Tormenta)

**Mapa com monstro** (só entra quando a cena sorteia monstro)
- [ ] `mapa-dragao`: o mapa do reino com uma miniatura pintada de dragão vermelho sobre ele. (fantasia)
- [ ] `mapa-tentaculos`: a carta náutica com uma miniatura de criatura de tentáculos saindo do mar. (horror)
- [ ] `mapa-criatura`: a planta do bairro com uma miniatura de criatura magra e retorcida, de olhos vermelhos. (paranormal)
- [ ] `mapa-lefeu`: o mapa do continente rubro com uma miniatura de demônio-inseto de carapaça vermelha. (Tormenta)

## A primeira leva (para o Felipe aprovar)

Três peças, só no computador: `caneca-cerveja`, `vela-apagada` e `mapa-tentaculos`. Aprovado o estilo, vem o resto (e o celular).

Pedido pronto para o Códex (anexe o gabarito de cada peça):

```text
Você vai redesenhar um pedaço de uma ilustração em pixel art. Anexei o gabarito: é um recorte
ampliado da tela de entrada de um jogo de RPG de mesa (uma mesa de madeira à noite, iluminada por
uma vela à esquerda, com a lua entrando pela janela ao fundo). Para cada pedido, devolva UMA imagem
do MESMO tamanho do gabarito, com o MESMO enquadramento.

Regras para as três:
- Mude só a peça pedida. Todo o resto (a madeira da mesa, os papéis, os dados, as bordas, a
  posição de cada coisa) continua igual ao gabarito, pixel por pixel, porque a imagem vai ser
  colada de volta por cima da original e a borda precisa casar.
- O mesmo estilo do gabarito: pixel art pintada de alta qualidade, pixels grandes e nítidos, sem
  suavizar, sem desfoque, a mesma paleta escura de marrons, dourados e azuis.
- A mesma luz: noite, luz quente da vela vindo da esquerda e um pouco de luar azulado de trás.
- Sem texto, sem letras, sem números legíveis, sem logotipo, sem marca d'água.
- Sem símbolos de jogos ou marcas reais: tudo genérico.

1) caneca-cerveja (gabarito-caneca-computador.png, 1024×1024)
Troque a caneca de cerâmica por uma caneca de madeira com aros de ferro, cheia de cerveja, com
espuma clara transbordando e escorrendo pela lateral, no mesmo lugar e no mesmo tamanho da caneca
de hoje, sobre o mesmo pires/apoio. Sem vapor saindo.
Salve como: caneca-cerveja-computador.png

2) vela-apagada (gabarito-vela-computador.png, 1024×1536)
A mesma vela, no mesmo castiçal dourado, mas APAGADA: sem chama nenhuma e sem o brilho em volta,
o pavio preto e um pouco curvado, a cera em tons de creme apagados (não acesa por dentro), com a
cera derretida e solidificada escorrendo. A parede e os objetos atrás ficam mais escuros, sem a
luz da vela. Sem fumaça (o jogo desenha a fumaça).
Salve como: vela-apagada-computador.png

3) mapa-tentaculos (gabarito-mapa-computador.png, 1536×1024)
Troque o mapa de fantasia por uma carta náutica antiga e amarelada de uma ilha meio afundada:
mar com linhas de profundidade, uma costa irregular, rochas, um farol pequeno e anotações em
tinta borradas (rabiscos, não letras legíveis). Os dados continuam nos mesmos lugares. No lugar
das duas miniaturas de estanho, uma miniatura pintada maior (mais ou menos do tamanho de um dado
grande) de uma criatura de tentáculos saindo do mar, verde-escura e úmida, com olhos amarelados,
sobre uma base redonda de miniatura. Clima de horror cósmico, mas sem sangue.
Salve como: mapa-tentaculos-computador.png
```

Com as três de volta: `node scripts/entrada-remendos.mjs encaixar caneca-cerveja-computador.png caneca-cerveja-computador vela-apagada-computador.png vela-apagada-computador mapa-tentaculos-computador.png mapa-tentaculos-computador`, e conferir com `?universo=fantasia&vela=acesa` (a caneca), `?vela=apagada` e `?universo=horror&monstro=sim` (o mapa).

## Decisões

- **06/10:** a tela de entrada não usa nada dos agentes da campanha; é genérica, em vários universos de RPG (fantasia, horror cósmico, paranormal, Tormenta), no estilo da arte de hoje, variando os elementos (caneca, vela, mapa, monstro), a hora e o clima.
- **06/10:** a primeira leva de peças do Códex vem só no computador, para o Felipe aprovar o estilo.

## O que falta

- A primeira leva do Códex (acima) e, aprovada, o resto da lista e o celular.
- Ideias para depois: o que voa no céu por universo (dragão ao longe, corvos), uma ameaça grande aparecendo no clarão do relâmpago, o livro da mesa trocando de capa.
