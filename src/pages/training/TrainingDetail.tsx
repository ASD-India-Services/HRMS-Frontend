/**
 * Training Event Detail page with enrollment status and feedback scoring.
 * Requirements: 24.2
 */

import { useState } from 'react';
import { useTrainingEvent, useEnrollInEvent, useCompleteEnrollment } from '@/hooks/useTraining';
import type { TrainingEventStatus, EnrollmentStatus } from '@/types/training';

const STATUS_BADGES: Record<TrainingEventStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
};

const ENROLLMENT_BADGES: Record<EnrollmentStatus, { label: string; className: string }> = {
  enrolled: { label: 'Enrolled', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  waitlisted: { label: 'Waitlisted', className: 'bg-yellow-100 text-yellow-800' },
};

interface TrainingDetailProps {
  eventId: string;
  employeeId: number;
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
  const myEnrollment = event?.enrollments.find((e) => e.employee.id === employeeId);

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
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-600">Loading event details...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 p-4" role="alert">
        <p className="text-sm text-red-800">
          Failed to load event. {error instanceof Error ? error.message : 'Please try again.'}
        </p>
      </div>
    );
  }

  if (!event) return null;

  const badge = STATUS_BADGES[event.status];
  const canEnroll = event.status === 'scheduled' && event.available_seats > 0 && !myEnrollment;
  const canComplete = myEnrollment?.status === 'enrolled' && event.status !== 'cancelled';

  return (
    <div>
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline"
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
          <h2 className="text-xl font-semibold text-gray-900">{event.name}</h2>
          <p className="mt-1 text-sm text-gray-500">{event.type}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Event details card */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Trainer</dt>
            <dd className="mt-1 text-sm text-gray-900">{event.trainer}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900">{event.location}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Duration</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Seats</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {event.enrolled_count} / {event.max_seats} enrolled
              <span className={`ml-2 text-xs ${event.available_seats > 0 ? 'text-green-600' : 'text-red-500'}`}>
                ({event.available_seats} available)
              </span>
            </dd>
          </div>
        </dl>

        {/* Description */}
        {event.description && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500">Description</h4>
            <p className="mt-1 text-sm text-gray-700">{event.description}</p>
          </div>
        )}

        {/* Syllabus */}
        {event.syllabus && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500">Syllabus</h4>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{event.syllabus}</p>
          </div>
        )}

        {/* Prerequisites */}
        {event.prerequisites.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500">Prerequisites</h4>
            <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
              {event.prerequisites.map((prereq, idx) => (
                <li key={idx}>{prereq}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Enrollment status / action */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">My Enrollment</h3>

        {myEnrollment ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ENROLLMENT_BADGES[myEnrollment.status].className}`}>
                {ENROLLMENT_BADGES[myEnrollment.status].label}
              </span>
              <span className="text-xs text-gray-500">
                Enrolled on {new Date(myEnrollment.enrolled_at).toLocaleDateString()}
              </span>
            </div>

            {/* Completed feedback display */}
            {myEnrollment.status === 'completed' && myEnrollment.feedback_score !== null && (
              <div className="rounded-md bg-green-50 p-3">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Rating:</span> {myEnrollment.feedback_score}/10
                </p>
                {myEnrollment.feedback_comments && (
                  <p className="mt-1 text-sm text-green-700">{myEnrollment.feedback_comments}</p>
                )}
              </div>
            )}

            {/* Complete with feedback */}
            {canComplete && !showFeedbackForm && (
              <button
                onClick={() => setShowFeedbackForm(true)}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
              >
                Mark as Completed
              </button>
            )}

            {/* Feedback form */}
            {showFeedbackForm && (
              <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-gray-700">Completion Feedback</h4>

                <div>
                  <label htmlFor="feedback-score" className="block text-xs font-medium text-gray-600">
                    Score (1–10)
                  </label>
                  <input
                    id="feedback-score"
                    type="range"
                    min={1}
                    max={10}
                    value={feedbackScore}
                    onChange={(e) => setFeedbackScore(Number(e.target.value))}
                    className="mt-1 w-full"
                    aria-valuenow={feedbackScore}
                    aria-valuemin={1}
                    aria-valuemax={10}
                  />
                  <p className="mt-0.5 text-center text-sm font-medium text-primary-600">{feedbackScore}/10</p>
                </div>

                <div>
                  <label htmlFor="feedback-comments" className="block text-xs font-medium text-gray-600">
                    Comments (optional)
                  </label>
                  <textarea
                    id="feedback-comments"
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Share your feedback about this training..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50"
                  >
                    {completeMutation.isPending ? 'Submitting...' : 'Submit & Complete'}
                  </button>
                  <button
                    onClick={() => setShowFeedbackForm(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">You are not enrolled in this event.</p>
            {canEnroll && (
              <button
                onClick={handleEnroll}
                disabled={enrollMutation.isPending}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50"
                aria-label={`Enroll in ${event.name}`}
              >
                {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
              </button>
            )}
            {!canEnroll && event.available_seats === 0 && (
              <span className="text-xs text-red-500">No seats available</span>
            )}
          </div>
        )}
      </div>

      {/* Enrollments list */}
      {event.enrollments.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Participants ({event.enrollments.length})
          </h3>
          <div className="overflow-hidden rounded-md border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Enrolled</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {event.enrollments.map((enrollment) => {
                  const enrollBadge = ENROLLMENT_BADGES[enrollment.status];
                  return (
                    <tr key={enrollment.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {enrollment.employee.first_name} {enrollment.employee.last_name}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${enrollBadge.className}`}>
                          {enrollBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {enrollment.feedback_score !== null ? `${enrollment.feedback_score}/10` : '—'}
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
