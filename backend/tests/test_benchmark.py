"""Performance latency benchmark for ASL Gloss translation pipeline."""

import time

import numpy as np

from backend.app.gloss.pipeline import gloss_pipeline
from backend.app.schemas import TranslateRequest

SAMPLE_SENTENCES = [
    "Where is the doctor?",
    "I need medicine today please.",
    "Yesterday I ate food at the hospital.",
    "Do you understand what the teacher said?",
    "Can you wait for the nurse now?",
    "My name is John and this is an emergency.",
    "Good morning, nice to meet you.",
    "How are you feeling today?",
]


def test_translation_latency_p95_under_100ms():
    # Warm up spaCy pipeline
    for s in SAMPLE_SENTENCES:
        gloss_pipeline.translate(TranslateRequest(text=s))

    latencies_ms = []

    for _ in range(20):
        for s in SAMPLE_SENTENCES:
            t0 = time.perf_counter()
            resp = gloss_pipeline.translate(TranslateRequest(text=s))
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            latencies_ms.append(elapsed_ms)
            assert len(resp.tokens) > 0

    p50 = float(np.percentile(latencies_ms, 50))
    p95 = float(np.percentile(latencies_ms, 95))
    p99 = float(np.percentile(latencies_ms, 99))

    print(
        f"\n[BENCHMARK] Samples: {len(latencies_ms)} | p50: {p50:.2f}ms | p95: {p95:.2f}ms | p99: {p99:.2f}ms"
    )
    assert p95 < 100.0, f"Expected p95 < 100ms, got {p95:.2f}ms"
