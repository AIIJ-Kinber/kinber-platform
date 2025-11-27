import useSWR, { SWRConfiguration } from 'swr';

const backendBase =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || 'http://127.0.0.1:8000';

const fetcher = async (url: string) => {
  const fullUrl = `${backendBase}${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch accounts: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.data;
};

export const useAccounts = (options?: SWRConfiguration) => {
  return useSWR('/api/accounts', fetcher, options);
};
