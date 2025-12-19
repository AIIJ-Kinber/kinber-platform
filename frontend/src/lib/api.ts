export function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!base) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  }

  return base.replace(/\/$/, '');
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
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
