// frontend/src/lib/supabase/create-thread.ts
import { createClient } from '@supabase/supabase-js';

/**
 * 🧵 Creates a new thread via backend (which also inserts into Supabase if configured).
 * Works even if Supabase client is not set up — safe fallback mode.
 */
export const createThreadInSupabase = async (
  title: string = 'New Conversation',
  user_id: string = 'guest'
) => {
  try {
    // ──────────────────────────────────────────────
    // Resolve backend URL safely (no /api suffix allowed)
    // ──────────────────────────────────────────────
    let base = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

    if (!base) {
      if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
      ) {
        base = 'http://127.0.0.1:8000';
      } else {
        base = 'https://api.kinber.com';
      }
    }

    // Remove trailing slashes to avoid /api/api/thread duplication
    base = base.replace(/\/+$/, '');

    console.log('🔗 Using backend base URL:', base);

    // ──────────────────────────────────────────────
    // Step 1 — Create thread via backend
    // MUST BE: POST /api/thread/ (with trailing slash)
    // ──────────────────────────────────────────────
    const endpoint = `${base}/api/thread/`;  // ✅ Added trailing slash

    console.log('📡 Thread creation POST →', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ title, user_id }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        '❌ Backend thread creation failed:',
        response.status,
        `"${JSON.stringify(errText)}"` // Better error logging
      );
      throw new Error(
        `Backend responded with ${response.status} "${errText}"`
      );
    }

    const result = await response.json();
    const threadId = result?.data?.thread_id || result?.thread_id;

    if (!threadId) {
      console.error('⚠️ No valid thread_id returned from backend:', result);
      throw new Error('No valid thread_id returned from backend.');
    }

    console.log('🧵 Thread created via backend:', threadId);

    // ──────────────────────────────────────────────
    // Step 2 — Optional local Supabase sync
    // ──────────────────────────────────────────────
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_KEY =
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (SUPABASE_URL && SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        await supabase.from('threads').upsert([
          {
            id: threadId,
            title,
            user_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      } else {
        console.warn('⚠️ Supabase credentials missing — skipping upsert.');
      }
    } catch (supabaseErr) {
      console.warn('⚠️ Failed to sync thread to Supabase:', supabaseErr);
    }

    // ──────────────────────────────────────────────
    // Step 3 — Notify sidebar UI
    // ──────────────────────────────────────────────
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('thread:created', { detail: { thread_id: threadId } })
      );
    }

    return { thread_id: threadId };
  } catch (err) {
    console.error('⚠️ Error creating thread:', err);
    return null;
  }
};

export default createThreadInSupabase;