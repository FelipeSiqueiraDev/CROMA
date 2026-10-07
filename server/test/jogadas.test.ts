import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { combate as cb, regras } from '@crona/shared';

/** Combatente com katana na mão, no NEX pedido. */
function ficha(nex: regras.Nex) {
  const f = regras.novaFicha('Teste');
  f.atributos = { agi: 2, for: 2, int: 1, pre: 1, vig: 3 };
  f.origem = 'militar';
  f.classe = 'combatente';
  f.pericias.grupos = ['luta', 'fortitude'];
  f.pericias.livres = ['atletismo', 'percepcao'];
  f.nex = nex;
  f.inventario.push({ tipo: 'arma', id: 'katana', uid: 77, empunhado: true });
  return f;
}

describe('jogadas prontas', () => {
  test('Ataque Especial no NEX 5%: 2 PE dá +5, no ataque ou no dano; vale passar do limite por ser o custo mínimo', () => {
    const f = ficha(5);
    const c = regras.calcular(f);
    const base = c.ataques.find((a) => a.uid === 77)!;
    const r = regras.conferirJogada(f, c, { id: 'a', nome: 'Golpe', arma: 77, passos: [{ poder: 'ataque-especial', pe: 2, ataque: 5 }] });
    assert.deepEqual(r.erros, []);
    assert.equal(r.pe, 2);
    assert.equal(r.ataque!.bonus, base.bonus + 5);
    assert.equal(r.ataque!.critico.margem, base.critico.margem, 'a margem é a da katana');
    assert.ok(r.avisos.some((a) => /custo mínimo/.test(a)));
  });

  test('o motor recusa o que o livro não dá', () => {
    const f = ficha(5);
    const c = regras.calcular(f);
    const errado = (passos: regras.PassoJogada[]) => regras.conferirJogada(f, c, { id: 'a', nome: 'X', arma: 77, passos }).erros;
    assert.ok(errado([{ poder: 'ataque-especial', pe: 2, ataque: 10 }]).length, '+10 com 2 PE não');
    assert.ok(errado([{ poder: 'ataque-especial', pe: 3, ataque: 10 }]).length, '3 PE só no NEX 25%');
    assert.ok(errado([{ poder: 'ataque-especial', pe: 2, ataque: 3, dano: 2 }]).length, 'de 5 em 5');
    assert.ok(errado([{ poder: 'poder-que-nao-tem', pe: 2 }]).length);
    assert.ok(regras.conferirJogada(f, c, { id: 'a', nome: 'X', arma: 999, passos: [] }).erros.length, 'arma que não está na mochila');
    assert.ok(regras.conferirJogada(f, c, { id: 'a', nome: 'X', arma: 77, passos: [{ poder: 'ataque-especial', pe: 2, dano: 5 }] }, { peAtual: 1 }).erros.some((e) => /Faltam PE/.test(e)));
  });

  test('no NEX 25%: 3 PE dá +10 (dividido), e o dano soma na fórmula', () => {
    const f = ficha(25);
    const c = regras.calcular(f);
    const r = regras.conferirJogada(f, c, { id: 'a', nome: 'Golpe', arma: 77, passos: [{ poder: 'ataque-especial', pe: 3, ataque: 5, dano: 5 }] });
    assert.deepEqual(r.erros, []);
    assert.match(r.ataque!.dano, /\+5$/);
    assert.equal(cb.lerDano(r.ataque!.dano).fixo, cb.lerDano(c.ataques.find((a) => a.uid === 77)!.dano).fixo + 5);
  });

  test('no combate: o ataque com a jogada gasta o PE junto e fica no registro; sem PE, recusa', () => {
    const PECAS: cb.PecaCombate[] = [
      { id: 1, nome: 'Cora', agente: true, naCena: true },
      { id: 10, nome: 'Ocultista', agente: false, naCena: true },
    ];
    let t = 1000;
    const ctx = (): cb.Contexto => ({ agora: t++, cena: 7, pecas: PECAS, vitais: () => ({ pv: 20, pvMax: 20, pe: 3, peMax: 3, san: 20, sanMax: 20 }) });
    const ap = (c: cb.Combate | null, a: cb.AcaoCombate) => {
      const r = cb.aplicar(c, a, ctx());
      if (!r.ok) throw new Error(r.motivo);
      return r;
    };
    let c = ap(null, { tipo: 'abrir' }).combate!;
    c = ap(c, { tipo: 'participante', id: 1, iniciativa: 22 }).combate!;
    c = ap(c, { tipo: 'iniciativaMestre', valor: 10 }).combate!;
    c = ap(c, { tipo: 'comecar' }).combate!;
    const ataque: cb.AtaqueConfirmado = { quem: 1, alvo: 10, arma: 'Katana', qual: 'padrao', teste: { dados: 2, bonus: 10, d20: 15, total: 25, defesa: 12 }, situacoes: [], resultado: 'acerto', jogada: { nome: 'Golpe', pe: 2 } };
    const r = ap(c, { tipo: 'ataque', ataque });
    assert.equal(r.vitais!.find((v) => v.id === 1)!.pe, 1, 'gastou 2 dos 3 PE');
    assert.ok(r.combate!.registro.some((l) => /jogada Golpe, 2 PE/.test(l.texto)));
    assert.equal(r.combate!.acoes['1']?.pe, 2, 'conta no limite do turno');
    const semPe = cb.aplicar(c, { tipo: 'ataque', ataque: { ...ataque, jogada: { nome: 'Golpe', pe: 9 } } }, ctx());
    assert.equal(semPe.ok, false);
  });
});
