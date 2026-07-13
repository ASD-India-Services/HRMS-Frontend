/**
 * Interview scheduling interface — list of upcoming/past interviews with status and details.
 * Requirements: 19.3, 24.2
 */

import { useState } from 'react';
import { useInterviews } from '@/hooks/useRecruitment';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
};

const PAGE_SIZE = 10;

export function InterviewSchedule() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

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
          <h2 className="text-lg font-semibold text-gray-900">Interview Schedule</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {data ? `${data.count} interview${data.count !== 1 ? 's' : ''}` : 'Loading...'}
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          aria-label="Filter by interview status"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-600">Loading interviews...</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load interviews. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {/* Empty */}
      {data && data.results.length === 0 && (
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-4 text-gray-600">No interviews scheduled.</p>
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
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Applicant & Job info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {interview.applicant.name}
                      </p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.className}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {interview.job_opening.title}
                    </p>
                  </div>

                  {/* Right: Schedule info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(interview.scheduled_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{interview.scheduled_time}</span>
                      <span className="text-xs text-gray-400">({interview.duration_minutes} min)</span>
                    </div>
                  </div>
                </div>

                {/* Interviewer & Feedback */}
                <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Interviewer:</span>{' '}
                    {interview.interviewer.first_name} {interview.interviewer.last_name}
                  </p>
                  {interview.rating !== undefined && interview.rating !== null && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Rating:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`h-3.5 w-3.5 ${star <= (interview.rating ?? 0) ? 'text-yellow-400' : 'text-gray-200'}`}
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
                  <p className="mt-2 text-xs text-gray-500 italic">
                    &ldquo;{interview.feedback}&rdquo;
                  </p>
                )}
              </div>
            );
          })}

          {/* Fetching indicator */}
          {isFetching && !isLoading && (
            <p className="text-center text-xs text-primary-600">Updating...</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between" aria-label="Interviews pagination">
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
    </div>
  );
}
