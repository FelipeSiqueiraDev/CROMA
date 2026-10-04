# Em aberto: onde paramos (04/10/2026)

O que está pela metade, o que falta e o que o Códex ainda vai entregar. Leia junto com o [`GUIA-DO-CLAUDE.md`](GUIA-DO-CLAUDE.md), que diz como trabalhar aqui. **Atualize este arquivo ao fim de cada bloco de trabalho.**

## O git agora

- **Branch:** `claude/personagens-3d`, com tudo de 30/09 a 03/10. Em 03/10 o Felipe mandou abrir o PR e juntar na `main`.
  - Confira no GitHub se o PR entrou.
  - Se entrou, a próxima branch sai da `main` atualizada. Se não, continue nesta branch ou abra a próxima a partir dela. Nunca parta da `main` velha.
  - Em 04/10 isso ficou parado só porque o Chrome do PC estava sem login no GitHub (o Claude não digita senha).
- **O nome do repositório no GitHub:** ainda é `CROMA`. A troca para `CRONA` está autorizada pelo Felipe, que pediu o nome novo em todos os lugares.
  - Com ele logado no Chrome: Settings → General → Repository name.
  - Depois: `git remote set-url origin https://github.com/FelipeSiqueiraDev/CRONA.git`.
  - Os links antigos continuam funcionando: o GitHub redireciona.
- **As branches antigas já estão dentro desta.** A `main` está toda nela (o PR entra sem conflito). As branches enviadas desde 29/09 também:
  - `claude/combate-completo`, `mapa-sem-arte`, `mochila-itens`, `tepes-32bits`, `verissimo-erros`;
  - `codex/arte-telas-checklist`, `arte-tepes-32bits`;
  - `claude/celular-fichas`, trazida em 03/10.

  O PR aberto `FelipeSiqueiraDev/CROMA#2` (`codex/arte-tepes-32bits`) fica sobrando quando esta entrar: dá para fechar.
- **Fora do git, de propósito.** Não faça commit sem perguntar:

| Arquivo | O que é |
|---|---|
| `client/public/arte/cenarios/` | A ilustração da Sede do Códex, alvo de estilo. Só neste computador. |
| `client/public/arte/mobiliario/bar-128/`, `bar-chair/`, `bar/` | Arte antiga do Códex, guardada como referência. O jogo não usa. |

(A sobra da câmera de cima, em `client/src/render/iso.ts`, foi descartada em 03/10 a pedido do Felipe.)

## A troca de nome: CROMA virou CRONA (03/10)

O Felipe trocou o nome do jogo para **CRONA**, de Cronos e de crônica. A regra foi **não perder nada**: o que era arriscado de renomear ganhou uma **cópia** com o nome novo, e o original ficou guardado.

**O que mudou**
- **Tela, documentos e pedidos de arte:**
  - a tela, o título da aba e os registros do servidor (`[crona]`);
  - os documentos;
  - os `.txt` da pasta da arte do GPT.
- **Código:**
  - os pacotes (`@crona/shared`, `@crona/server`, `@crona/client`);
  - o `window.__crona` de desenvolvimento;
  - os presets `crona` e `crona-visual` do `.claude/launch.json`.
- **Variáveis:**
  - `CRONA_DB_URL`, `CRONA_PORT`, `CRONA_3D`, `CRONA_ARTE_GPT`, `CRONA_LR_PDF`, `CRONA_SAH_PDF`;
  - **as `CROMA_...` antigas continuam valendo.**
- **No navegador de cada aparelho** (`client/src/migrarNome.ts`):
  - o que estava guardado como `croma.*` é copiado para `crona.*` (a chave do mestre, a ficha do jogador, o nome, o som);
  - ninguém perde o acesso.
- **No banco:**
  - os cômodos do sistema passaram a ser do dono `CRONA`;
  - o saguão antigo virou "Saguão CRONA" (`upgradeDb`).

**O que ganhou cópia (o original está guardado, não apague)**

