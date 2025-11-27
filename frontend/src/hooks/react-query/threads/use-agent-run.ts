// Minimal placeholder hooks for MVP.
// These avoid build errors and preserve imports,
// but do NOT perform real queries or mutations.

import { threadKeys } from "./keys";

// --- Types ---
interface AgentRun {
  id: string;
  status: string;
  started_at?: string;
  finished_at?: string;
}

// --- Placeholder API functions ---
async function fakeWait(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- QUERY: Get agent runs ---
export const useAgentRunsQuery = (threadId: string) => {
  return {
    data: [] as AgentRun[],
    isLoading: false,
    error: null,
    refetch: async () => {
      await fakeWait();
      return [];
    },
  };
};

// --- MUTATION: Start agent ---
export const useStartAgentMutation = () => {
  return {
    mutate: async (_params: any) => {
      await fakeWait();
      return { success: true };
    },
    isLoading: false,
    error: null,
  };
};

// --- MUTATION: Stop agent ---
export const useStopAgentMutation = () => {
  return {
    mutate: async (_agentRunId: string) => {
      await fakeWait();
      return { stopped: true };
    },
    isLoading: false,
    error: null,
  };
};
