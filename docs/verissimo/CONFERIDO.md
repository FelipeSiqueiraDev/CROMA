# Fatos já conferidos no livro

Regras que o Veríssimo já leu no livro e que servem de novo, para não reabrir a página. Uma linha por fato, com a página impressa. Só resumos com palavras nossas e números (o repositório é público).

Já conferido antes, e que vale como fonte:
- `docs/REGRAS.md`: a referência geral (testes, ficha, mochila, combate, condições, rituais, interlúdio, ameaças);
- `docs/COMBATE.md`: a mecânica do combate, conferida com o livro de regras e o *Sobrevivendo ao Horror* em 30/09/2026;
- `docs/AUDITORIA-REGRAS.md`: a conferência dos catálogos e das fichas dos Marcados em 29/09/2026.

Os achados que contradizem esses documentos estão em `docs/verissimo/ABERTOS.md` (a conferência completa de 01/10/2026 abriu V-1 a V-113; V-1 a V-23 foram corrigidos no mesmo dia, e a conferência das correções abriu V-114 a V-121). Enquanto um achado estiver aberto, vale o que está aqui.

## Livros

- Página do PDF = impressa + 2 no livro de regras e + 1 no *Sobrevivendo ao Horror* (o `livro.py` já faz a conta).
- No texto do PDF, a LR p. 38 sai vazia, e nas p. 67 e 116 as colunas saem trocadas (lendo a página inteira, dá para seguir). O selo de elemento das fichas de ameaça é desenho: só a imagem da página mostra.
- Identidade do Produto (LR p. 318): os capítulos 5, 7 e 8, os termos do cenário, os nomes e as descrições, as ilustrações e as regras de rituais, poderes paranormais, Sanidade e dano mental. O resto das regras é conteúdo aberto. Por isso rituais, poderes paranormais, criaturas e o SaH entram aqui só com nome, números e página.

## Classes e NEX

- Classes: combatente p. 24–27 (Tab. 1.3 na p. 25), especialista p. 28–31 (Tab. 1.4 na p. 29), ocultista p. 32–35 (Tab. 1.5 na p. 33).
- Ataque Especial (combatente): 2 PE dão +5 no ataque ou no dano; cada passo da Tab. 1.3 soma 1 PE e mais +5, e cada +5 vai para o ataque ou para o dano. NEX 5%: 2 PE, +5; 25%: 3 PE, +10; 55%: 4 PE, +15; 85%: 5 PE, +20 (LR p. 24; tabela na p. 25).
- PV, PE e SAN por classe (a cada NEX depois do primeiro, soma o ganho): combatente PV 20 + Vig (+4 + Vig), PE 2 + Pre (+2 + Pre), SAN 12 (+3), LR p. 25; especialista PV 16 + Vig (+3 + Vig), PE 3 + Pre (+3 + Pre), SAN 16 (+4), LR p. 29; ocultista PV 12 + Vig (+2 + Vig), PE 4 + Pre (+4 + Pre), SAN 20 (+5), LR p. 33.
- Perícias e proficiências: combatente treina Luta ou Pontaria, Fortitude ou Reflexos e mais 1 + Int, com armas simples e táticas e proteções leves (LR p. 25); especialista treina 7 + Int, com armas simples e proteções leves (p. 29); ocultista treina Ocultismo e Vontade e mais 3 + Int, com armas simples (p. 33). Perícia da classe que a origem já deu: escolhe outra (p. 22).
- Grau de treinamento (35 e 70%): 1 + Int perícias no combatente, 5 + Int no especialista e 3 + Int no ocultista (LR p. 26, 30 e 34). Engenhosidade: +2 PE no Eclético para veterano em 40%, +4 PE para expert em 75% (p. 30).
- Ocultista: começa com 3 rituais de 1º círculo e aprende 1 a cada NEX novo, de um círculo que já lance; esses ficam fora do limite. Lança o 2º círculo em 25%, o 3º em 55% e o 4º em 85% (LR p. 32–33).
- Poderes: só se repete um poder quando o texto deixa; dá para pegar o poder no mesmo NEX em que cumpre o requisito (LR p. 22).
- No NEX em que usa Transcender, não ganha SAN daquele NEX (LR p. 88). Em regras, "transcender" é receber qualquer poder paranormal: o poder de classe Transcender ou a Versatilidade (LR p. 110).
- O que cada NEX dá: 5% habilidades iniciais; 10% trilha; 15, 30, 45, 60, 75 e 90% poder de classe; 20, 50, 80 e 95% aumento de atributo; 25, 55 e 85% as habilidades fixas sobem; 35 e 70% grau de treinamento; 40, 65 e 99% habilidades da trilha; 50% versatilidade e afinidade (tabela da LR p. 23; lista em `docs/REGRAS.md`, seção 2).
- Limite de PE por turno: Tab. 1.2 (LR p. 23): 1 em NEX 5%, +1 a cada NEX, 20 em 99%.
- O livro não diz se o aumento de Vigor ou Presença vale para os NEX anteriores (LR p. 15 e 23).
- NEX 0% (LR p. 171–172): 3 pontos de atributo; o mundano tem PV 8 + Vig, PE 1 + Pre, SAN 8, 1 + Int perícias e armas simples; Empenho é 1 PE por +2. Não há patente: leva 1 item de categoria I e os de categoria 0 que quiser, coerentes com a origem (p. 171). Ao chegar a 5%, ganha 1 ponto de atributo (máximo 3) e a diferença da classe: combatente +12 PV, +1 PE e +4 SAN; especialista +8, +2, +8 e 6 perícias; ocultista +4, +3, +12, Ocultismo, Vontade e mais 2 perícias.
- Origens: Tab. 1.1 na LR p. 19 (2d20, de 2 a 40), textos nas p. 16–21; no SaH, a Tab. 1.1 está na p. 12 e os textos nas p. 7–13. Patrulha dá +2 na Defesa; Para Bellum, +2 de dano com armas de fogo (a Tab. 1.1 da p. 19 ainda diz "+1 de dano à distância"); Acalentar, +5 em Religião para acalmar e 1d6 + Pre de SAN (LR p. 20); 110%: 2 PE dão +5 em perícia de For ou Agi, fora Luta e Pontaria (p. 17); O Crime Compensa deixa um item achado entrar na missão seguinte sem contar (p. 18).
- SaH: "a cada 5% de NEX" equivale a cada nível, e "a cada 10%" a cada 2 níveis (Vitalidade Reforçada e Vontade Inabalável, p. 36); NEX 99% conta 20 e 10.

