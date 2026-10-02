# CROMA — guia para quem trabalha no código (Claude e Codex)

## O que é

Tabuleiro digital isométrico para sessões de **Ordem Paranormal RPG**. São duas telas: a do **mestre** (a interface completa, só ele vê; as telas seguem as referências de `docs/referencias/`) e a da **mesa** (só o tabuleiro, num tablet que os jogadores olham, sem toque). O plano do MVP está em `docs/guia-mvp.html`; o contrato entre interface e servidor, em `docs/CONTRATO.md`; as regras do jogo, em `docs/REGRAS.md`; a mecânica do combate, em `docs/COMBATE.md`.

## Rodar

```bash
npm install
npm run banco      # sobe o Postgres do CROMA no Docker (croma-postgres, 127.0.0.1:5433)
npm run dev        # cliente em http://localhost:5173 + servidor em http://localhost:3001
npm run typecheck  # shared, server e client (inclui os testes)
npm test           # regras da sessão (server/test)
npm run build
npm start          # produção: tudo servido pela porta 3001 (ou PORT / CROMA_PORT)
npm run banco:backup     # cópia do banco em server/data/backups/ (as 30 mais novas)
npm run banco:restaurar -- server/data/backups/<arquivo>.dump --sim
npm run banco:parar
```

- **Mestre:** o computador que roda o servidor. Abre direto a interface em `http://localhost:5173`, sem login.
- **Mesa (tablet):** `http://IP-deste-computador:5173/?mesa`. O servidor imprime o link ao subir. Na primeira vez, o Windows pode pedir para liberar o Node no firewall.
- **Mestre em outro aparelho:** link com `?mestre=CHAVE`, também impresso pelo servidor. A chave fica no banco (`gmKey` na tabela `config`).
- **Jogador (a própria ficha, no celular):** link `?ficha=CHAVE`, que o mestre gera na aba FICHAS (botão ⋯ da Identificação). O jogador vê e edita só a ficha dele; NEX e pontos de prestígio ficam com o mestre.
- Em desenvolvimento, `?auto=Nome` escolhe o nome do mestre.
- O Vite faz proxy de `/ws`, `/api` e `/uploads` para o servidor.
- **Banco:** com `CROMA_DB_URL` em `server/.env` (copie de `server/.env.example`), tudo fica no Postgres do Docker (`docker-compose.yml`), só acessível por este computador. As tabelas têm colunas legíveis e a coluna `dados` com o objeto inteiro; o servidor grava só o que mudou. As migrações ficam em `server/src/banco/migracoes/`. Na primeira vez, o `server/data/db.json` é importado. Sem `CROMA_DB_URL`, o servidor usa o `db.json` como antes.
- Os arquivos enviados (folhas, retratos) ficam em `server/data/uploads/`; tudo em `server/data/` fica fora do git.
- A pasta do projeto fica no OneDrive: o Vite usa polling para perceber mudanças.

## Estrutura

