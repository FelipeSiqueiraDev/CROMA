# Checklist de arte: todas as telas iguais às referências

Lista única para o **Codex** (artista): tudo o que falta desenhar para as telas ficarem como as referências. Marque com `x` o que ficar pronto (`- [x]`).

- **Referências** (na pasta `docs/`, fora do git porque trazem o emblema oficial; se não estiverem na sua cópia, peça ao Felipe): `ref-mapa-2.webp` (tela MAPA), `ref-fichas.webp` (FICHAS no computador), `ref-fichas-mobile.webp` (FICHAS no celular), `ref-combate.webp` (COMBATE). Todas em 1672×941, menos a do celular (941 de largura).
- **Formato de cada tipo de arte:** [`ARTE.md`](ARTE.md). **Móveis, cômodo por cômodo:** [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md). As listas por tela, com o que é código: [`CHECKLIST-TELA-MAPA.md`](CHECKLIST-TELA-MAPA.md), [`CHECKLIST-TELA-FICHAS.md`](CHECKLIST-TELA-FICHAS.md) e [`CHECKLIST-TELA-COMBATE.md`](CHECKLIST-TELA-COMBATE.md).

## Como entregar

1. Branch `codex/arte-<assunto>` (ex.: `codex/arte-papeis`), commit **só** de arquivos em `client/public/arte/`, sem mexer em código, e pull request para `main` com a lista do que entregou.
2. **PNG com fundo transparente** (as exceções estão indicadas). **Sem texto, sem números e sem ícones pintados** nas peças da interface: o jogo escreve por cima. **Sem sombra projetada** em volta da peça (o jogo faz); sombras internas (dobra, mancha, queimado) fazem parte da arte.
3. **Tamanhos já no dobro** (é o tamanho de entrega). Papéis e placas com **48 px de borda sem detalhe único**: o jogo estica o meio para caber em painéis de tamanhos diferentes.
4. **Nomes** em minúsculas, sem acento e sem espaço (hífen), exatamente como na lista.
5. **Estilo:** pixel art pintada, isométrica, investigação paranormal; papel envelhecido e rasgado, manchas leves; placas escuras quase pretas; vermelho de destaque `#d8322f`; luz quente vinda de cima.
6. **Símbolos:** crie sigilos e emblemas próprios. O emblema e os símbolos oficiais de Ordem Paranormal **não** entram no repositório (ele é público).

**Legenda:** ✱ = prioridade (muda a cara da tela); **entra sozinho** = o jogo já procura o arquivo e usa na hora; **eu encaixo** = o Claude liga no código quando o arquivo chegar.

**Ordem sugerida:** 1. papéis e placas → 2. retratos e corpo dos agentes → 3. ícones e itens → 4. a Sala de Tecnologia → 5. ameaças e carimbo → 6. o resto da Sede e os opcionais.

---

## 1. Papéis, placas e fundo (todas as telas)

Pasta: `client/public/arte/interface/`.

- [ ] ✱ `papel-painel.png`, 600×440: papel envelhecido de borda rasgada. É o papel de todos os painéis da FICHAS (Identificação, Atributos, Recursos, Derivados, Condições, Perícias, Equipamentos, Companheiro, Anotações) e da COMBATE (Ordem de iniciativa, Efeitos, Resolução, Alvo, Registro) · eu encaixo
- [ ] ✱ `placa-escura.png`, 600×440: a placa quase preta de Poderes, Rituais e Inventário (FICHAS) · eu encaixo
- [ ] `fundo-mesa.jpg`, 1920×1080, JPG opaco: fundo quase preto com textura suave, atrás de tudo · eu encaixo (opcional)
- [ ] `pilha-papeis.png`, 600×520: fichas e papéis carimbados no canto de baixo à direita da MAPA, saindo pela borda · eu encaixo
- [ ] `pilha-papeis-2.png`, 600×520: a pilha do canto de baixo à esquerda da FICHAS · eu encaixo (opcional)

## 2. Tela MAPA (`ref-mapa-2.webp`)

Pasta: `client/public/arte/interface/`.

Papéis, um pouco diferentes entre si:
- [ ] ✱ `papel-planta.png`, 1080×640: folha da planta, com a folha de trás aparecendo no canto de cima · eu encaixo
- [ ] ✱ `papel-sala.png`, 1080×370: o cartão da sala, mais claro · eu encaixo
- [ ] ✱ `papel-objeto.png`, 1080×580: o painel do objeto selecionado · eu encaixo
- [ ] ✱ `papel-rpg.png`, 780×1580: a folha grande da direita (PLAYERS) · eu encaixo
- [ ] ✱ `papel-inventario.png`, 1170×300: o inventário rápido · eu encaixo
- [ ] ✱ `carta-player.png`, 740×320: o cartão claro de cada personagem na lista PLAYERS · eu encaixo

