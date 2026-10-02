"""
Filma um personagem animado no ângulo do tabuleiro do CROMA (Blender, sem janela).

Uso:
  blender -b --factory-startup -P filmar.py -- <config.json>

O config diz: o arquivo do personagem (glb/gltf com esqueleto), o arquivo das
animações (glb), as animações a filmar (nome da ação, quadros) e a pasta de saída.

Para cada animação e cada uma das 8 direções grava, quadro a quadro:
  cor-<n>.png    a cor de cada parte, sem luz (o "albedo"), fundo transparente;
  normal-<n>.png a direção da superfície (para acender as velas do mapa depois);
e um ossos.json com onde ficam na imagem os pés, as mãos, a cabeça e o quadril.

A câmera é a do tabuleiro: ortográfica, 30° acima do chão (grade 2:1) e a 45°;
1 m de altura = 115,2 pixels (o dobro da tela no zoom 1: 57,6 px por metro).
O mundo do Blender tem X = x do tabuleiro e Y = −y do tabuleiro (Z para cima).
"""
import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

cfg = json.load(open(sys.argv[sys.argv.index('--') + 1], encoding='utf-8'))
SAIDA = cfg['saida']
PX_POR_M_ALTURA = cfg.get('pxPorMetro', 115.2)
W, H = cfg.get('largura', 192), cfg.get('altura', 256)
# o chão (a origem do personagem) cai nesta linha da imagem, contando de cima
CHAO_Y = cfg.get('chaoY', 232)

# as 8 direções: para onde a frente olha, no chão do tabuleiro (x, y)
R2 = math.sqrt(0.5)
FRENTE = {'ne': (0.0, -1.0), 'e': (R2, -R2), 'se': (1.0, 0.0), 's': (R2, R2), 'sw': (0.0, 1.0), 'w': (-R2, R2), 'nw': (-1.0, 0.0), 'n': (-R2, -R2)}
OSSOS = ['pelvis', 'Head', 'neck_01', 'spine_03', 'hand_l', 'hand_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r', 'lowerarm_l', 'lowerarm_r', 'calf_l', 'calf_r']


def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importar(arq):
    antes = set(bpy.data.objects)
    if arq.lower().endswith(('.glb', '.gltf')):
        bpy.ops.import_scene.gltf(filepath=arq)
    else:
        bpy.ops.import_scene.fbx(filepath=arq)
    return [o for o in bpy.data.objects if o not in antes]


def cor_base(mat):
    """(nó de textura ou None, cor) da cor base do material."""
    if not mat or not mat.use_nodes:
        return None, (0.8, 0.8, 0.8, 1.0)
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf:
        return None, (0.8, 0.8, 0.8, 1.0)
    entrada = bsdf.inputs['Base Color']
    if entrada.is_linked:
        return entrada.links[0].from_node, None
    return None, tuple(entrada.default_value)


def materiais_de_passe(objs):
    """Para cada material: uma versão que só emite a cor e outra que emite a normal."""
    originais = {}
    for o in objs:
        if o.type != 'MESH':
            continue
        for slot in o.material_slots:
            m = slot.material
            if not m or m.name in originais:
                continue
            tex, cor = cor_base(m)
            alfa_tex = None
            bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m.use_nodes else None
            if bsdf and bsdf.inputs['Alpha'].is_linked:
                alfa_tex = bsdf.inputs['Alpha'].links[0]
            # cor
            mc = m.copy()
            mc.name = m.name + '__cor'
            nt = mc.node_tree
            saida = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            emi = nt.nodes.new('ShaderNodeEmission')
            if tex is not None:
                novo_tex = nt.nodes.get(tex.name)
                nt.links.new(novo_tex.outputs[0], emi.inputs['Color'])
            else:
                emi.inputs['Color'].default_value = cor
            fim = emi
            if alfa_tex is not None:
                # cabelo em cartões: o transparente da textura corta (sem meio-termo)
                mix = nt.nodes.new('ShaderNodeMixShader')
                transp = nt.nodes.new('ShaderNodeBsdfTransparent')
                corte = nt.nodes.new('ShaderNodeMath')
                corte.operation = 'GREATER_THAN'
                corte.inputs[1].default_value = 0.5
                src = nt.nodes.get(alfa_tex.from_node.name)
                nt.links.new(src.outputs[alfa_tex.from_socket.name], corte.inputs[0])
                nt.links.new(corte.outputs[0], mix.inputs['Fac'])
                nt.links.new(transp.outputs[0], mix.inputs[1])
                nt.links.new(emi.outputs[0], mix.inputs[2])
                fim = mix
            nt.links.new(fim.outputs[0], saida.inputs['Surface'])
            # normal
            mn = mc.copy()
            mn.name = m.name + '__normal'
            nt = mn.node_tree
            saida = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            geo = nt.nodes.new('ShaderNodeNewGeometry')
            mul = nt.nodes.new('ShaderNodeVectorMath')
            mul.operation = 'MULTIPLY_ADD'
            mul.inputs[1].default_value = (0.5, 0.5, 0.5)
            mul.inputs[2].default_value = (0.5, 0.5, 0.5)
            nt.links.new(geo.outputs['Normal'], mul.inputs[0])
            emi2 = nt.nodes.new('ShaderNodeEmission')
            nt.links.new(mul.outputs[0], emi2.inputs['Color'])
            fim2 = emi2
            if alfa_tex is not None:
                mix2 = next(n for n in nt.nodes if n.type == 'MIX_SHADER')
                nt.links.new(emi2.outputs[0], mix2.inputs[2])
                fim2 = mix2
            nt.links.new(fim2.outputs[0], saida.inputs['Surface'])
            originais[m.name] = (m, mc, mn)
    return originais


