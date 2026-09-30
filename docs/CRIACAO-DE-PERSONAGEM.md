# Criação de personagem e ficha

O que as telas de criação e a ficha precisam mostrar, tela por tela. Serve para as imagens de referência (ChatGPT/Codex) e para o código. As regras de cada passo estão em `docs/REGRAS.md`; o motor, em `shared/src/regras/`.

## Como funciona

- **Só o mestre cria e edita fichas**, na tela dele. A mesa não vê nada disso.
- **Tudo amarrado:** toda opção aparece. As que o personagem ainda não pode escolher ficam travadas, com o motivo ("Precisa de Força 2", "Só a partir de NEX 30%", "Precisa ser treinado em Luta").
- **De NEX 0% a 99%:** o personagem pode começar como pessoa comum (NEX 0%, regra opcional do livro) ou já como agente (NEX 5%). Depois sobe NEX por NEX até o NEX dele, escolhendo o que cada patamar dá.
- **Números ao vivo:** PV, PE, SAN, Defesa, carga e perícias mudam na hora a cada escolha.
- **Pendências e problemas:** o que falta escolher aparece como pendência em cada NEX. Escolha que quebra uma regra aparece em vermelho. Regra que só o mestre confere aparece como aviso.
- **Livros:** o conteúdo do *Sobrevivendo ao Horror* vem marcado e pode ser desligado na campanha.

## Telas

### 1. Começo

- Nome do personagem e do jogador.
- Começar como **agente (NEX 5%)** ou como **pessoa comum (NEX 0%)**.
- **Até que NEX montar** (ex.: 20%). Dá para subir depois.
- Regras em uso: *Sobrevivendo ao Horror* ligado ou não.

### 2. Atributos

- Os cinco atributos (Agilidade, Força, Intelecto, Presença, Vigor), todos começando em 1.
- **Pontos para distribuir:** 4 (agente) ou 3 (pessoa comum), com contador.
- Pode baixar **um** atributo para 0 e ganhar 1 ponto. Máximo 3 na criação.
- O que cada atributo muda, ao lado do número. Por exemplo:
  - Força: espaços de carga (5 por ponto; Força 0 dá 2) e dano corpo a corpo;
  - Intelecto: uma perícia treinada a mais por ponto;
  - Vigor: PV; Presença: PE e DT dos rituais; Agilidade: Defesa.
- Quantos d20 cada atributo rola (0 = rola dois e fica com o pior).

### 3. Origem

- Grade de cartas: 26 origens do livro e as do *Sobrevivendo ao Horror* (com selo).
- Cada carta: nome, as duas perícias treinadas, o poder da origem (nome e resumo) e a página.
- Busca por nome e por perícia.
- Amnésico: as duas perícias são escolhidas pelo mestre (a carta avisa).

### 4. Classe

- Três cartas: Combatente, Especialista e Ocultista.
- Cada carta: PV, PE e SAN iniciais e por NEX; perícias da classe; proficiências; habilidades de NEX 5%; nomes das cinco trilhas.
- Pessoa comum (NEX 0%) não escolhe classe ainda: escolhe ao chegar em NEX 5%.

### 5. Perícias

- As 28 perícias numa lista, com o atributo, "só treinada" e "sofre carga".
- **Marcadas pela origem:** travadas, com o selo "origem".
- **Da classe:**
  - combatente escolhe Luta ou Pontaria e Fortitude ou Reflexos;
  - ocultista já vem com Ocultismo e Vontade.
- **Livres:** contador com as da classe mais uma por ponto de Intelecto.
- Se a classe repetir uma perícia que a origem já deu, a tela pede outra no lugar.

### 6. Habilidades de NEX 5%

- Especialista: escolher as duas perícias do **Perito** (treinadas, fora Luta e Pontaria).
- Ocultista: escolher os **três rituais de 1º círculo**. Seletor de rituais por elemento, com os de círculos maiores travados.
- Poder de origem que pede escolha (ex.: Cultista Arrependido escolhe um poder paranormal).

### 7. Subir de NEX (linha do tempo)

Uma linha do tempo de 10% até o NEX do personagem, com um cartão para cada ganho. Cartão com pendência fica marcado.

