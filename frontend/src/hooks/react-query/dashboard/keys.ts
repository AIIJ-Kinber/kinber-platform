// src/hooks/react-query/dashboard/keys.ts

// Minimal local replacement for the old createQueryKeys helper
function createQueryKeys<T extends Record<string, any>>(keys: T): T {
  return keys;
}

export const dashboardKeys = createQueryKeys({
  all: ['dashboard'] as const,
  agents: ['dashboard', 'agents'] as const,
  initiateAgent: () => ['dashboard', 'agents', 'initiate'] as const,
});
