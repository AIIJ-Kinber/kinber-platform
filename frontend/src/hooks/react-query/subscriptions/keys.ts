// Placeholder keys for disabled billing/subscription system.
// These prevent import errors in components that still reference them.

export const subscriptionKeys = {
  all: ['subscription'] as const,
  details: () => ['subscription', 'details'] as const,
};

export const modelKeys = {
  all: ['models'] as const,
  available: ['models', 'available'] as const,
};

export const usageKeys = {
  all: ['usage'] as const,
  logs: (page?: number, itemsPerPage?: number) =>
    ['usage', 'logs', { page, itemsPerPage }] as const,
};
