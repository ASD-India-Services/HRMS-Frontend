/**
 * Applicant Pipeline page — kanban-style view of applicants grouped by stage.
 * Supports filtering by job opening and drag-like status transitions.
 * Requirements: 19.2, 24.2
 */

import { useState } from 'react';
import { useApplicants, useChangeApplicantStatus, useJobOpenings } from '@/hooks/useRecruitment';
import type { ApplicantStatus, JobApplicant } from '@/types/recruitment';

const PIPELINE_STAGES: { key: ApplicantStatus; label: string; color: string }[] = [
  { key: 'applied', label: 'Applied', color: 'border-blue-400 bg-blue-50' },
  { key: 'screening', label: 'Screening', color: 'border-yellow-400 bg-yellow-50' },
  { key: 'interview', label: 'Interview', color: 'border-purple-400 bg-purple-50' },
  { key: 'selected', label: 'Selected', color: 'border-green-400 bg-green-50' },
  { key: 'rejected', label: 'Rejected', color: 'border-red-400 bg-red-50' },
];

interface ApplicantPipelineProps {
  jobOpeningId?: string;
  onBack?: () => void;
}

export function ApplicantPipeline({ jobOpeningId, onBack }: ApplicantPipelineProps) {
  const [selectedJobOpening, setSelectedJobOpening] = useState(jobOpeningId || '');

  // Fetch job openings for the dropdown filter
  const { data: openingsData } = useJobOpenings({ page_size: 100 });

  // Fetch all applicants for the selected job opening (or all)
  const { data: applicantsData, isLoading, isError, error } = useApplicants({
    job_opening: selectedJobOpening || undefined,
    page_size: 200, // load all for kanban view
  });

  const changeStatus = useChangeApplicantStatus();

  // Group applicants by status
  const groupedApplicants: Record<ApplicantStatus, JobApplicant[]> = {
    applied: [],
    screening: [],
    interview: [],
    selected: [],
    rejected: [],
  };

  if (applicantsData) {
    for (const applicant of applicantsData.results) {
      if (groupedApplicants[applicant.status]) {
        groupedApplicants[applicant.status].push(applicant);
      }
    }
  }

  const handleMoveApplicant = (applicantId: string, newStatus: ApplicantStatus) => {
    changeStatus.mutate({ id: applicantId, payload: { status: newStatus } });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Go back"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Applicant Pipeline</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {applicantsData ? `${applicantsData.count} applicant${applicantsData.count !== 1 ? 's' : ''}` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Job Opening Filter */}
        <select
          value={selectedJobOpening}
          onChange={(e) => setSelectedJobOpening(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          aria-label="Filter by job opening"
        >
          <option value="">All Job Openings</option>
          {openingsData?.results.map((opening) => (
            <option key={opening.id} value={opening.id}>
              {opening.title}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-600">Loading applicants...</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load applicants. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {/* Kanban Board */}
      {applicantsData && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const applicants = groupedApplicants[stage.key];
            return (
              <div
                key={stage.key}
                className={`min-w-[260px] flex-1 rounded-lg border-t-4 bg-white p-3 shadow-sm ${stage.color}`}
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{stage.label}</h3>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {applicants.length}
                  </span>
                </div>

                {/* Applicant Cards */}
                <div className="space-y-2">
                  {applicants.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">No applicants</p>
                  )}
                  {applicants.map((applicant) => (
                    <ApplicantCard
                      key={applicant.id}
                      applicant={applicant}
                      currentStage={stage.key}
                      onMove={handleMoveApplicant}
                      isMoving={changeStatus.isPending}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Applicant Card Component ────────────────────────────────────────────────

interface ApplicantCardProps {
  applicant: JobApplicant;
  currentStage: ApplicantStatus;
  onMove: (id: string, status: ApplicantStatus) => void;
  isMoving: boolean;
}

function ApplicantCard({ applicant, currentStage, onMove, isMoving }: ApplicantCardProps) {
  const [showActions, setShowActions] = useState(false);

  // Possible next stages based on current position
  const nextStages = PIPELINE_STAGES.filter((s) => s.key !== currentStage);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{applicant.name}</p>
          <p className="truncate text-xs text-gray-500">{applicant.email}</p>
          {applicant.job_opening && (
            <p className="mt-1 truncate text-xs text-gray-400">{applicant.job_opening.title}</p>
          )}
        </div>
        {applicant.rating !== null && (
          <div className="ml-2 flex items-center gap-0.5">
            <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs text-gray-600">{applicant.rating}</span>
          </div>
        )}
      </div>

      {/* Move Actions */}
      <div className="mt-2">
        <button
          onClick={() => setShowActions(!showActions)}
          className="text-xs text-primary-600 hover:text-primary-700"
          disabled={isMoving}
        >
          {showActions ? 'Cancel' : 'Move to...'}
        </button>

        {showActions && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {nextStages.map((stage) => (
              <button
                key={stage.key}
                onClick={() => { onMove(applicant.id, stage.key); setShowActions(false); }}
                disabled={isMoving}
                className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                {stage.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
