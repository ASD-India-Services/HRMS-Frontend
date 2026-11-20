/**
 * Job Openings list page with status badges, filters, and pagination.
 * Requirements: 19.1, 24.2
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useJobOpenings } from '@/hooks/useRecruitment';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { CreateButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { JobOpening, JobOpeningStatus } from '@/types/recruitment';
import { formatDate } from '@/utils/formatters';

const JOB_OPENING_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'department', label: 'Department', type: 'select', optionsEndpoint: '/api/v1/departments/' },
  { key: 'designation', label: 'Designation', type: 'select', optionsEndpoint: '/api/v1/designations/', optionsLabelKey: 'title' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'vacancies', label: 'Vacancies', type: 'number', required: true, placeholder: '1' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
      { value: 'on_hold', label: 'On Hold' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { key: 'posted_on', label: 'Posted On', type: 'date' },
  { key: 'closes_on', label: 'Closes On', type: 'date' },
];

const PAGE_SIZE = 10;

const STATUS_BADGES: Record<JobOpeningStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800' },
  on_hold: { label: 'On Hold', className: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
};

interface JobOpeningsProps {
  onSelectOpening?: (id: string) => void;
}

export function JobOpenings({ onSelectOpening }: JobOpeningsProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<JobOpeningStatus | ''>('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingOpening, setEditingOpening] = useState<JobOpening | null>(null);
  const [deletingOpening, setDeletingOpening] = useState<JobOpening | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/recruitment/job-openings/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      setShowCreate(false);
      setActionError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to create job opening.';
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/api/v1/recruitment/job-openings/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      setEditingOpening(null);
      setActionError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update job opening.';
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/recruitment/job-openings/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      setDeletingOpening(null);
      setActionError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete job opening.';
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const editInitialValues = useMemo(() => {
    if (!editingOpening) return {};
    return {
      title: editingOpening.title || '',
      department:
        (typeof editingOpening.department === 'object' && editingOpening.department !== null
          ? String(editingOpening.department.id)
          : (editingOpening as any).department_id || (typeof editingOpening.department === 'string' ? editingOpening.department : '')) || '',
      designation:
        (typeof editingOpening.designation === 'object' && editingOpening.designation !== null
          ? String(editingOpening.designation.id)
          : (editingOpening as any).designation_id || (typeof editingOpening.designation === 'string' ? editingOpening.designation : '')) || '',
      description: editingOpening.description || '',
      vacancies: editingOpening.vacancies || 1,
      status: editingOpening.status || 'open',
      posted_on: editingOpening.posted_on ? editingOpening.posted_on.split('T')[0] : '',
      closes_on: editingOpening.closes_on ? editingOpening.closes_on.split('T')[0] : '',
    };
  }, [editingOpening]);

  const debounceTimeout = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debounceTimeout(value);
  };

  const { data, isLoading, isError, isFetching, refetch } = useJobOpenings({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  const handleCopyApplyLink = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const applyUrl = `${window.location.origin}/careers/apply/${jobId}`;
    navigator.clipboard.writeText(applyUrl);
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2500);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Job Openings</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {data ? `${data.count} opening${data.count !== 1 ? 's' : ''}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateButton permission="job_openings.create" label="Create Job Opening" onClick={() => setShowCreate(true)} />
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search job openings..."
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Search job openings"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as JobOpeningStatus | ''); setPage(1); }}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Action Error Alert */}
      {actionError && !deletingOpening && !editingOpening && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && <TableSkeleton columns={8} rows={5} />}

      {/* Error */}
      {isError && <ErrorState onRetry={refetch} />}

      {/* Empty State */}
      {data && data.results.length === 0 && (
        <EmptyState module="recruitment" />
      )}

      {/* Table */}
      {data && data.results.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Position</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Department</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vacancies</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Posted</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Closes</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Apply Link</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.results.map((opening) => {
                const badge = STATUS_BADGES[opening.status];
                return (
                  <tr
                    key={opening.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onSelectOpening?.(opening.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{opening.title}</div>
                      <div className="text-xs text-gray-500">
                        {(typeof opening.designation === 'object' && (opening.designation?.title || opening.designation?.name)) ||
                          (opening as any).designation_name ||
                          ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(typeof opening.department === 'object' && opening.department?.name) ||
                        (opening as any).department_name ||
                        '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {opening.filled ?? 0}/{opening.vacancies}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(opening.posted_on)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {opening.closes_on ? formatDate(opening.closes_on) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => handleCopyApplyLink(opening.id, e)}
                          className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-primary-700 border border-gray-200 shadow-xs transition-colors"
                          title="Copy Direct Candidate Application Link"
                        >
                          {copiedJobId === opening.id ? (
                            <>
                              <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-700 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Apply Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/recruitment/stages?job=${opening.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 shadow-xs transition-colors cursor-pointer"
                          title="Configure Hiring Stages"
                          aria-label={`Configure stages for ${opening.title}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionError(null);
                            setEditingOpening(opening);
                          }}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 shadow-xs transition-colors cursor-pointer"
                          title="Edit Job Opening"
                          aria-label={`Edit ${opening.title}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionError(null);
                            setDeletingOpening(opening);
                          }}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 shadow-xs transition-colors cursor-pointer"
                          title="Delete Job Opening"
                          aria-label={`Delete ${opening.title}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Fetching indicator */}
          {isFetching && !isLoading && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-center text-xs text-primary-600">
              Updating...
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between" aria-label="Job openings pagination">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </nav>
      )}

      {/* Create Modal */}
      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Job Opening"
        fields={JOB_OPENING_FIELDS}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Edit Modal */}
      <CrudModal
        isOpen={!!editingOpening}
        onClose={() => {
          setEditingOpening(null);
          setActionError(null);
        }}
        title="Edit Job Opening"
        fields={JOB_OPENING_FIELDS}
        initialValues={editInitialValues}
        onSubmit={(data) => {
          if (editingOpening) {
            updateMutation.mutate({ id: editingOpening.id, data });
          }
        }}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingOpening}
        onClose={() => {
          setDeletingOpening(null);
          setActionError(null);
        }}
        onConfirm={() => {
          if (deletingOpening) {
            deleteMutation.mutate(deletingOpening.id);
          }
        }}
        title="Delete Job Opening"
        message={`Are you sure you want to delete the job opening "${deletingOpening?.title}"? All applicants associated with this opening will also be affected. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
