#!/usr/bin/env bash
set -euo pipefail

# build-native.sh - Build backend (deps+tests) and frontend (lint+dist) without Docker
# Usage: scripts/build-native.sh [--offline] [--skip-tests]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
WEB_DIR="$ROOT_DIR/web"
VENDOR_DIR="$ROOT_DIR/vendor"

OFFLINE=0
SKIP_TESTS=0
for arg in "$@"; do
  case "$arg" in
    --offline) OFFLINE=1;;
    --skip-tests) SKIP_TESTS=1;;
  esac
done

# Python setup
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2; exit 1
fi
python3 -m venv "$BACKEND_DIR/.venv"
source "$BACKEND_DIR/.venv/bin/activate"
python -m pip install --upgrade pip
if [[ $OFFLINE -eq 1 ]]; then
  pip install --no-index --find-links "$VENDOR_DIR/python" -r "$BACKEND_DIR/requirements.txt"
else
  pip install -r "$BACKEND_DIR/requirements.txt"
fi

if [[ $SKIP_TESTS -ne 1 ]]; then
  echo "Running backend tests..."
  (cd "$ROOT_DIR" && PYTHONPATH=. pytest -q)
fi

# Node setup: prefer portable Node in .node if present
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
LOCAL_NODE_DIR="$(ls -d "$ROOT_DIR/.node"/node-v*-$PLATFORM-$ARCH 2>/dev/null | head -n1 || true)"
if [[ -n "$LOCAL_NODE_DIR" ]]; then
  export PATH="$LOCAL_NODE_DIR/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required (install system Node or place a portable Node under .node)" >&2
  exit 1
fi

echo "Installing frontend deps..."
pushd "$WEB_DIR" >/dev/null
if [[ $OFFLINE -eq 1 && -d "$VENDOR_DIR/node" ]]; then
  npm ci --offline || npm ci
else
  npm ci
fi
echo "Running ESLint..."
npm run lint -s
echo "Building frontend..."
npm run build -s
popd >/dev/null

echo "Build complete. Frontend dist at: $WEB_DIR/dist"
