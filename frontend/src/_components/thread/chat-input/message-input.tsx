'use client';

import React,
{
  forwardRef,
  useEffect,
  useState,
  useRef,
  RefObject,
} from 'react';
import Image from 'next/image';
import SelectIcon from '@/../public/select.png';
import { Textarea } from '@/_components/ui/textarea';
import { cn } from '@/lib/utils';
import DatasetPreviewModal from "@/_components/modals/dataset-preview-modal";
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import DriveIcon from '@/../public/drive.png';

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

const MotionButton = motion.button;

type Attachment = {
  name: string;
  url: string;
  type?: string;
  size?: number;
  base64?: string | null;
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
      onTranscription, // currently unused but kept for future mic integration
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

    // Keep internal input in sync with parent
    useEffect(() => {
      setInputValue(value);
    }, [value]);

    // Auto-grow textarea
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

    // Supabase client
    const supabase = createClient();

    // Load Google Drive access token (first time only)
    useEffect(() => {
      const loadToken = async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.provider_token || null;

        if (token) {
          console.log("🔐 Google Drive token loaded:", token);
        }

        setAccessToken(token);
      };

      loadToken();
    }, []);

    // Listen for Supabase session changes (Google OAuth redirect)
    useEffect(() => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const token = session?.provider_token || null;

        if (token) {
          console.log("🔄 Google Drive token updated via session event:", token);
          setAccessToken(token);
        }
      });

      return () => subscription.unsubscribe();
    }, []);

    // ---------------------------------------------------------
    // GOOGLE DRIVE TOKEN (Picker Authentication)
    // ---------------------------------------------------------
    const [accessToken, setAccessToken] = useState<string | null>(null);

    useEffect(() => {
      const loadToken = async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.provider_token || null;
        setAccessToken(token);
      };

      loadToken();
    }, []); // ← run once only

    // ---------------------------------------------------------
    // UI STATE
    // ---------------------------------------------------------
    const [isPlusOpen, setIsPlusOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isAgentOpen, setIsAgentOpen] = useState(false);
    const [SelectedAgent, setSelectedAgent] = useState('');

    // CSV Preview UI State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFileName, setPreviewFileName] = useState<string | null>(null);
    const [previewRows, setPreviewRows] = useState<string[][]>([]);

    // Google Picker state
    const [pickerLoaded, setPickerLoaded] = useState(false);
    const [googleClientLoaded, setGoogleClientLoaded] = useState(false);

    // Google OAuth client id (from env)
    const GOOGLE_CLIENT_ID =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    // Refs for popovers
    const plusRef = useRef<HTMLDivElement>(null);
    const toolsRef = useRef<HTMLDivElement>(null);
    const agentRef = useRef<HTMLDivElement>(null);

    // Clear attachments when global event is dispatched
    useEffect(() => {
      const clearHandler = () => {
        setAttachedFiles([]);
        onAttachmentsChange?.([]);
      };
      window.addEventListener('attachments:cleared', clearHandler);
      return () => {
        window.removeEventListener('attachments:cleared', clearHandler);
      };
    }, [onAttachmentsChange]);

    // File → Base64 (for local uploads)
    const fileToBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    /* --------------------------------------------------------
      Detect dataset type using MIME or extension
    -------------------------------------------------------- */
    const detectDatasetType = (file: Attachment): string | null => {
      const name = file.name.toLowerCase();
      const type = file.type?.toLowerCase() || "";

      if (name.endsWith(".csv") || type.includes("text/csv")) return "csv";
      if (name.endsWith(".tsv") || type.includes("text/tab-separated-values")) return "tsv";
      if (
        name.endsWith(".xlsx") ||
        type.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      )
        return "xlsx";
      if (name.endsWith(".json") || type.includes("application/json")) return "json";
      if (name.endsWith(".ndjson")) return "ndjson";
      if (type.includes("google-apps.spreadsheet")) return "gsheet";
      if (name.endsWith(".pdf") || type.includes("application/pdf")) return "pdf";

      return null;
    };

    /* --------------------------------------------------------
      CSV PREVIEW (Simple + clean)
    -------------------------------------------------------- */
    const previewCsv = async (fileName: string, base64: string) => {
      try {
        const csvText = atob(base64.split(",")[1]);

        const rows = csvText
          .split("\n")
          .map((line) => line.split(",").map((c) => c.trim()));

        setPreviewFileName(fileName);
        setPreviewRows(rows);
        setPreviewOpen(true);

        console.log("CSV preview ready:", fileName);
      } catch (err) {
        console.error("CSV preview error:", err);
      }
    };

    /* --------------------------------------------------------
      Convert Google Sheets → CSV
    -------------------------------------------------------- */
    const downloadGoogleSheetAsCsv = async (
      fileId: string,
      accessToken: string
    ): Promise<{ base64: string; size: number } | null> => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!res.ok) {
          console.error("Sheet export error:", res.status);
          return null;
        }

        const blob = await res.blob();

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        return { base64, size: blob.size };
      } catch (err) {
        console.error("Sheet → CSV error:", err);
        return null;
      }
    };

    // Attach files (upload to Supabase + store base64; backend handles vision)
    const handleAttachFiles = async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept =
        '.pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg,.xls,.xlsx,.gif,.webp';

      input.onchange = async () => {
        const files = input.files ? Array.from(input.files) : [];
        if (!files.length) return;

        const uploaded: Attachment[] = [];

        for (const file of files) {
          const path = `attachments/${Date.now()}-${file.name}`;
          try {
            const { error: uploadError } = await supabase.storage
              .from('kinber_uploads')
              .upload(path, file, { cacheControl: '3600', upsert: false });

            if (uploadError) {
              console.error('Upload failed:', uploadError.message);
              alert(`Upload failed: ${uploadError.message}`);
              continue;
            }

            const { data } = supabase.storage
              .from('kinber_uploads')
              .getPublicUrl(path);

            const publicUrl = data?.publicUrl ?? '';
            if (!publicUrl) continue;

            const fileBase64 = await fileToBase64(file);

            const newEntry: Attachment = {
              name: file.name,
              url: publicUrl,
              type: file.type || 'file',
              size: file.size,
              base64: fileBase64,
            };

            uploaded.push(newEntry);
          } catch (err) {
            console.error('❌ Upload error:', err);
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

    // Handle tool actions from menus
    const handleToolAction = (key: string) => {
      switch (key) {
        case 'attach':
          handleAttachFiles();
          setIsPlusOpen(false);
          break;
        case 'drive':
          if (!accessToken) {
            signInWithGoogle().then((token) => {
              if (token) {
                setAccessToken(token);
                openGooglePicker(token);
              }
            });
          } else {
            openGooglePicker(accessToken);
          }
          setIsPlusOpen(false);
          break;
        case 'web':
        case 'github':
        case 'more':
          console.log('Feature not yet implemented:', key);
          setIsPlusOpen(false);
          break;
      }
    };

    // Handle keyboard submit
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = typeof inputValue === 'string' ? inputValue : '';
        if (text.trim()) {
          onSubmit(text, attachedFiles || []);
          setInputValue('');
          setAttachedFiles([]);
          onAttachmentsChange?.([]);
        }
      }
    };

    // Determine if submit button should be active
    const isActive = inputValue.trim().length > 0 || attachedFiles.length > 0;

    // Fetch file bytes from Google Drive using Drive API
    const fetchDriveFile = async (fileId: string, accessToken: string) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          console.error("Drive API error status:", res.status);
          return null;
        }

        const blob = await res.blob();

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        return { blob, base64 };
      } catch (e) {
        console.error("Drive download error:", e);
        return null;
      }
    };

    // Sign in with Google and get an access token for Drive
    const signInWithGoogle = async (): Promise<string | null> => {
      if (!googleClientLoaded) {
        alert("Google client is still loading. Please wait a moment and try again.");
        return null;
      }

      if (!GOOGLE_CLIENT_ID) {
        console.error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
        alert("Google client ID is not configured.");
        return null;
      }

      const gapi = (window as any).gapi;

      try {
        let auth2 = gapi.auth2?.getAuthInstance?.();
        if (!auth2) {
          auth2 = await gapi.auth2.init({
            client_id: GOOGLE_CLIENT_ID,
            scope: "https://www.googleapis.com/auth/drive.readonly",
          });
        }

        const user = await auth2.signIn();
        const token = user.getAuthResponse().access_token as string;
        console.log("Google access token:", token);
        return token;
      } catch (err) {
        console.error("Google sign-in error:", err);
        alert("Google sign-in failed. Please try again.");
        return null;
      }
    };

    // ---------------------------------------------------------
    // GOOGLE CLIENT + PICKER + AUTH INITIALIZATION
    // ---------------------------------------------------------
    useEffect(() => {
      if ((window as any).__googleApiLoaded) return;
      (window as any).__googleApiLoaded = true;

      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;

      script.onload = () => {
        console.log("📌 Google API script loaded");

        // 1) Load gapi client and auth2
        window.gapi.load("client:auth2", async () => {
          try {
            await window.gapi.client.init({
              clientId: GOOGLE_CLIENT_ID,
              scope: "https://www.googleapis.com/auth/drive.readonly",
            });

            await window.gapi.auth2.init({
              client_id: GOOGLE_CLIENT_ID,
              scope: "https://www.googleapis.com/auth/drive.readonly",
            });

            console.log("📌 Google Auth2 initialized");
            setGoogleClientLoaded(true);
          } catch (err) {
            console.error("❌ Google Auth2 initialization failed:", err);
          }
        });

        // 2) Load Picker API separately
        window.gapi.load("picker", () => {
          console.log("📌 Google Picker loaded");
          setPickerLoaded(true);
        });
      };

      document.body.appendChild(script);
    }, [GOOGLE_CLIENT_ID]);

    // ---------------------------------------------------------
    // Create & open Google Drive Picker
    // ---------------------------------------------------------
    const openGooglePicker = (accessToken: string) => {
      const google = (window as any).google;

      if (!pickerLoaded || !google || !google.picker) {
        alert("Google Picker is still loading. Try again in 1–2 seconds.");
        return;
      }

      // Views: show Files + Folders + Upload
      const viewDocs = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setParent("root")
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMode(google.picker.DocsViewMode.LIST)
        .setMimeTypes("*/*");

      const viewDrive = new google.picker.DocsView(google.picker.ViewId.DRIVE)
        .setParent("root")
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMode(google.picker.DocsViewMode.LIST)
        .setMimeTypes("*/*");

      const viewUpload = new google.picker.DocsUploadView();

      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(accessToken)
        .addView(viewDocs)
        .addView(viewDrive)
        .addView(viewUpload)
        .setCallback(async (data: any) => {
          if (data.action !== google.picker.Action.PICKED) return;

          const pickedDocs = data.docs || [];
          console.log("Picked documents:", pickedDocs);

          let addedCount = 0; // ✅ REQUIRED

          for (const doc of pickedDocs) {
            const fileId = doc.id;
            const fileName = doc.name;
            const mimeType = doc.mimeType || "";
            const lowerName = fileName.toLowerCase();

            console.log("Processing:", fileName, mimeType);

            // --------------------------------------------------------
            // GOOGLE SHEETS → Export as CSV
            // --------------------------------------------------------
            if (mimeType.includes("spreadsheet")) {
              const sheetCsv = await downloadGoogleSheetAsCsv(fileId, accessToken);

              if (!sheetCsv) {
                console.error("❌ Failed to convert Google Sheet:", fileName);
                continue;
              }

              const { base64, size } = sheetCsv;

              const newAttachment: Attachment = {
                name: fileName.replace(/\.[^/.]+$/, "") + ".csv", // strips extension safely
                url: `https://drive.google.com/uc?id=${fileId}&export=download`,
                type: "text/csv",
                size,
                base64,
              };

              setAttachedFiles((prev) => {
                const updated = [...prev, newAttachment];
                onAttachmentsChange?.(updated);
                return updated;
              });

              // Preview CSV (optional)
              previewCsv(newAttachment.name, base64);

              addedCount++;
              continue; // Skip normal logic
            }

            // --------------------------------------------------------
            // NORMAL FILE DOWNLOAD HANDLING
            // --------------------------------------------------------
            const downloaded = await fetchDriveFile(fileId, accessToken);

            if (!downloaded) {
              console.error("❌ Failed to download:", fileName);
              continue;
            }

            const { blob, base64 } = downloaded;

            const newAttachment: Attachment = {
              name: fileName,
              url: `https://drive.google.com/uc?id=${fileId}&export=download`,
              type: mimeType,
              size: blob.size,
              base64,
            };

            setAttachedFiles((prev) => {
              const updated = [...prev, newAttachment];
              onAttachmentsChange?.(updated);
              return updated;
            });

            // Optional CSV preview
            if (lowerName.endsWith(".csv") || mimeType.includes("csv")) {
              previewCsv(fileName, base64);
            }

            addedCount++;
          }

    // --------------------------------------------------------
    // FINAL ALERT INSIDE CALLBACK
    // --------------------------------------------------------
    alert(`Added ${addedCount} file(s) from Google Drive`);
  });

  picker.setVisible(true);
};

