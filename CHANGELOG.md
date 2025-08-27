# Changelog

All notable changes to OpenBrain will be documented in this file.

## v0.1.0-beta – Initial public beta
- README: professional documentation with logo, assets section, Git LFS, security and development guides; author added (Nik Jois).
- Assets: renamed runtime model to `web/public/models/openbrain/brain.gltf`; updated all references.
- Cleanup: removed unused large model source bundle and empty folders; removed unused `webSocketService` and stray root `package.json`.
- Security: hardened `.gitignore`; added `.env.example`; bound Docker ports to localhost; removed committed `.env`/artifacts.
- CI: fixed Actions workflow to run backend pytest and web lint/test/build.
- Frontend: Vitest coverage integration and scripts; ESLint ignores coverage.
- Backend: agent provider config refined; typed request models; test stability improvements.

