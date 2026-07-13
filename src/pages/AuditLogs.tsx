/**
 * Audit Logs Page
 *
 * Displays a searchable, filterable list of all audit log entries.
 * Admins can filter by module, action, and user email.
 * Each row is expandable to show the `changes` JSON detail.
 */

import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DataTable, Pagination, FilterBar, useFilterSync } from '@/components/DataTable';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import api from '@/lib/api';

interface AuditLogEntry {
  id: string;
  user_email: string;
  user_name: string;
  action: string;
  module: string;
  model_name: string;
  record_id: string | null;
  description: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

interface AuditLogResponse {
  count: number;
  page: number;
  page_size: number;
  results: AuditLogEntry[];
}

const ACTION_OPTIONS = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'login', label: 'Login' },
  { value: 'status_change', label: 'Status Change' },
];

const MODULE_OPTIONS = [
  { value: 'employees', label: 'Employees' },
  { value: 'leaves', label: 'Leaves' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'training', label: 'Training' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'shifts', label: 'Shifts' },
  { value: 'appraisals', label: 'Appraisals' },
  { value: 'grievance', label: 'Grievance' },
  { value: 'travel', label: 'Travel' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'permissions', label: 'Permissions' },
];

const filters: FilterConfig[] = [
  { key: 'user_email', label: 'User Email', type: 'search', debounceMs: 400 },
  { key: 'module', label: 'Module', type: 'select', options: MODULE_OPTIONS },
  { key: 'action', label: 'Action', type: 'select', options: ACTION_OPTIONS },
];

const columns: ColumnDef<AuditLogEntry>[] = [
  {
    key: 'timestamp',
    header: 'Timestamp',
    sortable: true,
    render: (value: unknown) => {
      const date = new Date(value as string);
      return date.toLocaleString();
    },
  },
  { key: 'user_email', header: 'User', sortable: true },
  {
    key: 'action',
    header: 'Action',
    sortable: true,
    render: (value: unknown) => {
      const action = value as string;
      const colorMap: Record<string, string> = {
        create: 'bg-green-100 text-green-800',
        update: 'bg-blue-100 text-blue-800',
        delete: 'bg-red-100 text-red-800',
        approve: 'bg-emerald-100 text-emerald-800',
        reject: 'bg-orange-100 text-orange-800',
        login: 'bg-gray-100 text-gray-800',
        status_change: 'bg-purple-100 text-purple-800',
      };
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[action] || 'bg-gray-100 text-gray-800'}`}>
          {action.replace('_', ' ')}
        </span>
      );
    },
  },
  { key: 'module', header: 'Module', sortable: true },
  { key: 'model_name', header: 'Model', sortable: false },
  { key: 'description', header: 'Description', sortable: false },
];

export default function AuditLogs() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { filterValues, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.user_email) p.user_email = filterValues.user_email;
    if (filterValues.module) p.module = filterValues.module;
    if (filterValues.action) p.action = filterValues.action;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const response = await api.get<AuditLogResponse>('/api/v1/audit-logs/', { params });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const handleRowClick = (row: AuditLogEntry) => {
    setExpandedId(expandedId === row.id ? null : row.id);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track all changes and actions performed across the HRMS platform
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <FilterBar filters={filters} />
        </div>

        <DataTable
          queryResult={queryResult as never}
          columns={columns}
          onRowClick={handleRowClick}
        />

        {/* Expanded detail row */}
        {expandedId && queryResult.data?.results && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            {(() => {
              const entry = queryResult.data.results.find((r) => r.id === expandedId);
              if (!entry) return null;

              const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;
              const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

              return (
                <div className="space-y-3">
                  {entry.record_id && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Record ID:</span>{' '}
                      <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">{entry.record_id}</code>
                    </div>
                  )}
                  {entry.ip_address && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">IP Address:</span>{' '}
                      <span className="text-gray-600">{entry.ip_address}</span>
                    </div>
                  )}
                  {hasChanges && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Changes:</span>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
                        {JSON.stringify(entry.changes, null, 2)}
                      </pre>
                    </div>
                  )}
                  {hasMetadata && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Metadata:</span>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!hasChanges && !hasMetadata && !entry.record_id && (
                    <p className="text-sm text-gray-500">No additional details available.</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {queryResult.data && queryResult.data.count > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={queryResult.data.count}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </div>
  );
}
