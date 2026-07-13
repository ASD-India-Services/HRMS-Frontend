/**
 * RecruitmentPipeline — Table-based recruitment pipeline page
 *
 * A page for HR managers to manage the recruitment pipeline.
 * Uses shared DataTable, FilterBar, Pagination, WorkflowEngine, and Can components.
 *
 * Key behaviors:
 * - Table view of all applicants with status badges and job opening title
 * - Status filter via FilterBar with URL sync
 * - WorkflowEngine actions per row (move to next stage, reject)
 * - Click row to view applicant details (expand inline)
 * - Restricted to org_admin, hr_manager via Can component
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { useState, useCallback, useMemo } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { jobApplicantsCrudConfig } from '@/config/crud/jobApplicants';
import { recruitmentWorkflow } from '@/config/workflows/recruitment';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { StatusBadge } from '@/components/WorkflowEngine/StatusBadge';
import { Can } from '@/components/Can';
import type { ColumnDef } from '@/types/datatable';

// Create CRUD hooks from the job applicants config
const applicantCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: jobApplicantsCrudConfig.queryKey,
  endpoints: {
    list: jobApplicantsCrudConfig.endpoints.list,
    create: jobApplicantsCrudConfig.endpoints.create,
    detail: jobApplicantsCrudConfig.endpoints.detail,
    update: jobApplicantsCrudConfig.endpoints.update,
    delete: jobApplicantsCrudConfig.endpoints.delete,
  },
});

// Applicant row interface for type safety
interface ApplicantRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  job_opening?: { id: string; title: string };
  applied_date?: string;
  [key: string]: unknown;
}

export function RecruitmentPipeline() {
  const [expandedApplicantId, setExpandedApplicantId] = useState<string | null>(null);

  // URL-synced filters and pagination
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters: jobApplicantsCrudConfig.filters });

  // Build query params from filter state
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page,
      page_size: pageSize,
    };
    for (const [key, value] of Object.entries(filterValues)) {
      if (value) {
        params[key] = value;
      }
    }
    return params;
  }, [filterValues, page, pageSize]);

  // Fetch applicants using CRUD hooks
  const queryResult = applicantCrud.useList(queryParams);

  // Handle row click to expand/collapse applicant details
  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => {
      const id = row.id as string;
      setExpandedApplicantId((prev) => (prev === id ? null : id));
    },
    []
  );

  // Custom columns with status badge and job opening title
  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      { key: 'phone', header: 'Phone', sortable: false },
      {
        key: 'job_opening.title',
        header: 'Job Opening',
        sortable: true,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (value: unknown) => (
          <StatusBadge status={String(value ?? '')} config={recruitmentWorkflow} />
        ),
      },
    ],
    []
  );

  return (
    <Can roles={['org_admin', 'hr_manager']}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Recruitment Pipeline</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage applicants through the hiring process
          </p>
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={jobApplicantsCrudConfig.filters}
          values={filterValues}
          onChange={setFilter}
          onClearAll={clearFilters}
        />

        {/* Data table */}
        <DataTable
          queryResult={queryResult}
          columns={columns}
          onRowClick={handleRowClick}
        />

        {/* Expanded applicant detail with workflow actions */}
        {expandedApplicantId && queryResult.data?.results && (
          <ApplicantDetail
            applicant={
              queryResult.data.results.find(
                (row) => (row as Record<string, unknown>).id === expandedApplicantId
              ) as ApplicantRow | undefined
            }
            onClose={() => setExpandedApplicantId(null)}
          />
        )}

        {/* Pagination */}
        {queryResult.data && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={queryResult.data.count}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </Can>
  );
}

// --- Applicant Detail Panel ---

interface ApplicantDetailProps {
  applicant?: ApplicantRow;
  onClose: () => void;
}

function ApplicantDetail({ applicant, onClose }: ApplicantDetailProps) {
  if (!applicant) return null;

  return (
    <div className="my-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{applicant.name}</h3>
          <p className="mt-1 text-sm text-gray-600">
            {applicant.email}
            {applicant.phone && ` · ${applicant.phone}`}
          </p>
          {applicant.job_opening && (
            <p className="mt-1 text-sm text-gray-500">
              Applied for: <span className="font-medium">{applicant.job_opening.title}</span>
            </p>
          )}
          {applicant.applied_date && (
            <p className="mt-1 text-xs text-gray-400">
              Applied on: {new Date(applicant.applied_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          aria-label="Close details"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Workflow actions */}
      <div className="mt-4 border-t border-indigo-100 pt-4">
        <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
          Pipeline Actions
        </p>
        <WorkflowEngine
          config={recruitmentWorkflow}
          record={{ id: applicant.id, status: applicant.status }}
          invalidateKeys={[
            [jobApplicantsCrudConfig.queryKey, 'list'],
            [jobApplicantsCrudConfig.queryKey, 'detail', applicant.id],
          ]}
        />
      </div>
    </div>
  );
}
