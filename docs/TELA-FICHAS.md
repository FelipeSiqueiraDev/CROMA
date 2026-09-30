# Tela FICHAS: o que tem, o que falta e o que melhorar

> **Feito em 29/09:** a aba FICHAS com os ajustes abaixo (a lista do que é arte está em [`CHECKLIST-TELA-FICHAS.md`](CHECKLIST-TELA-FICHAS.md)). O vão do meio da referência virou o painel tático (COMBATE: iniciativa, reações, limite de PE, DT, proficiências; EVOLUÇÃO: a linha do tempo de NEX com as pendências). No celular, a referência `docs/referencias/fichas-celular.webp` vale pela disposição: agentes numa fila, personagem e identificação lado a lado, recursos e atributos lado a lado, condições, perícias (a tabela do computador), poderes e rituais, equipamentos, inventário, painel tático, companheiro e anotações; Cancelar, Editar e Salvar presos embaixo. A conferência das regras está em [`AUDITORIA-REGRAS.md`](AUDITORIA-REGRAS.md).

Análise da referência `docs/referencias/fichas.webp` contra a ficha do livro (p. 319) e o motor de regras (`shared/src/regras/`).

## O que já está certo

- Lista de agentes com retrato e o botão de novo agente.
- Identificação: nome, origem, classe, trilha, NEX, patente, campanha, idade, local.
- Os cinco atributos, os recursos (PV, PE, SAN) e os derivados (Defesa, deslocamento, proteção, resistências).
- Condições.
- Perícias com treino, atributo e total.
- Poderes separados por origem, classe e trilha.
- Rituais pelos quatro círculos.
- Equipamentos, inventário, anotações e o companheiro.
- Botões de editar, adicionar item, adicionar ritual e salvar.

## O que falta para a ficha ficar completa

1. **Jogador:** o nome de quem joga (a ficha do livro tem).
2. **Limite de PE por turno** (PE/rodada): NEX ÷ 5. É um dos números mais usados.
3. **Pontos de prestígio:** a patente sai deles. Junto, o **limite de itens por categoria** (I, II, III, IV) e o **crédito**.
4. **Carga em espaços**, não em kg: limite de 5 × Força; passou dele, "sobrecarregado" (−5 na Defesa e −3 m).
5. **Perícias:**
   - as 28 do livro, não 11;
   - o **grau**: destreinado, treinado, veterano ou expert (não "Sim/Não");
   - os **dados** e o **bônus** (ex.: "4d20 +5");
   - marcar as de "só treinada" e as que sofrem carga;
   - a especialidade da Profissão.
6. **Reações:** Esquiva, Bloqueio e Contra-ataque, com os números.
7. **Resistências com número:** ex.: "Balístico 2", "Mental 5".
8. **DT dos rituais** (10 + limite de PE + Presença) e das habilidades.
9. **Ataques completos:**
   - teste (ex.: "3d20 +5"), dano, crítico (ex.: "19/x3"), alcance e tipo de dano;
   - aviso de "−2d20" quando o personagem não tem proficiência com a arma.
10. **Proficiências:** armas simples, táticas e pesadas; proteções leves e pesadas.
11. **Afinidade e poderes paranormais:** o elemento de afinidade (NEX 50%) e um grupo "Paranormais" em Poderes (os que vêm de Transcender).
12. **PV, PE e SAN temporários** e as perdas permanentes de SAN e PE.
13. **Toques finais:** aparência, personalidade, histórico e objetivo (podem ser abas no painel de anotações).
14. **Evolução:**
    - o que foi escolhido em cada NEX, o que ainda falta escolher e o que quebra regra;
    - sem isso não dá para montar a ficha de 0% a 99% com tudo amarrado.

## Ajustes no desenho

| Na imagem | Pelo livro |
|---|---|
| Origem "Operacional"; poderes "Treinamento Tático", "Passo Sombrio"... | Nomes inventados: vêm do catálogo (Militar, Policial...; Infiltrador tem Ataque Furtivo, Gatuno, Assassinar, Sombra Fugaz) |
| Patente "Agente de Campo" | Recruta, Operador, Agente especial, Oficial de operações, Agente de elite |
| Perícia "Prestidigitação" | Não existe: é Crime |
| Sobrevivência de Vigor | É de Intelecto |
| Coluna "Total" com um número só | Em Ordem Paranormal se rola um d20 por ponto de atributo e soma o bônus: mostrar dados e bônus |
| Condição "Amedrontado" | Abalado ou Apavorado |
| Chip "Normal" | Sem condição já é normal. Machucado, morrendo, perturbado e enlouquecendo aparecem sozinhos pela ficha |
| Inventário "12.4 / 20 kg" | Espaços (ex.: "8 / 10 espaços") |
| Recursos só com + | − e + nas três barras (decidido) |
| Rituais: 3 casas fixas por círculo | O ocultista aprende 3 no início e 1 a cada NEX, de qualquer círculo liberado; quem usa Aprender Ritual tem limite no Intelecto. Melhor: lista por círculo com "conhecidos / limite" |
| Equipamentos e inventário com os mesmos itens | Um inventário só (com categoria, espaços e se está empunhado ou vestido); os ataques saem das armas empunhadas |
| PV 20 / 20, PE 5 / 5 num especialista de NEX 20% | O motor calcula (com Vigor 3 dá 37 PV) |

## Sugestões

1. **Três modos na mesma tela:**
   - **Jogo:** só mudam PV, PE, SAN, condições e anotações.
   - **Editar:** o mestre corrige qualquer coisa.
   - **Criar/Evoluir:** passo a passo, com as opções travadas e o motivo.
2. **Novo agente e subir de NEX:**
   - "Novo agente" abre a criação passo a passo (`docs/CRIACAO-DE-PERSONAGEM.md`);
   - na ficha, "Subir NEX" abre só o que o próximo NEX pede.
3. **Pendências à vista:** selo "2 pendências" no topo da ficha e no agente da lista.
4. **Lista de agentes mais informativa:** NEX, classe e uma barrinha de PV debaixo do nome.
5. **O painel vazio do meio** (à direita do personagem): a linha do tempo de NEX (Evolução).
6. **Personagem grande:** as setas giram o personagem (as direções da folha) e um botão troca armado/desarmado.
7. **Detalhe ao passar o mouse:** em cada poder, ritual e item, o custo em PE, o NEX em que veio, o efeito em números e a página do livro.
8. **Companheiro:** aparece só quando o personagem tem um (poder, origem ou item que dá companheiro).
9. **Salvar sozinho:** o banco guarda a cada mudança; na criação, o botão vira "Concluir".
10. **Iniciativa em destaque nos derivados:** é a primeira coisa pedida no combate.
