# Contrato da sessão compartilhada

É o combinado entre a interface e o servidor. A interface **lê** a sessão e **pede** ações; o servidor confere a permissão, aplica e manda a sessão atualizada para todo mundo. A interface nunca decide sozinha se algo é permitido.

- Tipos: `shared/src/session.ts` (importe de `@croma/shared`).
- No cliente: `app.session`, um `SessionStore` (`client/src/session/store.ts`).
- Testes das regras: `server/test/session.test.ts` (`npm test`).

## Uso na interface

```ts
const store = app.session;

// sessão inteira: chama já com o estado atual e de novo a cada mudança
const stop = store.subscribe((s) => render(s));

// passos das peças (a cada TOKEN_STEP_MS = 500 ms), para animar
store.onTokens((sceneId, tokens) => animate(sceneId, tokens));

// ação recusada pelo servidor (motivo pronto para mostrar)
store.onDenied((action, reason) => showError(reason));

// ações (só o mestre; para o jogador o servidor responde com onDenied)
store.changeScene(sceneId);
store.moveToken(tokenId, { x: 0.62, y: 0.72 });                 // anda até lá
store.moveToken(tokenId, { tile: { x: 8, y: 4 } }, 'place');   // aparece direto
store.faceToken(tokenId, 4);                                   // vira para ↙ (ver turnFacing)
store.giveItem(itemId, characterId);                           // entrega
store.giveItem(itemId, null);                                  // devolve ao objeto
store.addObjective('Achar a saída');
store.setObjective(objectiveId, true);
store.removeObjective(objectiveId);

// leitura
store.isGm;               // mestre ou jogador
store.currentScene;       // cena que todos estão vendo
store.tokensIn(sceneId);
store.objectsIn(sceneId);
store.itemsIn(objectId);  // itens guardados num objeto
store.itemsOf(characterId);
store.character(id);
```

Hoje a tela MAPA ainda usa as mensagens antigas (`roomEnter`, `status`, `campaign`...). Elas continuam funcionando. Componentes novos devem usar o `SessionStore`.

## Tipos

| Tipo | O que é | Campos principais |
|---|---|---|
| `Session` | Tudo o que a tela precisa | `id`, `title`, `subtitle`, `me {name, role}`, `currentSceneId`, `scenes`, `objects`, `characters`, `tokens`, `items`, `objectives`, `events`, `layout` |
| `Scene` | Um cômodo | `id`, `name` ("Escritório"), `title` ("Mansão Alvarez · Escritório"), `description`, `aspect`, `grid`, `cols`, `rows`, `heightmap`, `exits`, `lightMode`, `fog`, `darkness` |
| `SceneObject` | Objeto que importa: tem pista, itens ou interações | `id`, `sceneId`, `kind` (`floor`/`wall`), `name`, `description`, `hidden`, `pos`, `top`, `itemIds`, `interactions [{id, label, dt}]` |
| `Character` | Personagem do grupo | `id`, `name`, `color`, `capacity`, `load`, `look`, `sceneId` |
| `Token` | A peça do personagem no mapa | `id` (= `Character.id`), `sceneId`, `tile`, `pos`, `to?`, `dir` |
| `Item` | Item guardado num objeto ou com alguém | `id`, `name`, `weight`, `kind`, `kindLabel`, `sceneId`, `objectId`, `holderId`, `holderName`, `revealed` |
| `Objective` | Objetivo da sessão | `id`, `text`, `done` |
| `GameEvent` | Linha de "Últimas ações" | `at` (ms), `icon` (`user`/`give`/`scene`/`obj`/`dice`), `text` |

`load` é a soma dos pesos dos itens com o personagem. Passar de `capacity` é permitido: a interface mostra o aviso, o mestre decide.

## Posições de 0 a 1

- Toda posição (`pos`, `to`, `top`, `exits[].pos`) é relativa ao **quadro da cena**: `x` e `y` entre 0 e 1, com (0,0) no canto superior esquerdo. O quadro tem a proporção `scene.aspect` (largura ÷ altura). Desenhe a cena num retângulo com essa proporção e multiplique: `left = pos.x * largura`, `top = pos.y * altura`.
- Hoje o quadro é o retângulo que contém o chão e as paredes do cômodo desenhado por código. Quando as cenas virarem imagens, o quadro passa a ser a própria imagem e as posições continuam valendo.
- O servidor continua com a **casa** (`tile`) para a colisão e o caminho. A conversão entre casa e ponto usa `scene.grid`, com estas funções de `@croma/shared`:
  - `tileCenter(grid, tile, altura)` dá o ponto do centro da casa;
  - `pointToTile(grid, heightmap, ponto)` dá a casa sob o ponto;
  - `tilesByDistance(...)` dá as casas mais perto de um ponto.
