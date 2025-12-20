'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { SidebarLeft } from '../../_components/sidebar/sidebar-left';
import { MessageInput } from '../../_components/thread/chat-input/message-input';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

export default function WelcomePage() {
  const supabase = createClient();
  const router = useRouter();

  /* -----------------------------------------------------------
     🔐 AUTH STATE — MUST BE FIRST HOOKS
  ------------------------------------------------------------ */
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      if (!user) {
        router.replace('/login');
        return;
      }

      setAllowed(true);
      setCheckingAuth(false);
    };

    verify();
  }, [supabase, router]);

  /* -----------------------------------------------------------
     📝 INPUT STATE — Hook order MUST stay stable
  ------------------------------------------------------------ */
  const [loading, setLoading] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /* -----------------------------------------------------------
     📨 Handle first message (BACKEND ONLY)
  ------------------------------------------------------------ */
  const handleLocalSubmit = async (
    message?: string,
    attachedFiles: any[] = []
  ) => {
    const trimmed = (message || localInput).trim();
    if (!trimmed || loading) return;

    setLoading(true);

    try {
      // 1️⃣ Create thread via backend
      const res = await apiFetch('/api/thread', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Conversation',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Thread creation failed: ${errText}`);
      }

      const data = await res.json();
      const threadId: string | undefined = data?.thread_id;

      if (!threadId) {
        throw new Error('Backend did not return thread_id');
      }

      // 2️⃣ Store first message & attachments for dashboard pickup
      sessionStorage.setItem('kinber:firstMessage', trimmed);

      const filesToStore =
        attachedFiles.length > 0 ? attachedFiles : attachments;

      if (filesToStore.length > 0) {
        sessionStorage.setItem(
          'kinber:firstAttachments',
          JSON.stringify(filesToStore)
        );
      } else {
        sessionStorage.removeItem('kinber:firstAttachments');
      }

      // 3️⃣ Navigate to dashboard
      router.push(`/dashboard?thread_id=${threadId}`);
    } catch (err) {
      console.error('❌ Welcome submit failed:', err);
      alert('Sorry, I couldn’t process that request.');
    } finally {
      setLoading(false);
      setLocalInput('');
      setAttachments([]);
    }
  };

  /* -----------------------------------------------------------
     🌀 UI OUTPUT (Returns come LAST)
  ------------------------------------------------------------ */

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#161616] text-gray-100">
        <div className="animate-spin h-10 w-10 border-b-2 border-white rounded-full" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="flex h-screen w-full bg-[#252525] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex">
        <SidebarLeft />
      </div>

      {/* Main Area */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <motion.div
          className="flex flex-col items-center justify-center text-center w-full max-w-[750px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="text-4xl font-semibold mb-2">Welcome!</h1>
          <p className="text-lg text-gray-300 mb-8">
            How can I help you today?
          </p>

          <MessageInput
            ref={inputRef}
            value={localInput}
            onChange={(e) =>
              setLocalInput((e.target as HTMLTextAreaElement).value)
            }
            onSubmit={(msg, files) =>
              handleLocalSubmit(msg, files || [])
            }
            onTranscription={(text) => setLocalInput(text)}
            placeholder="Describe what you need help with..."
            loading={loading}
            disabled={loading}
            isAgentRunning={false}
            onAttachmentsChange={(files) => {
              // avoid state update during render
              Promise.resolve().then(() => setAttachments(files));
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