| O que | O novo | O antigo, guardado |
|---|---|---|
| Banco (Docker) | Container `crona-postgres`, volume `crona_crona-dados`, usuário e base `crona` (`docker-compose.yml`, projeto `crona`). Os dados foram restaurados do backup e as 11 tabelas conferidas, linha a linha na contagem. | Container `croma-postgres` **desligado**, com o volume `croma_croma-dados` inteiro. Backup em `server/data/backups/croma_2026-10-03_20-00-07.dump` (os backups novos saem como `crona_*.dump`). |
| `server/.env` | `CRONA_DB_URL=.../crona` | A linha antiga fica comentada no próprio arquivo. |
| Pasta do Blender | `C:\Users\felip\CRONA-3D` (cópia idêntica: 7.152 arquivos) | `C:\Users\felip\CROMA-3D`. Os `.blend` antigos marcam `croma_vistas`, e o `filmar.py` lê os dois. |
| Pasta do projeto | `...\MEUS PROJETOS\CRONA` (cópia feita no fim de 03/10) | `...\MEUS PROJETOS\CROMA`, que vira backup; a memória do Claude antigo fica ligada ao caminho dela. |

**Voltar atrás, se precisar**
1. `docker stop crona-postgres` e `docker start croma-postgres`.
2. No `server/.env`, volte para a linha `CROMA_DB_URL` antiga.

**Ficou com o nome antigo de propósito**
- a migração `001_inicio.sql` (já aplicada; não se mexe em migração aplicada);
- os caminhos que apontam para a pasta e a memória antigas no `GUIA-DO-CLAUDE.md`.

## O que a branch tem (de 30/09 a 03/10)

- **Tabuleiro e Sede:**
  - todos os cômodos da Sede com arte e arrumados em tamanho de verdade;
  - portas com arte;
  - a prisão sem grade: celas de concreto, escuras fechadas e transparentes abertas (`client/src/room/celas.ts`);
  - a Câmara do Selo;
  - a senha da geladeira num teclado grande.
- **Personagens:**
  - a Alosi em boneco animado (respira, pisca, anda);
  - o pipeline 3D (`scripts/3d/`);
  - os bonecos na proporção real.
- **Vista tática (tecla T):**
  - a câmera sobe e mostra a sala de cima, como mapa de batalha;
  - a mesa acompanha;
  - o Bar já tem a arte de cima (`client/src/render/mapaTatico.ts`).
- **Escala das regras:** a casa tem 0,75 m em tudo, nos móveis, nas pessoas e nas casas.
- **Fazenda Olhos de Águia:**
  - mundo aberto, os interiores e os arredores;
  - em 03/10, **o calabouço embaixo do feno do celeiro**: alçapão sem senha, escada de mão, Calabouço, Corredor Escuro e Sala de Sangue (`docs/FAZENDA.md`).
- **Itens:**
  - 87 ícones pintados;
  - a **requisição de equipamento** (`shared/src/regras/requisicao.ts` e `client/src/ui/requisicao.ts`): a janela de escolher os itens da ficha por categoria, patente, carga, proficiência e munição, também no celular.
- **Telas:** MAPA quase 16:9; FICHAS e COMBATE sem cortes.
- **Regras:** as conferências do Veríssimo (V-1 a V-117) corrigidas.
- **Ferramentas no repositório** (antes ficavam no rascunho de uma sessão):
  - `scripts/dev/`: banco de teste, captura, vigia de zips, folha dos giros;
  - `scripts/3d/`: auditoria, eixos, fila, folha de cima, pedido da vista de cima.
- **A tela de entrada e as contas (04/10).**
  - **A tela:** é a arte do Felipe, em `client/public/arte/login/`: a mesa de RPG à luz de vela, uma versão para o computador e uma para o celular. Os campos de verdade ficam em cima dos desenhados (`client/src/ui/entrada.ts` e `entrada.css`).
  - **As animações:** a vela tremula e ilumina a mesa, o céu pisca, a lua pulsa, sai fumaça da caneca, o emblema brilha com faíscas, a poeira flutua na luz e um brilho passa pelo botão.
  - **As contas** ficam no servidor (`server/src/contas.ts`, guardadas na tabela `config`):
    - e-mail e senha, com a senha em scrypt;
    - uma sessão por aparelho, que vale 180 dias;
    - depois de 5 senhas erradas, a conexão espera 30 s.
  - **Os papéis:**
    - a primeira conta, ou a criada no computador do servidor, é de **mestre**; as outras são de **jogador**;
    - o jogador abre o link `?ficha=` com a conta e a ficha fica ligada a ela; nas próximas vezes, entra direto na ficha.
  - **Continua como antes:**
    - a mesa (`?mesa`), os links `?ficha=` e `?mestre=`;
    - o `?auto` do desenvolvimento, que pula a entrada.
  - **"Encerrar sessão"** sai da conta e volta à entrada.
  - **Testes:** 6 em `server/test/contas.test.ts`.
