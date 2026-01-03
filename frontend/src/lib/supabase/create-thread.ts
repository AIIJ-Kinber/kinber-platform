// frontend/src/lib/supabase/create-thread.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Creates a new thread by calling YOUR FASTAPI BACKEND.
 * Backend route: POST /thread/
 */
export const createThreadInSupabase = async (
  title: string = 'New Conversation',
  user_id: string = 'guest'
) => {
  try {
    // ---------------------------------------------
    // 1) RESOLVE BACKEND BASE URL
    // ---------------------------------------------
    let base = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

    if (!base) {
      if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
      ) {
        base = 'http://127.0.0.1:8000'; // local backend
      } else {
        base = 'https://api.kinber.com'; // production backend
      }
    }

    // Remove trailing slashes
    base = base.replace(/\/+$/, '');

    console.log('🔗 Backend base URL:', base);

    // ---------------------------------------------
    // 2) FIXED ENDPOINT (matches FastAPI exactly)
    // FastAPI route = POST /thread/
    // ---------------------------------------------
    const endpoint = `${base}/thread/`;

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
        `"${JSON.stringify(errText)}"`
      );
      throw new Error(`Backend responded with ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const threadId = result?.thread_id || result?.data?.thread_id;

    if (!threadId) {
      console.error('⚠️ Invalid response from backend:', result);
      throw new Error('Backend did not return a thread_id.');
    }

    console.log('🧵 Thread created successfully:', threadId);

    // ---------------------------------------------
    // 3) OPTIONAL local Supabase sync
    // ---------------------------------------------
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_KEY =
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (SUPABASE_URL && SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        await supabase.from('threads').upsert([
          {
            thread_id: threadId,
            title: title || 'New Conversation',
            account_id: user_id === 'guest' ? null : user_id,
            updated_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (supabaseErr) {
      console.warn('⚠️ Supabase sync skipped or failed:', supabaseErr);
    }

    // ---------------------------------------------
    // 4) Notify the UI
    // ---------------------------------------------
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
