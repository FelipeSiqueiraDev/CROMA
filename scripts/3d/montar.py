"""
Monta um personagem do CROMA no Blender, a partir do boneco-base do Quaternius
e de uma ficha (JSON): proporções, pele, cabelo, roupas e acessórios.

Uso: blender -b --factory-startup -P montar.py -- <ficha.json>

As roupas saem do próprio corpo: as faces de cada região (pelo osso que manda
em cada vértice) são copiadas e afastadas da pele pela espessura da peça, com
os mesmos pesos do esqueleto, então dobram junto com o corpo. O que a roupa
cobre do corpo sai (nada atravessa). Cabelo, óculos e acessórios vão presos
ao osso da cabeça, das mãos ou do tronco.
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

FICHA = sys.argv[sys.argv.index('--') + 1]
cfg = json.load(open(FICHA, encoding='utf-8'))
# a pasta de trabalho do 3D (fora do repositório): fontes do Quaternius, personagens montados, filmagens
RAIZ = os.environ.get('CROMA_3D', 'C:/Users/felip/CROMA-3D')
BASES = os.path.join(RAIZ, 'fontes', 'Universal Base Characters[Standard]')
CABELOS = os.path.join(BASES, 'Hairstyles', 'Origin at 0', 'glTF (Godot)')
BASE = {'homem': 'Superhero_Male_FullBody', 'mulher': 'Superhero_Female_FullBody'}

REGIAO = {'Head': 'cabeca', 'neck_01': 'pescoco', 'spine_01': 'tronco', 'spine_02': 'tronco', 'spine_03': 'tronco',
          'clavicle_l': 'tronco', 'clavicle_r': 'tronco', 'pelvis': 'quadril', 'upperarm_l': 'braco', 'upperarm_r': 'braco',
          'lowerarm_l': 'antebraco', 'lowerarm_r': 'antebraco', 'thigh_l': 'coxa', 'thigh_r': 'coxa', 'calf_l': 'canela',
          'calf_r': 'canela', 'foot_l': 'pe', 'foot_r': 'pe', 'ball_l': 'pe', 'ball_r': 'pe'}


def regiao_do_osso(nome):
    if nome in REGIAO:
        return REGIAO[nome]
    if nome.startswith(('hand_', 'index_', 'middle_', 'pinky_', 'ring_', 'thumb_')):
        return 'mao'
    return 'outro'


def importar(arq):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=arq)
    return [o for o in bpy.data.objects if o not in antes]


def material(nome, cor, rugoso=0.8):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    r, g, b = [c / 255.0 for c in cor[:3]]
    # a cor da ficha está em sRGB; o Blender guarda linear
    lin = [((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in (r, g, b)]
    bsdf.inputs['Base Color'].default_value = (*lin, 1.0)
    bsdf.inputs['Roughness'].default_value = rugoso
    return m


def com_um_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.material_index = 0


# ---------------------------------------------------------------- o corpo

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
objs = importar(os.path.join(BASES, 'Base Characters', 'Godot - UE', BASE[cfg['base']] + '.gltf'))
for o in list(objs):
    if o.type == 'MESH' and o.name.startswith('Icosphere'):
        objs.remove(o)
        bpy.data.objects.remove(o)
arm = next(o for o in objs if o.type == 'ARMATURE')
arm.name = cfg['nome']
corpo = max((o for o in objs if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
corpo.name = cfg['nome'] + '_corpo'
olhos = next((o for o in objs if o.type == 'MESH' and o.name.startswith('Eyes')), None)
sobrancelhas = next((o for o in objs if o.type == 'MESH' and o.name.startswith('Eyebrows')), None)

grupos = {g.index: g.name for g in corpo.vertex_groups}


def dominantes(obj):
    nomes = {g.index: g.name for g in obj.vertex_groups}
    out = []
    for v in obj.data.vertices:
        out.append(nomes[max(v.groups, key=lambda x: x.weight).group] if v.groups else None)
    return out


# ---------------------------------------------------------------- proporções

def proporcoes(p):
    """
    Afina ou engrossa o corpo sem mexer no esqueleto de animação: ombros (aproxima os
    braços do tronco), tronco (largura e profundidade), braços e pernas (grossura em volta
    do osso). Mexe nos vértices e nos ossos juntos, na pose de repouso.
    """
    if not p:
        return
    ombros = p.get('ombros', 1.0)
    tronco = p.get('tronco', 1.0)
    membros = p.get('bracos', 1.0)
    pernas = p.get('pernas', 1.0)
    homem = cfg['base'] == 'homem'
    xi, xo = (0.12, 0.22) if homem else (0.10, 0.153)  # meio do tronco e ponta do ombro
    z0, z1 = (0.92, 1.08) if homem else (0.90, 1.05)  # da cintura para cima o tronco afina
    zn0, zn1 = (1.56, 1.62) if homem else (1.50, 1.56)  # e volta ao normal no pescoço
    delta = (1 - ombros) * xo  # quanto os braços chegam para dentro

    def suave(a, b, z):
        t = min(1.0, max(0.0, (z - a) / (b - a)))
        return t * t * (3 - 2 * t)

    def fator(z):
        return 1 + (tronco - 1) * suave(z0, z1, z) * (1 - suave(zn0, zn1, z))

    def novo_x(x, z, braco=False):
        ax = abs(x)
        if braco or ax > xo:
            return math.copysign(ax - delta, x)
        k = fator(z)
        if ax <= xi:
            return x * k
        # entre o meio do tronco e a ponta do ombro: liga a largura do tronco à dos ombros
        t = (ax - xi) / (xo - xi)
        return math.copysign(xi * k + t * ((xo - delta) - xi * k), x)

    # ossos
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for eb in arm.data.edit_bones:
        braco = eb.name.startswith(('upperarm', 'lowerarm', 'hand', 'index', 'middle', 'pinky', 'ring', 'thumb'))
        for ponta in ('head', 'tail'):
            co = getattr(eb, ponta).copy()
            co.x = novo_x(co.x, co.z, braco)
            setattr(eb, ponta, co)
    bpy.ops.object.mode_set(mode='OBJECT')
    # vértices: a mesma conta dos ossos e, nos membros, a grossura em volta do osso
    dom = dominantes(corpo)
    bones = arm.data.bones
    for v, d in zip(corpo.data.vertices, dom):
        reg = regiao_do_osso(d) if d else 'outro'
        co = v.co.copy()
        if reg in ('cabeca', 'outro'):
            continue
        co.x = novo_x(co.x, co.z, reg in ('braco', 'antebraco', 'mao'))
        if reg in ('tronco', 'quadril', 'pescoco'):
            k = fator(co.z)
            co.y = co.y * k + (1 - k) * 0.02
        k = membros if reg in ('braco', 'antebraco') else pernas if reg in ('coxa', 'canela') else 1.0
        if k != 1.0 and d in bones:
            b = bones[d]
            a, t = b.head_local, b.tail_local
            eixo = (t - a).normalized()
            rel = co - a
            ao_longo = eixo * rel.dot(eixo)
            co = a + ao_longo + (rel - ao_longo) * k
        v.co = co


proporcoes(cfg.get('proporcoes'))
DOM = dominantes(corpo)


def crescer_em_volta(obj, fator, por_lado=True, avanca=0.0):
    """Cresce os vértices em volta do centro de cada lado (olho esquerdo e direito), e puxa um pouco para a frente."""
    if not obj or fator == 1.0:
        return
    vs = obj.data.vertices
    grupos_lado = [[v for v in vs if v.co.x > 0], [v for v in vs if v.co.x <= 0]] if por_lado else [list(vs)]
    for g in grupos_lado:
        if not g:
            continue
        c = sum((v.co for v in g), Vector()) / len(g)
        for v in g:
            v.co = c + (v.co - c) * fator + Vector((0, -avanca, 0))


crescer_em_volta(olhos, cfg.get('olhos_escala', 1.0), avanca=cfg.get('olhos_avanca', 0.0))
crescer_em_volta(sobrancelhas, cfg.get('sobrancelha_escala', 1.0), avanca=cfg.get('olhos_avanca', 0.0))

# a pele: cor chapada (o sombreado vem depois, na pixel art)
com_um_material(corpo, material(cfg['nome'] + '_pele', cfg['pele']))
if sobrancelhas:
    com_um_material(sobrancelhas, material(cfg['nome'] + '_sobrancelha', cfg.get('sobrancelha', cfg['cabelo']['cor'])))
if olhos and cfg.get('olhos'):
    com_um_material(olhos, material(cfg['nome'] + '_olho', cfg['olhos']))


# ---------------------------------------------------------------- roupas a partir do corpo

def condicao(c):
    """Uma condição da ficha vira uma função (índice, posição, região) -> bool."""
    regs = set(c.get('regioes', []))
    zmin, zmax = c.get('z', [-9, 9])
    def ok(i, co, reg):
        if regs and reg not in regs:
            return False
        if not (zmin <= co.z <= zmax):
            return False
        if 'xmax' in c and abs(co.x) > c['xmax']:
            return False
        if 'xmin' in c and abs(co.x) < c['xmin']:
            return False
        if 'frente' in c and (co.y < 0) != c['frente']:
            return False
        return True
    return ok


def selecao(spec):
    """Vértices escolhidos: algum 'incluir' e nenhum 'excluir'."""
    inc = [condicao(c) for c in spec.get('incluir', [])]
    exc = [condicao(c) for c in spec.get('excluir', [])]
    out = []
    for i, v in enumerate(corpo.data.vertices):
        reg = regiao_do_osso(DOM[i]) if DOM[i] else 'outro'
        co = v.co
        s = any(f(i, co, reg) for f in inc) and not any(f(i, co, reg) for f in exc)
        out.append(s)
    return out


def peca_do_corpo(spec):
    nome = cfg['nome'] + '_' + spec['nome']
    sel = selecao(spec)
    o = corpo.copy()
    o.data = corpo.data.copy()
    o.name = nome
    scene.collection.objects.link(o)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.verts.ensure_lookup_table()
    fora = [f for f in bm.faces if not all(sel[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=fora, context='FACES')
    soltos = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=soltos, context='VERTS')
    bm.to_mesh(o.data)
    bm.free()
    com_um_material(o, material(nome, spec['cor'], spec.get('rugoso', 0.8)))
    bpy.context.view_layer.objects.active = o
    # a roupa não marca o corpo: alisa a forma (na pose de repouso), depois afasta da pele e dá espessura
    if spec.get('alisa', 0):
        lis = o.modifiers.new('alisa', 'SMOOTH')
        lis.iterations = int(spec['alisa'])
        lis.factor = 0.5
        while o.modifiers.find('alisa') > 0:
            bpy.ops.object.modifier_move_up(modifier='alisa')
    dsp = o.modifiers.new('afasta', 'DISPLACE')
    dsp.direction = 'NORMAL'
    dsp.mid_level = 0.0
    dsp.strength = spec['espessura']
    alvo = 1 if spec.get('alisa', 0) else 0
    while o.modifiers.find('afasta') > alvo:
        bpy.ops.object.modifier_move_up(modifier='afasta')
    if spec.get('solido', 0.004) > 0:
        sol = o.modifiers.new('grossura', 'SOLIDIFY')
        sol.thickness = spec.get('solido', 0.004)
        sol.offset = 1.0
        sol.use_rim = True
    if spec.get('suave'):
        sub = o.modifiers.new('suave', 'SUBSURF')
        sub.levels = sub.render_levels = 1
    return o, sel


def calcado(spec):
    """
    Sapato ou bota: a casca (envoltória) do pé e do tornozelo de cada lado, um pouco
    maior que o pé, sem os dedos; o calcanhar segue o osso do pé e a ponta, o dos dedos.
    """
    pecas = []
    for lado in ('l', 'r'):
        ossos = (f'foot_{lado}', f'ball_{lado}')
        topo = spec.get('topo', 0.13)
        pts = []
        for i, v in enumerate(corpo.data.vertices):
            d = DOM[i]
            if d in ossos or (d == f'calf_{lado}' and v.co.z < topo):
                pts.append(v.co.copy())
        bm = bmesh.new()
        for p in pts:
            bm.verts.new(p)
        casca = bmesh.ops.convex_hull(bm, input=bm.verts)
        for g in casca['geom_interior'] + casca['geom_unused']:
            if isinstance(g, bmesh.types.BMVert) and g.is_valid and not g.link_faces:
                bm.verts.remove(g)
        # cresce para fora do centro do pé (a espessura do couro) e sobe a sola um pouco do chão
        c = sum((v.co for v in bm.verts), Vector()) / max(1, len(bm.verts))
        for v in bm.verts:
            dirc = v.co - Vector((c.x, c.y, v.co.z * 0.3 + c.z * 0.7))
            if dirc.length > 1e-6:
                v.co += dirc.normalized() * spec.get('espessura', 0.012)
            v.co.z = max(v.co.z, -0.005)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
        me = bpy.data.meshes.new(f'{cfg["nome"]}_{spec["nome"]}_{lado}')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(me.name, me)
        scene.collection.objects.link(o)
        com_um_material(o, material(me.name, spec['cor'], spec.get('rugoso', 0.4)))
        # pesos: do calcanhar até o meio do pé no osso do pé; a ponta no dos dedos (com transição)
        y_bola = arm.data.bones[f'ball_{lado}'].head_local.y
        gp = o.vertex_groups.new(name=f'foot_{lado}')
        gb = o.vertex_groups.new(name=f'ball_{lado}')
        gc = o.vertex_groups.new(name=f'calf_{lado}')
        for v in me.vertices:
            t = min(1.0, max(0.0, (y_bola + 0.02 - v.co.y) / 0.05))  # 0 atrás, 1 na ponta
            if v.co.z > topo - 0.02:
                gc.add([v.index], 0.6, 'REPLACE')
                gp.add([v.index], 0.4, 'REPLACE')
                continue
            if t > 0:
                gb.add([v.index], t, 'REPLACE')
            if t < 1:
                gp.add([v.index], 1 - t, 'REPLACE')
        mod = o.modifiers.new('esqueleto', 'ARMATURE')
        mod.object = arm
        o.parent = arm
        sub = o.modifiers.new('suave', 'SUBSURF')
        sub.levels = sub.render_levels = 1
        pecas.append(o)
    return pecas


def faixa(spec):
    """Faixa por cima de uma roupa (friso, punho, barra): as faces do corpo escolhidas, um pouco mais afastadas que a roupa."""
    o, sel = peca_do_corpo(dict(spec, cobre=False))
    return o


cobertos = [False] * len(corpo.data.vertices)
for spec in cfg.get('roupas', []):
    if spec.get('tipo') == 'calcado':
        calcado(spec)
        # o pé e o tornozelo saem do corpo
        sel = [(DOM[i] or '').startswith(('foot_', 'ball_')) or ((DOM[i] or '').startswith('calf_') and v.co.z < spec.get('topo', 0.13) - 0.02)
               for i, v in enumerate(corpo.data.vertices)]
        cobertos = [a or b for a, b in zip(cobertos, sel)]
        print('calçado', spec['nome'])
        continue
    if spec.get('tipo') == 'faixa':
        faixa(spec)
        print('faixa', spec['nome'])
        continue
    o, sel = peca_do_corpo(spec)
    if spec.get('cobre', True):
        cobertos = [a or b for a, b in zip(cobertos, sel)]
    print('roupa', o.name, sum(sel), 'vértices')

# o corpo debaixo da roupa sai (as bordas ficam, para não abrir fresta)
bm = bmesh.new()
bm.from_mesh(corpo.data)
bm.verts.ensure_lookup_table()
tirar = [f for f in bm.faces if all(cobertos[v.index] for v in f.verts)]
# só onde todos os vizinhos também estão cobertos (uma faixa de pele fica embaixo da borda da roupa)
borda = set()
for f in bm.faces:
    if not all(cobertos[v.index] for v in f.verts):
        for v in f.verts:
            borda.add(v.index)
tirar = [f for f in tirar if not any(v.index in borda for v in f.verts)]
bmesh.ops.delete(bm, geom=tirar, context='FACES')
bm.to_mesh(corpo.data)
bm.free()


# ---------------------------------------------------------------- peças presas a um osso

def prender(obj, osso, peso=None):
    """Prende o objeto ao osso (segue o osso inteiro)."""
    mw = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = 'BONE'
    obj.parent_bone = osso
    bpy.context.view_layer.update()
    obj.matrix_world = mw


def malha(nome, verts, faces, cor, rugoso=0.6):
    me = bpy.data.meshes.new(nome)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(nome, me)
    scene.collection.objects.link(o)
    o.data.materials.append(material(nome, cor, rugoso))
    return o


def tubo(nome, pontos, raio, cor, lados=6, fechado=False):
    """Um tubo fino passando pelos pontos (corrente, aro, alça)."""
    verts, faces = [], []
    n = len(pontos)
    for i, p in enumerate(pontos):
        p = Vector(p)
        a = Vector(pontos[(i + 1) % n] if fechado else pontos[min(i + 1, n - 1)])
        b = Vector(pontos[(i - 1) % n] if fechado else pontos[max(i - 1, 0)])
        t = (a - b).normalized()
        u = t.orthogonal().normalized()
        w = t.cross(u)
        for k in range(lados):
            ang = 2 * math.pi * k / lados
            verts.append(tuple(p + (u * math.cos(ang) + w * math.sin(ang)) * raio))
    for i in range(n if fechado else n - 1):
        j = (i + 1) % n
        for k in range(lados):
            k2 = (k + 1) % lados
            faces.append((i * lados + k, i * lados + k2, j * lados + k2, j * lados + k))
    return malha(nome, verts, faces, cor)


def caixa(nome, centro, tam, cor, rot=None):
    cx, cy, cz = centro
    sx, sy, sz = [t / 2 for t in tam]
    vs = [(cx + dx * sx, cy + dy * sy, cz + dz * sz) for dx in (-1, 1) for dy in (-1, 1) for dz in (-1, 1)]
    fs = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    o = malha(nome, vs, fs, cor)
    if rot:
        o.rotation_euler = rot
    return o


def centro_dos_olhos():
    if not olhos:
        return None
    mw = olhos.matrix_world
    esq = [mw @ v.co for v in olhos.data.vertices if (mw @ v.co).x > 0]
    dir_ = [mw @ v.co for v in olhos.data.vertices if (mw @ v.co).x <= 0]
    m = lambda vs: sum(vs, Vector()) / len(vs)
    frente = min((mw @ v.co).y for v in olhos.data.vertices)
    return m(esq), m(dir_), frente


def oculos(spec):
    ce, cd, frente = centro_dos_olhos()
    r = spec.get('raio', 0.021)
    esp = spec.get('aro', 0.0035)
    y = frente - spec.get('afastado', 0.012)
    pecas = []
    for nome, c in (('aro_e', ce), ('aro_d', cd)):
        pts = []
        for k in range(16):
            ang = 2 * math.pi * k / 16
            # um pouco mais largo que alto (aro arredondado)
            pts.append((c.x + math.cos(ang) * r * 1.12, y, c.z + math.sin(ang) * r * 0.92))
        pecas.append(tubo(cfg['nome'] + '_' + nome, pts, esp, spec['cor'], fechado=True))
    ponte = [(cd.x + r * 1.1, y, cd.z + r * 0.3), (0, y - 0.004, cd.z + r * 0.45), (ce.x - r * 1.1, y, ce.z + r * 0.3)]
    pecas.append(tubo(cfg['nome'] + '_ponte', ponte, esp * 0.9, spec['cor']))
    for lado, c in ((1, ce), (-1, cd)):
        x = c.x + lado * r * 1.12
        haste = [(x, y, c.z + r * 0.2), (x + lado * 0.012, y + 0.04, c.z + r * 0.3), (x + lado * 0.018, y + 0.095, c.z - 0.005)]
        pecas.append(tubo(cfg['nome'] + f'_haste{lado}', haste, esp * 0.8, spec['cor']))
    for p in pecas:
        prender(p, 'Head')


def cabelo(spec):
    if not spec.get('arquivo'):
        return
    novos = importar(os.path.join(CABELOS, spec['arquivo'] + '.gltf'))
    malhas = [o for o in novos if o.type == 'MESH']
    for o in novos:
        if o.type == 'ARMATURE':
            for m in malhas:
                if m.parent == o:
                    mw = m.matrix_world.copy()
                    m.parent = None
                    m.matrix_world = mw
            bpy.data.objects.remove(o)
    for m in malhas:
        for mod in list(m.modifiers):
            if mod.type == 'ARMATURE':
                m.modifiers.remove(mod)
        m.name = cfg['nome'] + '_' + spec['arquivo']
        com_um_material(m, material(m.name, spec['cor'], 0.6))
        esc = spec.get('escala')
        if esc:
            # cresce em volta do centro da cabeça
            c = Vector(spec.get('centro', (0, 0.0, 1.70)))
            for v in m.data.vertices:
                v.co = c + (v.co - c) * Vector(esc)
        prender(m, 'Head')
    return malhas


cabelo(cfg.get('cabelo', {}))
if cfg.get('barba'):
    cabelo(cfg['barba'])
if cfg.get('oculos'):
    oculos(cfg['oculos'])


def capuz(spec):
    """O capuz caído atrás do pescoço: um rolo grosso que abraça a nuca e os ombros."""
    cx, cy, cz = spec.get('centro', (0, 0.05, 1.47))
    rx, ry = spec.get('raio', (0.15, 0.13))
    grossura = spec.get('grossura', 0.05)
    voltas, lados = 20, 8
    verts, faces = [], []
    # da frente-esquerda, por trás, até a frente-direita (a frente fica aberta)
    a0, a1 = math.radians(-30), math.radians(210)
    pontos = []
    for i in range(voltas + 1):
        a = a0 + (a1 - a0) * i / voltas
        # mais alto e mais grosso atrás
        atras = max(0.0, math.sin(a))
        pontos.append((Vector((cx + math.cos(a) * rx, cy + math.sin(a) * ry, cz + atras * spec.get('sobe', 0.05))), grossura * (0.6 + 0.6 * atras)))
    for i, (p, g) in enumerate(pontos):
        a = pontos[min(i + 1, voltas)][0] - pontos[max(i - 1, 0)][0]
        t = a.normalized()
        u = Vector((0, 0, 1)).cross(t).normalized()
        w = t.cross(u)
        for k in range(lados):
            ang = 2 * math.pi * k / lados
            verts.append(tuple(p + (u * math.cos(ang) + w * math.sin(ang) * 0.8) * g))
    for i in range(voltas):
        for k in range(lados):
            k2 = (k + 1) % lados
            faces.append((i * lados + k, i * lados + k2, (i + 1) * lados + k2, (i + 1) * lados + k))
    o = malha(cfg['nome'] + '_capuz', verts, faces, spec['cor'], 0.85)
    sub = o.modifiers.new('suave', 'SUBSURF')
    sub.levels = sub.render_levels = 1
    prender(o, 'spine_03')


if cfg.get('capuz'):
    capuz(cfg['capuz'])

def mecha(nome, pontos, raio, cor, achatada=0.55):
    """Uma mecha de cabelo: um tubo que afina até a ponta, um pouco achatado (como o cabelo cai)."""
    verts, faces = [], []
    lados = 6
    n = len(pontos)
    for i, p in enumerate(pontos):
        p = Vector(p)
        a = Vector(pontos[min(i + 1, n - 1)])
        b = Vector(pontos[max(i - 1, 0)])
        t = (a - b).normalized()
        u = t.cross(Vector((0, 0, 1)))
        if u.length < 1e-4:
            u = t.orthogonal()
        u.normalize()
        w = t.cross(u).normalized()
        r = raio * (1 - i / max(1, n - 1)) ** 0.8 + 0.0015
        for k in range(lados):
            ang = 2 * math.pi * k / lados
            verts.append(tuple(p + (u * math.cos(ang) + w * math.sin(ang) * achatada) * r))
    for i in range(n - 1):
        for k in range(lados):
            k2 = (k + 1) % lados
            faces.append((i * lados + k, i * lados + k2, (i + 1) * lados + k2, (i + 1) * lados + k))
    faces.append(tuple(range(lados - 1, -1, -1)))
    return malha(nome, verts, faces, cor, 0.6)


# acessórios: tubos (correntes), caixas e mechas de cabelo, presos a um osso
for ac in cfg.get('acessorios', []):
    if ac['tipo'] == 'mechas':
        for j, pts in enumerate(ac['mechas']):
            o = mecha(cfg['nome'] + f'_{ac["nome"]}{j}', pts, ac['raio'], ac['cor'])
            sub = o.modifiers.new('suave', 'SUBSURF')
            sub.levels = sub.render_levels = 1
            prender(o, ac['osso'])
        continue
    if ac['tipo'] == 'tubo':
        o = tubo(cfg['nome'] + '_' + ac['nome'], ac['pontos'], ac['raio'], ac['cor'], fechado=ac.get('fechado', False))
    elif ac['tipo'] == 'caixa':
        o = caixa(cfg['nome'] + '_' + ac['nome'], ac['centro'], ac['tamanho'], ac['cor'], [math.radians(a) for a in ac.get('rot', (0, 0, 0))])
    else:
        continue
    prender(o, ac['osso'])

# a altura do personagem
alto = max((arm.matrix_world @ v.co).z for v in corpo.data.vertices)
if cfg.get('altura'):
    k = cfg['altura'] / alto
    arm.scale = (k, k, k)
print('altura original', round(alto, 3), 'escala', round(arm.scale.x, 3))

os.makedirs(os.path.dirname(cfg['saida']), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=cfg['saida'])
print('gravado', cfg['saida'])
