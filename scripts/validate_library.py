"""Validates the SignBridge sign library, checks schema integrity and coordinates,
and generates data/signs/index.json with coverage statistics.
"""

import json
import math
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
SIGNS_DIR = DATA_DIR / "signs"
VOCAB_FILE = DATA_DIR / "vocabulary.json"
INDEX_FILE = SIGNS_DIR / "index.json"


def is_valid_coordinate(val: any) -> bool:
    """Check that coordinate is a finite numeric float."""
    return isinstance(val, (int, float)) and not math.isnan(val) and not math.isinf(val)


def validate_clip_file(file_path: Path) -> tuple[bool, str, dict | None]:
    """Validate single sign clip file against schema and coordinate integrity."""
    try:
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return False, f"JSON parse error: {e}", None

    # Required top-level keys
    required_keys = ["id", "gloss", "fps", "synthetic", "frames", "meta"]
    for key in required_keys:
        if key not in data:
            return False, f"Missing required key: '{key}'", None

    fps = data["fps"]
    if not (20 <= fps <= 60):
        return False, f"Invalid FPS: {fps} (must be 20-60)", None

    frames = data["frames"]
    if not isinstance(frames, list) or len(frames) == 0:
        return False, "Frames list is empty or invalid", None

    duration_ms = data.get("meta", {}).get("duration_ms", 0)
    if not (200 <= duration_ms <= 5000):
        return False, f"Invalid duration: {duration_ms}ms (must be 200-5000ms)", None

    # Validate landmark points in frames
    for f_idx, frame in enumerate(frames):
        if "pose" not in frame:
            return False, f"Frame {f_idx}: missing 'pose'", None

        pose = frame["pose"]
        if not isinstance(pose, list) or len(pose) < 13:
            return False, f"Frame {f_idx}: pose landmarks count < 13", None

        for pt_idx, pt in enumerate(pose):
            if len(pt) < 3 or not all(is_valid_coordinate(c) for c in pt[:3]):
                return False, f"Frame {f_idx}: invalid coordinate in pose point {pt_idx}: {pt}", None

        # Left hand
        if frame.get("left_hand") is not None:
            left_hand = frame["left_hand"]
            if len(left_hand) != 21 or not all(
                len(pt) >= 3 and all(is_valid_coordinate(c) for c in pt[:3]) for pt in left_hand
            ):
                return False, f"Frame {f_idx}: invalid left_hand landmarks", None

        # Right hand
        if frame.get("right_hand") is not None:
            right_hand = frame["right_hand"]
            if len(right_hand) != 21 or not all(
                len(pt) >= 3 and all(is_valid_coordinate(c) for c in pt[:3]) for pt in right_hand
            ):
                return False, f"Frame {f_idx}: invalid right_hand landmarks", None

    return True, "Valid", data


def validate_library() -> tuple[bool, dict]:
    """Validate all clips in data/signs and compile index.json."""
    if not SIGNS_DIR.exists():
        print(f"Error: Signs directory '{SIGNS_DIR}' does not exist.")
        return False, {}

    vocab_map = {}
    if VOCAB_FILE.exists():
        with open(VOCAB_FILE, encoding="utf-8") as vf:
            vdata = json.load(vf)
            for s in vdata.get("signs", []):
                vocab_map[s["id"]] = s

    clip_files = list(SIGNS_DIR.glob("*.json"))
    clip_files = [f for f in clip_files if f.name != "index.json"]

    if not clip_files:
        print("Warning: No sign clip JSON files found to validate.")
        return False, {}

    errors = []
    index_signs = {}
    real_count = 0
    synthetic_count = 0

    for cfile in clip_files:
        is_valid, msg, clip_data = validate_clip_file(cfile)
        if not is_valid:
            errors.append(f"{cfile.name}: {msg}")
            continue

        cid = clip_data["id"]
        gloss = clip_data["gloss"]
        synthetic = clip_data.get("synthetic", False)
        category = vocab_map.get(cid, {}).get("category", "fingerspell" if cid.startswith("fs_") else "general")

        if synthetic:
            synthetic_count += 1
        else:
            real_count += 1

        index_signs[cid] = {
            "id": cid,
            "gloss": gloss,
            "category": category,
            "synthetic": synthetic,
            "file": f"signs/{cfile.name}",
            "fps": clip_data["fps"],
            "duration_ms": clip_data.get("meta", {}).get("duration_ms", 0),
        }

    if errors:
        print(f"Validation FAILED ({len(errors)} errors):")
        for err in errors:
            print(f"  - {err}")
        return False, {}

    index_data = {
        "version": "1.0.0",
        "sign_language": "ASL",
        "total_signs": len(index_signs),
        "real_signs": real_count,
        "synthetic_signs": synthetic_count,
        "signs": index_signs,
    }

    with open(INDEX_FILE, "w", encoding="utf-8") as out:
        json.dump(index_data, out, indent=2)

    total_vocab = len(vocab_map)
    vocab_covered = sum(1 for vid in vocab_map if vid in index_signs)
    coverage_pct = (vocab_covered / total_vocab * 100) if total_vocab else 0.0

    print("\n==============================================")
    print("        SignBridge Library Validation         ")
    print("==============================================")
    print(f"Total Valid Clips : {len(index_signs)}")
    print(f"Real Clips        : {real_count}")
    print(f"Synthetic Clips   : {synthetic_count}")
    print(f"Vocabulary Coverage: {vocab_covered}/{total_vocab} ({coverage_pct:.1f}%)")
    print(f"Generated Index   : {INDEX_FILE}")
    print("Status            : PASS [OK]\n")

    return True, index_data


if __name__ == "__main__":
    success, _ = validate_library()
    if not success:
        sys.exit(1)
