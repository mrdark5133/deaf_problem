# SignBridge 🌉
### Real-Time Speech-to-American-Sign-Language (ASL) Translation Engine

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%20Strict-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![spaCy](https://img.shields.io/badge/NLP-spaCy-09A3D5.svg?logo=spacy&logoColor=white)](https://spacy.io/)
[![MediaPipe](https://img.shields.io/badge/CV-MediaPipe-00A98F.svg?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![WCAG 2.2 AA](https://img.shields.io/badge/Accessibility-WCAG%202.2%20AA-success.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)

> **SignBridge** is a real-time assistive web application that translates spoken English into natural American Sign Language (ASL) gloss grammar and animates a 60 FPS skeleton avatar with synchronized live captions, high-contrast themes, and full keyboard navigation. Built specifically for high-stakes communication in **doctor visits, emergency help desks, and classrooms**.

---

## 🏗️ Architecture & Pipeline Flow

```
 ┌────────────────────────────────────────────────────────┐
 │           Speech Recognition / Typed Input             │
 │          (Web Speech API + Interim Debounce)           │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │            Intelligent Speech/Text Chunker             │
 │      (800 ms stable-interim window / 10-word max)      │
 └──────────────────────────┬─────────────────────────────┘
                            │ (POST /api/translate)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │            FastAPI ASL Gloss Grammar Engine            │
 │     • Topic-Comment Ordering   • Dropped Copulas       │
 │     • Time-First Placement     • Aspect Tense Markers  │
 │     • WH-Question Syntax       • Fingerspell Fallback  │
 └──────────────────────────┬─────────────────────────────┘
                            │ (GlossToken[]: sign | fingerspell)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │          Translation Ordering & Backpressure           │
 │     • Monotonic Sequence Guard • Rate Adaptation (1.5x)│
 │     • Clip Queue Expansion     • Latency Tracking      │
 └──────────────────────────┬─────────────────────────────┘
                            │ (Interpolated Frames: lerpFrames)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │             HTML5 Canvas 2D Skeleton Avatar            │
 │  (60 FPS RAF Loop, 21-Landmark Hands, Facial Eyebrows) │
 └────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

1. **Deterministic ASL Grammar Engine:** Converts English syntax to ASL gloss grammar in **under 4 ms (p50: 3.57 ms)** with 100% test accuracy across 42 golden benchmark fixtures.
2. **Smooth 60 FPS Canvas Avatar:** Real-time upper-body and detailed 21-landmark hand rendering with 150 ms linear frame blending (`lerpFrames`) between sign clips.
3. **Computer Vision Sign Capture Studio (`/recorder`):** Web-based MediaPipe Pose and Hand landmark tracker that normalizes scale and origin to record reusable sign clips.
4. **Alphanumeric Fingerspelling Fallback:** Automatically spells out unknown medical words, proper nouns, and numbers (A–Z, 0–9).
5. **Backpressure Rate Adaptation:** Prevents latency buildup during continuous speech by dynamically adapting playback speed (up to 1.5×) when audio queues exceed 2 seconds.
6. **WCAG 2.2 AA & AAA Accessibility:**
   - **Themes:** Dark (default), Light, and High-Contrast (pure black with bright yellow & cyan landmarks, $\ge 19:1$ contrast).
   - **Avatar Mirror View:** Instant horizontal perspective flip (<kbd>M</kbd>).
   - **Customizable Caption Sizing:** Small, Medium, Large, and Extra Large typography.
   - **Full Keyboard Navigation:** Operate the entire application without a mouse.
7. **Offline Scripted Demo Mode:** 3 pre-built scenarios (*Doctor Visit*, *Classroom*, *Help Desk*) that run completely offline without microphone or backend network dependencies.

---

## ⚡ Quick Start in 5 Commands

### 1. Prerequisites
- Python 3.11+
- Node.js 20+

### 2. Setup & Execution

```bash
# 1. Clone the repository
git clone https://github.com/hackspora/signbridge.git && cd signbridge

# 2. Install backend dependencies & spaCy language model
pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Start the development server (runs backend & frontend simultaneously)
npm run dev

# 5. Open http://localhost:5173 in Google Chrome or Microsoft Edge
```

---

## 📊 System Benchmarks & Performance

| Metric | Target | Measured Result | Status |
|---|---|---|---|
| **ASL Gloss Golden Accuracy** | $\ge 95\%$ | **100.0%** (42/42 passed) | ✅ PASS |
| **Doctor Visit Sign Coverage** | $\ge 80\%$ | **92.3%** direct signs | ✅ PASS |
| **Classroom Sign Coverage** | $\ge 80\%$ | **100.0%** direct signs | ✅ PASS |
| **Help Desk Sign Coverage** | $\ge 80\%$ | **83.3%** direct signs | ✅ PASS |
| **NLP Backend Processing (p50)** | $< 50\text{ ms}$ | **3.57 ms** | ✅ PASS |
| **NLP Backend Processing (p95)** | $< 100\text{ ms}$ | **45.56 ms** | ✅ PASS |
| **Avatar RAF Animation Loop** | $\ge 55\text{ FPS}$ | **60 FPS** sustained | ✅ PASS |

---

## ⌨️ Accessible Keyboard Shortcuts

| Key | Action |
|---|---|
| <kbd>Space</kbd> | Toggle Speech Recognition microphone (bypassed when typing in input) |
| <kbd>Enter</kbd> | Send typed text for immediate ASL translation |
| <kbd>M</kbd> | Toggle Avatar Mirror View (horizontal flip) |
| <kbd>C</kbd> | Clear live captions and reset avatar sign queue |
| <kbd>D</kbd> | Toggle live Debug & Latency Metrics overlay |
| <kbd>?</kbd> or <kbd>H</kbd> | Open Keyboard Shortcuts cheat sheet |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Switch views: `[1]` Main App &nbsp; `[2]` CV Studio &nbsp; `[3]` Player Studio |
| <kbd>Esc</kbd> | Close active modal / dialog |

---

## 📂 Repository Structure

```
hackspora/
├── backend/
│   ├── app/
│   │   ├── gloss/         # spaCy NLP, ASL grammar rules, vocabulary & fingerspelling
│   │   ├── main.py        # FastAPI endpoints (/health, /api/translate)
│   │   └── schemas.py     # Pydantic data models
│   └── tests/             # Pytest test suite & golden fixtures
├── frontend/
│   └── src/
│       ├── demo/          # Scripted offline demo scenarios & DemoBar
│       ├── hooks/         # useTranslationPipeline & useAccessibilitySettings
│       ├── lib/           # Chunker, ordering guard & latency tracker
│       ├── player/        # SkeletonAvatar canvas & SignPlayer state machine
│       ├── recorder/      # MediaPipe webcam landmark CV Studio
│       ├── speech/        # Web Speech API recognition & TextSource
│       └── ui/            # CaptionPanel, GlossStrip, Modals & DebugOverlay
├── data/
│   ├── vocabulary.json    # Canonical 60-sign dictionary + synonyms
│   └── signs/             # Normalized 2D landmark sign clips + index.json
├── docs/
│   ├── evaluation.md      # Automated evaluation report & benchmarks
│   ├── pitch.md           # 3-minute presentation script & judge Q&A
│   ├── demo-checklist.md  # Pre-demo runbook & Plan B contingency playbook
│   └── limitations.md     # ASL linguistic scope & ethical validation notes
├── reports/               # Phase 0 through Phase 7 milestone reports
└── scripts/
    ├── evaluate_system.py # Automated test, coverage & latency evaluator
    └── validate_library.py# Sign clip schema and landmark validator
```

---

## 📄 License & Ethical Usage
SignBridge is developed as an assistive communication prototype. Please review [`docs/limitations.md`](docs/limitations.md) for linguistic boundaries and our ethical commitment to native Deaf community validation before clinical deployment.
#   d e a f _ p r o b l e m  
 