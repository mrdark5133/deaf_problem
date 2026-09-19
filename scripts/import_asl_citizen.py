#!/usr/bin/env python3
"""
import_asl_citizen.py — Import ASL Citizen processed keypoints into SignBridge clip library.

Source: SharoonArshad/asl-citizen-processed-200 (CC BY-NC-SA 4.0)
Format: (num_samples, 200_padded_frames, 450_features)
        Features = 75 landmarks × 3 (position) + 75 × 3 (velocity), float16
        Landmark order: pose[0:33], left_hand[33:54], right_hand[54:75]

This script:
1. Downloads the metadata/manifest from SharoonArshad/asl-citizen-processed-200.
2. Identifies matching vocabulary signs and determines the minimal set of shards needed.
3. Downloads only those specific shards.
4. Reshapes features → (T, 75, 3), splits into pose/left_hand/right_hand.
5. Applies smoothing and normalization.
6. Writes valid clip JSONs with full provenance fields (Hard Rule 3).
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Disable symlinks warning
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SIGNS_DIR = DATA_DIR / "signs"
VOCAB_FILE = DATA_DIR / "vocabulary.json"

DATASET_ID = "SharoonArshad/asl-citizen-processed-200"
DATASET_SOURCE = "asl-citizen-processed-200"
DATASET_LICENSE = "CC BY-NC-SA 4.0"
DATASET_ATTRIBUTION = (
    "ASL Citizen keypoints-200 via SharoonArshad/asl-citizen-processed-200 "
    "(Kaggle origin). CC BY-NC-SA 4.0."
)

POSE_START, POSE_END = 0, 33      # 33 pose landmarks
LEFT_START, LEFT_END = 33, 54     # 21 left-hand landmarks
RIGHT_START, RIGHT_END = 54, 75   # 21 right-hand landmarks
POSITION_DIM = 225                # 75 × 3 coordinates
TARGET_FPS = 30


def try_import_numpy():
    try:
        import numpy as np
        return np
    except ImportError:
        print("Error: numpy not installed. Run: pip install numpy", flush=True)
        sys.exit(1)


def try_import_hf():
    try:
        from huggingface_hub import hf_hub_download
        return hf_hub_download
    except ImportError:
        print("Error: huggingface_hub not installed. Run: pip install huggingface-hub", flush=True)
        sys.exit(1)


def smooth_sequence(frames: list[list[list[float]]]) -> list[list[list[float]]]:
    """3-frame weighted average smoothing [0.25, 0.5, 0.25]."""
    if len(frames) <= 2:
        return frames
    result = [frames[0]]
    for i in range(1, len(frames) - 1):
        smoothed_lms: list[list[float]] = []
        for lm_idx in range(len(frames[i])):
            p = frames[i - 1][lm_idx]
            c = frames[i][lm_idx]
            n = frames[i + 1][lm_idx]
            smoothed_lms.append([
                round(p[0] * 0.25 + c[0] * 0.5 + n[0] * 0.25, 4),
                round(p[1] * 0.25 + c[1] * 0.5 + n[1] * 0.25, 4),
                round(p[2] * 0.25 + c[2] * 0.5 + n[2] * 0.25, 4),
            ])
        result.append(smoothed_lms)
    result.append(frames[-1])
    return result


def is_hand_present(lms: list[list[float]], threshold: float = 0.005) -> bool:
    """Return True if hand landmarks contain non-trivial variance."""
    np = try_import_numpy()
    arr = np.array(lms)
    return bool(float(arr.std()) > threshold)


def sample_to_clip_frames(np, sample, orig_frames_count: int) -> list[dict]:
    T = min(int(orig_frames_count), sample.shape[0])
    if T <= 0:
        T = sample.shape[0]

    # Position slice: (T, 75, 3)
    positions = sample[:T, :POSITION_DIM].reshape(T, 75, 3).astype(float)

    # Subsample if too long (> 90 frames / 3 seconds)
    if T > 90:
        step = T / 90.0
        indices = [int(i * step) for i in range(90)]
        positions = positions[indices]
        T = len(positions)

    # If too short (< 15 frames / 0.5 sec), linear interpolate
    if 1 < T < 15:
        target_T = 18
        old_indices = np.linspace(0, T - 1, target_T)
        new_positions = np.zeros((target_T, 75, 3), dtype=float)
        for d in range(3):
            for lm in range(75):
                new_positions[:, lm, d] = np.interp(old_indices, np.arange(T), positions[:, lm, d])
        positions = new_positions
        T = target_T

    frames: list[dict] = []
    for t in range(T):
        pose_lms = [[round(float(positions[t, i, 0]), 4),
                     round(float(positions[t, i, 1]), 4),
                     round(float(positions[t, i, 2]), 4)]
                    for i in range(POSE_START, POSE_END)]

        left_lms = [[round(float(positions[t, i, 0]), 4),
                     round(float(positions[t, i, 1]), 4),
                     round(float(positions[t, i, 2]), 4)]
                    for i in range(LEFT_START, LEFT_END)]

        right_lms = [[round(float(positions[t, i, 0]), 4),
                      round(float(positions[t, i, 1]), 4),
                      round(float(positions[t, i, 2]), 4)]
                     for i in range(RIGHT_START, RIGHT_END)]

        left_hand = left_lms if is_hand_present(left_lms) else None
        right_hand = right_lms if is_hand_present(right_lms) else None

        frames.append({
            "pose": pose_lms,
            "left_hand": left_hand,
            "right_hand": right_hand,
        })

    # Smooth landmark sequences
    pose_seq = smooth_sequence([f["pose"] for f in frames])
    lh_present = any(f["left_hand"] is not None for f in frames)
    rh_present = any(f["right_hand"] is not None for f in frames)

    if lh_present:
        lh_seq = smooth_sequence([f["left_hand"] or [[0.0, 0.0, 0.0]] * 21 for f in frames])
    if rh_present:
        rh_seq = smooth_sequence([f["right_hand"] or [[0.0, 0.0, 0.0]] * 21 for f in frames])

    for i, f in enumerate(frames):
        f["pose"] = pose_seq[i]
        if f["left_hand"] is not None and lh_present:
            f["left_hand"] = lh_seq[i]
        if f["right_hand"] is not None and rh_present:
            f["right_hand"] = rh_seq[i]

    return frames


def normalize_gloss(label: str) -> str:
    """Normalize label (e.g. 'HELLO1' -> 'HELLO', 'EAT1' -> 'EAT')."""
    return re.sub(r'\d+$', '', label).strip().upper()


def import_asl_citizen(output_dir: Path, import_all: bool = False) -> None:
    np = try_import_numpy()
    hf_hub_download = try_import_hf()

    print(f"Downloading manifest from {DATASET_ID} ...", flush=True)
    manifest_file = hf_hub_download(
        repo_id=DATASET_ID,
        filename="metadata/train_manifest.csv",
        repo_type="dataset",
    )

    vocab_lookup: dict[str, dict] = {}
    if VOCAB_FILE.exists():
        with open(VOCAB_FILE, encoding="utf-8") as vf:
            vdata = json.load(vf)
            for s in vdata.get("signs", []):
                norm_v = normalize_gloss(s["gloss"])
                vocab_lookup[norm_v] = s

    # Parse manifest and index candidates
    manifest_rows: list[dict] = []
    with open(manifest_file, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            manifest_rows.append(row)

    print(f"Total samples in manifest: {len(manifest_rows)}", flush=True)

    # Group by normalized label
    by_norm_label: dict[str, list[dict]] = {}
    for r in manifest_rows:
        nl = normalize_gloss(r["label"])
        by_norm_label.setdefault(nl, []).append(r)

    # Determine targets
    targets = {}
    for nl, rows in by_norm_label.items():
        in_vocab = nl in vocab_lookup
        if not import_all and not in_vocab:
            continue
        # Pick best sample closest to 45 frames
        best_row = min(rows, key=lambda r: abs(int(r.get("original_frames", 45)) - 45))
        targets[nl] = (best_row, in_vocab)

    print(f"Selected {len(targets)} target signs for generation.", flush=True)

    # Identify shards needed
    needed_shards = sorted(set(row["feature_shard"] for row, _ in targets.values()))
    print(f"Need to download {len(needed_shards)} shards: {needed_shards}", flush=True)

    loaded_shards: dict[str, object] = {}
    for shard_path in needed_shards:
        print(f"  Fetching shard {shard_path}...", flush=True)
        local_shard = hf_hub_download(
            repo_id=DATASET_ID,
            filename=shard_path,
            repo_type="dataset",
        )
        loaded_shards[shard_path] = np.load(local_shard).astype(np.float32)

    output_dir.mkdir(parents=True, exist_ok=True)
    imported = 0
    skipped = 0

    for norm_label, (sample_row, in_vocab) in sorted(targets.items()):
        raw_label = sample_row["label"]
        shard_path = sample_row["feature_shard"]
        row_idx = int(sample_row["row_in_shard"])
        orig_frames = int(sample_row.get("original_frames", 45))

        shard_data = loaded_shards[shard_path]
        if row_idx >= len(shard_data):
            print(f"  [WARN] {raw_label}: row_in_shard out of bounds", flush=True)
            skipped += 1
            continue

        sample_vec = shard_data[row_idx]
        clip_frames = sample_to_clip_frames(np, sample_vec, orig_frames)

        if len(clip_frames) < 10:
            print(f"  [SKIP] {raw_label}: frame count too short ({len(clip_frames)})", flush=True)
            skipped += 1
            continue

        if in_vocab:
            clip_id = vocab_lookup[norm_label]["id"]
            gloss_name = vocab_lookup[norm_label]["gloss"]
        else:
            clip_id = norm_label.lower().replace("_", "-")
            gloss_name = norm_label

        duration_ms = int(round((len(clip_frames) / TARGET_FPS) * 1000))

        clip_json = {
            "id": clip_id,
            "gloss": gloss_name,
            "fps": TARGET_FPS,
            "synthetic": False,
            "source": DATASET_SOURCE,
            "license": DATASET_LICENSE,
            "signer": "asl-citizen-signer",
            "original_id": f"asl-citizen-{raw_label}-{sample_row['filename']}",
            "frames": clip_frames,
            "meta": {
                "duration_ms": duration_ms,
                "recorded_at": datetime.now(timezone.utc).isoformat(),
                "notes": DATASET_ATTRIBUTION,
            },
        }

        out_path = output_dir / f"{clip_id}.json"
        with open(out_path, "w", encoding="utf-8") as out_f:
            json.dump(clip_json, out_f, indent=2)

        tag = "[VOCAB]" if in_vocab else "[EXTRA]"
        print(f"  {tag} {gloss_name:15s} -> {out_path.name:20s} ({len(clip_frames)} frames, {duration_ms}ms)", flush=True)
        imported += 1

    print("\n==============================================", flush=True)
    print(f"Import Complete: {imported} real clips generated, {skipped} skipped.", flush=True)
    print(f"Target Directory: {output_dir}", flush=True)
    print("==============================================", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Import ASL Citizen keypoints into SignBridge.")
    parser.add_argument("--output", default=str(SIGNS_DIR), help="Output directory for clip JSONs")
    parser.add_argument("--all", action="store_true", help="Import all 200 classes")
    args = parser.parse_args()

    import_asl_citizen(Path(args.output), import_all=args.all)


if __name__ == "__main__":
    main()
