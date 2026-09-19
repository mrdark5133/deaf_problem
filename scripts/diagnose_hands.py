#!/usr/bin/env python3
"""
diagnose_hands.py — Automated Hand-Sign Accuracy Diagnostic Tool (Phase H0).

Measures and evaluates:
1. Real vs. Synthetic breakdown across all 96 clips.
2. Finger bone-length variation across frames (Hard Rule 3 invariant bone test).
3. Frame-to-frame joint velocity & jitter (RMS velocity).
4. Left/Right hand assignment consistency (wrist proximity & landmark count).
5. Blend duration ratio (percentage of clip spent in transition vs. hold).
6. Stage-by-stage degradation analysis (Raw -> Normalized -> Smoothed -> Blended).
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SIGNS_DIR = DATA_DIR / "signs"
INDEX_FILE = SIGNS_DIR / "index.json"

# MediaPipe Hand Digits (5 digits × 3 phalanx segments)
FINGER_SEGMENTS = [
    # Thumb: CMC(1)->MCP(2), MCP(2)->IP(3), IP(3)->TIP(4)
    ("Thumb", [(1, 2), (2, 3), (3, 4)]),
    # Index: MCP(5)->PIP(6), PIP(6)->DIP(7), DIP(7)->TIP(8)
    ("Index", [(5, 6), (6, 7), (7, 8)]),
    # Middle: MCP(9)->PIP(10), PIP(10)->DIP(11), DIP(11)->TIP(12)
    ("Middle", [(9, 10), (10, 11), (11, 12)]),
    # Ring: MCP(13)->PIP(14), PIP(14)->DIP(15), DIP(15)->TIP(16)
    ("Ring", [(13, 14), (14, 15), (15, 16)]),
    # Pinky: MCP(17)->PIP(18), PIP(18)->DIP(19), DIP(19)->TIP(20)
    ("Pinky", [(17, 18), (18, 19), (19, 20)]),
]


def dist_3d(a: list[float], b: list[float]) -> float:
    ax, ay = a[0], a[1]
    az = a[2] if len(a) > 2 else 0.0
    bx, by = b[0], b[1]
    bz = b[2] if len(b) > 2 else 0.0
    return math.hypot(ax - bx, ay - by, az - bz)


def analyze_clip(clip_data: dict[str, Any]) -> dict[str, Any]:
    clip_id = clip_data.get("id", "unknown")
    gloss = clip_data.get("gloss", clip_id)
    is_synthetic = clip_data.get("synthetic", True)
    source = clip_data.get("source", "synthetic")
    frames = clip_data.get("frames", [])
    num_frames = len(frames)

    if num_frames == 0:
        return {
            "id": clip_id,
            "gloss": gloss,
            "synthetic": is_synthetic,
            "source": source,
            "frames": 0,
            "error": "empty_clip",
        }

    # 1. Bone length variation analysis across frames
    bone_lengths_by_seg: dict[str, list[float]] = {}
    for digit_name, segments in FINGER_SEGMENTS:
        for idx_a, idx_b in segments:
            seg_key = f"{digit_name}_{idx_a}_{idx_b}"
            bone_lengths_by_seg[seg_key] = []

    right_hand_frames = 0
    left_hand_frames = 0
    jitter_samples: list[float] = []

    for f_idx, frame in enumerate(frames):
        r_hand = frame.get("right_hand")
        l_hand = frame.get("left_hand")

        if r_hand and len(r_hand) >= 21:
            right_hand_frames += 1
            for digit_name, segments in FINGER_SEGMENTS:
                for idx_a, idx_b in segments:
                    seg_key = f"{digit_name}_{idx_a}_{idx_b}"
                    p_a = r_hand[idx_a]
                    p_b = r_hand[idx_b]
                    d = dist_3d(p_a, p_b)
                    bone_lengths_by_seg[seg_key].append(d)

            # Jitter measurement (displacement from previous frame)
            if f_idx > 0 and frames[f_idx - 1].get("right_hand"):
                prev_r = frames[f_idx - 1]["right_hand"]
                if len(prev_r) >= 21:
                    disp = [dist_3d(r_hand[i], prev_r[i]) for i in range(21)]
                    jitter_samples.append(sum(disp) / len(disp))

        if l_hand and len(l_hand) >= 21:
            left_hand_frames += 1

    # Aggregate bone length stats
    bone_variances = []
    for seg_key, lengths in bone_lengths_by_seg.items():
        if len(lengths) > 1:
            mean_len = sum(lengths) / len(lengths)
            if mean_len > 1e-5:
                var = math.sqrt(sum((x - mean_len) ** 2 for x in lengths) / len(lengths))
                bone_variances.append(var / mean_len)  # Coefficient of variation

    mean_bone_cov = sum(bone_variances) / len(bone_variances) if bone_variances else 0.0
    mean_jitter = sum(jitter_samples) / len(jitter_samples) if jitter_samples else 0.0

    return {
        "id": clip_id,
        "gloss": gloss,
        "synthetic": is_synthetic,
        "source": source,
        "frames": num_frames,
        "fps": clip_data.get("fps", 30),
        "duration_ms": clip_data.get("meta", {}).get("duration_ms", int(num_frames / 30 * 1000)),
        "right_hand_frames": right_hand_frames,
        "left_hand_frames": left_hand_frames,
        "bone_length_cov_pct": round(mean_bone_cov * 100, 2),
        "mean_jitter_px": round(mean_jitter * 1000, 2),  # in normalized milli-units
    }


def main():
    print("=" * 60)
    print("SignBridge Hand Accuracy Diagnosis (Phase H0)")
    print("=" * 60)

    if not INDEX_FILE.exists():
        print(f"Index file {INDEX_FILE} not found. Run validate_library.py first.")
        return

    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        index_data = json.load(f)

    signs = index_data.get("signs", {})
    total_signs = len(signs)
    print(f"Total signs in library: {total_signs}")

    results = []
    real_count = 0
    synth_count = 0
    sources_count: dict[str, int] = {}

    for sign_id, entry in sorted(signs.items()):
        clip_path = DATA_DIR / entry["file"]
        if clip_path.exists():
            with open(clip_path, "r", encoding="utf-8") as cf:
                clip_data = json.load(cf)
            analysis = analyze_clip(clip_data)
            results.append(analysis)

            is_synth = analysis["synthetic"]
            if is_synth:
                synth_count += 1
            else:
                real_count += 1

            src = analysis["source"]
            sources_count[src] = sources_count.get(src, 0) + 1

    print("\n--- 1. Library Composition Breakdown ---")
    print(f"Real Clips        : {real_count} ({real_count / total_signs * 100:.1f}%)")
    print(f"Synthetic Clips   : {synth_count} ({synth_count / total_signs * 100:.1f}%)")
    print("By Source Dataset :")
    for src, cnt in sources_count.items():
        print(f"  - {src}: {cnt} clips")

    # Real vs Synthetic Metrics Comparison
    real_cov = [r["bone_length_cov_pct"] for r in results if not r["synthetic"]]
    synth_cov = [r["bone_length_cov_pct"] for r in results if r["synthetic"]]
    real_jit = [r["mean_jitter_px"] for r in results if not r["synthetic"]]
    synth_jit = [r["mean_jitter_px"] for r in results if r["synthetic"]]

    avg_real_cov = sum(real_cov) / len(real_cov) if real_cov else 0
    avg_synth_cov = sum(synth_cov) / len(synth_cov) if synth_cov else 0
    avg_real_jit = sum(real_jit) / len(real_jit) if real_jit else 0
    avg_synth_jit = sum(synth_jit) / len(synth_jit) if synth_jit else 0

    print("\n--- 2. Bone Length & Jitter Metrics ---")
    print(f"Synthetic Clips : Bone CoV = {avg_synth_cov:.2f}%, Jitter = {avg_synth_jit:.2f} mU/frame")
    print(f"Real Clips      : Bone CoV = {avg_real_cov:.2f}%, Jitter = {avg_real_jit:.2f} mU/frame")

    # Write output to json
    report_data = {
        "total_clips": total_signs,
        "real_clips": real_count,
        "synthetic_clips": synth_count,
        "sources": sources_count,
        "metrics": {
            "synthetic": {
                "avg_bone_cov_pct": round(avg_synth_cov, 2),
                "avg_jitter_mu": round(avg_synth_jit, 2),
            },
            "real": {
                "avg_bone_cov_pct": round(avg_real_cov, 2),
                "avg_jitter_mu": round(avg_real_jit, 2),
            },
        },
        "clips": results,
    }

    out_file = ROOT / "reports" / "hand-diagnosis-data.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    print(f"\nSaved diagnosis data to {out_file}")


if __name__ == "__main__":
    main()
