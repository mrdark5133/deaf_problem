# Phase S1 Report — Handshape Library & Capture Wizard

**Date:** 2026-09-20  
**Status:** Complete (Phase Gate S1 $\rightarrow$ S2)  
**Author:** Antigravity (Lead Engineer)

---

## 1. Executive Summary

Phase S1 establishes the foundational **Canonical Handshape Library** and **Handshape Capture Wizard** for SignBridge:
- Implemented the rigorous mathematical **Canonical Hand Frame** coordinate transformation (`canonicalHand.ts`), eliminating translation, rotation, and scale variations while guaranteeing mirror symmetry.
- Developed the **Handshape Capture Wizard UI** (`HandshapeWizardPage.tsx`) with real-time stability scoring, per-joint median filtering across 30 sampled frames, and a 3-view orthographic contact sheet (Front, Side, Top).
- Seeded and compiled **47 canonical handshapes** in `data/handshapes/` covering fingerspelling letters A–Z, digits 0–9, and standard ASL classifier handshapes.
- Added 10 new unit tests covering 100% of canonical hand invariants; all 107 frontend Vitest tests and 18 backend Pytest tests pass.

---

## 2. Canonical Hand Frame Mathematics & Invariants

Each handshape is transformed into a scale-invariant, origin-anchored orthonormal basis:

$$\begin{aligned}
\mathbf{O} &= \mathbf{P}_0 = (0, 0, 0) \quad (\text{Wrist anchored to origin}) \\
\mathbf{\hat{y}} &= \text{normalize}(\mathbf{P}_9 - \mathbf{P}_0) \quad (\text{Wrist to middle MCP}) \\
\mathbf{\hat{z}} &= \text{normalize}((\mathbf{P}_5 - \mathbf{P}_0) \times (\mathbf{P}_{17} - \mathbf{P}_0)) \quad (\text{Palm normal vector}) \\
\mathbf{\hat{x}} &= \text{normalize}(\mathbf{\hat{y}} \times \mathbf{\hat{z}}) \quad (\text{Radial to ulnar orthogonal axis}) \\
s &= \|\mathbf{P}_9 - \mathbf{P}_0\| \quad (\text{Hand scale normalization factor})
\end{aligned}$$

### Invariance Guarantees Tested:
1. **Translation Invariance**: Translating raw hand by $(\Delta x, \Delta y, \Delta z)$ produces identical canonical landmarks (error $< 10^{-4}$).
2. **Rotation Invariance**: Rotating raw hand in 3D produces identical canonical coordinates (error $< 0.01$).
3. **Scale Invariance**: Scaling raw hand from $0.35\times$ to $4.8\times$ yields invariant canonical coordinates.
4. **Bilateral Mirroring**: Left hand projection onto right canonical frame flips $x$-axis coordinates while preserving all 210 pairwise inter-joint distances.
5. **Median Noise Immunity**: Outlier tracking glitches in individual frames are rejected by per-joint coordinate median.

---

## 3. Seeded Handshape Library (`data/handshapes/`)

Total Handshapes: **47 canonical JSON definitions**

| Category | Handshapes Included | Source |
|---|---|---|
| **Fingerspelling Alpha (A–Z)** | `letter_a` through `letter_z` (26 shapes) | ASL-MNIST Voxel51 real reference frames |
| **Fingerspelling Digits (0–9)** | `digit_0` through `digit_9` (10 shapes) | Standardized canonical finger configurations |
| **ASL Standard / Classifiers** | `flat_b`, `open_5`, `fist_s`, `fist_a`, `index_1`, `bent_v`, `curved_c`, `flat_o`, `pinch_f`, `horns_y`, `flat_m` (11 shapes) | Phonological ASL baseline |

---

## 4. Handshape Capture Wizard (`/handshapes`)

- Accessible via the **Handshapes** navigation button in the header or pressing key `4`.
- **Capture Flow**:
  1. Select target handshape from sidebar list (shows `[GREEN]`, `[AMBER]`, or `[PENDING]`).
  2. Click **Start 3s Countdown & Capture**.
  3. Captures 30 frames from webcam stream $\rightarrow$ applies per-joint median filter $\rightarrow$ evaluates spatial spread score.
  4. Instant 2D/3D canonical wireframe preview with normalized coordinate readouts.
  5. One-click JSON export to `data/handshapes/<id>.json`.
- **3-View Contact Sheet**:
  - Switch to **Contact Sheet (3-View)** tab to render Front ($X, Y$), Side ($Z, Y$), and Top ($X, Z$) orthographic projections of all handshapes side-by-side for comparison with ASL reference charts.

---

## 5. Test Verification

- **Frontend Vitest Suite**: 16 test files passed, 107 / 107 tests passing.
  - `src/handshapes/canonicalHand.test.ts`: 10 passed.
  - `src/avatar/retargeting.test.ts`: 7 passed.
  - `src/player/SignPlayer.test.ts`: 16 passed.
  - `src/lib/translationOrdering.test.ts`: 20 passed.
- **Backend Pytest Suite**: 18 / 18 tests passing.

---

## 6. Manual Verification Task for User

1. Navigate to `http://localhost:5173` and click the **Handshapes** button in the header (or press <kbd>4</kbd>).
2. Capture 5 handshapes (e.g. `Letter A`, `Letter B`, `Letter C`, `Flat B`, `Index 1`) via your webcam.
3. Switch to the **Contact Sheet (3-View)** tab and verify that the 3-view orthographic wireframes match standard reference shapes.
