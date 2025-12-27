// frontend/src/lib/api.ts

export function getApiBase(): string {
  // ✅ Local development
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }

  // ✅ Production: SAME ORIGIN
  // This guarantees cookies, CORS, and stability
  return "";
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = getApiBase();
  const finalPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${finalPath}`;

  console.log("API FETCH →", url);

  return fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
