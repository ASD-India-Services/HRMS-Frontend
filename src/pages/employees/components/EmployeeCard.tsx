/**
 * Employee card component displaying photo, name, designation, department, and status.
 * Links to the employee detail page on click.
 */

import { Link } from 'react-router-dom';
import type { Employee } from '@/types/employee';
import { Iconify } from '@/components/Iconify';

interface EmployeeCardProps {
  employee: Employee;
}

const statusColors: Record<string, string> = {
  active: 'bg-success-lighter text-success-dark',
  on_notice: 'bg-warning-lighter text-warning-dark',
  terminated: 'bg-error-lighter text-error-dark',
  retired: 'bg-surface-neutral text-ink-primary',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  on_notice: 'On Notice',
  terminated: 'Terminated',
  retired: 'Retired',
};

const employmentTypeLabels: Record<string, string> = {
  permanent: 'Permanent',
  contract: 'Contract',
  intern: 'Intern',
  probation: 'Probation',
  freelance: 'Freelance',
};

const onboardingStatusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: 'Onboarding Pending', className: 'bg-warning-lighter text-warning-dark' },
  in_progress: { label: 'Onboarding', className: 'bg-primary-lighter text-primary-dark' },
};

function OnboardingBadge({ status }: { status?: string }) {
  if (!status || status === 'completed') return null;
  const style = onboardingStatusStyles[status];
  if (!style) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  return `${(firstName || '?').charAt(0)}${(lastName || '?').charAt(0)}`.toUpperCase();
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const statusColor = statusColors[employee.status] ?? 'bg-surface-neutral text-ink-primary';
  const statusLabel = statusLabels[employee.status] ?? employee.status;

  return (
    <Link
      to={`/employees/${employee.id}`}
      className="block rounded-card bg-surface-paper p-5 shadow-card transition-shadow hover:shadow-z8 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-2"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {employee.photo ? (
          <img
            src={employee.photo}
            alt={fullName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-lighter text-sm font-semibold text-primary-dark">
            {getInitials(employee.first_name, employee.last_name)}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-ink-primary">
              {fullName}
            </h3>
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-secondary">
            {employee.designation?.title || 'No Designation'}
          </p>
          <p className="truncate text-xs text-ink-secondary">
            {employee.department?.name || 'No Department'}
          </p>
        </div>
      </div>

      {/* Footer details */}
      <div className="mt-3 flex items-center justify-between border-t border-divider pt-3">
        <span className="text-xs text-ink-secondary">
          {employmentTypeLabels[employee.employment_type] ?? employee.employment_type}
        </span>
        <div className="flex items-center gap-2">
          {/* Onboarding status badge */}
          <OnboardingBadge status={(employee as Record<string, unknown>).onboarding_status as string | undefined} />
          {(employee as Record<string, unknown>).branch_name && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-lighter px-2 py-0.5 text-xs font-medium text-primary-dark">
              <Iconify icon="geoLocations" width={12} /> {(employee as Record<string, unknown>).branch_name as string}
            </span>
          )}
          <span className="text-xs text-ink-disabled">
            ID: {employee.employee_id}
          </span>
          {employee.badge_id && (
            <span
              className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 border border-slate-200/60"
              title="Security Access Badge ID"
            >
              Badge: {employee.badge_id}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
