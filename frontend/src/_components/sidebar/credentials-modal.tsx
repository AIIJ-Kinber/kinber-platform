'use client';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { X, KeyRound } from 'lucide-react';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CredentialsModal({ isOpen, onClose }: CredentialsModalProps) {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /* ----------------------------------------
      Fetch profile when modal opens
  ---------------------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    const fetchProfile = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', auth.user.id)
        .single();

      setProfile(
        data || {
          id: auth.user.id,
          full_name: auth.user.user_metadata?.name || '',
          email: auth.user.email,
          organization: '',
          role: '',
        }
      );
    };

    fetchProfile();
  }, [isOpen, supabase]);

  /* ----------------------------------------
      Save profile
  ---------------------------------------- */
  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert(profile);
    if (error) console.error(error);
    setLoading(false);
    onClose();
  };

  /* ----------------------------------------
      Portal mount container
  ---------------------------------------- */
  const modalRoot =
    typeof document !== 'undefined'
      ? document.getElementById('modal-root')
      : null;

  if (!isOpen || !modalRoot) return null;

  /* ----------------------------------------
      Modal JSX (fully opaque)
  ---------------------------------------- */
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-[#000000] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto p-6 relative text-gray-100"
            style={{ backgroundColor: '#373636ff' }}  // Fully opaque card
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <KeyRound className="w-5 h-5" /> Profile Settings
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Form */}
            {profile && (
              <div className="space-y-4 mb-6">
                {/* Name */}
                <div>
                  <label className="block text-sm text-gray-400">Full Name</label>
                  <input
                    type="text"
                    className="w-full rounded-md bg-[#2a2a2a] border border-gray-600 p-2 mt-1 text-sm"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile({ ...profile, full_name: e.target.value })
                    }
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm text-gray-400">Email</label>
                  <input
                    type="text"
                    className="w-full rounded-md bg-[#2a2a2a] border border-gray-600 p-2 mt-1 text-sm"
                    value={profile.email}
                    disabled
                  />
                </div>

                {/* Organization & Role */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400">Organization</label>
                    <input
                      type="text"
                      className="w-full rounded-md bg-[#2a2a2a] border border-gray-600 p-2 mt-1 text-sm"
                      value={profile.organization}
                      onChange={(e) =>
                        setProfile({ ...profile, organization: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400">Role</label>
                    <input
                      type="text"
                      className="w-full rounded-md bg-[#2a2a2a] border border-gray-600 p-2 mt-1 text-sm"
                      value={profile.role}
                      onChange={(e) =>
                        setProfile({ ...profile, role: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Save */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  );
}
