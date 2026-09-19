"""Validates the SignBridge sign library, checks schema integrity and coordinates,
enforces provenance fields on real clips, and generates data/signs/index.json
with coverage statistics.
"""

import json
import math
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
SIGNS_DIR = DATA_DIR / "signs"
VOCAB_FILE = DATA_DIR / "vocabulary.json"
SOURCES_FILE = DATA_DIR / "SOURCES.md"
INDEX_FILE = SIGNS_DIR / "index.json"

# Required provenance fields on non-synthetic clips (Hard Rule 3)
PROVENANCE_FIELDS = ["source", "license", "original_id"]


def is_valid_coordinate(val: object) -> bool:
    """Check that coordinate is a finite numeric float."""
    return isinstance(val, (int, float)) and not math.isnan(val) and not math.isinf(val)


def validate_provenance(data: dict) -> tuple[bool, str]:
    """Enforce Hard Rule 3: non-synthetic clips must carry provenance fields."""
    if data.get("synthetic", True):
        return True, "OK (synthetic)"
    missing = [f for f in PROVENANCE_FIELDS if not data.get(f)]
    if missing:
        return False, f"Non-synthetic clip missing provenance fields: {missing}"
    return True, "OK (real)"


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

    # Provenance check (Hard Rule 3)
    prov_ok, prov_msg = validate_provenance(data)
    if not prov_ok:
        return False, prov_msg, None

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


def evaluate_clip_quality_py(data: dict) -> dict:
    """Calculate quality metrics in Python matching frontend/src/recorder/clipQuality.ts."""
    frames = data.get("frames", [])
    total_frames = len(frames)
    if total_frames == 0:
        return {"score": 0, "verdict": "RED", "jitter": 0, "missing_ratio": 1.0, "cov": 0}

    missing_hand_count = sum(1 for f in frames if not f.get("left_hand") and not f.get("right_hand"))
    missing_ratio = missing_hand_count / total_frames

    total_jitter = 0.0
    jitter_count = 0
    for i in range(1, total_frames):
        prev = frames[i - 1]
        curr = frames[i]
        for key in ["right_hand", "left_hand"]:
            if prev.get(key) and curr.get(key) and len(prev[key]) == len(curr[key]):
                for p_pt, c_pt in zip(prev[key], curr[key]):
                    d = math.sqrt((c_pt[0] - p_pt[0])**2 + (c_pt[1] - p_pt[1])**2 + (c_pt[2] - p_pt[2])**2)
                    total_jitter += d
                    jitter_count += 1
    avg_jitter = (total_jitter / jitter_count) if jitter_count > 0 else 0.0

    palm_lens = []
    for f in frames:
        hand = f.get("right_hand") or f.get("left_hand")
        if hand and len(hand) >= 10:
            p0, p9 = hand[0], hand[9]
            d = math.sqrt((p9[0] - p0[0])**2 + (p9[1] - p0[1])**2 + (p9[2] - p0[2])**2)
            if d > 0.001:
                palm_lens.append(d)

    bone_cov = 0.0
    if len(palm_lens) >= 3:
        mean_len = sum(palm_lens) / len(palm_lens)
        var = sum((x - mean_len)**2 for x in palm_lens) / len(palm_lens)
        bone_cov = (math.sqrt(var) / mean_len) if mean_len > 0 else 0.0

    fps = data.get("fps", 30)
    dur_ms = math.round((total_frames / fps) * 1000) if hasattr(math, 'round') else int(round((total_frames / fps) * 1000))
    dur_factor = 1.0 if (400 <= dur_ms <= 3500) else (0.5 if dur_ms < 400 else 0.7)

    hand_score = max(0.0, 1.0 - missing_ratio) * 100
    jitter_score = max(0.0, 1.0 - (avg_jitter / 0.06)) * 100
    bone_score = max(0.0, 1.0 - (bone_cov / 0.40)) * 100

    raw = hand_score * 0.35 + jitter_score * 0.25 + bone_score * 0.25 + (dur_factor * 100) * 0.15
    score = min(100, max(0, int(round(raw))))

    verdict = "GREEN" if (score >= 80 and missing_ratio <= 0.30) else ("AMBER" if score >= 60 else "RED")
    return {
        "score": score,
        "verdict": verdict,
        "jitter_mU": round(avg_jitter * 1000, 1),
        "missing_ratio": round(missing_ratio, 2),
        "bone_cov_pct": round(bone_cov * 100, 1),
    }


