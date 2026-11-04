/**
 * Job Openings list page with status badges, filters, and pagination.
 * Requirements: 19.1, 24.2
 */

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useJobOpenings } from '@/hooks/useRecruitment';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { CreateButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import api from '@/lib/api';
import type { JobOpeningStatus } from '@/types/recruitment';

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
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);

  const { data: hrSettings } = useQuery({
    queryKey: ['hr-settings-public'],
    queryFn: async () => {
      try {
        const res = await api.get<{ company_website?: string }>('/api/v1/hr-settings/');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/recruitment/job-openings/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      setShowCreate(false);
    },
  });

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

  const { data, isLoading, isError, error, isFetching, refetch } = useJobOpenings({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  const companyWebsite =
    hrSettings?.company_website ||
    data?.results?.find((item) => item.company_website)?.company_website ||
    '';

  const handleOpenCompanyWebsite = (url?: string) => {
    const targetUrl = url || companyWebsite;
    if (targetUrl) {
      const formatted = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
        ? targetUrl
        : `https://${targetUrl}`;
      window.open(formatted, '_blank', 'noopener,noreferrer');
    } else {
      setShowWebsiteModal(true);
    }
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
          <button
            type="button"
            onClick={() => handleOpenCompanyWebsite()}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            title="Open Company Website / Careers Page"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Company Website
          </button>
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

      {/* Loading */}
      {isLoading && <TableSkeleton columns={6} rows={5} />}

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
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Website</th>
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
                      <div className="text-xs text-gray-500">{opening.designation.title}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{opening.department.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {opening.filled}/{opening.vacancies}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(opening.posted_on).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {opening.closes_on ? new Date(opening.closes_on).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenCompanyWebsite(opening.company_website)}
                        className="inline-flex items-center gap-1 rounded bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 border border-gray-200 transition-colors"
                        title="Open on Company Website"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Website</span>
                      </button>
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

      {/* Missing Website Configuration Modal */}
      {showWebsiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Company Website Not Configured</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Please add your company website link in HR Settings first so job openings can link to it.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWebsiteModal(false)}
                className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <a
                href="/hr-settings"
                className="inline-flex items-center rounded-md bg-primary-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
              >
                Go to HR Settings
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
