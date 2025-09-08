import types
from datetime import datetime, timezone

import pytest

from agent_data.memory import FirestoreChatHistory


class _Snap:
    def __init__(self, data):
        self._data = data
        self.reference = types.SimpleNamespace(delete=lambda: None)

    def to_dict(self):
        return dict(self._data)


class _Collection:
    def __init__(self):
        self._docs = []

    def add(self, data):
        self._docs.append(dict(data))

    # Firestore client APIs compatibility
    def stream(self):
        return (_Snap(d) for d in self._docs)

    def get(self):
        return list(self.stream())

    def order_by(self, _field):
        return self


class _Firestore:
    def __init__(self):
        self._sessions = {}

    def collection(self, name):
        return _RootCollection(self._sessions)


class _RootCollection:
    def __init__(self, store):
        self._store = store

    def document(self, sid):
        return _Doc(self._store, sid)


class _Doc:
    def __init__(self, store, sid):
        self._store = store
        self._sid = sid

    def collection(self, name):
        key = (self._sid, name)
        if key not in self._store:
            self._store[key] = _Collection()
        return self._store[key]


def test_firestore_chat_history_add_get_clear():
    fake = _Firestore()
    hist = FirestoreChatHistory("sess-1", fake)

    # add messages
    hist.add_messages({"role": "user", "content": "hello"})
    hist.add_messages({"role": "assistant", "content": "hi there"})

    msgs = hist.get_messages()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"

    # clear
    hist.clear()
    msgs2 = hist.get_messages()
    assert msgs2 == []

