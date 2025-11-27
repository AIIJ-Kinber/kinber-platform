'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import ChatInput from '@/_components/thread/chat-input/chat-input';
import { AgentSelector } from '@/_components/thread/chat-input/agent-selector';
import { ChevronUp, Mic, Plus, Settings2 } from 'lucide-react';

type NewChatContentProps = {
  threadId: string | null;
  isCreatingThread?: boolean;
  onThreadReady?: (threadId: string) => void;
};

const toolPills = [
  { key: 'image', label: 'Image', color: 'from-pink-500/30 to-pink-600/30' },
  { key: 'slides', label: 'Slides', color: 'from-indigo-500/30 to-indigo-600/30' },
  { key: 'research', label: 'Research', color: 'from-blue-500/30 to-blue-600/30' },
  { key: 'data', label: 'Data', color: 'from-emerald-500/30 to-emerald-600/30' },
  { key: 'travel', label: 'Travel', color: 'from-teal-500/30 to-teal-600/30' },
  { key: 'more', label: 'More', color: 'from-neutral-500/30 to-neutral-600/30' },
];

const suggestions = [
  'Summarize this PDF',
  'Draft a business email',
  'Research market trends in KSA',
  'Plan a 3-day Jeddah trip',
  'Analyze this CSV for anomalies',
];

export default function NewChatContent({
  threadId,
  isCreatingThread = false,
  onThreadReady,
}: NewChatContentProps) {
  const [draft, setDraft] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);

  const disabled = isCreatingThread || sending;

  const handlePickSuggestion = useCallback(
    async (text: string) => {
      if (disabled) return;
      setDraft(text);
      inputWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Auto-send after prefill
      setTimeout(() => onThreadReady?.(threadId ?? ''), 400);
    },
    [disabled, onThreadReady, threadId]
  );

  const chatInputProps = useMemo(
    () => ({
      initialValue: draft,
      threadId,
      onFirstSend: (id: string) => onThreadReady?.(id ?? threadId ?? ''),
    }),
    [draft, threadId, onThreadReady]
  );

  return (
    <div className="h-full w-full overflow-auto">
      <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
        <div className="h-[12vh]" />

        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center text-2xl md:text-3xl lg:text-4xl font-medium text-neutral-200"
        >
          Hi! How can I help you today..
        </motion.h1>

        {/* Input panel */}
        <motion.div
          ref={inputWrapperRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mt-10 relative"
        >
          {/* Frosted glass input bar */}
          <div
            className={cn(
              'rounded-full md:rounded-[28px] border border-white/10 bg-white/10',
              'backdrop-blur-xl shadow-lg transition-all duration-200',
              'hover:border-blue-400/50 focus-within:border-blue-500/70 hover:shadow-[0_0_12px_rgba(56,189,248,0.25)]',
              'px-6 md:px-8 py-4 md:py-5',
              disabled ? 'opacity-60 pointer-events-none' : ''
            )}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
                aria-label="Add"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tools</span>
              </button>

              {/* Expanded text area — horizontally larger, vertically compact */}
              <input
                type="text"
                placeholder="Describe what you need help with..."
                className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-400 text-base outline-none px-3 py-1 min-h-[40px]"
              />
              <AgentSelector
                selectedAgentId={selectedAgentId}
                onAgentSelect={setSelectedAgentId}
                disabled={disabled}
              />

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full p-2 hover:bg-white/10"
                aria-label="Voice"
              >
                <Mic className="h-5 w-5" />
              </button>

              <button
                type="button"
                className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:opacity-90"
                aria-label="Send"
              >
                <ChevronUp className="h-5 w-5 -rotate-90" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Themed tool bubbles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          {toolPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              className={cn(
                'rounded-full px-4 py-2 text-sm text-white font-medium transition-all duration-200',
                'bg-gradient-to-r hover:brightness-125 hover:scale-105 hover:shadow-lg',
                pill.color
              )}
            >
              {pill.label}
            </button>
          ))}
        </motion.div>

        {/* Suggestion bubbles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handlePickSuggestion(s)}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-neutral-200 hover:bg-white/10 transition"
            >
              {s}
            </button>
          ))}
        </motion.div>

        <div className="h-[20vh]" />
      </div>
    </div>
  );
}
