'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  /* -----------------------------------------------------------
     🔐 LOGIN
  ------------------------------------------------------------ */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Checking...');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
      return;
    }

    // BLOCK unverified emails
    if (!data.user.email_confirmed_at) {
      setMessage('⚠ Please verify your email first. Check your inbox.');
      return;
    }

    // Success → redirect
    setMessage('✅ Login successful! Redirecting...');
    setTimeout(() => router.push('/dashboard'), 1000);
  };

  /* -----------------------------------------------------------
     ✉️ SIGNUP (Send confirmation email)
  ------------------------------------------------------------ */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Creating account...');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
      return;
    }

    setMessage(
      '📩 Check your inbox! A confirmation link has been sent to your email.'
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-gray-100 px-4">
      <h1 className="text-3xl font-bold mb-6">Kinber</h1>

      <form
        onSubmit={isLoginMode ? handleLogin : handleSignup}
        className="flex flex-col gap-4 w-[320px] bg-[#1c1c1c] p-6 rounded-xl border border-gray-700 shadow-lg"
      >
        <h2 className="text-xl font-semibold mb-2">
          {isLoginMode ? 'Sign In' : 'Create Account'}
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="p-2 rounded bg-[#2a2a2a] border border-gray-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="p-2 rounded bg-[#2a2a2a] border border-gray-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 rounded p-2 font-semibold mt-2"
        >
          {isLoginMode ? 'Sign In' : 'Create Account'}
        </button>

        <p
          className="text-sm text-blue-300 cursor-pointer hover:underline mt-2 text-center"
          onClick={() => setIsLoginMode(!isLoginMode)}
        >
          {isLoginMode
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </p>
      </form>

      {message && <p className="mt-4 text-sm text-center">{message}</p>}
    </div>
  );
}
