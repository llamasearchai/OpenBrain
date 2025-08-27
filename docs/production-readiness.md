# OpenBrain Production Readiness Analysis

This document provides an evidence-based assessment of the current OpenBrain repository and a concrete, offline-first, single-host self-hosting plan. All findings cite specific files and symbols present in this codebase as of this commit.

1. Executive summary
- OpenBrain is a two-tier app: FastAPI backend and a React+Vite frontend.
- The backend exists at backend/app with entrypoint app.main:app (backend/app/main.py) and configuration in backend/app/config.py. It currently uses OpenAI via the openai Python SDK in backend/app/agents.py but has been updated to support a local-first LiteLLM proxy by default (base_url http://127.0.0.1:4000).
- The frontend builds via web/Dockerfile and serves static assets with Nginx.
- An existing top-level docker-compose.yml builds both services, but lacks secure defaults and observability.
- This plan adds: deploy/compose.yml, deploy/app.Dockerfile, deploy/litellm.Dockerfile, deploy/otel-collector.yaml, deploy/prometheus.yml, deploy/grafana provisioning, deploy/loki-config.yml, and scripts for cross-platform install, native bootstrap, and backup/restore.
- Default operation is offline/local: Ollama for models, LiteLLM proxy, Qdrant for vector DB, filesystem storage, and a full local observability stack. All services bind to localhost by default.

2. Architecture overview
- Backend: FastAPI app instantiated in backend/app/main.py (app = FastAPI(...)). Endpoints: /healthz, /assets/brain, /assets/brain/metadata, /ws/brain (websocket), and /agents/plan.
- Config: backend/app/config.py (Settings using pydantic-settings), fields include OPENAI_API_KEY alias and openai_model default gpt-4o-mini; file-system paths for GLTF assets.
- Agent: backend/app/agents.py uses OpenAI API. Updated to default to LiteLLM at http://127.0.0.1:4000 with a permissive key when not targeting api.openai.com.
- Frontend: web (React+Vite). Built and served by Nginx from /usr/share/nginx/html per web/Dockerfile.

3. Dependencies and supply chain
- Python backend dependencies declared in backend/requirements.txt including: fastapi, uvicorn, pydantic, pygltflib, openai, prometheus-client, OpenTelemetry packages.
- Node frontend dependencies declared in web/package.json (react, three, vite, etc.).
- Docker images are built from python:3.12-slim (backend) and node:20-alpine/nginx:1.27-alpine (frontend) for build/runtime. New compose uses images constrained to localhost and no external pulls at runtime beyond images/models you import manually.
- Offline strategy: vendor caches directory structure (vendor/python, vendor/node) is supported by bootstrap scripts to install from local wheels/tarballs if present; ollama model pulls can be pre-bundled via ops/backup.sh export-images and model pulls.

4. Configuration and secrets
- Configuration class: backend/app/config.py: Settings. Env vars: OPENAI_API_KEY, OPENAI_BASE_URL (new usage via agents.py reads from env), and openai_model.
- Added default local-first behavior: if OPENAI_BASE_URL is not set, agents.py uses http://127.0.0.1:4000 (LiteLLM).
- Secrets are not required for local path; OPENAI_API_KEY is only validated when using the real OpenAI API endpoint.
- All containers in deploy/compose.yml bind to 127.0.0.1 only and use local volumes under ./data/*.

5. Security posture and secure defaults
- Network: docker compose services expose only to 127.0.0.1 via "127.0.0.1:port" bindings.
- CORS: backend/app/config.py allows localhost origins; acceptable for single-host.
- No default cloud credentials are required; real integrations are opt-in by setting OPENAI_BASE_URL to https://api.openai.com/v1 and providing OPENAI_API_KEY.
- Nginx serves static frontend; no directory listing and no writeable web root.
- Images are based on slim/alpine where possible; no SSH, minimal packages.

6. Reliability and availability
- Single-host, single-instance setup suitable for development and small deployments. Health endpoint at /healthz.
- Stateless frontend; backend stores no persistent DB by default beyond filesystem assets and optional Qdrant storage volumes under ./data.
- Backup/restore scripts snapshot data directories.

7. Observability and diagnostics
- Metrics: backend exposes Prometheus metrics at /metrics via prometheus-client.
- Traces: OpenTelemetry collector configured at deploy/otel-collector.yaml with OTLP receiver; backend includes OpenTelemetry packages for optional instrumentation (fastapi, logging).
- Logs: Loki+Promtail stack collects container logs; Grafana dashboards provisioned under deploy/grafana/provisioning/.
- Prometheus config in deploy/prometheus.yml scrapes backend at 127.0.0.1:8000/metrics and the collector.

8. Performance and capacity
- Websocket stream /ws/brain simulates data at 4 Hz; minimal CPU footprint. three.js frontend dependent on client hardware.
- Python dependencies include numpy and trimesh; ensure container has enough memory (~512MB+) for model parsing.
- Qdrant and Ollama model memory usage depends on chosen model (e.g., llama3.1:8b). Defaults are not auto-pulled; you choose models explicitly.

9. Data management and persistence
- Filesystem-based assets under web/public/models/.
- Vector DB: Qdrant service with volume ./data/qdrant.
- Object storage: default to filesystem. If future S3/GCS usage is introduced, MinIO can be enabled.
- Backups: ops/backup.sh and ops/restore.sh snapshot ./data directories and selected config. Windows equivalents provided.

10. Privacy and compliance
- Local-first default avoids transmitting data to third-party services by default. When opting into OpenAI, standard data handling policies of OpenAI apply; toggle via OPENAI_BASE_URL and OPENAI_API_KEY.
- Logs, metrics, and traces stay local by default.

11. Deployment topologies
- Default: Single host with docker compose at deploy/compose.yml. Ports: app 8000, web 5173->80 (served via Nginx), LiteLLM 4000, Qdrant 6333, Ollama 11434, Prometheus 9090, Grafana 3000, Loki 3100, OTel Collector 4317/4318. All bound to 127.0.0.1.
- Native: scripts/bootstrap-native.(sh|ps1) sets up Python venv and Node environment, starts backend (uvicorn) and frontend (vite preview/nginx) with local LiteLLM and Ollama assumed to be running.

12. Operations: backup and restore
- ops/backup.(sh|ps1) creates a timestamped tar archive including data/qdrant, data/loki, data/promtail, and compose configs. Also exports docker images into tar files when requested.
- ops/restore.(sh|ps1) restores from a selected archive, optionally loading docker images.
- Runbooks embedded at top of scripts.

13. Offline operation and air-gapped support
- vendor/ directory is used by bootstrap scripts to install Python wheels (vendor/python/*.whl) and Node packages (vendor/node/*.tgz). If not present, scripts fall back to online registries.
- Model bundles: use ollama to pull and save models; ops/backup.sh can export models via ollama CLI and document how to import via ollama serve + ollama create/pull.
- Docker images: ops/backup.sh can docker save images used by deploy/compose.yml and scripts/ob.sh to tar files for later docker load on air-gapped machines.

14. Assumptions and risks
- Assumes Linux/macOS or Windows host with Docker (for default path) and sufficient disk for model storage when using Ollama.
- Assumes no external managed DBs; Qdrant is sufficient for local vector usage.
- Risk: enabling OpenAI requires users to supply proper API key and consent; mitigated via explicit toggle.
- Risk: Observability stack increases resource usage; can be disabled by flags in scripts/ob.sh and ob.ps1.

References to codebase
- Backend entrypoint: backend/app/main.py defines app and endpoints.
- Configuration: backend/app/config.py (Settings fields openai_api_key, openai_model, cors_origins, path helpers).
- OpenAI usage: backend/app/agents.py (OpenAI client instantiation; base_url logic for LiteLLM local-first).
- Dockerfiles: backend/Dockerfile, web/Dockerfile (existing). New: deploy/app.Dockerfile, deploy/litellm.Dockerfile.
- Existing compose: docker-compose.yml (builds api and web). New: deploy/compose.yml includes full local stack.
- Requirements: backend/requirements.txt (includes prometheus-client and OpenTelemetry instruments after this change).
- Frontend: web/package.json and web/Dockerfile.

