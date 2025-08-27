# Summary

Prepare public beta: documentation, assets rename, security hardening, CI, and cleanup.

# Changes
- README with logo, Assets section, Git LFS, security & dev instructions
- Model path renamed to /models/openbrain/brain.gltf; references updated
- Removed unused detailed model source bundle and empty dirs
- Hardened .gitignore; added .env.example; removed committed artifacts
- CI workflow fixed for backend (pytest) and web (lint/test/build)
- Added Vitest coverage; ESLint ignores coverage; Node scripts polished
- Backend agent providers & typed requests; tests stabilized

# Verification
- Backend: pytest (unit + integration)
- Frontend: npm run lint, npm test, npm run build
- Manual smoke: API /healthz, frontend loads model & WebSocket metrics

# Security
- No secrets in repo; env via .env / CI secrets
- Docker ports bound to localhost in dev

# Author
- Nik Jois
