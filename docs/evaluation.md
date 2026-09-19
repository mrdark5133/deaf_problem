# SignBridge — Comprehensive System Evaluation Report

**Date:** 2026-09-19  
**Evaluation Scope:** NLP Grammar Pipeline, Vocabulary Coverage, Latency Performance, and Animation Throughput  
**Status:** ALL BENCHMARKS PASS (100% Golden Accuracy, Latency Target Met)  

---

## 1. Executive Summary

| Evaluation Dimension | Benchmark Target | Measured Result | Status |
|---|---|---|---|
| **ASL Gloss Golden Accuracy** | $\ge 95\%$ | **100.0%** (42/42 passed) | ✅ PASS |
| **Doctor Visit Sign Coverage** | $\ge 80\%$ | **92.3%** direct signs | ✅ PASS |
| **Classroom Sign Coverage** | $\ge 80\%$ | **100.0%** direct signs | ✅ PASS |
| **Help Desk Sign Coverage** | $\ge 80\%$ | **83.3%** direct signs | ✅ PASS |
| **NLP Backend Processing (p50)** | $< 50\text{ ms}$ | **3.57 ms** | ✅ PASS |
| **NLP Backend Processing (p95)** | $< 100\text{ ms}$ | **45.56 ms** | ✅ PASS |
| **Avatar RAF Animation Loop** | $\ge 55\text{ FPS}$ | **60 FPS** sustained | ✅ PASS |

---

## 2. NLP & ASL Grammar Transformation Accuracy

- **Golden Fixtures Evaluated:** 42 curated sentences covering:
  - Wh-questions (*WHERE DOCTOR*, *WHAT YOU WANT*)
  - Yes/No questions (*YOU UNDERSTAND*)
  - Time-first word movements (*YESTERDAY ME GO HOSPITAL*)
  - Aspect tense markers (*FINISH*, *WILL*)
  - Negation transformations (*NOT*, *CAN'T*)
  - Synonym normalization (*hi* $\rightarrow$ `HELLO`, *thanks* $\rightarrow$ `THANK-YOU`)
  - Alphanumeric fingerspelling fallback
- **Accuracy Pass Rate:** **100.0%** (42 passed, 0 failed)

---

## 3. Demo Scenario Vocabulary Coverage

Evaluates direct sign vocabulary match versus character-by-character fingerspelling fallback across the 3 core healthcare, education, and help-desk demo scenarios:

| Scenario | Sentences | Total Gloss Tokens | Direct Sign Tokens | Fingerspelled Tokens | Sign Coverage |
|---|---|---|---|---|---|
| **Doctor Visit** | 5 | 13 | 12 | 1 | **92.3%** |
| **Classroom** | 5 | 16 | 16 | 0 | **100.0%** |
| **Help Desk / Emergency** | 5 | 12 | 10 | 2 | **83.3%** |

---

## 4. Latency Performance Benchmarks

Measured across 200 sentence requests under realistic token lengths (5–12 words):

- **Median Latency (p50):** `3.57 ms` (Budget: $< 50\text{ ms}$)
- **95th Percentile (p95):** `45.56 ms` (Budget: $< 100\text{ ms}$)
- **Average Latency:** `8.30 ms`
- **Min / Max Latency:** `2.28 ms` / `67.33 ms`

---

## 5. End-to-End Pipeline Latency Budget

```
[ Speech Input / Typed Text ] ───► [ Chunker (800 ms debounce / 0 ms typed) ]
                                             │
                                             ▼
                               [ FastAPI Backend (p95: 45.6 ms) ]
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
- **Playback Backpressure Ceiling:** Clamped to $1.5\times$ speed when lag exceeds $4.0\text{s}$.
