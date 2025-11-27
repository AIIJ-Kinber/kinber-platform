// frontend/src/app/dashboard/_components/agents/agent.service.ts
export const fetchAgents = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/agent`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
};

export const createAgent = async (agent: any) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/agent/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agent),
  });
  if (!res.ok) throw new Error("Failed to create agent");
  return res.json();
};

export const deleteAgent = async (id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/agent/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete agent");
  return res.json();
};