## Valores derivados

- Defesa = 10 + Agilidade + habilidades, equipamento e condições (LR p. 36).
- Deslocamento padrão 9 m, 6 quadrados (LR p. 36).
- DT de habilidade ou item = 10 + limite de PE + o atributo indicado (LR p. 78). DT de ritual = 10 + limite de PE + Presença (LR p. 121). O exemplo da LR p. 78 (Vigor 3 em NEX 55%, DT 18) não bate com a fórmula da mesma página, que dá 24; os exemplos da p. 121 (14 e 35) batem.
- Esquiva (Reflexos treinada): soma o bônus de Reflexos na Defesa. Bloqueio (Fortitude treinada): RD igual ao bônus de Fortitude, só contra corpo a corpo. Contra-ataque: Luta treinada (LR p. 88). O livro escreve "modificador de Reflexos" na esquiva e "bônus de Fortitude" no bloqueio; nenhum dos dois é teste (p. 88).
- Não existem PV nem SAN negativos (LR p. 88).
- PE: sempre dá para usar uma habilidade no custo mínimo uma vez por turno, mesmo acima do limite (LR p. 23). O PE é gasto mesmo na falha; reduções de custo não acumulam, e o custo final nunca fica abaixo de 1 PE; custo variável vai, no máximo, até o limite por uso (LR p. 78). O Ritual Predileto acumula com outras reduções, por texto (LR p. 34).
- Intelecto: cada ponto a mais dá uma perícia treinada (LR p. 15), fora os aumentos temporários (p. 39). Sagacidade não dá perícia, e Carisma não dá PE (p. 147).

## Perícias

