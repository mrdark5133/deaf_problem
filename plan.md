# plan.md — SignBridge: Real-Time Speech-to-Sign-Language Translation

## 1. Goal

A web app where a hearing person speaks (or types), and a signing avatar shows the ASL translation in near real time, with live captions and a gloss strip. Built for Deaf and hard-of-hearing people, with the strongest demo scenarios being **doctor visits, classrooms, and help desks**.

**Why it scores with judges**
- **NLP:** streaming speech recognition, chunking, ASL gloss grammar (topic-comment order, dropped articles/copulas, tense markers, question and negation handling), synonym mapping, and fingerspelling fallback.
- **Computer vision:** MediaPipe landmark capture pipeline to build the sign library, plus landmark-driven avatar rendering and blending.
- **Impact:** clear, human, easy to explain in 30 seconds.

## 2. Scope

**In scope**
- Speech → captions → ASL gloss → sign playback (~40–60 sign vocabulary + full fingerspelling A–Z, 0–9)
- Typed input as fallback and accessibility feature
- Live captions, gloss strip, speed control, high-contrast UI
- Sign capture tool (MediaPipe) to record and export the sign library
- Metrics overlay (latency) and scripted demo mode

**Out of scope (do not build)**
- Full ASL translation (ASL is not English with hand movements; we must state this limitation honestly)
- Sign-to-speech (reverse direction)
- Mobile native apps, user accounts, cloud deployment
- Facial expression synthesis (we show non-manual cues such as a question-brow icon instead)

**Stretch (only if all phases are approved and time remains)**
- 3D avatar retargeting (Three.js) on top of the landmark data
- Offline speech recognition fallback (faster-whisper over WebSocket)
- LLM-assisted gloss for unknown phrases (behind a flag)

## 3. Architecture

```
 Mic ──► Web Speech API (Chrome/Edge) ──► Chunker ──► POST /api/translate ──► Gloss Engine (FastAPI)
  │            │ interim/final text            │                                  │ spaCy + rules
  │            ▼                               │                                  ▼
  │       Live Captions (aria-live)            │                        tokens: sign | fingerspell
  │                                            │                                  │
 Typed input ────────────────────────────────►─┘                                  ▼
                                                                    Sign Library (JSON landmark clips)
                                                                                  │
                                                                                  ▼
                                              Sign Player (queue, blend, speed) ──► Canvas Avatar (2D skeleton)
                                                                                  │
                                                                                  ▼
                                                                    Gloss strip + latency overlay

 Offline tooling:  Recorder page (MediaPipe Tasks Vision, webcam) ─► clip JSON ─► scripts/validate_library.py
```

## 4. Tech Stack (fixed unless approved)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + TypeScript (strict), Tailwind | Single-page app |
| Speech-to-text | Browser Web Speech API | Chrome/Edge only. Typed-input fallback. |
| Backend | Python 3.11+, FastAPI, Uvicorn | Gloss engine + static serving |
| NLP | spaCy (`en_core_web_sm`), rule engine, JSON synonym map | Deterministic, fast, offline |
| CV | `@mediapipe/tasks-vision` (HandLandmarker + PoseLandmarker) in browser | Used in the recorder tool |
| Rendering | HTML Canvas 2D skeleton avatar | Robust and fast; 3D is stretch |
| Testing | pytest, vitest, Playwright, axe-core | |
| Tooling | ESLint, Prettier, Ruff, `Makefile` or npm scripts | One command to run everything |

## 5. Repo Structure

```
signbridge/
├─ prompt.md  plan.md  task.md  rules.md
├─ Makefile
├─ .env.example
├─ backend/
│  ├─ app/
│  │  ├─ main.py               # FastAPI app, /health, /api/translate
│  │  ├─ schemas.py            # pydantic models
│  │  ├─ gloss/
│  │  │  ├─ pipeline.py        # orchestrates steps
│  │  │  ├─ rules.py           # ASL grammar transforms
│  │  │  ├─ vocabulary.py      # loads data/vocabulary.json
│  │  │  └─ fingerspell.py
│  │  └─ config.py
│  └─ tests/  (fixtures/gloss_cases.json)
├─ frontend/
│  └─ src/
│     ├─ speech/               # useSpeechRecognition, chunker
│     ├─ player/               # SignPlayer, blending, timeline
│     ├─ avatar/               # SkeletonAvatar canvas renderer
│     ├─ ui/                   # captions, gloss strip, controls, metrics overlay
│     ├─ recorder/             # MediaPipe capture tool (separate route /recorder)
│     └─ lib/                  # API client, types
├─ data/
│  ├─ vocabulary.json          # gloss list + synonyms
│  └─ signs/                   # clip JSON files + index.json
├─ scripts/
│  ├─ generate_placeholder_clips.py
│  └─ validate_library.py
├─ docs/  (decisions.md, pitch.md, demo-checklist.md, limitations.md)
└─ reports/  (phase-N-report.md)
```

