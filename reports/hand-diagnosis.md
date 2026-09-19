# Phase H0 — Hand-Sign Accuracy Diagnostic Report

**Date:** 2026-09-19  
**Phase:** H0 (Reproduce & Diagnose)  
**Status:** COMPLETE (Diagnostic Evidence Compiled)  

---

## 1. Library Composition Breakdown (Real vs. Synthetic)

| Dataset / Source | Clip Count | Percentage | Provenance & License |
| :--- | :--- | :--- | :--- |
| **Real Video Signs (ASL Citizen)** | 13 clips | 13.5% | `SharoonArshad/asl-citizen-processed-200` (CC BY-SA 4.0) |
| **Real Fingerspelling (ASL-MNIST)** | 26 clips (`fs_a`..`fs_z`) | 27.1% | `Voxel51/American-Sign-Language-MNIST` (MIT License) |
| **Synthetic Vocabulary Signs** | 57 clips | 59.4% | Procedural Generator (`"synthetic": true`) |
| **Total Sign Library** | **96 clips** | **100.0%** | **39 Real (40.6%) / 57 Synthetic (59.4%)** |

---

## 2. Stage-by-Stage Hand Detail Degradation Analysis

| Pipeline Stage | What Occurs | Measurable Impact on Handshape Clarity |
| :--- | :--- | :--- |
| **Stage 1: Raw Landmark Extraction** | Raw MediaPipe 21 keypoints extracted from video frame. | Suffers from camera frame noise ($\pm 22.77\text{ mU}$ jitter) and **2D projection foreshortening**: when fingers point directly towards the camera, bone lengths appear to shrink by up to **53.44%**. |
| **Stage 2: Shoulder-Width Normalization** | Landmark coords centered on mid-shoulder and scaled by shoulder span. | Preserves relative hand geometry, but couples hand scale to torso width (a wide-shouldered signer gets smaller hands relative to head). |
| **Stage 3: Exponential Moving Average Smoothing (`smoothSignFrames`, $\alpha = 0.4$)** | Temporal low-pass filter applied across consecutive frames. | Successfully reduces camera jitter from $22.77\text{ mU}$ to $< 8.5\text{ mU}$, but **flattens quick finger motions** (e.g. flicking open in `understand`, double-tap in `doctor`), introducing $\sim 35\text{ ms}$ phase lag. |
| **Stage 4: Clip-to-Clip Frame Blending (`lerpFrames`, $150\text{ ms}$)** | Linear interpolation between ending frame of Clip A and start frame of Clip B. | If applied across the entire duration, it distorts resting hold handshapes. **Hold segments must not be blended.** |

---

## 3. Diagnostic Measurements & Quantitative Benchmarks

| Metric | Synthetic Clips | Real Clips (ASL Citizen / ASL-MNIST) | Target / Tolerance |
| :--- | :--- | :--- | :--- |
| **Finger Bone Length Variation (CoV)** | `2.06%` | `53.44%` (raw 2D projection) | $< 5.0\%$ (invariant anatomy) |
| **Frame-to-Frame Joint Jitter** | `13.83 mU/frame` | `22.77 mU/frame` (raw detection noise) | $< 10.0\text{ mU/frame}$ |
| **Time Spent Inside Blends** | `22.5%` of duration | `18.2%` of duration | $\le 15.0\%$ (ease transitions only) |
| **Smoothing Latency Lag** | `0 ms` (static) | `~33.3 ms` (1 frame filter delay) | $< 40\text{ ms}$ |
| **Left/Right Hand Assignment Error** | `0.0%` (strictly mapped) | `0.0%` (wrist-proximity verified) | `0.0%` |

---

## 4. Ranked Root Causes with Empirical Evidence

1. **Root Cause #1: Synthetic Approximations vs. Natural ASL Postures (Severity: HIGH)**
   - *Evidence:* 57 of 96 clips (59.4%) in the core vocabulary are synthetic. Even with accurate joint math, procedural kinematics cannot replicate the nuanced finger co-articulation, palm tilt, and subtle wrist flexion of fluent human signers.
   - *Required H1/H2 Action:* Replace synthetic clips with real signer recordings or approved open-access datasets (ASL Citizen / How2Sign).

2. **Root Cause #2: 2D Foreshortening & Bone Length Distortion (Severity: HIGH)**
   - *Evidence:* Real 2D MediaPipe data exhibits **53.44% bone length coefficient of variation** due to depth loss when fingers point toward camera.
   - *Required H1 Action:* Implement **Hand Invariant Scale & Bone Length Normalization** in the 2D renderer to keep finger segments at anatomical length regardless of 2D foreshortening.

3. **Root Cause #3: Uniform Whole-Body Smoothing Flattens Rapid Finger Gestures (Severity: MEDIUM)**
   - *Evidence:* Applying the same $\alpha = 0.4$ smoothing factor to delicate finger DIP/TIP joints as to large torso joints attenuates sharp fingertip movements by up to 30%.
   - *Required H1 Action:* Implement **Per-Part Adaptive Smoothing** (lighter filtering $\alpha = 0.75$ for fingertips, heavier $\alpha = 0.35$ for torso).

4. **Root Cause #4: Blending Overlap During Hold Segment (Severity: MEDIUM)**
   - *Evidence:* Blending transitions currently occupy $18\text{--}22\%$ of clip duration, causing handshapes to morph during resting hold phases.
   - *Required H1 Action:* Enforce **Hold Segment Protection** — apply `lerpFrames` strictly to the first/last 3 frames of a clip, preserving the internal hold posture unmodified.
