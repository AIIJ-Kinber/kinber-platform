
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

interface SearchChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchChatModal({ isOpen, onClose }: SearchChatModalProps) {
  const supabase = createClient();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ────────────────────────────────────────────────
     Prevent body scroll
  ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /* ────────────────────────────────────────────────
     Fetch threads (STABLE – no loops)
  ──────────────────────────────────────────────── */
  const fetchThreads = useCallback(
    async (term?: string) => {
      try {
        setLoading(true);

        const since = new Date();
        since.setDate(since.getDate() - 7);

        let matchingThreadIds: string[] = [];

        // Search messages if term exists
        if (term?.trim()) {
          const { data: messageMatches, error } = await supabase
            .from('messages')
            .select('thread_id')
            .ilike('content', `%${term}%`);

          if (error) throw error;

          if (messageMatches?.length) {
            matchingThreadIds = Array.from(
              new Set(messageMatches.map((m: any) => m.thread_id))
            );
          }
        }

        let queryBuilder = supabase
          .from('threads')
          .select('thread_id, title, updated_at')
          .gte('updated_at', since.toISOString())
          .order('updated_at', { ascending: false })
          .limit(20);

        if (matchingThreadIds.length > 0) {
          queryBuilder = queryBuilder.in('thread_id', matchingThreadIds);
        } else if (term?.trim()) {
          queryBuilder = queryBuilder.ilike('title', `%${term}%`);
        }

        const { data, error } = await queryBuilder;
        if (error) throw error;

        setResults(data || []);
      } catch (err) {
        console.error('❌ SearchChatModal fetch error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /* ────────────────────────────────────────────────
     Load threads on open (ONCE)
  ──────────────────────────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      fetchThreads();
    }
  }, [isOpen, fetchThreads]);

  /* ────────────────────────────────────────────────
     Handle search submit
  ──────────────────────────────────────────────── */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchThreads(query.trim());
  };

  /* ────────────────────────────────────────────────
     Portal mount
  ──────────────────────────────────────────────── */
  const modalRoot =
    typeof document !== 'undefined'
      ? document.getElementById('modal-root')
      : null;

  if (!isOpen || !modalRoot) return null;

  /* ────────────────────────────────────────────────
     Render
  ──────────────────────────────────────────────── */
  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-[#1f1f1f] text-gray-100 rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[80vh] overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Search Chats</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-[#2a2a2a] rounded-lg px-3 py-2 mb-4 ring-1 ring-gray-600 focus-within:ring-white">
              <Search className="w-5 h-5 text-gray-400 mr-2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats…"
                className="flex-1 bg-transparent outline-none text-sm"
                autoFocus
              />
            </div>
          </form>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <p className="text-sm text-gray-400 p-3">Searching…</p>
            ) : results.length > 0 ? (
              results.map((thread) => (
                <div
                  key={thread.thread_id}
                  className="p-3 rounded-lg bg-[#2a2a2a] hover:bg-[#333] cursor-pointer"
                  onClick={() => {
                    router.push(`/dashboard?thread_id=${thread.thread_id}`);
                    onClose();
                  }}
                >
                  <div className="text-sm font-medium">
                    {thread.title || 'Untitled Chat'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(thread.updated_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 p-3">
                No chats found.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    modalRoot
  );
}

export default SearchChatModal;
