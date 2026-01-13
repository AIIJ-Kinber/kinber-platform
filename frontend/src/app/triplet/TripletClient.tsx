'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import MessageInput from '@/_components/thread/chat-input/message-input';

const TRIPLET_API_URL = 'http://127.0.0.1:8000/api/triplet';

export default function TripletClient() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<any>(null);

  const handleSubmit = async (text: string) => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setPrompt(text);
    setResults(null);

    try {
      const res = await fetch(TRIPLET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Triplet error:', err);
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
    <div className="flex flex-col h-full justify-between items-center w-full px-6">
      {/* RESULTS */}
      <div className="w-full max-w-[1400px] grid grid-cols-1 md:grid-cols-3 gap-8 mt-6 mb-10">
        {renderCard('/chatgpt_logo.png', results?.gpt)}
        {renderCard('/claude_logo.png', results?.claude)}
        {renderCard('/deepseek_logo.png', results?.deepseek)}
      </div>

      {/* VERDICT */}
      <div className="w-full max-w-[1400px] mb-8">
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
            <p className="text-white text-[20px] leading-relaxed whitespace-pre-wrap">
              {results?.verdict}
            </p>
          )}
        </div>
      </div>

      {/* INPUT */}
      <div className="w-full max-w-[1400px] mx-auto mb-6">
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
  );
}
