"""Tests for /api/translate endpoint."""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_translate_endpoint_real_pipeline():
    payload = {"text": "Where is the doctor?", "is_final": True, "seq": 42}
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["seq"] == 42
    assert data["original"] == "Where is the doctor?"
    assert data["is_question"] is True
    assert data["question_type"] == "wh"
    assert len(data["tokens"]) == 2
    assert data["tokens"][0]["gloss"] == "DOCTOR"
    assert data["tokens"][1]["gloss"] == "WHERE"
    assert "processing_ms" in data
    assert data["processing_ms"] >= 0
