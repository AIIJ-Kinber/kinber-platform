export async function GET() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Loaded" : "❌ Missing";

  return Response.json({
    backend,
    supabaseUrl,
    anonKey,
  });
}
