'use client'; 

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useRemoveAgent } from "@/hooks/react-query/agents/use-remove-agent";

interface AgentCardProps {
  agent: {
    agent_id: string;
    name: string;
    description?: string;
    model_name?: string;
  };
}

export default function AgentCard({ agent }: AgentCardProps) {
  const removeAgent = useRemoveAgent();

  const handleDelete = () => {
    removeAgent.mutate(agent.agent_id);
  };

  return (
    <div className="p-4 rounded-2xl border shadow-sm hover:shadow-md transition">
      <h3 className="font-bold text-lg">{agent.name}</h3>

      {agent.description && (
        <p className="text-sm text-gray-600">{agent.description}</p>
      )}

      {agent.model_name && (
        <p className="text-xs text-gray-500 mt-2">
          Model: {agent.model_name}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          disabled={removeAgent.isPending}
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {removeAgent.isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}

