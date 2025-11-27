// -------------------------------------------------------- 
// use-agents.ts — unified hook (QUERY + MUTATIONS)
// --------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// --------------------------------------------------------
//  TYPES
// --------------------------------------------------------

export interface AgentInput {
  name: string;
  description?: string;
  model_name?: string;
  persona?: string;
}

export interface AgentRecord {
  agent_id: string;
  name: string;
  description?: string;
  model_name?: string;
  persona?: string;
  created_at?: string;

  // ⭐ REQUIRED FIX — field exists in Supabase
  is_default?: boolean;
}

// --------------------------------------------------------
// MAIN HOOK: useAgents()
// --------------------------------------------------------

export function useAgents() {
  const queryClient = useQueryClient();

  // 1️⃣ Load agents
  const agentsQuery = useQuery<AgentRecord[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // ALWAYS return array with is_default preserved
      return data ?? [];
    },
  });

  // 2️⃣ Add Agent
  const addAgent = useMutation({
    mutationFn: async (input: AgentInput) => {
      const { data, error } = await supabase
        .from("agents")
        .insert({
          name: input.name,
          description: input.description,
          model_name: input.model_name,
          persona: input.persona,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  // 3️⃣ Remove Agent
  const removeAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("agent_id", agentId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  return {
    ...agentsQuery,         // data, isLoading, isError, refetch, etc.
    addAgent,
    removeAgent,
  };
}
