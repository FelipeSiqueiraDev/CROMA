"""
Monta no Blender o personagem que saiu da arte (arte.py): o esqueleto da biblioteca
de animações (UAL) com os ossos no tamanho do personagem, as peças (corpo e braços)
presas a ele com os pesos e as 8 cores (uma por direção do tabuleiro).

Uso: blender -b --factory-startup -P montar_arte.py -- <ficha.json>

O esqueleto continua o mesmo da biblioteca (os mesmos nomes e a mesma orientação de
cada osso em repouso): só o comprimento e o lugar mudam. Então qualquer animação da
biblioteca serve. A pose da arte (a "referência", em que as peças foram esculpidas)
é a do Idle no quadro 0 com braços e pernas virados para as juntas da ficha; as peças
são levadas desta pose para o repouso do esqueleto (o contrário do que o esqueleto faz).
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

FICHA = sys.argv[sys.argv.index('--') + 1]
cfg = json.load(open(FICHA, encoding='utf-8'))
RAIZ = os.environ.get('CRONA_3D') or os.environ.get('CROMA_3D') or 'C:/Users/felip/CRONA-3D'
UAL = os.path.join(RAIZ, 'fontes', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb')


def caminho(p):
    return p if os.path.isabs(p) else os.path.join(RAIZ, p)


pasta = caminho(cfg['pecas'])
dados = np.load(os.path.join(pasta, 'pecas.npz'))
J = {k: (np.array(v) if not isinstance(v[0], list) else [np.array(p) for p in v]) for k, v in json.load(open(os.path.join(pasta, 'juntas.json')))['juntas'].items()}
OSSOS = [str(o) for o in dados['ossos']]
DIRECOES = [str(d) for d in dados['direcoes']]


def V(p):
    return Vector([float(x) for x in p])


# ---------------------------------------------------------------- esqueleto

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=UAL)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in list(bpy.data.objects):
    if o.type != 'ARMATURE':
        bpy.data.objects.remove(o)
arm.name = cfg['nome']
arm.data.name = cfg['nome']
arm.rotation_mode = 'QUATERNION'
arm.rotation_quaternion = (1, 0, 0, 0)

# cada osso: onde começa no personagem e quanto mede (a direção em repouso é a da biblioteca)
dist = lambda a, b: float(np.linalg.norm(np.asarray(b) - np.asarray(a)))
plano = {
    'pelvis': (J['quadril'], 0.06),
    'spine_01': (J['coluna'][0], dist(J['coluna'][0], J['coluna'][1])),
    'spine_02': (None, dist(J['coluna'][1], J['coluna'][2])),
    'spine_03': (None, dist(J['coluna'][2], J['coluna'][3])),
    'neck_01': (J['coluna'][3], dist(J['coluna'][3], J['pescoco'])),
    'Head': (None, dist(J['pescoco'], J['cabeca'])),
}
for l in ('l', 'r'):
    plano.update({
        f'clavicle_{l}': (J[f'clavicula_{l}'], dist(J[f'clavicula_{l}'], J[f'ombro_{l}'])),
        f'upperarm_{l}': (J[f'ombro_{l}'], dist(J[f'ombro_{l}'], J[f'cotovelo_{l}'])),
        f'lowerarm_{l}': (None, dist(J[f'cotovelo_{l}'], J[f'pulso_{l}'])),
        f'hand_{l}': (None, dist(J[f'pulso_{l}'], J[f'mao_{l}'])),
        f'thigh_{l}': (J[f'coxa_{l}'], dist(J[f'coxa_{l}'], J[f'joelho_{l}'])),
        f'calf_{l}': (None, dist(J[f'joelho_{l}'], J[f'tornozelo_{l}'])),
        f'foot_{l}': (None, dist(J[f'tornozelo_{l}'], J[f'planta_{l}'])),
        f'ball_{l}': (None, dist(J[f'planta_{l}'], J[f'ponta_{l}'])),
        f'ball_leaf_{l}': (None, 0.04),
    })
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
orig = {b.name: (b.head.copy(), b.tail.copy(), b.roll) for b in eb}


def ordem_hierarquia(bones):
    out = []

    def vai(b):
        out.append(b)
        for c in b.children:
            vai(c)
    for b in bones:
        if b.parent is None:
            vai(b)
    return out


novo_tail = {}
for b in ordem_hierarquia(list(eb)):
    h0, t0, roll = orig[b.name]
    direcao = (t0 - h0).normalized()
    if b.name in plano:
        cab, comp = plano[b.name]
        if cab is not None:
            h = V(cab)
        else:
            h = novo_tail[b.parent.name]  # emendado no pai
    elif b.parent is not None:
        # dedos e o resto: o mesmo afastamento do pai, encolhido pela metade
        ph0 = orig[b.parent.name][0]
        h = eb[b.parent.name].head + (h0 - ph0) * 0.5
        comp = (t0 - h0).length * 0.5
    else:
        h, comp = h0, (t0 - h0).length
    b.head = h
    b.tail = h + direcao * comp
    b.roll = roll
    novo_tail[b.name] = b.tail.copy()
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- pose da arte

ad = arm.animation_data or arm.animation_data_create()
ac = bpy.data.actions['Idle_Loop']
ad.action = ac
if getattr(ad, 'action_slot', None) is None and ac.slots:
    ad.action_slot = ac.slots[0]
bpy.context.scene.frame_set(int(ac.frame_range[0]))
bpy.context.view_layer.update()
locais = {pb.name: pb.rotation_quaternion.copy() for pb in arm.pose.bones}
ad.action = None
for pb in arm.pose.bones:
    pb.rotation_mode = 'QUATERNION'
    pb.location = (0, 0, 0)
    pb.scale = (1, 1, 1)
    pb.rotation_quaternion = (1, 0, 0, 0)
# braços e pernas: o giro (a torção) do Idle, virados para as juntas da ficha
alvos = {}
for l in ('l', 'r'):
    alvos.update({f'upperarm_{l}': J[f'cotovelo_{l}'], f'lowerarm_{l}': J[f'pulso_{l}'], f'hand_{l}': J[f'mao_{l}'],
                  f'thigh_{l}': J[f'joelho_{l}'], f'calf_{l}': J[f'tornozelo_{l}'], f'foot_{l}': J[f'planta_{l}'],
                  f'ball_{l}': J[f'ponta_{l}']})
for cadeia in (['upperarm', 'lowerarm', 'hand'], ['thigh', 'calf', 'foot', 'ball']):
    for l in ('l', 'r'):
        for nome in (f'{c}_{l}' for c in cadeia):
            pb = arm.pose.bones[nome]
            pb.rotation_quaternion = locais[nome]
            bpy.context.view_layer.update()
            m = pb.matrix.copy()
            cab = m.translation.copy()
            agora = Vector(m.col[1][:3]).normalized()
            quer = (V(alvos[nome]) - cab).normalized()
            giro = agora.rotation_difference(quer).to_matrix().to_4x4()
            pb.matrix = Matrix.Translation(cab) @ giro @ Matrix.Translation(-cab) @ m
            bpy.context.view_layer.update()
erro = max((arm.pose.bones[n].tail - V(alvos[n])).length for n in alvos)
print('pose da arte: maior erro nas juntas', round(erro, 4), 'm', flush=True)
# a pose de referência fica guardada como ação de um quadro
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)  # as da biblioteca não ficam no arquivo (o filmar.py importa de novo)
for pb in arm.pose.bones:
    pb.keyframe_insert('rotation_quaternion', frame=1)
    pb.keyframe_insert('location', frame=1)
ref = arm.animation_data.action
ref.name = 'Referencia'
ref.use_fake_user = True
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
M = {}
for pb in arm.pose.bones:
    M[pb.name] = np.array(pb.matrix @ pb.bone.matrix_local.inverted())

# ---------------------------------------------------------------- peças

mat = bpy.data.materials.new('arte')
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
saida_no = nt.nodes.new('ShaderNodeOutputMaterial')
emi = nt.nodes.new('ShaderNodeEmission')
at = nt.nodes.new('ShaderNodeAttribute')
at.name = 'vista'
at.attribute_name = 'cor_s'
nt.links.new(at.outputs['Color'], emi.inputs['Color'])
nt.links.new(emi.outputs[0], saida_no.inputs['Surface'])
mat['crona_vistas'] = 1

for nome in ('corpo', 'braco_l', 'braco_r'):
    v = dados[f'{nome}_v'].astype(float)
    f = dados[f'{nome}_f'].astype(int)
    W = dados[f'{nome}_W'].astype(float)
    cores = dados[f'{nome}_cores']
    # da pose da arte para o repouso: o inverso da mistura dos ossos em cada vértice
    Ms = np.stack([M[o] for o in OSSOS])
    mist = np.einsum('nb,bij->nij', W, Ms)
    vh = np.concatenate([v, np.ones((len(v), 1))], axis=1)
    rep = np.einsum('nij,nj->ni', np.linalg.inv(mist), vh)[:, :3]
    me = bpy.data.meshes.new(nome)
    me.from_pydata(rep.tolist(), [], f.tolist())
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    for j, o in enumerate(OSSOS):
        w = W[:, j]
        idx = np.nonzero(w > 1e-4)[0]
        if len(idx) == 0:
            continue
        vg = ob.vertex_groups.new(name=o)
        for i in idx:
            vg.add([int(i)], float(w[i]), 'REPLACE')
    for k, d in enumerate(DIRECOES):
        ca = me.color_attributes.new(f'cor_{d}', 'BYTE_COLOR', 'POINT')
        c = cores[k].astype(float) / 255.0
        # BYTE_COLOR guarda sRGB: a cor da arte entra como está
        rgba = np.concatenate([c, np.ones((len(c), 1))], axis=1).ravel()
        ca.data.foreach_set('color_srgb', rgba.tolist())
    me.materials.append(mat)
    mod = ob.modifiers.new('esqueleto', 'ARMATURE')
    mod.object = arm
    print(nome, len(v), 'vértices', flush=True)

# confere: na pose da arte, as peças voltam para onde foram esculpidas
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
for nome in ('corpo', 'braco_l', 'braco_r'):
    ob = bpy.data.objects[nome].evaluated_get(dg)
    me = ob.to_mesh()
    co = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    print('confere', nome, 'maior desvio', round(float(np.abs(co - dados[f'{nome}_v']).max()), 5), 'm', flush=True)
    ob.to_mesh_clear()

saida = caminho(cfg['saida'])
os.makedirs(os.path.dirname(saida), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=saida)
print('gravado', saida, flush=True)
