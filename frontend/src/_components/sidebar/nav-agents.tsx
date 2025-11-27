'use client';

import { useState, useEffect } from 'react';
import {
  Archive,
  MoreHorizontal,
  Share,
  Trash2,
  MessageCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

import {
  ThreadWithProject,
  Project,
  Thread,
  processThreadsWithProjects,
  fetchProjects,
  fetchThreads,
  deleteThread
} from '@/hooks/react-query/sidebar/use-sidebar';

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function NavAgents() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // ─── Fetch Data ──────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [projectsResponse, threadsResponse] = await Promise.all([
        fetchProjects(),
        fetchThreads(),
      ]);

      console.log('🔍 FETCHED DATA:', {
        projects: projectsResponse.projects || [],
        threads: threadsResponse.threads || [],
      });

      setProjects(projectsResponse.projects || []);
      setThreads(threadsResponse.threads || []);
    } catch (err) {
      console.error('❌ FETCH ERROR:', err);
      setError('Failed to load conversations');
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Load on Mount with Cleanup ───────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const safeFetch = async () => {
      try {
        await fetchData();
      } catch {
        /* handled in fetchData */
      }
    };

    if (isMounted) safeFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Derived Data ─────────────────────────────────────────────────
  const threadsWithProjects = processThreadsWithProjects(threads, projects);

  // ─── Delete Handlers ──────────────────────────────────────────────
  const handleDeleteThread = async (threadId: string) => {
    try {
      await deleteThread(threadId);
      setThreads((prev) => prev.filter((t) => t.thread_id !== threadId));
      toast.success('Conversation deleted');

      if (pathname?.includes?.(threadId)) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete conversation');
    }
  };

  const handleDeleteMultipleThreads = async (threadIds: string[]) => {
    try {
      await Promise.all(threadIds.map((id) => deleteThread(id)));
      setThreads((prev) => prev.filter((t) => !threadIds.includes(t.thread_id)));
      toast.success(`${threadIds.length} conversations deleted`);
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error('Failed to delete conversations');
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const handleThreadClick = (thread: ThreadWithProject) => {
    router.push(thread.url);
  };

  // ─── Loading State ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-500 mb-2">{error}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="w-full"
        >
          Retry
        </Button>
      </div>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────
  if (threadsWithProjects.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No conversations yet
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-1">
      {threadsWithProjects.map((thread) => {
        const isActive = pathname?.includes(`/thread/${thread.thread_id}`) ?? false;
        return (
          <div
            key={thread.thread_id || `${thread.title}-${thread.project_id}`}
            className={cn(
              "group relative rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isActive && "bg-gray-100 dark:bg-gray-800"
            )}
          >
            <button
              onClick={() => handleThreadClick(thread)}
              aria-label={`Open conversation: ${thread.title}`}
              className="w-full text-left p-3 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <MessageCircle className="h-4 w-4 mt-0.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {thread.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(thread.updated_at)} • {thread.message_count} messages
                    </p>
                  </div>
                </div>
              </div>
            </button>

            {/* Actions dropdown */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Share className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteThread(thread.thread_id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
