# Arte que falta: o que deixa a tela diferente da referência

As telas do CROMA foram montadas a partir das imagens de referência. A disposição, os textos, as barras, os botões, as molduras e a luz já estão no código. O que ainda deixa a tela diferente da referência é o que o código não desenha igual: **o retrato de um personagem, um ícone, o clipe, o papel manchado, um móvel**. Esta é a lista dessas imagens, para produzir no GPT/Codex. Marque com `x` o que ficar pronto (`- [x]`).

Comparação feita em 30/09 com `docs/ref-mapa-2.webp`, `docs/ref-fichas.webp`, `docs/ref-fichas-mobile.webp` e `docs/ref-combate.webp` (ficam fora do git: trazem o emblema oficial).

## Como entregar

- Tudo em `client/public/arte/`, com **o nome exato** da lista (minúsculas, sem acento, hífen no lugar do espaço). Quando o arquivo chega, o jogo usa na hora ou o Claude encaixa.
- **PNG com fundo transparente de verdade** (sem xadrez pintado, sem fundo branco), **sem texto e sem números**, **sem sombra em volta** (o jogo faz a sombra). Tamanho já no dobro, como na lista.
- Branch `codex/arte-<assunto>`, commit só das imagens, pull request para `main`. Formatos de cada tipo em [`ARTE.md`](ARTE.md).
- Símbolos: crie os seus. O emblema e os símbolos oficiais de Ordem Paranormal não entram (o repositório é público).

**Estilo para pedir ao GPT, em tudo:** pixel art pintada de alta qualidade, clima de investigação paranormal, escuro, luz quente vinda de cima; papel envelhecido e rasgado; vermelho de destaque `#d8322f`; o mesmo traço das referências.

---

## 1. Em todas as telas

- [ ] ✱ **Retrato de cada agente** (a maior diferença). Na referência é um busto pintado, olhando para a direita; hoje é um recorte da folha de sprite, pixelado. Aparece nas cartas da MAPA, na lista PLAYERS, na lista de agentes da FICHAS e na ordem de iniciativa e no alvo do COMBATE.
  - `personagens/tepes/retrato-desarmado.png`, `personagens/catarina/retrato-desarmado.png`, `personagens/alosi/retrato-desarmado.png`, `personagens/cora-falcao/retrato-desarmado.png`: corpo inteiro ou da cintura para cima, ~1024×1536
  - e a mesma imagem de olhos fechados, `retrato-desarmado-olhos-fechados.png` (é o que faz piscar)
  - depois, se quiser: `retrato-armado.png`, `retrato-desarmado-machucado.png`, `retrato-armado-machucado.png` (e os de olhos fechados)
- [ ] ✱ **Papel dos painéis**: na referência tem manchas, rasgos, dobras e marca d'água; hoje é desenhado em código, mais liso. `interface/papel-painel.png`, 600×440, com 48 px de borda sem detalhe único (o jogo estica o meio). Serve para a FICHAS e o COMBATE.

## 2. Tela MAPA

- [ ] ✱ **Papéis de cada painel**, na mesma pasta `interface/`: `papel-planta.png` 1080×640 (com a folha de trás aparecendo no canto), `papel-sala.png` 1080×370, `papel-objeto.png` 1080×580, `papel-rpg.png` 780×1580 (a folha grande da direita), `papel-inventario.png` 1170×300 e `carta-player.png` 740×320 (o cartão de cada personagem da lista PLAYERS)
- [ ] **Rosa dos ventos** a nanquim, com o "N": hoje é um desenho simples. `interface/rosa-dos-ventos.png`, 180×180
- [ ] **Clipe de papel** de metal, prendendo a polaroid na planta: hoje é um traço. `interface/clipe.png`, 52×124
- [ ] **Fita crepe** nos cantos dos papéis: hoje não tem. `interface/fita-1.png`, `fita-2.png`, `fita-3.png`, ~160×44
- [ ] **Alfinete vermelho** de mapa, espetado na sala atual da planta: hoje não tem. `interface/alfinete.png`, 40×56
- [ ] **Asas apagadas**, marca d'água no canto do painel do objeto: hoje não tem. `interface/asas-marca.png`, 160×120
- [ ] **Pilha de papéis** no canto de baixo à direita (fichas velhas, fotos, carimbos próprios): hoje são três folhas lisas. `interface/pilha-papeis.png`, 600×520
- [ ] ✱ **A Sala de Tecnologia** (o tabuleiro da referência): hoje os móveis são desenhados em código, mais simples. Pasta `moveis/`, isométrico 2:1, casa de 128×64, 1 m = 115 px; frente e `_costas`; sem sombra no chão (formato em [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md)):
  - `console.png` e `console_costas.png`: bancada 2×1 casas, 0,78 m, dois monitores azuis acesos e teclado
  - `console_desligado.png` e `console_desligado_costas.png`
  - `chair_office.png` e `chair_office_costas.png`: cadeira de escritório preta de rodinhas
  - `fluorescent.png` e `fluorescent_aceso.png`: a calha com o tubo
  - `portal.png`: a porta escura no fundo, com a escuridão atrás
  - `pisos/carpete.png`, 128×64: o carpete roxo, que repete sem emenda
  - `paredes/tijolo-escuro.png`, 256×256: o tijolo das paredes, que repete sem emenda

