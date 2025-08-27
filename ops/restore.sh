#!/usr/bin/env bash
set -euo pipefail
# ops/restore.sh - restore snapshot created by ops/backup.sh

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/openbrain-YYYYmmdd-HHMMSS.tar.gz" >&2
  exit 1
fi

ARCHIVE="$1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

python3 - <<'PY'
import os, tarfile, sys
archive = sys.argv[1]
root = sys.argv[2]
with tarfile.open(archive, 'r:gz') as tar:
    tar.extractall(path=root)
print('Restored to', root)
PY
"$ARCHIVE" "$ROOT_DIR"

echo "Restore completed into: $ROOT_DIR"

