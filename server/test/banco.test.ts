import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { regras } from '@crona/shared';
import { assinaturas, linhasDe, montar, TABELAS, type Linha } from '../src/banco/linhas';
import type { Database } from '../src/db';
import { seedDb, upgradeDb } from '../src/seed';

/** Como o Postgres devolve: jsonb volta como objeto, datas como texto. */
function pelaBase(db: Database): Record<string, Linha[]> {
  const out: Record<string, Linha[]> = {};
  for (const [t, m] of linhasDe(db)) out[t] = [...m.values()].map((l) => JSON.parse(JSON.stringify(l)));
  return out;
}

/** Diferenças que não mudam nada: lista vazia de peças, fichas ausentes. */
function norm(db: Database) {
  const c = structuredClone(db);
  for (const r of c.rooms) if (!r.tokens?.length) delete r.tokens;
  if (!c.fichas?.length) delete c.fichas;
  return JSON.parse(JSON.stringify(c));
}

describe('banco (Postgres)', () => {
  test('ida e volta: o conteúdo de exemplo sai e volta igual', () => {
    const db = seedDb();
    upgradeDb(db);
    const agora = new Date().toISOString();
    db.fichas = [{ id: 1, nome: 'Teste', campanha: db.home, ficha: regras.novaFicha('Teste'), criadaEm: agora, atualizadaEm: agora }];
    db.nextFichaId = 2;
    assert.deepEqual(norm(montar(pelaBase(db))), norm(db));
  });

  test('toda tabela da migração tem as colunas que o servidor grava', async () => {
    const fs = await import('node:fs');
    const sql = fs.readFileSync(new URL('../src/banco/migracoes/001_inicio.sql', import.meta.url), 'utf8');
    for (const t of TABELAS) {
      const bloco = sql.match(new RegExp(`create table ${t.nome} \\(([\\s\\S]*?)\\);`))?.[1];
      assert.ok(bloco, `tabela ${t.nome}`);
      for (const c of t.colunas) assert.match(bloco!, new RegExp(`\\b${c}\\b`), `${t.nome}.${c}`);
    }
  });

  test('registro: a chave de cada entrada não muda quando as velhas saem', () => {
    const db = seedDb();
    upgradeDb(db);
    const [id, camp] = Object.entries(db.campaigns!)[0];
    camp.log = [
      { at: 1000, icon: 'scene', text: 'a' },
      { at: 2000, icon: 'scene', text: 'b' },
      { at: 2000, icon: 'scene', text: 'c' },
    ];
    const antes = [...linhasDe(db).get('registro')!.keys()].filter((k) => k.startsWith(id + ':'));
    camp.log.shift();
    const depois = [...linhasDe(db).get('registro')!.keys()].filter((k) => k.startsWith(id + ':'));
    assert.deepEqual(depois, antes.slice(1));
  });

  test('só o que mudou aparece diferente na gravação seguinte', () => {
    const db = seedDb();
    upgradeDb(db);
    const a = assinaturas(linhasDe(db));
    db.rooms[0].items[0].state = db.rooms[0].items[0].state === 1 ? 0 : 1;
    const b = assinaturas(linhasDe(db));
    let mudou = 0;
    for (const [t, m] of b) for (const [k, s] of m) if (a.get(t)!.get(k) !== s) mudou++;
    assert.equal(mudou, 1);
  });
});
