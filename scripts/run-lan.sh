#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
cd "$PROJECT_ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Erro: instale Python 3.10 ou superior." >&2
  exit 1
fi

if [ -z "${JARVES_ACCESS_TOKEN:-}" ]; then
  JARVES_ACCESS_TOKEN=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
  export JARVES_ACCESS_TOKEN
  printf '\nToken temporário para configurar no Jarves do celular:\n%s\n\n' "$JARVES_ACCESS_TOKEN"
fi

JARVES_HOST=${JARVES_LAN_HOST:-0.0.0.0}
JARVES_PORT=${JARVES_PORT:-8000}
export JARVES_HOST JARVES_PORT

LAN_IP=$(python3 -c '
import socket

connection = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    connection.connect(("192.0.2.1", 9))
    print(connection.getsockname()[0])
finally:
    connection.close()
')

printf 'No celular conectado à mesma rede Wi-Fi, abra: http://%s:%s\n' "$LAN_IP" "$JARVES_PORT"
printf 'Mantenha este terminal e o Ollama abertos. Interrompa o servidor com Ctrl+C.\n\n'
exec "$SCRIPT_DIR/run.sh"
