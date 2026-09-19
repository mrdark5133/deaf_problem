**Current phase:** 7 — Evaluation, demo mode & pitch pack (COMPLETE)
**Approved phases:** 0 (Setup & scaffolding), 1 (Speech capture), 2 (NLP: text → ASL gloss engine), 3 (Sign library pipeline CV), 4 (Avatar renderer & sign player), 5 (Real-time integration & latency), 6 (Accessibility & UX polish), 7 (Evaluation, demo mode & pitch pack)

---

## Phase 0 — Project setup & scaffolding
- [x] Create repo structure from `plan.md` §5
- [x] Backend: FastAPI app, `/health`, stub `/api/translate` (echo), pydantic schemas, config loader
- [x] Frontend: Vite + React + TS (strict) + Tailwind; API client; "Backend connected" indicator
- [x] Tooling: ESLint, Prettier, Ruff, pytest, vitest, Playwright installed and configured
- [x] Single command to run both servers (`make dev` or `npm run dev`)
- [x] `.env.example`, `.gitignore`, `docs/decisions.md`
- [x] Download spaCy `en_core_web_sm` step documented in setup
- [x] **Tests:** `make test` (pytest + vitest) green, `make lint` green, `/health` returns 200, UI shows connected state (verified via tests & HTTP checks)
- [x] Write `reports/phase-0-report.md`
- [x] 🛑 **STOP → ask user to approve Phase 1**

## Phase 1 — Speech capture, live captions, typed input
- [x] `TextSource` abstraction (speech + typed emit the same events: `interim`, `final`)
- [x] `useSpeechRecognition` hook: continuous, interim results, auto-restart, error mapping
- [x] Mic button with states: idle / listening / denied / unsupported
- [x] Caption panel: interim (muted) vs final (solid), `aria-live="polite"`, scrollback
- [x] Typed input box (Enter to send) using the same event flow
- [x] Unsupported-browser + permission-denied messages (plain language)
- [x] **Tests:** vitest for hook with mocked `SpeechRecognition` (interim→final order, auto-restart, error paths); unit & component tests for typed input flow
- [x] **Manual test for user:** speak 3 sentences in Chrome → captions appear live (documented in report)
- [x] Write `reports/phase-1-report.md`
- [x] 🛑 **STOP → ask user to approve Phase 2**

## Phase 2 — NLP: text → ASL gloss engine
- [x] `data/vocabulary.json` (gloss list, categories, synonyms) from Appendix A
- [x] Pipeline skeleton: normalize → sentence split → spaCy tokenize/lemma/POS
- [x] Rule: drop articles and copulas
- [x] Rule: move time words to the front
- [x] Rule: tense markers (`FINISH`, `WILL`)
- [x] Rule: wh-questions (wh-word to end) + `is_question` / `question_type`
- [x] Rule: yes/no question detection
- [x] Rule: negation handling
- [x] Rule: pronoun mapping
- [x] Synonym mapping (hi→HELLO, thanks→THANK-YOU, …)
- [x] Numbers and out-of-vocabulary → fingerspell tokens (`letters` array)
- [x] Real `/api/translate` with `processing_ms` in the response
- [x] Input hardening: empty, very long, punctuation-only, emoji, ALL CAPS
- [x] Optional `USE_LLM_GLOSS` flag (default off) with timeout + fallback (configured in config.py)
- [x] `tests/fixtures/gloss_cases.json` with **≥ 40** golden cases (42 cases)
- [x] **Tests:** `pytest backend` all green (16 passed); latency benchmark p95 < 100 ms (measured p95: 3.79 ms)
- [x] Write `reports/phase-2-report.md` including the golden-case pass rate (100%)
- [x] 🛑 **STOP → ask user to approve Phase 3**

## Phase 3 — Sign library pipeline (CV)
- [x] Define TypeScript + Python types for the clip schema
- [x] Normalization util (shoulder-mid origin, shoulder-width scale) + unit tests
- [x] Smoothing util + gap-filling for missing hand frames + unit tests
- [x] Left/right hand assignment by nearest pose wrist + unit test
- [x] `/recorder` route: webcam, MediaPipe Pose + Hands overlay, countdown, record, trim idle frames, save/download clip JSON
- [x] Fingerspelling set: A–Z + 0–9 (synthetic, clearly flagged)
- [x] `scripts/generate_placeholder_clips.py` → a synthetic clip for every vocabulary word, `"synthetic": true`
- [x] `data/signs/index.json` generation
- [x] `scripts/validate_library.py`: schema, fps, NaN, duration bounds, coverage report (real vs synthetic)
- [x] Frontend loader for the library (`index.json` + lazy clip fetch + cache)
- [x] **Tests:** `pytest` (validator, generator), `vitest` (normalize/smooth/assign), validator passes on the whole library (96/96 clips valid, 60/60 vocab coverage 100%)
- [x] **Manual test for user/signer:** `/recorder` page accessible via Camera icon; records a clip, exports JSON; validator passes on new clips
- [x] Write `reports/phase-3-report.md` with the coverage table (0 real, 96 synthetic, 100% coverage)
- [x] 🛑 **STOP → ask user to approve Phase 4**

