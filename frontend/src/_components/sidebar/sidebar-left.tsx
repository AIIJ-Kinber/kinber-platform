'use client';

import * as React from 'react';
import {
  Shield,
  Key,
  Search,
  MessageSquare,
  MoreVertical,
  Pencil,
  Trash2,
  Home,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { KinberLogo } from '@/_components/sidebar/kinber-logo';
import {
  Sidebar,
  SidebarProvider,
  useSidebar,
} from '@/_components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu';

import { LogOut, User, CreditCard, Settings } from 'lucide-react';

// ✅ Local Modals
import { SearchChatModal } from './search-chat-modal';
import { ChatHistoryModal } from './chat-history-modal';
import { CredentialsModal } from './credentials-modal';

/* ────────────────────────────────────────────────
   SidebarLeft Component
────────────────────────────────────────────────── */
export function SidebarLeft({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const supabase = createClient();   // ✅ must come BEFORE handleLogout

  // ✅ Logout Function (correct placement)
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const { state, setOpen } = useSidebar();
  const pathname = usePathname();

  const [recents, setRecents] = useState<any[]>([]);
  const [user, setUser] = useState({
    name: 'Loading...',
    email: 'loading@example.com',
    avatar: '',
  });

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  /* 🧭 Sidebar toggle */
  const toggleSidebar = useCallback(() => {
    setOpen(state === 'collapsed');
    window.dispatchEvent(
      new CustomEvent('sidebar-left-toggled', {
        detail: { expanded: state !== 'expanded' },
      })
    );
  }, [state, setOpen]);

  /* 👤 Fetch User Info */
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error?.message?.includes('Auth session missing')) {
          console.warn('⚠️ No active Supabase session — skipping user fetch.');
          return;
        }
        if (data?.user) {
          setUser({
            name:
              data.user.user_metadata?.name ||
              data.user.email?.split('@')[0] ||
              'User',
            email: data.user.email || '',
            avatar: data.user.user_metadata?.avatar_url || '',
          });
        }
      } catch (err) {
        console.error('❌ Failed to fetch user info:', err);
      }
    };
    fetchUserData();
  }, [supabase]);

  /* 🔁 Fetch Recents + Live Updates */
  useEffect(() => {
    const fetchRecents = async () => {
      try {
        const { data, error } = await supabase
          .from('threads')
          .select('thread_id, title, summary, metadata, updated_at, created_at')
          .order('updated_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        setRecents(data || []);
      } catch (err) {
        console.error('❌ Error fetching recents:', err);
      }
    };

    fetchRecents();
    const subscription = supabase
      .channel('threads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads' },
        fetchRecents
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase]);

/* 🔁 WebSocket live updates (DISABLED — backend does not support WS yet)
        Prevents 403 spam and /api/api URL mistakes
    */
    useEffect(() => {
        console.log("ℹ️ WebSocket updates disabled — backend has no /api/thread/updates endpoint.");
        return () => {};
    }, []);
  /* ──────────────────────────────────────────────── */
  return (
    <>
      <SidebarProvider>
        <Sidebar
          collapsible="icon"
          className={cn(
            'transition-[width] duration-300 ease-in-out border-none',
            'bg-gradient-to-b from-[#161616] to-[#1e1e1e] text-gray-100 backdrop-blur-sm',
            'overflow-hidden relative z-[50] flex flex-col h-screen',
            state === 'collapsed' ? 'w-[70px]' : 'w-[250px]'
          )}
          {...props}
        >
          {/* ... everything inside sidebar stays SAME ... */}

          {/* ─── Fixed Footer ───────────────────────── */}
          <div className="flex-shrink-0 border-t border-neutral-800 px-4 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 px-1 py-2 cursor-pointer hover:bg-[#2a2a2a] rounded-md transition">
                  <Image
                    src={user.avatar || '/user.png'}
                    alt="User Avatar"
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full border border-gray-600 object-cover"
                  />
                  {state !== 'collapsed' && (
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-semibold text-gray-100 truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-gray-400 truncate">
                        {user.email}
                      </span>
                    </div>
                  )}
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="right"
                align="start"
                className="w-48 bg-[#1f1f1f] border border-gray-700 text-gray-100 rounded-md shadow-2xl"
              >
                <DropdownMenuItem className="cursor-default text-sm text-gray-300">
                  Signed in as<br />
                  <span className="font-semibold text-white">{user.email}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push('/profile')}
                  className="cursor-pointer hover:bg-gray-700 text-sm gap-2"
                >
                  <Key className="h-4 w-4 text-gray-300" />
                  Profile / Settings
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push('/billing')}
                  className="cursor-pointer hover:bg-gray-700 text-sm gap-2"
                >
                  <Shield className="h-4 w-4 text-gray-300" />
                  Subscription
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer hover:bg-gray-700 text-sm text-red-400 gap-2 mt-1"
                >
                  <LogOut className="h-4 w-4 text-red-400" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Sidebar>
      </SidebarProvider>

      {/* ─── Global Modals (outside sidebar) ─── */}
      {showSearchModal && (
        <SearchChatModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {showChatHistory && (
        <ChatHistoryModal
          isOpen={showChatHistory}
          onClose={() => setShowChatHistory(false)}
        />
      )}

      {showCredentials && (
        <CredentialsModal
          isOpen={showCredentials}
          onClose={() => setShowCredentials(false)}
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────
   RecentItem Component
────────────────────────────────────────────────── */
function RecentItem({
  thread,
  supabase,
  router,
  setRecents,
}: {
  thread: any;
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof useRouter>;
  setRecents: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempTitle, setTempTitle] = React.useState(
    thread.title || 'Untitled Chat'
  );

  const handleRename = async () => {
    const trimmed = tempTitle.trim();
    if (!trimmed || trimmed === thread.title) return setIsEditing(false);

    const { error } = await supabase
      .from('threads')
      .update({ title: trimmed })
      .eq('thread_id', thread.thread_id);
    if (!error) {
      setRecents((prev) =>
        prev.map((t) =>
          t.thread_id === thread.thread_id ? { ...t, title: trimmed } : t
        )
      );
    }
    setIsEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this chat?')) return;
    try {
      await supabase.from('messages').delete().eq('thread_id', thread.thread_id);
      await supabase.from('threads').delete().eq('thread_id', thread.thread_id);
      setRecents((prev) =>
        prev.filter((t) => t.thread_id !== thread.thread_id)
      );
    } catch (err) {
      console.error('⚠️ Delete error:', err);
    }
  };

  const handleOpenThread = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const targetUrl = `/dashboard?thread_id=${thread.thread_id}`;
    if (window.location.pathname + window.location.search !== targetUrl) {
      router.push(targetUrl);
    }
  };

  // ✅ Clean summary text for rendering
  const cleanSummary = React.useMemo(() => {
    if (!thread.summary) return '';
    if (typeof thread.summary === 'string') {
      return thread.summary
        .replace(/^```json|```$/g, '')
        .replace(/[{}`"]/g, '')
        .replace(/title:\s*/gi, '')
        .trim();
    }
    return thread.summary?.summary || '';
  }, [thread.summary]);

  // ✅ Reactive detection via Next.js navigation hooks
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeThreadId = searchParams?.get('thread_id') ?? null;
  const isActive = thread.thread_id === activeThreadId;

  return (
    <div
      onClick={handleOpenThread}
      className={cn(
        'group relative flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all duration-300 ease-in-out',
        isActive
          ? 'bg-[#1b1b1b] text-white border border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.25)] scale-[1.03]'
          : 'hover:bg-[#2a2a2a] text-gray-300 border border-transparent'
      )}
      title={thread.title || 'Untitled Chat'}
    >
      {/* ✅ Animated left accent */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-[3px] rounded-r-sm transition-all duration-300',
          isActive ? 'bg-[#cc5500] opacity-100' : 'bg-transparent opacity-0'
        )}
      />

      {/* Thread Title */}
      <div className="flex-1 flex items-center gap-2 truncate pl-1.5">
        <MessageSquare
          className={cn(
            'h-4 w-4 shrink-0 transition-colors duration-300',
            isActive ? 'text-[#cc5500]' : 'text-muted-foreground'
          )}
        />
        {isEditing ? (
          <input
            className="flex-1 bg-transparent border-b border-gray-600 focus:border-gray-300 outline-none text-sm text-gray-100 px-1"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onBlur={handleRename}
            autoFocus
          />
        ) : (
          <span
            className={cn(
              'truncate text-sm select-none transition-colors duration-300',
              isActive ? 'text-white font-semibold' : 'text-gray-100'
            )}
          >
            {thread.title || 'Untitled Chat'}
          </span>
        )}
      </div>

      {/* 🧩 Rename / Delete hover actions */}
      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white p-1">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-32 bg-[#1f1f1f] border border-gray-700 text-gray-100 rounded-md shadow-2xl"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="cursor-pointer hover:bg-gray-700 text-sm gap-2"
            >
              <Pencil className="h-4 w-4 text-gray-300" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="cursor-pointer hover:bg-gray-700 text-sm text-red-400 gap-2"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
