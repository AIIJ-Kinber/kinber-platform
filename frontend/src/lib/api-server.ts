// src/lib/api-server.ts

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------
// Local minimal fallback types (MVP safe)
// ---------------------------------------------
export interface Thread {
  thread_id: string;
  project_id?: string | null;
  name?: string | null;
  created_at: string;
  updated_at?: string | null;
  messages?: any[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  account_id?: string | null;
  is_public: boolean;
  created_at: string;
  sandbox: {
    id: string;
    pass: string;
    vnc_preview: string;
    sandbox_url: string;
  };
}

// ---------------------------------------------
// Get Thread (Supabase)
// ---------------------------------------------
export const getThread = async (threadId: string): Promise<Thread> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("threads")
    .select("*")
    .eq("thread_id", threadId)
    .single();

  if (error) throw error;

  return data as Thread;
};

// ---------------------------------------------
// Get Project (Supabase)
// ---------------------------------------------
export const getProject = async (projectId: string): Promise<Project> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error) throw error;

  // Normalize to Project shape
  return {
    id: data.project_id,
    name: data.name || "",
    description: data.description || "",
    account_id: data.account_id,
    is_public: data.is_public ?? false,
    created_at: data.created_at,
    sandbox: data.sandbox || {
      id: "",
      pass: "",
      vnc_preview: "",
      sandbox_url: "",
    },
  };
};
