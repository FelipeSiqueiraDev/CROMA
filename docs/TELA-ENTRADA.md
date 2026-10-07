# Tela de entrada: o fundo vivo

A tela de entrada (`client/src/ui/entrada.ts`) é a arte do Felipe: a mesa de RPG à luz de vela, com o painel do CRONA. Desde 06/10 o fundo é **uma cena sorteada a cada visita**, sempre no estilo da arte de hoje e sempre **genérica**: nada dos agentes da campanha aparece aqui (decisão do Felipe em 06/10). O que varia são os elementos da mesa e do ambiente, em vários universos de RPG.

O código da cena fica em `client/src/ui/entradaCena.ts`. O pedido de arte do kit em camadas é o [`PROMPT-ENTRADA.txt`](PROMPT-ENTRADA.txt).

## O que varia

| O quê | Como | Quem faz |
|---|---|---|
| **A hora** | A do relógio. De dia o céu da janela fica azul, com sol e nuvens, a sala clareia e entram raios de sol; no amanhecer e no entardecer, dourado; de noite, a arte como foi desenhada (lua e estrelas). As janelas do castelo apagam de dia. | código |
| **O clima** | Limpo, nuvens, chuva, neblina, neve ou tempestade (com relâmpago, que clareia a sala). Estrela cadente na noite limpa; pássaros de dia, morcegos de noite. | código |
| **O universo** | Fantasia, Horror cósmico, Paranormal ou Tormenta (não repete o da última visita). Muda a cor da chama (verde no horror, vermelha no paranormal), o clima mais provável (neblina no horror, tempestade rubra na Tormenta), a aurora verde, a névoa na sala, as faíscas de magia, e quais peças trocáveis podem entrar. | código |
| **A vela** | Acesa ou apagada (de noite quase sempre acesa; de dia, quase sempre apagada). Apagada de noite, a sala fica no luar azul e sobe um fio de fumaça do pavio. | código |
| **O monstro** | Hoje, olhos que brilham e piscam lá fora e num canto escuro da sala. Com o kit, o monstro vai para o tabuleiro: uma miniatura do universo encarando os heróis em cima do mapa. | código; o kit, do Códex |
| **A paisagem, a sala, o mapa, as miniaturas, os dados, a vela e a caneca** | O kit em camadas (abaixo), pedido ao Códex em 07/10. | Códex |

Tudo o que o código faz já funciona sem arte nova.

## Ver uma cena de propósito

No endereço da tela de entrada:

- `?hora=14.5` (qualquer hora) ou `?hora=ciclo` (o dia inteiro em um minuto);
- `?universo=fantasia` | `horror` | `paranormal` | `tormenta`;
- `?clima=limpo` | `nuvens` | `chuva` | `neblina` | `tempestade` | `neve`;
- `?vela=apagada` (ou `acesa`);
- `?monstro=sim` (ou `nao`).

Ex.: `http://localhost:5173/?hora=23&universo=horror&clima=neblina&monstro=sim`. Quem pede menos movimento no sistema vê a cena parada, com a hora e o clima certos.

## O kit em camadas (pedido em 07/10)

A arte de hoje é uma imagem só, com a luz da vela pintada; por isso o universo quase não muda nada e o monstro não tem onde aparecer. A cena passa a ser **montada pelo jogo, peça por peça**, e cada peça vem do Códex **separada e com luz neutra** (dia nublado, sem vela): o jogo faz o dia, a noite, a vela, a chuva, a neve e o relâmpago por cima de qualquer peça. O pedido pronto, com o bloco de estilo e o formato de cada imagem, é o [`PROMPT-ENTRADA.txt`](PROMPT-ENTRADA.txt).

As camadas, de trás para a frente:

