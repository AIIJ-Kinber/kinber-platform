import os
from supabase import create_client, Client
from typing import Optional

# ------------------------------------------------------------
# Environment
# ------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# ------------------------------------------------------------
# Singleton client
# ------------------------------------------------------------
_supabase: Optional[Client] = None


def get_supabase() -> Client:
    """
    Returns a singleton Supabase client.

    Safe for:
    - Local dev
    - Railway
    - Uvicorn reload
    """

    global _supabase

    if _supabase is not None:
        return _supabase

    if not SUPABASE_URL:
        raise RuntimeError("❌ SUPABASE_URL is missing")

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("❌ SUPABASE_SERVICE_ROLE_KEY is missing")

    _supabase = create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    )

    return _supabase
