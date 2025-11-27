'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SidebarLeft } from '../../_components/sidebar/sidebar-left';
import { MessageInput } from '../../_components/thread/chat-input/message-input';
import { createThreadInSupabase } from '../../lib/supabase/create-thread';

/**
 * 🌟 Welcome Page (Dashboard-style)
 * - Uses MessageInput for consistent design
 * - Centers the input panel vertically
 * - Creates thread + caches message + attachments
 * - Redirects to Dashboard seamlessly
 */

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // ✅ Handles the very first user message + attachments
  const handleLocalSubmit = async (message?: string, attachedFiles: any[] = []) => {
    const trimmed = (message || localInput).trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      const threadRes = await createThreadInSupabase('New Conversation');
      const threadId = threadRes?.thread_id;

      if (threadId) {
        // Cache first message
        sessionStorage.setItem('kinber:firstMessage', trimmed);

        // Cache attachments if present
        const toStore = attachedFiles?.length ? attachedFiles : attachments;
        if (toStore && toStore.length > 0) {
          sessionStorage.setItem('kinber:firstAttachments', JSON.stringify(toStore));
        } else {
          sessionStorage.removeItem('kinber:firstAttachments');
        }

        // Redirect to dashboard
        router.push(`/dashboard?thread_id=${threadId}`);
      } else {
        console.error('❌ No valid thread_id returned from backend.');
      }
    } catch (err) {
      console.error('❌ Error creating thread from Welcome Page:', err);
    } finally {
      setLoading(false);
      setLocalInput('');
      setAttachments([]);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#252525] text-gray-100 overflow-hidden">
      {/* Sidebar (same as Dashboard) */}
      <div className="hidden md:flex">
        <SidebarLeft />
      </div>

      {/* Main Centered Area */}
      <div className="flex flex-1 flex-col items-center justify-center relative px-6">
        <motion.div
          className="flex flex-col items-center justify-center text-center w-full max-w-[750px]"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* --- Header --- */}
          <div className="mb-8">
            <h1
              style={{
                color: '#E4E4E4',
                fontSize: '2.4rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              Welcome!
            </h1>
            <p
              style={{
                color: '#B0B0B0',
                fontSize: '1.3rem',
              }}
            >
              How can I help you today?
            </p>
          </div>

          {/* --- Centered MessageInput (same as Dashboard) --- */}
          <div className="w-full flex flex-col items-center">
            <MessageInput
              ref={inputRef}
              value={localInput}
              onChange={(e) => setLocalInput((e.target as HTMLTextAreaElement).value)}
              onSubmit={(msg: string, files?: any[]) => handleLocalSubmit(msg, files || [])}
              onTranscription={(text) => setLocalInput(text)}
              placeholder="Describe what you need help with..."
              loading={loading}
              disabled={loading}
              isAgentRunning={false}
              onAttachmentsChange={(files) => {
                console.log('📎 Welcome captured attachments:', files);
                Promise.resolve().then(() => setAttachments(files));
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