- Teste: um d20 por ponto do atributo-base, fica o maior, soma o bônus: destreinado 0, treinado +5, veterano +10, expert +15 (LR p. 40). Atributo 0: 2d20, fica o menor (LR p. 14, 39, 75).
- Dados extras de habilidade somam aos d20 do atributo. Penalidade que deixaria menos de 1 dado: rola atributo + dados ganhos + dados perdidos e fica o pior (LR p. 11).
- Circunstância favorável ou ruim: ±1d20; o livro não traz ±2d20 para circunstância extrema (LR p. 76).
- 20 natural no dado que ficou passa sempre (LR p. 76).
- DTs da Tab. 4.1, de 5 a 35 (LR p. 75). Teste oposto: o maior vence, e o empate rola de novo (p. 75). Ajuda: contra DT 10, +1, e mais +1 a cada 10 acima (p. 76). Teste estendido: 3, 5 ou 7 sucessos antes de 3 falhas (p. 77).
- Tab. 2.1 na LR p. 41; descrições nas p. 41–49. Intuição é de Presença (título da p. 45 e ficha da p. 319).
- Penalidade de carga: Acrobacia, Crime e Furtividade; Atletismo só na natação (LR p. 41–43). A penalidade "total" (p. 40) junta a sobrecarga (−5, p. 53) e a proteção pesada (−5, p. 62).
- Sem kit: −5 (LR p. 40). Pedem kit: arrombar e sabotar, de Crime (p. 44); disfarce, de Enganação (p. 44); Medicina toda (p. 46; em si mesmo, mais −5); operar dispositivo, de Tecnologia (p. 49).
- Teste de ataque é um tipo de teste de perícia: bônus em "testes de perícia" valem no ataque (LR p. 82).
- Testes de resistência: todo teste de Fortitude, Reflexos ou Vontade tem esse nome (LR p. 77). Fortitude também mede o fôlego (p. 45); Vontade também serve para conjurar em condição adversa (p. 49).
- Primeiros socorros: Medicina DT 20, +5 a cada estabilização na mesma cena, ação padrão, em alguém adjacente; deixa com 1 PV (LR p. 46).
- Acalmar: Diplomacia treinada DT 20, +5 a cada vez na cena, ação padrão, em alguém adjacente; deixa com SAN 1 (LR p. 44). Religião também serve (p. 48).
- Fintar: Enganação treinada, ação padrão, contra Reflexos, em alcance curto (LR p. 44). Assustar: Intimidação treinada, ação padrão, contra Vontade, em alcance curto; o abalado não acumula; vencendo por 10 ou mais, apavorado por 1 rodada (p. 45).

## Poderes e trilhas

- Poderes de combatente que mudam números: Combate Defensivo pede Int 2 e dá −1d20 nos ataques e +5 na Defesa até o próximo turno (LR p. 25); Tiro Certeiro pede Pontaria treinada e soma Agi no dano com arma de disparo (p. 26). Ninja Urbano dá proficiência e +2 de dano só com armas táticas corpo a corpo (p. 29). Ritual Potente pede Int 2 e soma Int no dano ou na cura dos rituais (p. 34).
- Trilhas: A Favorita tira I da categoria da arma escolhida (LR p. 26). Ataque Furtivo: 1 PE dá +1d6; 2d6 em 40%, 3d6 em 65% e 4d6 em 99% (p. 30).
- Graduado: Saber Ampliado e Grimório Ritualístico dão um ritual a mais a cada círculo liberado, e ele tem de ser do círculo novo (o primeiro, de 1º círculo), fora do limite; Presença Poderosa soma a Presença no limite de PE só para conjurar (LR p. 35).
- Mestre em Elemento tira 1 PE do custo de lançar rituais do elemento; Ritual Predileto tira 1 PE de um ritual e é a exceção que acumula com outras reduções (LR p. 34).
- NEX 99% das trilhas de ocultista: Conduíte, Canalizar o Medo; Flagelador, Medo Tangível; Graduado, Conhecendo o Medo; Intuitivo, Presença do Medo; Lâmina Paranormal, Lâmina do Medo (LR p. 34–35).
- SaH: poderes de classe nas p. 14–15 (combatente), 22–23 (especialista) e 26–27 (ocultista); trilhas nas p. 15–29; a classe Sobrevivente começa na p. 30; poderes gerais nas p. 33–36, com a Tab. 2.3 dos requisitos na p. 34.
- SaH: o poder geral conta como poder de todas as classes e pode ser pego no lugar de um poder de classe; Artista Marcial, Combater com Duas Armas, Saque Rápido e Tiro Certeiro também são gerais (p. 33).
- Monstruoso (SaH p. 17): Ser Amaldiçoado treina Ocultismo (+2 se já for treinado), num elemento entre Sangue, Morte, Conhecimento e Energia; a afinidade, se vier, tem de ser esse elemento. A Progressão de NEX (SaH p. 99) começa em 25%: +2 em Ocultismo para quem é treinado e −5 numa entre Diplomacia, Enganação e Intimidação. Monstruosa Transformação: em NEX 75%, perturbado para sempre e banido da Ordem; em 99%, SAN reduzida a 1 (SaH p. 21).
- Poderes paranormais: cada um só uma vez, salvo texto contrário; "Elemento N" pede N outros poderes do elemento (LR p. 110 e 114).
- Afinidade: a escolha de NEX 50% não tem efeito imediato; vira afinidade no próximo poder paranormal recebido. A afinidade dispensa os componentes dos rituais do elemento, dá +2d20 contra efeitos do próprio elemento e −2d20 contra os do elemento que vence o seu, e deixa escolher de novo um poder do elemento pela linha "Afinidade" (LR p. 110 e 114).
- Aprender Ritual: ensina um ritual de 1º círculo; até o 2º a partir de NEX 45% e até o 3º a partir de 75%. É repetível, pode trocar um ritual conhecido e conta como poder do elemento do ritual (LR p. 114). O limite é o Intelecto, e os rituais da classe não contam (p. 119).
- Requisitos dos paranormais do LR (p. 114–116): Elemento 1 para Expansão de Conhecimento, Precognição, Campo Protetor, Golpe de Sorte, Manipular Entropia, Escapar da Morte, Anatomia Insana e Sangue Vivo; Elemento 2 para Surto Temporal e Sangue Fervente; os outros, nenhum.
- Números dos paranormais do LR (p. 114–116): Resistir 10 (20 com afinidade); Precognição +2 na Defesa e nos testes de resistência; Sensitivo +5 em Diplomacia, Intimidação e Intuição; Visão do Oculto +5 em Percepção; Campo Protetor +5 na Defesa ao esquivar (afinidade: +5 em Reflexos); Golpe de Sorte +1 na margem (afinidade: +1 no multiplicador); Encarar a Morte +1 no limite de PE em cena de ação (+3 com afinidade); Potencial Aprimorado +1 PE por NEX (+2 com afinidade); Sangue de Ferro +2 PV por NEX (afinidade: +5 em Fortitude); Sangue Fervente +1 em Agi ou For machucado (+2 com afinidade). Custos: Manipular Entropia 2 PE, Surto Temporal 3, Arma de Sangue 2, mais 1 por ataque extra.
- SaH, Tab. 1.6 (p. 47), 8 poderes: só Apatia Herege (Conhecimento 1) e Conexão Empática (Energia 1) têm requisito. Custos: Absorver Conhecimento 1 PE, Apatia Herege 2, Conexão Empática 2, Aura de Pavor 2 (SaH p. 46–47).

