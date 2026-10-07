"""Posição (em repouso) dos ossos principais e a caixa de cada região do corpo. Uso: blender -b -P medidas.py -- <base.gltf>"""
import sys

import bpy

arq = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=arq)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
corpo = max((o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('Icosphere')), key=lambda o: len(o.data.vertices))
print('corpo', corpo.name, 'pai', corpo.parent.name if corpo.parent else None, 'matriz', [round(v, 3) for v in corpo.matrix_world.to_translation()], 'escala arm', tuple(round(v, 3) for v in arm.scale), 'rot arm', tuple(round(v, 3) for v in arm.rotation_euler))
for nome in ('root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'ball_leaf_l'):
    b = arm.data.bones[nome]
    h = arm.matrix_world @ b.head_local
    t = arm.matrix_world @ b.tail_local
    print(f'  {nome:12s} cabeça ({h.x:+.3f}, {h.y:+.3f}, {h.z:+.3f})  ponta ({t.x:+.3f}, {t.y:+.3f}, {t.z:+.3f})')
# caixa de cada grupo dominante
import collections
grupos = {g.index: g.name for g in corpo.vertex_groups}
caixas = collections.defaultdict(lambda: [[9, 9, 9], [-9, -9, -9]])
mw = corpo.matrix_world
for v in corpo.data.vertices:
    if not v.groups:
        continue
    g = max(v.groups, key=lambda x: x.weight)
    nome = grupos[g.group]
    co = mw @ v.co
    c = caixas[nome]
    for i in range(3):
        c[0][i] = min(c[0][i], co[i])
        c[1][i] = max(c[1][i], co[i])
for nome in sorted(caixas):
    a, b = caixas[nome]
    print(f'  região {nome:14s} x {a[0]:+.3f}..{b[0]:+.3f}  y {a[1]:+.3f}..{b[1]:+.3f}  z {a[2]:+.3f}..{b[2]:+.3f}')