| Camada | O que é | De onde vem |
|---|---|---|
| Céu | degradê, sol, lua, estrelas, nuvens, chuva, neve, raio | código (já existe) |
| Paisagem | a vista pela janela: céu em magenta (#FF00FF, o jogo tira) e janelas das casas em verde (#00FF00, o jogo acende de noite e apaga de dia) | Códex, uma por universo |
| Sala | a sala da tela de hoje com a mesa **vazia** e os vidros da janela em magenta | Códex (computador; o celular depois) |
| Mapa | o mapa deitado na mesa, sozinho, fundo transparente | Códex, vários por universo |
| Miniaturas | heróis e monstros pintados, cada um na base redonda, em folhas de 4 × 2 | Códex, por universo |
| Dados | seis dados (d4 a d20) em quatro posições cada, em folhas de 6 × 4, um material por folha | Códex |
| Vela e caneca | castiçais **sem chama** (o jogo desenha a chama, que tremula e apaga) e canecas, em folhas de 4 × 2 | Códex |
| Luz | a noite, a vela, o sol entrando, o relâmpago | código (refeito sobre a luz neutra) |
| Painel | o painel do CRONA, recortado da arte de hoje (sem as estrelinhas) | código |

O que isso dá:

- **O universo muda a cena inteira:** a paisagem (castelo, vila costeira com farol, cidade moderna, montanhas), o mapa, as miniaturas, os dados, a vela, a caneca, a cor da chama e o clima.
- **Sossego ou monstro no tabuleiro:** no sossego, só os heróis em cima do mapa; com monstro, um monstro do universo encara o grupo (o dragão, a criatura de tentáculos...). As miniaturas se mexem de leve, como se alguém as arrumasse.
- **Os dados rolam ao abrir a página:** dois ou três dados entram rolando pela mesa, quicam e param; dá para clicar neles para rolar de novo.
- **Neve:** o clima novo (já no código).

Quando o lote 1 chegar, um script faz o encaixe: tira o magenta e o verde, corta as folhas em peças, acerta a grade de pixels com a da cena e põe tudo em `client/public/arte/login/kit/`. As posições de cada peça na mesa ficam num arquivo, como os retângulos de hoje.

### Os remendos (antes do kit)

A primeira ideia (06/10) eram remendos: o Códex redesenhava um pedaço da arte de hoje (a caneca, a vela, o mapa) e o jogo colava por cima (`scripts/entrada-remendos.mjs`, `client/src/ui/entradaRemendos.json`, a lista em `VARIANTES`). Continua funcionando, mas o kit substitui: com a sala nova, os remendos da arte antiga deixam de servir e saem quando o kit entrar.

## Decisões

- **06/10:** a tela de entrada não usa nada dos agentes da campanha; é genérica, em vários universos de RPG (fantasia, horror cósmico, paranormal, Tormenta), no estilo da arte de hoje, variando os elementos (caneca, vela, mapa, monstro), a hora e o clima.
- **07/10:** a cena vira um kit em camadas, com luz neutra em todas as peças (a paisagem, a sala, o mapa, as miniaturas, os dados, a vela e a caneca); o jogo faz a luz e o clima. O lote 1 vem só no computador, para o Felipe aprovar o estilo.
- **07/10:** o monstro (ou o sossego) fica no tabuleiro, nas miniaturas em cima do mapa. Os olhos no escuro ficam até as miniaturas chegarem.
- **07/10:** o universo muda a cena inteira (paisagem, mapa, miniaturas, dados, vela, caneca), não só a cor da chama.
- **07/10:** as estrelinhas em volta do emblema saíram da arte parada e voltaram animadas: são as mesmas da arte, recortadas (`client/public/arte/login/brilhos/`, posições em `client/src/ui/entradaBrilhos.json`), cada uma piscando no seu ritmo; as grandes respiram e de vez em quando faíscam. (Sem elas o emblema ficava vazio.) As faíscas desenhadas em CSS saíram. Um brilho passa pelas letras do CRONA de tempos em tempos. O campo selecionado acende inteiro (sem o contorno quadrado do campo de dentro).
- **07/10:** o botão ENTRAR fica sem ícones (os losangos e os d20 saíram); só o brilho que corre pelo ouro.

## O que falta

- O lote 1 do kit (o `PROMPT-ENTRADA.txt`) e, aprovado, o lote 2 e o celular.
- O código do kit: o encaixe das peças, a luz sobre a luz neutra, as miniaturas no mapa e os dados rolando.
- Ideias para depois: o que voa no céu por universo (dragão ao longe, corvos), uma ameaça grande aparecendo no clarão do relâmpago, o livro da mesa trocando de capa.
