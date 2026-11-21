/**
 * Interview scheduling interface — list of upcoming/past interviews with status and details.
 * Requirements: 19.3, 24.2
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInterviews } from '@/hooks/useRecruitment';
import { CreateButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

const INTERVIEW_FIELDS: FieldConfig[] = [
  { key: 'applicant', label: 'Applicant', type: 'select', optionsEndpoint: '/api/v1/recruitment/applicants/', optionsLabelKey: 'name' },
  { key: 'interviewer', label: 'Interviewer', type: 'select', optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'scheduled_at', label: 'Scheduled At', type: 'date', required: true },
  { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number', required: true, placeholder: '60' },
  { key: 'location', label: 'Location', type: 'text', placeholder: 'Conference Room / Video Link' },
  {
    key: 'interview_type',
    label: 'Interview Type',
    type: 'select',
    options: [
      { value: 'in_person', label: 'In Person' },
      { value: 'video', label: 'Video' },
      { value: 'phone', label: 'Phone' },
    ],
  },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-primary-lighter text-primary-dark' },
  completed: { label: 'Completed', className: 'bg-success-lighter text-success-dark' },
  cancelled: { label: 'Cancelled', className: 'bg-surface-neutral text-ink-primary' },
};

const PAGE_SIZE = 10;

export function InterviewSchedule() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/recruitment/interviews/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      setShowCreate(false);
    },
  });

  const { data, isLoading, isError, error, isFetching } = useInterviews({
    status: statusFilter || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Interview Schedule</h2>
          <p className="mt-0.5 text-sm text-ink-secondary">
            {data ? `${data.count} interview${data.count !== 1 ? 's' : ''}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateButton permission="recruitment.create" label="Schedule Interview" onClick={() => setShowCreate(true)} />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            aria-label="Filter by interview status"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
          <span className="ml-3 text-sm text-ink-secondary">Loading interviews...</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-md bg-error-lighter p-4">
          <p className="text-sm text-error-dark">
            Failed to load interviews. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {/* Empty */}
      {data && data.results.length === 0 && (
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-grey-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-4 text-ink-secondary">No interviews scheduled.</p>
        </div>
      )}

      {/* Interview Cards */}
      {data && data.results.length > 0 && (
        <div className="space-y-3">
          {data.results.map((interview) => {
            const statusStyle = STATUS_STYLES[interview.status] || STATUS_STYLES.scheduled;
            return (
              <div
                key={interview.id}
                className="rounded-lg border border-divider bg-surface-paper p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Applicant & Job info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {interview.applicant_name || 'Unknown Applicant'}
                      </p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.className}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-secondary">
                      {interview.job_opening_title || '—'}
                    </p>
                  </div>

                  {/* Right: Schedule info */}
                  <div className="flex items-center gap-4 text-sm text-ink-secondary">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-ink-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{interview.scheduled_at ? new Date(interview.scheduled_at).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-ink-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{interview.scheduled_at ? new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      <span className="text-xs text-ink-disabled">({interview.duration_minutes} min)</span>
                    </div>
                  </div>
                </div>

                {/* Interviewer & Feedback */}
                <div className="mt-3 flex flex-col gap-2 border-t border-divider pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink-secondary">
                    <span className="font-medium text-ink-primary">Interviewer:</span>{' '}
                    {interview.interviewer_name || '—'}
                  </p>
                  {interview.rating !== undefined && interview.rating !== null && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-ink-secondary">Rating:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`h-3.5 w-3.5 ${star <= (interview.rating ?? 0) ? 'text-warning-light' : 'text-grey-200'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {interview.feedback && (
                  <p className="mt-2 text-xs text-ink-secondary italic">
                    &ldquo;{interview.feedback}&rdquo;
                  </p>
                )}
              </div>
            );
          })}

          {/* Fetching indicator */}
          {isFetching && !isLoading && (
            <p className="text-center text-xs text-primary-main">Updating...</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between" aria-label="Interviews pagination">
          <p className="text-sm text-ink-secondary">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outlined" color="inherit"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button type="button" variant="outlined" color="inherit"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </nav>
      )}

      {/* Schedule Interview Modal */}
      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Schedule Interview"
        fields={INTERVIEW_FIELDS}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