| Pasta | O que tem |
|---|---|
| `shared/src/` | Tipos e regras usados pelos dois lados: mensagens entre cliente e servidor (`protocol.ts`), cenas e objetos (`room.ts`, `furni.ts`), campanha, itens e registro (`rpg.ts`), caminho (`pathfinding.ts`), planta (`heightmap.ts`, `layouts.ts`), regras de Ordem Paranormal (`regras/`) e do combate (`combate/`: ordem de iniciativa, turnos, ações do turno e registro) |
| `server/src/` | Servidor autoritativo: conexões, campanhas e cenas (`hotel.ts`), cena ao vivo com peças, movimento a cada 500 ms, itens, entregas e registro (`roomInstance.ts`), tipos do que é guardado (`db.ts`), banco Postgres ou JSON (`banco/`), conteúdo de exemplo (`seed.ts`) |
| `client/src/room/`, `client/src/render/` | Motor do tabuleiro: canvas isométrico, luz, névoa, sprites |
| `client/src/ui/` | Interface: tela MAPA (`shell.ts`, `shell.css` + `mapa.css`; a aba ITENS em `itens.ts` e `itens.css`, o catálogo de itens em `catalogoItens.ts`), barra do topo (`topbar.ts`), aba FICHAS (`fichas.ts`, `fichas.css`, `fichaRegras.ts` = a ligação com o motor, `fichaModal.ts` = as janelas de escolha, `corpo.ts` = o personagem grande), aba COMBATE (`combate.ts`, `combateAtaque.ts` = arma, situação, rolagem e dano, `combateAmeaca.ts` = a ficha rápida da ameaça, `combate.css`), tela do jogador (`telaFicha.ts`), tema das telas novas (`tema.css`), ícones (`icons.ts`), papel desenhado (`paperArt.ts`), animações (`motion.ts`), sons (`sfx.ts`), bilhetes de confirmação (`note.ts`), janelas |
| `shared/src/session.ts` | Contrato da sessão: `Session`, `Scene`, `Token`, `Character`, `Item`, `Objective`, `GameEvent`, ações e conversão casa ↔ ponto 0..1 |
| `client/src/session/` | `SessionStore` (estado da sessão e ações para a interface) e chave do mestre |
| `client/src/net.ts`, `client/src/ui/app.ts` | Conexão com o servidor e estado do cliente |
| `server/test/` | Testes das regras (`npm test`) |
| `client/src/main.ts` | Liga rede, estado e interface (trata as mensagens do servidor) |
| `docs/` | Referências das telas (`referencias/`, com o emblema oficial coberto), o guia do MVP, o contrato da sessão (`CONTRATO.md`), o guia de arte (`ARTE.md`) e a lista do que falta desenhar (`CHECKLIST-ARTE.md`), o mapa das regras de Ordem Paranormal (`REGRAS.md`) e a mecânica do combate (`COMBATE.md`) |
| `client/public/arte/` | Arte entregue pelo Codex (servida em `/arte/...`) |
| `.claude/agents/verissimo.md`, `.claude/skills/verissimo/`, `docs/verissimo/` | O Veríssimo (`/verissimo`): confere com os livros só o que mudou desde a última conferência (ver `docs/verissimo/README.md`) |

## Divisão de trabalho

- **Codex — artista:** só arte. Personagens (folhas de sprite e retratos), móveis, cenários, ícones de itens, peças da interface (papéis, abas, botões, fitas) e efeitos. Entrega **arquivos de imagem** em `client/public/arte/`, no formato de `docs/ARTE.md`, e **não mexe no código**.
- **Claude — construtor:** todo o código. Servidor, tipos, interface, animações, tabuleiro e o encaixe da arte no jogo.
- Pedido de arte novo: entra em `docs/ARTE.md` (formato, tamanho, nome e pasta) antes de ser feito. A lista do que falta desenhar, de todas as telas, é `docs/CHECKLIST-ARTE.md`: é ela que vai para o Codex.

## Para o Codex: comece aqui

Pediram arte ("começa a arte", "faz os retratos", "faz os ícones da FICHAS")? O caminho é este:

1. Atualize com a `main` e crie a branch `codex/arte-<assunto>` (por exemplo `codex/arte-retratos` ou `codex/arte-icones-fichas`). Um assunto por branch.
2. A lista do que desenhar é [`docs/CHECKLIST-ARTE.md`](docs/CHECKLIST-ARTE.md): cada linha traz a peça, o nome do arquivo, a pasta e o tamanho. Comece pelos itens com ✱, os que mais mudam a tela.
3. Para ver cada peça, abra a referência da tela em `docs/referencias/` (`mapa.webp`, `fichas.webp`, `fichas-celular.webp` e `combate.webp`). A caixa tracejada "emblema oficial (coberto)" e as manchas quadriculadas escondem o emblema e os símbolos oficiais de Ordem Paranormal: não reproduza, crie símbolos próprios.
4. Os agentes: a folha de hoje de cada um (`client/public/arte/personagens/<nome>/folha.webp`) é a arte de referência dele (rosto, cabelo, roupa, cores). O retrato novo é o mesmo personagem.
5. Entregue só imagens, em `client/public/arte/`, com o nome exato da lista e no formato de [`docs/ARTE.md`](docs/ARTE.md): PNG com fundo transparente de verdade, sem texto, sem números e sem sombra em volta. Não mexa no código.
6. Marque `- [x]` na lista o que entregou, faça o commit em português e abra o pull request para `main`. O que "entra sozinho" aparece no jogo na hora; o resto o Claude encaixa.
7. Não dá para gerar imagem aí? Escreva, para cada peça, o pedido pronto para o gerador de imagem (o que é, o estilo da lista, o tamanho e o fundo transparente) e entregue esses textos a quem pediu. Quando as imagens voltarem, ajuste recorte, tamanho, transparência e nome, e siga do passo 5.

