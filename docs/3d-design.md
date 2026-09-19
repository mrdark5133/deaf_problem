# SignBridge 3D Avatar Design Specification

**Phase:** A0 — Architecture & Design  
**Date:** 2026-09-19  
**Status:** Approved design for A2 implementation  

---

## 1. Executive Summary & Constraints

This document defines the architecture for adding a real-time **3D mannequin avatar** to SignBridge without altering the existing speech-to-gloss-to-clip pipeline, `SignPlayer` state machine, or 2D canvas skeleton (`SkeletonAvatar`).

### Key Decisions (User Confirmed)
1. **Schema v2 (A1) Skipped:** Existing v1 clip schema with normalized 3D coordinates `[x, y, z]` will be used directly.
2. **Procedural Geometry (A2):** All 3D geometry (capsule limbs, joint spheres, head, torso, 21-joint articulated hands) is generated purely in code via Three.js. No external `.glb` models needed.
3. **Toggle & Fallback:** 2D remains the default view with a persistent 2D/3D toggle button, keyboard shortcut (`3`), and URL parameter `?avatar=3d|2d`.
4. **Zero Runtime Downloads:** Everything is bundled locally for offline execution.
5. **Lazy Loading:** Three.js is dynamic-imported so 2D users load 0 KB of Three.js.

---

## 2. Architecture & Data Flow

```
[ Speech / Text Input ]
          │
          ▼
[ Gloss Translation Pipeline ]
          │
          ▼
[ Clip Queue (SignPlayer) ] ─── RAF Loop (60 FPS)
          │
          ▼ (Interpolated SignFrame)
┌──────────────────────────────────────────────┐
│            AvatarRenderer Interface          │
└──────────────────────┬───────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  SkeletonAvatar  │          │     Avatar3D     │
│   (2D Canvas)    │          │  (Three.js WebGL)│
│  [Default/Safe]  │          │ [Lazy-Loaded 3D] │
└──────────────────┘          └──────────────────┘
```

### Renderer Interface Definition
```typescript
export interface AvatarRendererProps {
  frame: SignFrame;
  isIdle: boolean;
  mirrored?: boolean;
  highContrast?: boolean;
  isQuestion?: boolean;
  badge?: string;
  className?: string;
}
```

---

## 3. Retargeting & Bone-Length Constancy (Hard Rule 3)

### Problem
Raw landmark positions from MediaPipe contain sensor noise where limb lengths fluctuate frame-to-frame, causing unnatural stretching or shrinking.

### Solution: Direction-Only Retargeting with Fixed Proportions
1. **Define Fixed Bone Constants (in normalized avatar units):**
   - Shoulder half-width: `0.50`
   - Upper arm length: `0.42`
   - Forearm length: `0.38`
   - Torso height (shoulder-mid to hip-mid): `0.85`
   - Neck & head offset: `0.30`
   - Hand root offset from wrist: `0.08`
   - Finger segment lengths (proximal, intermediate, distal): fixed anatomical ratios per finger.

2. **Direction Vector Extraction:**
   $$\vec{u}_{AB} = \frac{\mathbf{P}_B - \mathbf{P}_A}{\|\mathbf{P}_B - \mathbf{P}_A\|}$$

3. **Reconstructed Joint Placement:**
   $$\mathbf{P}'_B = \mathbf{P}'_A + L_{AB} \cdot \vec{u}_{AB}$$

4. **Bone Invariant Guarantee:**
   $$\|\mathbf{P}'_B - \mathbf{P}'_A\| \equiv L_{AB} \quad \forall \text{ frames } t \in [0, T]$$

---

## 4. 3D Mannequin Anatomy & Aesthetic Design

The procedural 3D mannequin consists of:
- **Head & Face:** Smooth rounded head mesh with subtle facial landmark anchor cues. Raised eyebrows for question detection (`isQuestion` flag lifts dual brow bars by +0.05 units).
- **Torso & Spine:** Articulated chest capsule and spine column connected to shoulder pivots.
- **Arms & Elbows:** Smooth capsule meshes with spherical joint collars.
- **Hands & Fingers (42 Joint Nodes Total):**
  - Left & Right wrists.
  - Palm metatarsal structure.
  - 5 digits per hand (Thumb, Index, Middle, Ring, Pinky), each with 3 articulated phalanges (21 landmarks per hand).
