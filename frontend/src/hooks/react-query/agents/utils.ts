import { createClient } from "@/lib/supabase/client";
import { isFlagEnabled } from "@/lib/feature-flags";

// ✅ Proper backend URL fallback
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

// ─────────────────────────────────────────────
// ✅ Type Definitions
// ─────────────────────────────────────────────
export type Agent = {
  agent_id: string;
  account_id?: string;
  name: string;
  description?: string;
  system_prompt?: string;
  instructions?: string;
  model?: string;
  configured_mcps?: Array<{ name: string; config: Record<string, any> }>;
  custom_mcps?: Array<{
    name: string;
    type: "json" | "sse";
    config: Record<string, any>;
    enabledTools: string[];
  }>;
  agentpress_tools?: Record<string, any>;
  is_default: boolean;
  is_public?: boolean;
  marketplace_published_at?: string;
  download_count?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  avatar?: string;
  avatar_color?: string;
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type AgentsResponse = {
  agents: Agent[];
  pagination: PaginationInfo;
};

export type AgentsParams = {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: string;
};

export type ThreadAgentResponse = {
  agent: Agent | null;
  source: "thread" | "default" | "none" | "missing";
  message: string;
};

export type AgentCreateRequest = {
  name: string;
  description?: string;
  system_prompt: string;
  configured_mcps?: Array<{ name: string; config: Record<string, any> }>;
  custom_mcps?: Array<{
    name: string;
    type: "json" | "sse";
    config: Record<string, any>;
    enabledTools: string[];
  }>;
  agentpress_tools?: Record<string, any>;
  is_default?: boolean;
};

export type AgentUpdateRequest = Partial<Agent>;

// ─────────────────────────────────────────────
// ✅ Fetch All Agents
// ─────────────────────────────────────────────
export const getAgents = async (
  params: AgentsParams = {}
): Promise<AgentsResponse> => {
  try {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 100),
      sort_by: params.sort_by || "created_at",
      sort_order: params.sort_order || "desc",
      search: params.search || "",
    });

    const response = await fetch(`${API_URL}/api/agent/agents?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ [API] Agents fetched:", data.agents?.length || 0);

    return {
      agents: data.data?.agents || data.agents || [],
      pagination:
        data.data?.pagination || data.pagination || { total: 0, page: 1, limit: 100, pages: 1 },
    };
  } catch (error) {
    console.error("❌ Error getting agents:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// ✅ Fetch Single Agent
// ─────────────────────────────────────────────
export const getAgent = async (agentId: string): Promise<Agent> => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");

    const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error fetching agent:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// ✅ Create Agent
// ─────────────────────────────────────────────
export const createAgent = async (agentData: AgentCreateRequest): Promise<Agent> => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");

    const response = await fetch(`${API_URL}/api/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.statusText}`);
    }

    const agent = await response.json();
    console.log("✅ [API] Created agent:", agent.agent_id);
    return agent;
  } catch (error) {
    console.error("❌ Error creating agent:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// ✅ Update Agent
// ─────────────────────────────────────────────
export const updateAgent = async (
  agentId: string,
  agentData: AgentUpdateRequest
): Promise<Agent> => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");

    const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update agent: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error updating agent:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// ✅ Delete Agent
// ─────────────────────────────────────────────
export const deleteAgent = async (agentId: string): Promise<void> => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");

    const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`);
    }

    console.log("✅ [API] Deleted agent:", agentId);
  } catch (error) {
    console.error("❌ Error deleting agent:", error);
    throw error;
  }
};
