# Phase S2 Report: Sign Specification Format, Analytical IK Solver & Compiler

**Status:** Complete  
**Date:** 2026-09-20  
**Target:** Phase S2 of Handshape-First Signing Architecture  

---

## 1. Executive Summary

Phase S2 delivers the deterministic sign specification format, analytical inverse kinematics (IK) arm solver, and 30 FPS clip compiler. This replaces ad-hoc or generative landmark positioning with mathematically constrained kinematics and real, captured canonical handshapes.

Key achievements in Phase S2:
1. **Deterministic Schema ([`specTypes.ts`](file:///d:/hackspora/frontend/src/compiler/specTypes.ts)):** Schema with named body anchor locations, palm/finger direction vectors, canonical handshape references, normalized keyframe timelines ($t \in [0.0, 1.0]$), and strict verification audit metadata.
2. **Analytical Two-Bone Arm IK Solver ([`signSolver.ts`](file:///d:/hackspora/frontend/src/compiler/signSolver.ts)):** Constant bone lengths ($L_1 = 0.420, L_2 = 0.380$), anatomical elbow hinge biasing, reach clamping, and Gram-Schmidt orthonormal hand orientation matrices guaranteeing $< 5^\circ$ palm normal error.
3. **Sign Compiler ([`signCompiler.ts`](file:///d:/hackspora/frontend/src/compiler/signCompiler.ts) & [`compile_signspecs.py`](file:///d:/hackspora/scripts/compile_signspecs.py)):** Compiles `SignSpec` definitions into standard 30 FPS `SignClip` format (33 MediaPipe pose points + 21 landmarks per active hand).
4. **Spec Studio & Preview ([`SpecPreviewPage.tsx`](file:///d:/hackspora/frontend/src/compiler/SpecPreviewPage.tsx)):** Interactive live testing studio featuring slow-motion scrubbing ($0.1\times - 1.0\times$), real-time 2D/3D avatar rendering, live invariant inspector, and editable JSON editor.
5. **Automated Verification:** 9 new compiler/solver tests; 116/116 frontend tests and 18/18 backend tests passing.

---

## 2. Mathematical IK & Kinematics Invariants

### 2.1 Fixed Bone Length Invariant
Arm geometry is governed by constant bone lengths:
$$\|P_{\text{elbow}} - P_{\text{shoulder}}\| = L_1 = 0.420 \pm 0.005$$
$$\|P_{\text{wrist}} - P_{\text{elbow}}\| = L_2 = 0.380 \pm 0.005$$

For any target wrist position $W$ reachable from shoulder $S$ with distance $d = \|W - S\|$:
$$\cos(\alpha) = \frac{L_1^2 + d^2 - L_2^2}{2 L_1 d}$$
$$P_{\text{elbow}} = S + L_1 \cdot \left(\hat{u}_{SW} \cos\alpha + \hat{u}_{\text{perp}} \sin\alpha\right)$$
where $\hat{u}_{\text{perp}}$ is derived from the cross product with the natural elbow hint vector $[0.45, 0.65, -0.20]$.

### 2.2 Palm Normal & Finger Orientation
Given target palm normal $\hat{u}_{\text{palm}}$ and finger pointing vector $\hat{u}_{\text{finger}}$:
1. $\hat{u}_Y = \text{normalize}(\hat{u}_{\text{finger}})$ (distal vector along middle finger).
2. $\hat{u}_X = \text{normalize}(\hat{u}_Y \times \hat{u}_{\text{palm}})$ (lateral axis across palm).
3. $\hat{u}_Z = \text{normalize}(\hat{u}_X \times \hat{u}_Y)$ (true palm normal perpendicular to $\hat{u}_Y$).

This guarantees that transformed canonical hand landmarks preserve handshape geometry and match intended palm orientation within $\le 5.0^\circ$.

---

## 3. Test & Verification Results

| Test Category | Test File | Test Count | Status | Notes |
|---|---|---|---|---|
| Arm IK Invariant ($L_1=0.42, L_2=0.38$) | `src/compiler/signSolver.test.ts` | 3 | **PASS** | Evaluated across 5 anatomical targets |
| Reach Clamping & Singularity Prevention | `src/compiler/signSolver.test.ts` | 1 | **PASS** | Distances $> 0.80$ clamped cleanly without NaN |
| Hand Orientation Matrix & Orthonormality | `src/compiler/signSolver.test.ts` | 2 | **PASS** | Dot products $= 0.0$, palm error $\le 5^\circ$ |
| Canonical Hand Transformation | `src/compiler/signSolver.test.ts` | 1 | **PASS** | Wrist anchored at $(0,0,0) \to W$ |
| Keyframe Hermite Spline Evaluation | `src/compiler/signSolver.test.ts` | 2 | **PASS** | Smooth 1-handed & 2-handed evaluation |
| Full Sign Clip Compilation | `src/compiler/signSolver.test.ts` | 1 | **PASS** | 30 FPS SignClip with 33 pose + 21 hand landmarks |
| **All Frontend Vitest Suites** | **17 test files** | **116** | **PASS** | 100% green |
| **All Backend Pytest Suites** | **7 test files** | **18** | **PASS** | 100% green |

---

## 4. Next Step: Phase S3 (Author Demo-Critical Signs)

With the compiler and solver fully tested and integrated:
- **Phase S3 Scope:** Author explicit `SignSpec` definitions for all 18 demo scenario words currently using synthetic placeholders (e.g. `HELLO`, `PLEASE`, `THANK-YOU`, `YES`, `NO`, `NAME`, `WATER`, `RESTROOM`, `HELP`, `DOCTOR`, `PAIN`, etc.).
- Compile specifications into `data/signs/<gloss>.json`.
- Inspect compiled motions in Spec Studio and avatar player.
