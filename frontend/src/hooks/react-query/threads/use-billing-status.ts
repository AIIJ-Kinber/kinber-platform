// Minimal placeholder for billing status.
// Ensures the app compiles while billing system is disabled.

import { threadKeys } from "./keys";

// --- Types for compatibility ---
export interface BillingStatusResponse {
  can_run: boolean;
  reason?: string;
}

// --- Placeholder API ---
async function fakeWait(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useBillingStatusQuery = (enabled = true) => {
  return {
    data: {
      can_run: true,          // Always allow agent runs for MVP
      reason: "billing_disabled",
    } as BillingStatusResponse,
    isLoading: false,
    error: null,
    refetch: async () => {
      await fakeWait();
      return {
        can_run: true,
        reason: "billing_disabled",
      } as BillingStatusResponse;
    },
  };
};
