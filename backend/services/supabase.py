import os
import logging
from supabase import create_client

logger = logging.getLogger(__name__)


class SupabaseService:
    def __init__(self):
        self._client = None

    def get_client(self):
        if self._client:
            return self._client

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise RuntimeError("Supabase env vars missing")

        logger.debug("Initializing Supabase connection")

        # ✅ SYNC CLIENT ONLY — async not supported
        self._client = create_client(
            supabase_url,
            supabase_key,
        )

        return self._client


supabase_service = SupabaseService()
