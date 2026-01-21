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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session found, redirecting to login');
      router.push('/login');
    }
  };

  const handleSubmit = async (text: string) => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setPrompt(text);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      if (!session || !user) {
        console.error('No session found');
        router.push('/login');
        return;
      }

      console.log('🚀 Calling Triplet API:', TRIPLET_API_URL);

      const res = await fetch(TRIPLET_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-User-ID': user.id,
        },
        body: JSON.stringify({ prompt: text }),
      });

      if (res.status === 401) {
        console.error('Authentication failed');
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ API Error:', res.status, errorText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      setResults({
        gpt: data.openai || data.gpt || 'No response',
        claude: data.claude || 'No response',
        deepseek: data.deepseek || 'No response',
        verdict: data.verdict || 'Analyzing responses...',
      });

    } catch (err) {
      console.error('❌ Triplet error:', err);
      alert('Failed to get responses. Please try again.');
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

      {/* VERDICT - with internal scrolling for long content */}
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

          {loading && !results?.verdict ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-700 rounded w-full" />
            </div>
          ) : (
            <div className="text-white text-[18px] leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2">
              {results?.verdict}
            </div>
          )}
        </div>
      </div>

      {/* INPUT - CENTERED */}
      <div className="w-full mb-6">
        <div 
          style={{
            position: 'relative',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'fit-content',
          }}
        >
          <MessageInput
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onSubmit={(msg) => handleSubmit(msg)}
            onTranscription={() => {}}
            placeholder="Ask Triplet AI…"
            loading={loading}
            disabled={false}
            isAgentRunning={false}
            isLoggedIn
          />
        </div>
      </div>
    </div>
  );
}