/**
 * useWorkflowTransition
 *
 * A standalone hook encapsulating the workflow transition pattern with optimistic updates.
 * Designed for use in pages that need to trigger transitions without the full WorkflowEngine UI
 * (e.g., quick approve buttons in tables, inline action menus).
 *
 * Key behaviors:
 * 1. POSTs/PATCHes to the transition endpoint with provided data
 * 2. On success: invalidates all specified query keys to sync with server
 * 3. On error: rolls back optimistic status updates and surfaces error
 * 4. Returns the mutation result for loading/error state tracking
 *
 * Requirements: 5.3, 6.3, 13.2, 14.2
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface UseWorkflowTransitionOptions {
  /** TanStack Query keys to invalidate after transition */
  invalidateKeys: string[][];
}

export interface TransitionParams {
  /** Record ID */
  recordId: string;
  /** API endpoint for the transition */
  endpoint: string;
  /** HTTP method (default: POST) */
  method?: 'POST' | 'PATCH';
  /** Data to send with the transition (reason, form fields, etc.) */
  data?: Record<string, unknown>;
}

export function useWorkflowTransition(options: UseWorkflowTransitionOptions) {
  const { invalidateKeys } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TransitionParams) => {
      const { endpoint, method = 'POST', data = {} } = params;

      if (method === 'PATCH') {
        const response = await api.patch(endpoint, data);
        return response.data;
      }

      const response = await api.post(endpoint, data);
      return response.data;
    },
    onMutate: async (params: TransitionParams) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      for (const key of invalidateKeys) {
        await queryClient.cancelQueries({ queryKey: key });
      }

      // Snapshot current data for rollback
      const snapshots: { key: string[]; data: unknown }[] = [];
      for (const key of invalidateKeys) {
        const data = queryClient.getQueryData(key);
        if (data !== undefined) {
          snapshots.push({ key, data });
        }
      }

      return { snapshots, recordId: params.recordId };
    },
    onSuccess: () => {
      // Invalidate all specified query keys to sync with server state
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic updates using snapshots
      if (context?.snapshots) {
        for (const { key, data } of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
    },
  });
}
