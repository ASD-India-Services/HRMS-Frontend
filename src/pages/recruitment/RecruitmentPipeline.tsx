/**
 * RecruitmentPipeline — Table-based recruitment pipeline page
 *
 * A page for HR managers to manage the recruitment pipeline.
 * Uses shared DataTable, FilterBar, Pagination, and Can components.
 *
 * Key behaviors:
 * - Table view of all applicants with status badges and job opening title
 * - Status filter via FilterBar with URL sync
 * - Click candidate row to open comprehensive Right-Side Slide-Over Detail Drawer
 * - Clean top header with candidate details without action buttons cluttering the top
 * - Application Actions (Move to Screening & Reject buttons) located at the bottom for "applied" candidates
 * - Candidates with other statuses (selected, screening, interview, onboarded, rejected) display their information only
 * - Complete candidate information display (Name, Email, Phone, Job Opening, Resume, Notes, Referral, Rating, Applied Date)
 * - Visual stage progression stepper (read-only)
 * - Restricted to org_admin, hr_manager via Can component
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { jobApplicantsCrudConfig } from '@/config/crud/jobApplicants';
import { recruitmentWorkflow } from '@/config/workflows/recruitment';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { StatusBadge } from '@/components/WorkflowEngine/StatusBadge';
import { CreateButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import { Can } from '@/components/Can';
import api from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@/types/datatable';
import { ApplicantDetailDrawer, type ApplicantRow } from './ApplicantDetailDrawer';

const APPLICANT_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Applicant Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'applicant@example.com' },
  { key: 'phone', label: 'Phone', type: 'text', placeholder: '+91...' },
  { key: 'job_opening', label: 'Job Opening', type: 'select', required: true, optionsEndpoint: '/api/v1/recruitment/job-openings/', optionsLabelKey: 'title' },
  { key: 'resume_url', label: 'Resume URL', type: 'text', placeholder: 'https://...' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

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

export function RecruitmentPipeline() {
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/recruitment/applicants/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [jobApplicantsCrudConfig.queryKey] });
      setShowCreate(false);
    },
  });

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

  // Sync selectedApplicant when data refetches
  useEffect(() => {
    if (selectedApplicant && queryResult.data?.results) {
      const updated = queryResult.data.results.find(
        (row) => (row as Record<string, unknown>).id === selectedApplicant.id
      );
      if (updated) {
        setSelectedApplicant(updated as ApplicantRow);
      }
    }
  }, [queryResult.data?.results, selectedApplicant]);

  // Handle row click to select candidate and open the right-side detail drawer
  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => {
      const applicantData = row as ApplicantRow;
      setSelectedApplicant((prev) => (prev?.id === applicantData.id ? null : applicantData));
    },
    []
  );

  // Custom columns with selection indicator, status badge, and job opening title
  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Candidate Name',
        sortable: true,
        render: (value: unknown, row: Record<string, unknown>) => {
          const isSelected = selectedApplicant?.id === row.id;
          return (
            <div className="flex items-center gap-2.5">
              {isSelected ? (
                <span className="h-2.5 w-2.5 rounded-full bg-primary-main ring-4 ring-primary-lighter animate-pulse" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-grey-300" />
              )}
              <span className={`font-medium ${isSelected ? 'text-primary-dark font-semibold' : 'text-ink-primary'}`}>
                {String(value || '—')}
              </span>
              {row.is_referral && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning-lighter text-warning-dark" title={`Referred by ${row.referred_by_name || 'Staff'}`}>
                  Referral
                </span>
              )}
            </div>
          );
        },
      },
      { key: 'email', header: 'Email', sortable: true },
      {
        key: 'phone',
        header: 'Phone',
        sortable: false,
        render: (value: unknown) => (
          <span className="text-ink-secondary">{String(value || '—')}</span>
        ),
      },
      {
        key: 'job_opening.title',
        header: 'Job Opening',
        sortable: true,
        render: (_value: unknown, row: Record<string, unknown>) => {
          const opening = row.job_opening;
          let title = '';
          if (opening && typeof opening === 'object' && 'title' in opening) {
            title = String((opening as { title: unknown }).title || '');
          } else if (typeof opening === 'string' && opening.trim()) {
            title = opening;
          }
          if (!title && typeof row.job_opening_title === 'string' && row.job_opening_title.trim()) {
            title = row.job_opening_title;
          }
          return (
            <span className="inline-flex items-center gap-1.5 text-ink-primary font-medium">
              <svg className="w-3.5 h-3.5 text-ink-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {title || '—'}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Current Stage / Status',
        sortable: true,
        render: (_value: unknown, row: Record<string, unknown>) => {
          return (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={String(row.status ?? '')} config={recruitmentWorkflow} />
              {row.stage_name && row.stage_name !== row.status && (
                <span className="text-xs text-ink-secondary font-normal">
                  ({String(row.stage_name)})
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [selectedApplicant]
  );

  return (
    <Can permissions={['recruitment.view']}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-primary">Pipeline — All Candidates</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Select any candidate to view their complete application details. Candidates with "Applied" status can be moved to Screening.
            </p>
          </div>
          <CreateButton permission="recruitment.create" label="Add Applicant" onClick={() => setShowCreate(true)} />
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={jobApplicantsCrudConfig.filters}
          values={filterValues}
          onChange={setFilter}
          onClearAll={clearFilters}
        />

        {/* Data table */}
        <div className="relative">
          <DataTable
            queryResult={queryResult}
            columns={columns}
            onRowClick={handleRowClick}
          />
        </div>

        {/* Right-Side Slide-Over Applicant Detail Drawer */}
        {selectedApplicant && (
          <ApplicantDetailDrawer
            applicant={selectedApplicant}
            onClose={() => setSelectedApplicant(null)}
            onApplicantUpdated={(updated) => setSelectedApplicant(updated)}
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

        {/* Add Applicant Modal */}
        <CrudModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="Add Applicant"
          fields={APPLICANT_FIELDS}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </div>
    </Can>
  );
}
