"""Tests for Sign Library generation and validation tools."""

from pathlib import Path
from scripts.validate_library import validate_library, validate_clip_file


def test_validate_all_clips_in_library():
    success, index_data = validate_library()
    assert success is True, "Library validation failed"
    assert index_data["total_signs"] >= 50
    assert index_data["real_signs"] >= 20
    assert "signs" in index_data
    assert "hello" in index_data["signs"]
    assert "doctor" in index_data["signs"]


def test_validate_single_clip_file():
    root_dir = Path(__file__).resolve().parent.parent.parent
    sample_clip = root_dir / "data" / "signs" / "hello.json"
    assert sample_clip.exists()

    is_valid, msg, clip_data = validate_clip_file(sample_clip)
    assert is_valid is True
    assert msg == "Valid"
    assert clip_data["id"] == "hello"
    assert clip_data["gloss"] == "HELLO"
    assert clip_data["fps"] == 30
    assert isinstance(clip_data["synthetic"], bool)
    if not clip_data["synthetic"]:
        assert "source" in clip_data
        assert "license" in clip_data
    assert len(clip_data["frames"]) > 0
