# Phase 3 Report — Sign Library Pipeline (CV)

**Date:** 2026-09-19
**Phase:** 3 — Sign library pipeline (CV)
**Status:** COMPLETE

---

## Summary

Phase 3 delivers the full computer-vision pipeline infrastructure for SignBridge: TypeScript and Python type definitions for the clip schema, landmark processing utilities (normalization, interpolation, smoothing, hand assignment), a /recorder studio page, a synthetic clip generator for the full vocabulary, a library validator with index.json generation, and a lazy-loading frontend library loader with caching.

---

## Deliverables Checklist

| Task | Status |
|---|---|
| TypeScript + Python types for clip schema | Done |
| Normalization util (shoulder-mid origin, shoulder-width scale) + unit tests | Done |
| Smoothing util + gap-filling for missing hand frames + unit tests | Done |
| Left/right hand assignment by nearest pose wrist + unit test | Done |
| /recorder route: webcam, overlay, countdown, record, trim, save/download clip JSON | Done |
| Fingerspelling set: A-Z + 0-9 (synthetic, clearly flagged) | Done |
| scripts/generate_placeholder_clips.py -> synthetic clips for every vocab word | Done |
| data/signs/index.json generation | Done |
| scripts/validate_library.py: schema, fps, NaN, duration bounds, coverage report | Done |
| Frontend loader for the library (index.json + lazy clip fetch + cache) | Done |
| Tests: pytest (validator, generator), vitest (normalize/smooth/assign) | Done |
| Fix App.tsx JSX parse error (missing fragment wrapper in ternary else) | Done |

---

## Test Results

### Backend (pytest backend/tests - 18 tests)
18 passed, 3 warnings in 3.91s

New Phase 3 tests added:
- test_library_tools.py::test_validate_all_clips_in_library - PASSED
- test_library_tools.py::test_validate_single_clip_file - PASSED

### Frontend (vitest run - 25 tests across 8 test files)
25 passed in 5.02s

New Phase 3 tests added:
- src/recorder/cvUtils.test.ts (5 tests) - All PASSED
  - 3D Euclidean distance
  - Normalization (shoulder-mid origin + scale invariance)
  - Hand assignment by wrist proximity
  - Gap interpolation for missing hand frames
  - 3-frame weighted average smoothing
- src/player/libraryLoader.test.ts (2 tests) - All PASSED
  - Loads and caches sign library index
  - Loads and caches individual sign clips

### Library Validator
Total Valid Clips : 96
Real Clips        : 0
Synthetic Clips   : 96
Vocabulary Coverage: 60/60 (100.0%)
Status            : PASS [OK]

---

## Sign Library Coverage Table

| Category | Glosses | Real | Synthetic | Coverage |
|---|---|---|---|---|
| Vocabulary signs | 60 | 0 | 60 | 100% |
| Fingerspelling A-Z | 26 | 0 | 26 | 100% |
| Fingerspelling 0-9 | 10 | 0 | 10 | 100% |
| Total | 96 | 0 | 96 | 100% |

All 96 clips are "synthetic": true. Real sign recordings can be added via the /recorder CV Studio page.

---

## Clip Schema

Each sign clip file (data/signs/<gloss>.json) conforms to:
- id, gloss, fps (20-60), synthetic (bool), signer, frames[], meta{duration_ms, recorded_at, notes}
- Each frame: pose (19 upper-body landmarks), left_hand (21 or null), right_hand (21 or null)
- Normalization: origin at shoulder midpoint, scale = 1/shoulder-width

---

## Decisions

- Synthetic clips flagged clearly: All placeholder clips set "synthetic": true.
- Fingerspelling as flat files: fs_a.json through fs_z.json and fs_0.json through fs_9.json.
- Hand assignment by wrist proximity: avoids MediaPipe unreliable handedness classification.
- Gap interpolation threshold = 3 frames: fills dropouts <=3 consecutive null frames.

---

## Open Blockers

None. Phase 3 is complete and all tests green.
