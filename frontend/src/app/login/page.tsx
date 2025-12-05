
'use client';

import { useState } from 'react';
import Image from 'next/image';
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
     🔐 Google OAuth Login
  ------------------------------------------------------------ */
  const handleGoogleLogin = async () => {
    setMessage("Redirecting to Google...");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

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

    if (!data.user.email_confirmed_at) {
      setMessage('⚠ Please verify your email first. Check your inbox.');
      return;
    }

    setMessage('✅ Login successful! Redirecting...');
    setTimeout(() => router.push('/welcome'), 1000);
  };

  /* -----------------------------------------------------------
     ✉️ SIGNUP
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

  /* -----------------------------------------------------------
     🎨 UI
  ------------------------------------------------------------ */

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-[#121212] text-gray-100 px-4">

      {/* Kinber Logo + Text */}
      <div className="flex items-center gap-3 mb-8">
        <Image
          src="/black_dash.png"
          alt="Kinber Logo"
          width={40}
          height={40}
          className="w-10 h-10"
        />
        <h1 className="text-3xl font-bold">Kinber</h1>
      </div>

      {/* Auth Card */}
      <div className="w-[320px] bg-[#1c1c1c] p-6 rounded-xl border border-gray-700 shadow-lg text-center">

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded border border-white/20 transition"
        >
          <Image
            src="/Google__G__logo.svg.png"
            alt="Google Logo"
            width={18}
            height={18}
          />
          Continue with Google
        </button>

        <div className="my-4 text-white/40 text-xs">or</div>

        {/* Sign In / Sign Up form */}
        <form
          onSubmit={isLoginMode ? handleLogin : handleSignup}
          className="flex flex-col gap-4 text-left"
        >
          <h2 className="text-xl font-semibold text-center mb-2">
            {isLoginMode ? 'Sign In' : 'Create Account'}
          </h2>

          <input
            type="email"
            placeholder="Email"
            className="p-2 rounded bg-[#2a2a2a] border border-gray-700 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="p-2 rounded bg-[#2a2a2a] border border-gray-700 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition"
          >
            {isLoginMode ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle Login Mode */}
        <p
          className="text-sm text-blue-300 cursor-pointer hover:underline mt-3 text-center"
          onClick={() => setIsLoginMode(!isLoginMode)}
        >
          {isLoginMode
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </p>
      </div>

      {/* Footer Message */}
      {message && (
        <p className="mt-4 text-sm text-center text-blue-300">{message}</p>
      )}
    </div>
  );
}
