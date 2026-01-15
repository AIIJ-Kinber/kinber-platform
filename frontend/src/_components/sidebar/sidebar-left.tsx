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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  /* ✅ FIXED: Fetch user and store user ID */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        // Store user ID for filtering queries
        setCurrentUserId(data.user.id);
        
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

  /* ✅ FIXED: Fetch recents with USER ISOLATION */
  const loadRecents = useCallback(async () => {
    // Don't load until we have user ID
    if (!currentUserId) {
      console.log('⏳ Waiting for user ID before loading recents...');
      return;
    }

    console.log('📂 Loading recents for user:', currentUserId);

    // ✅ CRITICAL FIX: Filter by user_id!
    const { data, error } = await supabase
      .from('threads')
      .select('thread_id, title, updated_at')
      .eq('user_id', currentUserId)  // ← CRITICAL: Only show THIS user's threads!
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error loading recents:', error);
      return;
    }

    console.log(`✅ Loaded ${data?.length || 0} recent threads for user`);
    setRecents(data || []);
  }, [supabase, currentUserId]);

  useEffect(() => {
    loadRecents();

    // ✅ FIXED: Realtime updates also filtered by user
    const channel = supabase
      .channel('threads-realtime')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'threads',
          filter: `user_id=eq.${currentUserId}` // ← Only listen to THIS user's changes
        },
        () => {
          console.log('🔄 Thread updated, reloading recents...');
          loadRecents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadRecents, currentUserId]);

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
          className="mt-4 flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-[#2a2a2a] transition-colors"
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
                {currentUserId ? 'No recent chats' : 'Loading...'}
              </div>
            ) : (
              recents.map((t) => (
                <RecentItem
                  key={t.thread_id}
                  thread={t}
                  router={router}
                  supabase={supabase}
                  currentUserId={currentUserId}
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
            <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-md px-2 py-2 transition-colors">
              <Image
                src={user.avatar || '/user.png'}
                alt="User"
                width={36}
                height={36}
                className="rounded-full"
              />
              {state !== 'collapsed' && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{user.name}</div>
                  <div className="text-xs text-gray-400 truncate">{user.email}</div>
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
              className="px-3 py-2 rounded-md hover:bg-[#2a2a2a] text-red-400 cursor-pointer transition-colors"
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
function RecentItem({ thread, router, supabase, currentUserId, onDeleted }: any) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState(thread.title || 'Untitled Chat');

  const searchParams = useSearchParams();
  const active = searchParams?.get('thread_id') === thread.thread_id;

  /* ✅ FIXED: Save rename with user validation */
  const saveRename = async () => {
    const clean = title.trim();
    if (!clean) return setIsRenaming(false);

    console.log('✏️ Renaming thread:', thread.thread_id);

    // ✅ SECURITY: Validate ownership before update
    const { error } = await supabase
      .from('threads')
      .update({ title: clean })
      .eq('thread_id', thread.thread_id)
      .eq('user_id', currentUserId);  // ← Ensure user owns this thread!

    if (error) {
      console.error('❌ Error renaming thread:', error);
      alert('Failed to rename. You may not have permission.');
      return;
    }

    console.log('✅ Thread renamed successfully');
    setIsRenaming(false);
  };

  /* ✅ FIXED: Delete with user validation */
  const deleteThread = async () => {
    if (!confirm('Delete this chat?')) return;

    console.log('🗑️ Deleting thread:', thread.thread_id);

    // ✅ SECURITY: Validate ownership before delete
    const { error } = await supabase
      .from('threads')
      .delete()
      .eq('thread_id', thread.thread_id)
      .eq('user_id', currentUserId);  // ← Ensure user owns this thread!

    if (error) {
      console.error('❌ Error deleting thread:', error);
      alert('Failed to delete. You may not have permission.');
      return;
    }

    console.log('✅ Thread deleted successfully');
    onDeleted();
  };

  /* Handle Enter key to save rename */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setTitle(thread.title || 'Untitled Chat');
    }
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
          onKeyDown={handleKeyDown}
          className="flex-1 bg-[#1f1f1f] border border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-400"
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
          <button className="hover:bg-[#3a3a3a] rounded px-2 py-1 cursor-pointer transition-colors">
            ⋮
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="bg-[#1e1e1e] text-gray-200 rounded-lg p-1 border-0 shadow-lg"
        >
          <DropdownMenuItem 
            onClick={() => setIsRenaming(true)}
            className="cursor-pointer hover:bg-[#2a2a2a] transition-colors"
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={deleteThread}
            className="text-red-400 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
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
        'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-[#2a2a2a] transition-colors',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className="h-5 w-5" />
      {!collapsed && <span className="text-sm">{label}</span>}
    </div>
  );
}
