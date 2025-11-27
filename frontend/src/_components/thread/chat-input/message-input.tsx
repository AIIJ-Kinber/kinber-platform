'use client';

import React, {
  forwardRef,
  useEffect,
  useState,
  useRef,
  RefObject,
} from 'react';
import Image from 'next/image';
import { Textarea } from '@/_components/ui/textarea';
import { cn } from '@/lib/utils';
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
  Grid,
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

    // Supabase client (using app wrapper)
    const supabase = createClient();

    // UI state
    const [isPlusOpen, setIsPlusOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
    const [selectedAdvisor, setSelectedAdvisor] = useState('');

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

    // Refs for popovers
    const plusRef = useRef<HTMLDivElement>(null);
    const toolsRef = useRef<HTMLDivElement>(null);
    const advisorRef = useRef<HTMLDivElement>(null);

    // File → Base64
    const fileToBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    // Attach files (upload to Supabase + store base64 only; backend handles vision)
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

    // Tool actions (stubs for now)
    const handleDriveImport = () => {
      console.log('Drive Import clicked');
    };

    const handleDeepResearch = () => {
      console.log('Deep Research clicked');
    };

    const handleWebSearch = () => {
      console.log('Web Search clicked');
    };

    const handleGitHubImport = () => {
      console.log('GitHub Import clicked');
    };

    const handleToolAction = (tool: 'attach' | 'drive' | 'research' | 'web' | 'github' | 'more') => {
      switch (tool) {
        case 'attach':
          void handleAttachFiles();
          break;
        case 'drive':
          handleDriveImport();
          break;
        case 'research':
          handleDeepResearch();
          break;
        case 'web':
          handleWebSearch();
          break;
        case 'github':
          handleGitHubImport();
          break;
        case 'more':
        default:
          console.log('Tool not implemented:', tool);
      }
      setIsPlusOpen(false);
    };

    // Close popovers when clicking outside
    useEffect(() => {
      const onDown = (e: MouseEvent) => {
        const target = e.target as Node;
        if (plusRef.current && !plusRef.current.contains(target)) {
          setIsPlusOpen(false);
        }
        if (toolsRef.current && !toolsRef.current.contains(target)) {
          setIsToolsOpen(false);
        }
        if (advisorRef.current && !advisorRef.current.contains(target)) {
          setIsAdvisorOpen(false);
        }
      };

      document.addEventListener('mousedown', onDown);
      return () => {
        document.removeEventListener('mousedown', onDown);
      };
    }, []);

    // Submit on Enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (inputValue.trim() && !loading && (!disabled || isAgentRunning)) {
          const text = typeof inputValue === 'string' ? inputValue : '';
          onSubmit(text, attachedFiles || []);
          setInputValue('');
          setAttachedFiles([]);
          onAttachmentsChange?.([]);
        }
      }
    };

    const isActive = inputValue.trim().length > 0 && !loading;

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

            {/* RIGHT — Advisor + Mic + Submit */}
            <div className="flex items-center gap-3">
              {/* ADVISOR MENU */}
              <div className="relative" ref={advisorRef}>
                <button
                  type="button"
                  onClick={() => setIsAdvisorOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-sm hover:text-white transition"
                >
                  <Grid className="w-4 h-4" />
                  <span>{selectedAdvisor || 'Select advisor'}</span>
                </button>

                {isAdvisorOpen && (
                  <div className="absolute bottom-10 right-0 w-64 border border-neutral-700 rounded-xl py-2 bg-[#4a4a4a] backdrop-blur-sm shadow-lg z-50">
                    {[
                      'Legal advisor',
                      'Financial advisor',
                      'Travel Planner',
                      'Code Debugger',
                      'Email Organizer',
                      'More..',
                    ].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setSelectedAdvisor(label);
                          setIsAdvisorOpen(false);
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
                    const text =
                      typeof inputValue === 'string' ? inputValue : '';
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
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