| NEX | Ganho |
|---|---|
| 10% | **Trilha**: escolher uma das cinco da classe (algumas têm requisito, como Médico de Campo, que pede Medicina treinada) e ganhar a 1ª habilidade |
| 15, 30, 45, 60, 75, 90% | **Poder de classe** |
| 20, 50, 80, 95% | **Aumento de atributo** (+1, até 5). Se for Intelecto, uma perícia treinada a mais |
| 25, 55, 85% | Habilidades da classe crescem (Ataque Especial, Perito, círculo de ritual) |
| 35, 70% | **Grau de treinamento**: perícias treinadas sobem um grau (treinado → veterano; veterano → expert a partir de 70%) |
| 40, 65, 99% | Nova habilidade da trilha |
| 50% | **Versatilidade** (um poder de classe ou o 1º poder de outra trilha) e **afinidade** (escolher Sangue, Morte, Conhecimento ou Energia) |
| todo NEX (ocultista) | **Um ritual novo** de círculo que já possa lançar |

Seletores que abrem de um cartão:
- **Poder de classe:**
  - uma grade com todos os poderes da classe, cada um com um estado: liberado, travado com o motivo, ou já escolhido;
  - filtro "só os liberados";
  - Transcender abre o seletor de poderes paranormais: por elemento, com o requisito "N outros poderes do elemento", e a versão com afinidade quando já tem o poder.
- **Ritual:** por círculo e elemento; os de círculo acima do liberado ficam travados.
- **Grau de treinamento:** as perícias treinadas, escolhendo quantas a classe dá (1, 5 ou 3 + Intelecto).
- **Aumento de atributo:** os cinco atributos com "atual → novo".

### 8. Mochila (equipamento)

- **Patente** pelos pontos de prestígio e os **limites por categoria** (I a IV), com contador de cada.
  - Pessoa comum não tem patente: um item de categoria I e quantos de categoria 0 quiser.
- **Carga:** espaços usados e o limite. Passou do limite: "sobrecarregado" (−5 na Defesa, −3 m). Passou do dobro: não pode.
- **Catálogo:**
  - armas simples, táticas e pesadas;
  - proteções;
  - equipamento geral: acessórios, kits, explosivos, itens operacionais, itens paranormais e munição;
  - itens amaldiçoados, só a partir de 50 PP.
- Cada item mostra categoria, espaços e o que faz. Arma sem proficiência avisa: −2d20 no ataque.
- **Modificações:** cada uma sobe a categoria do item em I.
- **Arma favorita** (trilha Aniquilador): categoria reduzida.

### 9. Toques finais

Aparência, personalidade, histórico e objetivo (textos livres).

### 10. A ficha pronta

Tudo o que a ficha do livro tem (p. 319):
- **Identidade:** nome, jogador, origem, classe, trilha, NEX.
- **Números:**
  - PE por rodada e deslocamento;
  - PV, PE e SAN (atual e máximo);
  - Defesa, proteção e resistências;
  - esquiva, bloqueio e contra-ataque (quando treinado).
- **Ataques:** teste (quantos d20 e bônus), dano, crítico, alcance e tipo.
- **Perícias:** dados, bônus e grau.
- **Habilidades e rituais:** custo em PE, página e a DT de rituais.
- **Mochila:** item, categoria e espaços; PP, patente, limite de itens, crédito e carga máxima.
- **Pendências e problemas:** o que falta e o que está errado, NEX por NEX.

## Estados que as imagens precisam mostrar

- **Opção:**
  - liberada;
  - escolhida;
  - travada (com o motivo);
  - já escolhida;
  - repetível (×2);
  - do *Sobrevivendo ao Horror* (selo).
- **Cartão de NEX:** completo, com pendência, com problema.
- **Aviso** (o mestre confere) e **problema** (regra quebrada).
- **Contadores:** pontos de atributo, perícias livres, itens por categoria, espaços de carga.
- **Número que muda ao escolher:** PV, PE, SAN, Defesa, carga.

## No código

- `shared/src/regras/`:
  - `tipos.ts`: formato dos catálogos, requisitos e efeitos;
  - `dados/`: classes, origens, trilhas, poderes, rituais, itens;
  - `ficha.ts`: a ficha guarda só as escolhas;
  - `nex.ts`: o que cada NEX dá;
  - `estado.ts`: aplica as escolhas NEX a NEX e confere cada uma;
  - `requisitos.ts`: o que libera cada opção e o motivo quando não libera;
  - `calcular.ts`: os números da ficha;
  - `opcoes.ts`: o que dá para escolher em cada lugar.
- Para a tela:
  - `novaFicha()` cria a ficha vazia;
  - `calcular(ficha)` devolve os números, as pendências e os problemas;
  - `opcoesPoder(ficha, nex)`, `opcoesRitual(...)`, `opcoesTrilha(...)` e as outras devolvem cada opção com `ok` e os `motivos`.