## 6. Data Contracts

**API: `POST /api/translate`**
```json
// request
{ "text": "Where is the doctor?", "is_final": true, "seq": 12 }

// response
{
  "seq": 12,
  "original": "Where is the doctor?",
  "is_question": true,
  "question_type": "wh",
  "tokens": [
    { "gloss": "DOCTOR", "kind": "sign", "clip_id": "doctor", "source": "doctor" },
    { "gloss": "WHERE",  "kind": "sign", "clip_id": "where",  "source": "Where" }
  ],
  "processing_ms": 14
}
```
Token `kind` is `sign` or `fingerspell`. A fingerspell token carries `"letters": ["J","O","H","N"]`.

**Sign clip (`data/signs/<id>.json`)**
```json
{
  "id": "hello",
  "gloss": "HELLO",
  "fps": 30,
  "synthetic": false,
  "signer": "team-member-1",
  "frames": [
    {
      "pose":       [[x,y,z], ...],      // upper-body subset: nose, eyes, ears, mouth, shoulders, elbows, wrists, hips
      "left_hand":  [[x,y,z], ...] | null, // 21 landmarks
      "right_hand": [[x,y,z], ...] | null
    }
  ],
  "meta": { "duration_ms": 900, "recorded_at": "ISO-8601" }
}
```
- Coordinates are **normalized**: origin at the shoulder midpoint, scaled by shoulder width, so every clip fits the same avatar.
- `data/signs/index.json` maps `clip_id → file`, gloss, category, synthetic flag.

## 7. Phases

Each phase has a goal, deliverables, and **acceptance criteria**. Automated test commands live in `task.md`. After each phase the agent must follow the Phase Gate Protocol in `rules.md`.

| # | Phase | Effort |
|---|---|---|
| 0 | Project setup & scaffolding | S |
| 1 | Speech capture, live captions, typed input | M |
| 2 | NLP: text → ASL gloss engine | L |
| 3 | Sign library pipeline (CV recorder + data tooling) | L |
| 4 | Avatar renderer & sign player | L |
| 5 | Real-time integration & latency | M |
| 6 | Accessibility & UX polish | M |
| 7 | Evaluation, demo mode & pitch pack | M |

---

### Phase 0 — Project setup & scaffolding
**Goal:** a running skeleton where frontend and backend talk to each other, with all tooling in place.

**Deliverables**
- Repo structure from §5, Makefile/npm scripts (`dev`, `test`, `lint`)
- FastAPI app with `/health` and a stub `/api/translate` that echoes the text
- React app that calls `/health` and shows "Backend connected"
- Lint/format/test runners configured; `.env.example`; `docs/decisions.md`

**Acceptance criteria**
- One command starts both servers
- `/health` returns 200 and the UI shows connection status
- `pytest`, `vitest`, `lint` all run green (even with trivial tests)

---

### Phase 1 — Speech capture, live captions, typed input
**Goal:** reliable text input from voice or keyboard, with live captions.

**Deliverables**
- `useSpeechRecognition` hook (continuous, interim results, auto-restart on `onend`, error states)
- Mic button with clear states (idle / listening / error), permission-denied handling
- Live caption panel (interim text greyed, final text solid) with `aria-live="polite"`
- Typed input box that emits the same events as speech
- Unsupported-browser detection with a friendly message and typed fallback
- A `TextSource` abstraction so speech and typed input feed the same pipeline

**Acceptance criteria**
- Typed and mocked-speech input both produce caption events in order (`interim` → `final`)
- Recognition restarts automatically after the browser's silent timeout
- Permission denied and unsupported browser show clear, non-technical messages
- Vitest covers the hook with a mocked `SpeechRecognition`; Playwright verifies typed flow

**Manual test (user):** speak three sentences in Chrome and confirm captions appear live.

---

### Phase 2 — NLP: text → ASL gloss engine
**Goal:** a deterministic, fast, well-tested engine that converts English text to ASL gloss tokens.

