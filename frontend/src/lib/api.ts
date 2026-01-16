// frontend/src/lib/api.ts

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function getApiBase(): string {
  // ✅ Local development
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }
  // ✅ Production: SAME ORIGIN
  return "";
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = getApiBase();
  const finalPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${finalPath}`;

  console.log("🌐 API FETCH →", url);

  try {
    // ✅ Get Supabase client
    const supabase = createClientComponentClient();
    
    // ✅ Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("❌ Session error:", sessionError);
    }
    
    // ✅ Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("❌ User error:", userError);
    }
    
    console.log("🔍 Auth check:", {
      hasSession: !!session,
      hasUser: !!user,
      userId: user?.id || "NONE",
      hasAccessToken: !!session?.access_token,
    });

    // ✅ Extract values
    const accessToken = session?.access_token;
    const userId = user?.id;

    // ✅ Build headers - Start with existing headers from init
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string>) || {}),
    };

    // ✅ Add Authorization header
    if (accessToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
      console.log("✅ Added Authorization header");
    } else {
      console.warn("⚠️ NO ACCESS TOKEN AVAILABLE!");
    }

    // ✅ Add X-User-ID header
    if (userId) {
      (headers as Record<string, string>)["X-User-ID"] = userId;
      console.log("✅ Added X-User-ID:", userId);
    } else {
      console.warn("⚠️ NO USER ID AVAILABLE!");
    }

    // ✅ Debug: Print final headers
    console.log("📤 Final headers being sent:", headers);

    // ✅ Make the request
    const response = await fetch(url, {
      ...init,
      credentials: "include",
      headers: headers,
    });

    console.log("📥 Response:", response.status, response.statusText);

    return response;

  } catch (error) {
    console.error("❌ apiFetch error:", error);
    throw error;
  }
}
