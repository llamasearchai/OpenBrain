#!/usr/bin/env bash
set -euo pipefail

# ob.sh - one-command installer/runner for OpenBrain
# Modes:
#  - Default: docker compose local stack (LiteLLM + Ollama + Qdrant + Observability)
#  - --native: run locally without Docker using Python venv and Node
#  - Flags: --no-observability, --no-vector, --no-ollama, --no-grafana, --pull, --offline

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
DATA_DIR="$ROOT_DIR/data"
VENDOR_DIR="$ROOT_DIR/vendor"

mkdir -p "$DATA_DIR"

MODE="docker"
OBSERVABILITY=1
VECTOR=1
OLLAMA=1
PULL=0
OFFLINE=0

for arg in "$@"; do
  case "$arg" in
    --native) MODE="native" ;;
    --no-observability) OBSERVABILITY=0 ;;
    --no-vector) VECTOR=0 ;;
    --no-ollama) OLLAMA=0 ;;
    --pull) PULL=1 ;;
    --offline) OFFLINE=1 ;;
    *) echo "Unknown flag: $arg"; exit 2 ;;
  esac
done

if [[ "$MODE" == "docker" ]]; then
  # Ensure docker and compose
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required." >&2
    exit 1
  fi

  # Verify Docker daemon is running
  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon is not running. Please start Docker Desktop and retry." >&2
    exit 1
  fi

  # Prefer BuildKit, but gracefully fall back if buildx is unavailable
  BUILDKIT_ENABLED=1
  if ! docker buildx version >/dev/null 2>&1; then
    BUILDKIT_ENABLED=0
  fi

  COMPOSE_FILE="$DEPLOY_DIR/compose.yml"

  export OPENAI_BASE_URL=${OPENAI_BASE_URL:-http://127.0.0.1:4000}

  if [[ $PULL -eq 1 && $OFFLINE -eq 0 ]]; then
    docker pull qdrant/qdrant:latest || true
    docker pull grafana/grafana:10.4.2 || true
    docker pull prom/prometheus:v2.54.1 || true
    docker pull grafana/loki:2.9.8 || true
    docker pull otel/opentelemetry-collector-contrib:0.109.0 || true
    docker pull ollama/ollama:latest || true
  fi

  if [[ $BUILDKIT_ENABLED -eq 1 ]]; then
    DOCKER_BUILDKIT=1 docker build -f "$DEPLOY_DIR/app.Dockerfile" -t openbrain/app:local "$ROOT_DIR"
    DOCKER_BUILDKIT=1 docker build -f "$DEPLOY_DIR/litellm.Dockerfile" -t openbrain/litellm:local "$DEPLOY_DIR"
  else
    echo "Buildx not available; building without BuildKit optimizations." >&2
    docker build -f "$DEPLOY_DIR/app.Dockerfile" -t openbrain/app:local "$ROOT_DIR"
    docker build -f "$DEPLOY_DIR/litellm.Dockerfile" -t openbrain/litellm:local "$DEPLOY_DIR"
  fi

  PROFILES=()
  [[ $OBSERVABILITY -eq 1 ]] && PROFILES+=("--profile" "observability")
  [[ $VECTOR -eq 1 ]] && PROFILES+=("--profile" "vector")
  [[ $OLLAMA -eq 1 ]] && PROFILES+=("--profile" "ollama")

  docker compose -f "$COMPOSE_FILE" up -d "${PROFILES[@]}"
  echo "Stack is starting. Backends: http://127.0.0.1:8000, Frontend: http://127.0.0.1:5173"
  exit 0
fi

# Native mode
"$ROOT_DIR/scripts/bootstrap-native.sh" ${OFFLINE:+--offline}
