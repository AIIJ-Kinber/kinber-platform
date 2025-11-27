'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  /* -----------------------------------------
      Prevent body scroll while modal is open
  ----------------------------------------- */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  /* -----------------------------------------
      Search function wrapped in useCallback
      Fixes ESLint missing dependency warnings
  ----------------------------------------- */
  const fetchRecentThreads = useCallback(
    async (term?: string) => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 7);

      try {
        let q = supabase
          .from('threads')
          .select('thread_id, title, updated_at')
          .gte('updated_at', since.toISOString())
          .order('updated_at', { ascending: false })
          .limit(10);

        if (term) {
          q = q.ilike('title', `%${term}%`);
        }

        const { data, error } = await q;

        if (error) {
          console.error('❌ Search error:', error);
          setResults([]);
        } else {
          setResults(data || []);
        }
      } catch (err) {
        console.error('⚠️ Unexpected fetch error:', err);
        setResults([]);
      }

      setLoading(false);
    },
    [supabase]
  );

  /* -----------------------------------------
      Fetch once when modal is opened
  ----------------------------------------- */
  useEffect(() => {
    if (isOpen) fetchRecentThreads();
  }, [isOpen, fetchRecentThreads]);

  /* -----------------------------------------
      Search submit handler (stable)
  ----------------------------------------- */
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      fetchRecentThreads(query.trim());
    },
    [query, fetchRecentThreads]
  );

  /* -----------------------------------------
      Modal content node
  ----------------------------------------- */
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-[#1f1f1f] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-6 relative text-gray-100"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Search Chats to Share</h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search input */}
            <form onSubmit={handleSearch}>
              <div className="flex items-center bg-[#2a2a2a] rounded-lg px-3 py-2 mb-4">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="flex-1 bg-transparent outline-none ml-2 text-gray-100 placeholder-gray-500"
                  placeholder="Search threads..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </form>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto space-y-3">
              {loading && (
                <p className="text-sm text-gray-400">Searching...</p>
              )}

              {!loading && results.length === 0 && (
                <p className="text-sm text-gray-500">No chats found.</p>
              )}

              {!loading &&
                results.map((item) => (
                  <a
                    key={item.thread_id}
                    href={`/dashboard?thread_id=${item.thread_id}`}
                    className="block p-3 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] transition border border-gray-700"
                    onClick={onClose}
                  >
                    <p className="text-sm font-medium">
                      {item.title || 'Untitled thread'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.updated_at).toLocaleString()}
                    </p>
                  </a>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* -----------------------------------------
      Portal mounting
  ----------------------------------------- */
  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(modalContent, document.body);
  }

  return null;
}
