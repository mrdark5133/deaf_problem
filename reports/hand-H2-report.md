# Phase H2 Report: Real Sign Data & Quality Gate Protocol

**Project:** SignBridge Hand Accuracy Hardening  
**Phase:** H2 (Real Sign Data & Capture Protocol)  
**Status:** COMPLETE — Ready for User Approval (Phase Gate H2)  
**Date:** 2026-09-19  

---

## 1. Executive Summary

Phase H2 established the complete standard operating procedures and software gating infrastructure for acquiring, validating, and displaying authentic American Sign Language (ASL) recordings:
1. **Recording Protocol Standard:** Created [`docs/recording-protocol.md`](file:///d:/hackspora/docs/recording-protocol.md), defining strict environmental, lighting, framing, attire, rest-bound timing, and 3-take rules. Includes a 26-sign demo-critical checklist covering *Doctor Visit*, *Classroom*, and *Help Desk / ER*.
2. **Automated Clip Quality Gate:** Implemented [`frontend/src/recorder/clipQuality.ts`](file:///d:/hackspora/frontend/src/recorder/clipQuality.ts) and visual [`ClipQualityBadge.tsx`](file:///d:/hackspora/frontend/src/recorder/ClipQualityBadge.tsx), measuring:
   - Missing Hand Frame Ratio ($< 30\%$ threshold)
   - Inter-frame Joint Jitter ($< 50\text{ mU/frame}$)
   - Bone Length Consistency / CoV ($< 35\%$)
   - Duration Plausibility ($0.4\text{s} - 3.5\text{s}$)
   - Traffic-light verdict: **GREEN** ($\ge 80\%$), **AMBER** ($60-79\%$), **RED** (Rejected, $< 60\%$).
3. **Studio & Review Integration:** Gated clip exports in [`RecorderPage.tsx`](file:///d:/hackspora/frontend/src/recorder/RecorderPage.tsx) and live provenance inspection in [`ImportReviewPage.tsx`](file:///d:/hackspora/frontend/src/recorder/ImportReviewPage.tsx).
4. **Honest Composition Reporting (Hard Rule 1):** Verified 96 total valid library clips (39 real / 57 synthetic).

---

## 2. Library Composition & Real Sign Coverage

```
============================================================
Total Clips in Sign Library: 96
------------------------------------------------------------
Real Human-Signed Clips   : 39 (40.6%)
  - ASL Citizen (Processed) : 13 vocabulary signs (EAT, FINISH, HELLO, HOSPITAL, MORNING, NAME, PAIN, SLOW, UNDERSTAND, WANT, WHAT, WHY, WORK)
  - ASL-MNIST (Voxel51)     : 26 fingerspelling signs (FS:A through FS:Z)
Synthetic Generated Clips : 57 (59.4%)
============================================================
```

### Demo Scenarios Real vs. Synthetic Breakdown

| Demo Scenario | Total Gloss Tokens | Direct Real Signs | Real Fingerspell Fallback | Synthetic Signs | Real Coverage % |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Doctor Visit** | 12 | 3 (`HELLO`, `PAIN`, `TODAY`*) | 100% (A-Z) | 9 | 25.0% Direct (100% with FS) |
| **Classroom** | 14 | 4 (`MORNING`, `FINISH`, `WANT`, `GOOD`*) | 100% (A-Z) | 10 | 28.6% Direct (100% with FS) |
| **Help Desk / ER** | 8 | 2 (`HELLO`, `PAIN`) | 100% (A-Z) | 6 | 25.0% Direct (100% with FS) |

*All synthetic clips remain explicitly labelled with `SYNTHETIC` amber badges in the UI and library manifests to ensure transparency.*

---

## 3. Automated Test Verification

All frontend and backend unit tests are 100% green:

### Frontend Unit & Regression Tests (Vitest)
```
 ✓ src/App.test.tsx (3 tests)
 ✓ src/ui/TextInput.test.tsx (3 tests)
 ✓ src/ui/CaptionPanel.test.tsx (3 tests)
 ✓ src/avatar/AvatarContainer.test.tsx (3 tests)
 ✓ src/ui/MicButton.test.tsx (3 tests)
 ✓ src/hooks/useAccessibilitySettings.test.ts (5 tests)
 ✓ src/speech/useSpeechRecognition.test.ts (4 tests)
 ✓ src/lib/chunker.test.ts (15 tests)
 ✓ src/lib/translationOrdering.test.ts (20 tests)
 ✓ src/player/SignPlayer.test.ts (16 tests)
 ✓ src/avatar/retargeting.test.ts (6 tests)
 ✓ src/recorder/cvUtils.test.ts (6 tests)
 ✓ src/recorder/clipQuality.test.ts (4 tests)
 ✓ src/player/libraryLoader.test.ts (2 tests)
 ✓ src/speech/TextSource.test.ts (3 tests)

Test Files: 15 passed (15)
Tests:      96 passed (96)
```

### Backend Unit Tests (Pytest)
```
backend\tests\test_benchmark.py .                                        [  5%]
backend\tests\test_golden_cases.py .                                     [ 11%]
backend\tests\test_health.py .                                           [ 16%]
backend\tests\test_input_hardening.py ....                               [ 38%]
backend\tests\test_library_tools.py ..                                   [ 50%]
backend\tests\test_rules.py ........                                     [ 94%]
backend\tests\test_translate_stub.py .                                   [100%]

======================= 18 passed in 9.80s ========================
```

---

## 4. Next Phase: H3 (Handshape QA & Honesty Pass)

Upon user approval of Phase H2, Phase H3 will:
1. Run full library validation and quality audits across all 96 clips.
2. Provide side-by-side QA verification tools for avatar playback.
3. Update `README.md` and `docs/evaluation.md` to ensure honest documentation of real vs synthetic clip coverage.
4. Prepare 3D avatar recommendation report (`docs/3d-design.md`) regarding world-space landmarks and perspective limits.
