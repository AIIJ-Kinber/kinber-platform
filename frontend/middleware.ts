import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // ✅ ABSOLUTE RULE:
  // Never touch the public landing page
  if (req.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  // 🛑 Safety guard (Vercel env protection)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set(name, value, options);
        },
        remove(name, options) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  // 🔄 Session refresh (protected routes only)
  try {
    await supabase.auth.getSession();
  } catch {
    // swallow safely
  }

  return res;
}

// 🎯 Middleware ONLY applies to protected areas
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/:path*",
    "/api/:path*",
  ],
};
