// frontend/src/agents/actions/edu-tasks.ts
// ─────────────────────────────────────────────
// Specialized Actions for Kinber Educational Tutor Agent
// Built on top of InfoTasks for explanation, teaching, and summarization
// ─────────────────────────────────────────────

import { InfoTasks } from "@/agents/actions/info-tasks";

/**
 * EduTasks: Specialized actions for the Kinber Educational Tutor agent.
 * These actions are designed to help students learn, summarize, and test their knowledge.
 */
export const EduTasks = {
  /**
   * 📘 Explain a Concept
   * Provides a clear, age-appropriate explanation of a topic.
   */
  async explainConcept(topic: string, level: "beginner" | "intermediate" | "advanced" = "beginner") {
    const prompt = `
      Explain the following topic at a ${level} level for a student:
      Use examples and clear step-by-step logic where helpful.
      Topic:
      ${topic}
    `;
    return await InfoTasks.summarize(prompt, 200);
  },

  /**
   * 🧠 Summarize a Lesson
   * Creates concise study notes for a given topic or passage.
   */
  async summarizeLesson(text: string) {
    const prompt = `
      Summarize the following educational text for study purposes.
      - Highlight the main ideas and key facts.
      - Keep it concise and well-structured.
      Text:
      ${text}
    `;
    return await InfoTasks.summarize(prompt, 180);
  },

  /**
   * ✍️ Simplify Complex Text
   * Rewrites difficult text in simpler, student-friendly language.
   */
  async simplifyText(text: string) {
    const prompt = `
      Simplify the following educational text while keeping the same meaning.
      Use short sentences and easy vocabulary.
      Text:
      ${text}
    `;
    return await InfoTasks.rewrite(prompt, "simple");
  },

  /**
   * 📋 Generate Quiz Questions
   * Creates a small quiz (MCQs or short-answer) from provided content.
   */
  async generateQuiz(text: string, numQuestions = 5) {
    const prompt = `
      Based on the following text, create ${numQuestions} educational quiz questions.
      Include a mix of multiple-choice and short-answer types.
      Format example:
      Q1: ...
      A: ...
      Q2: ...
      A: ...
      Text:
      ${text}
    `;
    return await InfoTasks.extractKeyPoints(prompt);
  },

  /**
   * 🌍 Translate Educational Material
   * Converts lessons to another language for bilingual learners.
   */
  async translateLesson(text: string, targetLang: string) {
    const prompt = `
      Translate this educational material to ${targetLang}.
      Keep the academic tone clear and accurate.
      Text:
      ${text}
    `;
    return await InfoTasks.translate(prompt, targetLang);
  },

  /**
   * 🧩 Create Learning Summary + Key Terms
   * Summarizes text and lists key terms with short definitions.
   */
  async buildStudyGuide(text: string) {
    const prompt = `
      Create a study guide from the following lesson:
      1. Short summary
      2. List of 5–10 key terms with short definitions
      Text:
      ${text}
    `;
    return await InfoTasks.extractKeyPoints(prompt);
  },
};
