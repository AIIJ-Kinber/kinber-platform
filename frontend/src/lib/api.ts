// frontend/src/lib/api.ts

export function getApiBase(): string {
  // Prefer ONE variable: NEXT_PUBLIC_API_BASE_URL
  // Example value:
  //   https://kinber-platform-production.up.railway.app
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

  // ❌ Production must not silently fallback (causes your exact bug)
  throw new Error(
    "API base URL not configured. Set NEXT_PUBLIC_API_BASE_URL in Vercel."
  );
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = getApiBase();
  const finalPath = path.startsWith("/") ? path : `/${path}`;

  return fetch(`${base}${finalPath}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
