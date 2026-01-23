
'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import MessageInput from '@/_components/thread/chat-input/message-input';

const TRIPLET_API_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/triplet/stream`; // ✅ Added /stream

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

  // ⚡ NEW: Track which models have responded
  const [completedModels, setCompletedModels] = useState<Set<string>>(new Set());

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
  // ⚡ STREAMING Submit Triplet request
  // --------------------------------------------------
  const handleSubmit = async (text: string) => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setPrompt(text);
    
    // Reset results and completed models
    setResults({
      gpt: null,
      claude: null,
      deepseek: null,
      verdict: null,
    });
    setCompletedModels(new Set());

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
          attachments: documentContext ? [] : attachments,
          document_context: documentContext,
          skip_ai_verdict: false, // Set to true for faster responses (~8s)
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      // ⚡ Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle model responses
              if (data.model === 'gpt') {
                setResults((prev: any) => ({
                  ...prev,
                  gpt: data.response,
                }));
                setCompletedModels((prev) => new Set(prev).add('gpt'));
                console.log('✅ GPT response received:', data.elapsed, 's');
              } else if (data.model === 'claude') {
                setResults((prev: any) => ({
                  ...prev,
                  claude: data.response,
                }));
                setCompletedModels((prev) => new Set(prev).add('claude'));
                console.log('✅ Claude response received:', data.elapsed, 's');
              } else if (data.model === 'deepseek') {
                setResults((prev: any) => ({
                  ...prev,
                  deepseek: data.response,
                }));
                setCompletedModels((prev) => new Set(prev).add('deepseek'));
                console.log('✅ DeepSeek response received:', data.elapsed, 's');
              } else if (data.model === 'verdict') {
                setResults((prev: any) => ({
                  ...prev,
                  verdict: data.response,
                }));
                console.log('✅ Verdict received');
              }

              // Handle document context
              if (data.document_context && !documentContext) {
                setDocumentContext(data.document_context);
              }

              // Handle completion
              if (data.done) {
                console.log('✅ Triplet streaming complete');
              }

              // Handle errors
              if (data.error) {
                console.error('❌ Stream error:', data.error);
              }
            } catch (parseError) {
              console.error('❌ Parse error:', parseError);
            }
          }
        }
      }

      // Clear attachments after first request
      if (attachments.length > 0) {
        setAttachments([]);
      }

    } catch (err) {
      console.error('❌ Triplet error:', err);
      alert('Triplet failed. Please try again.');
      
      // Reset results on error
      setResults({
        gpt: '❌ Error occurred',
        claude: '❌ Error occurred',
        deepseek: '❌ Error occurred',
        verdict: '❌ Error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // ⚡ Render card with loading state per model
  // --------------------------------------------------
  const renderCard = (logo: string, modelName: string, content?: string) => {
    const isLoading = loading && !completedModels.has(modelName);
    const hasContent = content !== null && content !== undefined;

    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-[#1f1f1f] border border-neutral-700 p-6 min-h-[260px]">
        <div className="h-8 flex items-center">
          <Image src={logo} alt="logo" width={120} height={32} />
        </div>
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
          </div>
        ) : hasContent ? (
          <p className="text-gray-100 text-[18px] leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        ) : (
          <p className="text-gray-500 text-[18px] leading-relaxed text-center flex-1 flex items-center justify-center">
            Waiting for response...
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full">
      {/* RESULTS - Show individual loading states */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 mt-6 mb-10">
        {renderCard('/chatgpt_logo.png', 'gpt', results?.gpt)}
        {renderCard('/claude_logo.png', 'claude', results?.claude)}
        {renderCard('/deepseek_logo.png', 'deepseek', results?.deepseek)}
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
            {loading && !results?.verdict ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
              </div>
            ) : results?.verdict ? (
              results.verdict
            ) : (
              <p className="text-gray-500 text-center py-12">
                Verdict will appear here after all models respond...
              </p>
            )}
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
          disabled={loading}
          isAgentRunning={loading}
          isLoggedIn
        />
      </div>

      {/* ⚡ Optional: Show streaming progress */}
      {loading && (
        <div className="fixed bottom-24 right-8 bg-black/80 backdrop-blur-sm border border-neutral-700 rounded-lg px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
            <div className="text-sm text-gray-300">
              <div className="font-medium">Processing...</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {completedModels.has('gpt') && '✓ GPT '}
                {completedModels.has('claude') && '✓ Claude '}
                {completedModels.has('deepseek') && '✓ DeepSeek'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}