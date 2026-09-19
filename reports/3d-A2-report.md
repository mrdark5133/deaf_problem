# Phase A2 — 3D Mannequin Avatar — Report

**Date:** 2026-09-19  
**Status:** ✅ Complete  

---

## 1. What Was Built & Implemented

1. **Direction-Only 3D Retargeter (`frontend/src/avatar/retargeting.ts`):**
   - Implements **Hard Rule 3 (Fixed Bone Lengths)**: takes directional unit vectors from landmark pairs and maps them onto anatomical bone constants.
   - Preserves upper arm (`0.42`), forearm (`0.38`), shoulder width (`1.0`), and torso height (`0.85`).
   - Retargets 21 articulated joint nodes per hand with constant phalange segment lengths.
   - Question cue: dynamically elevates dual eyebrow markers by `+0.05` units when `isQuestion` is active.

2. **Procedural Three.js Mannequin Scene (`frontend/src/avatar/Avatar3DScene.ts`):**
   - Purely code-generated 3D geometry using `three` (0 external assets required).
   - Features head sphere, articulated brow cue bars, cylindrical torso/neck, spherical joint pivots, capsule limbs, and full 42-joint articulated hands (21 per side).
   - Studio lighting: 3-point key, fill, and cyan rim lights.
   - Camera presets: `front`, `three-quarter`, `hands` close-up with smooth interpolation.

3. **React 3D Avatar Component (`frontend/src/avatar/Avatar3D.tsx`):**
   - WebGL capability detection.
   - Rolling 3-second FPS monitor with automatic fallback to 2D Canvas if average FPS drops below 30 (Non-negotiable 1).
   - Camera preset buttons and overlay diagnostics.

4. **Adaptive Switcher (`frontend/src/avatar/AvatarContainer.tsx`):**
   - 2D Canvas remains default; 3D is lazy-loaded via `React.lazy()` / `Suspense` so 2D users load 0 KB of Three.js.
   - Seamless switching via top pill button, keyboard shortcut (`3`), or URL query parameter `?avatar=3d|2d`.
   - Dismissible fallback notice toast on performance or WebGL degradation.

---

## 2. Files Added & Modified

| File | Change | Description |
|---|---|---|
| `frontend/src/avatar/AvatarTypes.ts` | NEW | Common renderer interfaces and camera preset types |
| `frontend/src/avatar/retargeting.ts` | NEW | Direction-only retargeting math with invariant bone lengths |
| `frontend/src/avatar/Avatar3DScene.ts` | NEW | Procedural Three.js mannequin hierarchy and lighting |
| `frontend/src/avatar/Avatar3D.tsx` | NEW | React component with WebGL check and FPS degradation guard |
| `frontend/src/avatar/AvatarContainer.tsx` | NEW | Lazy-loaded 2D/3D switcher with shortcut '3' and fallback |
| `frontend/src/avatar/retargeting.test.ts` | NEW | Unit tests verifying bone invariants, symmetry, and question cues |
| `frontend/src/avatar/AvatarContainer.test.tsx` | NEW | Unit tests verifying switcher, shortcuts, and default 2D rendering |
| `frontend/src/App.tsx` | MODIFIED | Connected `AvatarContainer` with question cue prop |
| `frontend/src/player/PlayerTestPage.tsx` | MODIFIED | Integrated `AvatarContainer` for avatar studio testing |
| `frontend/src/recorder/ImportReviewPage.tsx` | MODIFIED | Integrated `AvatarContainer` for library clip inspection |

---

## 3. Automated Test Verification

- **Frontend Vitest (`npm test --prefix frontend`):**
  - **91 / 91 tests passed (100%)** across 14 test suites.
  - `retargeting.test.ts`: **6/6 passed** (bone invariants, mirror symmetry, finite bounds, eyebrow lift, 21 hand joints).
  - `AvatarContainer.test.tsx`: **3/3 passed** (2D default, toggle button, keyboard shortcut `3`).
- **Backend Pytest (`python -m pytest backend/tests/`):**
  - **18 / 18 tests passed (100%)**.

---

## 4. GPU Profiling & Hybrid Graphics Guidance

On Windows laptops with hybrid graphics (Intel i5 CPU + NVIDIA RTX 3050):
1. **Force Chrome / Edge onto NVIDIA GPU:**
   - Open Windows **Settings → System → Display → Graphics**.
   - Under *Custom options for apps*, select **Google Chrome** (or add `chrome.exe`).
   - Click **Options** and set to **High performance (GPU: NVIDIA GeForce RTX 3050 Laptop GPU)**.
2. **Verify Active GPU in Browser:**
   - Navigate to `chrome://gpu` in Chrome.
   - Look under *Driver Information* → *GL_RENDERER*: confirms `NVIDIA GeForce RTX 3050 Laptop GPU`.
3. **Performance Target:**
   - RTX 3050: **~60 FPS** (stable).
   - Intel Integrated Graphics: **~50–55 FPS** (lightweight procedural geometry ensures smooth playback).

---

## 5. Next Phase Status

- Phase A2 (3D Mannequin) is complete.
- Phase A3 (Rigged Avatar) was explicitly deferred per the 4-hour budget plan.
- Next Phase: **A4-lite (Polish, Accessibility, & Documentation)**.
