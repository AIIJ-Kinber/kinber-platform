// src/hooks/react-query/files/keys.ts

// Minimal local replacement for removed createQueryKeys
function createQueryKeys<T extends Record<string, any>>(keys: T): T {
  return keys;
}

export const sandboxKeys = createQueryKeys({
  all: ['sandbox'] as const,

  files: (sandboxId: string, path: string) =>
    ['sandbox', sandboxId, 'files', path] as const,

  fileContent: (sandboxId: string, path: string) =>
    ['sandbox', sandboxId, 'content', path] as const,
});

export const healthKeys = createQueryKeys({
  all: ['health'] as const,
  api: () => ['health', 'api'] as const,
});
