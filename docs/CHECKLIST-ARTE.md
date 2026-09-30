# Arte que falta: o que deixa a tela diferente da referência

As telas do CROMA foram montadas a partir das imagens de referência. A disposição, os textos, as barras, os botões, as molduras e a luz já estão no código. O que ainda deixa a tela diferente da referência é o que o código não desenha igual: **o retrato de um personagem, um ícone, o clipe, o papel manchado**. Esta é a lista dessas imagens, para produzir no GPT/Codex. Marque com `x` o que ficar pronto (`- [x]`).

**Foco agora: a tela** (painéis, menus, botões, ícones e retratos). O tabuleiro (móveis, pisos, peças) fica para depois, no fim da lista.

Comparação feita em 30/09 com `docs/ref-mapa-2.webp`, `docs/ref-fichas.webp`, `docs/ref-fichas-mobile.webp` e `docs/ref-combate.webp` (ficam fora do git: trazem o emblema oficial).

## Como entregar

- Tudo em `client/public/arte/`, com **o nome exato** da lista (minúsculas, sem acento, hífen no lugar do espaço). "Entra sozinho" = o jogo já procura o arquivo e usa na hora; o resto o Claude encaixa quando chegar.
- **PNG com fundo transparente de verdade** (sem xadrez pintado, sem fundo branco), **sem texto e sem números**, **sem sombra em volta** (o jogo faz a sombra). Tamanhos já no dobro.
- **Ícones:** 128×128, traço branco (ou branco com a cor indicada), o mesmo peso de traço em todos, sem quadrado atrás (o jogo desenha o quadrado escuro).
- Branch `codex/arte-<assunto>`, commit só das imagens, pull request para `main`. Formatos em [`ARTE.md`](ARTE.md).
- Símbolos: crie os seus. O emblema e os símbolos oficiais de Ordem Paranormal não entram (o repositório é público).

**Estilo para pedir ao GPT, em tudo:** pixel art pintada de alta qualidade, clima de investigação paranormal, escuro, luz quente vinda de cima; papel envelhecido e rasgado; vermelho de destaque `#d8322f`; o mesmo traço das referências.

**As folhas de sprite de hoje** (`personagens/<nome>/folha.webp`) são a **arte de referência** de cada agente (decidido em 30/09): aparecem grandes na FICHAS e vão para a Hand do jogador. Não precisam de desenho novo.

---

## 1. Em todas as telas

- [ ] ✱ **Retrato de cada agente** (a maior diferença). Na referência é um busto pintado, olhando para a direita; hoje é um recorte pixelado da folha. Aparece nas cartas da MAPA, na lista PLAYERS, na lista de agentes da FICHAS e na ordem de iniciativa e no alvo do COMBATE. O mesmo personagem da folha de hoje, no mesmo estilo, ~1024×1536, **entra sozinho**:
  - `personagens/tepes/retrato-desarmado.png`, `personagens/catarina/retrato-desarmado.png`, `personagens/alosi/retrato-desarmado.png`, `personagens/cora-falcao/retrato-desarmado.png`
  - a mesma imagem de olhos fechados, `retrato-desarmado-olhos-fechados.png` (é o que faz piscar)
  - depois, se quiser: `retrato-armado.png`, `retrato-desarmado-machucado.png`, `retrato-armado-machucado.png` (e os de olhos fechados)
- [ ] ✱ **Papel dos painéis**: na referência tem manchas, rasgos, dobras e marca d'água; hoje é desenhado em código, mais liso. `interface/papel-painel.png`, 600×440, com 48 px de borda sem detalhe único (o jogo estica o meio). Serve para a FICHAS e o COMBATE.
- [ ] **Ícones da barra do topo** (hoje ícones de linha parecidos): `icones/topo-mapa.png` (mapa dobrado), `topo-combate.png` (espadas cruzadas), `topo-fichas.png` (crachá), `topo-clima.png` (sol), `topo-config.png` (engrenagem), `topo-registro.png` (documento), `topo-sair.png` (porta com seta, vermelho) e `topo-operacao.png` (a pena apagada ao lado de "Operação")

## 2. Tela MAPA