Peças soltas:
- [ ] `clipe.png`, 52×124: clipe de metal que prende a polaroid · eu encaixo
- [ ] `fita-1.png`, `fita-2.png`, `fita-3.png`, ~160×44: fita crepe translúcida, rasgada nas pontas · eu encaixo
- [ ] `rosa-dos-ventos.png`, 180×180: rosa dos ventos a nanquim (o "N" pode vir desenhado: é parte do desenho, não texto do jogo) · eu encaixo
- [ ] `alfinete.png`, 40×56: alfinete vermelho de mapa, na sala atual da planta · eu encaixo (opcional)
- [ ] `asas-marca.png`, 160×120: asas bem apagadas, carimbo no canto do painel do objeto · eu encaixo (opcional)

Ícones dos botões de AÇÕES (opcional; hoje são ícones de linha), pasta `client/public/arte/icones/`, 96×96, traço branco:
- [ ] `acao-examinar.png` (lupa), `acao-abrir.png` (caixa), `acao-usar.png` (mão), `acao-entregar.png` (setas trocando) · eu encaixo (opcional)

## 3. Personagens (MAPA, FICHAS, COMBATE e mesa)

Pasta: `client/public/arte/personagens/<nome>/`, com `<nome>` = `tepes`, `catarina`, `alosi`, `cora-falcao`. Formato das folhas e dos retratos em [`ARTE.md`](ARTE.md), seção 1.

- [x] `folha.webp`: as quatro folhas de sprite (entregues)

Retratos das cartas (MAPA, PLAYERS, ordem de iniciativa, alvo), corpo inteiro olhando para a direita, ~1024×1536, **entram sozinhos**. Oito arquivos por agente:
- [ ] ✱ D. Tepes: `retrato-desarmado.png`, `retrato-armado.png`, `retrato-desarmado-machucado.png`, `retrato-armado-machucado.png`, e cada um com `-olhos-fechados` (a mesma imagem, só os olhos mudam)
- [ ] ✱ Catarina: os mesmos oito
- [ ] ✱ Alosi: os mesmos oito
- [ ] ✱ Cora Falcão: os mesmos oito

O personagem grande da FICHAS, 560×900, de frente, em pé, **entra sozinho**:
- [ ] ✱ D. Tepes: `corpo.png` e `corpo-olhos-fechados.png` (é o que faz ele piscar)
- [ ] ✱ Catarina: os mesmos dois
- [ ] ✱ Alosi: os mesmos dois
- [ ] ✱ Cora Falcão: os mesmos dois
- [ ] opcional, cada agente: `corpo-costas.png`, `corpo-esquerda.png`, `corpo-direita.png` (as setas ‹ › giram o personagem) e `corpo-armado.png`

Fundo e companheiro:
- [ ] `interface/fundo-personagem.jpg`, 620×1140: a sala escura atrás do personagem grande (caixas, parede, luz fria de cima), bem desfocada · eu encaixo
- [ ] ✱ `companheiros/cao-de-guarda.png`, 300×360: retrato do cão do D. Tepes · entra sozinho

## 4. Ícones (FICHAS e COMBATE)

Pasta: `client/public/arte/icones/`, 128×128, fundo transparente.

Recursos e elementos, **entram sozinhos**:
- [ ] ✱ `pv.png` (coração vermelho), `pe.png` (cérebro azul-claro), `san.png` (espiral azul)
- [ ] ✱ `sigilo-sangue.png`, `sigilo-morte.png`, `sigilo-conhecimento.png`, `sigilo-energia.png`, `sigilo-medo.png`: um sigilo próprio por elemento (os círculos dos rituais)

Opcionais que **entram sozinhos** (hoje são ícones de linha parecidos), branco sobre quadrado escuro como na referência:
- [ ] atributos: `agi.png`, `for.png`, `int.png`, `pre.png`, `vig.png`
- [ ] derivados: `defesa.png`, `deslocamento.png`, `protecao.png`, `resistencias.png`

Opcionais que **eu encaixo**:
- [ ] títulos dos painéis da FICHAS (o sigilo no quadradinho preto de cada título): `titulo-identificacao.png`, `titulo-atributos.png`, `titulo-recursos.png`, `titulo-derivados.png`, `titulo-condicoes.png`, `titulo-pericias.png`, `titulo-poderes.png`, `titulo-rituais.png`, `titulo-equipamentos.png`, `titulo-inventario.png`, `titulo-companheiro.png`, `titulo-anotacoes.png`
- [ ] condições: `cond-normal.png`, `cond-machucado.png`, `cond-sangrando.png`, `cond-atordoado.png`, `cond-amedrontado.png`, `cond-envenenado.png`, `cond-inconsciente.png`, `cond-caido.png`, `cond-morrendo.png`, `cond-sustentado.png`
- [ ] COMBATE, turno e abas: `atrasar.png`, `preparar.png`, `passar-turno.png`, `atacar.png`, `manobra.png`, `ritual.png`, `habilidade.png`, `item.png`, `movimento.png`, `outras.png`
- [ ] COMBATE, tabuleiro e situação: `alcance.png`, `medir.png`, `area.png`, `centralizar.png`, `cobertura.png`, `iluminacao.png`, `nevoa.png`, `terreno.png`
- [ ] topo (hoje ícones de linha): `aba-mapa.png`, `aba-combate.png`, `aba-fichas.png`, `topo-clima.png`, `topo-config.png`, `topo-registro.png`, `topo-sair.png`, `pena-operacao.png`

