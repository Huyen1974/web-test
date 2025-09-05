import sys
import types
from unittest.mock import Mock, patch

import pytest

# Provide a lightweight stub for langroid if not available locally
if "langroid.agent.chat_history" not in sys.modules:
    langroid = types.ModuleType("langroid")
    agent_mod = types.ModuleType("langroid.agent")
    ch_mod = types.ModuleType("langroid.agent.chat_history")

    class ChatHistory:  # minimal stub for import
        def __init__(self, *args, **kwargs):
            pass

    ch_mod.ChatHistory = ChatHistory
    sys.modules["langroid"] = langroid
    sys.modules["langroid.agent"] = agent_mod
    sys.modules["langroid.agent.chat_history"] = ch_mod

from agent_data.memory import FirestoreChatHistory

# Mark all tests in this module as unit tests
pytestmark = pytest.mark.unit


def test_init_sets_attributes_and_calls_super():
    client = Mock()
    with patch(
        "langroid.agent.chat_history.ChatHistory.__init__", return_value=None
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
