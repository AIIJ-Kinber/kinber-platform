// Minimal placeholder version of message query + mutation hooks.
// Ensures the app compiles until real API endpoints are reconnected.

import { threadKeys } from "./keys";

// --- Types for compatibility ---
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

async function fakeWait(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Placeholder: always returns an empty message array ---
export const useMessagesQuery = (threadId: string) => {
  return {
    data: [] as Message[],
    isLoading: false,
    error: null,
    refetch: async () => {
      await fakeWait();
      return [] as Message[];
    },
  };
};

// Alias used by several UI modules
export const useMessages = useMessagesQuery;

// --- Placeholder: just resolves immediately, returns fake message ---
export const useAddUserMessageMutation = () => {
  return {
    mutate: async ({
      threadId,
      message,
    }: {
      threadId: string;
      message: string;
    }) => {
      console.log("[MVP] addUserMessage placeholder:", { threadId, message });
      await fakeWait();
      return {
        id: Math.random().toString(36).slice(2),
        role: "user",
        content: message,
      } as Message;
    },
    isLoading: false,
    error: null,
  };
};