def usar_materiais(objs, mats, qual):
    for o in objs:
        if o.type != 'MESH':
            continue
        for slot in o.material_slots:
            if not slot.material:
                continue
            nome = slot.material.name.split('__')[0]
            if nome in mats:
                slot.material = mats[nome][{'orig': 0, 'cor': 1, 'normal': 2}[qual]]


def montar_camera(scene):
    cam_d = bpy.data.cameras.new('camera')
    cam_d.type = 'ORTHO'
    # sensor AUTO: o ortho_scale vale para o lado maior da imagem
    lado = max(W, H)
    # 1 m vertical no mundo vira cos(30°) m no plano da imagem
    px_por_m_plano = PX_POR_M_ALTURA / math.cos(math.radians(30))
    cam_d.ortho_scale = lado / px_por_m_plano
    cam_d.clip_start = 0.1
    cam_d.clip_end = 100
    cam = bpy.data.objects.new('camera', cam_d)
    scene.collection.objects.link(cam)
    cam.rotation_euler = (math.radians(60), 0, math.radians(45))
    frente = cam.rotation_euler.to_matrix() @ Vector((0, 0, -1))
    alvo = Vector((0, 0, 0.9))
    cam.location = alvo - frente * 20
    scene.camera = cam
    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.resolution_percentage = 100
    bpy.context.view_layer.update()
    # desloca a imagem para o chão (0, 0, 0) cair em (W/2, CHAO_Y)
    p = world_to_camera_view(scene, cam, Vector((0, 0, 0)))
    px, py = p.x * W, (1 - p.y) * H
    cam_d.shift_x += (px - W / 2) / lado
    cam_d.shift_y += (py - CHAO_Y) / lado
    bpy.context.view_layer.update()
    return cam


def preparar_render(scene):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.cycles.use_adaptive_sampling = False
    scene.cycles.filter_width = 0.01
    scene.cycles.max_bounces = 0
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.display_settings.display_device = 'sRGB'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1


def acao_em(arm, acao):
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = acao
    if getattr(ad, 'action_slot', None) is None and getattr(acao, 'slots', None):
        ad.action_slot = acao.slots[0]


def projetar(scene, cam, co):
    p = world_to_camera_view(scene, cam, co)
    return [round(p.x * W, 2), round((1 - p.y) * H, 2), round(p.z, 4)]


