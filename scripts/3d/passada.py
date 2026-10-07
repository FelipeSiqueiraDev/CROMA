"""Quanto o corpo anda em cada ciclo das animações de andar (a versão com movimento do quadril, RM). Uso: blender -b -P passada.py -- <UAL_RM.glb> <ação> [...]"""
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
arq, acoes = args[0], args[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=arq)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
fps = bpy.context.scene.render.fps
for nome in acoes:
    a = bpy.data.actions.get(nome)
    if not a:
        print('sem', nome)
        continue
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = a
    if getattr(ad, 'action_slot', None) is None and a.slots:
        ad.action_slot = a.slots[0]
    ini, fim = a.frame_range
    pos = []
    for f in (ini, fim):
        bpy.context.scene.frame_set(int(f))
        bpy.context.view_layer.update()
        root = arm.pose.bones['root']
        pelvis = arm.pose.bones['pelvis']
        pos.append((arm.matrix_world @ root.head, arm.matrix_world @ pelvis.head))
    d_root = (pos[1][0] - pos[0][0])
    d_pel = (pos[1][1] - pos[0][1])
    dur = (fim - ini) / fps
    print(f'{nome}: quadros {ini:.0f}..{fim:.0f} ({dur:.3f} s a {fps} qps); raiz andou {tuple(round(v, 3) for v in d_root)}, quadril {tuple(round(v, 3) for v in d_pel)}; velocidade {d_pel.length / dur:.3f} m/s')
