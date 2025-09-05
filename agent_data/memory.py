"""Custom Firestore-backed chat history backend.

This module provides a Firestore-based chat memory backend intended to
integrate with Langroid. It currently implements simple CRUD operations for
storing, retrieving, and clearing chat messages for a given session.

Note: This is a foundational implementation for Phase 5 (ID 5.1).
Enhancements such as batching, transactions, and typed message objects can be
added in subsequent tasks.
"""

from collections.abc import Mapping, MutableMapping
from datetime import UTC
from typing import Any

try:  # Prefer real Langroid ChatHistory when available
    from langroid.agent.chat_history import ChatHistory  # type: ignore
except Exception:  # Fallback stub to avoid hard dependency at import time

    class ChatHistory:  # type: ignore
        def __init__(self) -> None:
            pass


class FirestoreChatHistory(ChatHistory):
    """Firestore-backed implementation of Langroid's ChatHistory.

    Provides minimal persistence for chat messages per session using Firestore.

    Attributes:
        session_id: Identifier for the chat session/conversation.
        client: Firestore client instance used for persistence operations.
    """

    def __init__(self, session_id: str, firestore_client: Any) -> None:
        """Initialize the Firestore chat history backend.

        Args:
            session_id: The unique identifier for the chat session.
            firestore_client: A Firestore client instance (typed as Any here
                to avoid introducing a hard dependency during the skeleton
                phase).

        Note:
            This constructor does not perform any Firestore I/O.
        """
        super().__init__()
        self.session_id = session_id
        self.client = firestore_client

    def add_messages(self, messages):  # type: ignore[override]
        """Add one or more messages to the session history in Firestore.

        Accepts a single message or an iterable of messages. Each message can be
        a mapping with at least ``role`` and ``content`` keys, or an object with
        ``role``/``content`` attributes. A timestamp field ``ts`` is attached
        for sorting.
        """
        coll = self._messages_collection()
        if not isinstance(messages, list | tuple):
            messages = [messages]

        for msg in messages:
            data = self._serialize_message(msg)
            # Prefer server-generated timestamp if available
            try:
                from google.cloud.firestore_v1 import SERVER_TIMESTAMP  # type: ignore

                data.setdefault("ts", SERVER_TIMESTAMP)
            except Exception:
                from datetime import datetime

                data.setdefault("ts", datetime.now(UTC))

            coll.add(data)

    def get_messages(self):  # type: ignore[override]
        """Retrieve messages for the current session from Firestore.

        Returns a list of simple dictionaries with at least ``role`` and
        ``content`` keys. Callers can adapt these to Langroid-native message
        objects if required.
        """
        coll = self._messages_collection()
        try:
            query = coll.order_by("ts")
        except Exception:
            query = coll

        docs_iter = getattr(query, "stream", getattr(query, "get", None))
        if docs_iter is None:
            return []

        results: list[MutableMapping[str, Any]] = []
        for snap in docs_iter():
            data = snap.to_dict() if hasattr(snap, "to_dict") else {}
            if isinstance(data, dict):
                results.append(self._deserialize_message(data))
        return results

    def clear(self):  # type: ignore[override]
        """Delete all messages for the current session from Firestore.

        Firestore does not support bulk delete on the client; we iterate over
        documents and delete each one.
        """
        coll = self._messages_collection()
        for snap in coll.stream():
            ref = getattr(snap, "reference", None)
            if ref is not None:
                ref.delete()

    # ----------------------------
    # Internal helpers
    # ----------------------------
    def _messages_collection(self):
        """Return the Firestore sub-collection for this session's messages."""
        return (
            self.client.collection("chat_sessions")
            .document(self.session_id)
            .collection("messages")
        )

    @staticmethod
    def _serialize_message(msg: Any) -> MutableMapping[str, Any]:
        """Convert a message object into a Firestore-storable dict.

        Supports mappings (expects ``role`` and ``content`` keys), objects with
        those attributes, or falls back to string representation for content.
        """
        if isinstance(msg, Mapping):
            role = msg.get("role", "user")
            content = msg.get("content", "")
        else:
            role = getattr(msg, "role", "user")
            content = getattr(msg, "content", str(msg))
        return {"role": role, "content": content}

    @staticmethod
    def _deserialize_message(data: Mapping[str, Any]) -> MutableMapping[str, Any]:
        """Convert Firestore dict back to a simple message dict.

        Returns a minimal shape compatible with downstream consumption:
        ``{"role": ..., "content": ..., "ts": ...}`` when present.
        """
        out: MutableMapping[str, Any] = {
            "role": data.get("role", "user"),
            "content": data.get("content", ""),
        }
        if "ts" in data:
            out["ts"] = data["ts"]
        return out