- **A marca CRONA (04/10):**
  - os logos estão em `client/public/arte/marca/`;
  - o ícone do CRONA aparece na aba do navegador e no celular.
- **Proporções do tabuleiro (04/10)**, pedidas pelo Felipe ("os objetos estão maiores que deveriam", "o personagem não está no mapa de verdade"):
  - **Pés no chão:** a pose em alta definição (`npm run arte:poses -- <nome> --hd`) não vira pixel art. O tabuleiro acha os dois pés na imagem e põe a âncora no meio deles (`pesPontos` em `sprites.ts`): o anel passa embaixo de cada pé e cada pé tem a sombra de contato dele (`RoomView.ts`).
  - **Portas:** ficam do tamanho da arte (vão de 0,8 m, `VAO_PORTA_M` em `furniKit.ts`). Na ordem de desenho, a moldura é parede (`naParede`): a estante e a pia encostadas vêm na frente dela. O buraco da parede na porta principal fica embaixo da moldura. Tentei estreitar a porta (apertando, e depois cortando uma faixa da imagem): entortava o batente e cortava o cadeado, e o Felipe preferiu a arte como está.
  - **Quadros de parede:** o gerador desenhou alguns mais deitados que a parede (o quadro com 0,35 em vez de 0,5, a TV com 0,24, o relógio, o painel de ferramentas, o bilhete). O jogo mede as bordas da arte e inclina na vertical até seguirem a parede (`inclinacaoDoDesenho` em `furniArte.ts`); o que não é retângulo (a câmera, o extintor) fica como está.
  - **Móveis que passavam da casa:** o gerador desenha largo e o `moveis.py` acerta pela altura. Agora a peça cuja base passa da casa encolhe por igual até caber (`encaixe` em `furniArte.ts`, medido na própria imagem: vale para a arte nova também). Foram 17 de 95; os que mais encolheram: carrinho (77%), biombo (80%), fliperama (84%), carrinho do zelador (85%) e poltronas (91%). Eles ficaram mais baixos que o tamanho de verdade: ver "Arte em aberto".
  - **Vista de cima:** a ficha da peça tem 1 casa (0,75 m), o tamanho de uma pessoa vista de cima, na proporção dos móveis (antes, 1 quadrado de 1,5 m). Os móveis usam a mesma base do isométrico.
  - **Entrada:** entra com o e-mail ou com o nome da conta; a regra dos 6 caracteres vale só para criar. `scripts/dev/conta.mts` cria uma conta direto no banco (servidor parado). A prévia (`crona_visual`) tem a conta `admin`, de mestre, para o Felipe ver a tela.

## Pela metade

- **A Catarina nova** (`personagens-teste.zip`, 04/10): o Códex fez as 8 direções.
  - Convertidas pelo `npm run arte:poses -- catarina --estado desarmado --hd` para `client/public/arte/personagens/catarina/tabuleiro-32bits/`, **fora do git**, esperando o Felipe aprovar. A primeira conversão (pixel art) ficou "pixelada demais" para ele; a `--hd` mantém a resolução da arte. Depois ele pediu os pés no chão (feito: âncora no meio dos pés, sombra em cada pé). Perto da Alosi tem umas 6 cabeças de altura em vez de 7.
  - **Se ele aprovar:**
    1. Commit da pasta.
    2. Marcações em `scripts/bonecos/catarina.json` para o `npm run arte:boneco` (respirar e piscar).
    3. Mandar o Códex seguir para as Partes 1 a 5 do `PROMPT-PERSONAGENS.txt`.
  - **Se não aprovar:** apague a pasta e peça para refazer, dizendo o motivo.
- **As interações dos agentes no tabuleiro** (pedidas em 04/10). Quando a arte da Parte 5 chegar (formato no `ARTE.md`, "As interações do agente"), o `RoomView` precisa tocar cada uma:
  - **Abrir e pegar:** quando o mestre usa a ação com a peça comandada, virada para o objeto.
  - **Atacar:** no ataque do combate.
  - **Cair e caído:** quando os PV chegam a 0.

  O andar já toca (o `anim.json` do boneco).