## Rituais

- Tab. 5.2 (LR p. 119): custo 1, 3, 6 e 10 PE pelo círculo. Alcance curto 9 m, médio 18 m, longo 36 m, extremo 90 m (p. 119).
- Conjurar pede uma mão livre para gesticular e componentes do elemento, menos o Medo (LR p. 119).
- Concentração (Vontade, LR p. 119): ferido durante a execução, DT igual ao dano (em ritual de execução padrão ou menor, só com dano de reação ou contínuo); condição ruim (veículo em movimento, caído, tempestade), DT 15 + custo; terrível (alta velocidade, agarrado, terremoto), DT 20 + custo; falhou, o ritual não sai e os PE se perdem. Surdo conta como condição ruim (p. 311).
- Só um ritual de execução livre por rodada, contando os acelerados; execução mais longa que completa deixa desprevenido (LR p. 119).
- Duração (LR p. 120–121): sustentado custa 1 PE como ação livre no começo do turno, um por vez; a morte do conjurador só encerra o sustentado; encerrar é ação livre, dentro do alcance; redirecionar é ação padrão.
- Resistência e forma (LR p. 121): DT 10 + limite de PE + Presença; reduzir à metade vem antes da RD. Uma forma avançada por conjuração, com o custo total até o limite de PE; a forma pode pedir círculo mínimo ou afinidade com o elemento do ritual. Não existe afinidade com Medo.
- Custo do Paranormal (LR p. 121): Ocultismo DT 15 + custo; falhou, dano mental igual ao custo; falhou por 5 ou mais, também −1 SAN para sempre. Ritual de Medo: ao conjurar, dano mental igual ao custo e −1 SAN para sempre (discente −2, verdadeira −3); aprender não custa nada.
- Elementos (LR p. 118): Sangue vence Conhecimento, Conhecimento vence Energia, Energia vence Morte e Morte vence Sangue; o Medo é neutro. Contra o elemento que vence o seu: −2d20 na resistência e vulnerável ao dano do ritual; contra o mesmo elemento: +2d20.
- A lista por círculo (LR p. 122–123) tem 26 rituais de 1º, 21 de 2º, 17 de 3º e 17 de 4º (81). Forma Monstruosa está no 3º na lista e no 2º no cabeçalho (p. 133). "Ligação Telepática" da lista é um efeito do Invadir Mente (p. 134). Na Proteção contra Rituais, a lista diz +2 e a descrição diz +5 (p. 139). Arma Atroz discente: +2 PE na descrição (p. 125), +3 no exemplo (p. 121).
- Só a Lâmina do Medo pede poder de trilha para ser aprendida (LR p. 135); os outros rituais de Medo de 4º círculo não têm essa trava (p. 125, 127, 135, 139).
- Dano dos rituais de Medo: Lâmina do Medo, 10d8 de Medo, que ignora as resistências (LR p. 135); Presença do Medo, 5d8 mental e 5d8 de Medo (p. 139); Conhecendo o Medo, 10d6 mental (p. 127).
- SaH: 16 rituais, quatro por elemento: Sangue p. 48–50, Morte p. 50–52, Conhecimento p. 53–54, Energia p. 55–56. Nenhum é de Medo (sumário na SaH p. 3).

