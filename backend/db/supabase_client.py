from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load .env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=os.path.abspath(env_path))

# ✅ Load server-only Supabase keys
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("❌ Missing Supabase configuration (URL or Service Role Key).")

print(f"✅ Supabase client initialized for: {SUPABASE_URL}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

