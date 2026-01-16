// src\app\dashboard\_components\dashboard-content.tsx

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
   MARKDOWN RENDERER (Claude-style Typography)
--------------------------------------------------------- */
function RenderMarkdown({ text }: { text: string }) {
  return (
    <div
      className="prose chat-markdown"
      style={{
        fontSize: '16px',
        lineHeight: '1.6',
        letterSpacing: '0.01em',
        fontFamily: 'Charter, Georgia, Cambria, "Times New Roman", serif',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          p: ({ children }) => (
            <p style={{ marginTop: '0.75em', marginBottom: '0.75em' }}>
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 style={{ fontSize: '24px', fontWeight: 600, marginTop: '1.2em', marginBottom: '0.6em', lineHeight: '1.4' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginTop: '1.2em', marginBottom: '0.6em', lineHeight: '1.4' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginTop: '1.2em', marginBottom: '0.6em', lineHeight: '1.4' }}>
              {children}
            </h3>
          ),
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
                  color: '#60a5fa',
                  fontSize: '16px',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
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
          code: ({ inline, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  style={{
                    backgroundColor: '#1f1f1f',
                    color: '#e5e7eb',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <code {...props}>{children}</code>;
          },
          pre: ({ children }) => (
            <pre
              style={{
                backgroundColor: '#1f1f1f',
                padding: '1em 1.2em',
                borderRadius: '6px',
                overflowX: 'auto',
                fontSize: '14px',
                lineHeight: '1.5',
                marginTop: '0.75em',
                marginBottom: '0.75em',
              }}
            >
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: '1.5em', marginTop: '0.75em', marginBottom: '0.75em' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: '1.5em', marginTop: '0.75em', marginBottom: '0.75em' }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ marginTop: '0.25em', marginBottom: '0.25em' }}>
              {children}
            </li>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
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
  const hasSubmittedWelcomeRef = useRef(false);


  /* ---------- Refs ---------- */
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isSendingRef = useRef(false);

/* ---------- Backend Base ---------- */
const backendBase = useMemo(() => {
  const envUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      return 'http://127.0.0.1:8000';
    }
  }

  // ✅ Production: SAME ORIGIN (Vercel proxy → Railway)
  return '/api';
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
    async (
      message: string,
      attachments: UIAttachment[] = [],
      skipEcho = false
    ) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      // 🔒 Guard against duplicate execution
      if (isSendingRef.current || isGenerating) return;
      isSendingRef.current = true;
      setIsSubmitting(true);
      setIsGenerating(true);

      // ✅ CHECK SESSION FIRST - CRITICAL!
      console.log("🔐 Checking authentication...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("❌ Session error:", sessionError);
        alert("Authentication error. Please refresh and try again.");
        isSendingRef.current = false;
        setIsSubmitting(false);
        setIsGenerating(false);
        return;
      }

      if (!session) {
        console.error("❌ No session found");
        alert("You must be logged in. Redirecting to login...");
        window.location.href = "/login";
        return;
      }

      console.log("✅ Session verified:", {
        userId: session.user?.id,
        hasToken: !!session.access_token,
        tokenPreview: session.access_token?.substring(0, 20) + "..."
      });

      // ... rest of the combined attachments logic ...
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
        // ✅ Get user
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user?.id) {
          console.error("❌ No user found - redirecting to login");
          window.location.href = "/login";
          isSendingRef.current = false;
          setIsSubmitting(false);
          setIsGenerating(false);
          return;
        }

        console.log("🧵 Creating new thread for user:", user.id);

        // ✅ Direct fetch with explicit headers
        const res = await fetch(`${backendBase}/api/threads/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.id,
          },
          body: JSON.stringify({
            title: 'New Conversation',
            user_id: user.id,
          }),
        });

        console.log("📥 Create thread response:", res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Thread creation failed:", res.status, errorText);
          throw new Error(`Failed to create thread: ${res.status} - ${errorText}`);
        }

        const json = await res.json();
        console.log("✅ Thread created successfully:", json);

        const newThreadId = typeof json?.thread_id === 'string' ? json.thread_id : null;
        if (!newThreadId) {
          console.error("❌ Invalid response from backend:", json);
          throw new Error('Invalid thread_id returned from backend');
        }

        activeThreadId = newThreadId;
        setInitiatedThreadId(newThreadId);

        window.history.replaceState(
          {},
          '',
          `/dashboard?thread_id=${newThreadId}`
        );

        console.log("✅ Thread ID set:", newThreadId);
      }

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

        // ✅ Get user for header
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user?.id) {
          console.error("❌ No user ID!");
          throw new Error("Authentication required");
        }

        // ✅ DIRECT FETCH - Bypass apiFetch
        const agentRes = await fetch(
          `${backendBase}/api/threads/${activeThreadId}/agent/start`,
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': user.id, // ✅ Direct header
            },
            body: JSON.stringify(payload),
          }
        );

        console.log("📥 Agent response:", agentRes.status);

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
   Auto-submit first message from Welcome page
--------------------------------------------------------- */
useEffect(() => {
  if (hasSubmittedWelcomeRef.current) return;

  const firstMessage = sessionStorage.getItem('kinber:firstMessage');
  if (!firstMessage) return;

  const attachmentsRaw =
    sessionStorage.getItem('kinber:firstAttachments');

  const attachments = attachmentsRaw
    ? JSON.parse(attachmentsRaw)
    : [];

  hasSubmittedWelcomeRef.current = true;

  // Clean immediately to prevent loops
  sessionStorage.removeItem('kinber:firstMessage');
  sessionStorage.removeItem('kinber:firstAttachments');

  // 1️⃣ IMMEDIATELY render user message (THIS WAS MISSING)
  setMessages((prev) => [
    ...prev,
    {
      role: 'user',
      content: firstMessage,
      isUser: true,
      attachments,
    },
  ]);

  // 2️⃣ Small delay so UI paints before agent starts
  setTimeout(() => {
    handleSubmit(firstMessage, attachments, true); // skipEcho = true
  }, 150);
}, [handleSubmit]);

  /* ---------------------------------------------------------
     Load messages for thread
  --------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      const tid = threadId || initiatedThreadId;
      if (!tid) return;

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user?.id) {
        console.error("❌ No user ID!");
        return;
      }

      const res = await fetch(`${backendBase}/api/threads/${tid}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
      });
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
