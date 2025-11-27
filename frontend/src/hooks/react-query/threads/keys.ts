// Minimal threadKeys replacement for MVP.
// No React Query integration required.
// Only provides static keys so imports do not break.

export const threadKeys = {
  all: ['threads'] as const,
  details: (threadId: string) => ['thread', threadId] as const,
  messages: (threadId: string) => ['thread', threadId, 'messages'] as const,
  project: (projectId: string) => ['project', projectId] as const,
  publicProjects: () => ['public-projects'] as const,
  agentRuns: (threadId: string) => ['thread', threadId, 'agent-runs'] as const,
  billingStatus: ['billing', 'status'] as const,
  byProject: (projectId: string) => ['project', projectId, 'threads'] as const,
};
