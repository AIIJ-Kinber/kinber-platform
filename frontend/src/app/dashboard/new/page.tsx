'use client';

export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect } from 'react';
import { createThreadInSupabase } from '@/lib/supabase/create-thread';

export default function NewChatPage() {
  useEffect(() => {
    async function startNewChat() {
      const newThread = await createThreadInSupabase('New Conversation');

      if (newThread?.thread_id) {
        window.location.href = `/dashboard?thread_id=${newThread.thread_id}`;
      } else {
        console.error('❌ Failed to create new thread.');
      }
    }

    startNewChat();
  }, []);

  return (
    <div
      className="flex h-screen w-full items-center justify-center text-gray-300"
      style={{ background: '#1f1f1f' }}
    >
      Creating new chat…
    </div>
  );
}
