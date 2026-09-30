// Proteções (LR cap. 3, p. 62, Tab. 3.6). Sem proficiência: −2d20 nos testes
// baseados em Força ou Agilidade. Leve pede proficiência em proteções leves;
// pesada e escudo, em proteções pesadas. O SaH não traz proteções novas
// (Tab. 1.4 e 1.5, SaH pp. 38 e 40; a braçadeira reforçada é item operacional).
import type { Protecao } from '../tipos';

const LR62 = { fonte: 'LR' as const, pagina: 62 };

export const PROTECOES: Protecao[] = [
  { id: 'protecao-leve', nome: 'Proteção leve', ref: LR62, categoria: 1, tipo: 'leve', defesa: 5, espacos: 2,
    resumo: 'Jaqueta de couro grossa ou colete de kevlar, como os de seguranças e policiais.' },
  // penalidade com sinal, como PENALIDADE_CARGA em pericias.ts
  { id: 'protecao-pesada', nome: 'Proteção pesada', ref: LR62, categoria: 2, tipo: 'pesada', defesa: 10, espacos: 5,
    resistencia: { dano: ['balistico', 'corte', 'impacto', 'perfuracao'], valor: 2 }, penalidadePericias: -5,
    resumo: 'Equipamento de tropa especial: capacete, protetores e colete de kevlar em camadas. RD 2 contra dano físico e −5 nas perícias de carga.' },
  { id: 'escudo', nome: 'Escudo', ref: LR62, categoria: 0, tipo: 'escudo', defesa: 2, espacos: 2,
    resumo: 'Escudo medieval ou de tropa de choque, empunhado numa mão. Para proficiência, conta como proteção pesada.' },
];