Pasta `interface/`:
- [ ] ✱ **Papéis de cada painel**: `papel-planta.png` 1080×640 (com a folha de trás aparecendo no canto), `papel-sala.png` 1080×370, `papel-objeto.png` 1080×580, `papel-rpg.png` 780×1580 (a folha grande da direita), `papel-inventario.png` 1170×300 e `carta-player.png` 740×320 (o cartão de cada personagem da lista PLAYERS)
- [ ] **Rosa dos ventos** a nanquim, com o "N": hoje é um desenho simples. `rosa-dos-ventos.png`, 180×180
- [ ] **Clipe de papel** de metal, prendendo a polaroid na planta: hoje é um traço. `clipe.png`, 52×124
- [ ] **Fita crepe** nos cantos dos papéis: hoje não tem. `fita-1.png`, `fita-2.png`, `fita-3.png`, ~160×44
- [ ] **Alfinete vermelho** de mapa, espetado na sala atual da planta: hoje não tem. `alfinete.png`, 40×56
- [ ] **Asas apagadas**, marca d'água no canto do painel do objeto: hoje não tem. `asas-marca.png`, 160×120
- [ ] **Pilha de papéis** no canto de baixo à direita (fichas velhas, fotos, carimbos próprios): hoje são três folhas lisas. `pilha-papeis.png`, 600×520

Ícones (pasta `icones/`):
- [ ] **AÇÕES**: `acao-examinar.png` (lupa), `acao-abrir.png` (caixa aberta), `acao-usar.png` (mão), `acao-entregar.png` (setas trocando)
- [ ] **Cartões da sala e dos players**: `local.png` (marcador de lugar), `andar.png` (camadas), `mais-opcoes.png` (os três pontos)
- [ ] **Lista "Contém" do objeto**: `conteudo-documento.png`, `conteudo-email.png`, `conteudo-banco-de-dados.png`

## 3. Tela FICHAS

- [ ] **O fundo atrás do personagem grande**: na referência é uma sala escura com caixas e luz fria de cima; hoje é azul liso. `interface/fundo-personagem.jpg`, 620×1140, bem desfocado
- [ ] ✱ **Ícones de PV, PE e SAN**: na referência são pintados e brilhantes; hoje são ícones de linha. `icones/pv.png` (coração vermelho), `icones/pe.png` (cérebro azul-claro), `icones/san.png` (espiral azul) · entram sozinhos
- [ ] **Atributos**: `icones/agi.png` (correndo), `for.png` (punho), `int.png` (cérebro com engrenagem), `pre.png` (olho), `vig.png` (escudo), brancos · entram sozinhos
- [ ] **Derivados**: `icones/defesa.png` (escudo com estrela), `deslocamento.png` (bota), `protecao.png` (colete), `resistencias.png` (escudo) · entram sozinhos
- [ ] **Títulos dos painéis** (o glifo no quadradinho escuro de cada título): `icones/titulo-identificacao.png`, `titulo-atributos.png`, `titulo-recursos.png`, `titulo-derivados.png`, `titulo-condicoes.png`, `titulo-pericias.png`, `titulo-poderes.png`, `titulo-rituais.png`, `titulo-equipamentos.png`, `titulo-inventario.png`, `titulo-companheiro.png`, `titulo-anotacoes.png`
- [ ] **Condições**: `icones/cond-normal.png`, `cond-machucado.png`, `cond-sangrando.png`, `cond-atordoado.png`, `cond-amedrontado.png`, `cond-envenenado.png`, `cond-inconsciente.png`, `cond-outro.png`
- [ ] **Poderes** (na referência, cada poder tem um glifo; hoje é uma estrela em todos): `icones/poder-origem.png`, `poder-classe.png`, `poder-trilha.png`, `poder-paranormal.png`
- [ ] **Sigilo de cada elemento**, no círculo do ritual aprendido (hoje só há o "+"): `icones/sigilo-sangue.png`, `sigilo-morte.png`, `sigilo-conhecimento.png`, `sigilo-energia.png`, `sigilo-medo.png`, sigilos próprios na cor do elemento · entram sozinhos
- [ ] **Botões de baixo**: `icones/botao-editar.png` (lápis), `botao-adicionar-item.png` (caixa), `botao-adicionar-ritual.png` (pentagrama próprio), `botao-salvar.png` (disquete), `botao-novo-agente.png` (mais)
- [ ] ✱ **Foto do companheiro**: na referência é o retrato do cão; hoje é uma pata. `companheiros/cao-de-guarda.png`, 300×360 · entra sozinho
- [ ] ✱ **Ícone de cada item**, na tabela de equipamentos e nos espaços do inventário: na referência cada item tem o seu desenho; hoje são ícones de linha genéricos. `itens/<id>.png`, 128×128, traço branco, objeto solto · entram sozinhos. Os que os agentes carregam:
  - armas: `fuzil-de-caca`, `katana`, `faca`, `corrente`, `arma-improvisada`, `granada-de-fragmentacao`, `granada-de-fumaca`, `balas-longas`, `bandoleira`
  - equipamento: `protecao-leve`, `mochila-militar`, `kit-de-ladrao`, `algemas`, `corda`, `celular`, `isqueiro`, `alarme-de-movimento`, `coagulante`, `cao-adestrado`
  - paranormal: `componentes-ritualisticos-de-elemento`, `amuleto-sagrado`, `cranio-espiral`
  - e `desarmado` (punho fechado, o ataque desarmado)
