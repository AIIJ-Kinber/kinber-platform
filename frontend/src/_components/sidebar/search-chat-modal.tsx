'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchChatModal({ isOpen, onClose }: SearchChatModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  /* -----------------------------------------
     Prevent body scroll when modal is open
  ----------------------------------------- */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  /* -----------------------------------------
      Search function wrapped in useCallback
      (Fixes missing dependency warnings)
  ----------------------------------------- */
  const fetchRecentThreads = useCallback(
    async (term?: string) => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 7);

      let matchingThreadIds: string[] = [];

      try {
        // Search messages by text
        if (term && term.trim().length > 0) {
          const { data: messageMatches, error: msgError } = await supabase
            .from('messages')
            .select('thread_id')
            .ilike('content', `%${term}%`);

          if (!msgError && messageMatches?.length) {
            matchingThreadIds = [
              ...new Set(messageMatches.map((m) => m.thread_id)),
            ];
          }
        }

        // Search threads by title or matching message threads
        let q = supabase
          .from('threads')
          .select('thread_id, title, updated_at')
          .gte('updated_at', since.toISOString())
          .order('updated_at', { ascending: false })
          .limit(25);

        if (term && term.trim().length > 0) {
          if (matchingThreadIds.length > 0) {
            q = q.or(
              `title.ilike.%${term}%,thread_id.in.(${matchingThreadIds.join(',')})`
            );
          } else {
            q = q.ilike('title', `%${term}%`);
          }
        }

        const { data, error } = await q;

        if (error) {
          console.error('❌ Thread search error:', error);
          setResults([]);
        } else {
          const uniqueResults = [
            ...new Map((data || []).map((t) => [t.thread_id, t])).values(),
          ];
          setResults(uniqueResults);
        }
      } catch (err) {
        console.error('⚠️ Unexpected search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /* -----------------------------------------
      Auto-load recent threads when modal opens
  ----------------------------------------- */
  useEffect(() => {
    if (isOpen) fetchRecentThreads();
  }, [isOpen, fetchRecentThreads]);

  /* -----------------------------------------
      Search form submission
  ----------------------------------------- */
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      fetchRecentThreads(query.trim());
    },
    [query, fetchRecentThreads]
  );

  /* -----------------------------------------
      Portal mount target
  ----------------------------------------- */
  const modalRoot =
    typeof document !== 'undefined'
      ? document.getElementById('modal-root')
      : null;

  if (!isOpen || !modalRoot) return null;

  /* -----------------------------------------
      Modal JSX
  ----------------------------------------- */
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          <motion.div
            className="bg-[#000000] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto p-6 relative text-gray-100"
            style={{ backgroundColor: '#373636ff' }}
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

            {/* Search bar */}
            <form onSubmit={handleSearch}>
              <div className="flex items-center bg-[#2a2a2a] rounded-lg px-3 py-2 mb-4">
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

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {loading ? (
                <p className="text-sm text-gray-400">Searching...</p>
              ) : results.length > 0 ? (
                results.map((thread) => (
                  <div
                    key={thread.thread_id}
                    className="p-3 rounded-md hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => {
                      window.location.href = `/dashboard?thread_id=${thread.thread_id}`;
                      onClose();
                    }}
                  >
                    <p className="text-sm font-medium">
                      {thread.title || 'Untitled Chat'}
                    </p>
                    <p className="text-xs text-gray-300">
                      {new Date(thread.updated_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No chats found.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  );
}
