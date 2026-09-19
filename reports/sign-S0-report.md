# Phase S0 Report — Sign Library Audit & Handshape-First Design Plan

**Date:** 2026-09-20  
**Status:** Complete (Phase Gate S0 $\rightarrow$ S1)  
**Author:** Antigravity (Lead Engineer)

---

## 1. Sign Library Vocabulary Audit

### 1.1 Global Library Counts (`data/signs/index.json`)
- **Total Signs in Library**: 96
- **Real Recorded Signs**: 39
  - *ASL-MNIST Voxel51 Fingerspelling letters* (`fs_a`..`fs_z`): 26 clips
  - *ASL Citizen Processed real sign video recordings*: 13 clips
- **Synthetic Placeholder Signs**: 57
  - *Fingerspelling digits* (`fs_0`..`fs_9`): 10 clips
  - *Grammar / Vocabulary placeholder clips*: 47 clips

### 1.2 Offline Demo Scenarios Vocabulary Breakdown (26 Unique Words)

Across the three scripted scenarios in `frontend/src/demo/demoScenarios.ts`:

| Scenario | Glosses Used | Current Source & Status |
|---|---|---|
| **Doctor Visit** | `HELLO`, `DOCTOR`, `MEDICINE`, `WHERE`, `TODAY`, `ME`, `NEED`, `HELP`, `YOU`, `PAIN`, `THANK-YOU`, `NURSE` | Real: `HELLO` (56/RED), `WHERE` (67/AMBER), `TODAY` (50/RED), `PAIN` (75/AMBER).<br>Synthetic: `DOCTOR`, `MEDICINE`, `ME`, `NEED`, `HELP`, `YOU`, `THANK-YOU`, `NURSE`. |
| **Classroom** | `GOOD`, `MORNING`, `TEACHER`, `FINISH`, `WHEN`, `PLEASE`, `REPEAT`, `AGAIN`, `ME`, `WANT`, `LEARN`, `MORE`, `THANK-YOU`, `FRIEND` | Real: `MORNING` (59/RED), `FINISH` (50/RED), `WHEN` (75/AMBER).<br>Synthetic: `GOOD`, `TEACHER`, `PLEASE`, `REPEAT`, `AGAIN`, `ME`, `WANT`, `LEARN`, `MORE`, `THANK-YOU`, `FRIEND`. |
| **Help Desk / ER** | `HELLO`, `EMERGENCY`, `WHERE`, `NOW`, `ME`, `PAIN`, `PLEASE`, `HELP`, `THANK-YOU` | Real: `HELLO`, `WHERE`, `NOW` (80/GREEN), `PAIN`.<br>Synthetic: `EMERGENCY`, `ME`, `PLEASE`, `HELP`, `THANK-YOU`. |

**Demo Vocabulary Summary**:
- **8 Real Clips**: 1 GREEN (`NOW`), 3 AMBER (`WHERE`, `PAIN`, `WHEN`), 4 RED/Noisy (`HELLO`, `TODAY`, `MORNING`, `FINISH`).
- **18 Synthetic Clips**: `DOCTOR`, `MEDICINE`, `ME`, `NEED`, `HELP`, `YOU`, `THANK-YOU`, `NURSE`, `GOOD`, `TEACHER`, `PLEASE`, `REPEAT`, `AGAIN`, `WANT`, `LEARN`, `MORE`, `FRIEND`, `EMERGENCY`.

---

## 2. Landmark Coordinates & Avatar Frame Consumption Analysis

### 2.1 Coordinate Systems & Ranges
- **Upper Body Pose**: 33 MediaPipe pose landmarks. Coordinates are centered at the shoulder midpoint $(0, 0, 0)$.
  - $X$: $[-0.6, +0.6]$ (Shoulder width normalized to $\approx 1.0$)
  - $Y$: $[-0.5, +1.5]$ (Head top $\approx -0.45$, Hips $\approx +0.85$, Feet $\approx +1.5$)
  - $Z$: Relative depth with camera forward as negative $Z$.
- **Hand Landmarks**: 21 landmarks per hand with parent-child hierarchical connectivity from wrist (0) $\rightarrow$ metacarpals (1, 5, 9, 13, 17) $\rightarrow$ proximal $\rightarrow$ intermediate $\rightarrow$ fingertips (4, 8, 12, 16, 20).

### 2.2 How Avatars Consume Frame Data
1. **2D Canvas Skeleton Avatar (`SkeletonAvatar.tsx`)**:
   - Directly transforms $(X, Y)$ coordinates into canvas pixel space.
   - Evaluates palm normal $Z$ cross-product vector $\mathbf{v}_1 \times \mathbf{v}_2$ to dynamically shade the palm versus back-of-hand.
2. **3D Anatomical Mannequin Avatar (`Avatar3DScene.ts` via `retargeting.ts`)**:
   - Direction-only landmark projection onto invariant bone lengths (Hard Rule 3): upper arm ($0.42$), forearm ($0.38$), torso ($0.85$), and finger segments ($0.018 - 0.054$).
   - Completely immune to scale jitter and stretching.

---

## 3. Handshape-First Design Summary (`docs/signspec-design.md`)

- **Canonical Hand Frame**: All captured handshapes mapped to wrist origin $(0,0,0)$, $+Y$ along middle MCP, $+Z$ along palm normal, scale-normalized, with sagittal mirroring for left hands.
- **Spec Schema (`data/signspecs/<gloss>.json`)**: Keyframe-based sign specifications defining named body anchors, palm/finger direction vectors, repeat counts, and non-manual markers.
- **Analytical IK Solver**: Two-bone arm IK + Gram-Schmidt hand orientation slerp + Hermite cubic position easing.
- **Source Priority**: Tier 1 (Real Clip) $\rightarrow$ Tier 2 (Spec-Compiled Clip) $\rightarrow$ Tier 3 (Synthetic Fallback).
- **Verification Metadata**: Explicit `verified_by`, `verified_at`, and `reference` attributes; unverified signs display `[UNVERIFIED]` status.

---

## 4. Test Verification

- **Frontend Vitest Suite**: 15 test files passed, 97 / 97 tests passing.
- **Backend Pytest Suite**: 18 / 18 tests passing.
- **Latency Performance**: Gloss compilation/lookup median $\approx 3.6\text{ ms}$ ($\text{p95} \approx 46\text{ ms}$).

---

## 5. Next Steps for Phase S1

- Build the **Handshape Capture Wizard** (`/handshapes`) with live webcam capture, stability scoring, median filtering, and canonical frame export.
- Capture initial handshapes (letters A–Z, digits 0–9).
- Generate contact sheet for visual inspection and verification.
