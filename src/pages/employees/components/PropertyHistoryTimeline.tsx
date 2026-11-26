/**
 * PropertyHistoryTimeline
 *
 * Displays an audit timeline of employee property changes (transfers, promotions,
 * and direct work information updates) recorded by Employee History Tracking.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { EMPLOYEES } from '@/lib/endpoints';
import type { PropertyHistoryItem } from '@/types/employee';
import { formatDateTime } from '@/utils/formatters';

interface PropertyHistoryTimelineProps {
  employeeId: string;
  title?: string;
  compact?: boolean;
}

export function PropertyHistoryTimeline({
  employeeId,
  title = 'Employee History Tracking',
  compact = false,
}: PropertyHistoryTimelineProps) {
  const [filterType, setFilterType] = useState<string>('all');

  const {
    data: historyItems,
    isLoading,
    isError,
    refetch,
  } = useQuery<PropertyHistoryItem[]>({
    queryKey: ['employee-property-history', employeeId],
    queryFn: async () => {
      const response = await api.get(EMPLOYEES.PROPERTY_HISTORY(employeeId));
      // Handle pagination or array response
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    },
    enabled: Boolean(employeeId),
  });

  const items = historyItems || [];

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.change_type === filterType;
  });

  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case 'transfer':
        return {
          label: 'Transfer',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          dotColor: 'bg-blue-500',
        };
      case 'promotion':
        return {
          label: 'Promotion',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          dotColor: 'bg-purple-500',
        };
      case 'update':
      default:
        return {
          label: 'Direct Update',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500',
        };
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {items.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                {items.length} {items.length === 1 ? 'change' : 'changes'}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Audit trail of monitored employee fields and lifecycle changes (configured in General Settings)
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-50 p-1 rounded-lg border border-gray-200/80">
            {[
              { id: 'all', label: 'All' },
              { id: 'update', label: 'Updates' },
              { id: 'transfer', label: 'Transfers' },
              { id: 'promotion', label: 'Promotions' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterType === tab.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-4 py-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-3 w-3 rounded-full bg-gray-200 mt-1.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-64 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg bg-red-50 p-4 text-center">
          <p className="text-sm text-red-700 mb-2">Unable to load employee history audit trail.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center text-xs font-semibold text-red-800 hover:underline"
          >
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !isError && filteredItems.length === 0 && (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No Change History Recorded</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
            {filterType !== 'all'
              ? `No changes recorded under "${filterType}".`
              : 'When monitored fields are configured in General Settings > Employee History Tracking, any modifications to employee fields (Department, Designation, Manager, etc.) will be logged here automatically.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && filteredItems.length > 0 && (
        <div className="flow-root">
          <ul role="list" className="-mb-6">
            {filteredItems.map((entry, idx) => {
              const isLast = idx === filteredItems.length - 1;
              const badge = getChangeTypeBadge(entry.change_type);
              const fieldTitle =
                entry.field_display ||
                entry.field_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const oldDisplay = entry.old_display || entry.old_value || 'None';
              const newDisplay = entry.new_display || entry.new_value || 'None';

              return (
                <li key={entry.id} className="relative pb-6">
                  {!isLast && (
                    <span
                      className="absolute left-[7px] top-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start gap-3.5">
                    {/* Dot */}
                    <div className="flex h-4 w-4 items-center justify-center mt-1">
                      <span className={`h-2.5 w-2.5 rounded-full ${badge.dotColor} ring-4 ring-white`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 rounded-lg border border-gray-100 bg-gray-50/50 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {fieldTitle}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(entry.changed_at)}
                        </span>
                      </div>

                      {/* Transition pills */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                        <div className="inline-flex items-center gap-1.5 rounded bg-gray-200/70 px-2.5 py-1 text-gray-700">
                          <span className="text-[10px] uppercase font-bold text-gray-500">From</span>
                          <span className="font-medium">{oldDisplay}</span>
                        </div>
                        <svg
                          className="h-3.5 w-3.5 text-gray-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                        <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-blue-900 font-semibold shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-blue-600">To</span>
                          <span>{newDisplay}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

