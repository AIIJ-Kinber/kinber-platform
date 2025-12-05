'use client';

import React, {
  forwardRef,
  useEffect,
  useState,
  useRef,
  RefObject,
} from 'react';
import Image from 'next/image';
import PdfIcon from '@/../public/pdf.png';
import SelectIcon from '@/../public/select.png';
import { Textarea } from '@/_components/ui/textarea';
import { cn } from '@/lib/utils';
import DatasetPreviewModal from "@/_components/modals/dataset-preview-modal";
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import DriveIcon from '@/../public/drive.png';
import { loadGooglePicker } from "@/lib/google-picker-loader";


import {
  Loader2,
  ArrowUp,
  Image as ImageIcon,
  Presentation as SlidesIcon,
  Search as ResearchIcon,
  BarChart3 as DataIcon,
  Plane as TravelIcon,
  MoreHorizontal as MoreIcon,
  Paperclip,
  Brain,
  FileText,
  Code2,
  BarChart2,
  Settings,
  Globe,
  Github,
} from 'lucide-react';

/* --------------------------------------------------------
   Helper: Convert blob/file → Base64
-------------------------------------------------------- */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/* --------------------------------------------------------
   Helper: Download ANY Google Drive file
-------------------------------------------------------- */
async function fetchDriveFile(
  fileId: string,
  accessToken: string
): Promise<{ blob: Blob; base64: string } | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch file ${fileId}:`, response.statusText);
      return null;
    }

    const blob = await response.blob();
    const base64 = await fileToBase64(new File([blob], fileId));

    return { blob, base64 };
  } catch (err) {
    console.error("Error fetching drive file:", err);
    return null;
  }
}

type Attachment = {
  name: string;
  url: string;
  type?: string;
  size?: number;
  base64?: string | null;
};

/* ---------------------------------------------------------
   Render file thumbnail
--------------------------------------------------------- */
const renderAttachmentThumb = (file: Attachment) => {
  // IMAGE preview (jpg, png, webp, gif)
  if (file.type?.startsWith("image/") && file.base64) {
    return (
      <img
        src={file.base64}
        alt={file.name}
        className="w-12 h-12 object-cover rounded-md"
      />
    );
  }

  // PDF (uses your custom pdf.png icon)
  if (file.type === "application/pdf") {
    return (
      <Image
        src={PdfIcon}
        alt="PDF"
        className="w-12 h-12 object-contain rounded-md"
      />
    );
  }

  // CSV
  if (file.type === "text/csv") {
    return (
      <div className="w-12 h-12 bg-green-600/20 border border-green-500/40 rounded-md flex items-center justify-center text-green-300 text-xs">
        CSV
      </div>
    );
  }

  // Word Docs
  if (
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return (
      <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/40 rounded-md flex items-center justify-center text-blue-300 text-xs">
        DOC
      </div>
    );
  }

  // Excel
  if (
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  ) {
    return (
      <div className="w-12 h-12 bg-emerald-600/20 border border-emerald-500/40 rounded-md flex items-center justify-center text-emerald-300 text-xs">
        XLS
      </div>
    );
  }

  // Default icon
  return (
    <div className="w-12 h-12 bg-gray-700/40 border border-gray-500/40 rounded-md flex items-center justify-center text-gray-300 text-xs">
      FILE
    </div>
  );
};


interface MessageInputProps {
  value: string;
  onChange: (
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | {
          target: { value: string };
        }
  ) => void;
  onSubmit: (message: string, attachments?: Attachment[]) => void;
  onTranscription: (text: string) => void;
  placeholder: string;
  loading: boolean;
  disabled: boolean;
  isAgentRunning: boolean;
  onStopAgent?: () => void;
  isLoggedIn?: boolean;
  onAttachmentsChange?: (files: Attachment[]) => void;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onTranscription,
      placeholder,
      loading,
      disabled,
      isAgentRunning,
      onStopAgent,
      isLoggedIn = true,
      onAttachmentsChange,
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState(value);
    const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
    const MotionButton = motion.button;

    // Supabase client
    const supabase = createClient();

    // Google OAuth client id
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    // Google Drive token
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // UI states
    const [isPlusOpen, setIsPlusOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isAgentOpen, setIsAgentOpen] = useState(false);
    const [SelectedAgent, setSelectedAgent] = useState('');

    // CSV preview
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFileName, setPreviewFileName] = useState<string | null>(null);
    const [previewRows, setPreviewRows] = useState<string[][]>([]);

    // refs
    const plusRef = useRef<HTMLDivElement>(null);
    const toolsRef = useRef<HTMLDivElement>(null);
    const agentRef = useRef<HTMLDivElement>(null);


    /* ---------------------------------------------------------
     Sync external value
    --------------------------------------------------------- */
    useEffect(() => {
      setInputValue(value);
    }, [value]);

    /* ---------------------------------------------------------
    Auto-grow textarea
    --------------------------------------------------------- */
    useEffect(() => {
      const textareaRef = ref as RefObject<HTMLTextAreaElement>;
      const el = textareaRef.current;
      if (!el) return;

      const adjust = () => {
        el.style.height = 'auto';
        el.style.height = `${Math.min(Math.max(el.scrollHeight, 28), 180)}px`;
      };

      adjust();
      el.addEventListener('input', adjust);
      window.addEventListener('resize', adjust);

      return () => {
        el.removeEventListener('input', adjust);
        window.removeEventListener('resize', adjust);
      };
    }, [ref]);

    /* ---------------------------------------------------------
      Supabase session listener
    --------------------------------------------------------- */
    useEffect(() => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          const token = session?.provider_token || null;
          if (token) {
            console.log("🔄 Google Drive token updated:", token);
            setAccessToken(token);
          }
        }
      );

      return () => subscription.unsubscribe();
    }, [supabase]);

    useEffect(() => {
      const loadToken = async () => {
        const { data } = await supabase.auth.getSession();
        setAccessToken(data.session?.provider_token || null);
      };
      loadToken();
    }, [supabase]);

    /* ---------------------------------------------------------
      Google Identity Services (GIS) loader
      - Only loads GIS and sets up token client
      - Picker script is handled by loadGooglePicker()
    --------------------------------------------------------- */
    useEffect(() => {
      if (typeof window === "undefined") return;

      if ((window as any).__googleGisInitialized) return;
      (window as any).__googleGisInitialized = true;

      console.log("📌 Initialising Google Identity Services (GIS)...");

      const gisScript = document.createElement("script");
      gisScript.src = "https://accounts.google.com/gsi/client";
      gisScript.async = true;
      gisScript.defer = true;

      gisScript.onload = () => {
        console.log("✔ GIS script loaded");

        const g = (window as any).google;
        if (!g?.accounts?.oauth2) {
          console.error("❌ google.accounts.oauth2 missing — GIS did NOT initialize");
          return;
        }

        const tokenClient = g.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope:
            "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
          // default callback – we will override this inside openGoogleDrivePicker()
          callback: (response: any) => {
            console.log("ℹ️ GIS default callback:", response);
          },
        });

        (window as any).__gisTokenClient = tokenClient;
        console.log("✔ GIS Token Client initialized");
      };

      gisScript.onerror = () => {
        console.error("❌ Failed to load GIS script");
      };

      document.body.appendChild(gisScript);
    }, [GOOGLE_CLIENT_ID]);

    /* ---------------------------------------------------------
      Build & open Google Picker (uses an already-loaded Picker)
    --------------------------------------------------------- */
    const buildAndOpenPicker = (token: string) => {
      const google = (window as any).google;

      if (!google?.picker) {
        console.error("❌ google.picker is not available after loader");
        alert("Google Picker is not ready yet. Please try again.");
        return;
      }

      const viewDocs = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setParent("root")
        .setMode(google.picker.DocsViewMode.LIST);

      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
        .setOAuthToken(token)
        .addView(viewDocs)
        .setCallback(async (data: any) => {
          if (data.action !== google.picker.Action.PICKED) return;

          const picked = data.docs || [];
          console.log("Picked:", picked);

          let added = 0;

          for (const doc of picked) {
            const fileId = doc.id;
            const fileName = doc.name;
            const mimeType = doc.mimeType;

            if (mimeType.includes("spreadsheet")) {
              const csv = await downloadGoogleSheetAsCsv(fileId, token);
              if (!csv) continue;

              const newItem: Attachment = {
                name: fileName.replace(/\.[^/.]+$/, "") + ".csv",
                url: `https://drive.google.com/uc?id=${fileId}&export=download`,
                type: "text/csv",
                size: csv.blob.size,
                base64: csv.base64,
              };

              setAttachedFiles((prev) => {
                const updated = [...prev, newItem];
                onAttachmentsChange?.(updated);
                return updated;
              });

              previewCsv(newItem.name, csv.base64);
              added++;
              continue;
            }

            const downloaded = await fetchDriveFile(fileId, token);
            if (!downloaded) continue;

            const newItem: Attachment = {
              name: fileName,
              url: `https://drive.google.com/uc?id=${fileId}&export=download`,
              type: mimeType,
              size: downloaded.blob.size,
              base64: downloaded.base64,
            };

            setAttachedFiles((prev) => {
              const updated = [...prev, newItem];
              onAttachmentsChange?.(updated);
              return updated;
            });

            added++;
          }  
        })
        .build();

      console.log("🚀 Opening Google Picker...");
      picker.setVisible(true);
    };

    /* ---------------------------------------------------------
      Main entry – called when user chooses "Add from Drive"
    --------------------------------------------------------- */
    const openGoogleDrivePicker = async () => {
      console.log("📂 Drive button clicked — starting Picker flow");

      try {
        // 1) Make sure Picker library (api.js + client:picker) is loaded
        console.log("⏳ Loading Google Picker library...");
        await loadGooglePicker();
        console.log("✅ Google Picker library ready");

        // 2) If we already have a token (from Supabase or previous GIS call), use it
        if (accessToken) {
          console.log("🔑 Using existing Drive access token");
          buildAndOpenPicker(accessToken);
          return;
        }

        // 3) Otherwise ask GIS for a new token
        const tokenClient = (window as any).__gisTokenClient;
        if (!tokenClient) {
          console.error("❌ GIS token client not ready yet");
          alert("Google Login is still loading... please try again in a moment.");
          return;
        }

        console.log("📌 Requesting new GIS access token...");

        tokenClient.callback = (response: any) => {
          if (!response.access_token) {
            console.error("❌ GIS did not return an access token", response);
            return;
          }
          console.log("✔ GIS access token received inside openGoogleDrivePicker");
          setAccessToken(response.access_token);
          buildAndOpenPicker(response.access_token);
        };

        tokenClient.requestAccessToken();
      } catch (err) {
        console.error("❌ Error in openGoogleDrivePicker:", err);
        alert("Failed to open Google Drive Picker. Check console for details.");
      }
    };

    /* ---------------------------------------------------------
      Handle + menu actions
    --------------------------------------------------------- */
    const handleToolAction = (key: string) => {
      switch (key) {
        case "attach":
          handleAttachFiles();
          setIsPlusOpen(false);
          break;

        case "drive":
          openGoogleDrivePicker();
          setIsPlusOpen(false);
          break;
      }
    };

    /* ---------------------------------------------------------
      File upload
    --------------------------------------------------------- */
    const handleAttachFiles = async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept =
        ".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg,.xls,.xlsx,.gif,.webp";

      input.onchange = async () => {
        const files = input.files ? Array.from(input.files) : [];
        if (!files.length) return;

        const uploaded: Attachment[] = [];

        for (const file of files) {
          const path = `attachments/${Date.now()}-${file.name}`;

          try {
            const { error: uploadError } = await supabase.storage
              .from("kinber_uploads")
              .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) {
              alert("Upload failed: " + uploadError.message);
              continue;
            }

            const { data } = supabase.storage
              .from("kinber_uploads")
              .getPublicUrl(path);

            const publicUrl = data?.publicUrl ?? "";
            if (!publicUrl) continue;

            const base64 = await fileToBase64(file);

            uploaded.push({
              name: file.name,
              url: publicUrl,
              type: file.type,
              size: file.size,
              base64,
            });
          } catch (err) {
            console.error("Upload error:", err);
          }
        }

        if (uploaded.length > 0) {
          setAttachedFiles((prev) => {
            const updated = [...prev, ...uploaded];
            onAttachmentsChange?.(updated);
            return updated;
          });
        }
      };

      input.click();
    };

    /* ---------------------------------------------------------
      Enter key behavior
    --------------------------------------------------------- */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const text = inputValue || "";
        if (!text.trim() && attachedFiles.length === 0) return;

        onSubmit(text, attachedFiles);
        setInputValue("");
        setAttachedFiles([]);
        onAttachmentsChange?.([]);
      }
    };

    /* ---------------------------------------------------------
      JSX Render
    --------------------------------------------------------- */
    return (
      <div className="w-full">
        <div className="w-full max-w-[950px] bg-[#2a2a2a] rounded-2xl px-4 py-3 shadow-lg border border-neutral-700">

          {/** TEXTAREA */}
          <Textarea
            ref={ref}
            id="kinber-chat-input"
            autoFocus
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange(e);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            style={{ backgroundColor: 'transparent' }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
            className={cn(
              'w-full bg-transparent border-none shadow-none focus-visible:ring-0 text-[14px] min-h-[28px] max-h-[160px] overflow-y-hidden resize-none leading-tight placeholder-neutral-500 text-gray-100'
            )}
            disabled={disabled && !isAgentRunning}
          />

          {/** ATTACHMENTS */}
          {attachedFiles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-4">
            {attachedFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative group w-32 p-2 rounded-lg border border-gray-700 bg-[#1f1f1f]"
              >
                {/* Thumbnail */}
                {renderAttachmentThumb(file)}

                {/* File name */}
                <div className="mt-2 text-xs text-gray-300 truncate">
                  {file.name}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => {
                    setAttachedFiles((prev) => {
                      const updated = prev.filter((_, idx) => idx !== i);
                      onAttachmentsChange?.(updated);
                      return updated;
                    });
                  }}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full px-1 text-xs opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          )}

          {/** FOOTER */}
          <div className="flex items-center justify-between w-full pt-2">

            {/** LEFT SIDE */}
            <div className="flex items-center gap-4 text-gray-400">
              {accessToken && (
                <span className="text-green-400 text-xs ml-2">
                  ✓ Drive Connected
                </span>
              )}

              <div className="relative" ref={plusRef}>
                <button
                  onClick={() => setIsPlusOpen((p) => !p)}
                  className="flex items-center gap-1 text-sm hover:text-white"
                >
                  <span className="-mt-1 text-2xl font-light">+</span>
                </button>

                {isPlusOpen && (
                  <div className="absolute bottom-10 left-0 w-56 border border-neutral-700 rounded-xl py-2 bg-[#4a4a4a] shadow-lg z-50">
                    {[
                      { icon: <Paperclip className="w-4 h-4" />, label: 'Attach', key: 'attach' },
                      {
                        icon: <Image src={DriveIcon} alt="Drive" width={16} height={16} />,
                        label: 'Add from Drive',
                        key: 'drive',
                      },
                      { icon: <Globe className="w-4 h-4" />, label: 'Web Search', key: 'web' },
                      { icon: <Github className="w-4 h-4" />, label: 'GitHub integration', key: 'github' },
                      { icon: <MoreIcon className="w-4 h-4" />, label: 'More..', key: 'more' },
                    ].map(({ icon, label, key }) => (
                      <button
                        key={key}
                        onClick={() => handleToolAction(key)}
                        className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-[#3a3a3a]"
                      >
                        {icon}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={toolsRef}>
                <button
                  onClick={() => setIsToolsOpen((p) => !p)}
                  className="flex items-center gap-2 text-sm hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                  <span>Tools</span>
                </button>

                {isToolsOpen && (
                  <div className="absolute bottom-10 left-0 w-56 border border-neutral-700 rounded-xl py-2 bg-[#4a4a4a] shadow-lg z-50">
                    {[
                      { icon: <Brain className="w-4 h-4" />, label: 'Deep research' },
                      { icon: <FileText className="w-4 h-4" />, label: 'Text summarizer' },
                      { icon: <Code2 className="w-4 h-4" />, label: 'Code generator' },
                      { icon: <BarChart2 className="w-4 h-4" />, label: 'Data visualizer' },
                      { icon: <MoreIcon className="w-4 h-4" />, label: 'More..' },
                    ].map(({ icon, label }) => (
                      <button
                        key={label}
                        onClick={() => console.log(label)}
                        className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-[#3a3a3a]"
                      >
                        {icon}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/** RIGHT SIDE */}
            <div className="flex items-center gap-3">
              <div className="relative" ref={agentRef}>
                <button
                  onClick={() => setIsAgentOpen((p) => !p)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
                >
                  <Image
                    src={SelectIcon}
                    alt="Select Agent"
                    width={16}
                    height={16}
                  />
                  <span>{SelectedAgent || "Select Agent"}</span>
                </button>

                {isAgentOpen && (
                  <div className="absolute bottom-10 right-0 w-64 border border-neutral-700 rounded-xl py-2 bg-[#4a4a4a] shadow-lg z-50">
                    {[
                      'Legal Agent',
                      'Financial Agent',
                      'Travel Planner',
                      'Code Debugger',
                      'Email Organizer',
                      'More..',
                    ].map((label) => (
                      <button
                        key={label}
                        onClick={() => {
                          setSelectedAgent(label);
                          setIsAgentOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-[#3a3a3a]"
                      >
                        <div className="w-3 h-3 rounded-full border border-gray-400" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isLoggedIn && (
                <button
                  className="p-2 rounded-md hover:bg-[#333]"
                  disabled={loading || (disabled && !isAgentRunning)}
                  title="Voice input coming soon"
                >
                  🎤
                </button>
              )}

              <MotionButton
                onClick={() => {
                  if (isAgentRunning && onStopAgent) {
                    onStopAgent();
                  } else {
                    const text = inputValue.trim();
                    if (!text) return;

                    onSubmit(text, attachedFiles);
                    setInputValue("");
                    setAttachedFiles([]);
                    onAttachmentsChange?.([]);
                  }
                }}
                disabled={inputValue.trim().length === 0 && attachedFiles.length === 0}
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full transition-all',
                  inputValue.trim().length > 0 || attachedFiles.length > 0
                    ? 'bg-white text-black shadow'
                    : 'border border-zinc-700 text-zinc-500'
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <ArrowUp className="h-4 w-4 text-white" />
                )}
              </MotionButton>
            </div>
          </div>
        </div>

        {/** QUICK ACTION BUTTONS */}
        <div className="w-full flex flex-wrap justify-center gap-3 mt-5 mb-2">
          {[
            { label: "Image", icon: <ImageIcon className="w-4 h-4" /> },
            { label: "Slides", icon: <SlidesIcon className="w-4 h-4" /> },
            { label: "Research", icon: <ResearchIcon className="w-4 h-4" /> },
            { label: "Data", icon: <DataIcon className="w-4 h-4" /> },
            { label: "Travel", icon: <TravelIcon className="w-4 h-4" /> },
            { label: "More", icon: <MoreIcon className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.label}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2a2a2a] border border-neutral-700 text-sm text-gray-300 hover:bg-[#3a3a3a]"
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
);

MessageInput.displayName = 'MessageInput';
export default MessageInput;
async function downloadGoogleSheetAsCsv(
  fileId: string,
  token: string
): Promise<{ blob: Blob; base64: string } | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      console.error(`Failed to export sheet ${fileId}:`, response.statusText);
      return null;
    }

    const blob = await response.blob();
    const base64 = await fileToBase64(new File([blob], `${fileId}.csv`));

    return { blob, base64 };
  } catch (err) {
    console.error("Error downloading Google Sheet as CSV:", err);
    return null;
  }
}
function previewCsv(name: string, base64: string) {
  try {
    // Decode base64 to string
    const csvString = atob(base64.split(',')[1] || base64);
    
    // Parse CSV into rows
    const rows = csvString.split('\n').map(row =>
      row.split(',').map(cell => cell.trim())
    ).filter(row => row.some(cell => cell)); // Remove empty rows
    
    // Set preview state
    setPreviewFileName(name);
    setPreviewRows(rows);
    setPreviewOpen(true);
  } catch (err) {
    console.error('Error parsing CSV:', err);
    alert('Failed to preview CSV file');
  }
}

