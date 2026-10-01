import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import * as regras from '../../shared/src/regras';

const { calcular, catalogo, escolhasDe, montarEstado, novaFicha, opcoesPoder, opcoesRitual, opcoesTrilha, slug } = regras;
type Ficha = regras.Ficha;

/** Combatente de origem Militar (Pontaria e Tática), pronto em NEX 5%. */
function combatente(atributos: Ficha['atributos'] = { agi: 2, for: 2, int: 1, pre: 1, vig: 3 }): Ficha {
  const f = novaFicha('Teste');
  f.atributos = atributos;
  f.origem = 'militar';
  f.classe = 'combatente';
  f.pericias.grupos = ['luta', 'fortitude'];
  f.pericias.livres = (['atletismo', 'percepcao', 'investigacao'] as regras.PericiaId[]).slice(0, 1 + atributos.int);
  return f;
}

function subir(f: Ficha, ate: regras.Nex) {
  f.nex = ate;
  return f;
}

const erros = (f: Ficha) => calcular(f).problemas.filter((p) => p.severidade === 'erro').map((p) => p.texto);

describe('catálogos', () => {
  const listas = {
    classes: catalogo.CATALOGO.classes,
    pericias: catalogo.CATALOGO.pericias,
    origens: catalogo.CATALOGO.origens,
    trilhas: catalogo.CATALOGO.trilhas,
    poderes: catalogo.CATALOGO.poderes,
    paranormais: catalogo.CATALOGO.paranormais,
    rituais: catalogo.CATALOGO.rituais,
    armas: catalogo.CATALOGO.armas,
    protecoes: catalogo.CATALOGO.protecoes,
    equipamentos: catalogo.CATALOGO.equipamentos,
    modificacoes: catalogo.CATALOGO.modificacoes,
    amaldicoados: catalogo.CATALOGO.amaldicoados,
    maldicoes: catalogo.CATALOGO.maldicoes,
  };

  test('ids únicos e no formato slug', () => {
    for (const [nome, lista] of Object.entries(listas)) {
      const ids = lista.map((x) => x.id);
      assert.equal(new Set(ids).size, ids.length, `${nome}: ids repetidos`);
      for (const x of lista) if (nome !== 'classes' && nome !== 'pericias') assert.equal(x.id, slug(x.id), `${nome}: ${x.id}`);
    }
  });

  test('toda entrada tem a página do livro', () => {
    for (const [nome, lista] of Object.entries(listas))
      for (const x of lista as { id: string; ref: regras.Ref }[]) if (x.ref.fonte === 'LR') assert.ok(x.ref.pagina > 0, `${nome}: ${x.id} sem página`);
  });

  test('o livro: 28 perícias, 26 origens, 5 trilhas por classe', () => {
    assert.equal(listas.pericias.length, 28);
    assert.equal(listas.origens.filter((o) => o.ref.fonte === 'LR').length, 26);
    for (const c of regras.CLASSES_AGENTE) assert.equal(listas.trilhas.filter((t) => t.classe === c && t.ref.fonte === 'LR').length, 5, c);
    for (const t of listas.trilhas) assert.deepEqual(t.habilidades.map((h) => h.nex), [10, 40, 65, 99], t.id);
  });

  test('referências entre catálogos existem', () => {
    const poderes = new Set([
      ...listas.poderes.map((p) => p.id),
      ...listas.paranormais.map((p) => p.id),
      ...listas.trilhas.flatMap((t) => t.habilidades.map((h) => h.id)),
      ...listas.origens.map((o) => o.poder.id),
      ...listas.classes.flatMap((c) => c.habilidades.map((h) => h.id)),
    ]);
    const rituais = new Set(listas.rituais.map((r) => r.id));
    const pericias = new Set(listas.pericias.map((p) => p.id));
    const visitar = (r: regras.Requisito, onde: string) => {
      if (r.tipo === 'poder') assert.ok(poderes.has(r.poder), `${onde}: requisito de poder desconhecido ${r.poder}`);
      if (r.tipo === 'pericia' && r.pericia !== 'escolhida') assert.ok(pericias.has(r.pericia), `${onde}: perícia ${r.pericia}`);
      if (r.tipo === 'algum') r.de.forEach((x) => visitar(x, onde));
      if (r.tipo === 'nao') visitar(r.req, onde);
    };
    for (const p of [...listas.poderes, ...listas.paranormais]) for (const r of p.requisitos ?? []) visitar(r, p.id);
    for (const t of listas.trilhas) for (const r of t.requisitos ?? []) visitar(r, t.id);
    for (const t of listas.trilhas)
      for (const h of t.habilidades) if (Array.isArray(h.concedeRituais)) for (const id of h.concedeRituais) assert.ok(rituais.has(id), `${h.id}: ritual ${id}`);
    for (const o of listas.origens) if (Array.isArray(o.pericias)) for (const p of o.pericias) assert.ok(pericias.has(p), `${o.id}: perícia ${p}`);
  });
});

