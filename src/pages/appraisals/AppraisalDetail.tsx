/**
 * Appraisal Detail Page — displays individual appraisal with goals, scores, and remarks.
 * Requirements: 20.2, 20.3
 */

import { useParams } from 'react-router-dom';
import { useAppraisalDetail } from '@/hooks/useAppraisals';
import type { AppraisalStatus } from '@/types/appraisal';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';

const statusStyles: Record<AppraisalStatus, string> = {
  draft: 'bg-surface-neutral text-ink-primary',
  self_review: 'bg-warning-lighter text-warning-dark',
  manager_review: 'bg-warning-lighter text-warning-dark',
  completed: 'bg-success-lighter text-success-dark',
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
      <PageContainer maxWidth="lg">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-neutral" />
          <div className="h-32 animate-pulse rounded-card bg-surface-neutral" />
          <div className="h-64 animate-pulse rounded-card bg-surface-neutral" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !appraisal) {
    return (
      <PageContainer maxWidth="lg">
        <div className="rounded-card bg-error-lighter p-4 text-sm text-error-dark" role="alert">
          Failed to load appraisal details. Please try again.
        </div>
        <ButtonLink to="/appraisals" variant="text" size="small" className="mt-4 -ml-2.5" startIcon={<Iconify icon="arrow-left" />}>
          Back to Appraisals
        </ButtonLink>
      </PageContainer>
    );
  }

  const totalWeight = appraisal.goals.reduce((sum, g) => sum + g.weight, 0);
  const weightedScore =
    appraisal.goals.length > 0 && totalWeight > 0
      ? appraisal.goals.reduce((sum, g) => sum + (g.score || 0) * g.weight, 0) / totalWeight
      : null;

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        breadcrumb={
          <ButtonLink to="/appraisals" variant="text" size="small" className="-ml-2.5" startIcon={<Iconify icon="arrow-left" />}>
            Back to Appraisals
          </ButtonLink>
        }
        title={`${appraisal.employee.first_name} ${appraisal.employee.last_name}`}
        subtitle={
          <>
            {appraisal.employee.employee_id}
            {appraisal.employee.department && ` • ${appraisal.employee.department.name}`}
            {appraisal.employee.designation && ` • ${appraisal.employee.designation.name}`}
          </>
        }
        actions={
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusStyles[appraisal.status]}`}
          >
            {statusLabels[appraisal.status]}
          </span>
        }
      />

      {/* Appraisal Info Card */}
      <Card className="mb-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-ink-secondary">Cycle</p>
            <p className="mt-1 text-sm text-ink-primary">{appraisal.cycle.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-ink-secondary">Appraiser</p>
            <p className="mt-1 text-sm text-ink-primary">
              {appraisal.appraiser.first_name} {appraisal.appraiser.last_name}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-ink-secondary">Overall Score</p>
            <p className="mt-1 text-sm font-semibold text-ink-primary">
              {appraisal.score != null
                ? `${appraisal.score.toFixed(1)} / 5`
                : weightedScore != null
                  ? `${weightedScore.toFixed(1)} / 5 (calculated)`
                  : '—'}
            </p>
          </div>
        </div>
        {appraisal.remarks && (
          <div className="mt-4 border-t border-divider pt-4">
            <p className="text-xs font-medium uppercase text-ink-secondary">Remarks</p>
            <p className="mt-1 text-sm text-ink-primary">{appraisal.remarks}</p>
          </div>
        )}
      </Card>
      {/* Goals Table */}
      <Card>
        <CardHeader
          title="Goals"
          subtitle={`${appraisal.goals.length} goal${appraisal.goals.length !== 1 ? 's' : ''} defined for this appraisal`}
          className="pb-4"
        />
        {appraisal.goals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-divider">
              <thead className="bg-surface-neutral">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">
                    Goal
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">
                    Weight
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">
                    Self Score
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">
                    Manager Score
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {appraisal.goals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-surface-neutral">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-ink-primary">{goal.title}</p>
                      {goal.description && (
                        <p className="mt-0.5 text-xs text-ink-secondary">{goal.description}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {goal.weight}%
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {goal.self_score != null ? `${goal.self_score} / 5` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {goal.score != null ? `${goal.score} / 5` : '—'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-ink-secondary" title={goal.remarks || ''}>
                      {goal.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState module="appraisals" title="No goals yet" description="No goals have been defined for this appraisal yet." />
        )}
      </Card>

      {/* Metadata */}
      <div className="mt-4 text-xs text-ink-disabled">
        Created {formatDate(appraisal.created_at)} • Last updated {formatDate(appraisal.updated_at)}
      </div>
    </PageContainer>
  );
}