## Itens

- Carga: 5 espaços por ponto de Força (Força 0: 2); passar do limite deixa sobrecarregado: Defesa −5, −5 nas perícias com penalidade de carga, deslocamento −3 m; nunca mais que o dobro do limite (LR p. 53).
- Limite de itens (LR p. 53): a categoria é a dos itens que a Ordem fornece; a patente diz quantos de cada categoria se escolhem por missão; categoria 0 é à vontade, limitada só pela carga. Com habilidades que reduzem a categoria, um item acima de IV pode cair para IV ou menos. Tab. 3.1 na p. 52 e Tab. 3.2 na p. 53; a patente nova vale a partir da missão seguinte (p. 51).
- Limites de uso (LR p. 53): um item por mão, no máximo dois empunhados. Guardar é ação de movimento, e largar é livre. O que não se empunha precisa estar vestido para ser usado. Vestir é ação padrão, e tirar é de movimento. Não há limite de itens vestidos além da carga. (A LR p. 145 manda ver esses limites na "página 51", mas eles estão na p. 53.)
- Arma de duas mãos (LR p. 54): apoiar no chão para soltar uma mão é ação livre; reempunhar é de movimento. Recarregar arma de disparo pede as duas mãos. Sacar arma de arremesso é ação de movimento.
- Dano por tipo de arma (LR p. 54): arremesso soma a Força; disparo e fogo não somam atributo, fora o arco composto (LR p. 58) e o estilingue (SaH p. 37). Armas de fogo contam como armas de disparo para efeitos.
- O espaço da arma inclui coldre e bainha, mas não a munição. Arma sem alcance pode ser arremessada em alcance curto com −5 (LR p. 55).
- Armas ágeis usam Agilidade no lugar de Força no ataque e no dano (LR p. 59). Certeira e alongada +2 no ataque; cruel +2 no dano; perigosa e mira laser +2 na margem de ameaça (LR p. 60–61).
- Sem proficiência: −2d20 no ataque (LR p. 54). Arma improvisada: 1d6, uma mão, −1d20 no ataque; desarmado: 1d3 não letal, arma corpo a corpo leve, e efeitos que falam de armas ou objetos não valem nele (LR p. 57).
- Armas (LR p. 56–59): bastão e espada com as duas mãos dão 1d8 e 1d10; katana com uma mão só para veterano em Luta (p. 58). Moto-serra: −2 no ataque, mais um dado a cada 6, e ligar é ação de movimento; metralhadora: −5 sem Força 4, a menos que apoiada no tripé (ação de movimento); arma automática: rajada com −1d20 e +1 dado (p. 59). Fuzil de caça: simples, duas mãos, cat. I, 2d8, 19/x3, alcance médio, 2 espaços; katana: tática, duas mãos, cat. I, 1d10, 19, 2 espaços, ágil; corrente: tática, uma mão, cat. 0, 1d8, x2, +2 para desarmar e derrubar (p. 56–58).
- Modificações (LR p. 60, 62, 64): cada uma sobe a categoria em I, e modificações iguais não se acumulam; o Aprimorado pode entrar duas vezes se o acessório tiver Função adicional (p. 64). Blindada e Antibombas só em proteção pesada; Discreta (proteção) só em leve e não junto com Reforçada; Compensador só em arma automática; Dum dum e Explosiva só em balas curtas e longas (p. 60 e 62). Calibre grosso pede munição própria, da mesma categoria da normal (p. 60).
- Proteções: leve +5 na Defesa; pesada +10, RD 2 contra balístico, corte, impacto e perfuração, −5 nas perícias de carga; escudo +2, numa mão, cat. 0, 2 espaços, conta como pesada para proficiência; reforçada +2 na Defesa e +1 espaço. Sem proficiência: −2d20 nos testes de Força e Agilidade (LR p. 62).
- Equipamentos (LR p. 63–67): bônus de itens na mesma perícia não se somam, vale só um; o utensílio só vale empunhado; só duas vestimentas dão bônus ao mesmo tempo, e vestir ou despir uma vestimenta é ação completa (p. 63). Granada e algemas precisam estar na mão; a granada se lança num ponto em alcance médio e pega um raio de 6 m (p. 64). Bandoleira e mochila militar são cat. I (Tab. 3.8, p. 63); com a bandoleira, sacar ou guardar é livre 1×/rodada (p. 65); a mochila militar não ocupa espaço e dá +2 de carga (p. 66). A soqueira fica entre os dedos, dá +1 no desarmado, e as modificações de corpo a corpo dela valem no desarmado (p. 66). Componentes ritualísticos: cat. 0, 1 espaço (Tab. 3.10, p. 66–67).
- Profissão (LR p. 48): treinado, veterano ou expert começa cada missão com 1 item a mais, além dos da Ordem, de categoria I, II ou III.
- Ações com item (LR p. 84, 86–87): pegar da mochila, sacar e guardar são ação de movimento (alguns efeitos deixam livre). Largar é livre; jogar para alguém pegar é ação de movimento; jogar para acertar é ação padrão.
- Itens amaldiçoados (LR p. 144): só para agente especial ou acima; os que vêm da Ordem têm os poderes conhecidos, e os achados em missão podem não ter; a maldição funciona como modificação (a primeira sobe a categoria em II, as seguintes em I); modificação e maldição do mesmo item somam; arma e proteção funcionam ao serem empunhadas ou vestidas, e o item especial precisa ser ativado; a DT de item é a de habilidade, com Presença.
- Preço da maldição (LR p. 145): 2 de Sanidade por maldição do elemento nos seus itens, a cada falha num teste do atributo dele (Morte: Presença). Vale mesmo longe do item e só acaba com tempo afastado, entre missões. O item amaldiçoado ocupa o espaço do item comum e segue os mesmos limites de uso.
- Bônus de itens amaldiçoados não se acumulam: Carisma em dois itens dá +1, não +2 (LR p. 145). O item especial, sem outra indicação, é de categoria II, ocupa 1 espaço e conta como uma maldição (p. 148). O Crânio Espiral se empunha (p. 149).
- SaH, Tab. 1.5 (p. 40), categoria e espaços: amuleto sagrado 0/1, celular 0/1, alarme de movimento 0/1, isqueiro 0/0,5, coagulante I/0,5, cão adestrado I/sem espaço. O amuleto sagrado é vestido e dá +2 em Religião e Vontade; o celular se empunha e dá +2 para obter informações com internet (p. 39). Cão adestrado: o dono precisa ser treinado em Adestramento; dá +2 em Investigação e Percepção; 1 PE dá +2 na Defesa por 1 rodada (p. 42).
- SaH p. 37: pistola pesada com −1d20, que some com as duas mãos. O revólver compacto não ocupa espaço para quem é treinado em Crime.
- SaH p. 43: opção "Limites de itens vestidos", com no máximo 4 itens vestidos que dão benefício; vestir ou despir passa a ser ação de movimento.
- SaH p. 44: os trajes de mergulho e espacial ocupam o espaço de uma vestimenta, e o medidor de condição vertebral conta como uma. O catalisador precisa estar na mão, é gasto ao usar e só vale um por ritual.
- SaH p. 94: a fabricação em campo pede o kit da Profissão (sem ele, −5). Itens modificados e paranormais não se fabricam em campo; os catalisadores são exceção (SaH p. 44).

