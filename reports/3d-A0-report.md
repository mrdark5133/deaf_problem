# Phase A0 — 3D Avatar Audit & Design — Report

**Date:** 2026-09-19  
**Status:** ✅ Complete  

---

## 1. Audit Findings

1. **Clip Schema & Depth Coordinates Audit:**
   - **Real sign clips (`hello.json`, `eat.json`, etc.):** MediaPipe keypoints carry valid, non-zero depth coordinates (`z` ranging between `+0.03` and `+0.16` normalized units).
   - **Fingerspelling clips (`fs_a.json` – `fs_z.json`):** Carry hand joint depth variations (`z` between `-0.02` and `+0.15`).
   - **Synthetic clips:** Coordinates are coplanar (`z = 0.0`). The 3D retargeter will apply anatomical depth offset heuristics for elbow/hand clearance.

2. **Decisions Confirmed by User:**
   - **No new recordings planned soon:** Skip Phase A1 (Schema v2); proceed directly with v1 clip format in Phase A2.
   - **Dependencies approved:** Use plain `three` and `@types/three` loaded via dynamic import.
   - **Toggle interaction:** 2D Canvas avatar remains default; 3D view is activated via UI toggle with automatic WebGL/FPS fallback.

---

## 2. Deliverables Produced

- [`docs/3d-design.md`](file:///d:/hackspora/docs/3d-design.md): Complete architecture specification including `AvatarRenderer` interface, direction-only bone retargeting mathematics, 21-joint procedural hand anatomy, camera presets, and fallback rules.

---

## 3. Automated Tests & Invariants

- All existing backend (`18/18`) and frontend (`82/82`) unit tests remain 100% passing.
- Library validation: `PASS [OK]` (96 valid clips).

---

## 4. Phase Gate Status

- Phase A0 is complete.
- Next Phase: **A2 (3D Mannequin Avatar)**.