- **Contas:**
  - **Senha esquecida:** ainda não tem "esqueci a senha" (sem e-mail no servidor). O jeito é o mestre apagar a conta, que fica em `config.contas` no banco, e criar de novo.
  - **Lista de contas:** falta uma lista na interface do mestre, para ver as contas, trocar o papel e desligar a ficha.

- **Requisição de equipamento** (`shared/src/regras/requisicao.ts`):
  - modificações e maldições dentro da requisição;
  - quantidade na munição;
  - o servidor conferir o limite da patente quando o jogador salva a própria ficha (`fichaSalvar`);
  - as escolhas de dentro do item (a perícia do utensílio, o elemento, o ritual da vestimenta e do catalisador, os selos);
  - as conferências das maldições (`ELEMENTO_OPRIME`, PP) e os requisitos das modificações.
- **FICHAS mais bonita:**
  - ícones coloridos de PV/PE/SAN e dos atributos, letra maior;
  - comparar com `docs/referencias/fichas.webp`.

  O grosso espera o kit de interface do GPT (abaixo).
- **Ícones pintados no COMBATE** (a escolha da arma) **e no inventário rápido do MAPA:** espera o OK do Felipe.
- **Vista tática:**
  - testar no tablet de verdade, com as fichas de 1 casa (04/10);
  - a arte de cima e as paredes das outras 11 salas quando chegarem.
- **Bonecos:** conferir o pixel depois da escala de 91%. Talvez refazer as tiras pelo `scripts/boneco.py`.
- **Calabouço:**
  - Mobis novos quando a arte chegar:
    - a mesa de contenção (hoje é a mesa metálica);
    - a pilha de crânios;
    - a tocha de parede;
    - o estandarte (hoje é o pôster de sigilo).
  - Um estilo de piso próprio (`piso-calabouco.png`); hoje usa o `selo`.
  - O tanque apagado (estado 1) não tem arte.
- **O chão do píer e da ponte:** o terreno `m` usa os tacos de sala (`taco`). Precisa de um estilo de tábuas (`piso-pier.png`).

## A fazer (não depende de arte)

- **Aba INTERLÚDIO** do MAPA.
- **Fazenda:**
  - Santo Berço, a mata e a rodovia (hoje só placas);
  - andar mais rápido ao ar livre;
  - ligar a Sede aos arredores, que ainda é decisão do Felipe: junta as duas campanhas numa só.
- **FICHAS:** a criação passo a passo (`CHECKLIST-TELA-FICHAS.md`).
- **Bilhetes de confirmação** (`client/src/ui/note.ts`): sem estilo.
- **A tela MAPA** ainda usa parte das mensagens antigas (`docs/CONTRATO.md`).
- **Depois:** login e escolha de campanha; a tela do jogador ("modo jogo").

## Arte em aberto (a fila do Códex)

Todos os pedidos estão na pasta da arte do GPT. O Felipe cola no Códex: *"Leia o arquivo PROMPT-<nome>.txt da pasta BASE - Ordo Realitas e faça o que ele pede, começando pela parte indicada"*.

**Pedidos**

