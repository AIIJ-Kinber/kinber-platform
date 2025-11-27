'use client';

import { useMutation, UseMutationOptions } from '@tanstack/react-query';

// ------------------------------
// TEMP PLACEHOLDER API — FIXES BUILD
// ------------------------------
async function createProject(_: any) {
  console.warn("createProject() called — placeholder function");
  return { success: true };
}

async function updateProject(_: any) {
  console.warn("updateProject() called — placeholder function");
  return { success: true };
}

// ------------------------------
// Local createMutationHook
// ------------------------------
function createMutationHook<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, unknown, TVariables> = {}
) {
  return () =>
    useMutation<TData, unknown, TVariables>({
      mutationFn,
      ...options,
    });
}

// ------------------------------
// Exports — now simple and clean
// ------------------------------
export const useCreateProject = createMutationHook(createProject);
export const useUpdateProject = createMutationHook(updateProject);
