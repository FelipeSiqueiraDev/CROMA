# Personagens do tabuleiro em 3D → pixel art

Decidido em 02/10: os quatro agentes (Tepes, Alosi, Catarina e Cora) andam e
interagem no tabuleiro como pixel art **filmada de modelos 3D** no Blender, e
não desenhada quadro a quadro. Motivo: só assim o andar completo (contato,
descida, passagem, subida), o joelho e o cotovelo dobrando e todas as ações
saem iguais nas 8 direções, sem nada tremer entre os quadros. As ilustrações
dos personagens (enviadas em 02/10) são a referência de roupa, cabelo e cores.

## O caminho

1. **Boneco-base e animações** (Quaternius, licença CC0: domínio público, sem
   crédito): *Universal Base Characters* (corpo com esqueleto de 65 ossos) e
   *Universal Animation Library* 1 e 2 (as animações, no mesmo esqueleto).
   Ficam fora do repositório, em `C:\Users\felip\CRONA-3D\fontes`.
2. **Montar** (`montar.py` + a ficha `fichas/<nome>.json`): proporções (ombros,
   tronco, grossura de braços e pernas, altura), pele, cabelo, barba, óculos,
   roupas e acessórios. As roupas saem do próprio corpo: as faces de cada
   região são copiadas, alisadas (a roupa não marca o músculo) e afastadas da
   pele pela espessura da peça, com os pesos do esqueleto do corpo, então dobram
   junto. O corpo coberto sai. Grava `personagens/<nome>.blend`.
3. **Filmar** (`filmar.py`): câmera do tabuleiro, ortográfica, 30° acima do
   chão (a grade 2:1) e a 45°; 1 m de altura = 115,2 pixels (o dobro da tela no
   zoom 1). Para cada animação e direção, dois passes: a cor de cada parte, sem
   luz, e a direção da superfície (normal). Grava também onde ficam na imagem
   os pés, as mãos, a cabeça e o quadril em cada quadro.
4. **Pixelar** (`pixelar.py`): luz de pixel art (de cima, da esquerda e da
   frente) em faixas, com a sombra puxando para o roxo e a luz para o amarelo,
   borda fria nas costas, contorno de 1 pixel na cor da parte escurecida e
   linhas onde uma parte passa na frente da outra; paleta única por personagem
   (o mesmo tom em todos os quadros).
5. **Exportar** para `client/public/arte/personagens/<nome>/tabuleiro-3d/`:
   tiras por animação e direção e o `anim.json` (versão 2), que o servidor acha
   e o tabuleiro toca.

Os scripts ficam em `C:\Users\felip\CRONA-3D\scripts` enquanto o caminho é
testado e vêm para o repositório quando estiverem prontos.

## Escala e ângulo

- A tela do tabuleiro: casa = losango de 64×32 px no zoom 1; altura: 57,6 px por
  metro (`Z_PER_M` = 1,8 × 32) na escala em que a arte das pessoas é feita.
- A câmera ortográfica a 30° com essa altura dá, no chão, 52,6 px por metro ao
  longo do eixo da casa: **uma casa = 0,68 m**. Com isso o personagem fica na
  proporção real e pisa no chão do mapa sem esticar.
- **Revisto em 03/10:** o tabuleiro passou para a escala das regras, **uma casa =
  0,75 m** (52,3 px por metro na vertical). A arte das pessoas continua sendo feita
  na escala acima e o tabuleiro desenha com 91% (`ESCALA_ARTE_PESSOA`); o passo
  também (1,91 casa por ciclo na arte vira 1,73 no tabuleiro).
- Arte em dobro: o personagem tem ~200 px de altura na imagem e aparece com
  ~100 px no zoom 1 (suavizado) e nítido no zoom 2.
- Andar: o *Walk_Loop* anda 1,3 m por ciclo = **1,91 casa por ciclo**. O quadro
  vem da distância andada (não do relógio): o pé que apoia fica parado no
  chão. Na diagonal da tela (passo de casa em casa na diagonal), a distância
  de cada passo é √2 casa.

## O que cada um precisa para usar o mapa

| No jogo | Animação (biblioteca) |
|---|---|
| parado (respira) | `Idle_Loop`; variações: `Idle_FoldArms_Loop`, `Idle_Talking_Loop` |
| andar | `Walk_Loop` |
| correr (combate) | `Jog_Fwd_Loop` |
| sentar na cadeira | `Sitting_Enter`, `Sitting_Idle_Loop`, `Sitting_Exit` |
| examinar / usar objeto | `Interact` |
| abrir (baú, gaveta, armário) | `Chest_Open` |
| pegar item | `PickUp_Table` |
| entregar item | `Interact` |
| consumir (remédio, comida) | `Consume` |
| dançar, sim, não | `Dance_Loop`, `Yes`, `Idle_No_Loop` |
| armado: espada (Catarina) | `Sword_Idle`, `Sword_Regular_A/B/C`, `Sword_Block` |
| armado: pistola / fuzil (Cora) | `Pistol_Idle_Loop`, `Pistol_Shoot`, `Pistol_Reload` |
| ritual | `Spell_Simple_Enter`, `Spell_Simple_Idle_Loop`, `Spell_Simple_Shoot`, `Spell_Simple_Exit` |
| levar dano | `Hit_Chest`, `Hit_Head`, `Hit_Knockback` |
| cair / inconsciente | `Death01` (o último quadro fica enquanto está caído) |
| levantar do chão | `LayToIdle` |

Faltam na versão grátis: acenar e andar machucado (a fazer à mão no Blender,
em cima das animações que existem).

## Situação

- 02/10: caminho provado com o manequim (andar e parado nas 8 direções, pé no
  chão na velocidade do tabuleiro). Alosi em montagem (`fichas/alosi.json`).
- A seguir: Alosi andando e parada no tabuleiro (anim.json v2), depois as
  ações, os outros três e os gatilhos no jogo (o servidor avisa quando a peça
  usa, pega, entrega, ataca, leva dano ou cai).
