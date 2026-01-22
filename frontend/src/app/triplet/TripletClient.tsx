'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import MessageInput from '@/_components/thread/chat-input/message-input';

const TRIPLET_API_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/triplet`;

export default function TripletClient() {
  const router = useRouter();
  const supabase = createClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);

  // 🔑 SESSION-ONLY DOCUMENT MEMORY
  const [documentContext, setDocumentContext] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    }
  };

  // --------------------------------------------------
  // Submit Triplet request (document-aware)
  // --------------------------------------------------
  const handleSubmit = async (text: string) => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setPrompt(text);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      if (!session || !user) {
        router.push('/login');
        return;
      }

      const res = await fetch(TRIPLET_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-User-ID': user.id,
        },
        body: JSON.stringify({
          prompt: text,

          // 🔑 Send attachments ONLY on first request
          attachments: documentContext ? [] : attachments,

          // 🔑 Reuse extracted document for follow-ups
          document_context: documentContext,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();

      // 🔑 Store document context ONCE (session memory)
      if (!documentContext && data.document_context) {
        setDocumentContext(data.document_context);
      }

      setResults({
        gpt: data.openai || data.gpt || 'No response',
        claude: data.claude || 'No response',
        deepseek: data.deepseek || 'No response',
        verdict: data.verdict || 'Analyzing responses...',
      });

    } catch (err) {
      console.error('❌ Triplet error:', err);
      alert('Triplet failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (logo: string, content?: string) => (
    <div className="flex flex-col gap-4 rounded-2xl bg-[#1f1f1f] border border-neutral-700 p-6 min-h-[260px]">
      <div className="h-8 flex items-center">
        <Image src={logo} alt="logo" width={120} height={32} />
      </div>
      {loading && !content ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
        </div>
      ) : (
        <p className="text-gray-100 text-[18px] leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col w-full">
      {/* RESULTS */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 mt-6 mb-10">
        {renderCard('/chatgpt_logo.png', results?.gpt)}
        {renderCard('/claude_logo.png', results?.claude)}
        {renderCard('/deepseek_logo.png', results?.deepseek)}
      </div>

      {/* VERDICT */}
      <div className="w-full mb-8">
        <div className="rounded-2xl bg-[#1b1b1b] border border-neutral-700 p-6">
          <div className="h-8 mb-4 flex items-center">
            <Image
              src="/final_verdict.png"
              alt="Final Verdict"
              width={160}
              height={32}
            />
          </div>
          <div className="text-white text-[18px] leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2">
            {results?.verdict}
          </div>
        </div>
      </div>

      {/* INPUT */}
      <div className="w-full mb-6 flex justify-center">
        <MessageInput
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onSubmit={(msg) => handleSubmit(msg)}
          onTranscription={() => {}}
          onAttachmentsChange={setAttachments}
          placeholder="Ask Triplet AI…"
          loading={loading}
          disabled={loading}          // ✅ REQUIRED
          isAgentRunning={loading}    // ✅ REQUIRED
          isLoggedIn
        />
      </div>
    </div>
  );
}
