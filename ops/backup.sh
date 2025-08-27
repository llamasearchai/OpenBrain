#!/usr/bin/env bash
set -euo pipefail
# ops/backup.sh - snapshot local data and optional docker images/models for offline restore

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT_DIR/backups"
ARCHIVE="$OUT_DIR/openbrain-$TS.tar.gz"
mkdir -p "$OUT_DIR"

INCLUDE_DIRS=(
  "$ROOT_DIR/data"
  "$ROOT_DIR/deploy"
)

# Optional: save docker images
SAVE_IMAGES=${SAVE_IMAGES:-0}
IMAGES=(openbrain/app:local openbrain/litellm:local qdrant/qdrant:latest grafana/grafana:10.4.2 prom/prometheus:v2.54.1 grafana/loki:2.9.8 otel/opentelemetry-collector-contrib:0.109.0 ollama/ollama:latest)

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ "$SAVE_IMAGES" == "1" ]]; then
  echo "Saving docker images ..."
  docker save "${IMAGES[@]}" -o "$TMP_DIR/images.tar" || true
  INCLUDE_DIRS+=("$TMP_DIR/images.tar")
fi

# Create archive
python3 - <<'PY'
import os, tarfile, sys
root = os.environ.get('ROOT_DIR')
archive = os.environ.get('ARCHIVE')
paths = os.environ.get('INCLUDE_DIRS','').split('\n')
paths = [p for p in paths if p]
with tarfile.open(archive, 'w:gz') as tar:
    for p in paths:
        tar.add(p, arcname=os.path.relpath(p, root))
print(archive)
PY

echo "Backup created at: $ARCHIVE"
