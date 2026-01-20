'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/hooks/react-query/agents/use-agents";

export default function AgentForm({ onClose }: { onClose: () => void }) {
  const { addAgent } = useAgents();

  const [form, setForm] = useState({
    name: "",
    description: "",
    model_name: "gpt-4o-mini",
    persona: "You are Kinber, a helpful AI assistant.",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAgent.mutateAsync(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md space-y-4"
      >
        <h3 className="text-lg font-semibold">Create New Agent</h3>

        <Input
          placeholder="Agent name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <Textarea
          placeholder="Agent description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Input
          placeholder="Model (optional)"
          value={form.model_name}
          onChange={(e) => setForm({ ...form, model_name: e.target.value })}
        />

        <Textarea
          placeholder="Persona / Instruction"
          value={form.persona}
          onChange={(e) => setForm({ ...form, persona: e.target.value })}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </div>
  );
}
