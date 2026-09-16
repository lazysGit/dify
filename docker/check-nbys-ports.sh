#!/usr/bin/env bash
# Check host ports planned by docker/.env.nbys before build/up.
# If a port is busy, print a free alternative and optionally rewrite .env.nbys (--fix).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.nbys}"
FIX=0
[[ "${1:-}" == "--fix" ]] && FIX=1

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

get_env() {
  local key="$1" default="$2" line val
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    echo "$default"
    return
  fi
  val="${line#*=}"
  val="${val%%#*}"
  val="$(echo "$val" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -n "$val" ]] && echo "$val" || echo "$default"
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -lntu | awk '{print $5}' | grep -E "[:.]${port}$" >/dev/null 2>&1
    return $?
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || lsof -iUDP:"$port" >/dev/null 2>&1
    return $?
  fi
  # Fallback: try bind via python
  python3 - "$port" <<'PY'
import socket, sys
port = int(sys.argv[1])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(("0.0.0.0", port))
except OSError:
    sys.exit(0)  # in use
else:
    s.close()
    sys.exit(1)  # free
PY
}

who_holds() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -lntp 2>/dev/null | grep -E "[:.]${port} " || ss -lntu | grep -E "[:.]${port} " || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
  fi
}

find_free() {
  local start="$1" p
  p="$start"
  while (( p < 65535 )); do
    if ! port_in_use "$p"; then
      # rootless: avoid privileged <1024 unless already free and allowed
      echo "$p"
      return 0
    fi
    p=$((p + 1))
  done
  return 1
}

set_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i -E "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$val" >>"$ENV_FILE"
  fi
}

NGINX_HTTP="$(get_env EXPOSE_NGINX_PORT 80)"
NGINX_HTTPS="$(get_env EXPOSE_NGINX_SSL_PORT 443)"
PLUGIN_DEBUG="$(get_env EXPOSE_PLUGIN_DEBUGGING_PORT 5003)"

echo "=== NBYS host port check (from $ENV_FILE) ==="
echo "Only these are published to the host for default weaviate+postgresql stack:"
echo "  EXPOSE_NGINX_PORT            = $NGINX_HTTP   (HTTP)"
echo "  EXPOSE_NGINX_SSL_PORT        = $NGINX_HTTPS  (HTTPS)"
echo "  EXPOSE_PLUGIN_DEBUGGING_PORT = $PLUGIN_DEBUG (plugin remote debug)"
echo

busy=0
declare -A replacements=()

check_one() {
  local key="$1" port="$2" hint="$3"
  if port_in_use "$port"; then
    busy=1
    echo "[BUSY] $key=$port  ($hint)"
    who_holds "$port" | sed 's/^/       /' || true
    local start="$port"
    # Prefer high ports for rootless / occupied privileged ports
    if (( port < 1024 )); then
      start=$((18000 + port))
    else
      start=$((port + 1))
    fi
    local free
    free="$(find_free "$start")"
    echo "       suggest: $key=$free"
    replacements["$key"]="$free"
  else
    echo "[FREE] $key=$port  ($hint)"
    if (( port < 1024 )); then
      echo "       note: port <$port> is privileged; rootless Podman may still fail to bind — prefer >=1024"
    fi
  fi
}

check_one EXPOSE_NGINX_PORT "$NGINX_HTTP" "nginx HTTP"
check_one EXPOSE_NGINX_SSL_PORT "$NGINX_HTTPS" "nginx HTTPS"
check_one EXPOSE_PLUGIN_DEBUGGING_PORT "$PLUGIN_DEBUG" "plugin_daemon debug"

echo
if (( busy == 0 )); then
  echo "All planned host ports look free."
  exit 0
fi

echo "Some ports are occupied."
if (( FIX == 1 )); then
  for key in "${!replacements[@]}"; do
    set_env "$key" "${replacements[$key]}"
    echo "updated $ENV_FILE: $key=${replacements[$key]}"
  done
  echo "Re-run without --fix to confirm, then build/up."
  exit 0
fi

echo "Fix options:"
echo "  1) Auto-write free ports into .env.nbys:"
echo "       $0 --fix"
echo "  2) Manually edit $ENV_FILE and set the suggested values above."
exit 2
