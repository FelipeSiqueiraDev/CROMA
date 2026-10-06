# Ferramentas da mesa: o que o mestre mostra no tablet

Ideias trazidas do Owlbear Rodeo em 04/10 e feitas em 06/10. O Owlbear é mesa online; o CRONA é presencial, então só entra o que ajuda o mestre a mostrar a cena no tablet que os jogadores olham. Ficam no canto de cima do tabuleiro do MAPA (`client/src/ui/ferramentasMesa.ts`), só para o mestre. Apontar e Desenhar também estão na fileira de ferramentas do COMBATE.

| Ferramenta | Tecla | O que faz |
|---|---|---|
| **Apontar** | P (ou Alt + clique, sem ligar nada) | O mestre clica num lugar e a mesa pisca ali: anéis dourados abrindo no chão, um feixe de luz e um losango balançando, por 4,5 s. Na mesa, num cômodo grande (a câmera que acompanha as peças), a câmera vai até o ponto. |
| **Desenhar** | D | Arrastar no tabuleiro risca de giz: à mão livre, seta (de onde começou até onde soltou) ou círculo (do meio até a borda), em branco, vermelho ou dourado. Aparece riscando e some sozinho em 9 s. "Apagar" tira o que ainda está na tela. |
| **Névoa** | N | A névoa revelada aos poucos (abaixo). |
| **Mapa** | — | O mapa improvisado (abaixo). |

Esc desliga a ferramenta. Com uma ferramenta ligada, o arrasto não mexe a câmera e o clique não anda nem escolhe peça.

As marcas (ponto e desenho) ficam em casas, no chão: aparecem iguais no isométrico e na vista tática, na tela do mestre e na mesa. Não ficam guardadas: o servidor só repassa (`marca` no contrato, conferida por `sanitizeMarca` em `shared/src/mesa.ts`). O desenho é `client/src/render/marcasMesa.ts`.

## Névoa revelada aos poucos

Decidido pelo Felipe em 06/10: **pincel e automática**.

- **Cobrir a sala** liga a névoa na cena: a mesa só vê em volta dos agentes que estão nela. Fica guardada na cena (`nevoa` no cômodo: uma letra por casa, `'1'` à vista), e volta igual quando o servidor sobe.
- **O pincel** mostra ou esconde as casas debaixo dele, arrastando (uma casa, pequeno ou grande). **Mostrar tudo** e **Esconder tudo** de uma vez; com a abertura automática ligada, esconder tudo mantém a volta dos agentes.
- **Abre sozinha:** a névoa abre em volta dos agentes conforme eles andam (o raio em casas, 5 por padrão = 3,75 m, com − e +). Agente é a peça com ficha (`ehAgente`); a ameaça e o NPC sem ficha não abrem nada. A abertura vem antes de a peça chegar: a mesa vê o agente entrando na casa nova.
- **Tirar a névoa:** a mesa volta a ver a sala inteira.
- **Na mesa:** o que está na névoa não é desenhado (as peças, os móveis cujas casas estão todas escondidas, os itens das paredes de lá, as marcas do combate dessas peças, e a câmera não vai atrás delas). O chão e as paredes do fundo dessas casas ficam debaixo de uma fumaça escura, de borda macia, que se mexe. A fumaça vai logo depois do chão e antes dos móveis: o que está à vista na frente passa por cima dela.
- **Na tela do mestre:** tudo continua à vista; o que a mesa não vê fica escurecido e riscado, com a borda tracejada brilhando. O botão Névoa tem um pontinho azul quando a cena tem névoa, e as opções dizem quanto da sala a mesa vê.
- Mudou a planta da cena, a névoa começa de novo (cobrindo tudo, menos a volta dos agentes se a abertura automática estiver ligada).
- A "névoa" do ☀ Clima continua outra coisa: a neblina do ar (partículas), que não esconde nada.

O desenho é `client/src/render/nevoaMesa.ts`; as contas, `shared/src/mesa.ts` (`pintarNevoa`, `casasEmVolta`, `contarNevoa`).

## Mapa improvisado

Decidido pelo Felipe em 06/10: **de cima, na vista tática**. Para o lugar que ainda não foi montado em cômodos (os jogadores foram para onde ninguém esperava).

1. **Mapa** abre a janela: escolher a imagem (PNG, JPG ou WEBP, até 12 MB), o nome e **quantos quadrados de 1,5 m** a imagem tem de largura. A prévia mostra a grade por cima, para conferir com a grade do desenho; embaixo, o tamanho em quadrados e em metros.
2. A imagem sobe para o servidor (`POST /api/mapas`, só o mestre; fica em `server/data/uploads/`).
3. O servidor cria uma cena ao ar livre do tamanho certo (2 casas por quadrado, a altura pela proporção da imagem; até 160 casas de um lado e 9000 no total), com a imagem no chão inteiro e a vista tática ligada. O nome fica no lugar da cena de agora ("Sede · Beco atrás do bar").
4. Uma **Entrada** no meio da borda de baixo liga o mapa à cena de onde o mestre veio: as duas ficam na mesma campanha (a planta mostra a sala nova) e quem pisa na Entrada volta.
5. Com "Levar os agentes desta cena" (marcado), os agentes vão para o mapa, chegando pela Entrada; o mestre e a mesa vão junto.

No isométrico (tecla T), a imagem fica deitada no chão, como um tapete. O desenho é `client/src/render/mapaImagem.ts` e o `imagemChao` do `mapaTatico.ts`; a janela, `client/src/ui/mapaImprovisado.ts`.

## Arte

Tudo funciona com o desenho por código. Pedido no `PROMPT-FERRAMENTAS-MESA.txt` da pasta da arte; entra sozinho quando chegar:

| Arquivo | O que é |
|---|---|
| `client/public/arte/icones/mesa-apontar.png`, `mesa-desenhar.png`, `mesa-nevoa.png`, `mesa-mapa.png` | Os ícones pintados dos quatro botões (no lugar dos de linha). |
| `client/public/arte/texturas/nevoa-mesa.png` | A fumaça da névoa, que repete (no lugar das nuvens desenhadas). |

## Falta

- O mapa improvisado não se apaga pela tela ainda (fica como as outras cenas).
- Testar no tablet de verdade: o tamanho do ponto de atenção e a leitura da névoa de longe.
