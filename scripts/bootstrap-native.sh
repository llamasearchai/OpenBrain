#!/usr/bin/env bash
set -euo pipefail
# bootstrap-native.sh - prepare native runtimes and run app locally without Docker
# - Detect Python and Node
# - Create venv and install backend requirements from vendor/ if offline
# - Build frontend and serve via vite preview

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
VENDOR_DIR="$ROOT_DIR/vendor"
BACKEND_DIR="$ROOT_DIR/backend"
WEB_DIR="$ROOT_DIR/web"
PYTHON="python3"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

OFFLINE=0
for arg in "$@"; do
  case "$arg" in
    --offline) OFFLINE=1 ;;
  esac
done

if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

# Python venv
"$PYTHON" -m venv "$BACKEND_DIR/.venv"
source "$BACKEND_DIR/.venv/bin/activate"

pip install --upgrade pip
if [[ $OFFLINE -eq 1 ]]; then
  pip install --no-index --find-links "$VENDOR_DIR/python" -r "$BACKEND_DIR/requirements.txt"
else
  pip install -r "$BACKEND_DIR/requirements.txt"
fi

# Prefer local Node in .node if present
LOCAL_NODE_DIR="$(ls -d "$ROOT_DIR/.node"/node-v*-$PLATFORM-$ARCH 2>/dev/null | head -n1 || true)"
if [[ -n "$LOCAL_NODE_DIR" ]]; then
  export PATH="$LOCAL_NODE_DIR/bin:$PATH"
fi

# Node install and build
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required (install system Node or place a portable Node under .node)" >&2
  exit 1
fi

pushd "$WEB_DIR" >/dev/null
if [[ $OFFLINE -eq 1 && -d "$VENDOR_DIR/node" ]]; then
  npm ci --offline || npm ci
else
  npm ci
fi
npm run build
popd >/dev/null

# Run backend and preview frontend
export OPENAI_BASE_URL=${OPENAI_BASE_URL:-http://127.0.0.1:4000}

# Start uvicorn in backend directory so 'app' package is importable
pushd "$BACKEND_DIR" > /dev/null
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
UVICORN_PID=$!
popd > /dev/null

# Serve built frontend with vite preview
pushd "$WEB_DIR" >/dev/null
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5173 &
VITE_PID=$!
popd >/dev/null

echo "Running. Backend: http://127.0.0.1:8000  Frontend: http://127.0.0.1:5173"
trap 'kill $UVICORN_PID $VITE_PID' INT TERM
wait
