'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

import { MessageInput } from '../../../_components/thread/chat-input/message-input';
import { createThreadInSupabase } from '@/lib/supabase/create-thread';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

/* ---------------------------------------------------------
   TOOL JSON EXTRACTOR
--------------------------------------------------------- */
function extractToolJson(text: string): string | null {
  if (!text) return null;
  const regex = /\{[\s\S]*?"tool"\s*:\s*".+?"[\s\S]*?\}/g;
  const matches = text.match(regex);
  return matches?.[0] || null;
}

/* ---------------------------------------------------------
   MARKDOWN RENDERER
--------------------------------------------------------- */
function RenderMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight, rehypeRaw]}
      components={{
        a: ({ href, children, ...props }) => {
          const url = href || '#';
          const shortened = url.length > 50 ? url.slice(0, 45) + '…' : url;

          const isYouTube =
            url.includes('youtube.com') || url.includes('youtu.be');
          const isTikTok = url.includes('tiktok.com');

          const youtubeIcon = (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="red"
              style={{ marginRight: '4px' }}
            >
              <path d="M23.5 6.2s-.2-1.7-.8-2.4c-.8-.9-1.6-.9-2-1C17.3 2.5 12 2.5 12 2.5h-.1s-5.3 0-8.7.3c-.4.1-1.2.1-2 1C.7 4.5.5 6.2.5 6.2S0 8.2 0 10.2v1.6c0 2 .5 4 .5 4s.2 1.7.8 2.4c.8.9 1.9.9 2.4 1 1.8.2 7.6.3 7.6.3s5.3 0 8.7-.3c.4-.1 1.2-.1 2-1 .6-.7.8-2.4.8-2.4s.5-2 .5-4v-1.6c0-2-.5-4-.5-4zM9.8 14.7V8.3l6.4 3.2-6.4 3.2z" />
            </svg>
          );

          const tiktokIcon = (
            <svg
              width="16"
              height="16"
              viewBox="0 0 48 48"
              fill="#fff"
              style={{ marginRight: '4px' }}
            >
              <path d="M41 14.4c-2.6.2-5.1-.6-7.2-2.3-1.6-1.3-2.7-3-3.1-5H27v23c-.1 2.9-2.6 5.3-5.5 5.2-2.9-.1-5.3-2.6-5.2-5.5.1-2.9 2.6-5.3 5.5-5.2 1 0 2 .4 2.8 1V18c-.9-.1-1.8-.1-2.7 0C14.8 18.3 10 23.5 10 30c0 6.9 5.6 12.5 12.5 12.5S35 36.9 35 30V19.8c2.4 1.7 5.4 2.5 8.3 2.3v-7.7z" />
            </svg>
          );

          const icon = isYouTube
            ? youtubeIcon
            : isTikTok
            ? tiktokIcon
            : '🔗 ';

          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#8f7f70',
                fontSize: '13px',
                textDecoration: 'underline',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                maxWidth: '480px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              {...props}
            >
              {icon}
              <span>{shortened}</span>
            </a>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */
type UIAttachment = {
  name: string;
  url: string;
  base64?: string | null;
  type?: string;
  size?: number;
};

type UIMessage = {
  role: 'user' | 'assistant';
  content: string;
  isUser: boolean;
  noBubble?: boolean;
  attachments?: UIAttachment[];
};

/* ---------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------- */
function DashboardContent({ threadId }: { threadId?: string }) {
  /* ---------- State ---------- */
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [initiatedThreadId, setInitiatedThreadId] = useState<string | null>(
    null
  );
  const [attachedFiles, setAttachedFiles] = useState<UIAttachment[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  /* ---------- Refs ---------- */
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasOptimisticRef = useRef(false);

  const firstMsgRef = useRef<string | null>(null);
  const isSubmittingFirstMsg = useRef(false);
  const hasScrolledToFirstMsg = useRef(false);

  /* ---------- Backend Base ---------- */
  const backendBase = useMemo(() => {
    const envUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();
    const resolved =
      envUrl ||
      (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:8000'
        : 'https://api.kinber.com');
    return resolved.replace(/\/+$/, '');
  }, []);

  /* ---------------------------------------------------------
     HELPER: Scroll to bottom
  --------------------------------------------------------- */
  const scrollToBottom = useCallback(() => {
    setTimeout(
      () =>
        bottomRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        }),
      120
    );
  }, []);

  /* ---------------------------------------------------------
     MAIN SUBMIT
  --------------------------------------------------------- */
  const handleSubmit = useCallback(
    async (
      message: string,
      attachments: UIAttachment[] = [],
      skipEcho = false
    ) => {
      try {
        const trimmed = message?.trim();
        if (!trimmed) return;

        setIsSubmitting(true);
        setIsGenerating(true);
        hasOptimisticRef.current = true;

        const combinedAttachments =
          attachments.length > 0 ? attachments : attachedFiles;

        // Echo user's message to UI
        if (!skipEcho) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'user',
              content: trimmed,
              isUser: true,
              attachments: combinedAttachments,
            },
          ]);
        }

        // Reset attachments
        setAttachedFiles([]);
        window.dispatchEvent(new CustomEvent('attachments:cleared'));

        setInputValue('');
        chatInputRef.current?.focus?.();
        scrollToBottom();

        // Ensure thread exists
        let newThreadId = initiatedThreadId || threadId || null;
        if (!newThreadId) {
          const threadRes = await createThreadInSupabase('New Conversation');
          newThreadId = threadRes?.thread_id || null;
          setInitiatedThreadId(newThreadId);
          window.history.replaceState(
            {},
            '',
            `/dashboard?thread_id=${newThreadId}`
          );
        }

        // Build backend payload
        const payload = {
          message: trimmed,
          model_name: 'gemini-2.0-flash-exp',
          agent: 'default', // ← Always default
          attachments: combinedAttachments.map((att) => ({
            name: att.name,
            url: att.url,
            type: att.type,
            size: att.size,
            base64: att.base64,
          })),
        };

        const res = await fetch(
          `${backendBase}/api/thread/${newThreadId}/agent/start`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        let aiReply = '';
        if (res.ok) {
          const data = await res.json();
          aiReply =
            data?.data?.assistant_reply ||
            data?.assistant_reply ||
            data?.message ||
            data?.response ||
            '';
        }

        /* ---------------------------------------
           TOOL-CALL HANDLING
        --------------------------------------- */
        let finalReply = aiReply;
        let toolCall: any = null;

        // Try direct parse
        try {
          const parsed = JSON.parse(aiReply);
          if (parsed?.tool) toolCall = parsed;
        } catch {}

        // Try extractor fallback
        if (!toolCall) {
          const extracted = extractToolJson(aiReply);
          if (extracted) {
            try {
              const parsed = JSON.parse(extracted);
              if (parsed?.tool) toolCall = parsed;
            } catch {}
          }
        }

        if (toolCall) {
          let toolResult: any = null;

          /* ----------- 1) Web Search Tool ----------- */
          if (toolCall.tool === 'websearch') {
            try {
              const sRes = await fetch(`${backendBase}/api/actions/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: toolCall.query,
                  max_results: toolCall.max_results || 10,
                }),
              });
              const json = await sRes.json();
              toolResult = json?.data || json;
            } catch (err) {
              toolResult = { error: String(err) };
            }
          }

          /* ----------- 2) YouTube Tool ----------- */
          if (
            toolCall.tool === 'youtube_search' ||
            toolCall.tool === 'youtube'
          ) {
            try {
              const yRes = await fetch(`${backendBase}/api/actions/youtube`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: toolCall.query,
                  max_results: toolCall.max_results || 5,
                }),
              });

              const json = await yRes.json();
              const raw = json?.data;

              toolResult =
                raw?.results?.results ||
                raw?.results ||
                raw ||
                json;
            } catch (err) {
              toolResult = { error: String(err) };
            }
          }

          /* ----------- Send tool result back ----------- */
          try {
            const second = await fetch(
              `${backendBase}/api/thread/${newThreadId}/agent/start`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: JSON.stringify({
                    tool: toolCall.tool,
                    tool_result: toolResult,
                  }),
                  agent: 'default',
                }),
              }
            );

            const j2 = await second.json();

            finalReply =
              j2?.data?.assistant_reply ||
              j2?.assistant_reply ||
              j2?.message ||
              finalReply;
          } catch {}
        }

        // Fallback text
        aiReply = finalReply || aiReply || 'No response.';

        // Render assistant message
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: aiReply,
            isUser: false,
            noBubble: true,
          },
        ]);

        hasOptimisticRef.current = false;
        scrollToBottom();
      } catch (err) {
        console.error('❌ Submit error:', err);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I couldn’t process that request.',
            isUser: false,
            noBubble: true,
          },
        ]);
      } finally {
        setIsSubmitting(false);
        setIsGenerating(false);
      }
    },
    [backendBase, threadId, initiatedThreadId, attachedFiles, scrollToBottom]
  );

  /* ---------------------------------------------------------
     EFFECTS
  --------------------------------------------------------- */

  // Attach file listener
  useEffect(() => {
    const handler = (e: any) =>
      setAttachedFiles((prev) => [...prev, e.detail]);
    window.addEventListener('file:attached', handler);
    return () => window.removeEventListener('file:attached', handler);
  }, []);

  // Scroll button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handle = () => {
      const dist =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;
      setShowScrollButton(dist > 200);
    };
    container.addEventListener('scroll', handle);
    handle();
    return () => container.removeEventListener('scroll', handle);
  }, []);

  // Load thread messages
  useEffect(() => {
    const loadMessages = async () => {
      const tid =
        initiatedThreadId ||
        threadId ||
        new URLSearchParams(window.location.search).get('thread_id');

      if (!tid) return;

      // Skip non-UUID inputs
      const uuid =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuid.test(tid)) return;

      // Skip while first-message is being replayed
      if (firstMsgRef.current || isSubmittingFirstMsg.current) return;

      try {
        const r = await fetch(`${backendBase}/api/thread/${tid}`);
        if (!r.ok) return;
        const json = await r.json();

        const msgs = json?.data?.messages || [];
        if (!Array.isArray(msgs)) return;

        setMessages(
          msgs.map((m: any) => ({
            role: m.role,
            content: m.content,
            isUser: m.role === 'user',
            noBubble: m.role === 'assistant',
            attachments: m.attachments || [],
          }))
        );

        setTimeout(scrollToBottom, 100);
      } catch {}
    };

    loadMessages();
  }, [
    backendBase,
    threadId,
    initiatedThreadId,
    scrollToBottom,
    isSubmittingFirstMsg,
  ]);

  // Welcome page → bring first message
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cachedMsg = sessionStorage.getItem('kinber:firstMessage');
    const cachedAttachments =
      sessionStorage.getItem('kinber:firstAttachments');

    if (cachedMsg) {
      firstMsgRef.current = cachedMsg;
      const attachments = cachedAttachments
        ? JSON.parse(cachedAttachments)
        : [];
      setMessages([
        {
          role: 'user',
          content: cachedMsg,
          isUser: true,
          attachments,
        },
      ]);
    }
  }, []);

  // Auto scroll after first
  useEffect(() => {
    if (
      messages.length === 1 &&
      firstMsgRef.current &&
      !hasScrolledToFirstMsg.current
    ) {
      hasScrolledToFirstMsg.current = true;
      setTimeout(() => {
        const container = chatContainerRef.current;
        container?.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [messages]);

  // Submit cached first message
  useEffect(() => {
    const tid =
      initiatedThreadId ||
      threadId ||
      new URLSearchParams(window.location.search).get('thread_id');

    if (!firstMsgRef.current || !tid || isSubmittingFirstMsg.current)
      return;

    isSubmittingFirstMsg.current = true;
    const msg = firstMsgRef.current;

    (async () => {
      await new Promise((r) => setTimeout(r, 200));

      const attachmentsRaw = sessionStorage.getItem(
        'kinber:firstAttachments'
      );
      const attachments = attachmentsRaw
        ? JSON.parse(attachmentsRaw)
        : [];

      await handleSubmit(msg, attachments, true);

      firstMsgRef.current = null;
      isSubmittingFirstMsg.current = false;

      sessionStorage.removeItem('kinber:firstMessage');
      sessionStorage.removeItem('kinber:firstAttachments');
    })();
  }, [initiatedThreadId, threadId, handleSubmit]);

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <motion.div
      className="relative flex w-full text-gray-100 overflow-hidden hide-scrollbar"
      style={{
        height: '100vh',
        background: '#252424ff',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      {/* -------------------- CHAT MESSAGES -------------------- */}
      <div
        ref={chatContainerRef}
        className="hide-scrollbar transition-all duration-300"
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#252525ff',
          padding: '24px 24px 160px 24px',
          width: '100%',
        }}
      >
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: msg.isUser ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: 'flex',
                justifyContent: msg.isUser ? 'flex-end' : 'flex-start',
                marginBottom: 18,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '720px',
                  backgroundColor: msg.isUser
                    ? '#2e2c2bff'
                    : msg.noBubble
                    ? 'transparent'
                    : '#2b2a2aff',
                  color: '#fff',
                  padding: msg.noBubble ? '0' : '12px 16px',
                  borderRadius: msg.isUser
                    ? '16px 16px 4px 16px'
                    : msg.noBubble
                    ? '0'
                    : '16px 16px 16px 4px',
                  border: msg.noBubble
                    ? 'none'
                    : msg.isUser
                    ? '1px solid #3a3c3aff'
                    : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <RenderMarkdown text={msg.content} />

                {Array.isArray(msg.attachments) &&
                  msg.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.attachments.map((file, j) => {
                        const ext =
                          file.name.split('.').pop()?.toLowerCase() ||
                          'file';
                        const colorMap: Record<string, string> = {
                          pdf: '#EF4444',
                          doc: '#2563EB',
                          docx: '#2563EB',
                          xls: '#16A34A',
                          xlsx: '#16A34A',
                          xlsm: '#16A34A',
                          xlsb: '#16A34A',
                          csv: '#16A34A',
                          txt: '#6B7280',
                          png: '#dd36c6ff',
                          jpg: '#dd36c6ff',
                          jpeg: '#dd36c6ff',
                          gif: '#dd36c6ff',
                        };
                        const bg = colorMap[ext] || '#6B7280';

                        return (
                          <a
                            key={j}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-md border border-white/10 bg-[#1f1f1f] px-3 py-2 text-sm text-gray-200 hover:bg-[#2a2a2a] transition"
                          >
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm whitespace-nowrap"
                              style={{
                                backgroundColor: bg,
                                color: '#fff',
                              }}
                            >
                              {ext.toUpperCase()}
                            </span>
                            <span className="underline hover:text-white">
                              {file.name}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
              </div>
            </motion.div>
          ))}

          {isGenerating && (
            <motion.div
              key="thinking-spinner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '12px',
                marginTop: '4px',
              }}
            >
              <Image
              src="/spinner-blue.png"
              alt="Kinber thinking..."
              width={36}
              height={36}
              style={{
                animation: 'spin 1.2s linear infinite',
                filter: 'brightness(1.2)',
              }}
            />
           </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* -------------------- FOOTER INPUT -------------------- */}
      <footer
        style={{
          position: 'relative',
          bottom: 0,
          left: 0,
          width: '100%',
          backgroundColor: '#252525ff',
          padding: '12px 0 16px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderTop: '1px solid rgba(62,55,55,0.05)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '950px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 24px',
          }}
        >
          <MessageInput
            ref={chatInputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSubmit={(msg, atts) => handleSubmit(msg, atts || [])}
            placeholder="Describe what you need help with..."
            loading={isSubmitting}
            disabled={isGenerating}
            onAttachmentsChange={(files) => {
              Promise.resolve().then(() => setAttachedFiles(files));
            }}
            isAgentRunning={isGenerating}
            onTranscription={(text) => {
              setInputValue((prev) =>
                prev ? `${prev.trim()}\n${text}` : text
              );
            }}
          />
        </div>
      </footer>

      {/* -------------------- SCROLL-TO-BOTTOM BUTTON -------------------- */}
      {typeof window !== 'undefined' &&
        document.body &&
        ReactDOM.createPortal(
          <AnimatePresence>
            {!!messages.length && showScrollButton && (
              <motion.button
                key="scrollButton"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.25 }}
                onClick={scrollToBottom}
                whileHover={{ scale: 1.1 }}
                style={{
                  position: 'fixed',
                  bottom: '200px',
                  left: '56%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#252424ff',
                  color: 'white',
                  padding: '9px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  zIndex: 1000,
                }}
              >
                <ArrowDown style={{ width: '16px', height: '16px' }} />
              </motion.button>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
}

export default DashboardContent;
