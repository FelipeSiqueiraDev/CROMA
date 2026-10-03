#!/usr/bin/env bash
# Vigia a pasta da arte do GPT e sai (avisando o nome) quando aparecer um zip novo, depois que ele
# parar de crescer (o OneDrive copia aos poucos). Rode em segundo plano (Bash com run_in_background):
# o Claude é avisado quando o comando termina.
#
#   bash scripts/dev/vigia-zips.sh
#
# A pasta: CRONA_ARTE_GPT, ou a de sempre (Área de Trabalho\TEXTURAS MAPA\BASE - Ordo Realitas).
# Os zips já vistos ficam numa lista no temp (apague-a para começar do zero).
PASTA="${CRONA_ARTE_GPT:-$HOME/OneDrive/Área de Trabalho/TEXTURAS MAPA/BASE - Ordo Realitas}"
VISTOS="${TMPDIR:-${TEMP:-/tmp}}/crona-vigia-zips.txt"
[ -d "$PASTA" ] || { echo "pasta não existe: $PASTA"; exit 1; }
lista() { ls -1 "$PASTA" 2>/dev/null | grep -i ".zip$" | sort; }
[ -f "$VISTOS" ] || lista > "$VISTOS"
while true; do
  novos=$(comm -13 "$VISTOS" <(lista))
  if [ -n "$novos" ]; then
    # espera o tamanho parar de mudar
    while true; do
      a=$(cd "$PASTA" && echo "$novos" | while read -r f; do stat -c %s "$f" 2>/dev/null; done | tr '\n' ' ')
      sleep 8
      b=$(cd "$PASTA" && echo "$novos" | while read -r f; do stat -c %s "$f" 2>/dev/null; done | tr '\n' ' ')
      [ "$a" = "$b" ] && break
    done
    echo "NOVOS:"
    echo "$novos"
    lista > "$VISTOS"
    exit 0
  fi
  sleep 20
done
