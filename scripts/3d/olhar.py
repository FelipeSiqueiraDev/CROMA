"""
Olhada rápida: importa arquivos (corpo, cabelos...) e grava uma imagem de cada direção,
com luz simples, na câmera do tabuleiro (ou mais perto, com --zoom).
Uso: blender -b -P olhar.py -- <saida.png> <zoom> <alvo_z> <arquivo> [<arquivo> ...]
"""
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
saida, zoom, alvo_z, arqs = args[0], float(args[1]), float(args[2]), args[3:]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
for arq in arqs:
    if arq.lower().endswith('.blend'):
        bpy.ops.wm.open_mainfile(filepath=arq)
        scene = bpy.context.scene
    elif arq.lower().endswith(('.glb', '.gltf')):
        bpy.ops.import_scene.gltf(filepath=arq)
    else:
        bpy.ops.import_scene.fbx(filepath=arq)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'):
        bpy.data.objects.remove(o)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = False
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
W, H = 256, 320
scene.render.resolution_x, scene.render.resolution_y = W, H
sun = bpy.data.lights.new('sol', 'SUN')
sun.energy = 3.0
so = bpy.data.objects.new('sol', sun)
so.rotation_euler = (math.radians(40), 0, math.radians(-30))
scene.collection.objects.link(so)
mundo = bpy.data.worlds.new('mundo')
mundo.color = (0.4, 0.4, 0.42)
scene.world = mundo
cam_d = bpy.data.cameras.new('cam')
cam_d.type = 'ORTHO'
cam_d.ortho_scale = max(W, H) / (115.2 / math.cos(math.radians(30))) / zoom
cam = bpy.data.objects.new('cam', cam_d)
scene.collection.objects.link(cam)
cam.rotation_euler = (math.radians(60), 0, math.radians(45))
frente = cam.rotation_euler.to_matrix() @ Vector((0, 0, -1))
cam.location = Vector((0, 0, alvo_z)) - frente * 20
scene.camera = cam
raizes = [o for o in bpy.data.objects if o.parent is None and o.type in ('ARMATURE', 'MESH', 'EMPTY')]
imgs = []
base = os.path.splitext(saida)[0]
for i, ang in enumerate((0, 90, 180, 270)):
    for o in raizes:
        o.rotation_mode = 'XYZ'
        o.rotation_euler.z = math.radians(ang - 45)
    scene.render.filepath = f'{base}-{i}.png'
    bpy.ops.render.render(write_still=True)
    imgs.append(scene.render.filepath)
print('pronto', imgs)
