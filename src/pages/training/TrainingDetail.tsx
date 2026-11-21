/**
 * Training Event Detail page with enrollment status and feedback scoring.
 * Requirements: 24.2
 */

import { useState } from 'react';
import { useTrainingEvent, useEnrollInEvent, useCompleteEnrollment } from '@/hooks/useTraining';
import type { TrainingEventStatus, EnrollmentStatus } from '@/types/training';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-surface-neutral text-ink-primary' },
  scheduled: { label: 'Scheduled', className: 'bg-primary-lighter text-primary-dark' },
  in_progress: { label: 'In Progress', className: 'bg-warning-lighter text-warning-dark' },
  completed: { label: 'Completed', className: 'bg-success-lighter text-success-dark' },
  cancelled: { label: 'Cancelled', className: 'bg-error-lighter text-error-dark' },
};

const ENROLLMENT_BADGES: Record<string, { label: string; className: string }> = {
  enrolled: { label: 'Enrolled', className: 'bg-primary-lighter text-primary-dark' },
  completed: { label: 'Completed', className: 'bg-success-lighter text-success-dark' },
  cancelled: { label: 'Cancelled', className: 'bg-error-lighter text-error-dark' },
  waitlisted: { label: 'Waitlisted', className: 'bg-warning-lighter text-warning-dark' },
  no_show: { label: 'No Show', className: 'bg-surface-neutral text-ink-primary' },
};

function getStatusBadge(status?: string) {
  const s = status?.toLowerCase() || 'draft';
  return STATUS_BADGES[s] || {
    label: status ? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown',
    className: 'bg-surface-neutral text-ink-primary',
  };
}

