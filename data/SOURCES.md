# data/SOURCES.md — Sign Data Source Register

> **License gate:** No data from any source below may be imported until the
> "Confirmed by user" column is filled in. This file is the authoritative
> provenance ledger for all real sign clips in the library.

---

## Source Table

| # | Source name | What it provides | License | Confirmed by user | How used | Attribution text |
|---|---|---|---|---|---|---|
| 1 | `SharoonArshad/asl-citizen-processed-200` | 200 ASL signs, pre-extracted MediaPipe keypoints (pose+hands+face, T×75×3), already shoulder-normalized | CC BY-NC-SA 4.0 | 2026-09-19 (chat) | `scripts/import_asl_citizen.py` → vocabulary sign clips | "ASL Citizen keypoints-200 via SharoonArshad/asl-citizen-processed-200 (Kaggle origin). CC BY-NC-SA 4.0." |
| 2 | `ZahidYasinMittha/American-Sign-Language-Dataset` | 108,618 MP4 videos for 2,208 ASL words (≥30 clips/word) | MIT | 2026-09-19 (chat) | `scripts/import_hf_videos.py` → MediaPipe → clip JSONs for vocabulary gaps | "American Sign Language Dataset by ZahidYasinMittha. MIT License." |
| 3 | `PSewmuthu/How2Sign_Holistic` | Continuous ASL sentence-level MediaPipe Holistic keypoints (pose+hands+face .npy) | MIT (HF-declared; original How2Sign CVPR 2021) | 2026-09-19 (chat) | Future expansion — sentence-level clip extraction | "How2Sign Holistic by PSewmuthu, derived from How2Sign (Duarte et al., CVPR 2021). MIT." |
| 4 | `Voxel51/American-Sign-Language-MNIST` | 34,627 labelled 28×28 hand images, ASL alphabet A–Z (no J/Z) | MIT | 2026-09-19 (chat) | `scripts/build_fingerspelling_from_images.py` → fingerspelling clips (D2) | "ASL MNIST by Voxel51, from original Kaggle Sign Language MNIST. MIT License." |
| — | `Voxel51/WLASL` | 11,980 sign videos | "other" (restricted) | **SKIPPED** — non-standard license | Not used | — |

---

## Confirmation Log

| Date | Source # | Summary |
|---|---|---|
| 2026-09-19 | 1,2,3,4 | User confirmed all 4 MIT/CC-BY-NC-SA sources in chat; WLASL skipped. |

---

## Rules

1. A source row may only move to import after "Confirmed by user" is filled in.
2. Every real clip JSON must reference the source `#` above via its `source` field.
3. `scripts/validate_library.py` cross-checks that every non-synthetic clip's `source` appears in this file.
4. Raw files from each source live in `data/raw/<source-#>/` and are git-ignored.

---

## Folder layout under `data/raw/` (git-ignored)

```
data/raw/
├── .gitkeep          ← tracked; everything else is ignored
├── 1/                ← asl-citizen keypoint .npy files
├── 2/                ← ZahidYasin video .mp4 files
├── 3/                ← How2Sign holistic .npy files
└── 4/                ← ASL MNIST hand images
```
