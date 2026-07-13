/**
 * WorkflowTimeline
 *
 * Renders a vertical timeline of past workflow status transitions.
 * Fetches timeline entries from the provided endpoint using TanStack Query,
 * then displays each transition with action label, from → to status badges,
 * actor name, formatted timestamp, and optional reason.
 *
 * Requirements: 4.6, 12.4
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { WorkflowConfig, WorkflowTimelineEntry } from '@/types/workflow';
import { StatusBadge } from './StatusBadge';

export interface WorkflowTimelineProps {
  /** The record ID to fetch timeline for */
  recordId: string;
  /** Endpoint builder — returns the URL given a record ID */
  endpoint: (id: string) => string;
  /** Workflow configuration for status label/color lookups */
  config: WorkflowConfig;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading timeline">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-gray-200" />
            {i < 3 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="flex-1 space-y-2 pb-4">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkflowTimeline({ recordId, endpoint, config }: WorkflowTimelineProps) {
  const { data: entries, isLoading, isError } = useQuery<WorkflowTimelineEntry[]>({
    queryKey: ['workflow-timeline', config.id, recordId],
    queryFn: async () => {
      const response = await api.get(endpoint(recordId));
      return response.data;
    },
  });

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 p-3" role="alert">
        <p className="text-sm text-red-700">Failed to load timeline. Please try again.</p>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-gray-500">
        No status changes recorded
      </div>
    );
  }

  // Newest entries first
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-4">
        {sortedEntries.map((entry, index) => {
          const isLast = index === sortedEntries.length - 1;

          return (
            <li key={entry.id} className="relative pb-4">
              {/* Vertical connecting line */}
              {!isLast && (
                <span
                  className="absolute left-[5px] top-3 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}

              <div className="relative flex items-start gap-3">
                {/* Timeline dot */}
                <div className="flex h-3 w-3 items-center justify-center mt-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-400 ring-2 ring-white" />
                </div>

                {/* Entry content */}
                <div className="min-w-0 flex-1">
                  {/* Action label */}
                  <p className="text-sm font-medium text-gray-900">
                    {entry.action}
                  </p>

                  {/* Status transition badges */}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={entry.from_status} config={config} />
                    <svg
                      className="h-3 w-3 text-gray-400 shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <StatusBadge status={entry.to_status} config={config} />
                  </div>

                  {/* Actor and timestamp */}
                  <p className="mt-1 text-xs text-gray-500">
                    {entry.actor.name} &middot; {formatTimestamp(entry.timestamp)}
                  </p>

                  {/* Reason (if provided) */}
                  {entry.reason && (
                    <p className="mt-1 text-xs text-gray-600 italic">
                      &ldquo;{entry.reason}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
