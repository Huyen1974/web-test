import pytest
from fastapi.testclient import TestClient

import agent_data.server as server


class _Snap:
    def __init__(self, data, exists):
        self._data = dict(data)
        self._exists = exists

    @property
    def exists(self):
        return self._exists

    def to_dict(self):
        return dict(self._data)


class _Doc:
    def __init__(self, store, doc_id):
        self._store = store
        self._id = doc_id

    def set(self, data):
        self._store[self._id] = dict(data)

    def update(self, updates):
        self._store[self._id].update(dict(updates))

    def get(self):
        if self._id in self._store:
            return _Snap(self._store[self._id], True)
        return _Snap({}, False)


class _Col:
    def __init__(self, buckets):
        self._buckets = buckets

    def document(self, doc_id):
        return _Doc(self._buckets, doc_id)


class _FS:
    def __init__(self):
        self._collections = {}

    def collection(self, name):
        if name not in self._collections:
            self._collections[name] = {}
        return _Col(self._collections[name])


pytestmark = pytest.mark.e2e


def _setup_fake_db(monkeypatch):
    fake = _FS()
    monkeypatch.setattr(server, "agent", server.agent)
    server.agent.db = fake
    return fake


def test_kb_crud_endpoints(monkeypatch):
    _setup_fake_db(monkeypatch)
    client = TestClient(server.app)
    monkeypatch.setenv("API_KEY", "test-key")

    # Create
    r = client.post(
        "/documents",
        json={
            "document_id": "kb-doc-001",
            "parent_id": "root",
            "content": {
                "mime_type": "text/markdown",
                "body": "Hello KB",
            },
            "metadata": {
                "title": "Hello KB",
                "source": "unit",
            },
            "is_human_readable": True,
        },
        headers={"x-api-key": "test-key"},
    )
    assert r.status_code == 200
    doc = r.json()
    doc_id = doc["id"]
    assert doc["status"] == "created"

    # Update
    r2 = client.put(
        f"/documents/{doc_id}",
        json={
            "document_id": doc_id,
            "patch": {
                "content": {
                    "mime_type": "text/markdown",
                    "body": "Hello KB v2",
                },
                "metadata": {
                    "title": "Hello KB v2",
                    "version": 2,
                },
            },
            "update_mask": ["content", "metadata"],
            "last_known_revision": 1,
        },
        headers={"x-api-key": "test-key"},
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "updated"

    # Soft delete
    r3 = client.delete(f"/documents/{doc_id}", headers={"x-api-key": "test-key"})
    assert r3.status_code == 200
    assert r3.json()["status"] == "deleted"
