# Phase H0 — Reproduce & Diagnose — Report

**Date:** 2026-09-19  
**Phase:** H0 (Reproduce & Diagnose)  
**Status:** ✅ Complete  

---

## 1. What Was Built & Measured

1. **Landmark Debug Mode (`/player-test`):**
   - Interactive frame scrubber (step forward/back, slider, play/pause clip).
   - Overlaid pipeline layers with toggles:
     - Raw MediaPipe Keypoints (Green)
     - Normalized Coordinate Layer (Cyan)
     - Smoothed Frame Layer (Magenta)
     - Blended Output (Amber)
   - Hand-only 4× Magnification Zoom View with all 21 numbered joint node circles.
2. **Automated Diagnostic Tool (`scripts/diagnose_hands.py`):**
   - Extracted bone length variation, joint jitter, blend ratios, and dataset breakdown across all 96 library clips into `reports/hand-diagnosis-data.json`.
3. **Comprehensive Diagnosis Report (`reports/hand-diagnosis.md`):**
   - Full composition breakdown (39 real, 57 synthetic).
   - Stage-by-stage degradation analysis.
   - Ranked list of root causes with empirical evidence.

---

## 2. Files Added & Modified

| File | Changes |
| :--- | :--- |
| `scripts/diagnose_hands.py` | [NEW] Automated hand diagnosis tool calculating bone CoV & jitter. |
| `reports/hand-diagnosis.md` | [NEW] Detailed degradation analysis, metrics table, and ranked root causes. |
| `reports/hand-diagnosis-data.json` | [NEW] Machine-readable metrics payload. |
| `frontend/src/player/PlayerTestPage.tsx` | Added Landmark Debug Mode, frame scrubber, layer toggles, and 4x hand zoom view. |
| `package.json` | Scoped uvicorn reload directory to `--reload-dir backend`. |

---

## 3. Automated Tests & Measurements

| Command | Result |
| :--- | :--- |
| `npm test` (Frontend Vitest) | **91 / 91 passed** (14 test suites) |
| `python -m pytest backend/tests` | **18 / 18 passed** |
| `python scripts/validate_library.py` | **PASS (96 clips valid)** |

---

## 4. Key Diagnostic Findings

1. **Library Composition:** 39 real clips (40.6%) + 57 synthetic clips (59.4%).
2. **Bone Length CoV:** Real 2D MediaPipe data has **53.44% coefficient of variation** due to 2D camera foreshortening.
3. **Jitter:** Real video clips average $22.77\text{ mU/frame}$ raw detection jitter.
4. **Blend Overlap:** 18–22% of clip time was spent in blend ease transitions, slightly blurring hold postures.

---

## 5. Next Steps for Phase H1 (Pipeline Fixes)

- Implement **Per-Part Adaptive Smoothing** (preserve fast finger movements while stabilizing torso).
- Implement **Hold Segment Protection** (blend only during initial/final transition frames, hold handshape steady).
- Implement **Hand Scale Normalization** (preserve finger proportion independently of body shoulder span).
- Add fixture regression tests to verify metric improvements.
