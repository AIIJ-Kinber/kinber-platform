// Minimal placeholder version for MVP.
// Prevents missing-hook errors and returns safe dummy data.

import { threadKeys } from "./keys";
import { Project } from "./utils";

// --- Helper delay ---
async function fakeWait(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Placeholder project object ---
const dummyProject: Project = {
  id: "demo-project",
  name: "Demo Project",
  description: "Placeholder project (MVP mode)",
  created_at: new Date().toISOString(),

  // Required by Project type
  account_id: "placeholder-account",
  sandbox: {
    id: "default",
  },
};

// ------------------------------------------------------
// ⚡ useProjectQuery
// ------------------------------------------------------
export const useProjectQuery = (projectId: string | undefined) => {
  return {
    data: projectId ? dummyProject : null,
    isLoading: false,
    error: null,
    refetch: async () => {
      await fakeWait();
      return dummyProject;
    },
  };
};

// ------------------------------------------------------
// ⚡ useUpdateProjectMutation
// ------------------------------------------------------
export const useUpdateProjectMutation = () => {
  return {
    mutate: async ({
      projectId,
      data,
    }: {
      projectId: string;
      data: Partial<Project>;
    }) => {
      console.log("[MVP] updateProject placeholder:", { projectId, data });
      await fakeWait();
      return { ...dummyProject, ...data };
    },
    isLoading: false,
    error: null,
  };
};

// ------------------------------------------------------
// ⚡ usePublicProjectsQuery
// ------------------------------------------------------
export const usePublicProjectsQuery = () => {
  return {
    data: [dummyProject],
    isLoading: false,
    error: null,
    refetch: async () => {
      await fakeWait();
      return [dummyProject];
    },
  };
};
