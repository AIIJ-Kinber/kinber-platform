// frontend/src/agents/actions/legal-tasks.ts
// ─────────────────────────────────────────────
// Specialized Actions for Kinber Legal Aide Agent
// Built on top of InfoTasks for deeper legal insight
// ─────────────────────────────────────────────

import { InfoTasks } from "@/agents/actions/info-tasks";

/**
 * LegalTasks: Specialized actions for contract and document analysis
 * These will serve Kinber’s “Legal Aide” agent.
 */
export const LegalTasks = {
  /**
   * 📑 Summarize a Legal Document
   * Produces a concise summary of clauses, obligations, and key terms.
   */
  async summarizeContract(text: string) {
    const prompt = `
      Summarize the following legal document clearly.
      - Highlight key obligations and parties involved.
      - Summarize in plain language.
      - Keep bullet points for clarity.
      Text:
      ${text}
    `;
    return await InfoTasks.summarize(prompt, 250);
  },

  /**
   * 🚨 Identify Red Flags or Risk Clauses
   * Detect potential legal or financial risks in a document.
   */
  async detectRedFlags(text: string) {
    const prompt = `
      Review the following legal content and identify any potential red flags:
      - Unusual payment terms
      - Termination or penalty clauses
      - Ambiguous or one-sided obligations
      - Missing jurisdiction or dispute resolution details
      Provide your output as a clear bullet list.
      Text:
      ${text}
    `;
    return await InfoTasks.extractKeyPoints(prompt);
  },

  /**
   * 🧾 Extract Key Clauses
   * Focuses on identifying major sections (e.g., Confidentiality, Termination).
   */
  async extractClauses(text: string) {
    const prompt = `
      Extract the key clauses and their summaries from the following contract.
      Focus on:
      - Parties
      - Scope of work
      - Payment
      - Confidentiality
      - Termination
      - Governing law
      Output each as "Clause Name: Summary".
      Text:
      ${text}
    `;
    return await InfoTasks.extractKeyPoints(prompt);
  },

  /**
   * ⚖️ Translate Legal Document to Another Language
   * Maintains formal and legal phrasing.
   */
  async translateLegal(text: string, targetLang: string) {
    const prompt = `
      Translate this legal document to ${targetLang}.
      Ensure formal and legal language fidelity.
      Text:
      ${text}
    `;
    return await InfoTasks.translate(prompt, targetLang);
  },

  /**
   * ✍️ Rewrite a Clause for Clarity
   * Simplifies or refines a given clause without losing legal meaning.
   */
  async rewriteClause(text: string, style: "simple" | "formal" = "simple") {
    const prompt = `
      Rewrite the following clause in a ${style} style while preserving its legal meaning.
      Text:
      ${text}
    `;
    return await InfoTasks.rewrite(prompt, style);
  },
};
