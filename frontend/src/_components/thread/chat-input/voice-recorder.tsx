'use client';

import { Mic } from 'lucide-react';

export function VoiceRecorder() {
  return (
    <button
      type="button"
      className="p-2 rounded-md hover:bg-[#2a2a2a] transition-colors"
      title="Voice input coming soon..."
      onClick={() => {
        console.log("🎤 Voice recording feature not implemented yet.");
      }}
    >
      <Mic className="h-5 w-5 text-gray-300" />
    </button>
  );
}
