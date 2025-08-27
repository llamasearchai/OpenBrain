# Contributing

Thank you for your interest in contributing to OpenBrain!

## Getting Started
- Fork the repository and create your feature branch from `main`.
- For release work, use a `release/*` branch name.
- Keep changes small and focused; add tests for new functionality.

## Development Environment
- Backend: Python 3.11+, FastAPI
- Frontend: Node 20+, React + Vite + TypeScript
- Tests: `pytest` for backend; `vitest` for frontend

## Setup
```
# Backend
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# Frontend
(cd web && npm ci)
```

## Running
```
# API
(cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000)

# Web
(cd web && npm run dev)
```

## Tests
```
pytest
(cd web && npm test)
```

## Linting
```
(cd web && npm run lint)
```

## Commit Messages
- Use conventional commits where possible (e.g., `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- Scope is encouraged (e.g., `backend:`, `web:`, `docs:`).

## Pull Requests
- Describe the motivation, approach, and testing.
- Include screenshots or logs if helpful.
- Ensure CI is green before requesting review.

## Code of Conduct
By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).
