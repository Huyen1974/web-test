"""Custom Firestore-backed chat history skeleton.

This module defines a minimal skeleton for a Firestore-based chat memory
backend intended to integrate with Langroid. It provides the class structure
and method signatures but does not implement persistence logic yet.

Note: This is a placeholder implementation for Phase 5 (ID 5.1). The actual
Firestore CRUD operations and data modeling will be implemented in a later
task.
"""

from typing import Any

from langroid.agent.chat_history import ChatHistory


class FirestoreChatHistory(ChatHistory):
    """Firestore-backed implementation of Langroid's ChatHistory (skeleton).

    This placeholder class establishes the interface to store and retrieve
    chat messages for a given session in Firestore. Actual Firestore reads and
    writes are intentionally omitted at this stage.

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
            Placeholder implementation. No Firestore calls are made here.
        """
        super().__init__()
        self.session_id = session_id
        self.client = firestore_client

    def add_messages(self, messages):  # type: ignore[override]
        """Add one or more messages to the session history.

        Args:
            messages: A message or list of messages in the format expected by
                Langroid's ChatHistory. Exact types will be aligned in the
                concrete implementation.

        Raises:
            NotImplementedError: This is a placeholder method.
        """
        raise NotImplementedError("FirestoreChatHistory.add_messages is not implemented yet")

    def get_messages(self):  # type: ignore[override]
        """Retrieve messages for the current session.

        Returns:
            The collection of messages for this session, as expected by
            Langroid's ChatHistory interface.

        Raises:
            NotImplementedError: This is a placeholder method.
        """
        raise NotImplementedError("FirestoreChatHistory.get_messages is not implemented yet")

    def clear(self):  # type: ignore[override]
        """Clear all messages for the current session.

        Raises:
            NotImplementedError: This is a placeholder method.
        """
        raise NotImplementedError("FirestoreChatHistory.clear is not implemented yet")

