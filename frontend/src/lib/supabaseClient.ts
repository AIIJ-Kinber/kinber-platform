// frontend/src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "❌ ERROR: Missing NEXT_PUBLIC_SUPABASE_* environment variables:",
    { url, anonKey }
  );
  throw new Error("Supabase URL or ANON key is not defined");
}

console.log("🔑 Supabase URL:", url);
console.log(
  "🔑 Supabase ANON (first 10 chars):",
  anonKey.substring(0, 10) + "..."
);

export const supabase = createClient(url, anonKey);
