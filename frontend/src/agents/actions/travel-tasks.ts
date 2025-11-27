// frontend/src/agents/actions/travel-tasks.ts
// ─────────────────────────────────────────────
// Specialized Actions for Kinber Travel Planner Agent
// Built on top of InfoTasks for tourism, planning, and itinerary creation
// ─────────────────────────────────────────────

import { InfoTasks } from "@/agents/actions/info-tasks";

/**
 * TravelTasks: Specialized actions for the Kinber Travel Planner agent.
 * These handle travel research, destination planning, and itinerary generation.
 */
export const TravelTasks = {
  /**
   * 🌐 Search Recent Travel Information
   * Finds up-to-date insights about destinations, attractions, or events.
   */
  async searchTravelInfo(query: string) {
    const prompt = `
      Find recent and relevant travel information about:
      "${query}"
      Include tourist attractions, cultural highlights, and local insights.
      Format as a short summary or bullet list.
    `;
    return await InfoTasks.search(prompt);
  },

  /**
   * 🧭 Generate a Travel Itinerary
   * Creates a 3–7 day itinerary with activities, attractions, and timing.
   */
  async buildItinerary(destination: string, days: number = 5) {
    const prompt = `
      Create a detailed ${days}-day travel itinerary for ${destination}.
      Include:
      - Daily breakdown with morning, afternoon, evening plans
      - Local highlights and cultural experiences
      - Notes on transportation or timing where relevant
      Format neatly with clear day headings.
    `;
    return await InfoTasks.summarize(prompt, 300);
  },

  /**
   * ✈️ Summarize a Travel Article or Report
   * Condenses travel blogs or news into quick highlights.
   */
  async summarizeTravelContent(text: string) {
    const prompt = `
      Summarize this travel article for quick insights:
      - Key attractions or experiences
      - Cultural or culinary highlights
      - Any travel advisories or notes
      Text:
      ${text}
    `;
    return await InfoTasks.summarize(prompt, 180);
  },

  /**
   * 🗺️ Extract Top Recommendations
   * Lists best hotels, restaurants, or spots from text content.
   */
  async extractHighlights(text: string) {
    const prompt = `
      Extract top recommendations from the following travel content:
      - Best hotels or stays
      - Must-visit attractions
      - Top restaurants or local dishes
      Return as a bullet list with short details.
      Text:
      ${text}
    `;
    return await InfoTasks.extractKeyPoints(prompt);
  },

  /**
   * 🌍 Translate Itinerary or Travel Notes
   * Useful for international travelers or multi-language users.
   */
  async translateItinerary(text: string, targetLang: string) {
    const prompt = `
      Translate this travel itinerary or guide to ${targetLang}.
      Keep the travel-friendly tone and formatting.
      Text:
      ${text}
    `;
    return await InfoTasks.translate(prompt, targetLang);
  },

  /**
   * 🧳 Suggest Packing List
   * Builds a checklist based on destination climate and trip duration.
   */
  async suggestPackingList(destination: string, days: number = 5, season?: string) {
    const prompt = `
      Create a packing checklist for a ${days}-day trip to ${destination}${
      season ? ` during ${season}` : ""
    }.
      Include:
      - Clothing essentials
      - Documents and electronics
      - Health, hygiene, and safety items
      Output as categorized bullet lists.
    `;
    return await InfoTasks.extractKeyPoints(prompt);
  },
};