- **Materials & Lighting:**
  - **Studio Dark (Default):** Indigo body (`#6366f1`) with bright cyan left hand (`#22d3ee`) and golden-amber right hand (`#f59e0b`). Soft key, fill, and rim lights.
  - **High Contrast:** Pure white body (`#ffffff`), yellow joints (`#facc15`), black studio background.

---

## 5. Camera & Viewport Specifications

- **Camera Type:** Perspective Camera (`FOV: 42°`, `near: 0.1`, `far: 50`).
- **Framing:** Upper-body framing (head to hips, extending to maximum ASL signing perimeter `[-1.2, +1.2]`).
- **Presets:**
  1. *Frontal (Default):* Position `[0, -0.2, 2.6]`, Target `[0, -0.2, 0]`
  2. *Three-Quarter (Angled):* Position `[0.7, -0.1, 2.4]`, Target `[0, -0.2, 0]`
  3. *Hands Focus (Close-up):* Position `[0, -0.15, 1.7]`, Target `[0, -0.15, 0]`
- **Accessibility:** Keyboard controls (`[`, `]`, `0` reset) and full ARIA description.

---

## 6. Fallback Rules & Degradation Thresholds

1. **WebGL Detection Failure:** If `WebGLRenderingContext` is unavailable, silently render `SkeletonAvatar` and log a warning.
2. **FPS Degradation Guard:**
   - Sample FPS over a rolling 3-second window (180 ticks).
   - If average FPS $< 30$ for 3 consecutive seconds:
     1. Automatically revert active view to `SkeletonAvatar` (2D).
     2. Display a dismissible toast: *"Performance degraded (FPS < 30). Switched to 2D Canvas avatar."*
     3. Save preference fallback state in `sessionStorage`.

---

## 7. Performance Targets & GPU Profiling

- **Target Machine:** Laptop (Intel i5 CPU + NVIDIA RTX 3050 6GB VRAM / Intel UHD hybrid).
- **Target FPS:** $\ge 58$ FPS on discrete GPU; $\ge 45$ FPS on integrated GPU.
- **Draw Calls:** $\le 12$ draw calls per frame using instanced joint meshes or single-pass mesh hierarchies.
- **Geometry Disposal:** Explicit `geometry.dispose()` and `material.dispose()` in React unmount cleanup.

---

## 8. Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Three.js bundle size increases initial load | High | Dynamic `React.lazy()` import: Three.js chunk is loaded only when user clicks 3D |
| Flat `z = 0` in synthetic clips causes 2D-looking rotations | Medium | Depth-enhancement heuristic: add anatomical depth bias based on arm flexion angle |
| Rapid switching between 2D and 3D causes WebGL context loss | Medium | Clean canvas mount lifecycle; retain single WebGL context per component lifecycle |

---

## 9. 3D World-Space Upgrade & MediaPipe Perspective Recommendation (Phase H3)

### Perspective Limitation of 2D Landmarks
In 2D camera-space landmark capture, when a signer's fingers point directly toward the camera lens (common in signs like `YOU`, `WHERE`, `PAIN`, `LOOK`), perspective projection collapses the finger phalanges along the optical axis ($z$-axis). In a 2D canvas view, this appears as severely shortened or missing fingers ("foreshortening distortion").

### Schema v2 World-Space Landmark Recommendation
To fully resolve perspective ambiguity in complex 3D ASL handshapes:
1. **Capture MediaPipe World Coordinates:**
   MediaPipe provides `pose_world_landmarks` and `hand_world_landmarks`, which estimate physical $X, Y, Z$ positions in **real-world metric meters** centered at the signer's geometric root, independent of camera projection angle.
2. **Timing Protocol:**
   World-space landmark capture (Schema v2) **must be enabled in the recording pipeline prior to final clip ingestion**.
3. **Kinematic Bone Alignment:**
   Feeding physical metric coordinates into `retargeting.ts` guarantees invariant bone lengths and enables full $360^\circ$ rotation of the 3D mannequin avatar without finger flattening.

