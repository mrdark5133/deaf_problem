# Phase 2 — NLP: text → ASL gloss engine — Report

**Date:** 2026-09-19
**Status:** ✅ Complete

## What was built
- **Seed Vocabulary (`data/vocabulary.json`)**:
  - Structured dataset of ~50 canonical signs across social/greetings, pronouns, question words, verbs, places/things, and time/grammar indicators with comprehensive synonym lists.
- **Vocabulary Loader (`backend/app/gloss/vocabulary.py`)**:
  - In-memory dictionary indexing canonical glosses, clip IDs, categories, and bidirectional synonym mappings.
- **Fingerspelling Handler (`backend/app/gloss/fingerspell.py`)**:
  - Alphanumeric decomposition producing structured fingerspelling tokens with an uppercase letter array (e.g. `letters: ["J", "O", "H", "N"]`).
- **ASL Grammar Transformation Rules (`backend/app/gloss/rules.py`)**:
  - **Copula & Article Omission:** Drops articles (a, an, the) and auxiliary linking copulas (is, am, are, be, being, been, was, were).
  - **Time-Marker Fronting:** Identifies time indicators (yesterday, today, tomorrow, now, morning, etc.) and moves them to the front of the sentence.
  - **Tense Markers:** Detects past verbs to append `FINISH` marker, and future verbs/modals to append `WILL` marker.
  - **Wh-Questions:** Extracts wh-words (who, what, where, when, why, how) and places them at the sentence end with `is_question: true` and `question_type: "wh"`.
  - **Yes/No Questions:** Classifies question type as `yes_no` for non-manual marker handling.
  - **Negation:** Normalizes verbal negations (`not`, `don't`, `can't`, `never`) into the `NOT` gloss.
  - **Pronoun Canonicalization:** Maps `I/me/myself` → `ME`, `my/mine` → `MY`, `you/yourself` → `YOU`, `your/yours` → `YOUR`, `we/us/our` → `WE/OUR`.
  - **Multi-Word Idioms:** Recognizes composite phrases (e.g. "nice to meet you", "thank you very much", "how are you", "good morning") preserving atomic gloss resolution and sequence positions.
- **Orchestration Pipeline (`backend/app/gloss/pipeline.py`) & API (`backend/app/main.py`)**:
  - Input hardening: sanitizes control characters, cleans emojis and excess punctuation, handles all-caps, and caps sentences at 50 words.
  - Live endpoint `POST /api/translate` returns structured `TranslateResponse` with measured `processing_ms`.
- **Golden Test Fixture Suite (`backend/tests/fixtures/gloss_cases.json`)**:
  - 42 test sentences covering healthcare/doctor visits, classroom questions, help desk requests, and linguistic edge cases.

## Files added/changed
- `data/vocabulary.json`
- `backend/app/gloss/vocabulary.py`
- `backend/app/gloss/fingerspell.py`
- `backend/app/gloss/rules.py`
- `backend/app/gloss/pipeline.py`
- `backend/app/main.py`
- `backend/tests/fixtures/gloss_cases.json`
- `backend/tests/test_golden_cases.py`
- `backend/tests/test_rules.py`
- `backend/tests/test_input_hardening.py`
- `backend/tests/test_benchmark.py`
- `backend/tests/test_translate_stub.py`

## Automated tests
| Command | Result |
|---|---|
| `python -m pytest backend/tests` | 16 passed in 3.56s |
| `python -m pytest backend/tests/test_golden_cases.py` | 42/42 golden cases passed (100%) |
| `python -m pytest backend/tests/test_benchmark.py` | p95 latency: **3.79 ms** (Target: < 100 ms) |
| `npm run test --prefix frontend` (vitest) | 18 passed in 0.83s across 6 test files |
| `python -m ruff check backend` | All checks passed (0 errors) |
| `npm run lint --prefix frontend` (oxlint & eslint) | 0 warnings, 0 errors |

## Acceptance criteria (from plan.md)
- [x] All golden cases pass — 42/42 (100%) pass rate in `test_golden_cases.py`.
- [x] Handles empty input, very long input, punctuation, emojis, all-caps without crashing — verified in `test_input_hardening.py`.
- [x] p95 processing time < 100 ms for sentences up to 20 words — measured **p50: 2.78 ms, p95: 3.79 ms, p99: 5.98 ms**.
- [x] Works fully with the LLM flag off — deterministic, offline spaCy + rule-based NLP pipeline.

## Manual tests for the user
1. Ensure both servers are running (`npm run dev` or `make dev`).
2. Make a POST request via curl or PowerShell to test the translation engine:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/translate -H "Content-Type: application/json" -d "{\"text\": \"Where is the doctor?\", \"is_final\": true, \"seq\": 1}"
   ```
   - **Expected response:**
     ```json
     {
       "seq": 1,
       "original": "Where is the doctor?",
       "is_question": true,
       "question_type": "wh",
       "tokens": [
         { "gloss": "DOCTOR", "kind": "sign", "clip_id": "doctor", "source": "doctor" },
         { "gloss": "WHERE", "kind": "sign", "clip_id": "where", "source": "Where" }
       ],
       "processing_ms": 3
     }
     ```
3. Test time fronting and past tense:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/translate -H "Content-Type: application/json" -d "{\"text\": \"I ate the medicine yesterday\", \"is_final\": true, \"seq\": 2}"
   ```
   - **Expected tokens:** `YESTERDAY` -> `ME` -> `EAT` -> `MEDICINE`.

## Measured numbers (if applicable)
- Golden test cases pass rate: **100% (42/42)**
- Translation latency: **p50 = 2.78 ms, p95 = 3.79 ms, p99 = 5.98 ms** (Target: < 100 ms)

## Known issues / limitations
- ASL is a rich 3D language with facial expressions and spatial references; our gloss engine represents standard rule-based educational/assistive ASL glossing.

## Decisions made
- Logged in `docs/decisions.md`: Maintained multi-word expressions with character offset anchors to preserve exact conversational ordering while applying ASL time-fronting and wh-cues.

## Ready for Phase N+1?
Yes — Phase 2 is complete, 100% green, and performance budget is verified. Ready for Phase 3 (Sign library pipeline: CV recorder & data tooling).
