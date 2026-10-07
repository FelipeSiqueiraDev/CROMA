"""Lista as animações (ações) e os ossos dos arquivos do Quaternius. Uso: blender -b -P inspecionar.py -- <arquivo.glb|gltf|fbx> [...]"""
import sys

import bpy

arqs = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
for arq in arqs:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if arq.lower().endswith(('.glb', '.gltf')):
        bpy.ops.import_scene.gltf(filepath=arq)
    else:
        bpy.ops.import_scene.fbx(filepath=arq)
    print('=====', arq)
    for o in bpy.data.objects:
        info = o.type
        if o.type == 'MESH':
            info += f' {len(o.data.vertices)} vért., grupos {len(o.vertex_groups)}'
        if o.type == 'ARMATURE':
            info += f' {len(o.data.bones)} ossos'
        dims = tuple(round(v, 3) for v in o.dimensions)
        print(f'  objeto {o.name!r}: {info}, dimensões {dims}')
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    if arm:
        nomes = [b.name for b in arm.data.bones]
        print('  ossos:', ', '.join(nomes))
    print(f'  ações: {len(bpy.data.actions)}')
    for a in sorted(bpy.data.actions, key=lambda a: a.name):
        r = a.frame_range
        print(f'    {a.name}: {r[0]:.0f}..{r[1]:.0f}')
    print('  fps da cena:', bpy.context.scene.render.fps)
