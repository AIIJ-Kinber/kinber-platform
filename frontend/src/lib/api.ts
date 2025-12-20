export function getApiBase() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!base) {
    throw new Error('API base URL not configured');
  }

  return base;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const base = getApiBase();

  return fetch(`${base}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
}
