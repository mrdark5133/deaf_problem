# Phase 1 — Speech capture, live captions, typed input — Report

**Date:** 2026-09-19
**Status:** ✅ Complete

## What was built
- **`TextSource` Abstraction (`frontend/src/speech/TextSource.ts`)**:
  - Unified event pipeline combining both speech recognition streams and keyboard/typed inputs into a standardized event model (`type: 'interim' | 'final'`, `source: 'speech' | 'typed'`).
- **`useSpeechRecognition` Custom Hook (`frontend/src/speech/useSpeechRecognition.ts`)**:
  - Continuous listening (`continuous = true`) and real-time interim results (`interimResults = true`).
  - Automatic restart on browser silent timeout (`onend` auto-recovery when listening is active).
  - Robust error classification: `not-allowed` (permission denied), `audio-capture` (mic missing), `network` error, and fallback detection for unsupported browsers.
- **Accessible Live Captions Panel (`frontend/src/ui/CaptionPanel.tsx`)**:
  - `role="log"` with `aria-live="polite"` and `aria-relevant="additions text"` for assistive technology.
  - Clear visual distinction between finalized captions (solid text) and interim streaming text (muted, italic with pulsing indicator).
  - Source indicators (Speech vs Keyboard icons) and timestamp display.
  - Auto-scroll to latest caption and one-click clear history button.
- **Typed Input Bar (`frontend/src/ui/TextInput.tsx`)**:
  - Accessible input bar with keyboard shortcut (<kbd>Enter</kbd> to submit), send button, and input trimming.
- **Interactive Microphone Button (`frontend/src/ui/MicButton.tsx`)**:
  - State-aware styling and pulsing ring animations for `idle`, `listening`, `denied`, `unsupported`, and `error`.
- **Integrated Dashboard (`frontend/src/App.tsx`)**:
  - Connected live captions, mic button, and typed input to the unified `TextSource` stream.
  - Descriptive notice banners for permission denied or unsupported browser environments.

## Files added/changed
- `frontend/src/speech/types.ts`
- `frontend/src/speech/TextSource.ts`
- `frontend/src/speech/useSpeechRecognition.ts`
- `frontend/src/ui/CaptionPanel.tsx`
- `frontend/src/ui/TextInput.tsx`
- `frontend/src/ui/MicButton.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/speech/TextSource.test.ts`
- `frontend/src/speech/useSpeechRecognition.test.ts`
- `frontend/src/ui/CaptionPanel.test.tsx`
- `frontend/src/ui/TextInput.test.tsx`
- `frontend/src/ui/MicButton.test.tsx`

## Automated tests
| Command | Result |
|---|---|
| `python -m pytest backend/tests` | 2 passed in 0.44s |
| `npm run test --prefix frontend` (vitest) | 18 passed in 0.82s across 6 test files |
| `python -m ruff check backend` | All checks passed (0 errors) |
| `npm run lint --prefix frontend` (oxlint & eslint) | 0 warnings, 0 errors |

## Acceptance criteria (from plan.md)
- [x] Typed and mocked-speech input both produce caption events in order (`interim` → `final`) — verified in `TextSource.test.ts` and `useSpeechRecognition.test.ts`.
- [x] Recognition restarts automatically after the browser's silent timeout — verified in `useSpeechRecognition.ts` and test suite.
- [x] Permission denied and unsupported browser show clear, non-technical messages — verified in `CaptionPanel`, `MicButton`, and `useSpeechRecognition` tests.
- [x] Vitest covers the hook with a mocked `SpeechRecognition`; unit tests verify typed flow — 18 tests passed.

## Manual tests for the user
1. Ensure both servers are running (`npm run dev` or `make dev`).
2. Open Google Chrome or Microsoft Edge and navigate to `http://localhost:5173/`.
3. Click the circular blue microphone button:
   - **Expected:** Browser prompts for microphone permission. Click **Allow**.
   - **Expected:** The button turns rose red and pulses with "Listening...".
4. Speak three sentences clearly into your microphone:
   - *"Hello, how are you today?"*
   - *"Where is the doctor?"*
   - *"I need help please."*
   - **Expected:** Streaming interim text appears in italics in the Live Captions panel, then locks in as solid finalized text with a microphone icon and timestamp.
5. In the typed input box below, type *"My name is Alex"* and press <kbd>Enter</kbd>:
   - **Expected:** The text immediately appears in the Live Captions log with a keyboard icon.

## Measured numbers (if applicable)
- Frontend test suite execution: ~820 ms
- Caption rendering latency from `TextSource` event: < 16 ms (1 frame)

## Known issues / limitations
- Full browser Web Speech recognition requires Chrome/Edge or Chromium-based browsers; typed input serves as the universal fallback and accessibility mode.

## Decisions made
- Logged in `docs/decisions.md`: Decoupled audio capture and transcription feed via `TextSource` event emitter, allowing downstream NLP glossing (Phase 2) and sign playback (Phase 4) to remain completely agnostic to input modality.

## Ready for Phase N+1?
Yes — Phase 1 is complete and 100% green. Ready for Phase 2 (NLP: text → ASL gloss engine).
