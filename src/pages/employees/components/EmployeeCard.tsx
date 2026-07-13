/**
 * Employee card component displaying photo, name, designation, department, and status.
 * Links to the employee detail page on click.
 */

import { Link } from 'react-router-dom';
import type { Employee } from '@/types/employee';

interface EmployeeCardProps {
  employee: Employee;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  on_notice: 'bg-yellow-100 text-yellow-800',
  terminated: 'bg-red-100 text-red-800',
  retired: 'bg-gray-100 text-gray-800',
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
  pending: { label: 'Onboarding Pending', className: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'Onboarding', className: 'bg-blue-100 text-blue-800' },
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
  const statusColor = statusColors[employee.status] ?? 'bg-gray-100 text-gray-800';
  const statusLabel = statusLabels[employee.status] ?? employee.status;

  return (
    <Link
      to={`/employees/${employee.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {getInitials(employee.first_name, employee.last_name)}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {fullName}
            </h3>
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-600">
            {employee.designation?.title || 'No Designation'}
          </p>
          <p className="truncate text-xs text-gray-500">
            {employee.department?.name || 'No Department'}
          </p>
        </div>
      </div>

      {/* Footer details */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-500">
          {employmentTypeLabels[employee.employment_type] ?? employee.employment_type}
        </span>
        <div className="flex items-center gap-2">
          {/* Onboarding status badge */}
          <OnboardingBadge status={(employee as Record<string, unknown>).onboarding_status as string | undefined} />
          {(employee as Record<string, unknown>).branch_name && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              📍 {(employee as Record<string, unknown>).branch_name as string}
            </span>
          )}
          <span className="text-xs text-gray-400">
            ID: {employee.employee_id}
          </span>
        </div>
      </div>
    </Link>
  );
}
