/**
 * Training Event Detail page with enrollment status and feedback scoring.
 * Requirements: 24.2
 */

import { HRMSTable } from '@/components/DataTable/HRMSTable';
import { useState } from 'react';
import { useTrainingEvent, useEnrollInEvent, useCompleteEnrollment } from '@/hooks/useTraining';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';
import { formatDate } from '@/utils/formatters';

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
      <PageContainer className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
        <span className="ml-3 text-sm text-ink-secondary">Loading event details...</span>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <div className="rounded-card bg-error-lighter p-4" role="alert">
          <p className="text-sm text-error-dark">
            Failed to load event. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      </PageContainer>
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
    <PageContainer>
      <PageHeader
        breadcrumb={
          onBack && (
            <Button variant="text" color="inherit" size="small" className="-ml-2.5" onClick={onBack} startIcon={<Iconify icon="arrow-left" />}>
              Back to Events
            </Button>
          )
        }
        title={event.name}
        subtitle={<span className="capitalize">{event.event_type || event.type || '—'}</span>}
        actions={
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        }
      />
      {/* Event details card */}
      <Card className="mb-6 p-6">
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
      </Card>
      {/* Enrollment status / action */}
      <Card className="mb-6">
        <CardHeader title="My Enrollment" className="pb-4" />
        <CardContent className="pt-0">

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
              <div className="rounded-lg bg-success-lighter p-3">
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
              <Button color="success" onClick={() => setShowFeedbackForm(true)}>
                Mark as Completed
              </Button>
            )}

            {/* Feedback form */}
            {showFeedbackForm && (
              <div className="space-y-3 rounded-lg bg-surface-neutral p-4">
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
                  <Button
                    color="success"
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? 'Submitting...' : 'Submit & Complete'}
                  </Button>
                  <Button variant="outlined" color="inherit"
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
              <Button
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
        </CardContent>
      </Card>
      {/* Enrollments list */}
      {Array.isArray(event.enrollments) && event.enrollments.length > 0 && (
        <Card>
          <CardHeader title={`Participants (${event.enrollments.length})`} className="pb-4" />
          <CardContent className="pt-0">
          <div className="overflow-hidden rounded-lg">
            <HRMSTable className="min-w-full divide-y divide-divider">
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
            </HRMSTable>
          </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
