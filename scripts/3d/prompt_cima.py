"""
Gera o PROMPT-VISTA-DE-CIMA.txt (o pedido da arte do mapa tático): cada móvel de chão da Sede visto
de cima, por cômodo, com as medidas em pixels. Os móveis de cada cômodo vêm da montagem da Sede
(scripts/3d/moveis_de_cima.mts); o tamanho de verdade, das fichas de importação.

    python scripts/3d/prompt_cima.py [--saida arquivo.txt]

Sem --saida, grava na pasta da arte do GPT (CRONA_ARTE_GPT, ou a de sempre), por cima do pedido de lá.
"""
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
JOGO = os.path.dirname(os.path.dirname(AQUI))
PASTA_GPT = os.environ.get('CRONA_ARTE_GPT') or os.path.join(
    os.path.expanduser('~'), 'OneDrive', 'Área de Trabalho', 'TEXTURAS MAPA', 'BASE - Ordo Realitas')
SAIDA = sys.argv[sys.argv.index('--saida') + 1] if '--saida' in sys.argv else os.path.join(PASTA_GPT, 'PROMPT-VISTA-DE-CIMA.txt')
CASA_M = 0.75
PX = 128  # pixels por casa

dados = json.loads(subprocess.run('npx tsx scripts/3d/moveis_de_cima.mts', shell=True, cwd=JOGO, capture_output=True,
                                  text=True, encoding='utf-8', check=True).stdout)
# o tamanho de verdade de cada móvel (das fichas de importação)
real = {}
fichas_dir = os.path.join(JOGO, 'scripts', '3d', 'fichas')
for f in os.listdir(fichas_dir):
    if f.startswith('moveis'):
        for m in json.load(open(os.path.join(fichas_dir, f), encoding='utf-8')).get('moveis', []):
            if m.get('real') and m['def'] not in real:
                real[m['def']] = m['real']

# os que a montagem põe por funções (mesas do bar, celas)
EXTRA = {
    'bar': [('table_bar', 1, 1, 0.75, 'mesa-bar.png'), ('chair_bar', 1, 1, 0.82, 'cadeira-bar.png')],
    'prisao': [('cell_front', 1, 1, 2.2, 'divisoria-celas-modulo.png'), ('cell_door_steel', 1, 1, 2.2, 'porta-cela-aco-fechada.png'), ('bed', 1, 3, 0.5, 'cama-cela.png'), ('toilet_steel', 1, 1, 1.0, 'vaso-pia-inox.png')],
}
PULA_KIND = {'portal', 'fluorescent', 'ceiling_lamp', 'cage_lamp'}
COMODOS = {
    'bar': ('01 Bar', 'madeira'), 'salao': ('02 Salão Principal', 'concreto'), 'corredor': ('03 Corredor', 'bloco'),
    'banheiro': ('04 Banheiro', 'xadrez'), 'enfermaria': ('05 Enfermaria', 'ladrilho'), 'gabinete': ('06 Gabinete', 'taco'),
    'laboratorio': ('07 Laboratório', 'azulejo'), 'tecnologia': ('08 Sala de Tecnologia', 'carpete'), 'rituais': ('09 Sala de Rituais', 'musgo'),
    'arsenal': ('10 Arsenal', 'metal'), 'prisao': ('11 Prisão', 'cela'), 'camara': ('12 Câmara do Selo', 'selo'),
}
ORDEM = ['bar', 'salao', 'corredor', 'banheiro', 'enfermaria', 'gabinete', 'laboratorio', 'tecnologia', 'rituais', 'arsenal', 'prisao', 'camara']
# estados que mudam o que se vê de cima
ESTADOS_CIMA = {'chest_army': ['aberto'], 'cell_door_steel': ['aberta'], 'locker_ammo': ['aberto']}