describe('ficha: números do livro', () => {
  test('combatente com Vigor 2: 22 PV em NEX 5% e 28 em 10% (LR p. 25)', () => {
    const f = combatente({ agi: 2, for: 2, int: 1, pre: 1, vig: 2 });
    assert.equal(calcular(f).pv, 22);
    subir(f, 10);
    f.trilha = 'aniquilador';
    assert.equal(calcular(f).pv, 28);
  });

  test('PE, SAN e limite de PE das três classes em NEX 5%', () => {
    const f = combatente();
    const c = calcular(f);
    assert.equal(c.pe, 2 + 1);
    assert.equal(c.san, 12);
    assert.equal(c.limitePe, 1);
    const e = novaFicha();
    e.atributos = { agi: 1, for: 1, int: 3, pre: 3, vig: 1 };
    e.classe = 'ocultista';
    const o = calcular(e);
    assert.equal(o.pv, 12 + 1);
    assert.equal(o.pe, 4 + 3);
    assert.equal(o.san, 20);
    assert.equal(o.dtRituais, 10 + 1 + 3);
  });

  test('limite de PE = NEX ÷ 5 (99% = 20)', () => {
    assert.equal(regras.limitePeDoNex(5), 1);
    assert.equal(regras.limitePeDoNex(50), 10);
    assert.equal(regras.limitePeDoNex(95), 19);
    assert.equal(regras.limitePeDoNex(99), 20);
  });

  test('Defesa = 10 + Agilidade; carga = 5 × Força (Força 0 = 2 espaços)', () => {
    const f = combatente({ agi: 3, for: 0, int: 1, pre: 2, vig: 3 });
    const c = calcular(f);
    assert.equal(c.defesa, 13);
    assert.equal(c.carga.espacos, 2);
    assert.equal(calcular(combatente({ agi: 2, for: 2, int: 1, pre: 1, vig: 3 })).carga.espacos, 10);
  });

  test('sobrecarregado: −5 na Defesa e −3 m', () => {
    const f = combatente({ agi: 2, for: 1, int: 1, pre: 2, vig: 3 });
    const pesada = catalogo.CATALOGO.protecoes.find((p) => p.tipo === 'pesada')!;
    f.inventario = [{ id: pesada.id, tipo: 'protecao' }, { id: pesada.id, tipo: 'protecao', vestido: false }];
    const c = calcular(f);
    assert.ok(c.carga.usados > c.carga.espacos);
    assert.equal(c.carga.sobrecarregado, true);
    assert.equal(c.deslocamento, 6);
  });
});

