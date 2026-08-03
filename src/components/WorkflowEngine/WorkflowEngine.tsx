/**
 * WorkflowEngine
 *
 * Main orchestration component for workflow state machines.
 * Renders the current status badge, available transition actions,
 * and handles transition execution with optimistic updates.
 *
 * Key behaviors:
 * - Shows StatusBadge for the current record status
 * - Renders TransitionActions filtered by status and user role
 * - Opens TransitionDialog when a transition requires confirmation or reason
 * - Executes the API call via TanStack Query's useMutation
 * - Uses optimistic updates: immediately updates local cache, invalidates on success, rolls back on error
 * - Shows success/error feedback inline
 *
 * Requirements: 5.3, 5.4, 6.3, 6.4, 7.3, 13.2, 13.3, 14.2, 14.3
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { WorkflowConfig, WorkflowTransition } from '@/types/workflow';
import { StatusBadge } from './StatusBadge';
import { TransitionActions } from './TransitionActions';
import { TransitionDialog } from './TransitionDialog';

export interface WorkflowEngineProps<T> {
  /** The workflow configuration */
  config: WorkflowConfig;
  /** The current record (must have id and status fields) */
  record: T & { id: string; status: string };
  /** TanStack Query invalidation keys after transition */
  invalidateKeys: string[][];
  /** Optional: render the timeline of past transitions */
  showTimeline?: boolean;
  /** Timeline data endpoint */
  timelineEndpoint?: (id: string) => string;
}

interface TransitionPayload {
  transition: WorkflowTransition;
  data: Record<string, unknown>;
}

export function WorkflowEngine<T>({
  config,
  record,
  invalidateKeys,
}: WorkflowEngineProps<T>) {
  const queryClient = useQueryClient();
  const [activeTransition, setActiveTransition] = useState<WorkflowTransition | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mutation for executing transitions with optimistic updates
  const mutation = useMutation({
    mutationFn: async ({ transition, data }: TransitionPayload) => {
      const method = transition.method ?? 'POST';
      const url = transition.endpoint(record.id);

      if (method === 'DELETE') {
        return api.delete(url);
      }
      if (method === 'PATCH') {
        // Always include the target status in PATCH requests
        return api.patch(url, { status: transition.to, ...data });
      }
      return api.post(url, { status: transition.to, ...data });
    },
    onMutate: async ({ transition }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      for (const key of invalidateKeys) {
        await queryClient.cancelQueries({ queryKey: key });
      }

      // Snapshot the previous record data for rollback
      const previousData: unknown[] = [];
      for (const key of invalidateKeys) {
        const data = queryClient.getQueryData(key);
        previousData.push(data);
      }

      // Optimistically update the record status in any matching queries
      for (const key of invalidateKeys) {
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old) return old;

          // Handle single-record queries (detail views)
          if (isRecordLike(old) && old.id === record.id) {
            return { ...old, status: transition.to };
          }

          // Handle list queries with results array
          if (isPaginatedResponse(old)) {
            return {
              ...old,
              results: old.results.map((item: Record<string, unknown>) =>
                item.id === record.id ? { ...item, status: transition.to } : item
              ),
            };
          }

          return old;
        });
      }

      return { previousData };
    },
    onSuccess: (_data, { transition }) => {
      setSuccessMessage(`${transition.action} completed successfully`);
      setErrorMessage(null);

      // Invalidate queries to sync with server
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        invalidateKeys.forEach((key, index) => {
          if (context.previousData[index] !== undefined) {
            queryClient.setQueryData(key, context.previousData[index]);
          }
        });
      }

      const message =
        error instanceof Error ? error.message : 'Transition failed. Please try again.';
      setErrorMessage(message);
      setSuccessMessage(null);

      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const handleTransitionClick = useCallback((transition: WorkflowTransition) => {
    // If the transition requires confirmation, reason, or form fields, open the dialog
    if (transition.confirm || transition.requiresReason || transition.formFields?.length) {
      setActiveTransition(transition);
    } else {
      // Execute immediately
      mutation.mutate({ transition, data: {} });
    }
  }, [mutation]);

  const handleDialogSubmit = useCallback(
    (data: Record<string, unknown>) => {
      if (!activeTransition) return;
      mutation.mutate({ transition: activeTransition, data });
      setActiveTransition(null);
    },
    [activeTransition, mutation]
  );

  const handleDialogClose = useCallback(() => {
    setActiveTransition(null);
  }, []);

  return (
    <div className="space-y-3">
      {/* Status badge and actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={record.status} config={config} />
        <TransitionActions
          record={record}
          config={config}
          onTransition={handleTransitionClick}
          isLoading={mutation.isPending}
        />
      </div>

      {/* Terminal state info message */}
      {config.terminalMessage && config.terminalMessage[record.status] && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-2.5" role="note">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-blue-700">
              {config.terminalMessage[record.status]}
            </p>
          </div>
        </div>
      )}

      {/* Success feedback */}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-3" role="status">
          <div className="flex items-center">
            <svg
              className="h-4 w-4 text-green-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-2 text-sm font-medium text-green-800">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Error feedback */}
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-3" role="alert">
          <div className="flex items-center">
            <svg
              className="h-4 w-4 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-2 text-sm font-medium text-red-800">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Transition dialog */}
      {activeTransition && (
        <TransitionDialog
          transition={activeTransition}
          isOpen={true}
          onClose={handleDialogClose}
          onSubmit={handleDialogSubmit}
          isSubmitting={mutation.isPending}
        />
      )}
    </div>
  );
}

// --- Type Guards ---

function isRecordLike(value: unknown): value is { id: string; status: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'status' in value
  );
}

function isPaginatedResponse(
  value: unknown
): value is { results: Record<string, unknown>[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'results' in value &&
    Array.isArray((value as { results: unknown }).results)
  );
}