## Combate

- Iniciativa (LR p. 83): o mestre rola uma vez por todos os inimigos, com o menor bônus; empatados rolam entre si; quem entra depois rola e age na rodada seguinte; surpreendido age só a partir da 2ª rodada. O mestre tem um único turno para todos os seres dele (LR p. 169).
- Rodada e turno (LR p. 84–85): efeito de N rodadas acaba logo antes da mesma contagem de Iniciativa em que começou. No turno: padrão + movimento, duas de movimento ou uma completa; livres e reações sem limite; reação vale mesmo sem poder agir (ex.: atordoado), menos bloqueio e esquiva. Levantar, sacar arma, pegar item da mochila e abrir porta são de movimento (p. 84).
- Agredir (LR p. 85): corpo a corpo a até 1,5 m; à distância, até o alcance, ou até o dobro com −5; atirar em quem está a 1,5 m de um inimigo: −5. Alcances: 9, 18, 36 e 90 m (LR p. 55).
- Manobras (LR p. 85): teste de ataque corpo a corpo oposto, o alvo com Luta, empate repete; agarrado tem −2 no ataque aqui (o apêndice, p. 310, diz −1d20); derrubar e desarmar vencendo por 5 ou mais empurram 1 quadrado (no desarmar, o item cai na casa do alvo e vai mais 1 quadrado na direção que o atacante escolher); empurrar: 1,5 m e mais 1,5 m a cada 5; só se agarra desarmado; à distância contra quem está numa manobra agarrar, 50% de acertar o outro.
- Preparar é ação padrão: a Iniciativa passa a ficar logo acima de onde a ação aconteceu; não usada até o próximo turno, perde (LR p. 86). Atrasar é livre, com limite de 0 − bônus de Iniciativa; vários atrasando: o de maior bônus age antes na mesma contagem, e depois quando um quer agir após o outro (LR p. 87).
- Atrasar (LR p. 87) baixa a Iniciativa pelo resto do combate; quando a contagem nova chega, age normalmente. O livro não diz se dá para atrasar depois de uma ação livre, nem o que acontece com os efeitos do começo do turno.
- Investida (LR p. 87): até 2× o deslocamento (mínimo 3 m), +1d20 no ataque e −5 na Defesa até o próximo turno; atropelar é livre, mas não no mesmo alvo. Golpe de misericórdia: crítico automático; morte com 1 no d4 (personagens e NPC importantes) ou de 1 a 3 (secundários).
- Defesas especiais (LR p. 88): uma por rodada, declaradas antes do teste de ataque do inimigo; bloqueio dá RD igual ao bônus de Fortitude, só contra corpo a corpo; esquiva soma Reflexos na Defesa; contra-ataque quando um ataque corpo a corpo erra. Ameaças não usam nenhuma (LR p. 179).
- 0 PV (LR p. 88): inconsciente e morrendo; morre ao iniciar 3 turnos morrendo na mesma cena. Dano massivo: dano igual ou maior que a metade dos PV totais, sem zerar, pede Fortitude DT 15, +2 a cada 10 de dano; falhou, cai a 0 PV.
- Não letal (LR p. 88): soma para desmaiar e não para morrendo, e a cura tira primeiro o dano não letal. Não letal com arma letal, ou letal com desarmado ou arma não letal: −5.
- Inconsciente pelo 0 PV: acaba com qualquer cura de pelo menos 1 PV; morrendo, só com Medicina DT 20 ou efeito próprio (LR p. 88). O dano massivo não fala do não letal (p. 88).
- SAN 0 (LR p. 88): enlouquecendo; ao iniciar 3 turnos assim na cena, fica insano e vira NPC do mestre; sai com Diplomacia DT 20 ou com 1 de SAN curada. Não existe dano massivo para o dano mental (p. 88).
- Dano mental reduz a Sanidade; dano paranormal sempre tem o subtipo de um elemento (LR p. 82).
- Tipos de dano (LR p. 82): balístico, corte, eletricidade, fogo, frio, impacto, mental, paranormal (sempre com um subtipo: Conhecimento, Energia, Medo, Morte ou Sangue), perfuração e químico. Dano de Medo é paranormal; o mental é outro tipo.
- Tab. 4.4 (LR p. 89): atacante caído −2d20, cego 50%, elevado +1d20, flanqueando +1d20 (só corpo a corpo; o texto da p. 90 diz +2), invisível +2d20 (não contra alvo cego), ofuscado −1d20. Alvo caído −5 contra corpo a corpo e +5 contra distância, cego −5, desprevenido −5, camuflagem 20%, camuflagem total 50%, cobertura +5, cobertura total não pode ser atacado.
- Chance de falha: um d10 junto do ataque; camuflagem falha de 1 a 2, total de 1 a 5 (LR p. 89). De fontes diferentes, soma até 75%, e sempre sobra 1 em 4 de acertar (LR p. 313).
- Crítico (LR p. 82): acerto com o d20 dentro da margem; multiplica só os dados da arma, não os bônus nem os dados extras; imune a crítico sofre o dano normal (a p. 54 só fala do 20 natural).
- Tab. 4.5 (LR p. 90), Defesa/RD/PV: papel 15/0/1, corda 15/0/2, corrente 15/10/2, cadeira 12/5/5, caixote 10/5/10, porta de madeira 8/5/20, porta de metal 8/8/50, portão de grades 8/10/50, carro 5/10/100, ônibus 5/20/300, cabana de madeira 0/5/900. Armas: de madeira RD 5 (PV 2, 5 e 10), de metal RD 10 (PV 5, 10 e 20). Objeto em movimento, +5 na Defesa; a 0 PV, quebra.
- Condições (LR p. 88, 310–311): o apêndice vai de abalado a envenenado na p. 310 e de esmorecido a vulnerável na p. 311. Os grupos do livro são medo, mental, paralisia, sentidos e fadiga (só fatigado e exausto); fraco, debilitado e petrificado não têm grupo. As regras de machucado, morrendo, perturbado e enlouquecendo estão na p. 88; a p. 111 traz só o lado narrativo.
- SaH, medo em jogo (SaH p. 87–88): tabela de fontes de medo; o dano mental de medo é no mínimo 1; a presença perturbadora e o dano mental de criaturas de Medo contam como medo; para campanhas de horror, substitui as regras de insanidade (LR p. 88, 111–113); acalmar com Diplomacia, Profissão (psicólogo) ou Religião treinadas, sem DT base escrita.

