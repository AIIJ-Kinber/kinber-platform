'use client';

// Subscription system disabled for MVP.
// Safe placeholder implementation — no external billing APIs needed.

// Minimal local type (replacing deleted `SubscriptionStatus`)
export type SubscriptionStatus = {
  status: string;
  plan_name: string;
};

export const useSubscription = () => {
  return {
    data: {
      status: 'active',
      plan_name: 'free',
    } as SubscriptionStatus,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  };
};

// Disabled Stripe billing portal
export const useCreatePortalSession = () => {
  return {
    mutate: (_params: { return_url: string }) => {
      console.warn('Billing portal is disabled in MVP.');
    },
    isLoading: false,
  };
};

// Utility: check if user is on a specific plan
export const isPlan = (
  subscriptionData: SubscriptionStatus | null | undefined,
  planId?: string,
): boolean => {
  if (!subscriptionData) return planId === 'free';
  return subscriptionData.plan_name === planId;
};
