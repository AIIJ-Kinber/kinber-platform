# backend/services/langfuse.py

from utils.config import config

# Try to import the real Langfuse SDK; otherwise fall back to a stub
try:
    from langfuse import Langfuse
except ImportError:
    class Langfuse:
        """Stub for Langfuse client when the SDK isn’t installed."""
        def __init__(self, *args, **kwargs):
            pass
        def track_event(self, *args, **kwargs):
            pass
        # add any methods you call on langfuse here as no-ops

# Initialize the Langfuse client with your API keys and host
langfuse = Langfuse(
    public_key=config.LANGFUSE_PUBLIC_KEY,
    secret_key=config.LANGFUSE_SECRET_KEY,
    host=config.LANGFUSE_HOST,
)
