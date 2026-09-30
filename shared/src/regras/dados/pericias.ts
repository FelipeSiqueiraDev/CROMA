// As 28 perícias (LR cap. 2, Tab. 2.1 na p. 41), com o atributo-base, se só
// podem ser usadas treinadas e se sofrem penalidade de carga. A página é a da
// descrição de cada uma. Intuição é de Presença: a Tab. 2.1 imprime Intelecto
// por engano (o título da perícia, o texto de Presença e a ficha dizem Presença).
//
// Kits (LR p. 40): o kit fica no catálogo de equipamentos (`kitDe`). Pedem kit
// o arrombar e o sabotar de Crime (kit de ladrão, p. 44), o disfarce de
// Enganação (kit de disfarces, p. 44), todo uso de Medicina (kit de medicina,
// p. 46; em si mesmo, −5 também) e o operar dispositivo de Tecnologia (kit de
// eletrônica, p. 49).
// Atletismo não é perícia de carga, mas a natação sofre a penalidade (p. 42).
import type { Pericia, PericiaId } from '../tipos';

const p = (id: PericiaId, nome: string, atributo: Pericia['atributo'], pagina: number, somenteTreinada = false, carga = false): Pericia => ({
  id,
  nome,
  ref: { fonte: 'LR', pagina },
  atributo,
  somenteTreinada,
  carga,
});

export const PERICIAS: Pericia[] = [
  p('acrobacia', 'Acrobacia', 'agi', 41, false, true),
  p('adestramento', 'Adestramento', 'pre', 42, true),
  p('artes', 'Artes', 'pre', 42, true),
  p('atletismo', 'Atletismo', 'for', 42),
  p('atualidades', 'Atualidades', 'int', 43),
  p('ciencias', 'Ciências', 'int', 43, true),
  p('crime', 'Crime', 'agi', 43, true, true),
  p('diplomacia', 'Diplomacia', 'pre', 44),
  p('enganacao', 'Enganação', 'pre', 44),
  p('fortitude', 'Fortitude', 'vig', 45),
  p('furtividade', 'Furtividade', 'agi', 45, false, true),
  p('iniciativa', 'Iniciativa', 'agi', 45),
  p('intimidacao', 'Intimidação', 'pre', 45),
  p('intuicao', 'Intuição', 'pre', 45),
  p('investigacao', 'Investigação', 'int', 46),
  p('luta', 'Luta', 'for', 46),
  p('medicina', 'Medicina', 'int', 46),
  p('ocultismo', 'Ocultismo', 'int', 47, true),
  p('percepcao', 'Percepção', 'pre', 47),
  p('pilotagem', 'Pilotagem', 'agi', 47, true),
  p('pontaria', 'Pontaria', 'agi', 47),
  p('profissao', 'Profissão', 'int', 47, true),
  p('reflexos', 'Reflexos', 'agi', 48),
  p('religiao', 'Religião', 'pre', 48, true),
  p('sobrevivencia', 'Sobrevivência', 'int', 48),
  p('tatica', 'Tática', 'int', 48, true),
  p('tecnologia', 'Tecnologia', 'int', 48, true),
  p('vontade', 'Vontade', 'pre', 49),
];

/** Bônus de cada grau (LR p. 40). */
export const BONUS_GRAU = { destreinado: 0, treinado: 5, veterano: 10, expert: 15 } as const;

/** Penalidade nas perícias de carga (sobrecarregado ou proteção pesada, LR p. 53 e 62). */
export const PENALIDADE_CARGA = -5;
/** Sem o kit que o uso exige (LR p. 40). */
export const PENALIDADE_SEM_KIT = -5;