## 5. Itens (FICHAS, COMBATE e MAPA)

Pasta: `client/public/arte/itens/`, 128×128, **traço branco**, fundo transparente, objeto solto (sem moldura: o jogo desenha o quadrado). O nome é o id do catálogo. Na FICHAS **entram sozinhos**; na lista de armas do COMBATE e no inventário da MAPA, eu encaixo.

✱ Os que os agentes carregam hoje:
- [ ] `fuzil-de-caca.png`, `katana.png`, `faca.png`, `corrente.png`, `arma-improvisada.png`
- [ ] `granada-de-fragmentacao.png`, `granada-de-fumaca.png`, `balas-longas.png`, `bandoleira.png`
- [ ] `protecao-leve.png`, `mochila-militar.png`, `kit-de-ladrao.png`, `algemas.png`, `corda.png`
- [ ] `celular.png`, `isqueiro.png`, `alarme-de-movimento.png`, `coagulante.png`, `cao-adestrado.png`
- [ ] `componentes-ritualisticos-de-elemento.png`, `amuleto-sagrado.png`, `cranio-espiral.png`
- [ ] `desarmado.png` (punho fechado: o ataque desarmado, que toda ficha tem) · eu encaixo

Tipos genéricos, para os itens do cenário da MAPA (pistas, documentos) que não têm ícone próprio:
- [ ] `tipo-arma.png`, `tipo-documento.png`, `tipo-chave.png`, `tipo-carta.png`, `tipo-consumivel.png`, `tipo-midia.png` (pendrive, fita, disco), `tipo-caixa.png`, `tipo-item.png` · eu encaixo

O resto do catálogo (armas, proteções e equipamentos em `shared/src/regras/dados/`): um por id, quando o item entrar numa ficha.

## 6. Tabuleiro: a Sala de Tecnologia (MAPA, COMBATE e mesa)

É o cômodo das três referências. Pasta: `client/public/arte/moveis/`. Isométrico 2:1; casa de **128×64** (já no dobro); **1 m de altura = 115 px** (no dobro); duas imagens por móvel, frente (virada para baixo à esquerda) e `_costas`; uma imagem por estado; sem sombra no chão. Formato completo em [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md). Tudo aqui: eu encaixo (hoje os móveis são desenhados em código).

- [ ] ✱ `console.png` e `console_costas.png`: bancada 2×1 casas, 0,78 m, dois monitores azuis acesos e teclado, filete roxo embaixo do tampo
- [ ] ✱ `console_desligado.png` e `console_desligado_costas.png`: a mesma, desligada
- [ ] `console_1tela.png` e `console_3telas.png` (e as `_costas`): variações com 1 e 3 monitores (opcional)
- [ ] ✱ `chair_office.png` e `chair_office_costas.png`: cadeira de escritório preta de rodinhas, 1×1 casa, assento a 0,5 m
- [ ] ✱ `fluorescent.png` e `fluorescent_aceso.png`: calha de metal com o tubo (o brilho é do jogo)
- [ ] ✱ `portal.png`: batente de porta escura com a escuridão atrás (serve para as passagens da Sede toda)

Texturas, que repetem sem emenda:
- [ ] ✱ `client/public/arte/pisos/carpete.png`, 128×64: carpete roxo, uma casa
- [ ] ✱ `client/public/arte/paredes/tijolo-escuro.png`, 256×256: tijolo escuro

## 7. Tabuleiro: o resto da Sede

Mesma pasta e formato do item 6; o tamanho, a altura e o que desenhar de cada móvel estão em [`SEDE-DA-ORDEM.md`](SEDE-DA-ORDEM.md). ✱ primeiro. Tudo: eu encaixo.

