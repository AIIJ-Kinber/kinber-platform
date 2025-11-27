// frontend/src/lib/feature-flags.ts
// Unified Feature Flag Management System

import { useState, useEffect } from 'react';

// ────────────────────────────────
// ✅ Type Definitions
// ────────────────────────────────
interface FeatureFlag {
  name: string;
  enabled: boolean;
  value?: any;
}

// ────────────────────────────────
// ✅ Default Flag Configuration
// ────────────────────────────────
const defaultFlags: Record<string, FeatureFlag> = {
  'custom_agents': { name: 'custom_agents', enabled: true },
  'agent_marketplace': { name: 'agent_marketplace', enabled: true },
  'custom-agents': { name: 'custom-agents', enabled: true },
  'marketplace': { name: 'marketplace', enabled: true },
  'code-execution': { name: 'code-execution', enabled: true },
  'file-processing': { name: 'file-processing', enabled: true },
  'enable_threads': { name: 'enable_threads', enabled: true },
  'enable_projects': { name: 'enable_projects', enabled: true },
  'enable_billing': { name: 'enable_billing', enabled: true },
  'enable_experimental_ui': { name: 'enable_experimental_ui', enabled: false },
};

// ────────────────────────────────
// ✅ Core Fetch Logic
// ────────────────────────────────
export async function fetchFeatureFlag(flagName: string): Promise<FeatureFlag> {
  try {
    // Return local defaults for now
    return defaultFlags[flagName] || { name: flagName, enabled: true };
  } catch (error) {
    console.error(`Error fetching feature flag ${flagName}:`, error);
    return { name: flagName, enabled: true };
  }
}

// ────────────────────────────────
// ✅ React Hook: useFeatureFlags
// ────────────────────────────────
export function useFeatureFlags(
  flagNames: string[],
  options?: { staleTime?: number; gcTime?: number }
) {
  const [flagsData, setFlagsData] = useState<Record<string, FeatureFlag>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  const fetchFlags = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const flagPromises = flagNames.map((flagName) =>
        fetchFeatureFlag(flagName).then((flag) => ({ [flagName]: flag }))
      );

      const flagResults = await Promise.all(flagPromises);
      const flagsObject = flagResults.reduce((acc, f) => ({ ...acc, ...f }), {});
      setFlagsData(flagsObject);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      setError(err as Error);

      const defaults = flagNames.reduce(
        (acc, name) => ({ ...acc, [name]: { name, enabled: true } }),
        {}
      );
      setFlagsData(defaults);
    } finally {
      setIsLoading(false);
    }
  };

  fetchFlags();
}, [flagNames]);  // ✅ FIXED

  const flags = flagNames.reduce(
    (acc, name) => ({ ...acc, [name]: flagsData[name]?.enabled || false }),
    {}
  );

  const queries = flagNames.map((name) => ({
    data: flagsData[name],
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  }));

  return {
    flags,
    queries,
    loading: isLoading,
    isLoading,
    isError: !!error,
    error,
  };
}

// ────────────────────────────────
// ✅ Hook: useFeatureFlag (single)
// ────────────────────────────────
export function useFeatureFlag(flagName: string) {
  const { queries, isLoading, error } = useFeatureFlags([flagName]);
  const query = queries[0];
  return {
    isEnabled: query?.data?.enabled || false,
    isLoading,
    error,
    data: query?.data,
  };
}

// ────────────────────────────────
// ✅ Non-hook utility: getFeatureFlags
// ────────────────────────────────
export async function getFeatureFlags(
  flagNames: string[]
): Promise<Record<string, FeatureFlag>> {
  try {
    const flagPromises = flagNames.map((name) =>
      fetchFeatureFlag(name).then((flag) => ({ [name]: flag }))
    );
    const results = await Promise.all(flagPromises);
    return results.reduce((acc, f) => ({ ...acc, ...f }), {});
  } catch (error) {
    console.error('Error getting feature flags:', error);
    return flagNames.reduce(
      (acc, name) => ({ ...acc, [name]: { name, enabled: false } }),
      {}
    );
  }
}

// ────────────────────────────────
// ✅ Added: Non-hook shortcut — fixes “isFlagEnabled not exported”
// ────────────────────────────────
export function isFlagEnabled(flagName: string): boolean {
  const flag = defaultFlags[flagName];
  return flag ? flag.enabled : false;
}

// Optional: expose all flags for debugging
export function getAllFeatureFlags() {
  return { ...defaultFlags };
}
