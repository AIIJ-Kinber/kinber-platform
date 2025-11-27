// src/hooks/react-query/use-query-base.ts
'use client';

import {
  useQuery,
  useMutation,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';

/**
 * ------------------------------------------------------------------
 * ✔ createQueryHook (React Query v5 SAFE VERSION)
 * ------------------------------------------------------------------
 * - options is optional, NOT defaulted to {}
 * - this prevents TS from interpreting {} as a required structure
 * - fully compatible with all existing usage
 */
export function createQueryHook<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: UseQueryOptions<TData, Error, TData, readonly unknown[]>
) {
  return () =>
    useQuery<TData, Error, TData, readonly unknown[]>({
      queryKey,
      queryFn,
      ...(options ?? {}),
    });
}

/**
 * ------------------------------------------------------------------
 * ✔ createMutationHook (simple + compatible)
 * ------------------------------------------------------------------
 */
export function createMutationHook<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  return () =>
    useMutation<TData, Error, TVariables>({
      mutationFn,
      ...(options ?? {}),
    });
}