| Pedido | Entrega | Como está (03/10) |
|---|---|---|
| `PROMPT-ICONES-ITENS.txt` + `FALTAM-ICONES.txt` | `icones-equipamentos.zip` (Parte 3), `icones-paranormais.zip` (4), `icones-cenario.zip` (5) | Partes 1 e 2 entregues e no jogo (87 ícones). Da Parte 3 faltam 42 de 62; a 4 e a 5 estão inteiras por fazer. |
| `PROMPT-INTERFACE-GAME.txt` | `interface-teste.zip` primeiro; depois `interface-menus`, `-fichas`, `-combate`, `-modal-itens`, `-celular` e `retratos-agentes` | Nada entregue. |
| `PROMPT-PRISAO-CELAS.txt` | `prisao-celas.zip` | Nada entregue. |
| `PROMPT-VISTA-DE-CIMA.txt` | Partes 2 a 12, um `vista-de-cima-<sala>.zip` por sala | O teste (Bar) está no jogo. As outras salas esperam o Felipe aprovar o estilo do Bar. |
| `PROMPT-VARIACOES-E-ARSENAL.txt` | `variacoes-e-arsenal.zip` | Parou em 5 de 30. As 5 prontas estão na pasta de trabalho do Códex: `%TEMP%\variacoes-e-arsenal-20261003\final`. |
| `LISTA-REFAZER.txt` | `bau-militar-aberto.png` | Por fazer. |
| (a escrever, 04/10) | Os móveis que o gerador desenhou largos, de novo na proporção de verdade: carrinho (`trolley`), biombo (`divider`), fliperama (`arcade`), carrinho do zelador (`janitor_cart`), poltronas (`armchair`, `armchair_leather`), sofá (`sofa_booth`), leito (`hospital_bed`), armário do bar (`bar_cabinet`), caixas de peças (`parts_boxes`), privada (`toilet_steel`) e a porta da cela (`cell_door`). Hoje o jogo encolhe cada um até caber na casa, e eles ficam mais baixos. | Por pedir. |
| `PROMPT-FAZENDA.txt` (03/10) | `fazenda-teste.zip` primeiro; depois `fazenda-texturas`, `-predios`, `-natureza`, `-casa` e `calabouco` | Novo. |
| `PROMPT-PERSONAGENS.txt` (03/10) | `personagens-teste.zip` (a Catarina) primeiro; depois `personagens-8-direcoes`, `-armados`, `alosi-andar` e `ameacas` | Novo. |

**O que fazer quando cada zip chegar**

| Zip | Como entra |
|---|---|
| `icones-*.zip` | `python scripts/icones.py <zip>` |
| `interface-*.zip` | Ligar os ganchos de cada peça (só o alfinete e o teclado da geladeira já têm). |
| `retratos-agentes.zip` | Entram sozinhos. |
| `prisao-celas.zip` | Fichas no `moveis-prisao.json`: `cell_front`, `cell_front~b`/`~c` e o `cell_door_steel` com estados. A parte de cima vai pelo `cima.py`. |
| `vista-de-cima-<sala>.zip` | `python scripts/3d/cima.py <pasta>` |
| `variacoes-e-arsenal.zip` | As variações como `"def": "<id>~b"`; o teclado em `interface/teclado-geladeira/`. |
| `bau-militar-aberto.png` | Trocar na ficha do arsenal (estado 1 do `chest_army`). |
| Zips da Fazenda | Fichas novas (`moveis-fazenda-*.json`); as texturas no `texturas.json` (`grama`, `estrada`, `lavoura`, `cascalho`, `terra`, a parede do celeiro); estilos novos para o píer e o calabouço; os mobis novos do calabouço. |
| Zips dos personagens | `npm run arte:poses` e `npm run arte:boneco`. Cada personagem novo precisa das marcações em `scripts/bonecos/<nome>.json`. |

**Zips que já entraram e ainda estão na raiz da pasta.** Ficam ali até a fila de ícones acabar, porque o `FALTAM-ICONES.txt` aponta para eles; depois vão para `_entregas-originais/`.
- `icones-armas.zip`
- `icones-protecao-municao-explosivos.zip`
- `vista-de-cima-teste.zip`

## Decisões que são do Felipe

- Aprovar o estilo da vista de cima do Bar, que libera as outras salas.
- Ícones pintados no COMBATE e no inventário rápido do MAPA.
- O que vem primeiro: as modificações na requisição ou a FICHAS bonita.
- Fechar o PR `#2` do Códex (`codex/arte-tepes-32bits`), que ficou sobrando.
- Quando apagar as cópias antigas da troca de nome (o container `croma-postgres`, a pasta `CROMA-3D`, a pasta `CROMA` do projeto). Por enquanto, guardar.
- Ligar a Sede aos arredores da Fazenda.

## Problemas conhecidos

- **`scripts/3d/eixos.py`:** marca o aparador e o armarinho do Bar como "TROCADO". Os dois não são caixa, então a conta não vale; no tabuleiro estão certos.
- **Corredor Escuro:** é bem escuro de propósito. O mestre clareia no ☀ Clima da cena se o tablet não mostrar.
- **Passagem secreta no teste do servidor:** o teste "toda passagem tem caminho" pula a passagem escondida enquanto ela está coberta (o alçapão embaixo do feno).
