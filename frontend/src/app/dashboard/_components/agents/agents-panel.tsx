'use client';
import { useAgents } from '@/hooks/react-query/agents/use-agents';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function AgentsPanel() {
  const { data, isLoading, isError } = useAgents();

  if (isLoading)
    return <p className="text-gray-400 text-center mt-6">Loading agents...</p>;
  if (isError)
    return <p className="text-red-500 text-center mt-6">Failed to load agents.</p>;

  const agents = data ?? [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        {/* Removed extra header */}
        <span className="text-gray-400 text-sm">
          {agents.length === 0 ? 'No agents found.' : `${agents.length} available agents`}
        </span>
        <Button variant="secondary">
          <Plus className="w-4 h-4 mr-1" /> New Agent
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any) => (
          <div
            key={agent.agent_id}
            className="p-4 rounded-xl border border-gray-700 bg-[#1e1e1e] shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-bold text-white">{agent.name}</h3>
            <p className="text-sm text-gray-400">{agent.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              Model: {agent.model_name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
