# Phase 0 — Project setup & scaffolding — Report

**Date:** 2026-09-19
**Status:** ✅ Complete

## What was built
- Monorepo repository layout matching `plan.md` §5 with backend, frontend, data, scripts, docs, and reports folders.
- **FastAPI backend**:
  - `/health` endpoint returning `{ "status": "ok", "version": "0.1.0", "service": "signbridge-backend" }`.
  - Stub `/api/translate` endpoint echoing structured `GlossToken` objects with sequence number, question detection, and processing latency.
  - Pydantic models in `backend/app/schemas.py` and settings in `backend/app/config.py`.
  - Downloaded and verified spaCy `en_core_web_sm` model.
- **React + Vite frontend**:
  - React 19 + TypeScript (strict mode) + Tailwind CSS.
  - Typed API client in `frontend/src/lib/api.ts` and contracts in `frontend/src/lib/types.ts`.
  - Responsive, high-contrast dashboard in `frontend/src/App.tsx` displaying live connection status badge, service metadata, and manual refresh trigger.
- **Development & Quality Tooling**:
  - Root `package.json` and `Makefile` providing single-command dev (`npm run dev` / `make dev`), test (`npm test` / `make test`), and lint (`npm run lint` / `make lint`).
  - Automated test runners: `pytest` (backend) and `vitest` with `happy-dom` (frontend).
  - Code linters: `ruff` (backend) and `oxlint` + `eslint` + `prettier` (frontend).
  - `.env.example`, `.gitignore`, `docs/decisions.md`, and `.agent/rules/signbridge.md`.

## Files added/changed
- `backend/requirements.txt`
- `backend/requirements-dev.txt`
- `backend/app/__init__.py`
- `backend/app/config.py`
- `backend/app/schemas.py`
- `backend/app/main.py`
- `backend/tests/__init__.py`
- `backend/tests/test_health.py`
- `backend/tests/test_translate_stub.py`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/vitest.config.ts`
- `frontend/eslint.config.js`
- `frontend/.prettierrc`
- `frontend/src/index.css`
- `frontend/src/setupTests.ts`
- `frontend/src/lib/types.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `package.json`
- `Makefile`
- `.gitignore`
- `.env.example`
- `docs/decisions.md`
- `.agent/rules/signbridge.md`

## Automated tests
| Command | Result |
|---|---|
| `python -m pytest backend/tests` | 2 passed in 0.43s |
| `npm run test --prefix frontend` (vitest) | 2 passed in 0.79s |
| `python -m ruff check backend` | All checks passed (0 errors) |
| `npm run lint --prefix frontend` (oxlint & eslint) | 0 warnings, 0 errors |

## Acceptance criteria (from plan.md)
- [x] One command starts both servers — `npm run dev` runs concurrently with backend on port 8000 and frontend on port 5173.
- [x] `/health` returns 200 and UI shows connection status — `/health` verified via unit test, curl/urllib, and frontend `App.test.tsx`.
- [x] `pytest`, `vitest`, `lint` all run green — 4 tests passed, 0 failed, 0 linter errors.

## Manual tests for the user
1. Start both servers: `npm run dev` (or `make dev`).
2. Open Chrome/Edge and navigate to `http://localhost:5173/`.
3. Check the header in top-right:
   - **Expected:** Green badge displaying `Backend connected` with a checkmark, and status text showing `Connected (HTTP 200 OK)`.
4. Click the refresh button next to the badge.
   - **Expected:** The refresh icon spins briefly and the status badge remains green and connected.

## Measured numbers (if applicable)
- Backend `/health` response time: < 3 ms
- Backend stub `/api/translate` response time: ~1 ms
- Frontend Vitest execution duration: ~787 ms

## Known issues / limitations
- `open_browser_url` in local environment encountered a CDP connection issue; manual browser check documented above.
- `/api/translate` is a Phase 0 stub echoing words as tokens; real spaCy NLP and ASL grammar rules will be implemented in Phase 2.

## Decisions made
- Logged in `docs/decisions.md`: Unified root scripts with `concurrently` and `Makefile` for frictionless cross-platform developer experience on Windows/Linux/macOS.

## Ready for Phase N+1?
Yes — Phase 0 setup and scaffolding is verified and green. Ready for Phase 1 (Speech capture, live captions, typed input).