feitos = set()
partes = []
for chave in ORDEM:
    pasta, piso = COMODOS[chave]
    sala = next(s for s in dados if s['comodo'] == chave)
    itens = [(o['id'], o['w'], o['d'], o['alto'], o.get('folha'), o['nome']) for o in sala['defs'] if not o['flat'] and o['kind'] not in PULA_KIND and o.get('folha')]
    for e in EXTRA.get(chave, []):
        itens.append((e[0], e[1], e[2], e[3], e[4], e[0]))
    linhas = []
    for (id_, w, d, alto, folha, nome) in itens:
        if id_ in feitos:
            continue
        feitos.add(id_)
        r = real.get(id_) or {'cell_door_steel': [0.75, 0.12, 2.2], 'cell_front': [0.75, 0.15, 2.2]}.get(id_)
        # coisa pequena demais para aparecer de cima (copo, cinzeiro) fica de fora; a mesma folha, uma vez só
        if (r and max(r[0], r[1]) < 0.2) or folha in feitos:
            continue
        feitos.add(folha)
        img_w, img_h = w * PX, d * PX
        if r:
            ow = min(img_w, round(r[0] / CASA_M * PX))
            oh = min(img_h, round(r[1] / CASA_M * PX))
            medida = f'{r[0]:.2f} × {r[1]:.2f} m, {r[2]:.2f} m de altura'.replace('.', ',')
            obj = f'o objeto ocupa {ow}×{oh} px, no meio'
        else:
            medida = f'{alto:.2f} m de altura'.replace('.', ',')
            obj = 'o objeto ocupa a imagem quase toda, no meio'
        base = folha.replace('.png', '')
        nome_cima = f'{base}-cima.png'
        linha = f'  {nome_cima} ... {img_w}×{img_h} px ({w}×{d} casas); {medida}; {obj}.\n      Referência: Sede da Ordem/{pasta}/{folha}'
        if id_ == 'cell_door_steel':
            linha += ' (peça nova da LISTA-REFAZER.txt: desenhe depois da isométrica dela)'
        for est in ESTADOS_CIMA.get(id_, []):
            linha += f'\n      Mais o estado {est}: {base}-cima-{est}.png, mesmo tamanho e mesmo lugar.'
        linhas.append(linha)
    partes.append((chave, pasta, piso, linhas))