## Ameaças

- Ficha (LR p. 178–179): os números já incluem tamanho e equipamento; "×N" quer dizer N ataques por ação; ameaças não usam bloqueio, esquiva nem contra-ataque.
- Tab. 7.1 (LR p. 179): espaço e alcance natural de 1,5 m até o Médio, 3 m no Grande, 4,5 m no Enorme e 9 m no Colossal. Nas manobras: Minúsculo −5, Pequeno −2, Médio 0, Grande +2, Enorme +5, Colossal +10; na Furtividade, o inverso.
- Habilidades (LR p. 179–180): percepção às cegas e visão na penumbra valem em alcance curto, visão no escuro em médio; RD e cura acelerada têm exceções depois da barra ("RD 10/morte" vale contra tudo, menos Morte); vulnerabilidade dobra o dano.
- Criaturas (LR p. 180): não têm SAN; são imunes a dano mental, a condições mentais e de medo e a rituais de Medo. As pessoas da lista de ameaças não têm essa imunidade.
- Pessoas e animais (LR p. 282–289): a ficha traz PV e machucado, sem SAN (ex.: p. 285). O livro não diz o que o dano mental faz neles.
- Presença perturbadora (LR p. 180): Vontade contra a DT; falhou, sofre o dano cheio; passou, metade. Quem tem o NEX indicado é imune. Com várias criaturas, vale a de maior VD, +1d6 por criatura a mais.
- Notação (LR p. 182–289): "–2O" no lugar de um teste é atributo 0, ou seja, 2d20 e fica o pior (p. 75).
- Selo de Medo (desenho, só se vê na imagem): Aniquilação 186, Dama 190, Mulher Afogada 199, Diabo 206, Aracnasita 209, Ceifador 213, Escutado 216, Nidere 224, Anjo 234, Estrangeiro 241, Parasita 244, Máscara 252, Anomalia 259, Ciborgue 263, Telopsia 269, Viajante 272, Anfitrião 276. Não têm o selo: Deus da Morte 230, Bicho-Papão 237, Ocioso 242.
- Caixa de enigma de medo: LR p. 186, 190, 198, 207, 209, 212, 216, 222, 231, 234, 241, 244, 253, 259, 263, 269, 272, 276, 280. Bicho-Papão e Ocioso são imunes a dano e não têm enigma.
- O que alguns enigmas mudam em número: o Diabo fica sem a imunidade, com Defesa 30 e +20 nas resistências (p. 207); dano de fogo tira a imunidade da Aracnasita até o próximo turno dela (p. 209); a Mulher Afogada perde a forma líquida, que dá RD 20 nos quatro tipos físicos (p. 199); o Ciborgue sem estados fica com Defesa 10 e deslocamento 0 (p. 263).
- Ataques: o Vomitar Lodo da Múmia Xipófaga dá 3d6 de Morte e 1d8 mental, os dois na mesma linha de dano do ataque (p. 221); as garras do Tempestuoso são corpo a corpo e alcançam até o curto (p. 271).
- Anfitrião (p. 276): no Ato 1, 5 facetas, cada uma com 250 PV e RD 20.

## Outros

- Acumular bônus (LR p. 312–313): as fontes são habilidades, itens, rituais e aliados; fontes diferentes somam, e fontes iguais não (o mesmo vale para penalidades). Habilidades somam, salvo a mesma habilidade. Itens não somam entre si, fora a Defesa de proteção, de escudo e de item paranormal (nunca duas armaduras nem dois escudos). Rituais e aliados não somam entre si. O mesmo atributo entra uma vez por característica. RD, PV temporários e cura acelerada somam, menos quando as fontes não somam. A chance de falha soma até 75%. A fortificação sempre soma. Condições com o mesmo efeito não somam (desprevenido com vulnerável dá −5).
- Contas (LR p. 312): multiplicações e divisões antes de somas e subtrações; o teste de resistência vem primeiro; multiplicadores se juntam (×2 com ×2 dá ×3); divisão arredonda para baixo.
- Aliados (LR p. 170–171): o bônus vale sempre para quem o aliado ajuda; a habilidade, 1×/rodada, como ação livre.
