import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Create NextResponse to modify cookies if needed
  const res = NextResponse.next();

  // Create Supabase client
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
          } catch {}
        },
        remove(name: string, options: any) {
          try {
            res.cookies.set(name, "", { ...options, maxAge: 0 });
          } catch {}
        },
      },
    }
  );

  // Refresh session if needed (recommended in middleware)
  await supabase.auth.getSession();

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
