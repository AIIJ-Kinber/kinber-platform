'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { threadKeys } from './keys';
import {
  Thread,
  updateThread,
  toggleThreadPublicStatus,
  deleteThread,
  getThread,
} from './utils';

// Temporary placeholder if getThreads() is not implemented
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

// ------------------------------------------------------------
// Fetch 1 Thread
// ------------------------------------------------------------
export const useThreadQuery = (threadId: string) =>
  useQuery({
    queryKey: threadKeys.details(threadId),
    queryFn: () => getThread(threadId),
    enabled: !!threadId,
    retry: 1,
  });

// ------------------------------------------------------------
// Toggle Public / Private
// ------------------------------------------------------------
export const useToggleThreadPublicStatus = () =>
  useMutation({
    mutationFn: ({
      threadId,
      isPublic,
    }: {
      threadId: string;
      isPublic: boolean;
    }) => toggleThreadPublicStatus(threadId, isPublic),
  });

// ------------------------------------------------------------
// Update a Thread
// ------------------------------------------------------------
export const useUpdateThreadMutation = () =>
  useMutation({
    mutationFn: ({
      threadId,
      data,
    }: {
      threadId: string;
      data: Partial<Thread>;
    }) => updateThread(threadId, data),
  });

// ------------------------------------------------------------
// Delete a Thread
// ------------------------------------------------------------
export const useDeleteThreadMutation = () =>
  useMutation({
    mutationFn: ({ threadId }: { threadId: string }) =>
      deleteThread(threadId),
  });

// ------------------------------------------------------------
// Threads for a Project
// ------------------------------------------------------------
export const useThreadsForProject = (projectId: string) =>
  useQuery({
    queryKey: threadKeys.byProject(projectId),
    queryFn: () => getThreads(),
    enabled: !!projectId,
    retry: 1,
  });
