# In-memory store for session-specific conversation context
session_contexts = {}

def get_context(session_id):
    """Retrieve the conversation context for a session, or initialize if not present."""
    return session_contexts.setdefault(session_id, [])

def add_to_context(session_id, user_message, ai_response):
    """Append a user/AI message pair to the session's context."""
    session_contexts.setdefault(session_id, []).append({
        "user": user_message,
        "ai": ai_response
    })
