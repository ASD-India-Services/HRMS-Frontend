/**
 * Onboarding Checklist page for new hires.
 * Displays tasks with completion status, grouped by category.
 * Requirements: 24.2
 */

import { useState } from 'react';
import { useOnboardingTasks, useUpdateOnboardingTask } from '@/hooks/useOnboarding';
import type { OnboardingTask, OnboardingTaskStatus } from '@/types/onboarding';
import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/utils/formatters';

const STATUS_STYLES: Record<OnboardingTaskStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-surface-neutral text-ink-primary' },
  in_progress: { label: 'In Progress', className: 'bg-primary-lighter text-primary-dark' },
  completed: { label: 'Completed', className: 'bg-success-lighter text-success-dark' },
  skipped: { label: 'Skipped', className: 'bg-warning-lighter text-warning-dark' },
};

interface OnboardingChecklistProps {
  employeeId: string | number;
}

export function OnboardingChecklist({ employeeId }: OnboardingChecklistProps) {
  const [statusFilter, setStatusFilter] = useState<OnboardingTaskStatus | ''>('');

  const { data, isLoading, isError, error } = useOnboardingTasks({
    employee: employeeId,
    status: statusFilter || undefined,
  });

  const updateTask = useUpdateOnboardingTask();

  const tasks = data?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleToggleComplete = (task: OnboardingTask) => {
    const newStatus: OnboardingTaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({ taskId: task.id, status: newStatus });
  };

  // Group tasks by category
  const groupedTasks = tasks.reduce<Record<string, OnboardingTask[]>>((acc, task) => {
    const category = task.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {});

  return (
    <div>
      {/* Header with progress */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Onboarding Checklist</h2>
          {tasks.length > 0 && (
            <p className="mt-0.5 text-sm text-ink-secondary">
              {completedCount} of {tasks.length} tasks completed
            </p>
          )}
        </div>
        {tasks.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-ink-primary">{progressPercentage}%</p>
              <p className="text-xs text-ink-disabled">Complete</p>
            </div>
            <div
              className="h-10 w-10 rounded-full border-4 border-success-main"
              style={{
                background: `conic-gradient(rgb(var(--success-main)) ${progressPercentage * 3.6}deg, rgb(var(--grey-300)) ${progressPercentage * 3.6}deg)`,
              }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Onboarding progress: ${progressPercentage}%`}
            />
          </div>
        )}
      </div>

      {/* Status filter */}
      <div className="mb-4">
        <SegmentedControl
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as OnboardingTaskStatus | '')}
          aria-label="Filter tasks by status"
          items={[
            { value: '', label: 'All Tasks' },
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'skipped', label: 'Skipped' },
          ]}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
          <span className="ml-3 text-sm text-ink-secondary">Loading onboarding tasks...</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-card bg-error-lighter p-4" role="alert">
          <p className="text-sm text-error-dark">
            Failed to load onboarding tasks. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && tasks.length === 0 && (
        <Card>
          <EmptyState module="onboarding" title="No onboarding tasks found" description="Onboarding checklists will appear here for new hires." />
        </Card>
      )}

      {/* Task groups */}
      {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
        <div key={category} className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-secondary">
            {category}
          </h3>
          <ul className="space-y-2" role="list" aria-label={`${category} tasks`}>
            {categoryTasks.map((task) => {
              const style = STATUS_STYLES[task.status];
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-card bg-surface-paper px-4 py-3 shadow-card transition-colors hover:bg-surface-neutral"
                >
                  {/* Checkbox */}
                  <IconButton
                    icon={task.status === 'completed' ? 'check' : undefined}
                    size="small"
                    onClick={() => handleToggleComplete(task)}
                    disabled={updateTask.isPending}
                    className={`!h-6 !w-6 shrink-0 border-2 ${
                      task.status === 'completed'
                        ? 'border-success-main bg-success-main !text-primary-contrast hover:!bg-success-dark'
                        : 'border-grey-500/30 hover:border-success-main'
                    }`}
                    aria-label={`Mark "${task.title}" as ${task.status === 'completed' ? 'pending' : 'completed'}`}
                  />

                  {/* Task details */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        task.status === 'completed' ? 'text-ink-disabled line-through' : 'text-ink-primary'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-secondary">{task.description}</p>
                    )}
                  </div>

                  {/* Due date */}
                  {task.due_date && (
                    <span className="shrink-0 text-xs text-ink-disabled">
                      Due {formatDate(task.due_date)}
                    </span>
                  )}

                  {/* Status badge */}
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
                  >
                    {style.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
