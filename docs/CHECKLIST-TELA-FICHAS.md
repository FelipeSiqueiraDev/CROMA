# Checklist: tela FICHAS igual à referência

Para a tela ficar como `docs/referencias/fichas.webp` (computador) e seguir a disposição de `docs/referencias/fichas-celular.webp` (celular). Marque com `x` o que ficar pronto (`- [x]`).

- **Você:** desenho (arte feita com o ChatGPT/Codex).
- **Claude:** código.

Tamanhos já no **dobro** (é o tamanho de entrega). PNG com fundo transparente, sem texto e sem número pintado; sombra em volta da peça não vai (o jogo faz), sombras internas vão.

Enquanto a arte não chega, a tela funciona com o desenho padrão: papel desenhado em código, ícones de linha (Lucide) e a folha de sprite ampliada no lugar do personagem grande. Quando o arquivo chega na pasta, o jogo usa na hora (o servidor lista a arte que existe: `/api/arte`).

---

## 1. O personagem grande (painel ao lado da lista)

- [ ] **Você:** `client/public/arte/personagens/<nome>/corpo.png`, 560×900, corpo inteiro de frente, em pé, no mesmo estilo dos retratos. Um por agente (`tepes`, `catarina`, `alosi`, `cora-falcao`)
- [ ] **Você:** `corpo-olhos-fechados.png`, a mesma imagem com os olhos fechados (só os olhos mudam: mesma pose, mesmo tamanho, mesma posição). **É o que faz ele piscar**: a folha de sprite não serve para isso (o quadro de olhos fechados é outra pose, o corpo balança entre os quadros e piscar por ele faria o boneco tremer). Sem esse arquivo, o personagem grande só respira
- [ ] **Você (opcional):** `corpo-costas.png`, `corpo-esquerda.png`, `corpo-direita.png`, para as setas ‹ › girarem o personagem. Sem elas, as setas giram a folha de sprite
- [ ] **Você (opcional):** `corpo-armado.png`, a versão com a arma na mão
- [ ] **Você:** `client/public/arte/interface/fundo-personagem.jpg`, 620×1140, a sala escura atrás dele (caixas, parede, luz fria de cima), bem desfocada. O jogo põe o emblema apagado em cima e os cantos de mira
- [x] **Claude:** painel com moldura, cantos de mira, emblema apagado (do logo local), as setas e o personagem
- [x] **Claude:** respiração em duas camadas (pernas paradas; peito, ombros e cabeça sobem a partir da cintura), feita pelo navegador: não trava nem pisca. Muda com a ficha (machucado, perturbado, PE baixo, morrendo)
- [x] **Claude:** piscada com `corpo-olhos-fechados.png` (a camada fica pronta embaixo e aparece por um instante; às vezes duas seguidas)

## 2. Ícones que a biblioteca não tem igual

Pasta: `client/public/arte/icones/`. 128×128, fundo transparente.

- [ ] **Você:** `pv.png`, coração vermelho
- [ ] **Você:** `pe.png`, cérebro azul-claro
- [ ] **Você:** `san.png`, espiral azul
- [ ] **Você:** um sigilo para cada elemento, para os rituais: `sigilo-sangue.png`, `sigilo-morte.png`, `sigilo-conhecimento.png`, `sigilo-energia.png`, `sigilo-medo.png`. Crie sigilos próprios (os símbolos oficiais são de Ordem Paranormal e o repositório é público)
- [x] **Claude:** o resto com a biblioteca (Lucide): atributos (Agilidade, Força, Intelecto, Presença, Vigor), derivados (escudo, bota, colete), condições, títulos dos painéis e botões
- [x] **Claude:** sigilos padrão desenhados em código, na cor de cada elemento, até os seus chegarem

Opcional, para ficar idêntico à referência em vez de parecido:
- [ ] **Você (opcional):** os 5 ícones dos atributos (`agi.png`, `for.png`, `int.png`, `pre.png`, `vig.png`), no estilo branco sobre quadrado escuro
- [ ] **Você (opcional):** os 4 dos derivados (`defesa.png`, `deslocamento.png`, `protecao.png`, `resistencias.png`)
- [ ] **Você (opcional):** os ícones dos títulos dos painéis (o sigilo no quadradinho preto de cada título)

## 3. Itens (inventário e ataques)

Pasta: `client/public/arte/itens/`. 128×128, traço branco, fundo transparente (como na referência).

