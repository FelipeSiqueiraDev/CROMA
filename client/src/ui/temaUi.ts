import { TEMAS, type Tema } from '@crona/shared';
import { arteCarregada } from './icons';

/**
 * O tema da interface (PROMPT-INTERFACE-GAME): cinco temas, Ordem é o neutro e o padrão.
 *
 * A arte do kit fica em duas pastas:
 * - /arte/interface/<grupo>/<peça>.png: as peças neutras, iguais em todos os temas;
 * - /arte/temas/<tema>/interface/<grupo>/<peça>.png: as que têm a cor do tema (o ativo, o brilho, o papel).
 *
 * Cada peça que existe vira uma variável de CSS, `--ui-<grupo>-<peça>: url(...)`. As neutras e as da
 * Ordem ficam na raiz; as dos outros temas, em `[data-tema="<tema>"]`, que veste só a tela do agente
 * (a FICHAS dele, a requisição, o celular). O CSS usa a variável com uma reserva: sem a arte, fica o
 * desenho de hoje.
 */

const NEUTRA = /^\/arte\/interface\/([a-z0-9-]+)\/([a-z0-9-]+)\.(png|jpe?g|webp)$/;
const DO_TEMA = /^\/arte\/temas\/([a-z]+)\/interface\/([a-z0-9-]+)\/([a-z0-9-]+)\.(png|jpe?g|webp)$/;

/** As variáveis de cada tema ('' = a raiz), a partir da lista de arte do servidor. */
export function variaveisDoTema(arquivos: Iterable<string>): Map<string, Map<string, string>> {
  const porTema = new Map<string, Map<string, string>>([['', new Map()]]);
  const poe = (tema: string, nome: string, url: string) => {
    if (!porTema.has(tema)) porTema.set(tema, new Map());
    porTema.get(tema)!.set(nome, `url("${url}")`);
  };
  for (const url of arquivos) {
    const n = NEUTRA.exec(url);
    if (n) {
      poe('', `--ui-${n[1]}-${n[2]}`, url);
      continue;
    }
    const t = DO_TEMA.exec(url);
    if (!t || !TEMAS.includes(t[1] as Tema)) continue;
    // a Ordem é o padrão: as peças dela valem na raiz e em [data-tema="ordem"]
    poe(t[1] === 'ordem' ? '' : t[1], `--ui-${t[2]}-${t[3]}`, url);
  }
  return porTema;
}

function folha(porTema: Map<string, Map<string, string>>): string {
  const bloco = (sel: string, vars: Map<string, string>) => `${sel} {\n${[...vars].map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`;
  const partes: string[] = [];
  const raiz = porTema.get('') ?? new Map();
  partes.push(bloco(':root, [data-tema="ordem"]', raiz));
  for (const [tema, vars] of porTema) if (tema) partes.push(bloco(`[data-tema="${tema}"]`, vars));
  return partes.join('\n');
}

let montada = false;
/** Monta a folha de estilo das peças do kit (uma vez, quando a lista de arte chega). */
export function montarTemas() {
  if (montada) return;
  montada = true;
  void arteCarregada.then((lista) => {
    const style = document.createElement('style');
    style.id = 'crona-temas';
    style.textContent = folha(variaveisDoTema(lista));
    document.head.append(style);
  });
}

/** Veste um pedaço da tela com o tema do agente (sem tema = Ordem). */
export function vestirTema(el: HTMLElement, tema: Tema | undefined) {
  const t = tema ?? 'ordem';
  if (el.dataset.tema !== t) el.dataset.tema = t;
}
