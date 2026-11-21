/**
 * Onboarding Checklist page for new hires.
 * Displays tasks with completion status, grouped by category.
 * Requirements: 24.2
 */

import { useState } from 'react';
import { useOnboardingTasks, useUpdateOnboardingTask } from '@/hooks/useOnboarding';
import type { OnboardingTask, OnboardingTaskStatus } from '@/types/onboarding';
import { Select } from '@/components/ui/Select';

const STATUS_STYLES: Record<OnboardingTaskStatus, { label: string; className: string; icon: string }> = {
  pending: { label: 'Pending', className: 'bg-surface-neutral text-ink-primary', icon: '○' },
  in_progress: { label: 'In Progress', className: 'bg-primary-lighter text-primary-dark', icon: '◐' },
  completed: { label: 'Completed', className: 'bg-success-lighter text-success-dark', icon: '✓' },
  skipped: { label: 'Skipped', className: 'bg-warning-lighter text-warning-dark', icon: '—' },
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
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OnboardingTaskStatus | '')}
          aria-label="Filter tasks by status"
        >
          <option value="">All Tasks</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="skipped">Skipped</option>
        </Select>
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
        <div className="rounded-md bg-error-lighter p-4" role="alert">
          <p className="text-sm text-error-dark">
            Failed to load onboarding tasks. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && tasks.length === 0 && (
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-grey-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-ink-secondary">No onboarding tasks found.</p>
        </div>
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
                  className="flex items-center gap-3 rounded-lg border border-divider bg-surface-paper px-4 py-3 shadow-sm transition-colors hover:bg-surface-neutral"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleComplete(task)}
                    disabled={updateTask.isPending}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      task.status === 'completed'
                        ? 'border-success-main bg-success-main text-primary-contrast'
                        : 'border-divider text-ink-disabled hover:border-success-main'
                    }`}
                    aria-label={`Mark "${task.title}" as ${task.status === 'completed' ? 'pending' : 'completed'}`}
                  >
                    {task.status === 'completed' ? '✓' : ''}
                  </button>

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
                      Due {new Date(task.due_date).toLocaleDateString()}
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
