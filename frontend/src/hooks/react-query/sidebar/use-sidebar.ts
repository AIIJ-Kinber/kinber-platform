'use client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface Project {
  project_id: string;
  name: string;
  description: string;
  created_at: string;
  thread_count: number;
}

export interface Thread {
  thread_id: string;
  title: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ThreadWithProject {
  thread_id: string;
  title: string;
  project_id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  url: string;
}

// ═══════════════════════════════════════════════════════════════════
// FETCH FUNCTIONS ONLY (No hooks)
// ═══════════════════════════════════════════════════════════════════

export async function fetchProjects(): Promise<{ projects: Project[] }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return await response.json();
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

export async function fetchThreads(): Promise<{ threads: Thread[] }> {
  try {
    // ✅ matches backend route: /api/thread/
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/thread/`);
    if (!response.ok) throw new Error('Failed to fetch threads');
    return await response.json();
  } catch (error) {
    console.error('Error fetching threads:', error);
    throw error;
  }
}

export async function deleteThread(threadId: string): Promise<void> {
  try {
    // ✅ corrected endpoint: singular "thread"
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/thread/${threadId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error('Failed to delete thread');
    }
  } catch (error) {
    console.error('Error deleting thread:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

export function processThreadsWithProjects(
  threads: Thread[],
  projects: Project[]
): ThreadWithProject[] {
  if (!Array.isArray(threads) || !Array.isArray(projects)) {
    console.error('Invalid data:', { threads, projects });
    return [];
  }

  const projectsById = new Map<string, Project>();
  projects.forEach((project) => {
    projectsById.set(project.project_id, project);
  });

  const threadsWithProjects: ThreadWithProject[] = [];

  for (const thread of threads) {
    const project = projectsById.get(thread.project_id);
    const projectName = project?.name || 'General';

    threadsWithProjects.push({
      thread_id: thread.thread_id,
      title: thread.title,
      project_id: thread.project_id,
      project_name: projectName,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      message_count: thread.message_count,
      url: `/projects/${thread.project_id}/thread/${thread.thread_id}`,
    });
  }

  // Sort by most recent first
  return threadsWithProjects.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

// ═══════════════════════════════════════════════════════════════════
// NO HOOKS - If you need hooks, implement them directly in components
// ═══════════════════════════════════════════════════════════════════

// Example usage:
/*
import { useState, useEffect } from 'react';
import { fetchProjects, fetchThreads } from './use-sidebar';

function MyComponent() {
  const [projects, setProjects] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, threadsData] = await Promise.all([
          fetchProjects(),
          fetchThreads(),
        ]);
        setProjects(projectsData.projects);
        setThreads(threadsData.threads);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Use projects and threads...
}
*/
