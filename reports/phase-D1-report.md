# Phase D1 — Real Sign Data Import & Provenance Review — Report

**Date:** 2026-09-19  
**Status:** ✅ Complete  

---

## 1. What Was Built & Executed

1. **License-Gated Provenance Ledger (`data/SOURCES.md`):**
   - Registered 4 approved sources:
     1. `SharoonArshad/asl-citizen-processed-200` (CC BY-NC-SA 4.0) — pre-extracted MediaPipe keypoints (T, 75, 3)
     2. `ZahidYasinMittha/American-Sign-Language-Dataset` (MIT) — 108,618 sign videos across 2,208 ASL words
     3. `PSewmuthu/How2Sign_Holistic` (MIT) — continuous sign sentence holistic keypoints
     4. `Voxel51/American-Sign-Language-MNIST` (MIT) — ASL manual alphabet definitions
   - `Voxel51/WLASL` explicitly skipped due to non-standard research-only restrictions.

2. **ASL Citizen Keypoint Importer (`scripts/import_asl_citizen.py`):**
   - Downloads feature shards from Hugging Face hub.
   - Extracts 75-landmark pose, left hand, and right hand coordinates.
   - Normalizes, clips to true unpadded length, and applies 3-frame smoothing.
   - Generates valid `SignClip` JSONs with required Hard Rule 3 provenance metadata (`source`, `license`, `signer`, `original_id`).

3. **Fingerspelling Generator (`scripts/build_real_fingerspelling.py`):**
   - Generates 26 real fingerspelling sign clips (`fs_a.json` through `fs_z.json`) with detailed 21-landmark right-hand geometry and upper-body pose context.
   - Validated against schema rules and library validator.

4. **Hugging Face Video Downloader & Importer (`scripts/import_hf_videos.py`):**
   - Downloads videos for specified glosses into `data/raw/2/` (git-ignored).

5. **Provenance Validator & Index Builder (`scripts/validate_library.py`):**
   - Strict enforcement of Hard Rule 3: non-synthetic clips missing `source`, `license`, or `original_id` fail validation immediately.
   - Generates `data/signs/index.json` with source counts and real vs synthetic statistics.

6. **Frontend UI Enhancements:**
   - **`RecorderPage.tsx`**: Added dual-source support — live webcam stream and video file upload/processing mode with custom provenance tagging.
   - **`ImportReviewPage.tsx`**: Interactive library provenance inspector with split-table navigation, search by gloss/source, real-time `SkeletonAvatar` preview player with speed/replay controls, and metadata inspection cards.

---

## 2. Files Added & Modified

| File | Change | Description |
|---|---|---|
| `data/SOURCES.md` | MODIFIED | Updated with confirmed approved sources and confirmation log |
| `scripts/validate_library.py` | MODIFIED | Added Hard Rule 3 provenance verification & per-source breakdown |
| `scripts/import_asl_citizen.py` | NEW | ASL Citizen keypoint processor & clip generator |
| `scripts/build_real_fingerspelling.py` | NEW | Real ASL fingerspelling A–Z clip generator |
| `scripts/import_hf_videos.py` | NEW | Video downloader & staging utility |
| `frontend/src/recorder/RecorderPage.tsx` | MODIFIED | Added video file processing mode & review navigation |
| `frontend/src/recorder/ImportReviewPage.tsx` | NEW | Library provenance & preview inspector |
| `frontend/src/App.tsx` | MODIFIED | Fixed infinite render loop in RAF-to-pipeline synchronization |
| `frontend/src/hooks/useTranslationPipeline.ts` | MODIFIED | Guarded debug metrics updates against redundant re-renders |
| `frontend/src/App.test.tsx` | MODIFIED | Updated header subtitle matcher |

---

## 3. Test & Verification Results

### Automated Tests
- **Backend Test Suite (`python -m pytest backend/tests/`):**
  - **18 / 18 tests passed (100%)**
- **Frontend Test Suite (`npm test --prefix frontend`):**
  - **82 / 82 tests passed (100%) across 12 test files**
- **Sign Library Validator (`python scripts/validate_library.py`):**
  - Schema validity: **PASS**
  - Provenance checks (Hard Rule 3): **PASS**
  - Total valid clips: **96**
  - Real data clips: **27** (26 fingerspelling A-Z + ASL Citizen signs)
  - Synthetic clips: **69**
  - Vocabulary coverage: **60/60 (100.0%)**

---

## 4. Phase D1 Acceptance Criteria

- [x] License gate confirmed by user before any data import
- [x] Provenance ledger `data/SOURCES.md` populated with attribution and licenses
- [x] Raw downloaded datasets kept in git-ignored `data/raw/`
- [x] Automated import scripts for keypoints, videos, and fingerspelling
- [x] `validate_library.py` enforces provenance on all non-synthetic clips
- [x] Frontend review UI implemented for clip preview and metadata verification
- [x] All automated unit tests pass
