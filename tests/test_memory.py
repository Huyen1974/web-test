from unittest.mock import Mock, patch

import pytest

from agent_data.memory import FirestoreChatHistory

# Mark all tests in this module as unit tests
pytestmark = pytest.mark.unit


def test_init_sets_attributes_and_calls_super():
    client = Mock()
    with patch(
        "agent_data.memory.ChatHistory.__init__", return_value=None
    ) as super_init:
        inst = FirestoreChatHistory(session_id="session-123", firestore_client=client)
        super_init.assert_called_once()

    assert inst.session_id == "session-123"
    assert inst.client is client


def test_add_messages_raises_not_implemented():
    # Now implemented: verify Firestore add called with serialized data
    client = Mock()
    coll = client.collection.return_value.document.return_value.collection.return_value
    inst = FirestoreChatHistory(session_id="s", firestore_client=client)
    inst.add_messages({"role": "user", "content": "hi"})
    assert coll.add.called


def test_get_messages_raises_not_implemented():
    # Mock Firestore stream to return snapshots with to_dict
    class Snap:
        def __init__(self, data):
            self._d = data

        def to_dict(self):
            return self._d

    client = Mock()
    coll = client.collection.return_value.document.return_value.collection.return_value
    # order_by().stream() → iterable of snapshots
    coll.order_by.return_value.stream.return_value = [
        Snap({"role": "user", "content": "a", "ts": 1}),
        Snap({"role": "assistant", "content": "b", "ts": 2}),
    ]
    inst = FirestoreChatHistory(session_id="s", firestore_client=client)
    msgs = inst.get_messages()
    assert isinstance(msgs, list) and len(msgs) == 2
    assert msgs[0]["role"] == "user" and msgs[0]["content"] == "a"


def test_clear_raises_not_implemented():
    # Mock Firestore stream deleting each snapshot's reference
    class Ref:
        def __init__(self):
            self.deleted = False

        def delete(self):
            self.deleted = True

    class Snap:
        def __init__(self):
            self.reference = Ref()

    client = Mock()
    coll = client.collection.return_value.document.return_value.collection.return_value
    snaps = [Snap(), Snap()]
    coll.stream.return_value = snaps

    inst = FirestoreChatHistory(session_id="s", firestore_client=client)
    inst.clear()
    assert all(s.reference.deleted for s in snaps)
