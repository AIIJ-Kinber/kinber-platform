'use client';

import NextError from 'next/error';
import { useEffect } from 'react';

/**
 * Sentry lazy loader (client + server safe)
 * - No require()
 * - No dynamic runtime branching
 * - Avoids bundling server Sentry in client
 */
async function loadSentry() {
  if (typeof window === 'undefined') {
    // Server runtime
    const mod = await import('@sentry/node');
    return mod;
  } else {
    // Client runtime
    const mod = await import('@sentry/browser');
    return mod;
  }
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    (async () => {
      try {
        const Sentry = await loadSentry();
        Sentry?.captureException?.(error);
      } catch (err) {
        console.warn('⚠️ Failed to report error to Sentry:', err);
      }
    })();
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
