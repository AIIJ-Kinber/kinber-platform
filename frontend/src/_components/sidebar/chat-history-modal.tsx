'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatHistoryModal({ isOpen, onClose }: ChatHistoryModalProps) {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Fetch all threads updated in the past 30 days
  const fetchRecentThreads = useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data, error } = await supabase
      .from('threads')
      .select('thread_id, title, updated_at')
      .gte('updated_at', since.toISOString())
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching chat history:', error);
    } else {
      setThreads(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (isOpen) fetchRecentThreads();
  }, [isOpen, fetchRecentThreads]);

  const modalRoot =
    typeof document !== 'undefined'
      ? document.getElementById('modal-root')
      : null;

  if (!isOpen || !modalRoot) return null;

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
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" /> Chat History (Last 30 Days)
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[65vh] overflow-y-auto space-y-2">
              {loading ? (
                <p className="text-sm text-gray-400">Loading chat history...</p>
              ) : threads.length > 0 ? (
                threads.map((thread) => (
                  <div
                    key={thread.thread_id}
                    className="p-3 rounded-md hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => {
                      window.location.href = `/dashboard?thread_id=${thread.thread_id}`;
                      onClose();
                    }}
                  >
                    <p className="text-sm font-medium">
                      {thread.title || 'Untitled Chat'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(thread.updated_at).toLocaleString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">
                  No chats found in the last 30 days.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  );
}