## Phase 4 — Avatar renderer & sign player
- [x] `SkeletonAvatar` canvas: head, torso, arms, detailed hands, clean styling, resizes with container (ResizeObserver + HiDPI)
- [x] Rest pose (idle) — `src/player/restPose.ts`
- [x] `SignPlayer` state machine: queue, `play/pause/resume/clear`, speed 0.5×–1.5×
- [x] Events: `onTokenStart`, `onTokenEnd`, `onIdle`
- [x] Blending between clips (~150 ms ease) + return to rest
- [x] Fingerspell playback with per-letter timing (letter clips share tokenIndex, expand to ClipQueueItems)
- [x] Non-manual cue icon for questions (SYNTHETIC badge on PlayerTestPage, question flag passed via props)
- [x] Placeholder badge for synthetic clips (dev mode only — shown in PlayerTestPage)
- [x] `/player-test` dev page playing hardcoded token list (`WHERE DOCTOR`, fingerspelled `SIGN`) + speed slider + event log
- [x] **Tests:** vitest with explicit timestamps (queue order, speed clamping, pause/resume, clear, blending math, fingerspell grouping); fps measurement ≥ 55 confirmed via RAF loop badge
- [x] Write `reports/phase-4-report.md` with fps and architecture notes
- [x] 🛑 **STOP → ask user to approve Phase 5**

## Phase 5 — Real-time integration & latency
- [x] Chunker (final / punctuation / stable-interim ~800 ms / ≥ 6 words) + unit tests
- [x] API client with `seq`, timeout, one retry
- [x] Ordering guard: drop stale or duplicate responses
- [x] Backpressure: speed-up to 1.5× + drop filler when lag grows; never > ~4 s behind
- [x] Main screen: captions + gloss strip (current token highlighted) + avatar
- [x] Latency instrumentation + toggleable debug overlay + console/log output
- [x] Friendly error + auto-recovery when backend is down/slow
- [x] **Tests:** e2e with mocked `SpeechRecognition` (full flow); 20-sentence rapid-fire test (no duplicates, right order); latency p50 measured: typed < 500 ms, spoken-final < 1000 ms
- [x] **Manual test for user:** speak a 5-sentence doctor-visit script; confirm signing keeps up
- [x] Write `reports/phase-5-report.md` with latency numbers
- [x] 🛑 **STOP → ask user to approve Phase 6**

## Phase 6 — Accessibility & UX polish
- [x] Keyboard-only flow + documented shortcuts (space = mic toggle, ? = help, M = mirror, C = clear)
- [x] ARIA labels/roles, visible focus, logical tab order
- [x] Themes: light, dark, high-contrast; contrast ≥ 4.5:1 (WCAG AA & AAA)
- [x] Controls: caption font size, avatar size, mirror toggle, speed slider (persisted in localStorage)
- [x] `prefers-reduced-motion` respected for UI (not for signing)
- [x] Empty/loading/error/listening states + 3-step onboarding hint
- [x] Responsive layout (projector + tablet)
- [x] `docs/limitations.md`
- [x] **Tests:** useAccessibilitySettings unit test suite, contrast tokens, tsc strict check
- [x] Write `reports/phase-6-report.md`
- [x] 🛑 **STOP → ask user to approve Phase 7**

## Phase 7 — Evaluation, demo mode & pitch pack
- [x] Evaluation script → `docs/evaluation.md` (gloss accuracy, coverage on 3 demo scripts, latency p50/p95, fps)
- [x] Demo mode: Doctor visit, Classroom, Help desk (works offline, no mic)
- [x] `README.md` (architecture diagram, ≤ 5-command setup, screenshots)
- [x] `docs/pitch.md` (3-minute script + 5 judge Q&As)
- [x] `docs/demo-checklist.md` (pre-demo checks + plan B)
- [x] Cleanup: dead code, lint, all tests green
- [x] Verify fresh-clone setup works in ≤ 5 commands
- [x] Write `reports/phase-7-report.md` + final project summary
- [x] 🛑 **STOP → project complete; ask user about stretch goals**

---

## Stretch (only after explicit approval)
- [ ] 3D avatar retargeting (Three.js)
- [ ] Offline speech-to-text (faster-whisper via WebSocket)
- [ ] LLM-assisted gloss for unknown phrases

## Blockers / Questions for user
_(agent: list open questions here)_

## Decision log
_(agent: link to `docs/decisions.md` entries)_
