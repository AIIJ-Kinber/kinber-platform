import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ------------------------------------------------------------
  // 💡 Supabase SSR client (safe cookie handling)
  // ------------------------------------------------------------
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            res.cookies.set(name, value, options);
          } catch (err) {
            console.warn("Cookie SET failed:", err);
          }
        },
        remove(name: string, options: any) {
          try {
            res.cookies.set(name, "", { ...options, maxAge: 0 });
          } catch (err) {
            console.warn("Cookie REMOVE failed:", err);
          }
        },
      },
    }
  );

  // ------------------------------------------------------------
  // 🔄 Refresh session — SAFE, no cookie parsing needed
  // ------------------------------------------------------------
  try {
    await supabase.auth.getSession();
  } catch (err) {
    console.warn("Supabase session refresh error:", err);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
