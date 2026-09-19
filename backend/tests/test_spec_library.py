"""
test_spec_library.py — Tests for Phase S3 Sign Spec Library and Source Priority Rules.
"""

import json
from pathlib import Path
import pytest

DATA_DIR = Path("data")
SIGNSPEC_DIR = DATA_DIR / "signspecs"
HANDSHAPE_DIR = DATA_DIR / "handshapes"
SIGNS_DIR = DATA_DIR / "signs"
INDEX_FILE = SIGNS_DIR / "index.json"

def test_all_signspecs_valid_schema():
    assert SIGNSPEC_DIR.exists()
    spec_files = list(SIGNSPEC_DIR.glob("*.json"))
    assert len(spec_files) >= 20, f"Expected at least 20 sign specs, found {len(spec_files)}"

    for sf in spec_files:
        with open(sf, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert "gloss" in data, f"Missing gloss in {sf}"
        assert "hands" in data, f"Missing hands in {sf}"
        assert data["hands"] in ["dominant", "two"]
        assert "keyframes" in data, f"Missing keyframes in {sf}"
        assert len(data["keyframes"]) >= 2, f"Expected at least 2 keyframes in {sf}"

        for kf in data["keyframes"]:
            assert "t" in kf
            assert 0.0 <= kf["t"] <= 1.0
            assert "dominant" in kf
            assert "handshape" in kf["dominant"]
            assert "palm" in kf["dominant"]
            assert "fingers" in kf["dominant"]
            assert "location" in kf["dominant"]

            if data["hands"] == "two":
                assert "non_dominant" in kf, f"Missing non_dominant keyframe in two-handed sign {sf}"

def test_referenced_handshapes_exist():
    with open(HANDSHAPE_DIR / "index.json", "r", encoding="utf-8") as f:
        hs_index = json.load(f)
    valid_hs_ids = set(hs_index.get("handshapes", {}).keys())

    for sf in SIGNSPEC_DIR.glob("*.json"):
        with open(sf, "r", encoding="utf-8") as f:
            data = json.load(f)

        for kf in data["keyframes"]:
            dom_hs = kf["dominant"]["handshape"]
            assert dom_hs in valid_hs_ids, f"Unknown handshape '{dom_hs}' in {sf}"
            if data["hands"] == "two" and "non_dominant" in kf:
                nd_hs = kf["non_dominant"]["handshape"]
                assert nd_hs in valid_hs_ids, f"Unknown handshape '{nd_hs}' in {sf}"

def test_source_priority_in_index():
    assert INDEX_FILE.exists()
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        index_data = json.load(f)

    signs = index_data.get("signs", {})
    assert len(signs) >= 90

    # Ensure spec-compiled signs are present and prioritized over synthetic
    spec_files = list(SIGNSPEC_DIR.glob("*.json"))
    for sf in spec_files:
        clip_id = sf.stem
        assert clip_id in signs, f"Clip {clip_id} missing in index.json"
        entry = signs[clip_id]
        # Should be real or handshape-spec, not synthetic
        assert entry["source"] in ["handshape-spec", "asl-citizen-processed-200", "asl-mnist-voxel51", "team-recording"]
        assert entry["synthetic"] is False

def test_compiled_clips_format_and_landmarks():
    for sf in SIGNSPEC_DIR.glob("*.json"):
        clip_id = sf.stem
        clip_path = SIGNS_DIR / f"{clip_id}.json"
        assert clip_path.exists(), f"Compiled clip {clip_path} missing"

        with open(clip_path, "r", encoding="utf-8") as f:
            clip = json.load(f)

        assert clip["fps"] == 30
        assert len(clip["frames"]) >= 15
        assert clip["source"] == "handshape-spec"

        for frame in clip["frames"]:
            assert len(frame["pose"]) == 33
            assert len(frame["right_hand"]) == 21
            if clip.get("hands") == "two" or frame.get("left_hand"):
                assert len(frame["left_hand"]) == 21
