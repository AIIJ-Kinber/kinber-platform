// src/lib/errors.ts

// Custom error for missing Supabase token
export class NoAccessTokenAvailableError extends Error {
  constructor(message = 'No access token available') {
    super(message);
    this.name = 'NoAccessTokenAvailableError';
  }
}

// Generic API error handler
export function handleApiError(error: unknown, context?: { operation?: string; resource?: string }) {
  const { operation, resource } = context || {};
  const opText = operation ? ` during ${operation}` : '';
  const resText = resource ? ` for ${resource}` : '';

  const baseMessage = `⚠️ API error${opText}${resText}:`;

  if (error instanceof Error) {
    console.error(`${baseMessage} ${error.message}`);
  } else {
    console.error(`${baseMessage} Unknown error`, error);
  }
}
