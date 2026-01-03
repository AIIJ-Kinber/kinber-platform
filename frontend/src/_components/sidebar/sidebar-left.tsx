'use client';

import * as React from 'react';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  Key,
  Search,
  MessageSquare,
  Home,
  LogOut,
} from 'lucide-react';

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

/* ────────────────────────────────────────────────
   SidebarLeft (Provider wrapper)
   IMPORTANT: useSidebar() MUST be inside SidebarProvider
────────────────────────────────────────────────── */
export function SidebarLeft(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <SidebarProvider>
      <SidebarLeftInner {...props} />
    </SidebarProvider>
  );
}

/* ────────────────────────────────────────────────
   SidebarLeftInner
────────────────────────────────────────────────── */
function SidebarLeftInner(props: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const { state, setOpen } = useSidebar();

  const [recents, setRecents] = useState<any[]>([]);
  const [user, setUser] = useState({
    name: 'Loading...',
    email: '',
    avatar: '',
  });

  // ✅ Single modal state (prevents multi-open / weird UI states)
  type ActiveModal = 'search' | 'history' | 'credentials' | null;
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const closeAllModals = useCallback(() => {
    setActiveModal(null);
  }, []);

  /* Toggle sidebar */
  const toggleSidebar = useCallback(() => {
    setOpen(state === 'collapsed');
  }, [state, setOpen]);

  /* Logout */
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  }, [supabase, router]);

  /* Fetch user */
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
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
    });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* Fetch recents + realtime */
  useEffect(() => {
    const loadRecents = async () => {
      const { data, error } = await supabase
        .from('threads')
        .select('thread_id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (!error) setRecents(data || []);
    };

    loadRecents();

    const channel = supabase
      .channel('threads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads' },
        () => loadRecents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <>
      <Sidebar
        collapsible="icon"
        className={cn(
          'bg-gradient-to-b from-[#161616] to-[#1e1e1e] text-gray-100',
          'border-none flex flex-col h-screen',
          state === 'collapsed' ? 'w-[70px]' : 'w-[250px]'
        )}
        {...props}
      >
        {/* Header */}
        <div className="border-b border-neutral-800 px-3 py-3">
          <div className="flex items-center gap-2">
            <div onClick={toggleSidebar} className="cursor-pointer select-none">
              <KinberLogo />
            </div>

            {state !== 'collapsed' && (
              <Image
                src="/kbm.png"
                alt="KBM"
                width={140}
                height={40}
                className="ml-2 opacity-90"
              />
            )}
          </div>

          {/* New Chat */}
          <div
            onClick={() => {
              sessionStorage.removeItem('kinber:firstMessage');
              sessionStorage.removeItem('kinber:firstAttachments');
              router.push('/welcome');
            }}
            className={cn(
              'mt-4 flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent/40',
              pathname === '/welcome' && 'bg-accent font-semibold',
              state === 'collapsed' && 'justify-center px-0'
            )}
          >
            <MessageSquare className="h-5 w-5" />
            {state !== 'collapsed' && <span>New Chat</span>}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <SidebarItem
            collapsed={state === 'collapsed'}
            icon={Search}
            label="Search Chat"
            onClick={() => router.push('/dashboard?modal=search')}
          />

          <SidebarItem
            collapsed={state === 'collapsed'}
            icon={Shield}
            label="Chat History"
            onClick={() => router.push('/dashboard?modal=history')}
          />

          <SidebarItem
            collapsed={state === 'collapsed'}
            icon={Key}
            label="Credentials"
            onClick={() => router.push('/dashboard?modal=credentials')}
          />

          <SidebarItem
            collapsed={state === 'collapsed'}
            icon={Home}
            label="Home"
            onClick={() => router.push('/')}
          />

          {state !== 'collapsed' && (
            <div className="mt-5">
              <div className="text-xs uppercase text-gray-400 mb-2">
                Recents
              </div>

              {recents.length === 0 ? (
                <div className="text-xs text-gray-500 px-2 py-2">
                  No recent chats
                </div>
              ) : (
                recents.map((t) => (
                  <RecentItem
                    key={t.thread_id}
                    thread={t}
                    router={router}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 px-4 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-md px-2 py-2">
                <Image
                  src={user.avatar || '/user.png'}
                  alt="User"
                  width={36}
                  height={36}
                  className="rounded-full"
                />
                {state !== 'collapsed' && (
                  <div className="truncate">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {user.email}
                    </div>
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Sidebar>
    </>
  );
}


/* ────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────── */
function SidebarItem({
  icon: Icon,
  label,
  onClick,
  collapsed,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent/40 transition-colors',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className="h-5 w-5" />
      {!collapsed && <span>{label}</span>}
    </div>
  );
}

function RecentItem({
  thread,
  router,
}: {
  thread: any;
  router: ReturnType<typeof useRouter>;
}) {
  const searchParams = useSearchParams();
  const active = searchParams?.get('thread_id') === thread.thread_id;

  return (
    <div
      onClick={() => router.push(`/dashboard?thread_id=${thread.thread_id}`)}
      className={cn(
        'px-3 py-2 rounded-md cursor-pointer truncate transition-colors',
        active ? 'bg-[#2a2a2a] text-white' : 'hover:bg-[#2a2a2a] text-gray-200'
      )}
      title={thread.title || 'Untitled Chat'}
    >
      {thread.title || 'Untitled Chat'}
    </div>
  );
}
