#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
cd "$PROJECT_ROOT"

if [ -f "$PROJECT_ROOT/.env" ]; then
  while IFS= read -r env_line || [ -n "$env_line" ]; do
    case "$env_line" in
      ''|\#*) continue ;;
    esac
    case "$env_line" in
      *=*) env_name=${env_line%%=*}; env_value=${env_line#*=} ;;
      *) continue ;;
    esac
    case "$env_name" in
      OPENAI_API_KEY)
        case "$env_value" in
          *[!A-Za-z0-9._-]*)
            echo "OPENAI_API_KEY inválida em .env. Use somente o valor da chave, sem aspas ou espaços." >&2
            exit 1
            ;;
        esac
        if [ -z "${OPENAI_API_KEY:-}" ]; then
          export "OPENAI_API_KEY=$env_value"
        fi
        ;;
      JARVES_OLLAMA_URL)
        if [ -z "${JARVES_OLLAMA_URL:-}" ]; then export "JARVES_OLLAMA_URL=$env_value"; fi
        ;;
      JARVES_OLLAMA_KEEP_ALIVE)
        if [ -z "${JARVES_OLLAMA_KEEP_ALIVE:-}" ]; then export "JARVES_OLLAMA_KEEP_ALIVE=$env_value"; fi
        ;;
      JARVES_MODEL)
        if [ -z "${JARVES_MODEL:-}" ]; then export "JARVES_MODEL=$env_value"; fi
        ;;
      JARVES_DATABASE)
        if [ -z "${JARVES_DATABASE:-}" ]; then export "JARVES_DATABASE=$env_value"; fi
        ;;
      JARVES_HOST)
        if [ -z "${JARVES_HOST:-}" ]; then export "JARVES_HOST=$env_value"; fi
        ;;
      JARVES_PORT)
        if [ -z "${JARVES_PORT:-}" ]; then export "JARVES_PORT=$env_value"; fi
        ;;
      JARVES_ACCESS_TOKEN)
        if [ -z "${JARVES_ACCESS_TOKEN:-}" ]; then export "JARVES_ACCESS_TOKEN=$env_value"; fi
        ;;
      JARVES_IMAGE_API_URL)
        if [ -z "${JARVES_IMAGE_API_URL:-}" ]; then export "JARVES_IMAGE_API_URL=$env_value"; fi
        ;;
    esac
  done < "$PROJECT_ROOT/.env"
fi

PYTHON=${JARVES_PYTHON:-}
if [ -z "$PYTHON" ] && [ -x "$PROJECT_ROOT/.venv/bin/python" ]; then
  PYTHON="$PROJECT_ROOT/.venv/bin/python"
fi
if [ -z "$PYTHON" ]; then
  PYTHON=$(command -v python3 || true)
fi
if [ -z "$PYTHON" ]; then
  echo "Erro: instale Python 3.10 ou superior." >&2
  exit 1
fi

if ! "$PYTHON" -c 'import fastapi, uvicorn' 2>/dev/null; then
  echo "Dependências ausentes para $PYTHON. Execute: $PYTHON -m pip install -r requirements.txt" >&2
  exit 1
fi

exec "$PYTHON" -m uvicorn backend.app.main:app \
  --host "${JARVES_HOST:-127.0.0.1}" \
  --port "${JARVES_PORT:-8000}"
