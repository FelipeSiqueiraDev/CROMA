# Os personagens do tabuleiro em 3D

Como os agentes viram pixel art animada: montados no Blender a partir do
boneco-base do Quaternius, filmados no ângulo do tabuleiro e pixelados. O plano
e as decisões estão em [`docs/PERSONAGENS-3D.md`](../../docs/PERSONAGENS-3D.md).

## Precisa

- Blender 5.2 (`C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`).
- Python com PyMuPDF e numpy (os mesmos do Veríssimo) e o ffmpeg (para as prévias).
- A pasta de trabalho do 3D, fora do repositório (`CROMA_3D`, por padrão
  `C:/Users/felip/CROMA-3D`), com os três pacotes CC0 do Quaternius em `fontes/`:
  *Universal Base Characters [Standard]*, *Universal Animation Library [Standard]*
  e *Universal Animation Library 2 [Standard]* (quaternius.itch.io).

## Passo a passo (exemplo: Alosi)

```bash
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
# 1. monta o personagem (roupa, cabelo, óculos, acessórios) a partir da ficha
"$B" -b --factory-startup -P scripts/3d/montar.py -- scripts/3d/fichas/alosi.json
# 2. filma as animações nas 8 direções (cor e normal de cada quadro)
"$B" -b --factory-startup -P scripts/3d/filmar.py -- <filmagem.json>
# 3. pixel art: luz em faixas, contorno, paleta do personagem
python scripts/3d/pixelar.py <pasta da filmagem> <pasta pixelada> --cores 48
# 4. tiras e anim.json para o jogo
python scripts/3d/exportar.py <pasta pixelada> <filmagem>/filmagem.json client/public/arte/personagens/alosi/tabuleiro-3d scripts/3d/fichas/tocar.json --estado desarmado
```

O `filmagem.json` diz o personagem (`.blend` montado), o arquivo das animações,
a pasta de saída e as animações (nome no jogo, ação da biblioteca, quantos quadros,
se é laço). Exemplo:

```json
{
  "personagem": "C:/Users/felip/CROMA-3D/personagens/alosi.blend",
  "animacoes_arquivo": ["C:/Users/felip/CROMA-3D/fontes/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb"],
  "saida": "C:/Users/felip/CROMA-3D/filmagens/alosi",
  "animacoes": [
    {"nome": "andar", "acao": "Walk_Loop", "quadros": 16},
    {"nome": "parado", "acao": "Idle_Loop", "quadros": 20},
    {"nome": "pegar", "acao": "PickUp_Table", "quadros": 12, "laco": false}
  ]
}
```

## Os outros scripts

- `olhar.py`: quatro vistas rápidas (com luz) de um `.blend` ou de arquivos importados.
- `previa_gif.py`: GIFs de prévia (as 8 direções no lugar; andando num piso na velocidade do tabuleiro).
- `passada.py`: quanto cada animação de andar anda por ciclo (para o pé ficar no chão).
- `medidas.py`, `inspecionar.py`: juntas do boneco-base, regiões do corpo e lista das animações de um arquivo.