function getEnrollmentBadge(status?: string) {
  const s = status?.toLowerCase() || '';
  return ENROLLMENT_BADGES[s] || {
    label: status ? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown',
    className: 'bg-surface-neutral text-ink-primary',
  };
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

interface TrainingDetailProps {
  eventId: string;
  employeeId: string | number;
  onBack?: () => void;
}

export function TrainingDetail({ eventId, employeeId, onBack }: TrainingDetailProps) {
  const { data: event, isLoading, isError, error } = useTrainingEvent(eventId);
  const enrollMutation = useEnrollInEvent();
  const completeMutation = useCompleteEnrollment();

  const [feedbackScore, setFeedbackScore] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Find current employee's enrollment
  const myEnrollment = event?.enrollments && Array.isArray(event.enrollments)
    ? event.enrollments.find((e) => {
        const empId = typeof e.employee === 'object' ? e.employee?.id : e.employee;
        return String(empId) === String(employeeId);
      })
    : undefined;

  const handleEnroll = () => {
    enrollMutation.mutate({ event: eventId, employee: employeeId });
  };

  const handleComplete = () => {
    if (!myEnrollment) return;
    completeMutation.mutate(
      { enrollmentId: myEnrollment.id, feedback: { feedback_score: feedbackScore, feedback_comments: feedbackComments } },
      { onSuccess: () => setShowFeedbackForm(false) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
        <span className="ml-3 text-sm text-ink-secondary">Loading event details...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-error-lighter p-4" role="alert">
        <p className="text-sm text-error-dark">
          Failed to load event. {error instanceof Error ? error.message : 'Please try again.'}
        </p>
      </div>
    );
  }

  if (!event) return null;

  const badge = getStatusBadge(event.status);
  const enrolledCount = event.enrolled_count ?? 0;
  const maxSeats = event.max_participants ?? event.max_seats ?? 0;
  const availableSeats = event.available_seats ?? Math.max(0, maxSeats - enrolledCount);
  const canEnroll = event.status === 'scheduled' && availableSeats > 0 && !myEnrollment;
  const canComplete = myEnrollment?.status === 'enrolled' && event.status !== 'cancelled';

  return (
    <div>
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary focus:outline-none focus:underline"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </button>
      )}

      {/* Event header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-primary">{event.name}</h2>
          <p className="mt-1 text-sm text-ink-secondary capitalize">{event.event_type || event.type || '—'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Event details card */}
      <div className="mb-6 rounded-lg border border-divider bg-surface-paper p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-secondary">Trainer</dt>
            <dd className="mt-1 text-sm text-ink-primary">{event.trainer || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-secondary">Location</dt>
            <dd className="mt-1 text-sm text-ink-primary">{event.location || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-secondary">Duration</dt>
            <dd className="mt-1 text-sm text-ink-primary">
              {formatDate(event.start_date)} – {formatDate(event.end_date)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-secondary">Seats</dt>
            <dd className="mt-1 text-sm text-ink-primary">
              {enrolledCount} / {maxSeats} enrolled
              <span className={`ml-2 text-xs ${availableSeats > 0 ? 'text-success-main' : 'text-error-main'}`}>
                ({availableSeats} available)
              </span>
            </dd>
          </div>
        </dl>

        {/* Description */}
        {event.description && (
          <div className="mt-4 border-t border-divider pt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-ink-secondary">Description</h4>
            <p className="mt-1 text-sm text-ink-primary">{event.description}</p>
          </div>
        )}

        {/* Syllabus */}
        {event.syllabus && (
          <div className="mt-4 border-t border-divider pt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-ink-secondary">Syllabus</h4>
            <p className="mt-1 whitespace-pre-line text-sm text-ink-primary">{event.syllabus}</p>
          </div>
        )}

        {/* Prerequisites */}
        {Array.isArray(event.prerequisites) && event.prerequisites.length > 0 && (
          <div className="mt-4 border-t border-divider pt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-ink-secondary">Prerequisites</h4>
            <ul className="mt-1 list-inside list-disc text-sm text-ink-primary">
              {event.prerequisites.map((prereq, idx) => (
                <li key={idx}>{prereq}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Enrollment status / action */}
      <div className="mb-6 rounded-lg border border-divider bg-surface-paper p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-ink-primary">My Enrollment</h3>

        {myEnrollment ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {(() => {
                const myEnrollBadge = getEnrollmentBadge(myEnrollment.status);
                return (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${myEnrollBadge.className}`}>
                    {myEnrollBadge.label}
                  </span>
                );
              })()}
              <span className="text-xs text-ink-secondary">
                Enrolled on {formatDate(myEnrollment.enrolled_at)}
              </span>
            </div>

            {/* Completed feedback display */}
            {myEnrollment.status === 'completed' && myEnrollment.feedback_score !== null && (
              <div className="rounded-md bg-success-lighter p-3">
                <p className="text-sm text-success-dark">
                  <span className="font-medium">Rating:</span> {myEnrollment.feedback_score}/5
                </p>
                {myEnrollment.feedback_comments && (
                  <p className="mt-1 text-sm text-success-dark">{myEnrollment.feedback_comments}</p>
                )}
              </div>
            )}

            {/* Complete with feedback */}
            {canComplete && !showFeedbackForm && (
              <button
                onClick={() => setShowFeedbackForm(true)}
                className="rounded-md bg-success-main px-4 py-2 text-sm font-medium text-primary-contrast shadow-sm hover:bg-success-dark focus:outline-none focus:ring-2 focus:ring-success-main focus:ring-offset-1"
              >
                Mark as Completed
              </button>
            )}

            {/* Feedback form */}
            {showFeedbackForm && (
              <div className="space-y-3 rounded-md border border-divider bg-surface-neutral p-4">
                <h4 className="text-sm font-medium text-ink-primary">Completion Feedback</h4>

                <div>
                  <label htmlFor="feedback-score" className="block text-xs font-medium text-ink-secondary">
                    Score (1–5)
                  </label>
                  <input
                    id="feedback-score"
                    type="range"
                    min={1}
                    max={5}
                    value={feedbackScore}
                    onChange={(e) => setFeedbackScore(Number(e.target.value))}
                    className="mt-1 w-full"
                    aria-valuenow={feedbackScore}
                    aria-valuemin={1}
                    aria-valuemax={5}
                  />
                  <p className="mt-0.5 text-center text-sm font-medium text-primary-main">{feedbackScore}/5</p>
                </div>

                <div>
                  <label htmlFor="feedback-comments" className="block text-xs font-medium text-ink-secondary">
                    Comments (optional)
                  </label>
                  <Textarea
                    id="feedback-comments"
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    rows={3}
                    className="mt-1"
                    placeholder="Share your feedback about this training..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                    className="rounded-md bg-success-main px-4 py-2 text-sm font-medium text-primary-contrast shadow-sm hover:bg-success-dark focus:outline-none focus:ring-2 focus:ring-success-main focus:ring-offset-1 disabled:opacity-50"
                  >
                    {completeMutation.isPending ? 'Submitting...' : 'Submit & Complete'}
                  </button>
                  <Button type="button" variant="outlined" color="inherit"
                    onClick={() => setShowFeedbackForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-ink-secondary">You are not enrolled in this event.</p>
            {canEnroll && (
              <Button type="button"
                onClick={handleEnroll}
                disabled={enrollMutation.isPending}
                aria-label={`Enroll in ${event.name}`}
              >
                {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
              </Button>
            )}
            {!canEnroll && availableSeats === 0 && (
              <span className="text-xs text-error-main">No seats available</span>
            )}
          </div>
        )}
      </div>

      {/* Enrollments list */}
      {Array.isArray(event.enrollments) && event.enrollments.length > 0 && (
        <div className="rounded-lg border border-divider bg-surface-paper p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-ink-primary">
            Participants ({event.enrollments.length})
          </h3>
          <div className="overflow-hidden rounded-md border border-divider">
            <table className="min-w-full divide-y divide-divider">
              <thead className="bg-surface-neutral">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Name</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Status</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Enrolled</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {event.enrollments.map((enrollment) => {
                  const enrollBadge = getEnrollmentBadge(enrollment.status);
                  return (
                    <tr key={enrollment.id}>
                      <td className="px-4 py-2 text-sm text-ink-primary">
                        {(enrollment as any).employee_name || (typeof enrollment.employee === 'object' ? `${(enrollment.employee as any).first_name} ${(enrollment.employee as any).last_name}` : '—')}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${enrollBadge.className}`}>
                          {enrollBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-ink-secondary">
                        {formatDate(enrollment.enrolled_at)}
                      </td>
                      <td className="px-4 py-2 text-sm text-ink-secondary">
                        {enrollment.feedback_score !== null ? `${enrollment.feedback_score}/5` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
