'use client';

import { createMutationHook } from '@/hooks/react-query/use-query-base';
import { toast } from 'sonner';

// --------------------------------------------------
// TEMPORARY PLACEHOLDER API FUNCTIONS (MVP MODE)
// These replace the removed '@/lib/api' functions
// --------------------------------------------------

async function createThread(projectId: string) {
  console.warn("⚠️ createThread() is running in placeholder mode.");
  return {
    thread_id: `thread-${Date.now()}`,
    project_id: projectId,
    title: "New Thread",
    created_at: new Date().toISOString(),
  };
}

async function addUserMessage(threadId: string, content: string) {
  console.warn("⚠️ addUserMessage() is running in placeholder mode.");
  return {
    thread_id: threadId,
    message_id: `msg-${Date.now()}`,
    role: "user",
    content,
    created_at: new Date().toISOString(),
  };
}

// --------------------------------------------------
// Create Thread Mutation
// --------------------------------------------------
export const useCreateThread = createMutationHook(
  async ({ projectId }: { projectId: string }) => {
    return await createThread(projectId);
  },
  {
    onSuccess: () => {
      toast.success('Thread created successfully');
    },
    onError: (error) => {
      console.error('❌ Failed to create thread:', error);
      toast.error('Failed to create thread');
    },
  }
);

// --------------------------------------------------
// Add Message Mutation
// --------------------------------------------------
export const useAddUserMessage = createMutationHook(
  async ({ threadId, content }: { threadId: string; content: string }) => {
    return await addUserMessage(threadId, content);
  },
  {
    onError: (error) => {
      console.error('❌ Failed to send message:', error);
      toast.error('Message not sent');
    },
  }
);