total = sum(len(l) for _, _, _, l in partes)
txt = []
txt.append(f"""PROMPT — LOTE: OS MÓVEIS VISTOS DE CIMA (MAPA TÁTICO) (03/10)

O jogo vai ganhar um modo tático: a câmera sai do isométrico, sobe e mostra a sala vista de cima, como um mapa de batalha, para o combate (distâncias, alcance, cobertura). Hoje, de cima, os móveis são blocos desenhados por código. Neste lote você desenha cada móvel da Sede visto de cima, no mesmo estilo das folhas isométricas que você já fez, para o mapa tático ficar lindo.

Leia o arquivo inteiro antes de começar. As REGRAS GERAIS valem para todas as imagens.

Pastas ao lado deste arquivo:
- "Sede da Ordem/<cômodo>/": as folhas isométricas de cada móvel. É a referência do OBJETO (modelo, cores, materiais, desgaste, o que está em cima). De cima, é o MESMO objeto.
- "gabaritos/": o estilo geral do jogo.

==========================================================================
REGRAS GERAIS
==========================================================================
1. CÂMERA EXATAMENTE DE CIMA, ortográfica, olhando reto para baixo: só aparece o que está em cima (o tampo da mesa e o que está sobre ela, o assento e o encosto da cadeira vistos de cima, o topo do armário). Nenhuma lateral, nenhuma perspectiva, nenhuma inclinação.

2. A FRENTE DO MÓVEL VIRADA PARA BAIXO (para a borda de baixo da imagem): o lado de onde se senta numa cadeira, as portas de um armário, as gavetas, a frente do balcão. O jogo gira a imagem para os outros lados.

3. TAMANHO EXATO: cada imagem tem o tamanho escrito na lista (128 px por casa do tabuleiro; 1 casa = 0,75 m, meio quadrado do livro, então 1 m = 171 px). O objeto fica no tamanho de verdade dentro dela, centrado, e o que sobra é transparente. Nada passa da borda.

4. ESTILO: o mesmo das folhas isométricas da Sede: pixel art detalhada HD, pixels nítidos, contorno escuro fino, materiais realistas e gastos, cores um pouco quentes. Luz vinda de cima à esquerda: uma sombra própria leve dentro do objeto, do lado de baixo e da direita, para dar volume.

5. FUNDO TRANSPARENTE de verdade. SEM sombra projetada no chão (o jogo faz a sombra pela altura), sem halo, sem chão, sem tapete embaixo.

6. NADA ESCRITO. Nenhum texto, letra, número, logo ou marca; papéis e telas só com rabiscos. Nenhum símbolo oficial de Ordem Paranormal: todo sigilo é inventado.

7. LEGÍVEL DE LONGE: no mapa, cada casa aparece com uns 40 px. De cima, o objeto tem que ser reconhecível pela forma e pela cor (a mesa de sinuca verde com as caçapas, a cadeira com o encosto, a planta com as folhas, a estante com os livros vistos de cima).

8. MÓDULOS (balcão do bar, bancadas, prateleiras, grades e paredes de cela): as pontas cortadas retas e lisas, para emendar lado a lado sem degrau.

9. NOMES: o nome da folha isométrica com "-cima" no fim (ex.: mesa-sinuca-cima.png), exatamente como na lista.

==========================================================================
PARTE 0 — TESTE: O BAR, AS PAREDES E AS FICHAS (faça primeiro e entregue sozinho)
==========================================================================
Faça a Parte 1 (o Bar) inteira, mais as peças abaixo, e entregue no vista-de-cima-teste.zip. O resto só depois que o estilo for aprovado.
  parede-cima-madeira.png .... 512×80 px, emenda dos dois lados (repete na horizontal): o topo de uma parede vista de cima, reboco claro e gasto com o lambri de madeira escura aparecendo na beira de baixo.
  ficha-agente.png ........... 256×256: um aro de metal envelhecido (latão escuro), redondo, com o MEIO TRANSPARENTE (o jogo põe o retrato do agente dentro e pinta o aro na cor dele), visto de cima.
  ficha-ameaca.png ........... 256×256: o mesmo aro em ferro escuro com detalhes vermelhos e pontas, o meio transparente.
""")
for i, (chave, pasta, piso, linhas) in enumerate(partes, 1):
    nome_sala = pasta.split(' ', 1)[1].upper()
    if chave == 'prisao':
        # a prisão mudou (parede e porta de aço no lugar da grade): o lote dela tem as peças isométricas e as de cima
        sep = '=' * 74
        txt.append(f'{sep}\nPARTE {i} — {nome_sala}\n{sep}\n  Está no PROMPT-PRISAO-CELAS.txt (as celas mudaram: parede de concreto e porta de aço no lugar da grade).\n')
        continue
    if chave == 'bar':
        # o bar é o teste: a parede dele já está na Parte 0
        cab = f'PARTE {i} — {nome_sala} ({len(linhas)} móveis) -> vista-de-cima-teste.zip (junto da Parte 0)'
        parede = ''
    else:
        cab = f'PARTE {i} — {nome_sala} ({len(linhas)} móveis + a parede) -> vista-de-cima-{chave}.zip'
        parede = f'  parede-cima-{piso}.png ... 512×80 px, emenda dos dois lados: o topo da parede deste cômodo visto de cima (o mesmo material das paredes da folha dele).\n'
    txt.append('==========================================================================\n' + cab + '\n==========================================================================\n' + parede + '\n'.join(linhas) + '\n')
txt.append(f"""==========================================================================
ENTREGA
==========================================================================
- Uma PNG por peça (e por estado), com o nome e o tamanho exatos da lista, fundo transparente.
- Primeiro o TESTE (Parte 0 + Parte 1) no vista-de-cima-teste.zip. Depois, cada parte no zip dela, com um LEIA-ME (o que fez e o que conferiu: o tamanho, a frente para baixo, a câmera de cima, o fundo) e os prompts. Ao todo, {total} móveis e 12 paredes.
- Salve cada zip nesta pasta, só quando a parte estiver completa:
  {PASTA_GPT}
- Outros chats estão trabalhando nesta pasta ao mesmo tempo: não mexa em nada que não seja deste lote. Trabalhe numa pasta sua, "Vista de cima".
""")
open(SAIDA, 'w', encoding='utf-8').write('\n'.join(txt))
print('móveis:', total, '| partes:', len(partes))
