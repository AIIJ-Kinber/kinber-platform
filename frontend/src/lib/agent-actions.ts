// frontend/src/lib/agent-actions.ts

export interface AgentActionResponse<T = any> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

/* 
  🧠 Base utility to call backend Agent Actions
  ------------------------------------------------
  endpoint: e.g. "summarize" → calls /api/actions/summarize
  payload: request body (JSON)
*/
export async function callAgentAction<T = any>(
  endpoint: string,
  payload: Record<string, any>
): Promise<AgentActionResponse<T>> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/actions/${endpoint}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Backend error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error(`❌ Agent Action Error [${endpoint}] →`, err);
    return { status: "error", message: err.message };
  }
}

/* ────────────────────────────────────────────────
   Specific Helper Functions
────────────────────────────────────────────────── */
export const agentActions = {
  search: (query: string) => callAgentAction("search", { query }),

  summarize: (text: string, max_words = 200) =>
    callAgentAction("summarize", { text, max_words }),

  extractKeyPoints: (text: string) =>
    callAgentAction("extract", { text }),

  translate: (text: string, target_lang: string) =>
    callAgentAction("translate", { text, target_lang }),

  rewrite: (text: string, style = "simple") =>
    callAgentAction("rewrite", { text, style }),
};
