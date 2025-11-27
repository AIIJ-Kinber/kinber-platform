"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAgents } from '@/hooks/react-query/agents/use-agents';
import AgentCard from "./agent-card";
import AgentForm from "./agent-form";

export default function AgentsPanel() {
  const agents = useAgents();
  const [open, setOpen] = useState(false);

  if (agents.isLoading) return <p className="text-center">Loading agents…</p>;
  if (agents.isError) return <p className="text-red-500 text-center">Failed to load agents.</p>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your AI Agents</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Agent
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.data?.map((agent: any) => (
          <AgentCard key={agent.agent_id} agent={agent} />
        ))}
      </div>

      {open && <AgentForm onClose={() => setOpen(false)} />}
    </div>
  );
}