describe('criação: atributos e perícias', () => {
  test('4 pontos; um atributo em 0 dá mais 1; máximo 3', () => {
    const f = combatente({ agi: 3, for: 3, int: 1, pre: 1, vig: 1 });
    assert.deepEqual(erros(f), []);
    f.atributos = { agi: 3, for: 3, int: 0, pre: 1, vig: 2 };
    f.pericias.livres = ['atletismo'];
    assert.deepEqual(erros(f), []);
    f.atributos = { agi: 4, for: 2, int: 1, pre: 1, vig: 1 };
    assert.ok(erros(f).some((e) => e.includes('entre 0 e 3')));
    f.atributos = { agi: 3, for: 3, int: 0, pre: 0, vig: 3 };
    assert.ok(erros(f).some((e) => e.includes('Só um atributo')));
  });

  test('perícia que a origem já deu não conta de novo', () => {
    const f = combatente();
    f.pericias.grupos = ['pontaria', 'fortitude'];
    assert.ok(erros(f).some((e) => e.startsWith('Pontaria já é treinada')));
  });

  test('ficha nova lista o que falta', () => {
    const tipos = new Set(calcular(novaFicha()).pendencias.map((p) => p.tipo));
    for (const t of ['atributos', 'origem', 'classe'] as const) assert.ok(tipos.has(t), t);
  });
});

describe('criação: o que libera cada opção', () => {
  test('Armamento Pesado pede Força 2', () => {
    const f = subir(combatente({ agi: 3, for: 1, int: 1, pre: 2, vig: 2 }), 15);
    f.trilha = 'aniquilador';
    const op = opcoesPoder(f, 15).find((o) => o.id === 'armamento-pesado')!;
    assert.equal(op.ok, false);
    assert.match(op.motivos[0], /Força 2 \(tem 1\)/);
    f.atributos = { agi: 2, for: 2, int: 1, pre: 2, vig: 2 };
    assert.equal(opcoesPoder(f, 15).find((o) => o.id === 'armamento-pesado')!.ok, true);
  });

  test('Proteção Pesada só em NEX 30%; Tanque de Guerra pede Proteção Pesada', () => {
    const f = subir(combatente(), 30);
    f.trilha = 'aniquilador';
    escolhasDe(f, 10).parametros = { 'a-favorita': { arma: catalogo.CATALOGO.armas[0].id } };
    assert.equal(opcoesPoder(f, 15).find((o) => o.id === 'protecao-pesada')!.ok, false);
    assert.equal(opcoesPoder(f, 30).find((o) => o.id === 'protecao-pesada')!.ok, true);
    assert.equal(opcoesPoder(f, 30).find((o) => o.id === 'tanque-de-guerra')!.ok, false);
    escolhasDe(f, 15).poder = { id: 'combate-defensivo' };
    escolhasDe(f, 20).atributo = 'for';
    escolhasDe(f, 30).poder = { id: 'protecao-pesada' };
    const st = montarEstado(f);
    assert.ok(st.poderes.some((p) => p.id === 'protecao-pesada'));
    assert.ok(st.proficiencias.has('protecoesPesadas'));
  });

  test('Médico de Campo pede Medicina treinada', () => {
    const f = novaFicha();
    f.atributos = { agi: 1, for: 1, int: 3, pre: 2, vig: 2 };
    f.origem = 'militar';
    f.classe = 'especialista';
    f.nex = 10;
    const semMedicina = opcoesTrilha(f).find((t) => t.id === 'medico-de-campo')!;
    assert.equal(semMedicina.ok, false);
    f.pericias.livres = ['medicina'];
    assert.equal(opcoesTrilha(f).find((t) => t.id === 'medico-de-campo')!.ok, true);
  });

  test('Transcender: não ganha SAN naquele NEX', () => {
    const f = subir(combatente(), 15);
    f.trilha = 'aniquilador';
    const antes = calcular(f).san;
    const para = catalogo.CATALOGO.paranormais.find((p) => !p.requisitos?.length)!;
    escolhasDe(f, 15).poder = { id: 'transcender', escolha: { poder: para.id } };
    const depois = calcular(f);
    assert.equal(depois.san, antes - 3);
    assert.ok(depois.poderes.some((p) => p.id === para.id && p.tipo === 'paranormal'));
  });

  test('aumento de atributo até 5; Intelecto dá uma perícia', () => {
    const f = subir(combatente(), 20);
    f.trilha = 'aniquilador';
    escolhasDe(f, 15).poder = { id: 'combate-defensivo' };
    escolhasDe(f, 20).atributo = 'int';
    assert.ok(calcular(f).pendencias.some((p) => p.tipo === 'periciaIntelecto'));
    escolhasDe(f, 20).periciaIntelecto = 'investigacao';
    const c = calcular(f);
    assert.equal(c.atributos.int, 2);
    assert.equal(c.pericias.investigacao.grau, 'treinado');
  });

  test('grau de treinamento: veterano em 35%, expert só em 70%', () => {
    const f = subir(combatente(), 35);
    f.trilha = 'aniquilador';
    escolhasDe(f, 15).poder = { id: 'combate-defensivo' };
    escolhasDe(f, 20).atributo = 'agi';
    escolhasDe(f, 30).poder = { id: 'protecao-pesada' };
    escolhasDe(f, 35).grau = ['luta', 'pontaria'];
    const c = calcular(f);
    assert.equal(c.pericias.luta.grau, 'veterano');
    assert.equal(c.pericias.luta.bonus, 10);
  });

  test('ocultista: três rituais de 1º círculo; 2º círculo só em NEX 25%', () => {
    const f = novaFicha();
    f.atributos = { agi: 1, for: 1, int: 3, pre: 3, vig: 1 };
    f.origem = 'militar';
    f.classe = 'ocultista';
    const primeiro = catalogo.CATALOGO.rituais.filter((r) => r.circulo === 1 && r.ref.fonte === 'LR');
    escolhasDe(f, 5).parametros = { 'escolhido-pelo-outro-lado': { rituais: primeiro.slice(0, 3).map((r) => r.id) } };
    assert.equal(calcular(f).rituais.length, 3);
    f.nex = 10;
    const segundo = catalogo.CATALOGO.rituais.find((r) => r.circulo === 2)!;
    assert.equal(opcoesRitual(f, 10).find((o) => o.id === segundo.id)!.ok, false);
    assert.equal(opcoesRitual(f, 10).find((o) => o.id === primeiro[3].id)!.ok, true);
  });

  test('pessoa comum (NEX 0%): 3 pontos, 8 + Vigor de PV; em 5% vira agente com os mesmos totais', () => {
    const f = novaFicha('Comum', { comecouMundano: true });
    f.atributos = { agi: 2, for: 1, int: 1, pre: 2, vig: 2 };
    f.origem = 'militar';
    f.pericias.livres = ['atletismo', 'percepcao'];
    const zero = calcular(f);
    assert.equal(zero.pv, 8 + 2);
    assert.equal(zero.san, 8);
    assert.deepEqual(erros(f), []);
    f.nex = 5;
    f.classe = 'combatente';
    f.pericias.grupos = ['luta', 'fortitude'];
    escolhasDe(f, 5).atributoTreino = 'vig';
    const cinco = calcular(f);
    assert.equal(cinco.pv, 20 + 3);
    assert.equal(cinco.pe, 2 + 2);
    assert.equal(cinco.san, 12);
    escolhasDe(f, 5).atributoTreino = 'agi';
    f.atributos.agi = 3;
    assert.ok(erros(f).some((e) => e.includes('acima de 3')));
  });
});

