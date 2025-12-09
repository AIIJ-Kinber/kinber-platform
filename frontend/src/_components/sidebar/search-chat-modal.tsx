// frontend\src\_components\sidebar\search-chat-modal.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Search } from 'lucide-react';
// Assuming '@/lib/supabase/client' and 'framer-motion' are available
// import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// Mock implementation for demonstration purposes (replace with your actual createClient)
const createClient = () => ({
  from: (table: string) => ({
    select: (fields: string) => ({
      ilike: (col: string, val: string) => ({ thread_id: 'mock-thread-id-1' }),
      gte: (col: string, val: string) => ({
        order: (col2: string, config: { ascending: boolean }) => ({
          limit: (n: number) => ({
            or: (condition: string) => ({ data: [] }),
            ilike: (col3: string, val2: string) => ({ data: [] }),
            data: [
              // Mock thread data
              { thread_id: 't1', title: 'Recent Chat 1', updated_at: new Date().toISOString() },
              { thread_id: 't2', title: 'Recent Chat 2', updated_at: new Date().toISOString() },
            ],
          }),
        }),
      }),
    }),
  }),
});


interface SearchChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchChatModal({ isOpen, onClose }: SearchChatModalProps) {
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* -----------------------------------------
      Prevent body scroll
  ----------------------------------------- */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  /* -----------------------------------------
      Fetch threads
  ----------------------------------------- */
  const fetchRecentThreads = useCallback(
    async (term?: string) => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 7);

      let matchingThreadIds: string[] = [];

      try {
        // Search messages (Mocking the data structure returned by Supabase)
        if (term?.trim()) {
          const { data: messageMatches } = await supabase
            .from('messages')
            .select('thread_id')
            .ilike('content', `%${term}%`) as any;

          if (messageMatches?.length) {
            matchingThreadIds = [
              ...new Set(messageMatches.map((m: any) => m.thread_id)),
            ] as string[];
          }
        }

        // Search threads (Mocking the data structure returned by Supabase)
        let q = supabase
          .from('threads')
          .select('thread_id, title, updated_at')
          .gte('updated_at', since.toISOString())
          .order('updated_at', { ascending: false })
          .limit(25) as any;

        if (term?.trim()) {
          if (matchingThreadIds.length > 0) {
            q = q.or(
              `title.ilike.%${term}%,thread_id.in.(${matchingThreadIds.join(',')})`
            );
          } else {
            q = q.ilike('title', `%${term}%`);
          }
        }

        const { data } = await q as any;

        const unique = [
          ...new Map((data || []).map((t: any) => [t.thread_id, t])).values(),
        ];

        setResults(unique);
      } catch (err) {
        console.error(err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /* -----------------------------------------
      Load threads on open
  ----------------------------------------- */
  useEffect(() => {
    if (isOpen) fetchRecentThreads();
  }, [isOpen, fetchRecentThreads]);

  /* -----------------------------------------
      Handle searching
  ----------------------------------------- */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecentThreads(query.trim());
  };

  /* -----------------------------------------
      Portal mount
  ----------------------------------------- */
  const modalRoot =
    typeof document !== 'undefined'
      ? document.getElementById('modal-root')
      : null;

  if (!isOpen || !modalRoot) return null;

  /* -----------------------------------------
      Modal JSX — Fully opaque backgrounds
  ----------------------------------------- */
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        // Backdrop with opacity for darkening effect
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Modal content - 100% opaque */}
          <motion.div
            className="
              border border-gray-700
              rounded-2xl shadow-2xl
              w-full max-w-3xl mx-auto p-6
              relative text-gray-100
              max-h-[80vh] overflow-hidden
              bg-[#373636]
            "
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Search Chats</h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search bar - fully opaque */}
            <form onSubmit={handleSearch}>
              <div className="flex items-center bg-[#2a2a2a] rounded-lg px-3 py-2 mb-4 ring-1 ring-gray-600 focus-within:ring-white transition-all">
                <Search className="w-5 h-5 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search your chats..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder-gray-500"
                  autoFocus
                />
              </div>
            </form>

            {/* Results - fully opaque backgrounds */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {loading ? (
                <p className="text-sm text-gray-400 p-3">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </p>
              ) : results.length > 0 ? (
                results.map((thread: any) => (
                  <div
                    key={thread.thread_id}
                    className="p-3 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] cursor-pointer transition-colors border border-transparent hover:border-blue-500/50"
                    onClick={() => {
                      // Note: This needs proper navigation logic for the actual app environment
                      // window.location.href = `/dashboard?thread_id=${thread.thread_id}`;
                      console.log(`Navigating to thread: ${thread.thread_id}`);
                      onClose();
                    }}
                  >
                    <p className="text-sm font-medium">
                      {thread.title || 'Untitled Chat'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Last Updated: {new Date(thread.updated_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 p-3">No recent chats found matching your query.</p>
              )}
            </div>
            {/* Custom scrollbar style for better visual integration */}
            <style jsx global>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #373636;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #888;
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  );
}

// Default export to ensure compatibility with different import methods
export default SearchChatModal;
