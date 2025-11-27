// frontend/src/agents/actions/info-tasks.ts
// ─────────────────────────────────────────────
// Core Information & Knowledge Agent Actions
// ─────────────────────────────────────────────

import { agentActions } from "@/lib/agent-actions";

/**
 * Information and Knowledge Tasks
 * These are universal agent capabilities used by all Kinber Agents
 * for reasoning, summarization, translation, and rewriting.
 */
export const InfoTasks = {
  /**
   * 🔍 Search the Web
   * @param query Search string or natural language question
   * @returns Summarized search findings
   */
  async search(query: string) {
    if (!query?.trim()) throw new Error("Missing search query");
    const res = await agentActions.search(query);
    if (res.status !== "success") throw new Error(res.message);
    return res.data;
  },

  /**
   * 🧠 Summarize Long Text or Reports
   * @param text The source text
   * @param maxWords Maximum summary length (optional)
   */
  async summarize(text: string, maxWords = 200) {
    if (!text?.trim()) throw new Error("Missing text to summarize");
    const res = await agentActions.summarize(text, maxWords);
    if (res.status !== "success") throw new Error(res.message);
    return res.data;
  },

  /**
   * 💡 Extract Key Insights or Highlights
   * @param text Source text to analyze
   */
  async extractKeyPoints(text: string) {
    if (!text?.trim()) throw new Error("Missing text for key extraction");
    const res = await agentActions.extractKeyPoints(text);
    if (res.status !== "success") throw new Error(res.message);
    return res.data;
  },

  /**
   * 🌐 Translate Text to Target Language
   * @param text Source text
   * @param targetLang Target language (e.g., "Arabic", "English")
   */
  async translate(text: string, targetLang: string) {
    if (!text?.trim() || !targetLang?.trim())
      throw new Error("Missing text or target language");
    const res = await agentActions.translate(text, targetLang);
    if (res.status !== "success") throw new Error(res.message);
    return res.data;
  },

  /**
   * ✍️ Rephrase / Rewrite Text
   * @param text Source text
   * @param style Target style (e.g., "simple", "formal", "professional")
   */
  async rewrite(text: string, style = "simple") {
    if (!text?.trim()) throw new Error("Missing text for rewriting");
    const res = await agentActions.rewrite(text, style);
    if (res.status !== "success") throw new Error(res.message);
    return res.data;
  },
};
