'use client';

import React, { useRef } from 'react';
import { Button } from '@/_components/ui/button';
import { Paperclip } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/_components/ui/tooltip';
import { FileUploadHandler } from './file-upload-handler';

interface AttachButtonProps {
  disabled?: boolean;
  loading?: boolean;
  isAgentRunning?: boolean;
  isUploading?: boolean;
  sandboxId?: string;
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setUploadedFiles: React.Dispatch<any>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  messages?: any[];
  isLoggedIn?: boolean;
}

/**
 * 📎 AttachButton
 * Compact framed button (same style as Select Agent)
 * - Opens the file browser when clicked
 * - Reuses FileUploadHandler logic internally
 */
export const AttachButton: React.FC<AttachButtonProps> = ({
  disabled = false,
  loading = false,
  isAgentRunning = false,
  isUploading = false,
  sandboxId,
  setPendingFiles,
  setUploadedFiles,
  setIsUploading,
  messages = [],
  isLoggedIn = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFileDialog = () => {
    if (!disabled && !isAgentRunning && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-sm font-medium border border-[#4a4a4a] rounded-[10px] bg-transparent hover:border-[#888] hover:bg-[#2a2a2a]/40 transition-colors"
            onClick={handleOpenFileDialog}
            disabled={disabled || loading || isUploading}
          >
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 opacity-80" />
              <span className="hidden sm:inline-block text-xs">Attach</span>           </div>
          </Button>

        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          <p>Attach files</p>
        </TooltipContent>
      </Tooltip>

      {/* Hidden file input handler */}
      <FileUploadHandler
        ref={fileInputRef}
        loading={loading}
        disabled={disabled}
        isAgentRunning={isAgentRunning}
        isUploading={isUploading}
        sandboxId={sandboxId}
        setPendingFiles={setPendingFiles}
        setUploadedFiles={setUploadedFiles}
        setIsUploading={setIsUploading}
        messages={messages}
        isLoggedIn={isLoggedIn}
      />
    </TooltipProvider>
  );
};
