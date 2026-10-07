"""
Filma um personagem animado no ângulo do tabuleiro do CRONA (Blender, sem janela).

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
if cfg.get('pxPorMetroPlano'):
    # o tamanho do pixel no plano da imagem (o mesmo da arte do personagem): a altura sai dele
    PX_POR_M_ALTURA = cfg['pxPorMetroPlano'] * math.cos(math.radians(cfg.get('elevacao', 30)))
W, H = cfg.get('largura', 192), cfg.get('altura', 256)
# o chão (a origem do personagem) cai nesta linha da imagem, contando de cima
CHAO_Y = cfg.get('chaoY', 232)
# quantos graus a câmera fica acima do chão (o tabuleiro é 30°: grade 2:1)
ELEVACAO = cfg.get('elevacao', 30)

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
            if (m.get('crona_vistas') or m.get('croma_vistas')):
                # personagem tirado da arte (montar_arte.py): a cor já vem pronta, uma por direção
                mc = m.copy()
                mc.name = m.name + '__cor'
                mn = bpy.data.materials.new(m.name + '__normal')
                mn.use_nodes = True
                nt = mn.node_tree
                for n in list(nt.nodes):
                    nt.nodes.remove(n)
                saida = nt.nodes.new('ShaderNodeOutputMaterial')
                geo = nt.nodes.new('ShaderNodeNewGeometry')
                mul = nt.nodes.new('ShaderNodeVectorMath')
                mul.operation = 'MULTIPLY_ADD'
                mul.inputs[1].default_value = (0.5, 0.5, 0.5)
                mul.inputs[2].default_value = (0.5, 0.5, 0.5)
                emi = nt.nodes.new('ShaderNodeEmission')
                nt.links.new(geo.outputs['Normal'], mul.inputs[0])
                nt.links.new(mul.outputs[0], emi.inputs['Color'])
                nt.links.new(emi.outputs[0], saida.inputs['Surface'])
                originais[m.name] = (m, mc, mn)
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
    px_por_m_plano = cfg.get('pxPorMetroPlano') or PX_POR_M_ALTURA / math.cos(math.radians(ELEVACAO))
    cam_d.ortho_scale = lado / px_por_m_plano
    cam_d.clip_start = 0.1
    cam_d.clip_end = 100
    cam = bpy.data.objects.new('camera', cam_d)
    scene.collection.objects.link(cam)
    cam.rotation_euler = (math.radians(90 - ELEVACAO), 0, math.radians(45))
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


def curvas_da_acao(acao):
    """As curvas da ação (Blender 4.4+: por camada, faixa e slot; antes: direto na ação)."""
    out = []
    for lay in getattr(acao, 'layers', []) or []:
        for st in lay.strips:
            for cb in getattr(st, 'channelbags', []) or []:
                out.extend((cb, fc) for fc in cb.fcurves)
    if not out and hasattr(acao, 'fcurves'):
        out = [(acao, fc) for fc in acao.fcurves]
    return out


def chibi(arm, spec):
    """
    Proporção chibi (como a arte dos agentes): escala fixa em alguns ossos (cabeça,
    mãos, pés maiores; pernas, tronco e braços mais curtos, no comprimento do osso).
    As animações não mexem na escala desses ossos (as curvas de escala saem), então a
    proporção vale em todo quadro. O boneco desce o que as pernas encurtaram.
    """
    if not spec:
        return
    regras = {}
    for nome, valor in spec.items():
        if nome == 'ergue':
            continue
        if nome in ('cabeca', 'Head'):
            regras['Head'] = (valor, valor, valor)
        elif nome == 'pescoco':
            regras['neck_01'] = (valor, valor, valor)
        elif nome == 'maos':
            for l in ('l', 'r'):
                regras[f'hand_{l}'] = (valor, valor, valor)
        elif nome == 'pes':
            for l in ('l', 'r'):
                regras[f'foot_{l}'] = (valor, valor, valor)
        elif nome == 'pernas':
            # a coxa e a canela encurtam (a canela herda da coxa)
            for l in ('l', 'r'):
                regras[f'thigh_{l}'] = (1.0, valor, 1.0)
        elif nome == 'tronco':
            regras['spine_02'] = (1.0, valor, 1.0)
        elif nome == 'bracos':
            for l in ('l', 'r'):
                regras[f'upperarm_{l}'] = (1.0, valor, 1.0)
    # quem fica depois de um osso encurtado não herda a escala dele (só a posição): senão a cabeça
    # achata junto com o tronco e o pé, junto com a perna
    for b in ('spine_03', 'neck_01', 'Head', 'clavicle_l', 'clavicle_r', 'foot_l', 'foot_r', 'hand_l', 'hand_r'):
        if b in arm.data.bones:
            arm.data.bones[b].inherit_scale = 'NONE'
    ossos = set(regras)
    for acao in bpy.data.actions:
        for dono, fc in curvas_da_acao(acao):
            if fc.data_path.endswith('.scale'):
                b = fc.data_path.split('"')[1] if '"' in fc.data_path else ''
                if b in ossos:
                    dono.fcurves.remove(fc)
    # o chibi olha para a câmera: a cabeça vai um pouco para trás em todo quadro (giro no eixo X do osso)
    graus = spec.get('ergue', 0)
    if graus:
        from mathutils import Quaternion
        q_off = Quaternion((1, 0, 0), math.radians(graus))
        for acao in bpy.data.actions:
            curvas = {}
            for dono, fc in curvas_da_acao(acao):
                if fc.data_path == 'pose.bones["Head"].rotation_quaternion':
                    curvas[fc.array_index] = fc
            if len(curvas) != 4:
                continue
            n = len(curvas[0].keyframe_points)
            if any(len(curvas[i].keyframe_points) != n for i in range(4)):
                continue
            for k in range(n):
                q = Quaternion([curvas[i].keyframe_points[k].co[1] for i in range(4)])
                q2 = q @ q_off
                for i in range(4):
                    kp = curvas[i].keyframe_points[k]
                    d = q2[i] - kp.co[1]
                    kp.co[1] += d
                    kp.handle_left[1] += d
                    kp.handle_right[1] += d
            for fc in curvas.values():
                fc.update()
    # quanto o pé está acima do chão antes e depois (na pose de repouso)
    def pe_z():
        bpy.context.view_layer.update()
        return min((arm.matrix_world @ arm.pose.bones[f'ball_{l}'].head).z for l in ('l', 'r'))
    ad = arm.animation_data
    guardada = ad.action if ad else None
    if ad:
        ad.action = None
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)
    antes = pe_z()
    for nome, esc in regras.items():
        if nome in arm.pose.bones:
            arm.pose.bones[nome].scale = esc
    depois = pe_z()
    arm.location.z -= (depois - antes)
    if ad and guardada:
        ad.action = guardada
    print('chibi:', {k: v for k, v in spec.items()}, 'desceu', round(depois - antes, 3), flush=True)


def ajustar_acoes(cfg):
    """
    Para esqueletos com outro tamanho (montar_arte.py): o deslocamento do quadril nas
    animações encolhe junto com as pernas ('quadril': fator), e a 'postura' soma um giro
    fixo (graus, em X, Y e Z do osso) a alguns ossos em todo quadro (braço mais aberto
    para não entrar na jaqueta, cabeça erguida...).
    """
    from mathutils import Euler, Quaternion
    fator = cfg.get('quadril')
    postura = {b: Euler([math.radians(g) for g in graus]).to_quaternion() for b, graus in (cfg.get('postura') or {}).items()}
    if not fator and not postura:
        return
    for acao in bpy.data.actions:
        if acao.name == 'Referencia':
            continue
        rot = {}
        for dono, fc in curvas_da_acao(acao):
            if fator and fc.data_path == 'pose.bones["pelvis"].location':
                for kp in fc.keyframe_points:
                    kp.co[1] *= fator
                    kp.handle_left[1] *= fator
                    kp.handle_right[1] *= fator
                fc.update()
            if fc.data_path.endswith('.rotation_quaternion') and '"' in fc.data_path:
                b = fc.data_path.split('"')[1]
                if b in postura:
                    rot.setdefault(b, {})[fc.array_index] = fc
        for b, curvas in rot.items():
            if len(curvas) != 4:
                continue
            n = len(curvas[0].keyframe_points)
            if any(len(curvas[i].keyframe_points) != n for i in range(4)):
                continue
            for k in range(n):
                q = Quaternion([curvas[i].keyframe_points[k].co[1] for i in range(4)]) @ postura[b]
                for i in range(4):
                    kp = curvas[i].keyframe_points[k]
                    d = q[i] - kp.co[1]
                    kp.co[1] += d
                    kp.handle_left[1] += d
                    kp.handle_right[1] += d
            for fc in curvas.values():
                fc.update()


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
    chibi(arm, cfg.get('chibi'))
    ajustar_acoes(cfg)
    mats = materiais_de_passe(objs)
    preparar_render(scene)
    cam = montar_camera(scene)
    # a frente do personagem: -Y do Blender (o glTF olha para +Z, que vira -Y)
    frente_local = Vector(cfg.get('frenteLocal', (0, -1, 0)))
    rot0 = arm.rotation_euler.copy()
    rot0_q = arm.rotation_quaternion.copy() if arm.rotation_mode == 'QUATERNION' else None
    arm.rotation_mode = 'XYZ'
    base_rot = rot0 if rot0_q is None else rot0_q.to_euler()
    info = {'largura': W, 'altura': H, 'chao': [W / 2, CHAO_Y], 'pxPorMetro': PX_POR_M_ALTURA, 'elevacao': ELEVACAO, 'animacoes': {}}
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
                for m, mc, mn in mats.values():
                    if (m.get('crona_vistas') or m.get('croma_vistas')):
                        mc.node_tree.nodes['vista'].attribute_name = f'cor_{d}'
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
