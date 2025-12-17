'use client';

export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const supabase = createClient();
  const router = useRouter();

  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken) {
        setMessage('❌ Invalid or missing verification token.');
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (error) {
        setMessage(`❌ Failed to verify: ${error.message}`);
        return;
      }

      setMessage('✅ Email verified successfully! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1200);
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
      <p className="text-sm opacity-90">{message}</p>

      <div className="mt-4 animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
    </div>
  );
}