def main():
    limpar()
    if cfg['personagem'].lower().endswith('.blend'):
        # o personagem montado (montar.py): já vem com roupa, cabelo e acessórios
        bpy.ops.wm.open_mainfile(filepath=cfg['personagem'])
        objs = list(bpy.context.scene.objects)
    else:
        objs = importar(cfg['personagem'])
    scene = bpy.context.scene
    # o que não é do personagem (esferas de ajuda do arquivo) sai
    for o in list(objs):
        if o.type == 'MESH' and o.name.startswith('Icosphere'):
            bpy.data.objects.remove(o)
            objs.remove(o)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    if cfg.get('animacoes_arquivo') and cfg['animacoes_arquivo'] != cfg['personagem']:
        # só as ações interessam: o boneco do arquivo de animações sai
        for arq in (cfg['animacoes_arquivo'] if isinstance(cfg['animacoes_arquivo'], list) else [cfg['animacoes_arquivo']]):
            extra = importar(arq)
            for o in extra:
                bpy.data.objects.remove(o)
    if 'escala' in cfg:
        e = cfg['escala']
        arm.scale = (e, e, e)
    mats = materiais_de_passe(objs)
    preparar_render(scene)
    cam = montar_camera(scene)
    # a frente do personagem: -Y do Blender (o glTF olha para +Z, que vira -Y)
    frente_local = Vector(cfg.get('frenteLocal', (0, -1, 0)))
    rot0 = arm.rotation_euler.copy()
    rot0_q = arm.rotation_quaternion.copy() if arm.rotation_mode == 'QUATERNION' else None
    arm.rotation_mode = 'XYZ'
    base_rot = rot0 if rot0_q is None else rot0_q.to_euler()
    info = {'largura': W, 'altura': H, 'chao': [W / 2, CHAO_Y], 'pxPorMetro': PX_POR_M_ALTURA, 'animacoes': {}}
    # a cena fica guardada entre um quadro e outro (só a malha deformada muda)
    scene.render.use_persistent_data = True

    def quadros(anim):
        acao = bpy.data.actions[anim['acao']]
        ini, fim = acao.frame_range
        n = anim['quadros']
        # laço: n quadros iguais no ciclo (o último não repete o primeiro); uma vez: do início ao fim
        laco = anim.get('laco', True)
        tempos = [ini + (fim - ini) * i / n for i in range(n)] if laco else [ini + (fim - ini) * i / max(1, n - 1) for i in range(n)]
        return acao, ini, fim, n, laco, tempos

    def virar(d):
        fx, fy = FRENTE[d]
        alvo = Vector((fx, -fy, 0))
        ang = math.atan2(alvo.y, alvo.x) - math.atan2(frente_local.y, frente_local.x)
        arm.rotation_euler = (base_rot.x, base_rot.y, base_rot.z + ang)

    direcoes = cfg.get('direcoes', list(FRENTE))
    # um passe de cada vez (trocar o material obriga o Blender a recompilar: uma troca por passe)
    for qual, vt in (('cor', 'Standard'), ('normal', 'Raw')):
        usar_materiais(objs, mats, qual)
        scene.view_settings.view_transform = vt
        for anim in cfg['animacoes']:
            acao, ini, fim, n, laco, tempos = quadros(anim)
            acao_em(arm, acao)
            if qual == 'cor':
                info['animacoes'][anim['nome']] = {'acao': anim['acao'], 'quadros': n, 'laco': laco, 'faixa': [ini, fim], 'direcoes': {}}
            for d in direcoes:
                virar(d)
                pasta = os.path.join(SAIDA, anim['nome'], d)
                os.makedirs(pasta, exist_ok=True)
                ossos_quadros = []
                for i, t in enumerate(tempos):
                    scene.frame_set(int(math.floor(t)), subframe=t - math.floor(t))
                    bpy.context.view_layer.update()
                    if qual == 'cor':
                        ossos = {}
                        for nome in OSSOS:
                            pb = arm.pose.bones.get(nome)
                            if pb:
                                w = arm.matrix_world @ pb.head
                                # na imagem (x, y, profundidade), o ponto do chão embaixo dele e a altura em metros
                                chao = projetar(scene, cam, Vector((w.x, w.y, 0.0)))
                                ossos[nome] = projetar(scene, cam, w) + chao[:2] + [round(w.z, 4)]
                        ossos_quadros.append(ossos)
                    scene.render.filepath = os.path.join(pasta, f'{qual}-{i:02d}.png')
                    bpy.ops.render.render(write_still=True)
                if qual == 'cor':
                    info['animacoes'][anim['nome']]['direcoes'][d] = {'ossos': ossos_quadros}
                print(f'filmado ({qual}): {anim["nome"]} {d} ({n} quadros)', flush=True)
    json.dump(info, open(os.path.join(SAIDA, 'filmagem.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('pronto', SAIDA, flush=True)


main()
