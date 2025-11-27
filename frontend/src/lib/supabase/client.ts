// frontend/src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

/**
 * ✅ Supabase Browser Client for Kinber v0.1
 * Works with real user sessions.
 */
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials are missing in .env.local");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
