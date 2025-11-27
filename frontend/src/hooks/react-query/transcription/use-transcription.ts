'use client';

import { useMutation } from '@tanstack/react-query';

// ------------------------------------------------------
// 🚫 Temporary placeholder for transcription
// ------------------------------------------------------
// You disabled transcription backend, so we return a
// no-op mutation that resolves immediately.
// The VoiceRecorder microphone icon can still be shown,
// but no transcription will run.
// ------------------------------------------------------

export const useTranscription = () =>
  useMutation({
    mutationFn: async (file: File) => {
      console.warn('⚠️ Transcription is disabled (placeholder mode).');
      return {
        text: '',
        confidence: 0,
      };
    },
  });
