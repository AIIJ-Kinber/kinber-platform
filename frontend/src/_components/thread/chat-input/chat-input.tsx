'use client';

import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Textarea } from '@/_components/ui/textarea';
import { Button } from '@/_components/ui/button';
import { Paperclip, Loader2, X, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/* --------------------------
   ChatInputHandles Interface
----------------------------- */
export interface ChatInputHandles {
  getPendingFiles: () => File[];
  clearPendingFiles: () => void;
}

/* --------------------------
   ChatInput Component
----------------------------- */
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string, attachments?: any[]) => void;
  placeholder?: string;
  loading?: boolean;
  isCentered?: boolean;
  hideAttachments?: boolean;
}

const ChatInput = forwardRef<ChatInputHandles, ChatInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      placeholder = 'Type your message...',
      loading = false,
      isCentered = false,
      hideAttachments = false,
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const supabase = createClient();

    const [uploadedFiles, setUploadedFiles] = useState<
      { name: string; url: string; size: number; type?: string; base64?: string | null }[]
    >([]);
    const [isUploading, setIsUploading] = useState(false);

    /* ------------------------------------------------
       Convert File → Base64 (needed for image Vision)
    -------------------------------------------------- */
    const fileToBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    useImperativeHandle(ref, () => ({
      getPendingFiles: () => [],
      clearPendingFiles: () => setUploadedFiles([]),
    }));

    /* --------------------------
       File Upload Handler
    ----------------------------- */
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length === 0) return;

      setIsUploading(true);

      const uploaded: Array<{
        name: string;
        url: string;
        size: number;
        type: string;
        base64: string | null;
      }> = [];

      for (const file of files) {
        try {
          // Convert to base64 for backend OCR / Vision
          let base64: string | null = null;
          try {
            base64 = await fileToBase64(file);
          } catch {
            console.warn('⚠️ Base64 conversion failed for', file.name);
          }

          // Upload to Supabase
          const path = `attachments/${Date.now()}-${file.name}`;

          const { data, error } = await supabase.storage
            .from('kinber_uploads')
            .upload(path, file);

          if (error) {
            toast.error(`Upload failed: ${file.name}`);
            continue;
          }

          const { data: publicUrl } = supabase.storage
            .from('kinber_uploads')
            .getPublicUrl(path);

          if (publicUrl?.publicUrl) {
            uploaded.push({
              name: file.name,
              url: publicUrl.publicUrl,
              size: file.size,
              type: file.type || 'file',
              base64, // <-- CRITICAL
            });
            toast.success(`File uploaded: ${file.name}`);
          }
        } catch (err) {
          console.error('Upload error:', err);
          toast.error(`Error uploading ${file.name}`);
        }
      }

      setUploadedFiles((prev) => [...prev, ...uploaded]);
      setIsUploading(false);
      e.target.value = '';
    };

    /* --------------------------
       Submit Handler
    ----------------------------- */
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!value.trim() && uploadedFiles.length === 0) return;

      // Send files including base64
      onSubmit(value.trim(), uploadedFiles);

      setUploadedFiles([]);
    };

    /* --------------------------
       Layout
    ----------------------------- */
    return (
      <form
        onSubmit={handleSubmit}
        className={cn(
          'w-full max-w-[800px] flex flex-col gap-2 rounded-2xl border bg-[#2a2a2a] p-3',
          isCentered ? 'mx-auto' : '',
        )}
      >
        {/* Uploaded Files */}
        <AnimatePresence>
          {uploadedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1 px-1"
            >
              {uploadedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-muted/20 px-2 py-1 rounded-md text-sm"
                >
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={() =>
                      setUploadedFiles((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Input Row */}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-gray-200 border-none focus-visible:ring-0 resize-none"
            rows={2}
            disabled={loading}
          />

          <Button
            type="submit"
            size="icon"
            disabled={loading || (!value.trim() && uploadedFiles.length === 0)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Attachments Button */}
        {!hideAttachments && (
          <div className="flex items-center justify-start">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-gray-400 hover:text-white flex items-center gap-1"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              <span>Attach</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </form>
    );
  },
);

ChatInput.displayName = 'ChatInput';
export default ChatInput;
