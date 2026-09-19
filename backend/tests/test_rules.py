"""Unit tests for individual ASL grammar rules and transformations."""

from backend.app.gloss.pipeline import gloss_pipeline
from backend.app.schemas import TranslateRequest


def test_copula_and_article_removal():
    resp = gloss_pipeline.translate(TranslateRequest(text="The teacher is a friend"))
    glosses = [t.gloss for t in resp.tokens]
    assert "THE" not in glosses
    assert "A" not in glosses
    assert "IS" not in glosses
    assert glosses == ["TEACHER", "FRIEND"]


def test_time_fronting():
    resp = gloss_pipeline.translate(TranslateRequest(text="I need water today"))
    glosses = [t.gloss for t in resp.tokens]
    assert glosses[0] == "TODAY"
    assert glosses == ["TODAY", "ME", "NEED", "WATER"]


def test_past_tense_finish_marker():
    resp = gloss_pipeline.translate(TranslateRequest(text="We ate food"))
    glosses = [t.gloss for t in resp.tokens]
    assert glosses == ["WE", "EAT", "FOOD", "FINISH"]


def test_future_tense_will_marker():
    resp = gloss_pipeline.translate(TranslateRequest(text="We will eat food"))
    glosses = [t.gloss for t in resp.tokens]
    assert glosses == ["WE", "EAT", "FOOD", "WILL"]


def test_wh_question_reordering():
    resp = gloss_pipeline.translate(TranslateRequest(text="Where is the hospital?"))
    assert resp.is_question is True
    assert resp.question_type == "wh"
    glosses = [t.gloss for t in resp.tokens]
    assert glosses[-1] == "WHERE"
    assert glosses == ["HOSPITAL", "WHERE"]


def test_yes_no_question():
    resp = gloss_pipeline.translate(TranslateRequest(text="Do you need help?"))
    assert resp.is_question is True
    assert resp.question_type == "yes_no"
    glosses = [t.gloss for t in resp.tokens]
    assert glosses == ["YOU", "NEED", "HELP"]


def test_negation_not():
    resp = gloss_pipeline.translate(TranslateRequest(text="I do not understand"))
    glosses = [t.gloss for t in resp.tokens]
    assert glosses == ["ME", "NOT", "UNDERSTAND"]


def test_fingerspell_proper_nouns_and_numbers():
    resp = gloss_pipeline.translate(TranslateRequest(text="Doctor Sarah room 501"))
    tokens = resp.tokens
    assert tokens[0].gloss == "DOCTOR"
    assert tokens[1].kind == "fingerspell"
    assert tokens[1].gloss == "FS:SARAH"
    assert tokens[1].letters == ["S", "A", "R", "A", "H"]
    assert tokens[2].kind == "fingerspell"
    assert tokens[2].gloss == "FS:ROOM"
    assert tokens[3].kind == "fingerspell"
    assert tokens[3].gloss == "FS:501"
    assert tokens[3].letters == ["5", "0", "1"]
