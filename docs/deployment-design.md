# SignBridge Deployment Design (Render Free Tier)

## 1. Overview & Architecture
SignBridge will deploy to Render as a **single unified Docker web service** serving both the FastAPI backend and the compiled React SPA from the same HTTP origin on `0.0.0.0:${PORT:-10000}`.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                   Render Web Service                    │
                    │               (0.0.0.0:${PORT:-10000})                  │
                    │                                                         │
[User Browser] ────►│  TLS Proxy (Render)                                     │
   (HTTPS)          │       │                                                 │
                    │       ▼ Plain HTTP                                      │
                    │  FastAPI (Uvicorn)                                      │
                    │   ├── /health, /api/*  ───► FastAPI Routers             │
                    │   ├── /data/*          ───► StaticFiles(data/)          │
                    │   ├── /assets/*        ───► StaticFiles(frontend/dist)  │
                    │   └── /* (Catch-all)   ───► frontend/dist/index.html    │
                    └─────────────────────────────────────────────────────────┘
```

---

## 2. Audit Findings

### 2.1 API Communication & Client Endpoints
- **Current State:** The frontend uses `import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'` in `frontend/src/lib/api.ts` and `frontend/src/player/libraryLoader.ts`. Certain debug/wizard pages (`SelfCheckModal.tsx`, `HandshapeWizardPage.tsx`, `SpecPreviewPage.tsx`) currently contain hardcoded `http://localhost:8000` URLs.
- **Vite Dev Proxy:** Vite (`frontend/vite.config.ts`) currently does not define a proxy; it relies on direct cross-origin calls to `localhost:8000` with FastAPI CORS enabled.
- **Production Design:** Transition API base resolution to relative paths (`""`) by default in production (same-origin). Update hardcoded URLs across all components to respect the dynamic API base or relative paths (`/api/*`, `/data/*`).

### 2.2 Sign Library & Static Asset Serving
- **Data Location:** Sign clips and metadata live in `data/signs/`, `data/handshapes/`, and `data/signspecs/` (~11.0 MB total).
- **Current Serving Mechanism:** FastAPI mounts `data_dir` at `/data` via `app.mount("/data", StaticFiles(directory=str(data_dir)), name="data")`.
- **Image Requirements:** 
  - **Included in Image:** `data/signs/` (~10.88 MB), `data/handshapes/` (~0.08 MB), `data/signspecs/` (~0.04 MB), `data/vocabulary.json` (~6.2 KB).
  - **Excluded from Image:** `data/raw/` (raw uncompressed recordings / intermediate processing artifacts).

### 2.3 Python Dependencies & Runtime Environment
- **Dependency Manifest:** `backend/requirements.txt` (`fastapi>=0.110.0`, `uvicorn[standard]>=0.28.0`, `pydantic>=2.6.0`, `pydantic-settings>=2.2.0`, `python-dotenv>=1.0.0`, `spacy>=3.7.0`).
- **Target Python Version:** Python 3.12 (`python:3.12-slim` base image) / Python 3.13 locally.
- **Model Baking:** `en_core_web_sm` is downloaded at Docker build time via `python -m spacy download en_core_web_sm` (zero runtime network downloads).

### 2.4 Backend Routing & SPA Static Serving
- **Current Serving:** The backend does **not** currently serve `frontend/dist`.
- **App Entry Point & Start Command:**
  - Module path: `backend.app.main:app` (or `app.main:app` when working directory is `backend/`).
  - Production Command: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}`.
- **SPA Fallback Routing Plan:**
  1. API & health routes (`/health`, `/api/*`) are registered first.
  2. Static data `/data` is mounted.
  3. Static compiled assets `/assets` are mounted from `frontend/dist/assets`.
  4. Explicit 404 handler for unmatched `/api/*` routes returning JSON `{ "detail": "Not Found" }` instead of falling through to HTML.
  5. Catch-all HTML fallback (`/{full_path:path}`) returning `frontend/dist/index.html` when `frontend/dist` exists.

### 2.5 Memory & Asset Sizing (Audit Measurements)
- **Local Environment:** Windows, Python 3.13.2.
- **Memory RSS (Measured):**
  - Baseline Python process: ~120 MB (Windows overhead).
  - After spaCy model (`en_core_web_sm`) loaded: ~80–145 MB RSS.
  - Full app import & pipeline initialization: **144.6 MB RSS**.
  - **Headroom on Render 512 MB Free Tier:** > 360 MB free headroom.
- **Sign Library Size:**
  - `data/signs/`: 10.88 MB (99 files).
  - `data/handshapes/`: 0.08 MB (48 files).
  - `data/signspecs/`: 0.04 MB (31 files).
  - Total data in container: **~11.0 MB**.

---

## 3. Production Readiness Strategy
1. **Multi-Stage Docker Build:** Node 22 Alpine builds the React frontend; Python 3.12-slim packages the backend and pre-downloads spaCy.
2. **Cold Start & Wake-Up UX:** The client polls `/health` with exponential backoff / friendly banner for up to 90s during Render wake-up while allowing demo and typed input to stay interactive.
3. **Smoke Test Automation:** `scripts/smoke_test.py` validates `/health`, `/api/translate`, `/`, `/recorder`, `/assets/*`, `/data/signs/index.json`, and single sign clips.