describe('mochila', () => {
  test('recruta: dois itens de categoria I', () => {
    const f = combatente();
    const cat1 = catalogo.CATALOGO.armas.filter((a) => a.categoria === 1).slice(0, 3);
    f.inventario = cat1.map((a) => ({ id: a.id, tipo: 'arma' as const }));
    assert.ok(erros(f).some((e) => e.startsWith('Itens de categoria I:')));
    f.inventario.pop();
    assert.ok(!erros(f).some((e) => e.startsWith('Itens de categoria I:')));
  });

  test('arma sem proficiência: −2d20', () => {
    const f = combatente();
    const pesada = catalogo.CATALOGO.armas.find((a) => a.proficiencia === 'pesada')!;
    f.inventario = [{ id: pesada.id, tipo: 'arma' }];
    f.pp = 200;
    const atk = calcular(f).ataques[0];
    assert.equal(atk.penalidadeDados, -2);
  });

  test('arma improvisada: −1d20 no ataque (LR p. 57); o ataque desarmado sempre aparece', () => {
    const f = combatente();
    f.inventario = [{ id: 'arma-improvisada', tipo: 'arma' }];
    const c = calcular(f);
    assert.equal(c.ataques.find((a) => a.item === 'arma-improvisada')!.penalidadeDados, -1);
    const des = c.ataques.find((a) => a.item === 'ataque-desarmado')!;
    assert.equal(des.dano, '1d3+2');
  });

  test('soqueira: +1 no dano desarmado, só na mão', () => {
    const f = combatente();
    f.inventario = [{ id: 'soqueira', tipo: 'equipamento' }];
    const desarmado = () => calcular(f).ataques.find((a) => a.item === 'ataque-desarmado')!.dano;
    assert.equal(desarmado(), '1d3+2', 'guardada na mochila');
    f.inventario[0].empunhado = true;
    assert.equal(desarmado(), '1d3+3');
  });

  test('cão adestrado: +2 em Investigação e Percepção, só com Adestramento treinado', () => {
    const f = combatente({ agi: 2, for: 2, int: 2, pre: 1, vig: 2 });
    f.inventario = [{ id: 'cao-adestrado', tipo: 'equipamento' }];
    const sem = calcular(f).pericias.percepcao.bonus;
    f.pericias.livres = ['atletismo', 'percepcao', 'adestramento'];
    const com = calcular(f).pericias.percepcao.bonus;
    assert.equal(com - sem, 2);
  });

  test('traje hazmat: resistência 10 a químico', () => {
    const f = combatente();
    f.inventario = [{ id: 'traje-hazmat', tipo: 'equipamento' }];
    f.pp = 20;
    assert.equal(calcular(f).resistencias.quimico, 10);
  });

  test('duas mochilas militares não somam (uma nas costas)', () => {
    const f = combatente();
    const base = calcular(f).carga.espacos;
    f.inventario = [{ id: 'mochila-militar', tipo: 'equipamento' }];
    const uma = calcular(f).carga.espacos;
    f.inventario.push({ id: 'mochila-militar', tipo: 'equipamento' });
    assert.equal(uma - base, 2);
    assert.equal(calcular(f).carga.espacos, uma);
  });

  test('sobrecarga vira aviso; modificação repetida ou no item errado vira erro', () => {
    const f = combatente({ agi: 3, for: 1, int: 1, pre: 1, vig: 3 });
    f.inventario = Array.from({ length: 6 }, () => ({ id: 'arma-improvisada', tipo: 'arma' as const }));
    assert.ok(calcular(f).problemas.some((p) => p.severidade === 'aviso' && p.texto.startsWith('Sobrecarregado')));
    const f2 = combatente();
    f2.pp = 200;
    f2.inventario = [{ id: 'faca', tipo: 'arma', modificacoes: ['certeira', 'certeira'] }, { id: 'protecao-leve', tipo: 'protecao', modificacoes: ['mira-laser'] }];
    const e = erros(f2);
    assert.ok(e.some((x) => x.includes('duas vezes')), e.join(' | '));
    assert.ok(e.some((x) => x.includes('não serve')), e.join(' | '));
  });

  test('item amaldiçoado mostra o preço em Sanidade', () => {
    const f = combatente();
    f.pp = 50;
    const x = catalogo.CATALOGO.amaldicoados.find((a) => a.elemento === 'morte')!;
    f.inventario = [{ id: x.id, tipo: 'amaldicoado' }];
    assert.ok(calcular(f).condicionais.some((c) => c.origem === 'Preço de morte' && c.texto.includes('Presença')));
  });
});

