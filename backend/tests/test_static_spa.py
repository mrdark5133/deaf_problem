"""Tests for static asset serving and SPA catch-all routing fallback."""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "signbridge-backend"


def test_api_translate_endpoint(client):
    response = client.post("/api/translate", json={"text": "hello world", "seq": 1})
    assert response.status_code == 200
    data = response.json()
    assert "tokens" in data
    assert len(data["tokens"]) > 0


def test_unknown_api_route_returns_json_404(client):
    response = client.get("/api/unknown_route_that_does_not_exist")
    assert response.status_code == 404
    assert response.headers.get("content-type", "").startswith("application/json")
    data = response.json()
    assert "detail" in data


def test_unknown_post_api_route_returns_json_404(client):
    response = client.post("/api/invalid_post_endpoint", json={"test": True})
    assert response.status_code == 404
    assert response.headers.get("content-type", "").startswith("application/json")


def test_data_signs_index_serving(client):
    response = client.get("/data/signs/index.json")
    assert response.status_code == 200
    data = response.json()
    assert "signs" in data


def test_spa_root_fallback(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "").lower()
    assert "<html" in response.text.lower() or "<!doctype html" in response.text.lower()


def test_spa_client_routes_fallback(client):
    for route in ["/recorder", "/player-test", "/handshapes", "/specs"]:
        response = client.get(route)
        assert response.status_code == 200
        assert "html" in response.headers.get("content-type", "").lower()
        assert "<html" in response.text.lower() or "<!doctype html" in response.text.lower()

