
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
  Layers,
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

  const toggleSidebar = () => setOpen(state === 'collapsed');

  /* Logout */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  /* Fetch user */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
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
  }, [supabase]);

  /* Fetch recents */
  const loadRecents = useCallback(async () => {
    const { data } = await supabase
      .from('threads')
      .select('thread_id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    setRecents(data || []);
  }, [supabase]);

  useEffect(() => {
    loadRecents();

    const channel = supabase
      .channel('threads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads' },
        loadRecents
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadRecents]);

  /* ✅ THIS WAS MISSING — RETURN STARTS HERE */
  return (
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
            <span className="text-[1.5625rem] font-normal tracking-wide text-orange-400">
              Kinber
            </span>
          )}
        </div>

        {/* New Chat — ALWAYS VISIBLE */}
        <div
          onClick={() => router.push('/welcome')}
          className="mt-4 flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-[#2a2a2a]"
        >
          <MessageSquare className="h-5 w-5" />
          {state !== 'collapsed' && <span>New Chat</span>}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <SidebarItem
          collapsed={state === 'collapsed'}
          icon={Home}
          label="Home"
          onClick={() => router.push('/')}
        />

        <SidebarItem
          collapsed={state === 'collapsed'}
          icon={Layers}
          label="Triplet"
          onClick={() => router.push('/triplet')}
        />

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

        {/* Recents */}
        {state !== 'collapsed' && (
          <div className="mt-6">
            <div className="text-sm font-normal uppercase text-orange-400 mb-2 px-1 tracking-wide">
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
                  supabase={supabase}
                  onDeleted={loadRecents}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 px-3 py-3">
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
                <div>
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
              )}
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            sideOffset={8}
            className="bg-[#1e1e1e] text-gray-200 rounded-lg p-1 border-0 shadow-lg"
          >
            <DropdownMenuItem
              onClick={handleLogout}
              className="px-3 py-2 rounded-md hover:bg-[#2a2a2a] text-red-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Sidebar>
  );
}

/* ────────────────────────────────────────────────
   RecentItem
────────────────────────────────────────────────── */
function RecentItem({ thread, router, supabase, onDeleted }: any) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState(thread.title || 'Untitled Chat');

  const searchParams = useSearchParams();
  const active = searchParams?.get('thread_id') === thread.thread_id;

  const saveRename = async () => {
    const clean = title.trim();
    if (!clean) return setIsRenaming(false);

    await supabase
      .from('threads')
      .update({ title: clean })
      .eq('thread_id', thread.thread_id);

    setIsRenaming(false);
  };

  const deleteThread = async () => {
    if (!confirm('Delete this chat?')) return;

    await supabase.from('threads').delete().eq('thread_id', thread.thread_id);
    onDeleted();
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
        active
          ? 'bg-[#303030] text-white border border-neutral-600'
          : 'text-gray-300 hover:bg-[#2a2a2a]'
      )}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveRename}
          className="flex-1 bg-[#1f1f1f] border border-neutral-700 rounded px-2 py-1 text-sm"
        />
      ) : (
        <div
          onClick={() =>
            router.push(`/dashboard?thread_id=${thread.thread_id}`)
          }
          className="flex-1 truncate cursor-pointer text-sm"
        >
          {title}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hover:bg-[#3a3a3a] rounded px-2 py-1">⋮</button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="bg-[#1e1e1e] text-gray-200 rounded-lg p-1 border-0 shadow-lg"
        >
          <DropdownMenuItem onClick={() => setIsRenaming(true)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={deleteThread}
            className="text-red-400"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ────────────────────────────────────────────────
   SidebarItem
────────────────────────────────────────────────── */
function SidebarItem({
  icon: Icon,
  label,
  onClick,
  collapsed,
}: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-[#2a2a2a]',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className="h-5 w-5" />
      {!collapsed && <span className="text-sm">{label}</span>}
    </div>
  );
}
