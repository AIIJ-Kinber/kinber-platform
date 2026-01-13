import os
from supabase import create_client
from typing import Optional

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

_supabase = None


def get_supabase():
    global _supabase

    if _supabase is not None:
        return _supabase

    if not SUPABASE_URL:
        raise RuntimeError("❌ SUPABASE_URL is missing")

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("❌ SUPABASE_SERVICE_ROLE_KEY is missing")

    # ✅ IMPORTANT: DO NOT pass options, proxies, or http_client
    _supabase = create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    )

    return _supabase

