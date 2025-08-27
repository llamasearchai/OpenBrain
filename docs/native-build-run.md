# Native Build and Run (No Docker)

This guide describes how to build, test, and run OpenBrain locally using native runtimes.

## Prerequisites

- Python 3.11+ (tested with 3.12)
- Node.js 18+ (portable Node supported via `.node/*` in this repo)
- Optional: `.env` with `OPENAI_API_KEY` for exercising `/agents/plan` endpoint

## Backend (Python/FastAPI)

- Create venv and install deps:
  - `python3 -m venv backend/.venv && source backend/.venv/bin/activate`
  - `pip install -r backend/requirements.txt`
- Run tests: `PYTHONPATH=. pytest -q`
- Run API: `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
- Verify: `curl http://127.0.0.1:8000/healthz` → `{ "status": "ok" }`

## Frontend (Vite/React/TS)

Use your system Node or the portable Node under `.node/`:

- macOS Apple Silicon: `export PATH="$PWD/.node/node-v20.18.1-darwin-arm64/bin:$PATH"`
- macOS Intel: `export PATH="$PWD/.node/node-v20.18.1-darwin-x64/bin:$PATH"`
- Linux x64: `export PATH="$PWD/.node/node-v20.18.1-linux-x64/bin:$PATH"`

Then:

- Install deps: `(cd web && npm ci)`
- Lint: `(cd web && npm run lint)`
- Build: `(cd web && npm run build)`
- Dev: `(cd web && npm run dev)` → open `http://127.0.0.1:5173`
- Preview build: `(cd web && npm run preview -- --host 127.0.0.1 --port 5173)`

Vite proxy forwards `/agents/*`, `/assets/*`, and `/ws/*` to `http://127.0.0.1:8000`.

## One-Command Local Run

- `bash scripts/bootstrap-native.sh`
  - Detects portable Node in `.node/` automatically
  - Starts backend at `http://127.0.0.1:8000`
  - Serves built frontend at `http://127.0.0.1:5173`

## Reproducible Native Build

- `bash scripts/build-native.sh` (options: `--offline`, `--skip-tests`)
  - Prepares Python venv and installs backend deps
  - Runs backend tests (unless `--skip-tests`)
  - Installs frontend deps, lints, and builds to `web/dist`

## Environment Variables

- `OPENAI_API_KEY`: required to call `/agents/plan` (tests mock OpenAI; use any test-like value)
- `OPENAI_BASE_URL`: optional; when set to a local LiteLLM proxy (e.g., `http://127.0.0.1:4000`), the backend will use it by default
- `OTEL_EXPORTER_OTLP_ENDPOINT`: optional; enables OpenTelemetry instrumentation when provided

## Notes

- Tests for the frontend can be sensitive to constrained sandboxes. Use `npm run test:ci` (single worker) if you encounter pool limitations; standard `npm test` is fine on a typical local setup.
- Production assets are generated under `web/dist/`. Static hosting or `vite preview` can serve them.