**Deliverables**
- `POST /api/translate` real implementation
- Pipeline: normalize → sentence split → spaCy tokenize/lemmatize/POS → rules → vocabulary mapping → fingerspell fallback
- Rules (data-driven where possible):
  - drop articles (a, an, the) and copulas (is, am, are, be)
  - time words moved to the front (yesterday, today, tomorrow, now, morning…)
  - tense: past → `FINISH` marker; future → `WILL`
  - wh-questions: wh-word moved to the end; `is_question` and `question_type` (`wh` / `yes_no`) flags for non-manual cue
  - negation: `not`, `don't`, `can't`… → `NOT` / `CAN'T` handling
  - pronouns: I/me/my → `ME`/`MY`, you/your → `YOU`/`YOUR`
  - synonyms: hi/hey → `HELLO`, thanks → `THANK-YOU`, etc. (`data/vocabulary.json`)
  - numbers 0–9 as fingerspell/number tokens
  - proper nouns and out-of-vocabulary words → fingerspell tokens
- Optional `USE_LLM_GLOSS` flag (default off) with timeout and rule-based fallback
- Golden test fixtures: **≥ 40 sentences** in `tests/fixtures/gloss_cases.json`

**Acceptance criteria**
- All golden cases pass
- Handles empty input, very long input (truncate/chunk), punctuation, emojis, all-caps without crashing
- p95 processing time < 100 ms for sentences up to 20 words (measured and reported)
- Works fully with the LLM flag off

---

### Phase 3 — Sign library pipeline (CV)
**Goal:** the tooling and data needed to have a real sign library, including a way to recover if we have no time to record every sign.

