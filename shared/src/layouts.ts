import type { Door } from './walls';

export interface LayoutPreset {
  id: string;
  name: string;
  heightmap: string;
  door: Door;
}

const rows = (...r: string[]) => r.join('\n');

export const LAYOUTS: LayoutPreset[] = [
  {
    id: 'bunker',
    name: 'Base Subterrânea (12×10)',
    door: { x: 0, y: 5, dir: 2 },
    heightmap: rows(
      'x000000000000',
      'x000000000000',
      'x000000000000',
      'x000000000000',
      'x000000000000',
      '0000000000000',
      'x000000000000',
      'x000000000000',
      'x000000000000',
      'x000000000000',
    ),
  },
  {
    id: 'interrogatorio',
    name: 'Sala de Interrogatório (6×6)',
    door: { x: 0, y: 2, dir: 2 },
    heightmap: rows('x000000', 'x000000', '0000000', 'x000000', 'x000000', 'x000000'),
  },
  {
    id: 'saguao',
    name: 'Saguão com Palco (16×14)',
    door: { x: 0, y: 8, dir: 2 },
    heightmap: rows(
      'x1111111111111111',
      'x1111111111111111',
      'x1111111111111111',
      'x0000000000000000',
      'x0000000000000000',
      'x0000000000000000',
      'x0000000000000000',
      'x0000000000000000',
      '00000000000000000',
      'x0000000000000000',
      'x0000000000000000',
      'x0000000000000000',
      'x0000000000000000',
      'x0000000000000000',
    ),
  },
  {
    id: 'corredor',
    name: 'Corredor em L',
    door: { x: 0, y: 5, dir: 2 },
    heightmap: rows(
      'xxxxxxx000000',
      'xxxxxxx000000',
      'xxxxxxx000000',
      'xxxxxxx000000',
      'x000000000000',
      '0000000000000',
      'x000000000000',
      'x000000000000',
    ),
  },
  {
    id: 'poco',
    name: 'Poço Ritual (11×11)',
    door: { x: 0, y: 5, dir: 2 },
    heightmap: rows(
      'x22222222222',
      'x22222222222',
      'x22111111122',
      'x22100000122',
      'x22100000122',
      '222100000122',
      'x22100000122',
      'x22100000122',
      'x22111111122',
      'x22222222222',
      'x22222222222',
    ),
  },
];

export function getLayout(id: string) {
  return LAYOUTS.find((l) => l.id === id);
}
