from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import agent_data.server as server

pytestmark = pytest.mark.unit


def test_kb_requires_api_key(monkeypatch):
    # Ensure API_KEY is not set
    monkeypatch.delenv("API_KEY", raising=False)
    client = TestClient(server.app)
    payload = {
        "document_id": "doc-auth-1",
        "parent_id": "root",
        "content": {"mime_type": "text/plain", "body": "x"},
        "metadata": {"title": "Auth"},
    }
    r = client.post("/documents", json=payload)
    assert r.status_code == 403


def test_kb_invalid_api_key(monkeypatch):
    monkeypatch.setenv("API_KEY", "secret")
    client = TestClient(server.app)
    payload = {
        "document_id": "doc-auth-2",
        "parent_id": "root",
        "content": {"mime_type": "text/plain", "body": "x"},
        "metadata": {"title": "Auth"},
    }
    r = client.post("/documents", json=payload, headers={"x-api-key": "bad"})
    assert r.status_code == 401


def test_kb_firestore_missing(monkeypatch):
    # Valid API key but no db configured -> 500
    monkeypatch.setenv("API_KEY", "secret")
    # Remove db if present
    if hasattr(server.agent, "db"):
        delattr(server.agent, "db")
    client = TestClient(server.app)
    payload = {
        "document_id": "doc-auth-3",
        "parent_id": "root",
        "content": {"mime_type": "text/plain", "body": "x"},
        "metadata": {"title": "Auth"},
    }
    r = client.post(
        "/documents",
        json=payload,
        headers={"x-api-key": "secret"},
    )
    assert r.status_code == 500
