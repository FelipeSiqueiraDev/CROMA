# Em aberto: onde paramos (03/10/2026)

O que está pela metade, o que falta e o que o Códex ainda vai entregar. Leia junto com o [`GUIA-DO-CLAUDE.md`](GUIA-DO-CLAUDE.md), que diz como trabalhar aqui. **Atualize este arquivo ao fim de cada bloco de trabalho.**

## O git agora

- **Branch:** `claude/personagens-3d`, enviada para o GitHub em 03/10. Tudo de 30/09 a 03/10 está nela e **ainda não entrou na `main`**: o PR depende do OK do Felipe.
  - Antes de começar coisa nova, pergunte se o PR já entrou.
  - Se não entrou, continue nesta branch ou abra a próxima a partir dela. Nunca parta da `main` velha.
- **As branches antigas já estão dentro desta.** A `main` está toda nela (o PR entra sem conflito). As branches enviadas desde 29/09 também:
  - `claude/combate-completo`, `mapa-sem-arte`, `mochila-itens`, `tepes-32bits`, `verissimo-erros`;
  - `codex/arte-telas-checklist`, `arte-tepes-32bits`;
  - `claude/celular-fichas`, trazida em 03/10.

  O PR aberto `FelipeSiqueiraDev/CROMA#2` (`codex/arte-tepes-32bits`) fica sobrando quando esta entrar: dá para fechar.
- **Fora do git, de propósito.** Não faça commit sem perguntar:

| Arquivo | O que é |
|---|---|
| `client/src/render/iso.ts` (modificado) | Sobra da câmera de cima recusada em 02/10 (a vista tática ficou noutro arquivo). Recomendado descartar com `git checkout -- client/src/render/iso.ts`, mas pergunte antes. |
| `client/public/arte/cenarios/` | A ilustração da Sede do Códex, alvo de estilo. Só neste computador. |
| `client/public/arte/mobiliario/bar-128/`, `bar-chair/`, `bar/` | Arte antiga do Códex, guardada como referência. O jogo não usa. |

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

## Pela metade

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
  - fichas grandes fora do combate (decidir);
  - testar no tablet de verdade;
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

- Abrir o PR desta branch e juntar na `main`.
- Aprovar o estilo da vista de cima do Bar, que libera as outras salas.
- Ícones pintados no COMBATE e no inventário rápido do MAPA.
- O que vem primeiro: as modificações na requisição ou a FICHAS bonita.
- Descartar o `client/src/render/iso.ts`.
- Ligar a Sede aos arredores da Fazenda.
- Fichas grandes na vista tática fora do combate.

## Problemas conhecidos

- **`scripts/3d/eixos.py`:** marca o aparador e o armarinho do Bar como "TROCADO". Os dois não são caixa, então a conta não vale; no tabuleiro estão certos.
- **Corredor Escuro:** é bem escuro de propósito. O mestre clareia no ☀ Clima da cena se o tablet não mostrar.
- **Passagem secreta no teste do servidor:** o teste "toda passagem tem caminho" pula a passagem escondida enquanto ela está coberta (o alçapão embaixo do feno).