- [ ] **Pilha de papéis** do canto de baixo à esquerda: `interface/pilha-papeis-2.png`, 600×520

## 4. FICHAS no celular

Nada novo: usa os retratos, os ícones e as folhas da FICHAS. Os cartões de resumo ilustrados da referência (dados, grimório, maleta, fotos) só entram se um dia a tela do celular for por cartões.

## 5. Tela COMBATE

- [ ] ✱ **Retrato das ameaças**: na referência o Ocultista é um retrato pintado, de capuz; hoje é o avatar padrão. `personagens/<id>/retrato-desarmado.png`, no estilo dos retratos dos agentes (o Claude cadastra cada ameaça que chegar)
  - `ocultista`: encapuzado, rosto pálido e marcado
  - `acolito`: encapuzado mais jovem, capa escura
  - e as outras ameaças da Operação Fulgor (o Felipe diz quais)
- [ ] ✱ **Carimbo do resultado**: na referência é um carimbo de borracha de verdade, com a tinta falhada e um selo redondo atrás; hoje é uma borda desenhada. `combate/carimbo.png`, 520×280, moldura vermelha **sem texto** (o jogo escreve ERROU, ACERTO ou ACERTO CRÍTICO ×3), e `combate/selo.png`, 200×200, o selo redondo de tinta (símbolo próprio)

Ícones (pasta `icones/`):
- [ ] **Turno**: `combate-atrasar.png` (ampulheta), `combate-preparar.png` (escudo), `combate-passar-turno.png` (avançar)
- [ ] **Abas das ações**: `combate-atacar.png` (espadas cruzadas), `combate-manobra.png` (mãos agarrando), `combate-ritual.png` (pentagrama próprio), `combate-habilidade.png` (engrenagem), `combate-item.png` (bolsa), `combate-movimento.png` (bota), `combate-outras.png` (três pontos)
- [ ] **Situação**: `situacao-cobertura.png` (mesa ou muro), `situacao-alcance.png` (seta tracejada), `situacao-iluminacao.png` (sol), `situacao-corpo-a-corpo.png` (punho)
- [ ] **Rolagem e dano**: `combate-dado.png` (um d20), `combate-desfazer.png` (seta voltando), `combate-confirmar.png` (visto)
- [ ] **Barra do tabuleiro**: `tabuleiro-alcance.png` (mira), `tabuleiro-medir.png` (régua), `tabuleiro-area.png` (quadrado tracejado), `tabuleiro-centralizar.png` (alvo)
- [ ] **Clima**: `clima-iluminacao.png` (sol), `clima-nevoa.png` (vento), `clima-terreno.png` (montanha)
- [ ] **Estados na ordem e nas pendências**: `estado-ok.png` (visto verde), `estado-morrendo.png` (caveira no escudo, vermelha), `estado-ritual.png` (pentagrama próprio, âmbar), `estado-caido.png` (pessoa deitada)
- [ ] **Ícone da arma** nos cartões da coluna ARMA: os mesmos `itens/<id>.png` da FICHAS (o fuzil de caça da referência é `itens/fuzil-de-caca.png`)

---

## Para depois: o tabuleiro

- **Folha nova de cada agente para o tabuleiro:** estilo 32 bits, mais pixelada, com todos os ângulos e as animações de andar (e as poses de caído e atacando que a referência do COMBATE mostra). O formato entra no [`ARTE.md`](ARTE.md) antes de ser feito. As folhas de hoje continuam como a arte de referência da FICHAS e da Hand do jogador.
- **Folha das ameaças para o tabuleiro** (`ocultista`, `acolito`...), no mesmo formato novo.
- **A Sala de Tecnologia** (o cômodo das referências), pasta `moveis/`, isométrico 2:1, casa de 128×64, 1 m = 115 px, frente e `_costas`: `console` (e desligado), `chair_office`, `fluorescent` (e aceso), `portal`; e as texturas `pisos/carpete.png` (128×64) e `paredes/tijolo-escuro.png` (256×256). Formato em [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md).
- **As marcações do combate no chão:** `combate/base-agente.png` e `base-inimigo.png` (256×128, o anel de luz embaixo da peça) e `combate/circulo-ritual.png` (512×256, o círculo de quem sustenta ritual).
- **Os outros cômodos da Sede** (bar, prisão, laboratório...): lista em [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md).
