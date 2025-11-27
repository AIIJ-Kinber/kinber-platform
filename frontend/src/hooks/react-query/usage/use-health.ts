'use client';

import { useQuery } from '@tanstack/react-query';

// ------------------------------------------------------------------
// 🔧 Placeholder: Always return "healthy"
// ------------------------------------------------------------------
// You removed backend health APIs, so this hook returns a constant
// value using React Query to prevent breaking existing imports.
// ------------------------------------------------------------------

export const useApiHealth = () =>
  useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      return {
        ok: true,
        status: 'healthy',
        timestamp: Date.now(),
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