describe('contas finas', () => {
  test('Magnata sobe o crédito da patente em um nível', () => {
    const f = combatente();
    f.origem = 'magnata';
    f.pericias.livres = ['atletismo', 'percepcao'];
    assert.equal(calcular(f).patente!.credito, 'medio');
  });

  test('custo dos rituais: 1, 3, 6 e 10 PE pelo círculo', () => {
    const f = novaFicha('Ocultista');
    f.atributos = { agi: 1, for: 1, int: 3, pre: 3, vig: 1 };
    f.origem = 'academico';
    f.classe = 'ocultista';
    f.pericias.livres = ['atualidades', 'ciencias', 'diplomacia', 'intuicao', 'medicina', 'percepcao'];
    const primeiro = catalogo.CATALOGO.rituais.filter((r) => r.circulo === 1 && !r.concedidoPor).slice(0, 3).map((r) => r.id);
    escolhasDe(f, 5).parametros = { 'escolhido-pelo-outro-lado': { rituais: primeiro } };
    const c = calcular(f);
    for (const id of primeiro) assert.equal(c.custoRituais[id]?.pe, 1);
    assert.equal(c.custoRituais[primeiro[0]].dt, c.dtRituais);
  });

  test('Resistir a Sangue e a Morte com afinidade em Sangue: 20 em Sangue, 10 em Morte', () => {
    const f = combatente();
    f.nex = 60;
    f.progressao = {
      15: { poder: { id: 'transcender', escolha: { poder: 'resistir-a-elemento', sub: { elemento: 'sangue' } } } },
      30: { poder: { id: 'transcender', escolha: { poder: 'resistir-a-elemento', sub: { elemento: 'morte' } } } },
      50: { afinidade: 'sangue' },
      60: { poder: { id: 'transcender', escolha: { poder: 'resistir-a-elemento', sub: { elemento: 'sangue' } } } },
    };
    const r = calcular(f).resistencias;
    assert.equal(r.sangue, 20);
    assert.equal(r.morte, 10);
  });
});

