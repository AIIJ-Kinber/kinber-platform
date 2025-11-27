'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ChatInput, { ChatInputHandles } from '../../../_components/thread/chat-input/chat-input';

interface NewChatWelcomeProps {
  onSend: (message: string) => void;
  loading?: boolean;
  // ✨ Customizable props
  headingText?: string;
  subheadingText?: string;
  headingColor?: string;
  subheadingColor?: string;
  headingSize?: string;
  subheadingSize?: string;
}

export const NewChatWelcome: React.FC<NewChatWelcomeProps> = ({
  onSend,
  loading = false,

  // 🧭 Defaults (you can override these)
  headingText = 'Welcome!',
  subheadingText = 'How can I help you today?',
  headingColor = '#8b5858ff',
  subheadingColor = '#a1a1a1',
  headingSize = '2.2rem',
  subheadingSize = '2rem',
}) => {
  const [localInput, setLocalInput] = useState('');
  const inputRef = useRef<ChatInputHandles | null>(null);

  // 🧩 Local handler that waits briefly before triggering dashboard logic
  const handleLocalSubmit = async (message?: string) => {
    const trimmed = (message || localInput).trim();
    if (!trimmed || loading) return;

    // Small delay lets the dashboard mount & stabilize before thread creation
    setTimeout(() => {
      onSend(trimmed);
    }, 300);

    setLocalInput('');
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full w-full text-center space-y-8"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* --- Welcome Header --- */}
      <div>
        <h1
          style={{
            color: headingColor,
            fontSize: headingSize,
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          {headingText}
        </h1>
        <p
          style={{
            color: subheadingColor,
            fontSize: subheadingSize,
          }}
        >
          {subheadingText}
        </p>
      </div>

      {/* --- Centered Chat Input --- */}
      <div className="w-full max-w-[800px] flex flex-col items-center">
        <ChatInput
          ref={inputRef}
          value={localInput}
          onChange={setLocalInput}
          onSubmit={() => handleLocalSubmit()}
          placeholder="Describe what you need help with..."
          loading={loading}
          isCentered
          hideAttachments
        />
      </div>
    </motion.div>
  );
};
