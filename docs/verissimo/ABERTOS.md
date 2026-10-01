# Achados abertos do Veríssimo

O que o Veríssimo achou e ainda não foi resolvido. Cada conferência acrescenta os achados novos e marca os resolvidos.

Os pontos que já estavam abertos antes dele continuam em `docs/AUDITORIA-REGRAS.md` (as dúvidas D1 a D10, "o que ainda falta no motor" e as pendências de cada ficha dos Marcados) e nas decisões do combate (`docs/COMBATE.md`, seção 23). Não se repetem aqui.

Caminhos curtos: `regras/` é `shared/src/regras/`, `dados/` é `shared/src/regras/dados/` e `combate/` é `shared/src/combate/`. O texto completo de cada achado (o que está, o que o livro diz e a correção) fica no relatório da conferência, em `docs/verissimo/relatorios/`.

| Id | Data | Onde | Achado | Página | Estado |
|---|---|---|---|---|---|
| V-1 | 2026-10-01 | `combate/turnos.ts:339-373`, `combate/ataque.ts:329` | Erro: dano mental tira PV, e não SAN | LR p. 82, 88 | resolvido (2026-10-01) |
| V-2 | 2026-10-01 | `combate/turnos.ts:339-373, 144-156` | Erro: dano não letal leva a morrendo; devia somar só para desmaiar | LR p. 88 | resolvido (2026-10-01) |
| V-3 | 2026-10-01 | `combate/turnos.ts:678-692` | Erro: atrasar roda o começo do turno duas vezes (morrendo +2, sustentado e em chamas duas vezes, turno a mais) | LR p. 87–88 | resolvido (2026-10-01) |
| V-4 | 2026-10-01 | `combate/ataque.ts:188` | Erro: 75% de falha vira 80% no d10 | LR p. 313 | resolvido (2026-10-01) |
| V-5 | 2026-10-01 | `regras/calcular.ts:498-501`, `combate/ataque.ts:299-311` | Erro: a RD paranormal não reduz dano de nenhum elemento | LR p. 35, 82 | resolvido (2026-10-01) |
| V-6 | 2026-10-01 | `regras/calcular.ts:468-488`, `dados/paranormais.ts:36` | Erro: o +2 da Precognição nos testes de resistência some | LR p. 114 | resolvido (2026-10-01) |
| V-7 | 2026-10-01 | `combate/ameaca.ts:123-143`, `combate/ataque.ts:287-317` | Erro: criaturas sem imunidade a dano mental, a condições mentais e de medo e a rituais de Medo | LR p. 180 | resolvido (2026-10-01) |
| V-8 | 2026-10-01 | `client/src/ui/combateAmeaca.ts:110-129, 220` | Erro: a imunidade a todo dano não sai da ficha rápida quando o enigma é resolvido | LR p. 180–181 | resolvido (2026-10-01) |
| V-9 | 2026-10-01 | `combate/ameacasLivro.ts:102, 107, 113, 130` | Erro: "–2O" virou `dados: -2` (rola 4d20 e fica o pior; é 2d20) | LR p. 75 | resolvido (2026-10-01) |
| V-10 | 2026-10-01 | `combate/ameacasLivro.ts:84` | Erro: Aracnasita sem a imunidade e sem o enigma | LR p. 209 | resolvido (2026-10-01) |
| V-11 | 2026-10-01 | `combate/ameacasLivro.ts:91` | Erro: Múmia Xipófaga, Vomitar Lodo sem o 1d8 mental | LR p. 221 | resolvido (2026-10-01) |
| V-12 | 2026-10-01 | `regras/calcular.ts:391-407` | Erro: preço da maldição uma vez por elemento; é 2 SAN por maldição, cumulativo | LR p. 145, 148 | resolvido (2026-10-01) |
| V-13 | 2026-10-01 | `regras/calcular.ts:474-480, 496-503` | Erro: bônus de itens diferentes se somam (RD, perícias) | LR p. 144, 312–313 | resolvido (2026-10-01) |
| V-14 | 2026-10-01 | `regras/calcular.ts:338-339` | Erro: proteção ou escudo sem proficiência só avisa; o −2d20 não entra | LR p. 62 | resolvido (2026-10-01) |
| V-15 | 2026-10-01 | `dados/armas.ts:101-102, 148-149`, `regras/calcular.ts:544` | Erro: arco composto e estilingue sem a Força no dano | LR p. 58; SaH p. 37 | resolvido (2026-10-01) |
| V-16 | 2026-10-01 | `dados/armas.ts:97-99, 130-132`, `regras/calcular.ts:535-542` | Erro: moto-serra sem o −2 e metralhadora sem o −5 no ataque | LR p. 59 | resolvido (2026-10-01) |
| V-17 | 2026-10-01 | `dados/armas.ts:168-169` | Erro: pistola pesada sem o −1d20 de uma mão | SaH p. 37 | resolvido (2026-10-01) |
| V-18 | 2026-10-01 | `shared/src/itens.ts:44-56`, `regras/mochila.ts:70` | Erro: item vestível pego do cenário entra vestido, sem a ação de vestir | LR p. 53, 63; SaH p. 44 | resolvido (2026-10-01) |
| V-19 | 2026-10-01 | `dados/poderes.ts:69`, `regras/calcular.ts:138` | Erro: Golpe Pesado vale no ataque desarmado | LR p. 25, 57 | resolvido (2026-10-01) |
| V-20 | 2026-10-01 | `client/src/ui/combate.ts:589` | Erro: o combate libera a forma de afinidade sem olhar `afinidadeAtiva` | LR p. 110, 114 | resolvido (2026-10-01) |
| V-21 | 2026-10-01 | `regras/calcular.ts:596`, `combate/ritual.ts:13-16` | Erro: custo do ritual travado em 1 PE antes de somar a forma | LR p. 34, 78, 121 | resolvido (2026-10-01) |
| V-22 | 2026-10-01 | `docs/REGRAS.md:75`, `client/src/ui/fichaRegras.ts:30-35`, `docs/COMBATE.md:69-72` (DC-1), `combate/ataque.ts:136, 173` | Erro: "menos de 1 dado" contra a regra do livro (rola atributo + ganhos + perdidos, fica o pior) | LR p. 11, 14, 75 | resolvido (2026-10-01) |
| V-23 | 2026-10-01 | `client/src/ui/fichaRegras.ts:403-408`, `regras/estado.ts:482-483` | Erro: Saber Ampliado e Grimório, o ritual a mais tem de ser do círculo novo (a tela trava o círculo novo; o motor aceita qualquer um até ele) | LR p. 35 | resolvido (2026-10-01) |
| V-24 | 2026-10-01 | `combate/turnos.ts:280, 388, 487` | Aviso: reações fora do turno recusadas (contra-ataque, ação preparada, Ataque de Oportunidade, rituais de reação) | LR p. 25, 86, 88, 124, 129 | aberto |
| V-25 | 2026-10-01 | `combate/turnos.ts:694-705` | Aviso: preparar não confere nem gasta a ação padrão | LR p. 86 | aberto |
| V-26 | 2026-10-01 | `combate/turnos.ts:223, 301-305, 744-781` | Aviso: condições que tiram ações ou reações não pesam; o turno de quem está morrendo não passa sozinho | LR p. 85, 310–311 | aberto |
| V-27 | 2026-10-01 | `combate/turnos.ts:157-165` | Aviso: o insano sai do combate; pelo livro vira NPC do mestre | LR p. 88 | aberto |
| V-28 | 2026-10-01 | `docs/COMBATE.md`, seção 25 | Aviso: durações, investida, finta, mira e golpe de misericórdia dados como prontos; o motor só tem o texto e o orçamento | LR p. 45, 84, 86–87 | aberto |
| V-29 | 2026-10-01 | `combate/ataque.ts:54-110` | Aviso: falta o atacante invisível (+2d20, não contra alvo cego) | LR p. 89 | aberto |
| V-30 | 2026-10-01 | `combate/ataque.ts:92-110`, `combate/turnos.ts:430` | Aviso: falta o tiro contra quem está numa manobra agarrar (50% de acertar o outro) | LR p. 85, 310 | aberto |
| V-31 | 2026-10-01 | `combate/ataque.ts:109` | Aviso: falta o −5 do letal com desarmado ou arma não letal | LR p. 57, 88 | aberto |
| V-32 | 2026-10-01 | `combate/turnos.ts:182-184, 867` | Aviso: condição aplicada de novo não sobe a escada (abalado → apavorado e as outras) | LR p. 310–311 | aberto |
| V-33 | 2026-10-01 | `combate/turnos.ts:678-692` | Aviso: atrasar sem o limite de 0 − bônus de Iniciativa e sem o "agir agora" | LR p. 87 | aberto |
| V-34 | 2026-10-01 | `combate/turnos.ts:930-938` | Aviso: encerrar fecha com alguém morrendo, não encerra o sustentado nem gasta a cena de munição | LR p. 311 | aberto |
| V-35 | 2026-10-01 | `combate/turnos.ts:280, 388, 487, 727, 759` | Aviso: quem age é conferido nos participantes, e não em `ativosDa` (surpreendido e recém-chegado agem) | LR p. 83–84 | aberto |
| V-36 | 2026-10-01 | `combate/turnos.ts:748-751` | Aviso: defesa especial de ameaça aceita | LR p. 179 | aberto |
| V-37 | 2026-10-01 | `combate/turnos.ts:395, 512` | Aviso: atropelar livre fora da investida; ritual livre sem o limite de um por rodada | LR p. 86–87, 119 | aberto |
| V-38 | 2026-10-01 | `combate/manobra.ts:98-114`, `docs/COMBATE.md`, seção 9 | Aviso: Tab. 4.5 sem o ônibus e a cabana de madeira | LR p. 90 | aberto |
| V-39 | 2026-10-01 | `combate/tipos.ts:24-50`, `combate/turnos.ts:910-928` | Aviso: sem os contadores de estabilizado e acalmado na cena (DT +5 a cada vez) | LR p. 44, 46 | aberto |
| V-40 | 2026-10-01 | `combate/tipos.ts:354-376`, `combate/ameaca.ts:123-143` | Aviso: a ficha rápida descarta Iniciativa, Percepção, sentidos e imunidades a condições | LR p. 83, 178, 180 | aberto (em parte: desde 2026-10-01 a criatura é imune às condições de medo e mentais; as outras imunidades a condição continuam fora) |
| V-41 | 2026-10-01 | `client/src/ui/combate.ts:509`, `client/src/ui/combateAtaque.ts:288`, `server/src/hotel.ts:271-288` | Aviso: sacar sempre gasta movimento (sem bandoleira, Tática, coldre, Saque Rápido); a troca guarda de graça; o servidor aceita qualquer ação | LR p. 25, 60, 65, 87; SaH p. 42 | aberto |
| V-42 | 2026-10-01 | `combate/ataque.ts:116-133` | Aviso: falta o petrificado como indefeso; o `inclui` das condições não é expandido | LR p. 311 | aberto |
| V-43 | 2026-10-01 | `combate/turnos.ts:430, 528, 533`, `combate/ritual.ts:73`, `combate/ataque.ts:97`, `combate/tipos.ts:256`, `server/test/combate.test.ts:846` | Aviso: páginas trocadas (concentração p. 119; atirar em corpo a corpo p. 85; sacar p. 84 e 87; agarrado p. 310) | LR p. 84–87, 119, 310 | aberto |
| V-44 | 2026-10-01 | `client/src/ui/combate.ts:1034` | Aviso: desempate da Iniciativa pelo maior bônus não está no livro (os empatados rolam entre si) | LR p. 83 | aberto |
| V-45 | 2026-10-01 | `combate/ameacasLivro.ts:97, 101` | Aviso: Bicho-Papão e Ocioso com enigma, que o livro não dá | LR p. 236–237, 242 | aberto |
| V-46 | 2026-10-01 | `combate/ameacasLivro.ts` (13 fichas e as 5 facetas) | Aviso: falta o selo de Medo; a ficha rápida nem tem o campo | LR p. 178, 209–276 | aberto |
| V-47 | 2026-10-01 | `combate/ameacasLivro.ts:116` | Aviso: garras do Tempestuoso são corpo a corpo que alcança até o curto; tratadas como à distância | LR p. 271 | aberto |
| V-48 | 2026-10-01 | `combate/ameacasLivro.ts:79` | Aviso: Mulher Afogada sem a forma líquida (RD 20 nos quatro físicos até o enigma) | LR p. 199 | aberto |
| V-49 | 2026-10-01 | `combate/ameaca.ts:124` | Aviso: o que o enigma muda só vira nota na ficha imune a todo dano | LR p. 186, 207, 212, 222, 234, 244, 263, 272 | aberto (em parte: o campo `notaEnigma` existe desde 2026-10-01, só na Aracnasita) |
| V-50 | 2026-10-01 | `combate/ameacasLivro.ts:72, 76, 91, 96, 134` | Aviso: teste impresso de agarrar, acorrentar ou derrubar diferente da manobra calculada | LR p. 182, 193, 221, 234, 284 | aberto |
| V-51 | 2026-10-01 | `combate/ameacasLivro.ts` (campo `acoes`) | Aviso: ações com número faltando em 11 fichas, nas reações de Aniquilação e Carente e no Reescrever Realidade | LR p. 186–287 | aberto |
| V-52 | 2026-10-01 | `regras/calcular.ts:366-381`, `client/src/ui/fichas.ts:1306-1313` | Aviso: requisitos de modificação em texto não conferidos | LR p. 60, 62 | aberto |
| V-53 | 2026-10-01 | `regras/mochila.ts:132-137`, `regras/calcular.ts:244-266` | Aviso: duas proteções vestidas ou dois escudos na mão, valendo os dois | LR p. 312 | aberto |
| V-54 | 2026-10-01 | `dados/amaldicoados.ts:28, 36, 96` | Aviso: Fuzil Alheio é de duas mãos; Punhos Enraivecidos se empunham; Vislumbre do Fim se veste | LR p. 57, 145, 148–149; SaH p. 61 | aberto |
| V-55 | 2026-10-01 | `regras/calcular.ts:514-528` | Aviso: as modificações da soqueira não valem no desarmado | LR p. 66 | aberto |
| V-56 | 2026-10-01 | `regras/calcular.ts:450, 482` | Aviso: bônus de acessório e a Sombria sem a regra nova de "em uso" | LR p. 53, 63 | aberto |
| V-57 | 2026-10-01 | `regras/calcular.ts:386-389` | Aviso: o limite de duas vestimentas não conta os trajes nem o medidor vertebral | SaH p. 44 | aberto |
| V-58 | 2026-10-01 | `regras/calcular.ts:378`, `client/src/ui/fichas.ts:1311` | Aviso: Aprimorado repetido vira erro; o livro deixa repetir com Função adicional | LR p. 64 | aberto |
| V-59 | 2026-10-01 | `regras/mochila.ts:148-161` | Aviso: usar gasta da mochila consumível que precisa estar na mão | LR p. 64, 151; SaH p. 41, 44 | aberto |
| V-60 | 2026-10-01 | `regras/mochila.ts:36-50` | Aviso: casos de mão que faltam (apoiar, arma de uma mão com as duas, katana, mão livre do ritual, Coronhada) | LR p. 54, 58, 119; SaH p. 37 | aberto |
| V-61 | 2026-10-01 | `server/src/hotel.ts:323-338` | Aviso: Desarmar vencendo por 5 ou mais não manda o item mais 1 quadrado | LR p. 85 | aberto |
| V-62 | 2026-10-01 | `regras/calcular.ts:391-408`, `regras/mochila.ts:167` | Aviso: o preço da maldição sai da ficha ao largar ou entregar; vale até o fim da missão | LR p. 145 | aberto |
| V-63 | 2026-10-01 | `shared/src/itens.ts:34-38` | Aviso: espaços na tela sem as modificações e sem o revólver compacto | LR p. 60, 62, 64; SaH p. 37 | aberto |
| V-64 | 2026-10-01 | `server/test/regras.test.ts:475`, `server/test/mochila.test.ts:133-134` | Aviso: item de teste "Caixote" com 10 espaços (o caixote ocupa 5) | LR p. 53 | aberto |
| V-65 | 2026-10-01 | `shared/src/itens.ts:46`, `regras/calcular.ts:421-422, 430` | Aviso: item achado fora da vaga da patente é leitura nossa (não expira; o Arsenal entra como achado; entregue, conta na vaga) | LR p. 18, 53, 144 | aberto |
| V-66 | 2026-10-01 | `dados/paranormais.ts:29`, `client/src/ui/fichaRegras.ts:247` | Aviso: Aprender Ritual libera até o 3º círculo em qualquer NEX | LR p. 114 | aberto |
| V-67 | 2026-10-01 | `regras/estado.ts:327, 483`, `dados/trilhas.ts:196` | Aviso: Lâmina do Medo passa na validação por Saber Ampliado, Grimório e Ser Aterrorizante | LR p. 35, 135 | aberto |
| V-68 | 2026-10-01 | `client/src/ui/combate.ts:641, 1376` | Aviso: limite de PE do combate sem o +1 do Encarar a Morte | LR p. 115 | aberto |
| V-69 | 2026-10-01 | `regras/calcular.ts:507`, `client/src/ui/combateAtaque.ts:236` | Aviso: esquiva sem o +5 do Campo Protetor | LR p. 88, 115 | aberto |
| V-70 | 2026-10-01 | motor, `client/src/ui/combateRitual.ts:163-164`, `docs/REGRAS.md:190` | Aviso: falta o ±2d20 da afinidade contra efeitos de elemento | LR p. 114 | aberto |
| V-71 | 2026-10-01 | `dados/paranormais.ts:25-29` | Aviso: Aprender Ritual deixa trocar um ritual conhecido; a ficha não guarda a troca | LR p. 114 | aberto |
| V-72 | 2026-10-01 | `combate/tipos.ts:392-393`, `client/src/ui/combateRitual.ts:122, 290-292`, `combate/ataque.ts:20-24` | Aviso: forma que muda execução, alcance ou resistência usa o cabeçalho do ritual | LR p. 124–139 | aberto |
| V-73 | 2026-10-01 | `dados/rituais.ts:88` | Aviso: Poeira da Podridão, "Fortitude (veja texto)" não corta o dano à metade | LR p. 138 | aberto |
| V-74 | 2026-10-01 | `dados/paranormais.ts:58` | Aviso: Arma de Sangue com afinidade não aparece nos ataques | LR p. 116 | aberto |
| V-75 | 2026-10-01 | `docs/REGRAS.md:340` | Aviso: progressão do Aprender Ritual atribuída ao C.R.I.S (é do livro, e vale para qualquer personagem) | LR p. 114, 119 | aberto |
| V-76 | 2026-10-01 | `server/test/combate.test.ts:809, 817, 831-832, 851` | Aviso: testes de ritual com números fora do livro | LR p. 119, 126, 129 | aberto |
| V-77 | 2026-10-01 | `dados/trilhas.ts:161`, `regras/opcoes.ts:162`, `regras/estado.ts:597` | Aviso: Monstruoso aceita qualquer afinidade; tem de ser o elemento do Ser Amaldiçoado (D.Tepes em NEX 50%) | SaH p. 17 | aberto |
| V-78 | 2026-10-01 | `dados/trilhas.ts:196` | Aviso: Ser Aterrorizante deixa escolher qualquer ritual até o 4º círculo; o ritual vem do elemento | SaH p. 20–21 | aberto |
| V-79 | 2026-10-01 | `dados/poderes.ts:314, 473` | Aviso: Artista Marcial não muda o ataque desarmado | LR p. 25, 29 | aberto |
| V-80 | 2026-10-01 | `dados/trilhas.ts:140, 145-146` | Aviso: Estudar Fraquezas e Estudar a Presa somam o bônus duas vezes no ataque | LR p. 82; SaH p. 16–17 | aberto |
| V-81 | 2026-10-01 | `dados/condicoes.ts:29-30, 47-55` | Aviso: páginas das condições (311; perturbado e enlouquecendo na 88) | LR p. 88, 311 | aberto |
| V-82 | 2026-10-01 | `dados/condicoes.ts:29-30, 40, 51, 58, 60` | Aviso: grupos de condição que o livro não dá; o paralisado pode fazer ações mentais | LR p. 88, 310–311 | aberto |
| V-83 | 2026-10-01 | `dados/trilhas.ts:46, 225, 324, 343` | Aviso: efeitos com número só em nota (Máquina de Matar, Remendão, A Força do Saber, Ser Aterrorizante de Energia) | LR p. 26, 31; SaH p. 21, 23 | aberto |
| V-84 | 2026-10-01 | `dados/origens.ts:333`, `dados/poderes.ts:425` | Aviso: notas que faltam (Chef do Outro Lado; Deixe os Sussurros Guiarem) | SaH p. 8, 26, 98 | aberto |
| V-85 | 2026-10-01 | `regras/tipos.ts:184` | Aviso: armas de fogo como de disparo é da LR p. 54, não da 59 | LR p. 54 | aberto |
| V-86 | 2026-10-01 | `regras/opcoes.ts:128-135`, `client/src/ui/fichaRegras.ts:572-590` | Aviso: o ponto do treinamento (NEX 0% → 5%) deixa subir até 5; o máximo é 3 | LR p. 172 | aberto |
| V-87 | 2026-10-01 | `regras/estado.ts:216` | Aviso: Intelecto que sobe por efeito permanente não pede a perícia nova | LR p. 15, 39; SaH p. 23 | aberto |
| V-88 | 2026-10-01 | `regras/calcular.ts:587-590` | Aviso: reduções de custo de ritual somam; não acumulam (fora o Ritual Predileto) | LR p. 34, 78, 119 | aberto |
| V-89 | 2026-10-01 | `regras/calcular.ts:103-107`, `docs/AUDITORIA-REGRAS.md:31` | Aviso: a mesma habilidade vinda de lugares diferentes conta duas vezes | LR p. 312 | aberto |
| V-90 | 2026-10-01 | `docs/REGRAS.md:74` | Aviso: "circunstância extrema ±2d20" não está no livro | LR p. 76 | aberto |
| V-91 | 2026-10-01 | `docs/REGRAS.md:378` | Aviso: a imunidade a dano mental vale só para as criaturas, não para as pessoas | LR p. 180 | aberto |
| V-92 | 2026-10-01 | `regras/calcular.ts:580, 632`, `docs/AUDITORIA-REGRAS.md:32`, `docs/CRIACAO-DE-PERSONAGEM.md:107` | Aviso: páginas (Tab. 5.2 na p. 119; a ficha nas p. 319–320) | LR p. 119, 319–320 | aberto (em parte: `calcular.ts` e `fichaRegras.ts` corrigidos em 2026-10-01; faltam `AUDITORIA-REGRAS.md:32` e `CRIACAO-DE-PERSONAGEM.md:107`) |
| V-93 | 2026-10-01 | `shared/src/fichas.ts:86` | Aviso: PV atual aceito até −999; não existem PV negativos | LR p. 88 | aberto |
| V-94 | 2026-10-01 | `docs/AUDITORIA-REGRAS.md:44`, `regras/calcular.ts:319` | Aviso: o item 6 diz "aviso", mas o efeito de categoria do item escolhido é ignorado sem aviso | AUDITORIA, item 6 | aberto |
| V-95 | 2026-10-01 | `server/test/regras.test.ts:96, 127, 212` | Aviso: os títulos dos testes prometem mais do que eles conferem | LR p. 29, 53 | aberto |
| V-96 | 2026-10-01 | `docs/CRIACAO-DE-PERSONAGEM.md:91` | Aviso: sobrecarregado sem o −5 nas perícias de carga | LR p. 53 | aberto |
| V-97 | 2026-10-01 | `dados/origens.ts:291` | Dúvida: Universitário em NEX 99%, 10 ou 11 PE | LR p. 21; SaH p. 36 | aberto (mestre decide) |
| V-98 | 2026-10-01 | `dados/rituais.ts:30-31` | Dúvida: Arma Atroz discente, +2 PE (descrição) ou +3 (exemplo) | LR p. 121, 125 | aberto (mestre decide) |
| V-99 | 2026-10-01 | `regras/calcular.ts:435-436` | Dúvida: a Defesa de itens amaldiçoados diferentes se soma? | LR p. 312 | aberto (mestre decide) |
| V-100 | 2026-10-01 | `regras/mochila.ts:4-6` | Dúvida: a campanha usa a opção "Limites de itens vestidos"? | SaH p. 43 | aberto (mestre decide) |
| V-101 | 2026-10-01 | `regras/mochila.ts` | Dúvida: arma de duas mãos "apoiada", com uma mão livre (Cora e o fuzil)? | LR p. 54 | aberto (mestre decide) |
| V-102 | 2026-10-01 | `regras/estado.ts:379-384`, `regras/opcoes.ts:93-94`, `server/test/regras.test.ts:378` | Dúvida: a versão "Afinidade" pode vir no mesmo Transcender que forma a afinidade? | LR p. 110, 114 | aberto (mestre decide) |
| V-103 | 2026-10-01 | `docs/REGRAS.md`, seção 13 | Dúvida: o exemplo de DT da p. 78 (18) contra a fórmula (24) | LR p. 78, 121 | aberto (mestre decide) |
| V-104 | 2026-10-01 | `regras/calcular.ts:493` | Dúvida: a DT de ritual sem a Presença Poderosa | LR p. 35, 121 | aberto (mestre decide) |
| V-105 | 2026-10-01 | `regras/opcoes.ts:78-86`, `regras/estado.ts:585-593` | Dúvida: versatilidade por trilha sem conferir o requisito da trilha | LR p. 26, 31 | aberto (mestre decide) |
| V-106 | 2026-10-01 | `regras/nex.ts:46-48` | Dúvida: limite de PE 1 em NEX 0% | LR p. 23, 93, 172 | aberto (mestre decide) |
| V-107 | 2026-10-01 | `shared/src/vitals.ts:72-75`, `combate/ataque.ts:332` | Dúvida: a metade com total ímpar (machucado e dano massivo) | LR p. 312 | aberto (mestre decide) |
| V-108 | 2026-10-01 | `combate/ataque.ts:332` | Dúvida: o dano massivo vale para as ameaças? | LR p. 88 | aberto (mestre decide) |
| V-109 | 2026-10-01 | `combate/ameaca.ts:123-143`, `combate/tipos.ts:371` | Dúvida: o segundo selo de elemento conta no elemento contra a criatura? | LR p. 118 | aberto (mestre decide) |
| V-110 | 2026-10-01 | `combate/ameacasLivro.ts:119-123` | Dúvida: facetas do Anfitrião, imunes até o enigma ou só RD 20 | LR p. 276 | aberto (mestre decide) |
| V-111 | 2026-10-01 | `combate/ameacasLivro.ts:125-128` | Dúvida: as formas da Degolificada perderam o Medo | LR p. 279–281 | aberto (mestre decide) |
| V-112 | 2026-10-01 | `combate/ameacasLivro.ts:83, 106` | Dúvida: testes impressos do Diabo e da Máscara fora da Potência; falta a nota | LR p. 206, 252 | aberto (mestre decide) |
| V-113 | 2026-10-01 | `combate/ameacasLivro.ts` (Carniçal Preto da Morte, Existido) | Dúvida: números estranhos impressos, sem nota | LR p. 211, 238 | aberto (mestre decide) |
| V-114 | 2026-10-01 | `combate/ataque.ts:367-368` | Erro: o golpe letal que faz desmaiar pela soma com o não letal não pede o dano massivo (falhando, iria a 0 PV e morrendo) | LR p. 88 | aberto |
| V-115 | 2026-10-01 | `client/src/ui/combateRitual.ts:61-62, 159`, `docs/COMBATE.md:519, 521` | Aviso: rituais de Medo com o tipo "Medo" marcado: Conhecendo o Medo é mental; Presença do Medo é mental e de Medo (a tela leva um tipo só); a Lâmina do Medo ignora a RD | LR p. 127, 135, 139; SaH p. 87–88 | aberto |
| V-116 | 2026-10-01 | `combate/turnos.ts:620-625` | Aviso: o Custo do Paranormal sobrescreve a SAN que o ritual tirou do próprio conjurador quando ele está na área | LR p. 121 | aberto |
| V-117 | 2026-10-01 | `combate/turnos.ts:733-738`, `client/src/ui/combate.ts:1082` | Aviso: pagar o sustentado conta como ter agido e impede atrasar | LR p. 87, 120 | aberto |
| V-118 | 2026-10-01 | `regras/calcular.ts:578-581` | Dúvida: o +2 da Precognição nos testes de resistência entra na esquiva e no bloqueio? (o CROMA tira) | LR p. 77, 88, 114 | aberto (mestre decide) |
| V-119 | 2026-10-01 | `combate/ataque.ts:381-386`, `combate/turnos.ts:989-1006`, `docs/COMBATE.md:533-534` | Dúvida: não letal, dano massivo (inconsciente sem morrendo) e cura de 1 PV (o CROMA só acorda com PV acima do não letal) | LR p. 88 | aberto (mestre decide) |
| V-120 | 2026-10-01 | `combate/turnos.ts:379-388`, `shared/src/vitals.ts:31` | Dúvida: dano mental em pessoas e animais, que não têm SAN na ficha (sai da SAN 20 padrão da peça) | LR p. 180, 282–289 | aberto (mestre decide) |
| V-121 | 2026-10-01 | `client/src/ui/combateAtaque.ts:273-279` | Dúvida: no crítico, o dano a mais de outro tipo (1d8 mental do Vomitar Lodo) multiplica? | LR p. 82, 221 | aberto (mestre decide) |
