#!/usr/bin/env bash
# Sync the OpenRouter model configuration locally and (optionally) to Cloudflare Pages.
#
# Usage:
#   scripts/update-openrouter-model.sh --model mistralai/mistral-7b-instruct \
#     [--referer http://localhost:3000] [--title "ERPNext CoAgent Assistant"] [--cloudflare]
#
# When --cloudflare is supplied the script will push the model/title/referer secrets to the
# Cloudflare Pages project defined by CF_PAGES_PROJECT (default: erpnext-coagent-ui).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
ENV_FILE="$ROOT_DIR/frontend/coagent/.env.local"
DEFAULT_MODEL="mistralai/mistral-7b-instruct"
DEFAULT_REFERER="http://localhost:3000"
DEFAULT_TITLE="ERPNext CoAgent Assistant"
CF_PROJECT_DEFAULT="erpnext-coagent-ui"

MODEL="$DEFAULT_MODEL"
REFERER="$DEFAULT_REFERER"
TITLE="$DEFAULT_TITLE"
SYNC_CF=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      MODEL="$2"
      shift 2
      ;;
    --referer)
      REFERER="$2"
      shift 2
      ;;
    --title)
      TITLE="$2"
      shift 2
      ;;
    --cloudflare)
      SYNC_CF=true
      shift 1
      ;;
    -h|--help)
      grep '^#' "$0" | cut -c 3-
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
  esac
done

# Ensure env file exists and capture existing values.
if [[ -f "$ENV_FILE" ]]; then
  mapfile -t LINES <"$ENV_FILE"
else
  LINES=()
fi

declare -A KV
for line in "${LINES[@]}"; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  if [[ "$line" == *"="* ]]; then
    key="${line%%=*}"
    value="${line#*=}"
    KV["$key"]="$value"
  fi
done

# Preserve existing values when present.
KV[OPENROUTER_MODEL]="$MODEL"
KV[OPENROUTER_HTTP_REFERER]="$REFERER"
KV[OPENROUTER_APP_TITLE]="$TITLE"

# Ensure the API key and workflow service URL are preserved if present.
API_KEY_VALUE="${KV[OPENROUTER_API_KEY]:-}"
WORKFLOW_URL_VALUE="${KV[WORKFLOW_SERVICE_URL]:-}"

{
  echo "# OpenRouter API Configuration (Server-side only)"
  if [[ -n "$API_KEY_VALUE" ]]; then
    echo "OPENROUTER_API_KEY=$API_KEY_VALUE"
  fi
  echo "OPENROUTER_MODEL=${KV[OPENROUTER_MODEL]}"
  echo "OPENROUTER_HTTP_REFERER=${KV[OPENROUTER_HTTP_REFERER]}"
  echo "OPENROUTER_APP_TITLE=${KV[OPENROUTER_APP_TITLE]}"
  if [[ -n "$WORKFLOW_URL_VALUE" ]]; then
    echo "WORKFLOW_SERVICE_URL=$WORKFLOW_URL_VALUE"
  fi
} >"$ENV_FILE"

printf 'Updated %s with:\n  OPENROUTER_MODEL=%s\n  OPENROUTER_HTTP_REFERER=%s\n  OPENROUTER_APP_TITLE=%s\n' \
  "$ENV_FILE" "${KV[OPENROUTER_MODEL]}" "${KV[OPENROUTER_HTTP_REFERER]}" "${KV[OPENROUTER_APP_TITLE]}"

if $SYNC_CF; then
  PROJECT="${CF_PAGES_PROJECT:-$CF_PROJECT_DEFAULT}"
  echo "\nSyncing secrets to Cloudflare Pages project: $PROJECT"
  for entry in "OPENROUTER_MODEL;${KV[OPENROUTER_MODEL]}" \
                "OPENROUTER_HTTP_REFERER;${KV[OPENROUTER_HTTP_REFERER]}" \
                "OPENROUTER_APP_TITLE;${KV[OPENROUTER_APP_TITLE]}"; do
    NAME="${entry%%;*}"
    VALUE="${entry#*;}"
    printf '%s' "$VALUE" | npx wrangler pages project secret put "$NAME" --project-name "$PROJECT" >/dev/null
    echo "  • Updated $NAME"
  done
  echo "Secrets synced successfully."
else
  cat <<EOF

To push these settings to Cloudflare Pages later run:
  CF_PAGES_PROJECT=erpnext-coagent-ui \\
    scripts/update-openrouter-model.sh --model "$MODEL" --referer "$REFERER" --title "$TITLE" --cloudflare
EOF
fi
