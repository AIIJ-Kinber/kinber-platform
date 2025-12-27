// frontend/src/lib/api.ts

export function getApiBase(): string {
  // Prefer ONE variable: NEXT_PUBLIC_API_BASE_URL
  // Example:
  //   https://www.kinber.com
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "";

  const cleaned = envBase.trim().replace(/\/+$/, "");

  // ✅ If configured, use it
  if (cleaned) return cleaned;

  // ✅ Local dev fallback ONLY
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }

  // ✅ Production fallback (SAFE)
  // Prevents "Failed to fetch" crashes
  console.warn(
    "⚠️ NEXT_PUBLIC_API_BASE_URL not set. Falling back to same-origin."
  );

  // This works because frontend + backend are on same domain (kinber.com)
  return "";
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = getApiBase();
  const finalPath = path.startsWith("/") ? path : `/${path}`;

  // ✅ TEMP DEBUG (remove later)
  console.log("API FETCH →", {
    base,
    finalPath,
    fullUrl: `${base}${finalPath}`,
  });

  return fetch(`${base}${finalPath}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}


