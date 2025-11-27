'use client';

import React, { forwardRef, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeFilenameToNFC } from '@/lib/utils/unicode';

/* ────────────────────────────────────────────────
   Types
────────────────────────────────────────────────── */
interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
  localUrl?: string;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

/* ────────────────────────────────────────────────
   LOCAL FILE HANDLING
────────────────────────────────────────────────── */
const handleLocalFiles = (
  files: File[],
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>,
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
) => {
  const filteredFiles = files.filter((file) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error(`File exceeds the 50MB limit: ${file.name}`);
      return false;
    }
    return true;
  });

  setPendingFiles((prev) => [...prev, ...filteredFiles]);

  const prepared: UploadedFile[] = filteredFiles.map((file) => {
    const normalized = normalizeFilenameToNFC(file.name);

    return {
      name: normalized,
      path: `/workspace/${normalized}`,
      size: file.size,
      type: file.type || 'application/octet-stream',
      localUrl: URL.createObjectURL(file),
    };
  });

  setUploadedFiles((prev) => [...prev, ...prepared]);

  prepared.forEach((f) => toast.success(`File attached: ${f.name}`));
};

/* ────────────────────────────────────────────────
   REMOTE UPLOAD (Backend)
────────────────────────────────────────────────── */
const uploadFiles = async (
  files: File[],
  sandboxId: string,
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>,
  messages: any[] = [],
  queryClient?: any
) => {
  try {
    setIsUploading(true);

    const results: UploadedFile[] = [];

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File exceeds 50MB: ${file.name}`);
        continue;
      }

      const normalized = normalizeFilenameToNFC(file.name);
      const uploadPath = `/workspace/${normalized}`;

      const formData = new FormData();
      formData.append('file', file, normalized);
      formData.append('path', uploadPath);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Missing Supabase access token');
      }

      const response = await fetch(
        `${API_URL}/sandboxes/${sandboxId}/files`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Reset entire cache (old fileQueryKeys removed)
      if (queryClient) {
        queryClient.clear();
      }

      results.push({
        name: normalized,
        path: uploadPath,
        size: file.size,
        type: file.type || 'application/octet-stream',
      });

      toast.success(`File uploaded: ${normalized}`);
    }

    setUploadedFiles((prev) => [...prev, ...results]);
  } catch (err) {
    console.error('File upload failed:', err);
    toast.error(err instanceof Error ? err.message : 'Upload failed');
  } finally {
    setIsUploading(false);
  }
};

/* ────────────────────────────────────────────────
   UNIFIED ENTRY: Local or Remote
────────────────────────────────────────────────── */
const handleFiles = async (
  files: File[],
  sandboxId: string | undefined,
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>,
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>,
  messages: any[] = [],
  queryClient?: any
) => {
  if (sandboxId) {
    await uploadFiles(
      files,
      sandboxId,
      setUploadedFiles,
      setIsUploading,
      messages,
      queryClient
    );
  } else {
    handleLocalFiles(files, setPendingFiles, setUploadedFiles);
  }
};

/* ────────────────────────────────────────────────
   COMPONENT: FileUploadHandler
────────────────────────────────────────────────── */
interface FileUploadHandlerProps {
  loading: boolean;
  disabled: boolean;
  isAgentRunning: boolean;
  isUploading: boolean;
  sandboxId?: string;
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  messages?: any[];
  isLoggedIn?: boolean;
}

const FileUploadHandlerComponent = forwardRef<HTMLInputElement, FileUploadHandlerProps>(
  (props, ref) => {
    const {
      loading,
      disabled,
      isAgentRunning,
      isUploading,
      sandboxId,
      setPendingFiles,
      setUploadedFiles,
      setIsUploading,
      messages = [],
    } = props;

    const queryClient = useQueryClient();

    /* Cleanup object URLs */
    useEffect(() => {
      return () => {
        setUploadedFiles((prev) => {
          prev.forEach((file) => {
            if (file.localUrl) URL.revokeObjectURL(file.localUrl);
          });
          return prev;
        });
      };
      // setUploadedFiles is a setState function and is stable across renders
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const processFileUpload = async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      if (!e.target.files?.length) return;

      const files = Array.from(e.target.files);
      await handleFiles(
        files,
        sandboxId,
        setPendingFiles,
        setUploadedFiles,
        setIsUploading,
        messages,
        queryClient
      );

      e.target.value = '';
    };

    return (
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={processFileUpload}
        multiple
      />
    );
  }
);

FileUploadHandlerComponent.displayName = 'FileUploadHandler';

export const FileUploadHandler = FileUploadHandlerComponent;

export { handleFiles, handleLocalFiles, uploadFiles };