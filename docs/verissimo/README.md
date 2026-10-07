# Veríssimo: o auditor de regras

O Veríssimo confere com os livros (livro de regras e *Sobrevivendo ao Horror*) **só o que mudou desde a última conferência**. Não refaz o que já conferiu: se os jogadores sobem de NEX 20% para 25%, ele confere só o NEX 25% de cada ficha e os números que mudaram por causa dele.

## Como usar

No Claude Code, dentro deste projeto:

| Comando | O que faz |
|---|---|
| `/verissimo` | confere tudo o que mudou: código e documentos de regra, e as fichas |
| `/verissimo codigo` | só código e documentos de regra |
| `/verissimo fichas` | só as fichas |
| `/verissimo Catarina` | só uma ficha (nome ou número) |
| `/verissimo tudo Catarina` | confere a ficha inteira de novo, ignorando o que já foi conferido |
| `/verissimo base` | marca o estado de agora como conferido, sem conferir (depois de uma conferência feita à mão) |
| `/verissimo historico` | lista as conferências registradas |

Ele roda num agente separado e em segundo plano: a conversa continua enquanto ele trabalha, e no fim chega um resumo curto com o caminho do relatório.

## O que ele confere

- **Código e documentos de regra:** o motor e os catálogos (`shared/src/regras/`), as condições que saem da ficha (`shared/src/vitals.ts`), os dados (`shared/src/dice.ts`), a ligação da ficha com a tela (`client/src/ui/fichaRegras.ts`), os testes das regras, o futuro código do combate e os documentos `REGRAS.md`, `COMBATE.md`, `AUDITORIA-REGRAS.md` e `CRIACAO-DE-PERSONAGEM.md`. Só as linhas que mudaram.
- **Fichas:** cada passo novo ou mudado (criação, trilha, cada NEX, mochila, prestígio) e cada número que o motor calcula de outro jeito (PV, PE, SAN, Defesa, perícias, DTs, ataques, rituais, carga). Também pega número que mudou por causa de mudança no código, sem a ficha mudar.
- Procura o que está a mais ou a menos: bônus contado duas vezes, benefício que faltou, escolha fora do requisito, item acima da patente.

## Arquivos

| Onde | O que é |
|---|---|
| `.claude/agents/verissimo.md` | o agente: método, fontes e limites |
| `.claude/skills/verissimo/SKILL.md` | o comando `/verissimo` |
| `.claude/skills/verissimo/verissimo.ts` | o que mudou desde a última conferência, e o registro de cada conferência |
| `.claude/skills/verissimo/livro.py` | leitura dos livros por página impressa |
| `docs/verissimo/relatorios/` | um relatório por conferência |
| `docs/verissimo/ABERTOS.md` | achados ainda abertos |
| `docs/verissimo/CONFERIDO.md` | fatos já lidos no livro, com página, para não reabrir |
| `server/data/verissimo/` (fora do git) | o estado: cópia dos arquivos conferidos, o retrato de cada ficha, o histórico, as páginas renderizadas e `livros.json` |

## Numa máquina nova

1. Os livros ficam fora do repositório. Crie `server/data/verissimo/livros.json`:
   ```json
   {
     "LR": "caminho/para/LIVRO DE REGRAS.pdf",
     "SAH": "caminho/para/ordem-paranormal-rpg-sobrevivendo-ao-horror.pdf",
     "marca": ["trechos da marca d'água do comprador, para esconder do texto"]
   }
   ```
   Ou use as variáveis `CRONA_LR_PDF` e `CRONA_SAH_PDF`.
2. Precisa de Python com PyMuPDF (`pip install pymupdf`), do banco no ar (`npm run banco`) e das dependências instaladas (`npm install`).
3. O estado fica só nesta máquina. Sem ele, a primeira conferência vê tudo como novo; se o que existe já foi conferido, rode `/verissimo base`.

Depois de criar ou mudar o agente, abra uma sessão nova do Claude Code para ele aparecer.
