/**
 * Appraisal Detail Page — displays individual appraisal with goals, scores, and remarks.
 * Requirements: 20.2, 20.3
 */

import { useParams, Link } from 'react-router-dom';
import { useAppraisalDetail } from '@/hooks/useAppraisals';
import type { AppraisalStatus } from '@/types/appraisal';

const statusStyles: Record<AppraisalStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  self_review: 'bg-yellow-100 text-yellow-800',
  manager_review: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
};

const statusLabels: Record<AppraisalStatus, string> = {
  draft: 'Draft',
  self_review: 'Self Review',
  manager_review: 'Manager Review',
  completed: 'Completed',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AppraisalDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: appraisal, isLoading, isError } = useAppraisalDetail(id || '');

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
          <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  if (isError || !appraisal) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load appraisal details. Please try again.
        </div>
        <Link
          to="/appraisals"
          className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Back to Appraisals
        </Link>
      </div>
    );
  }

  const totalWeight = appraisal.goals.reduce((sum, g) => sum + g.weight, 0);
  const weightedScore =
    appraisal.goals.length > 0 && totalWeight > 0
      ? appraisal.goals.reduce((sum, g) => sum + (g.score || 0) * g.weight, 0) / totalWeight
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4">
        <Link
          to="/appraisals"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Back to Appraisals
        </Link>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {appraisal.employee.first_name} {appraisal.employee.last_name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {appraisal.employee.employee_id}
            {appraisal.employee.department && ` • ${appraisal.employee.department.name}`}
            {appraisal.employee.designation && ` • ${appraisal.employee.designation.name}`}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusStyles[appraisal.status]}`}
        >
          {statusLabels[appraisal.status]}
        </span>
      </div>

      {/* Appraisal Info Card */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Cycle</p>
            <p className="mt-1 text-sm text-gray-900">{appraisal.cycle.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Appraiser</p>
            <p className="mt-1 text-sm text-gray-900">
              {appraisal.appraiser.first_name} {appraisal.appraiser.last_name}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Overall Score</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {appraisal.score != null
                ? `${appraisal.score.toFixed(1)} / 5`
                : weightedScore != null
                  ? `${weightedScore.toFixed(1)} / 5 (calculated)`
                  : '—'}
            </p>
          </div>
        </div>
        {appraisal.remarks && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium uppercase text-gray-500">Remarks</p>
            <p className="mt-1 text-sm text-gray-700">{appraisal.remarks}</p>
          </div>
        )}
      </div>

      {/* Goals Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Goals</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {appraisal.goals.length} goal{appraisal.goals.length !== 1 ? 's' : ''} defined for this appraisal
          </p>
        </div>

        {appraisal.goals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Goal
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Weight
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Self Score
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Manager Score
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appraisal.goals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{goal.title}</p>
                      {goal.description && (
                        <p className="mt-0.5 text-xs text-gray-500">{goal.description}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {goal.weight}%
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {goal.self_score != null ? `${goal.self_score} / 5` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {goal.score != null ? `${goal.score} / 5` : '—'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-500" title={goal.remarks || ''}>
                      {goal.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-gray-500">
            No goals have been defined for this appraisal yet.
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-4 text-xs text-gray-400">
        Created {formatDate(appraisal.created_at)} • Last updated {formatDate(appraisal.updated_at)}
      </div>
    </div>
  );
}