describe('mochila: mãos, vestidos e o que se achou', () => {
  const { empunhar, guardar, vestir, tirar, usar, retirar, armado, lugarDoItem, maosOcupadas, numerarItens } = regras;
  const item = (id: string, tipo: regras.ItemFicha['tipo'], uid: number, extra: Partial<regras.ItemFicha> = {}): regras.ItemFicha => ({ id, tipo, uid, ...extra });

  test('duas mãos: a katana ocupa as duas; sem mão livre recusa, com troca guarda a outra arma', () => {
    let inv = [item('katana', 'arma', 1), item('faca', 'arma', 2), item('lanterna-tatica', 'equipamento', 3)];
    let r = empunhar(inv, 1);
    assert.ok(r.ok);
    inv = r.inventario;
    assert.equal(maosOcupadas(inv), 2);
    assert.ok(armado(inv));
    r = empunhar(inv, 3);
    assert.deepEqual(r, { ok: false, motivo: 'Mãos ocupadas: Katana.' });
    r = empunhar(inv, 2, true);
    assert.ok(r.ok);
    inv = r.inventario;
    assert.deepEqual(inv.map(lugarDoItem), ['mochila', 'mao', 'mochila']);
    // faca numa mão e lanterna na outra; trocar de arma mantém a lanterna
    r = empunhar(inv, 3);
    assert.ok(r.ok);
    inv = r.inventario;
    r = empunhar(inv, 1, true);
    assert.ok(r.ok);
    assert.deepEqual(r.inventario.map(lugarDoItem), ['mao', 'mochila', 'mochila'], 'a katana precisa das duas: guarda faca e lanterna');
    const so = guardar(r.inventario, 1);
    assert.ok(so.ok && !armado(so.inventario));
    const luz = empunhar(so.inventario, 3);
    assert.ok(luz.ok && !armado(luz.inventario), 'lanterna na mão não deixa armado');
    assert.equal(empunhar(inv, 99).ok, false);
    assert.deepEqual(empunhar(inv, 0), { ok: false, motivo: 'Item não encontrado.' });
  });

  test('o escudo vale na mão (LR p. 62); a proteção, vestida', () => {
    const f = combatente();
    f.pp = 20;
    f.inventario = [item('escudo', 'protecao', 1), item('protecao-leve', 'protecao', 2), item('corrente', 'arma', 3)];
    assert.equal(calcular(f).defesa, 17, 'proteção leve vestida (+5); escudo guardado');
    const r = empunhar(f.inventario, 1);
    assert.ok(r.ok);
    f.inventario = r.inventario;
    assert.equal(calcular(f).defesa, 19);
    const r2 = empunhar(f.inventario, 3);
    assert.ok(r2.ok, 'corrente numa mão, escudo na outra');
    f.inventario = r2.inventario;
    const t = tirar(f.inventario, 2);
    assert.ok(t.ok);
    f.inventario = t.inventario;
    assert.equal(calcular(f).defesa, 14, 'tirou a proteção: só o escudo');
    const v = vestir(f.inventario, 2);
    assert.ok(v.ok && lugarDoItem(v.inventario[1]) === 'vestido');
    assert.equal(vestir(f.inventario, 3).ok, false, 'corrente não se veste');
  });

  test('ficha com três mãos ocupadas acusa o erro', () => {
    const f = combatente();
    f.inventario = [item('katana', 'arma', 1, { empunhado: true }), item('faca', 'arma', 2, { empunhado: true })];
    assert.ok(erros(f).some((e) => e.startsWith('Mãos: 3 ocupadas')));
  });

  test('ataca só com o que está na mão; o desarmado está sempre', () => {
    const f = combatente();
    f.inventario = [item('faca', 'arma', 7), item('corrente', 'arma', 8, { empunhado: true })];
    const c = calcular(f);
    const na = (id: string) => c.ataques.find((a) => a.item === id)!;
    assert.equal(na('faca').naMao, false);
    assert.equal(na('corrente').naMao, true);
    assert.equal(na('corrente').uid, 8);
    assert.equal(na('ataque-desarmado').naMao, true);
  });

  test('o achado na missão não ocupa vaga da patente; o item do cenário ocupa espaço', () => {
    const f = combatente();
    const cat1 = catalogo.CATALOGO.armas.filter((a) => a.categoria === 1).slice(0, 3);
    f.inventario = cat1.map((a, i) => item(a.id, 'arma', i + 1, i === 2 ? { achado: true } : {}));
    assert.ok(!erros(f).some((e) => e.startsWith('Itens de categoria I:')));
    assert.equal(calcular(f).itens[0].usados, 2);
    const g = combatente();
    g.inventario = [item('chave', 'cena', 1, { nome: 'Chave do Arsenal', espacos: 1, tipoCena: 'key' })];
    let c = calcular(g);
    assert.equal(c.carga.usados, 1);
    assert.equal(c.defesa, 12);
    assert.equal(regras.nomeDoItem(g.inventario[0]), 'Chave do Arsenal');
    g.inventario.push(item('caixote', 'cena', 2, { nome: 'Caixote', espacos: 10 }));
    c = calcular(g);
    assert.ok(c.carga.sobrecarregado, '11 de 10 espaços');
    assert.equal(c.defesa, 7);
    assert.equal(c.deslocamento, 6);
  });

  test('usar gasta o consumível; retirar tira da mão e da roupa', () => {
    let inv = [item('granada-de-fumaca', 'equipamento', 1, { qtd: 2 }), item('corda', 'equipamento', 2), item('protecao-leve', 'protecao', 3)];
    let r = usar(inv, 1);
    assert.ok(r.ok && r.gastou);
    inv = r.inventario;
    assert.equal(inv[0].qtd, 1);
    r = usar(inv, 1);
    assert.ok(r.ok);
    inv = r.inventario;
    assert.deepEqual(inv.map((x) => x.id), ['corda', 'protecao-leve'], 'a última granada sai da mochila');
    const corda = usar(inv, 2);
    assert.ok(corda.ok && corda.gastou === false, 'corda não gasta');
    const sai = retirar(inv, 3);
    assert.ok(sai.ok);
    assert.equal(sai.item.vestido, false, 'quem recebe guarda na mochila');
    assert.equal(sai.inventario.length, 1);
    assert.equal(regras.consumivel(item('pocao', 'cena', 9, { tipoCena: 'potion' })), true);
  });

  test('numera os itens que ainda não têm número', () => {
    const inv: regras.ItemFicha[] = [{ id: 'faca', tipo: 'arma' }, { id: 'corda', tipo: 'equipamento', uid: 5 }];
    let n = 10;
    assert.equal(numerarItens(inv, () => n++), true);
    assert.deepEqual(inv.map((x) => x.uid), [10, 5]);
    assert.equal(numerarItens(inv, () => n++), false);
  });
});