def validate_library(audit_quality: bool = False) -> tuple[bool, dict]:
    """Validate all clips in data/signs and compile index.json."""
    if not SIGNS_DIR.exists():
        print(f"Error: Signs directory '{SIGNS_DIR}' does not exist.")
        return False, {}

    vocab_map: dict = {}
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

    errors: list[str] = []
    index_signs: dict = {}
    real_count = 0
    synthetic_count = 0
    source_counts: dict[str, int] = {}
    qa_rows: list[dict] = []

    for cfile in clip_files:
        is_valid, msg, clip_data = validate_clip_file(cfile)
        if not is_valid:
            errors.append(f"{cfile.name}: {msg}")
            continue

        cid = clip_data["id"]
        gloss = clip_data["gloss"]
        synthetic = clip_data.get("synthetic", False)
        source = clip_data.get("source", "synthetic")
        category = vocab_map.get(cid, {}).get(
            "category", "fingerspell" if cid.startswith("fs_") else "general"
        )

        q_metrics = evaluate_clip_quality_py(clip_data)

        if synthetic:
            synthetic_count += 1
        else:
            real_count += 1
            source_counts[source] = source_counts.get(source, 0) + 1

        qa_rows.append({
            "id": cid,
            "gloss": gloss,
            "type": "SYNTH" if synthetic else "REAL",
            "source": source,
            **q_metrics,
        })

        index_signs[cid] = {
            "id": cid,
            "gloss": gloss,
            "category": category,
            "synthetic": synthetic,
            "source": source,
            "file": f"signs/{cfile.name}",
            "fps": clip_data["fps"],
            "duration_ms": clip_data.get("meta", {}).get("duration_ms", 0),
            "quality_score": q_metrics["score"],
            "quality_verdict": q_metrics["verdict"],
        }

    if errors:
        print(f"Validation FAILED ({len(errors)} errors):")
        for err in errors:
            print(f"  - {err}")
        return False, {}

    index_data = {
        "version": "1.1.0",
        "sign_language": "ASL",
        "total_signs": len(index_signs),
        "real_signs": real_count,
        "synthetic_signs": synthetic_count,
        "source_counts": source_counts,
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
    print(f"Real Clips        : {real_count} ({real_count/len(index_signs)*100:.1f}%)")
    print(f"Synthetic Clips   : {synthetic_count} ({synthetic_count/len(index_signs)*100:.1f}%)")
    if source_counts:
        print("By source         :")
        for src, cnt in sorted(source_counts.items()):
            print(f"  {src}: {cnt}")
    print(f"Vocabulary Coverage: {vocab_covered}/{total_vocab} ({coverage_pct:.1f}%)")
    print(f"Generated Index   : {INDEX_FILE}")
    print("Status            : PASS [OK]\n")

    if audit_quality:
        green_cnt = sum(1 for r in qa_rows if r["verdict"] == "GREEN")
        amber_cnt = sum(1 for r in qa_rows if r["verdict"] == "AMBER")
        red_cnt = sum(1 for r in qa_rows if r["verdict"] == "RED")

        print("-----------------------------------------------------------------------------------")
        print(f"CLIP QUALITY AUDIT SUMMARY: {green_cnt} GREEN, {amber_cnt} AMBER, {red_cnt} RED")
        print("-----------------------------------------------------------------------------------")
        print(f"{'GLOSS':<15} {'TYPE':<7} {'SCORE':<7} {'VERDICT':<8} {'JITTER (mU)':<12} {'MISSING %':<10} {'BONE COV %'}")
        print("-" * 75)
        for r in sorted(qa_rows, key=lambda x: (x['verdict'] != 'GREEN', x['gloss']))[:30]:
            print(f"{r['gloss']:<15} {r['type']:<7} {r['score']:<7} {r['verdict']:<8} {r['jitter_mU']:<12} {r['missing_ratio']*100:<10.0f} {r['bone_cov_pct']}")
        if len(qa_rows) > 30:
            print(f"... and {len(qa_rows) - 30} more clips audited.")
        print("-----------------------------------------------------------------------------------\n")

    return True, index_data


if __name__ == "__main__":
    audit = "--audit" in sys.argv or "--quality" in sys.argv
    success, _ = validate_library(audit_quality=audit)
    if not success:
        sys.exit(1)
