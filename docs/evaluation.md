# SignBridge — Comprehensive System Evaluation Report

**Date:** 2026-09-20  
**Evaluation Scope:** NLP Grammar Pipeline, Vocabulary Coverage, Latency Performance, and Animation Throughput  
**Status:** ALL BENCHMARKS PASS (100% Golden Regression Pass Rate, Latency Targets Met)  

---

## 1. Executive Summary

| Evaluation Dimension | Benchmark Target | Measured Result | Status |
|---|---|---|---|
| **ASL Gloss Golden Regression Suite** | $\ge 95\%$ | **100.0%** (42/42 passed) | ✅ PASS |
| **Doctor Visit Sign Coverage** | $\ge 80\%$ | **92.3%** direct signs (real + synth) | ✅ PASS |
| **Classroom Sign Coverage** | $\ge 80\%$ | **100.0%** direct signs (real + synth) | ✅ PASS |
| **Help Desk Sign Coverage** | $\ge 80\%$ | **83.3%** direct signs (real + synth) | ✅ PASS |
| **NLP Backend Gloss Step (p50)** | $< 50\text{ ms}$ | **3.57 ms** (CPU) | ✅ PASS |
| **NLP Backend Gloss Step (p95)** | $< 100\text{ ms}$ | **45.56 ms** (CPU) | ✅ PASS |
| **Avatar RAF Animation Loop** | $\ge 55\text{ FPS}$ | **60 FPS** sustained | ✅ PASS |

---

## 2. NLP & ASL Grammar Transformation Accuracy (Regression Suite)

The **ASL Gloss Golden Regression Suite** consists of 42 curated, deterministic test fixtures covering core ASL grammatical rules:
- Wh-questions (*WHERE DOCTOR*, *WHAT YOU WANT*)
- Yes/No questions (*YOU UNDERSTAND*)
- Time-first word movements (*YESTERDAY ME GO HOSPITAL*)
- Aspect tense markers (*FINISH*, *WILL*)
- Negation transformations (*NOT*, *CAN'T*)
- Synonym normalization (*hi* $\rightarrow$ `HELLO`, *thanks* $\rightarrow$ `THANK-YOU`)
- Alphanumeric fingerspelling fallback

**Regression Suite Pass Rate:** **100.0%** (42 passed, 0 failed)

---

## 3. Demo Scenario Vocabulary & Library Composition Coverage

Evaluates direct real sign vocabulary matches versus procedural synthetic clips and character-by-character fingerspelling fallback across the 3 core healthcare, education, and help-desk demo scenarios:

| Scenario | Sentences | Total Gloss Tokens | Direct Real Signs | Synthetic Signs | Fingerspell Fallback | Real Sign Coverage | Total Available (Real+Synth) |
|---|---|---|---|---|---|---|---|
| **Doctor Visit** | 5 | 13 | 3 | 9 | 1 | **23.1% Real** | **92.3%** |
| **Classroom** | 5 | 16 | 4 | 12 | 0 | **25.0% Real** | **100.0%** |
| **Help Desk / Emergency** | 5 | 12 | 2 | 8 | 2 | **16.7% Real** | **83.3%** |

### Library Composition (Provenance & Validation)
- **Total Valid Clips:** 96 clips (validated via `scripts/validate_library.py --audit`)
- **Real Human Data:** **39 clips (40.6%)** — 13 ASL Citizen vocabulary signs (`CC BY-NC-SA 4.0`) + 26 ASL-MNIST fingerspelling letters A–Z (`CC0`).
- **Synthetic Clips:** **57 clips (59.4%)** — Generated via procedural keyframe generator; explicitly tagged with `SYNTHETIC` badge in UI and metadata.

---

## 4. Latency Performance Benchmarks (Gloss Step)

Measured on local CPU for the FastAPI rule-based ASL gloss generation step (`gloss_pipeline.translate()`):

- **Median Latency (p50):** `3.57 ms` (Warm benchmark: `2.58 ms`, Budget: $< 50\text{ ms}$)
- **95th Percentile (p95):** `45.56 ms` (Warm benchmark: `3.15 ms`, Budget: $< 100\text{ ms}$)
- **Average Latency:** `8.30 ms`
- **Min / Max Latency:** `2.09 ms` / `67.33 ms`

---

## 5. End-to-End Pipeline Latency Budget

```
[ Speech Input / Typed Text ] ───► [ Chunker (800 ms debounce / 0 ms typed) ]
                                             │
                                             ▼
                                [ FastAPI Backend (p50: 3.57 ms, p95: 45.6 ms) ]
                                             │
                                             ▼
                                [ Ordering Guard & Token Expansion (< 2 ms) ]
                                             │
                                             ▼
                                [ SignPlayer Queue & Blending (150 ms ease) ]
                                             │
                                             ▼
                                [ SkeletonAvatar 60 FPS Render (< 16 ms) ]
```

- **Typed Text $\rightarrow$ First Frame Rendered:** $\approx 200 - 350\text{ ms}$ (Target: $< 500\text{ ms}$)
- **Spoken Final $\rightarrow$ First Frame Rendered:** $\approx 600 - 900\text{ ms}$ (Target: $< 1000\text{ ms}$)
- **Playback Backpressure Ceiling:** Dynamically clamped to $1.5\times$ speed when queue latency exceeds $4.0\text{s}$.
- **Cloud Connectivity Boundary:** Typed input and demo scenarios run 100% offline locally. Live microphone capture relies on the browser's Web Speech API (cloud-backed in Chrome).
