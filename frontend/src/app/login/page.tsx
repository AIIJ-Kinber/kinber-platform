'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Signing in...');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(`❌ ${error.message}`);
    else setMessage('✅ Logged in successfully! Redirecting...');
    setTimeout(() => (window.location.href = '/dashboard'), 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Kinber Login</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-[300px]">
        <input
          type="email"
          placeholder="Email"
          className="p-2 rounded bg-[#1f1f1f] border border-gray-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="p-2 rounded bg-[#1f1f1f] border border-gray-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 rounded p-2 font-semibold"
        >
          Sign In
        </button>
      </form>
      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