**Deliverables**
- `/recorder` route: webcam → MediaPipe Pose + Hands → live overlay → record button with countdown → trim idle frames → save clip JSON
- Processing utilities: normalize (shoulder-mid origin, shoulder-width scale), smooth (One-Euro or Savitzky–Golay), fill missing-hand gaps by interpolation, **assign left/right hand by proximity to the pose wrist** (do not trust MediaPipe's handedness label on mirrored video)
- Fingerspelling: 26 letters + 10 digits (static poses, plus short motion clips for J and Z)
- `scripts/generate_placeholder_clips.py`: synthetic clips (`"synthetic": true`) for every vocabulary word so later phases are never blocked
- `scripts/validate_library.py`: schema check, fps, NaN check, min/max duration, coverage report against `data/vocabulary.json`
- Seed vocabulary of ~40–60 signs (see Appendix A)

**Acceptance criteria**
- Validator passes on the whole library and prints a coverage report (real vs synthetic clips)
- Recorder produces a valid clip file that passes the validator
- Normalization has unit tests (translation/scale invariance)
- The library loads in the frontend via `index.json`

**Manual test (user / signer):** record 3 signs with the recorder, check the overlay tracks both hands and the saved clip is valid. The agent must **not** claim to have recorded real signs itself.

---

### Phase 4 — Avatar renderer & sign player
**Goal:** a smooth, readable signing avatar that plays queued tokens.

**Deliverables**
- `SkeletonAvatar` canvas renderer: head, torso, arms, and detailed hands (21 landmarks, connected), clean stylized look, readable at small sizes
- `SignPlayer`: queue, `play(tokens)`, `pause/resume/clear`, speed (0.5×–1.5×), events `onTokenStart / onTokenEnd / onIdle`
- Blending: ease from the current pose to the next clip's first frame (~150 ms), return to rest pose when idle
- Fingerspell playback with per-letter timing
- Non-manual cue indicator (raised-brow icon) when `is_question`
- Placeholder badge for synthetic clips (dev mode)
- A dev page `/player-test` that plays a hardcoded token list

**Acceptance criteria**
- Renders at ≥ 55 fps on a normal laptop (measured in the report)
- Timeline logic is deterministic and unit-tested with fake timers (queue order, speed, pause, clear)
- No visible pops/jumps between signs (checked with Playwright screenshots at transitions)
- Playing `WHERE DOCTOR` and a fingerspelled name works end-to-end on `/player-test`

---

### Phase 5 — Real-time integration & latency
**Goal:** speak → captions → gloss → signing, feeling live.

**Deliverables**
- **Chunker:** send to `/api/translate` on final results, on sentence punctuation, or when interim text is stable for ~700–900 ms / ≥ 6 words
- Sequence handling (`seq`) so late responses never play out of order or duplicate
- **Backpressure:** if the queue grows too long, raise playback speed (up to 1.5×) and drop low-value filler; never fall behind more than ~4 seconds
- Main screen layout: captions, gloss strip (highlights the current token), avatar
- Latency instrumentation: `speech_final → response → first frame rendered`, shown in a toggleable debug overlay and logged
- Error handling: backend down, slow responses (timeout + retry once), unknown tokens

**Acceptance criteria**
- Typed sentence → first sign frame in **< 500 ms**; spoken final → first sign frame in **< 1000 ms** (p50, measured)
- No duplicate or out-of-order signing in a 20-sentence rapid-fire e2e test
- Backend down produces a visible, friendly error and recovery when it returns
- Playwright e2e with a mocked `SpeechRecognition` covers the full flow

**Manual test (user):** speak a 5-sentence doctor-visit script and confirm signing keeps up.

---

### Phase 6 — Accessibility & UX polish
**Goal:** make the tool itself accessible and demo-ready.

**Deliverables**
- WCAG 2.2 AA: color contrast, focus states, keyboard-only operation (space = mic toggle, shortcuts documented), ARIA labels, `aria-live` for captions
- High-contrast and dark themes, adjustable caption font size, avatar size, mirror toggle, speed slider
- Reduced-motion preference respected for UI animation (signing playback itself stays on)
- Clear empty, loading, error, and "listening" states; onboarding hint (3 steps max)
- Responsive layout (laptop projector and tablet)
- `docs/limitations.md`: honest note that this is gloss-based ASL for a limited vocabulary and should be validated by Deaf signers

**Acceptance criteria**
- `axe-core` reports 0 serious/critical violations on the main screen
- Lighthouse accessibility ≥ 95
- Whole flow usable with keyboard only (Playwright test)
- Text contrast ≥ 4.5:1 in all themes

---

### Phase 7 — Evaluation, demo mode & pitch pack
**Goal:** proof it works, and a pitch that lands in 3 minutes.

**Deliverables**
- Evaluation script producing `docs/evaluation.md`: gloss fixture accuracy, vocabulary coverage on 3 demo scripts, latency p50/p95, avatar fps
- **Demo mode:** scripted scenarios (Doctor visit, Classroom, Help desk) triggered by buttons, working with no mic and no network
- `README.md`: what/why, architecture diagram, setup in ≤ 5 commands, screenshots
- `docs/pitch.md`: 3-minute script (problem → live demo → tech → impact → limits/next steps) and 5 anticipated judge Q&As
- `docs/demo-checklist.md`: pre-demo checks, plan B if Wi-Fi/mic fails
- Final cleanup: remove dead code, lint clean, all tests green

**Acceptance criteria**
- Fresh clone → running app in ≤ 5 commands (verified)
- Demo mode plays all 3 scenarios end-to-end offline
- All automated tests green; evaluation numbers recorded honestly

---

## 8. Performance Budget

| Metric | Target |
|---|---|
| Gloss processing (backend) | p95 < 100 ms |
| Typed text → first sign frame | < 500 ms |
| Spoken final → first sign frame | < 1000 ms |
| Avatar frame rate | ≥ 55 fps |
| Max playback lag before speed-up | ~4 s |
| Sign library load | < 1.5 s |

## 9. Risks & Fallbacks

| Risk | Fallback |
|---|---|
| Web Speech API unavailable or offline (Wi-Fi at venue) | Typed input; demo mode; stretch: local faster-whisper |
| No time to record real signs | Synthetic placeholders (flagged) + real fingerspelling; record only the demo-critical signs first |
| Sign quality looks jittery | Smoothing tuning; fewer, higher-quality signs; slower playback |
| Sentences too complex for gloss rules | Fall back to fingerspelling for unknown words; keep demo sentences in the supported set |
| Judges question linguistic accuracy | Be upfront in `limitations.md` and the pitch: it's an assistive prototype, validated with Deaf community feedback as the next step |
| Chrome-only speech API | State it; demo on Chrome/Edge |

## Appendix A — Seed Vocabulary (~50)

**Greetings/social:** hello, goodbye, please, thank-you, sorry, yes, no, good, morning, name, nice-to-meet-you
**Pronouns/people:** me, you, my, your, we, friend, family, doctor, teacher, nurse
**Questions:** what, where, when, who, why, how
**Verbs:** want, need, help, understand, repeat, wait, come, go, eat, drink, work, learn, know, love, feel
**Places/things:** home, school, hospital, water, food, medicine, pain, emergency
**Time/grammar:** today, tomorrow, yesterday, now, finish, will, not, again, slow, more
