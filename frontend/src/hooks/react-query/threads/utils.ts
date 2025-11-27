import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export type Thread = {
    thread_id: string;
    account_id: string | null;
    project_id?: string | null;
    is_public?: boolean;
    created_at: string;
    updated_at: string;
    metadata?: {
      workflow_id?: string;
      workflow_name?: string;
      workflow_run_name?: string;
      is_workflow_execution?: boolean;
      agent_id?: string;
      is_agent_builder?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
  
  export type Project = {
    id: string;
    name: string;
    description: string;
    account_id: string;
    created_at: string;
    updated_at?: string;
    sandbox: {
      vnc_preview?: string;
      sandbox_url?: string;
      id?: string;
      pass?: string;
    };
    is_public?: boolean;
    [key: string]: any;
  };
  

export const getThread = async (threadId: string): Promise<Thread> => {
  const supabase = createClient();
const { data, error } = await supabase
  .from('threads')
  .select()
  .eq('thread_id', threadId)
  .single();

  if (error) throw error;

  return data;
};

export const updateThread = async (
  threadId: string,
  data: Partial<Thread>,
): Promise<Thread> => {
  const supabase = createClient();

  const updateData = { ...data };

  const { data: updatedThread, error } = await supabase
    .from('threads')
    .update(updateData)
    .filter('thread_id', 'eq', threadId)
    .select()
    .single();

  if (error) {
    console.error('Error updating thread:', error);
    throw new Error(`Error updating thread: ${error.message}`);
  }

  return updatedThread;
};

export const toggleThreadPublicStatus = async (
  threadId: string,
  isPublic: boolean,
): Promise<Thread> => {
  return updateThread(threadId, { is_public: isPublic });
};

const deleteSandbox = async (sandboxId: string): Promise<void> => {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_URL}/sandboxes/${sandboxId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      console.warn('Failed to delete sandbox, continuing with thread deletion');
    }
  } catch (error) {
    console.warn('Error deleting sandbox, continuing with thread deletion:', error);
  }
};

export const deleteThread = async (threadId: string, sandboxId?: string): Promise<void> => {
  try {
    const supabase = createClient();

    // If a sandbox ID is provided, attempt to delete the sandbox first.
    if (sandboxId) {
      await deleteSandbox(sandboxId);
    }

    // Delete the thread record from the database.
    const { error: deleteError } = await supabase
      .from('threads')
      .delete()
      .filter('thread_id', 'eq', threadId);

    if (deleteError) {
      console.error('Error deleting thread:', deleteError);
      throw deleteError;
    }

    console.log(`Thread ${threadId} successfully deleted with all related items`);
  } catch (error) {
    console.error('Error deleting thread and related items:', error);
    throw error;
  }
};
  

export const getPublicProjects = async (): Promise<Project[]> => {
    try {
      const supabase = createClient();
  
      // Query for threads that are marked as public
      const { data: publicThreads, error: threadsError } = await supabase
        .from('threads')
        .select('project_id')
        .eq('is_public', true);
  
      if (threadsError) {
        console.error('Error fetching public threads:', threadsError);
        return [];
      }
  
      // If no public threads found, return empty array
      if (!publicThreads?.length) {
        return [];
      }
  
      // Extract unique project IDs from public threads
      const publicProjectIds = [
        ...new Set(publicThreads.map((thread) => thread.project_id)),
      ].filter(Boolean);
  
      // If no valid project IDs, return empty array
      if (!publicProjectIds.length) {
        return [];
      }
  
      // Get the projects that have public threads
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('project_id', publicProjectIds);
  
      if (projectsError) {
        console.error('Error fetching public projects:', projectsError);
        return [];
      }
  
      console.log(
        '[API] Raw public projects from DB:',
        projects?.length,
        projects,
      );
  
      // Map database fields to our Project type
      const mappedProjects: Project[] = (projects || []).map((project) => ({
        id: project.project_id,
        name: project.name || '',
        description: project.description || '',
        account_id: project.account_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
        sandbox: project.sandbox || {
          id: '',
          pass: '',
          vnc_preview: '',
          sandbox_url: '',
        },
        is_public: true, // Mark these as public projects
      }));
  
      console.log(
        '[API] Mapped public projects for frontend:',
        mappedProjects.length,
      );
  
      return mappedProjects;
    } catch (err) {
      console.error('Error fetching public projects:', err);
      return [];
    }
  };

export const getProject = async (projectId: string): Promise<Project> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const data = await response.json();
    const projects = data.projects || [];
    const project = projects.find((p: any) => p.project_id === projectId);
    
    if (project) {
      return {
        id: project.project_id,
        name: project.name || 'General',
        description: project.description || 'Default project for conversations',
        account_id: project.account_id || '',
        created_at: project.created_at || new Date().toISOString(),
        updated_at: project.updated_at,
        sandbox: project.sandbox || {
          id: '',
          pass: '',
          vnc_preview: '',
          sandbox_url: '',
        },
        is_public: project.is_public ?? false,
      };
    }
    
    return {
      id: projectId,
      name: "General",
      description: "Default project for conversations",
      account_id: '',
      created_at: new Date().toISOString(),
      sandbox: {
        id: '',
        pass: '',
        vnc_preview: '',
        sandbox_url: '',
      },
    };
    
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    
    return {
      id: projectId,
      name: "General",
      description: "Default project for conversations",
      account_id: '',
      created_at: new Date().toISOString(),
      sandbox: {
        id: '',
        pass: '',
        vnc_preview: '',
        sandbox_url: '',
      },
    };
  }
};  
      // console.log('Mapped project data for frontend:', mappedProject);

  export const updateProject = async (
    projectId: string,
    data: Partial<Project>,
  ): Promise<Project> => {
    const supabase = createClient();
  
    console.log('Updating project with ID:', projectId);
    console.log('Update data:', data);
  
    // Sanity check to avoid update errors
    if (!projectId || projectId === '') {
      console.error('Attempted to update project with invalid ID:', projectId);
      throw new Error('Cannot update project: Invalid project ID');
    }
  
    const { data: updatedData, error } = await supabase
      .from('projects')
      .update(data)
      .eq('project_id', projectId)
      .select()
      .single();
  
    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  
    if (!updatedData) {
      throw new Error('No data returned from update');
    }
  
    // Dispatch a custom event to notify components about the project change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('project-updated', {
          detail: {
            projectId,
            updatedData: {
              id: updatedData.project_id,
              name: updatedData.name,
              description: updatedData.description,
            },
          },
        }),
      );
    }
  
    // Return formatted project data - use same mapping as getProject
    return {
      id: updatedData.project_id,
      name: updatedData.name,
      description: updatedData.description || '',
      account_id: updatedData.account_id,
      created_at: updatedData.created_at,
      sandbox: updatedData.sandbox || {
        id: '',
        pass: '',
        vnc_preview: '',
        sandbox_url: '',
      },
    };
  };