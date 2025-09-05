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
    inst = FirestoreChatHistory(session_id="s", firestore_client=Mock())
    with pytest.raises(NotImplementedError):
        inst.add_messages([{"role": "user", "content": "hi"}])


def test_get_messages_raises_not_implemented():
    inst = FirestoreChatHistory(session_id="s", firestore_client=Mock())
    with pytest.raises(NotImplementedError):
        inst.get_messages()


def test_clear_raises_not_implemented():
    inst = FirestoreChatHistory(session_id="s", firestore_client=Mock())
    with pytest.raises(NotImplementedError):
        inst.clear()
