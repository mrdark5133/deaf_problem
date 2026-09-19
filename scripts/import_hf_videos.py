#!/usr/bin/env python3
"""
import_hf_videos.py — Import MP4 videos from ZahidYasinMittha/American-Sign-Language-Dataset
and extract MediaPipe keypoints into SignBridge clip format.

Source: ZahidYasinMittha/American-Sign-Language-Dataset (MIT License)
Contains: 108,618 videos across 2,208 ASL vocabulary words.

Usage:
    python scripts/import_hf_videos.py --words HELLO YES NO PLEASE THANKS SORRY
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SIGNS_DIR = DATA_DIR / "signs"
RAW_DIR = DATA_DIR / "raw" / "2"
VOCAB_FILE = DATA_DIR / "vocabulary.json"

DATASET_ID = "ZahidYasinMittha/American-Sign-Language-Dataset"
DATASET_SOURCE = "ZahidYasinMittha/American-Sign-Language-Dataset"
DATASET_LICENSE = "MIT"
DATASET_ATTRIBUTION = (
    "American Sign Language Dataset by ZahidYasinMittha. MIT License. "
    "https://huggingface.co/datasets/ZahidYasinMittha/American-Sign-Language-Dataset"
)


def try_import_hf():
    try:
        from huggingface_hub import hf_hub_download
        return hf_hub_download
    except ImportError:
        print("Error: huggingface_hub not installed. Run: pip install huggingface-hub")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Import ASL video clips from Hugging Face.")
    parser.add_argument("--words", nargs="+", help="Specific words/glosses to import (e.g. YES NO PLEASE)")
    parser.add_argument("--output", default=str(SIGNS_DIR), help="Output directory for clips")
    args = parser.parse_args()

    hf_hub_download = try_import_hf()
    print(f"Fetching dataset manifest from {DATASET_ID}...")
    try:
        csv_file = hf_hub_download(
            repo_id=DATASET_ID,
            filename="dataset.csv",
            repo_type="dataset",
        )
    except Exception as e:
        print(f"Failed to download dataset.csv: {e}")
        return

    word_map: dict[str, list[str]] = {}
    with open(csv_file, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            w = row["word"].strip().upper()
            vp = row["video_path"].strip()
            word_map.setdefault(w, []).append(vp)

    print(f"Manifest loaded: {len(word_map)} distinct words available.")

    target_words = [w.upper() for w in args.words] if args.words else list(word_map.keys())[:10]
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    for word in target_words:
        if word not in word_map:
            print(f"  [SKIP] '{word}' not found in dataset")
            continue

        video_rel_paths = word_map[word]
        selected_rel = video_rel_paths[0]
        print(f"  [FOUND] '{word}': downloading {selected_rel}...")

        try:
            downloaded_video = hf_hub_download(
                repo_id=DATASET_ID,
                filename=selected_rel,
                repo_type="dataset",
                local_dir=str(RAW_DIR),
            )
            print(f"    Saved to data/raw/2/{selected_rel}")
        except Exception as e:
            print(f"    Download error: {e}")

    print("\nVideos downloaded to data/raw/2. Ready for CV extraction.")


if __name__ == "__main__":
    main()
