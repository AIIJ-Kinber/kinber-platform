'use client';

// Public Projects feature is disabled in this MVP.
// We keep a placeholder hook to avoid breaking imports.

export function usePublicProjects() {
  return {
    data: [],
    isLoading: false,
    error: null,
    refetch: () => {},
  };
}