- **Peça andando:** `pos` é a casa atual e `to` a próxima. Anime de `pos` até `to` em `TOKEN_STEP_MS` (500 ms). A cada passo chega um `onTokens` com os valores novos.
- **Arrastar:** ao soltar, chame `moveToken(id, ponto)`. O servidor escolhe a casa livre mais perto do ponto:
  - `walk` (padrão): a peça anda até lá desviando dos móveis;
  - `place`: a peça aparece direto lá.

  Enquanto isso, a peça arrastada volta para onde estava e segue o que o servidor mandar.
- **Girar:** `turnFacing(dir, horário, permitidas)` dá a próxima direção. Use `distinctFacings(...)` da folha do personagem para girar só entre as poses que ela tem (4 ou 8).
- **Direção** (`dir`, de 0 a 7, na tela): 0 cima-direita, 1 direita, 2 baixo-direita, 3 baixo, 4 baixo-esquerda, 5 esquerda, 6 cima-esquerda, 7 cima. `sheetDirFor(dir, temLinha)` dá a linha da folha de sprite: numa folha de 8 direções, a própria; numa de 4, a diagonal mais próxima (ver `DIR_TO_SHEET` em `shared/src/protocol.ts`).

## Ações e permissões

| Ação | O que o servidor faz | Recusa quando |
|---|---|---|
| `scene.change` | Troca a cena atual da sessão e leva os jogadores junto | cena não existe |
| `token.move` | Leva a peça à casa livre mais perto do ponto (`walk` ou `place`) | peça não existe; ponto inválido; sem casa livre ou sem caminho |
| `token.face` | Vira a peça parada para `dir` (0 a 7) e avisa todos na hora | peça não existe; direção inválida; peça andando |
| `item.give` | Entrega o item ao personagem (`to` = id) ou devolve ao objeto (`to` = `null`); registra em "Últimas ações" | item ou personagem não existe |
| `objective.add` | Cria o objetivo | texto vazio; mais de 20 |
| `objective.set` | Marca feito ou não feito; ao concluir, registra | objetivo não existe |
| `objective.remove` | Apaga o objetivo | objetivo não existe |

Toda ação vinda de jogador é recusada com "Só o mestre pode fazer isso.". As mensagens antigas que mudam o tabuleiro (`tokenWalk`, `lootGive`, `objToggle`, `place`...) também passaram a ser só do mestre.

## Mestre e mesa

- **Mestre:** a conexão que vem do próprio computador do servidor. Em outro aparelho, o mestre abre o link com `?mestre=CHAVE`, que o servidor imprime ao subir. A chave fica no navegador e sai da barra de endereço; ela é gerada no primeiro uso e guardada em `server/data/db.json` (`gmKey`).
- **Mesa (papel `player`):** a tela do tablet, em `?mesa` (ou `?jogador`). Entra sozinha, com um nome como "Mesa 4K2Q", e manda `mesa: true` no login, o que força o papel de jogador mesmo neste computador ou com a chave.
- A mesa **só assiste**: vai sempre para a cena que o mestre deixou aberta, não recebe pista oculta nem item ainda não revelado, e não consegue agir.
- Quem entra com o nome de alguém já conectado assume a conexão dele, mas a mesa não consegue assumir a do mestre.

## Mensagens

Só para referência: o `SessionStore` já cuida disso.

| Direção | Mensagem |
|---|---|
| cliente → servidor | `{ t: 'login', name, look, gmKey?, mesa? }` |
| cliente → servidor | `{ t: 'act', a: SessionAction }` |
| servidor → cliente | `{ t: 'welcome', ..., role }` |
| servidor → cliente | `{ t: 'session', session }`, a cada mudança (no máximo a cada 1,5 s enquanto as peças andam) |
| servidor → cliente | `{ t: 'tokens', sceneId, tokens }`, a cada passo, só as peças que se mexeram |
| servidor → cliente | `{ t: 'denied', action, reason }` |

**Ids:** `Character.id` e `Token.id` são positivos. As mensagens antigas (`roomEnter`, `status`, `userJoin` e `campaign.party`) usam o mesmo número com sinal negativo.

## Testar o marco com duas janelas

1. `npm run dev`.
2. Janela do mestre: `http://localhost:5173`.
3. Janela da mesa: `http://localhost:5173/?mesa`, ou no tablet, o link da mesa que aparece no terminal.
4. O mestre troca de cena, move e gira uma peça; a mesa acompanha sem recarregar.

## Ainda não existe

- Mesa com toque (hoje ela só mostra).
- Imagem da cena (`Scene.image`); chega com o tabuleiro em imagem.
- Escolher entre várias sessões (o servidor já separa, falta a tela).
