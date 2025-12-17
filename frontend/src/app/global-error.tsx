'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center bg-[#0b0b0c] text-gray-100 p-6">
        <h1 className="text-2xl font-bold mb-4">
          Something went wrong
        </h1>

        <p className="text-sm opacity-80 mb-6">
          An unexpected error occurred. Please try again.
        </p>

        <button
          onClick={reset}
          className="px-4 py-2 rounded bg-white text-black hover:opacity-90"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