- [ ] **Bar (térreo):** ✱ `beer_fridge` (com a versão deslizando), ✱ `stairs_down`, ✱ `bar_counter`, ✱ `pool_table`, `bar_shelf`, `stool_bar`, `table_bar`, `chair_bar`, `jukebox` (acesa e apagada), `sofa_booth`, `crate_wood`, `barrel`, `dirt`; na parede: `neon_bar` (aceso e apagado), `dartboard`
- [ ] **Salão Principal:** ✱ `table_work`, ✱ `stairs_up`, `table_round`, `chair_red`, `table_meeting`, `table_chess`, `armchair`, `bench`, `floor_lamp`, `cabinet_file`, `plant`; na parede: `board_investigation`, `screen`
- [ ] **Corredor:** `pipes`, `emergency_light`, `extinguisher`, `vent`
- [ ] **Prisão:** ✱ `cell_bars`, ✱ `cell_door` (aberta e fechada), `bed`, `toilet`, `iwall_low`, `desk_metal`, `locker`
- [ ] **Câmara do Selo:** ✱ `sigil_gold` (símbolo próprio), `candles`, `candelabra`, `skull`, `rubble`
- [ ] **Laboratório:** ✱ `lab_bench`, `microscope`, `flasks`, `monitor`, `monitor_green`, `bookshelf`, `trolley`
- [ ] **Gabinete:** ✱ `desk_wood`, ✱ `armchair_leather`, `rug_ornate`, `painting` (parede)
- [ ] **Sala de Rituais:** ✱ `sigil_floor` (símbolo próprio), `counter_wood`, `blood_*`
- [ ] **Banheiro:** `sink`, `mirror`
- [ ] **Enfermaria:** ✱ `hospital_bed`, `divider`, `iv_stand`, `medical_cabinet`
- [ ] **Arsenal:** ✱ `gun_table`, `weapon_rack`, `chest_military`, `crate_metal`

Pisos dos outros cômodos (opcional), `client/public/arte/pisos/<id>.png`, 128×64: `pedra`, `concreto`, `madeira` (escura), `taco` (clara), `ladrilho` (branco), `xadrez`, `azulejo` (azul), `musgo` (pedra verde), `metal` (chapa), `terra`.

## 8. Tela COMBATE (`ref-combate.webp`)

Os papéis e placas são os do item 1; o tabuleiro, os itens 6 e 7; as armas, o item 5.

Ameaças (retrato no alvo e na ordem de iniciativa; peça no tabuleiro), **no mesmo formato dos agentes**, pasta `client/public/arte/personagens/<id>/`: `folha.png` (grade de 4 colunas, 4 direções, como no [`ARTE.md`](ARTE.md)) e `retrato-desarmado.png` (mais `retrato-desarmado-machucado.png` e os `-olhos-fechados`, se quiser). Eu cadastro cada ameaça que chegar.
- [ ] ✱ `ocultista`: encapuzado, rosto pálido e marcado
- [ ] ✱ `acolito`: encapuzado mais jovem, de capa escura
- [ ] as ameaças que o mestre for usar na Operação Fulgor (**Felipe:** diga a lista)

Pasta: `client/public/arte/combate/`, eu encaixo:
- [ ] ✱ `carimbo.png`, 520×280: moldura de carimbo de borracha vermelho, meio falhado, **sem texto** (o jogo escreve ERROU, ACERTO ou ACERTO CRÍTICO ×3 por cima). Aparece na tela do mestre e na mesa
- [ ] `base-agente.png`, `base-inimigo.png` e `base-neutro.png`, 256×128: o anel de luz no chão embaixo da peça, ciano, vermelho e cinza (opcional: hoje o jogo desenha)
- [ ] `mira.png`, 256×256: a mira vermelha em volta do alvo (opcional)
- [ ] `circulo-ritual.png`, 512×256: o círculo de símbolos no chão de quem sustenta ritual, visto em isométrico, com símbolos próprios (opcional)

## 9. FICHAS no celular (`ref-fichas-mobile.webp`, opcional)

A referência do celular vale pela disposição, e ele usa a mesma arte do computador. Para ficar idêntico, as ilustrações escuras à direita dos cartões de resumo (a imagem some para a esquerda, onde fica o texto). Pasta: `client/public/arte/interface/`, 880×340, eu encaixo:
- [ ] `card-pericias.png`: dados de vinte faces e papéis
- [ ] `card-poderes.png`: grimório aberto com um sigilo próprio brilhando
- [ ] `card-equipamentos.png`: maleta tática, faca e papéis
- [ ] `card-investigacao.png`: fotos, bilhetes e fichas presos com fita

## Não fazer

- O **emblema** do topo e os carimbos apagados da Ordem: são o símbolo oficial e ficam só no computador do Felipe (`client/public/arte/local/`, fora do git).
- **Texto e números** dentro das peças (nome de aba, título de painel, valores).
- As peças da **tela antiga** (1536×1024) que estão no `ARTE.md` (barra do topo, abas de papel, papéis antigos): a tela mudou e elas não servem mais.
- A **luz, a névoa, a fumaça e as partículas**: são do jogo.
