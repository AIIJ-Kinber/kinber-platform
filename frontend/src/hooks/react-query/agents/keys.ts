// src/hooks/react-query/agents/keys.ts

// Minimal replacement for the deleted createQueryKeys()
// This keeps your agent React Query logic working.
export function createQueryKeys<T extends Record<string, any>>(keys: T): T {
  return keys;
}

export const agentKeys = createQueryKeys({
  all: ["agents"] as const,
  list: () => ["agents", "list"] as const,
  detail: (id: string) => ["agents", "detail", id] as const,
});