- [ ] **Você:** ícone próprio de cada item, com o id do catálogo (ex.: `pistola.png`, `faca.png`, `katana.png`, `fuzil-de-caca.png`, `protecao-leve.png`, `kit-de-ladrao.png`, `cao-adestrado.png`). Quando existe, entra no lugar do ícone de linha
- [x] **Claude:** sem o arquivo, o jogo usa o ícone de linha mais parecido (arma de fogo, lâmina, proteção, kit, remédio, rádio, lanterna...)

## 4. Companheiro

- [ ] **Você:** `client/public/arte/companheiros/<nome>.png`, 300×360, retrato do animal (o cão do D. Tepes: `cao-de-guarda.png`). Um por companheiro
- [x] **Claude:** o painel só aparece quando o agente tem companheiro (sem ele, o painel tático ocupa o lugar); nome, tipo, PV, status, função e traços

## 5. Papéis e placas

Pasta: `client/public/arte/interface/`.

- [ ] **Você:** `papel-painel.png`, 600×440, papel envelhecido com borda rasgada; **48 px de borda sem detalhe único** (o jogo estica o meio para cada painel: Identificação, Atributos, Recursos, Derivados, Condições, Perícias, Equipamentos, Companheiro e Anotações)
- [ ] **Você:** `placa-escura.png`, 600×440, a placa escura de Poderes, Rituais e Inventário, com a mesma regra da borda
- [ ] **Você (opcional):** `pilha-papeis-2.png`, 600×520, a pilha de fichas do canto de baixo à esquerda (hoje: três papéis desenhados)
- [ ] **Claude:** encaixar papel e placa em cada painel (hoje: papel desenhado em código)

## 6. O que é código (Claude)

- [x] aba FICHAS no topo (barra nova: MAPA, COMBATE, FICHAS)
- [x] lista de agentes: retrato, nome, NEX, classe e barrinha de PV; o ativo com borda vermelha; selo de pendências; "Novo agente"
- [x] Identificação: nome, jogador, origem, classe, trilha, NEX com barra, pontos de prestígio e patente, idade, campanha, local
- [x] Atributos com − e + (na edição, com os pontos que faltam e as travas do livro: 0 a 3, só um em 0)
- [x] Recursos: PV, PE e SAN com − e + (Shift: 5), temporários (somem primeiro)
- [x] Derivados: Defesa, deslocamento, proteção, resistências com número
- [x] Painel tático (o vão do meio da referência): iniciativa, esquiva, bloqueio, contra-ataque, limite de PE, DT de rituais e proficiências
- [x] Condições: as que saem da ficha sozinhas e as do livro para marcar
- [x] Perícias: as 28, com grau, atributo e teste (dados e bônus)
- [x] Poderes por grupo (origem, classe, trilha, paranormais), com o resumo, o custo, o NEX e a página ao passar o mouse
- [x] Rituais por círculo, com o custo em PE e a DT de cada um
- [x] Evolução: linha do tempo de NEX com as pendências, abrindo a escolha com as opções travadas e o motivo
- [x] Equipamentos e ataques (teste, dano, crítico e as penalidades; o ataque desarmado sempre aparece)
- [x] Inventário com espaços, categorias e o limite da patente; modificações e maldições por item
- [x] Anotações, documentos e pistas; perfil (aparência, personalidade, histórico e objetivo)
- [x] Botões: editar, adicionar item, adicionar ritual, salvar (cancelar descarta a edição)
- [x] As fichas guardadas no banco, uma por agente
- [x] As fichas dos Marcados (Alosi, Cora, D. Tepes, Catarina), reproduzidas e conferidas com as regras (`docs/AUDITORIA-REGRAS.md`)
- [x] Link do jogador (`?ficha=CHAVE`): só a própria ficha, no celular; NEX e patente só o mestre muda
- [x] Celular: uma coluna na disposição da referência do celular, com os mesmos painéis do computador (atributos e perícias iguais aos do computador)
- [x] Captura lado a lado com a referência e os ajustes finos
- [ ] Modo "jogo" do jogador (acesso rápido na mesa: rolar perícia, ataque, ritual)
- [x] Criação passo a passo (`docs/CRIACAO-DE-PERSONAGEM.md`, `client/src/ui/criacao.ts`, 06/10): o + Novo Agente e o Editar do mestre abrem os passos (começo, atributos, origem, classe, perícias, evolução, mochila, toques finais, revisão), com a ficha de trás mudando junto; "Editar na ficha" fecha os passos e continua a edição direta

## 7. Celular (referência `docs/referencias/fichas-celular.webp`)

A referência do celular vale pela disposição (o conteúdo é o da ficha completa). Arte a mais só para o celular: nenhuma; ele usa a mesma do computador.
