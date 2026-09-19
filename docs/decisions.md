# Architectural and Technical Decision Log

## Format
- **Date:** YYYY-MM-DD
- **Decision:** Brief title / decision summary
- **Context & Rationale:** Why this choice was made, alternatives considered, and impact.

---

### 2026-09-19: Initial Monorepo Setup and Cross-Platform Scripting
- **Decision:** Use npm workspace / root package scripts with `concurrently` alongside a standard `Makefile` / npm commands for starting backend (FastAPI) and frontend (Vite+React) seamlessly on Windows and Unix platforms.
- **Rationale:** Developer experience is crucial; users on Windows and macOS/Linux should be able to run `npm run dev` or `make dev` and `npm test` or `make test` without friction.
- **Status:** Approved / Implemented in Phase 0.
