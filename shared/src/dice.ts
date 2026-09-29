export interface RollSpec {
  count: number;
  sides: number;
  mod: number;
  /** kh = fica com o maior, kl = fica com o menor */
  keep: 'all' | 'high' | 'low';
}

export interface RollResult {
  expr: string;
  rolls: number[];
  kept: number[];
  mod: number;
  total: number;
}

/** Aceita: "d20", "2d6+3", "3d20kh", "2d20kl-1". */
export function parseRoll(expr: string): RollSpec | null {
  const m = expr
    .replace(/\s+/g, '')
    .toLowerCase()
    .match(/^(\d{0,2})d(\d{1,4})(kh|kl)?([+-]\d{1,4})?$/);
  if (!m) return null;
  const count = m[1] ? Number(m[1]) : 1;
  const sides = Number(m[2]);
  const keep = m[3] === 'kh' ? 'high' : m[3] === 'kl' ? 'low' : 'all';
  const mod = m[4] ? Number(m[4]) : 0;
  if (count < 1 || count > 20 || sides < 2 || sides > 1000) return null;
  return { count, sides, mod, keep };
}

export function formatRoll(spec: RollSpec): string {
  const k = spec.keep === 'high' ? 'kh' : spec.keep === 'low' ? 'kl' : '';
  const mod = spec.mod > 0 ? `+${spec.mod}` : spec.mod < 0 ? String(spec.mod) : '';
  return `${spec.count}d${spec.sides}${k}${mod}`;
}

export function evalRoll(spec: RollSpec, rand: (sides: number) => number): RollResult {
  const rolls = Array.from({ length: spec.count }, () => rand(spec.sides));
  let kept = rolls;
  if (spec.keep === 'high') kept = [Math.max(...rolls)];
  if (spec.keep === 'low') kept = [Math.min(...rolls)];
  const total = kept.reduce((a, b) => a + b, 0) + spec.mod;
  return { expr: formatRoll(spec), rolls, kept, mod: spec.mod, total };
}