// Render
    return (
      <div className="w-full">
        <div className="w-full max-w-[950px] bg-[#2a2a2a] rounded-2xl px-4 py-3 shadow-lg border border-neutral-700">
          {/* TEXTAREA */}
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

          {/* ATTACHMENT PREVIEW */}
          {attachedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachedFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 px-2 py-1 rounded-md border border-gray-700 text-xs text-gray-300 bg-[#1f1f1f]"
                >
                  <span>📎</span>
                  <a href={file.url} target="_blank" rel="noreferrer">
                    {file.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFiles((prev) => {
                        const updated = prev.filter((_, idx) => idx !== i);
                        onAttachmentsChange?.(updated);
                        return updated;
                      });
                    }}
                    className="text-gray-400 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* FOOTER */}
          <div className="flex items-center justify-between w-full pt-2">
            {/* LEFT — + Menu + Tools */}
            <div className="flex items-center gap-4 text-gray-400">
          {/* PLUS BUTTON */}
          {accessToken && (
            <span className="text-green-400 text-xs ml-2">
              ✓ Drive Connected
            </span>
          )}
              <div className="relative" ref={plusRef}>
                <button
                  type="button"
                  onClick={() => setIsPlusOpen((prev) => !prev)}
                  className="flex items-center gap-1 text-sm hover:text-white transition"
                >
                  <span className="text-2xl font-light leading-none -mt-1">
                    +
                  </span>
                </button>

                {isPlusOpen && (
                  <div className="absolute bottom-10 left-0 w-56 border border-neutral-700 rounded-xl py-2 bg-[#4a4a4a] backdrop-blur-sm shadow-lg z-50">
                    {[
                      {
                        icon: <Paperclip className="w-4 h-4" />,
                        label: 'Attach',
                        key: 'attach' as const,
                      },
                      {
                        icon: (
                          <Image
                            src={DriveIcon}
                            alt="Google Drive"
                            width={16}
                            height={16}
                            className="opacity-90"
                          />
                        ),
                        label: 'Add from Drive',
                        key: 'drive' as const,
                      },
                      {
                        icon: <Globe className="w-4 h-4" />,
                        label: 'Web Search',
                        key: 'web' as const,
                      },
                      {
                        icon: <Github className="w-4 h-4" />,
                        label: 'GitHub integration',
                        key: 'github' as const,
                      },
                      {
                        icon: <MoreIcon className="w-4 h-4" />,
                        label: 'More..',
                        key: 'more' as const,
                      },
                    ].map(({ icon, label, key }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleToolAction(key)}
                        className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-[#3a3a3a] transition-all"
                      >
                        {icon}
                        <span className="text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* TOOLS BUTTON */}
              <div className="relative" ref={toolsRef}>
                <button
                  type="button"
                  onClick={() => setIsToolsOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-sm hover:text-white transition"
                >
                  <Settings className="w-4 h-4" />
                  <span>Tools</span>
                </button>

                {isToolsOpen && (
                  <div className="absolute bottom-10 left-0 w-56 border border-neutral-700 rounded-xl py-2 bg-[#4a4a4a] backdrop-blur-sm shadow-lg z-50">
                    {[
                      {
                        icon: <Brain className="w-4 h-4" />,
                        label: 'Deep research',
                      },
                      {
                        icon: <FileText className="w-4 h-4" />,
                        label: 'Text summarizer',
                      },
                      {
                        icon: <Code2 className="w-4 h-4" />,
                        label: 'Code generator',
                      },
                      {
                        icon: <BarChart2 className="w-4 h-4" />,
                        label: 'Data visualizer',
                      },
                      {
                        icon: <MoreIcon className="w-4 h-4" />,
                        label: 'More..',
                      },
                    ].map(({ icon, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => console.log(label)}
                        className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-[#3a3a3a] transition-all"
                      >
                        {icon}
                        <span className="text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Agent + Mic + Submit */}
            <div className="flex items-center gap-3">
              {/* AGENT MENU */}
              <div className="relative" ref={agentRef}>
                <button
                  type="button"
                  onClick={() => setIsAgentOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
                >
                  <Image
                    src={SelectIcon}
                    alt="Select Agent"
                    width={16}
                    height={16}
                    className="opacity-80"
                  />
                  <span className="text-sm text-gray-400">
                    {SelectedAgent || 'Select Agent'}
                  </span>
                </button>

                {isAgentOpen && (
                  <div className="absolute bottom-10 right-0 w-64 border border-neutral-700 rounded-xl py-2 bg-[#4a4a4a] backdrop-blur-sm shadow-lg z-50">
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
                        type="button"
                        onClick={() => {
                          setSelectedAgent(label);
                          setIsAgentOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-[#3a3a3a] transition-all"
                      >
                        <div className="w-3 h-3 rounded-full border border-gray-400" />
                        <span className="text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* MIC (Passive Placeholder) */}
              {isLoggedIn && (
                <button
                  type="button"
                  className="p-2 rounded-md hover:bg-[#333] transition flex items-center justify-center"
                  title="Voice input coming soon"
                  disabled={loading || (disabled && !isAgentRunning)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-gray-400"
                  >
                    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                    <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.08A7 7 0 0 0 19 11z" />
                  </svg>
                </button>
              )}

              {/* SUBMIT BUTTON */}
              <MotionButton
                type="button"
                onClick={() => {
                  if (isAgentRunning && onStopAgent) {
                    onStopAgent();
                  } else {
                    const text = typeof inputValue === 'string' ? inputValue : '';
                    if (!text.trim()) return;

                    onSubmit(text, attachedFiles || []);
                    setInputValue('');
                    setAttachedFiles([]);
                    onAttachmentsChange?.([]);
                  }
                }}
                disabled={!isActive || (disabled && !isAgentRunning)}
                className={cn(
                  'flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-full transition-all duration-300',
                  isActive
                    ? 'bg-white text-black shadow-[0_0_8px_rgba(255,255,255,0.4)] hover:shadow-[0_0_12px_rgba(255,255,255,0.7)]'
                    : 'border border-zinc-700 text-zinc-500 bg-transparent'
                )}
              >
                {loading ? (
                  <Loader2
                    className={cn(
                      'h-4 w-4 animate-spin',
                      isActive ? 'text-white' : 'text-gray-400'
                    )}
                  />
                ) : (
                  <ArrowUp
                    className={cn(
                      'h-4 w-4',
                      isActive ? 'text-white' : 'text-gray-400'
                    )}
                  />
                )}
              </MotionButton>
            </div>
          </div>
        </div>

        {/* FOOTER SHORTCUTS - Outside the chat input panel */}
        <div className="w-full flex flex-wrap justify-center gap-3 mt-5 mb-2">
          {[
            { label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
            { label: 'Slides', icon: <SlidesIcon className="w-4 h-4" /> },
            { label: 'Research', icon: <ResearchIcon className="w-4 h-4" /> },
            { label: 'Data', icon: <DataIcon className="w-4 h-4" /> },
            { label: 'Travel', icon: <TravelIcon className="w-4 h-4" /> },
            { label: 'More', icon: <MoreIcon className="w-4 h-4" /> },
          ].map((tool) => (
            <button
              key={tool.label}
              type="button"
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2a2a2a] border border-neutral-700 text-sm text-[rgb(180,180,180)] hover:bg-[#3a3a3a] hover:text-white"
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
);

MessageInput.displayName = 'MessageInput';
export default MessageInput;
