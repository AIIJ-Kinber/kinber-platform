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
import { apiFetch } from '@/lib/api';

import { MessageInput } from '../../../_components/thread/chat-input/message-input';
import { createClient } from '@/lib/supabase/client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

/* ---------------------------------------------------------
   MARKDOWN RENDERER (Enhanced from Version B)
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
export default function DashboardContent({ threadId }: { threadId?: string }) {
  const supabase = createClient();

  /* ---------- State ---------- */
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [initiatedThreadId, setInitiatedThreadId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<UIAttachment[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  /* ---------- Refs ---------- */
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isSendingRef = useRef(false);

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
     Scroll helper
  --------------------------------------------------------- */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }, []);

  /* ---------------------------------------------------------
     MAIN SUBMIT (MERGED - AI responses from A + attachment handling from B)
  --------------------------------------------------------- */
  const handleSubmit = useCallback(
    async (message: string, attachments: UIAttachment[] = [], skipEcho = false) => {
      const trimmed = message.trim();
      if (!trimmed || isSendingRef.current) return;

      isSendingRef.current = true;
      setIsSubmitting(true);
      setIsGenerating(true);

      // 🔥 CRITICAL: Use attachments parameter if provided, otherwise use state
      const combinedAttachments =
        attachments.length > 0 ? attachments : attachedFiles;

      console.log('📎 SUBMIT - Combined attachments:', combinedAttachments);
      console.log('📎 SUBMIT - Detailed attachment structure:', 
        combinedAttachments.map((f, idx) => ({
          index: idx,
          name: f.name,
          url: f.url,
          type: f.type,
          size: f.size,
          hasBase64: !!f.base64,
          base64Length: f.base64?.length || 0,
          allKeys: Object.keys(f)
        }))
      );

      try {
        // Echo user message
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

        setInputValue('');
        scrollToBottom();

        // Ensure thread exists
        let activeThreadId: string | null = initiatedThreadId || threadId || null;

        if (!activeThreadId) {
          const { data } = await supabase.auth.getUser();
          const user = data?.user;

          const res = await apiFetch('/api/thread', {
            method: 'POST',
            body: JSON.stringify({
              title: 'New Conversation',
              user_id: user?.id ?? null,
            }),
          });

          const json = await res.json();

        const newThreadId =
          typeof json?.thread_id === 'string' ? json.thread_id : null;

        if (!newThreadId) {
          throw new Error('Invalid thread_id returned from backend');
        }

        activeThreadId = newThreadId;
        setInitiatedThreadId(newThreadId);

        window.history.replaceState(
          {},
          '',
          `/dashboard?thread_id=${newThreadId}`
        );

        // 🔥 Build payload with attachments
        const payload = {
          message: trimmed,
          model_name: 'gemini-2.0-flash-exp',
          agent: 'default',
          attachments: combinedAttachments.map((f) => {
            // Extract base64 data (could be in 'base64' or 'data' field)
            let base64Data = f.base64 || (f as any).data || null;
            
            // If base64 exists but doesn't have data URI prefix, add it
            if (base64Data && !base64Data.startsWith('data:')) {
              base64Data = `data:${f.type || 'application/octet-stream'};base64,${base64Data}`;
            }
            
            return {
              name: f.name,
              url: f.url,
              type: f.type,
              size: f.size,
              base64: base64Data,
            };
          }),
        };

        console.log('🚀 Sending payload to backend:', payload);
        console.log('📦 Attachments in payload:', JSON.stringify(payload.attachments, null, 2));

        // Call backend
        const agentRes = await apiFetch(
          `/api/thread/${activeThreadId}/agent/start`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );

        let aiReply = 'No response.';
        if (agentRes.ok) {
          const data = await agentRes.json();
          aiReply =
            data?.assistant_reply ||
            data?.data?.assistant_reply ||
            data?.message ||
            aiReply;
        } else {
          console.error('❌ Backend error:', await agentRes.text());
        }

        // Add AI response
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: aiReply,
            isUser: false,
            noBubble: true,
          },
        ]);

        // ✅ CLEAR ATTACHMENTS ONLY AFTER SUCCESSFUL SEND
        setAttachedFiles([]);
        
        // ✅ Dispatch clear event for MessageInput component
        window.dispatchEvent(new CustomEvent('attachments:cleared'));
        
        scrollToBottom();
      } catch (err) {
        console.error('❌ Submit error:', err);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I could not process that request.',
            isUser: false,
            noBubble: true,
          },
        ]);
      } finally {
        setIsSubmitting(false);
        setIsGenerating(false);
        isSendingRef.current = false;
      }
    },
    [supabase, threadId, initiatedThreadId, attachedFiles, scrollToBottom]
  );

  /* ---------------------------------------------------------
     Load messages for thread
  --------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      const tid = threadId || initiatedThreadId;
      if (!tid) return;

      const res = await fetch(`${backendBase}/api/thread/${tid}`);
      if (!res.ok) return;

      const json = await res.json();
      const msgs = json?.messages || [];

      setMessages(
        msgs.map((m: any) => ({
          role: m.role,
          content: m.content,
          isUser: m.role === 'user',
          noBubble: m.role === 'assistant',
          attachments: m.attachments || [],
        }))
      );

      scrollToBottom();
    };

    load();
  }, [backendBase, threadId, initiatedThreadId, scrollToBottom]);

  /* ---------------------------------------------------------
     Scroll button visibility
  --------------------------------------------------------- */
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollButton(dist > 200);
    };

    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  /* ---------------------------------------------------------
     RENDER (Enhanced UI from Version B)
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

                {/* 🔥 Attachment display from Version B */}
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

          {/* Loading spinner from Version B */}
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
            onTranscription={(text) => {
              setInputValue((prev) =>
                prev ? `${prev.trim()}\n${text}` : text
              );
            }}
            placeholder="Describe what you need help with..."
            loading={isSubmitting}
            disabled={isGenerating}
            isAgentRunning={isGenerating}
            onAttachmentsChange={(files) => {
              console.log('📎 Dashboard received attachments:', files);

              // 🔥 CRITICAL: Ignore empty updates during send
              if (
                isSendingRef.current &&
                (!files || files.length === 0)
              ) {
                console.log('🛡️ Ignored empty attachments update during send');
                return;
              }

              // ✅ Defer state update to avoid setState during render
              Promise.resolve().then(() => {
                setAttachedFiles(files || []);
              });
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
