"""Input hardening tests for ASL translation pipeline."""

from backend.app.gloss.pipeline import gloss_pipeline
from backend.app.schemas import TranslateRequest


def test_empty_and_whitespace_input():
    for empty_text in ["", "   ", "\n\t  \r"]:
        resp = gloss_pipeline.translate(TranslateRequest(text=empty_text))
        assert resp.tokens == []
        assert resp.is_question is False
        assert resp.processing_ms >= 0


def test_punctuation_and_emojis_only():
    for text in ["!@#$%^&*()", "😀 😊 👍 🏥", "????.....!!!"]:
        resp = gloss_pipeline.translate(TranslateRequest(text=text))
        assert isinstance(resp.tokens, list)
        assert resp.processing_ms >= 0


def test_all_caps_input():
    resp = gloss_pipeline.translate(TranslateRequest(text="WHERE IS THE DOCTOR?"))
    assert resp.is_question is True
    assert resp.question_type == "wh"
    assert [t.gloss for t in resp.tokens] == ["DOCTOR", "WHERE"]


def test_very_long_input_truncation():
    long_text = "hello " * 200
    resp = gloss_pipeline.translate(TranslateRequest(text=long_text))
    assert len(resp.tokens) <= 55
    assert resp.processing_ms < 500