## Como trabalhar

- Cada um em sua branch (`claude/...` para código, `codex/arte-...` para arte), com pull request para `main`. Nada de push direto na `main`.
- Antes de começar, atualizar a branch com a `main`.
- Antes de abrir o pull request: `npm run typecheck`, `npm test` e `npm run build` sem erros.
- Mexeu em regra (motor, catálogo, contas, documentos de regra) ou as fichas subiram de NEX? Rode `/verissimo`: ele confere com os livros só o que mudou e registra a conferência.
- Textos da interface, comentários e mensagens de commit em português.

## Estado em 30/09/2026

- **Sede da Ordem** (campanha que abre por padrão): o bar no térreo e onze cômodos no subsolo, montados a partir da planta "Mapa Base Ordo Realitas" (`server/src/seedSede.ts`). A lista do visual, cômodo por cômodo, está em `docs/SEDE-DA-ORDEM.md`. Mudou a montagem? Suba `SEDE_REV`: a Sede é refeita no lugar, mantendo cômodos, peças e registro.
- **Passagem secreta:** a geladeira do bar tem fechadura com senha (0413). O mestre digita no painel do objeto; certa, ela desliza e a escada escondida aparece. Quem sobe pela escada com a passagem fechada abre por dentro. Quando não sobra ninguém na sala, a passagem se fecha sozinha.
- **Portas de cela:** abrem e fecham com clique duplo; fechadas, ninguém passa (`openState` no mobi).
- **Andares:** cada cena tem um andar (Térreo, Subsolo) e pode ter uma área ("Área técnica", na plaquinha do cartão da sala). A planta à esquerda mostra um andar por vez, com abas, e é a navegação entre cenas (a lista de cenários saiu): os nomes em plaquinhas, o alfinete na sala atual e as anotações à mão do mestre (`notas` da campanha, por andar).
- **Escala:** os mobis são medidos em metros (`Z_PER_M` = 1,8 unidade por metro): mesa 0,8 m, estante 2,2 m, porta 2,15 m, gente ~1,75 m.
- **Clima de cada cômodo:** piso (`floorStyle`), cor do ambiente (`ambient`) e partículas (`particles`: poeira na luz, fumaça e brasas do fogo), tudo em Configurar cena. A quantidade de partículas (`particleLevel`) fica no ☀ Clima da cena, junto da névoa e da escuridão.
- **Telas novas (29/09):** MAPA e FICHAS seguem `docs/referencias/mapa.webp` e `docs/referencias/fichas.webp` (16:9, desenhadas em 1672×941; 1rem = 10 px da referência). No celular (retrato), a FICHAS segue a disposição de `docs/referencias/fichas-celular.webp`, com o conteúdo completo. No git, as referências estão com o emblema oficial coberto; as originais (`docs/ref-*.webp`) ficam só neste computador. Sem arte, tudo usa o desenho padrão; a arte que chega em `client/public/arte/` entra sozinha (o servidor lista o que existe em `/api/arte`).
- **Tela do mestre (MAPA):** à esquerda a planta, o cartão da sala e o do objeto selecionado; no meio o tabuleiro, com moldura (em cômodo grande, a câmera acompanha as peças; quando a peça comandada atravessa uma porta, a tela vai junto para o cômodo novo); à direita PLAYERS com PV, PE e SAN (− e + nas três); embaixo as cartas do grupo, o inventário rápido e as AÇÕES (examinar, abrir, usar, entregar). No topo: MAPA, COMBATE e FICHAS; objetivos e registro no botão de documento.
- **Aba FICHAS:** a ficha inteira de cada agente, calculada pelo motor. Dois modos: jogo (PV, PE, SAN, condições e anotações gravam na hora) e editar (rascunho: Salvar grava, Cancelar descarta). Cada pendência (Evolução) abre as opções do livro, liberadas ou travadas com o motivo. O personagem grande respira pela ficha; pisca quando houver `corpo-olhos-fechados.png`.
- **Ficha:** PV, PE e SAN (atual e total) por personagem, com as condições do livro (machucado, perturbado, morrendo, enlouquecendo). As cartas mostram as barrinhas; o retrato respira conforme a ficha e usa a imagem do estado (`docs/ARTE.md`). Peça de agente sem PV, PE e SAN (nova, ou de antes da ficha) pega os da ficha quando o servidor sobe.
- A mesa (`client/src/ui/table.ts`) só mostra o tabuleiro e segue a última cena que o mestre abriu, em qualquer campanha; em combate, mostra também a rodada, de quem é a vez e a ordem. O servidor recusa qualquer ação que venha da mesa.
- O contrato (`docs/CONTRATO.md`) e o `SessionStore` existem; a tela MAPA ainda usa parte das mensagens antigas.
- Personagens: D.Tepes, Catarina Albuquerque, Alosi Walker e Cora Falcão, com as folhas em `client/public/arte/personagens/`. O mestre gira o personagem parado com ↺ ↻ nas cartas ou Q e E. **Decidido em 30/09:** essas folhas são a arte de referência de cada agente (grande na FICHAS e, depois, na Hand do jogador); o tabuleiro vai ganhar folhas novas, em estilo 32 bits, com todos os ângulos e as animações de andar. **Poses do tabuleiro:** o Tepes já tem as quatro poses paradas em 32 bits (`tabuleiro-32bits/`, frente virada para a direita); o servidor acha as imagens na pasta (`findPoses`, em `server/src/portraits.ts`) e o tabuleiro e a mesa escolhem a pose pelo Armado e pelos PV (menos da metade = machucado). As outras direções entram sozinhas quando chegarem, no formato do `docs/ARTE.md` ("Poses do tabuleiro"). **Decidido em 30/09, revisto em 01/10:** o tabuleiro inteiro (bonecos e mapa) vai para pixel art chibi na grade 1:1 (1 pixel da arte = 1 da tela: casa 64×32, pessoa ~104 de altura; na 2:1 o rosto e os óculos da Alosi sumiam), descrita no `docs/ARTE.md`; as poses realistas do Tepes ficam até chegarem as chibi. **Alosi no chibi (01/10):** as 8 direções paradas, montadas por `npm run arte:poses` (`scripts/poses.py`) a partir da imagem do gerador. **Boneco animado (02/10):** `npm run arte:boneco -- alosi` (`scripts/boneco.py`, marcações em `scripts/bonecos/alosi.json`) recorta a pose de cada direção em peças e faz o parado respirar e piscar; o andar vem desenhado quadro a quadro (`--andar-desenhado`, formato no `docs/ARTE.md`), e até chegar fica um andar provisório montado das peças (peças giradas quebram o pixel art: joelho e cotovelo exagerados ficaram estranhos). Grava tiras e `anim.json`, que o servidor acha (`findAnim`) e o tabuleiro toca (o passo segue as casas andadas, a piscada é aleatória, sombra em cada pé). Todas as peças pisam no chão: pegada no meio da casa, sombra de contato, pés escurecidos, a sombra que as luzes do cenário projetam (a luz do mobi guarda onde fica no cômodo, `mundo`) e a cor dessas luzes no corpo; sombras e anel vão antes dos móveis.
- **Regras:** tudo do jogo fica no CROMA (fichas, regras, dados, regras da casa). O C.R.I.S (sistema do mestre, repositório SistemaDeMestragemRPG) serviu só de referência para entender o sistema de Ordem Paranormal e como tratá-lo aqui; o CROMA não depende dele (não lê o banco de lá, não importa código nem arte). As regras ficam no próprio código (`shared/src/regras/`), conferidas com o livro. O mapa das regras, o que cada uma muda no tabuleiro e a ordem de construção estão em `docs/REGRAS.md`.
- Os bilhetes de confirmação (`client/src/ui/note.ts`) ainda não têm estilo.
- **Motor de criação de personagem** em `shared/src/regras/` (exportado como `regras` em `@croma/shared`): catálogos do livro e do *Sobrevivendo ao Horror*, ficha NEX a NEX de 0% a 99%, requisitos com motivo, contas e opções. Ainda sem tela; as telas estão descritas em `docs/CRIACAO-DE-PERSONAGEM.md`.
- **Regras conferidas com os livros em 29/09** (`docs/AUDITORIA-REGRAS.md`): catálogos inteiros, as fichas dos Marcados e as dúvidas para o mestre decidir.
- **Combate (30/09):** a mecânica inteira, conferida com o livro de regras e o *Sobrevivendo ao Horror*, está em `docs/COMBATE.md`, com as decisões abertas (DC-1 a DC-23) e a ordem de construção. A tela segue `docs/referencias/combate.webp`, descrita em `docs/TELA-COMBATE.md`, com a arte em `docs/CHECKLIST-TELA-COMBATE.md`. Só o mestre mexe no combate, e os dados são sempre físicos: ele digita o que saiu na mesa; os jogadores assistem ao tabuleiro no tablet.
- **Aba COMBATE (30/09):** o combate fica na campanha (`combate` em `CampaignData`), e as regras dele em `shared/src/combate/` (turnos, `ataque.ts` com as contas do ataque e do dano, `ameaca.ts` com a ficha rápida). O mestre monta o combate, digita a Iniciativa e passa os turnos; no ataque, escolhe a arma e o alvo, confere a situação que o tabuleiro viu (`client/src/room/combateGeo.ts`: alcance, cobertura, flanquear, posição elevada, áreas), digita o d20, o d10 da camuflagem e a soma do dano, e confirma: o servidor aplica o dano na peça e o registro guarda tudo, com Desfazer (que devolve também os PV). Ritual e habilidade gastam PE com o limite do turno; ritual sustentado, condições, primeiros socorros e acalmar entram no combate. As ameaças têm ficha rápida (Defesa, resistências, RD, ataques), guardada na campanha (`ameacas`); "Do livro" preenche com uma das 74 ameaças do livro de regras (`shared/src/combate/ameacasLivro.ts`, só nome, números e página). As manobras (`manobra.ts`, `combateManobra.ts`) fazem o teste oposto e aplicam o efeito, e o empurrão move a peça; o ritual (`ritual.ts`, `combateRitual.ts`) vai da forma ao Custo do Paranormal, com a resistência de cada alvo e o elemento contra o da criatura. As marcações do tabuleiro ficam em `client/src/render/combateMarcas.ts`, e a mesa mostra a vez, os caídos e o carimbo de cada ataque. A tela está descrita em `docs/TELA-COMBATE.md`; o que falta, lá e em `docs/CHECKLIST-TELA-COMBATE.md`.
- **Mochila (30/09):** um inventário só. O item achado no cenário vai para a mochila da ficha ao ser pego (`shared/src/itens.ts`); cada item está na mão, vestido ou na mochila (`shared/src/regras/mochila.ts`), com as duas mãos do livro, e a arma na mão deixa a peça armada (retrato, pose, mesa). A aba ITENS do MAPA (referência `docs/ref-itens.jpg`, fora do git) mostra a mochila de cada agente e faz empunhar, abrir documento, usar, vestir, inspecionar, entregar e largar (no chão, numa pilha). No combate, a arma da mochila tem "Sacar" e o Desarmar derruba a arma. Os itens do cenário ocupam espaços (antes, peso).
- Testes das regras em `server/test/` (sessão, Sede, passagem secreta, ficha, fichas no servidor, banco, proporção, retratos, motor de regras, combate, mochila).
