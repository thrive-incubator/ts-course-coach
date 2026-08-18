#!/bin/bash
set -euo pipefail

################################################################################
# Run backend + frontend locally with optional tunnel
#
# Prerequisites:
#   - backend/.env with required config
#   - Python 3.11+, Node.js 20+
#   - (optional) cloudflared for tunnel
#
# Usage:
#   ./run-local.sh                # Start with tunnel
#   ./run-local.sh --no-tunnel    # Local only
#   ./run-local.sh --skip-deps    # Skip dependency install
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
BACKEND_PORT=8080
FRONTEND_PORT=5173

# ---- Parse arguments ----
USE_TUNNEL=true
SKIP_DEPS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-tunnel) USE_TUNNEL=false ;;
    --skip-deps) SKIP_DEPS=true ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

# ---- Cleanup on exit ----
PIDS=()
TUNNEL_LOG=""

cleanup() {
  echo ""
  echo "=== Shutting down ==="
  if [ ${#PIDS[@]} -gt 0 ]; then
    for pid in "${PIDS[@]}"; do
      kill "$pid" 2>/dev/null && echo "  Stopped process $pid" || true
    done
  fi
  [ -n "$TUNNEL_LOG" ] && rm -f "$TUNNEL_LOG"
  echo "Done."
}
trap cleanup EXIT INT TERM

# ---- Validate prerequisites ----
if [ ! -f "${BACKEND_DIR}/.env" ]; then
  echo "ERROR: backend/.env not found."
  echo "  Copy backend/.env.example to backend/.env and fill in your API keys."
  exit 1
fi

command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 not found"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: node not found"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm not found"; exit 1; }

# ---- Start tunnel (if requested) ----
TUNNEL_URL=""

if [ "$USE_TUNNEL" = true ]; then
  echo "=== Starting tunnel ==="
  TUNNEL_LOG=$(mktemp)

  if command -v cloudflared >/dev/null 2>&1; then
    echo "  Using cloudflared..."
    cloudflared tunnel --url "http://localhost:${FRONTEND_PORT}" > "$TUNNEL_LOG" 2>&1 &
    PIDS+=($!)

    for i in $(seq 1 15); do
      TUNNEL_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1 || true)
      if [ -n "$TUNNEL_URL" ]; then break; fi
      sleep 1
    done
  elif command -v npx >/dev/null 2>&1; then
    echo "  Using localtunnel via npx..."
    npx localtunnel --port "${FRONTEND_PORT}" > "$TUNNEL_LOG" 2>&1 &
    PIDS+=($!)

    for i in $(seq 1 15); do
      TUNNEL_URL=$(grep -o 'https://[^ ]*\.loca\.lt' "$TUNNEL_LOG" 2>/dev/null | head -1 || true)
      if [ -n "$TUNNEL_URL" ]; then break; fi
      sleep 1
    done
  else
    echo "  WARNING: No tunnel tool found (cloudflared or npx)."
    echo "  Install cloudflared: brew install cloudflared"
    echo "  Continuing without tunnel..."
    USE_TUNNEL=false
  fi

  if [ "$USE_TUNNEL" = true ] && [ -z "$TUNNEL_URL" ]; then
    echo "  WARNING: Could not detect tunnel URL after 15s. Continuing without tunnel."
    USE_TUNNEL=false
  fi
fi

# ---- Install dependencies ----
if [ "$SKIP_DEPS" = false ]; then
  echo "=== Installing backend dependencies ==="
  cd "${BACKEND_DIR}"
  if [ ! -d "venv" ]; then
    python3 -m venv venv
  fi
  source venv/bin/activate
  pip install -r requirements.txt --quiet
  deactivate

  echo "=== Installing frontend dependencies ==="
  cd "${FRONTEND_DIR}"
  npm install --silent
fi

# ---- Start backend ----
echo "=== Starting backend on port ${BACKEND_PORT} ==="
cd "${BACKEND_DIR}"
source venv/bin/activate

CORS_VALUE="http://localhost:${FRONTEND_PORT}"
if [ -n "$TUNNEL_URL" ]; then
  CORS_VALUE="${CORS_VALUE},${TUNNEL_URL}"
fi

CORS_ORIGINS="$CORS_VALUE" FRONTEND_BASE_URL="${TUNNEL_URL:-http://localhost:${FRONTEND_PORT}}" \
  uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" --reload &
PIDS+=($!)

# ---- Start frontend ----
echo "=== Starting frontend on port ${FRONTEND_PORT} ==="
cd "${FRONTEND_DIR}"
npm run dev &
PIDS+=($!)

# ---- Print summary ----
sleep 2
echo ""
echo "============================================"
echo "  TS Course Coach - Running Locally"
echo "============================================"
echo ""
echo "  Backend:   http://localhost:${BACKEND_PORT}"
echo "  Frontend:  http://localhost:${FRONTEND_PORT}"
if [ -n "$TUNNEL_URL" ]; then
echo ""
echo "  Public URL (share this):"
echo "  >>> ${TUNNEL_URL} <<<"
fi
echo ""
echo "  Press Ctrl+C to stop all services"
echo "============================================"

wait
