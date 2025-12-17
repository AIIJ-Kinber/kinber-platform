'use client';
export const dynamic = "force-dynamic";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SidebarLeft } from '../../_components/sidebar/sidebar-left';
import { MessageInput } from '../../_components/thread/chat-input/message-input';
import { createThreadInSupabase } from '../../lib/supabase/create-thread';
import { createClient } from '@/lib/supabase/client';

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
     📝 INPUT STATE — Hooks must remain in same order
  ------------------------------------------------------------ */
  const [loading, setLoading] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /* -----------------------------------------------------------
     📨 Handle first message
  ------------------------------------------------------------ */
  const handleLocalSubmit = async (message?: string, attachedFiles: any[] = []) => {
    const trimmed = (message || localInput).trim();
    if (!trimmed || loading) return;

    setLoading(true);

    try {
      const threadRes = await createThreadInSupabase('New Conversation');
      const threadId = threadRes?.thread_id;

      if (threadId) {
        sessionStorage.setItem('kinber:firstMessage', trimmed);

        const toStore = attachedFiles?.length ? attachedFiles : attachments;
        if (toStore?.length > 0) {
          sessionStorage.setItem('kinber:firstAttachments', JSON.stringify(toStore));
        } else {
          sessionStorage.removeItem('kinber:firstAttachments');
        }

        router.push(`/dashboard?thread_id=${threadId}`);
      }
    } catch (err) {
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
      setLocalInput('');
      setAttachments([]);
    }
  };

  /* -----------------------------------------------------------
     🌀 UI OUTPUT (Returns come LAST)
  ------------------------------------------------------------ */

  // Still checking session
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#161616] text-gray-100">
        <div className="animate-spin h-10 w-10 border-b-2 border-white rounded-full" />
      </div>
    );
  }

  // Auth failed (redirect already triggered)
  if (!allowed) return null;

  return (
    <div className="flex h-screen w-full bg-[#252525] text-gray-100 overflow-hidden">
      {/* Sidebar appears only for authed users */}
      <div className="hidden md:flex">
        <SidebarLeft />
      </div>

      {/* Main Centered Area */}
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
            onTranscription={(text) =>
              setLocalInput(text)
            }
            placeholder="Describe what you need help with..."
            loading={loading}
            disabled={loading}
            isAgentRunning={false}
            onAttachmentsChange={(files) => {
              // Fix React error: cannot update parent during render of child
              Promise.resolve().then(() => setAttachments(files));
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