## 3. Tela FICHAS

- [ ] ✱ **O personagem grande**: na referência é um desenho grande de corpo inteiro; hoje é a folha de sprite ampliada (borrada). `personagens/<nome>/corpo.png`, 560×900, de frente, em pé, e `corpo-olhos-fechados.png` (a mesma, só os olhos mudam), para `tepes`, `catarina`, `alosi` e `cora-falcao`
- [ ] **O fundo atrás do personagem**: na referência é uma sala escura com caixas e luz fria de cima; hoje é azul liso. `interface/fundo-personagem.jpg`, 620×1140, bem desfocado
- [ ] ✱ **Ícones de PV, PE e SAN**: na referência são pintados e brilhantes; hoje são ícones de linha. `icones/pv.png` (coração vermelho), `icones/pe.png` (cérebro azul-claro), `icones/san.png` (espiral azul), 128×128
- [ ] **Sigilo de cada elemento**, que aparece no círculo do ritual aprendido: hoje só há o "+". `icones/sigilo-sangue.png`, `sigilo-morte.png`, `sigilo-conhecimento.png`, `sigilo-energia.png`, `sigilo-medo.png`, 128×128, sigilos próprios
- [ ] ✱ **Foto do companheiro**: na referência é o retrato do cão; hoje é uma pata. `companheiros/cao-de-guarda.png`, 300×360
- [ ] ✱ **Ícone de cada item**, na tabela de equipamentos e nos espaços do inventário: na referência cada item tem o seu desenho; hoje são ícones de linha genéricos. `itens/<id>.png`, 128×128, traço branco, objeto solto. Os que os agentes carregam:
  - armas: `fuzil-de-caca`, `katana`, `faca`, `corrente`, `arma-improvisada`, `granada-de-fragmentacao`, `granada-de-fumaca`, `balas-longas`, `bandoleira`
  - equipamento: `protecao-leve`, `mochila-militar`, `kit-de-ladrao`, `algemas`, `corda`, `celular`, `isqueiro`, `alarme-de-movimento`, `coagulante`, `cao-adestrado`
  - paranormal: `componentes-ritualisticos-de-elemento`, `amuleto-sagrado`, `cranio-espiral`
  - e `desarmado` (punho fechado, o ataque desarmado)
- [ ] **Ícone de cada poder** (na referência, cada poder tem um glifo no quadradinho; hoje é uma estrela em todos): `icones/poder-origem.png`, `poder-classe.png`, `poder-trilha.png`, `poder-paranormal.png`, 128×128, branco
- [ ] **Pilha de papéis** do canto de baixo à esquerda: `interface/pilha-papeis-2.png`, 600×520

## 4. FICHAS no celular

Nada novo: usa os retratos, o personagem grande e os ícones da FICHAS. Os cartões de resumo ilustrados da referência (dados, grimório, maleta, fotos) só entram se um dia a tela do celular for por cartões.

## 5. Tela COMBATE

- [ ] ✱ **Retrato e peça das ameaças**: na referência o Ocultista é um retrato pintado, de capuz; hoje é o avatar padrão. No formato dos agentes, pasta `personagens/<id>/`: `folha.png` (a folha de sprite, como a dos agentes) e `retrato-desarmado.png`
  - `ocultista`: encapuzado, rosto pálido e marcado
  - `acolito`: encapuzado mais jovem, capa escura
  - e as outras ameaças da Operação Fulgor (o Felipe diz quais)
- [ ] ✱ **Carimbo do resultado**: na referência é um carimbo de borracha de verdade, com a tinta falhada e um selo redondo atrás; hoje é uma borda desenhada. `combate/carimbo.png`, 520×280, moldura vermelha **sem texto** (o jogo escreve ERROU, ACERTO ou ACERTO CRÍTICO ×3), e `combate/selo.png`, 200×200, o selo redondo de tinta (símbolo próprio)
- [ ] **Base de luz embaixo das peças**: na referência é um anel que brilha, ciano nos agentes e vermelho nos inimigos; hoje é um anel fino desenhado. `combate/base-agente.png` e `combate/base-inimigo.png`, 256×128
- [ ] **Círculo de ritual no chão**, embaixo de quem sustenta ritual: na referência brilha, com símbolos; hoje é desenhado em código. `combate/circulo-ritual.png`, 512×256, visto em isométrico, símbolos próprios
- [ ] **Ícone da arma** nos cartões da coluna ARMA: os mesmos `itens/<id>.png` da FICHAS (o fuzil de caça da referência é `itens/fuzil-de-caca.png`)
- [ ] **O tabuleiro**: a mesma Sala de Tecnologia da MAPA (item 2)

## Para depois (a referência mostra, mas pede formato novo da folha)

- Peça **caída** deitada no chão e peça **atacando** (mirando o fuzil), como na referência do COMBATE: poses novas nas folhas de sprite. O formato entra no [`ARTE.md`](ARTE.md) antes de ser feito.
- Os móveis dos outros cômodos da Sede (bar, prisão, laboratório...), que não aparecem nas referências: lista em [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md).
