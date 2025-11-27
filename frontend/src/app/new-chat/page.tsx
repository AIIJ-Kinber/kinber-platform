'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import NewChatContent from '@/_components/dashboard/new-chat-content';

/**
 * KINBER — New Chat Page
 *
 * Purpose:
 * - Creates a fresh thread (via POST /api/thread)
 * - Displays unified layout with shimmer progress feedback
 * - Redirects to /dashboard once user sends the first message
 *
 * Backend reference: backend/routes/thread.py → @router.post("/api/thread")
 */
export default function NewChatPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // If URL already has ?thread=xyz, don't create a new one
  const existingThreadId = useMemo(() => search?.get('thread') || null, [search]);

  useEffect(() => {
    let cancelled = false;

    async function createThread() {
      if (creating || threadId || existingThreadId) return;
      setCreating(true);
      setCreationError(null);

      try {
        // ✅ Correct backend endpoint
        const res = await fetch('/api/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat' }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to create thread: ${res.status} ${text}`);
        }

        const data = await res.json();
        const newId =
          data?.data?.thread_id || data?.thread_id || data?.id || null;

        if (!cancelled && newId) {
          setThreadId(newId);
          console.log(`🧵 Created new thread: ${newId}`);
        } else if (!cancelled) {
          throw new Error('Thread ID missing in response');
        }
      } catch (err: any) {
        console.error('❌ Thread creation failed:', err);
        if (!cancelled) {
          setCreationError(err?.message || 'Error creating new chat');
          setThreadId(null);
        }
      } finally {
        if (!cancelled) setCreating(false);
      }
    }

    createThread();
    return () => {
      cancelled = true;
    };
  }, [creating, threadId, existingThreadId]);

  /**
   * After the first message, navigate to /dashboard and continue the chat.
   */
  const handleProceedToDashboard = (id: string) => {
    if (!id) return;
    router.push(`/dashboard?thread=${encodeURIComponent(id)}`);
  };

  return (
    <div className="relative h-full w-full">
      {/* ✅ Loading shimmer bar under the welcome text */}
      <AnimatePresence>
        {creating && (
          <motion.div
            key="creating-thread"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute top-24 left-1/2 z-20 w-1/2 max-w-sm -translate-x-1/2"
          >
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10 shimmer">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite_linear]" />
            </div>
            <div className="mt-2 text-center text-xs text-neutral-400">
              Preparing your new chat...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Pass state and thread to content layout */}
      <NewChatContent
        threadId={existingThreadId ?? threadId}
        isCreatingThread={creating}
        onThreadReady={handleProceedToDashboard}
      />

      {/* ⚠️ Error display (non-blocking) */}
      {creationError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-600/30 px-3 py-2 text-xs text-red-200">
          {creationError}
        </div>
      )}
    </div>
  );
}
