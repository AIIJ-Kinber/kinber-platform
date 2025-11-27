'use client';

import { useQuery } from '@tanstack/react-query';
import { threadKeys } from './keys';

// -----------------------------------------------
// TEMPORARY PLACEHOLDER getThreads()
// -----------------------------------------------
async function getThreads() {
  console.warn('⚠️ getThreads() running in placeholder mode.');

  return [
    {
      thread_id: 'demo-thread-1',
      title: 'Welcome to Kinber',
      updated_at: new Date().toISOString(),
    },
  ];
}

// -----------------------------------------------
// Hook: Threads by Project
// -----------------------------------------------
export const useThreadsByProject = (projectId?: string) => {
  return useQuery({
    queryKey: threadKeys.byProject(projectId || ''),
    queryFn: () =>
      projectId ? getThreads() : Promise.resolve([] as any[]),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// -----------------------------------------------
// Hook: All Threads
// -----------------------------------------------
export const useAllThreads = () => {
  return useQuery({
    queryKey: threadKeys.all,
    queryFn: () => getThreads(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
