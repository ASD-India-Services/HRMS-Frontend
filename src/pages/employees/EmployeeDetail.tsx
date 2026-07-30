/**
 * Employee Detail page — displays the full profile of a single employee.
 * Accessible at /employees/:id
 *
 * Requirements: 27.8
 */

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEmployee } from '@/hooks/useEmployee';
import { UserPermissionsPanel } from '@/pages/admin/UserPermissionsPanel';
import { EmployeeStatusChange } from '@/pages/employees/EmployeeStatusChange';
import { Can } from '@/components/Can/Can';
import { EditButton, DeleteButton, ActionButton } from '@/components/ActionButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import api from '@/lib/api';

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

function getInitials(firstName?: string | null, lastName?: string | null): string {
  return `${(firstName || '?').charAt(0)}${(lastName || '?').charAt(0)}`.toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: employee, isLoading, isError, error } = useEmployee(id);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{
    message: string;
    email: string;
    user_id: string;
    already_existed: boolean;
    email_sent?: boolean;
  } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/v1/employees/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate('/employees');
    },
  });

  const provisionMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/employees/${id}/provision-account/`),
    onSuccess: (response) => {
      setProvisionResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/employee-promotions/', data),
    onSuccess: () => {
      setShowPromote(false);
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
  });

  const promoteFields: FieldConfig[] = [
    { key: 'to_designation', label: 'New Designation', type: 'text', required: true, placeholder: 'e.g., Senior Engineer' },
    { key: 'promotion_date', label: 'Effective Date', type: 'date', required: true },
    { key: 'reason', label: 'Reason', type: 'textarea', placeholder: 'Reason for promotion' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <span className="ml-3 text-gray-600">Loading employee details...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load employee details.{' '}
            {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
        <Link
          to="/employees"
          className="mt-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
        >
          ← Back to Employee Directory
        </Link>
      </div>
    );
  }

  if (!employee) return null;

  const fullName = `${employee.first_name} ${employee.last_name}`;
  const statusColor = statusColors[employee.status] ?? 'bg-gray-100 text-gray-800';
  const statusLabel = statusLabels[employee.status] ?? employee.status;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link to="/employees" className="hover:text-primary-600">
          Employees
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{fullName}</span>
      </nav>

      {/* Header Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {employee.photo ? (
            <img
              src={employee.photo}
              alt={fullName}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700">
              {getInitials(employee.first_name, employee.last_name)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {employee.designation?.title || 'No Designation'} · {employee.department?.name || 'No Department'}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Employee ID: {employee.employee_id}
            </p>
          </div>
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Can permissions={['roles.manage']}>
              <ActionButton
                label="Create Login"
                variant="primary"
                size="sm"
                onClick={() => setShowProvisionModal(true)}
              />
            </Can>
            <ActionButton
              label="Promote"
              variant="success"
              size="sm"
              onClick={() => setShowPromote(true)}
              permission="employees.edit"
            />
            <EditButton
              label="Edit"
              onClick={() => navigate(`/employees/${employee.id}/edit`)}
              permission="employees.edit"
              size="sm"
            />
            <DeleteButton
              label="Delete"
              onClick={() => setShowDeleteConfirm(true)}
              permission="employees.delete"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Employee Status Change — visible to users with employees.edit permission */}
      <div className="mt-4">
        <EmployeeStatusChange
          employeeId={employee.id}
          currentStatus={employee.status as any}
          onStatusChanged={() => {}}
        />
      </div>

      {/* Detail Sections */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Personal Information</h2>
          <dl className="space-y-3">
            <DetailRow label="Email" value={employee.email} />
            <DetailRow label="Phone" value={employee.phone} />
            <DetailRow label="Personal Email" value={employee.personal_email} />
            <DetailRow label="Date of Birth" value={formatDate(employee.date_of_birth)} />
            <DetailRow label="Gender" value={employee.gender} capitalize />
            <DetailRow label="Marital Status" value={employee.marital_status} capitalize />
            <DetailRow label="Blood Group" value={employee.blood_group} />
            <DetailRow label="Nationality" value={employee.nationality} />
          </dl>
        </section>

        {/* Employment Details */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Employment Details</h2>
          <dl className="space-y-3">
            <DetailRow label="Department" value={employee.department?.name} />
            <DetailRow label="Designation" value={employee.designation?.title} />
            <DetailRow
              label="Employment Type"
              value={employee.employment_type?.replace('_', ' ')}
              capitalize
            />
            <DetailRow label="Date of Joining" value={formatDate(employee.date_of_joining)} />
            <DetailRow label="Probation End" value={formatDate(employee.probation_end_date)} />
            <DetailRow label="Confirmation Date" value={formatDate(employee.confirmation_date)} />
            <DetailRow
              label="Notice Period"
              value={
                employee.notice_period_days
                  ? `${employee.notice_period_days} days`
                  : undefined
              }
            />
            {employee.date_of_leaving && (
              <DetailRow label="Date of Leaving" value={formatDate(employee.date_of_leaving)} />
            )}
          </dl>
        </section>

        {/* Address */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Address</h2>
          <dl className="space-y-3">
            <DetailRow label="Address" value={employee.address} />
            <DetailRow label="City" value={employee.city} />
            <DetailRow label="State" value={employee.state} />
            <DetailRow label="Country" value={employee.country} />
            <DetailRow label="PIN Code" value={employee.pincode} />
          </dl>
        </section>

        {/* Emergency Contact */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Emergency Contact</h2>
          <dl className="space-y-3">
            <DetailRow label="Name" value={employee.emergency_contact_name} />
            <DetailRow label="Phone" value={employee.emergency_contact_phone} />
            <DetailRow label="Relation" value={employee.emergency_contact_relation} capitalize />
          </dl>
        </section>

        {/* Reporting Hierarchy */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Reporting Hierarchy</h2>
          {employee.reporting_manager ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                {getInitials(
                  employee.reporting_manager.first_name,
                  employee.reporting_manager.last_name
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  <Link
                    to={`/employees/${employee.reporting_manager.id}`}
                    className="hover:text-primary-600 hover:underline"
                  >
                    {employee.reporting_manager.first_name} {employee.reporting_manager.last_name}
                  </Link>
                </p>
                <p className="text-xs text-gray-500">Reporting Manager</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No reporting manager assigned.</p>
          )}
        </section>

        {/* Permissions Panel — visible only to admins with roles.manage permission */}
        <Can permissions={['roles.manage']}>
          <section className="lg:col-span-2">
            <UserPermissionsPanel userId={employee.id} />
          </section>
        </Can>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Employee"
        message={`Are you sure you want to delete ${fullName}? This action cannot be undone.`}
        confirmLabel="Delete Employee"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      {/* Promote Modal */}
      <CrudModal
        isOpen={showPromote}
        onClose={() => setShowPromote(false)}
        title={`Promote ${fullName}`}
        fields={promoteFields}
        onSubmit={(data) => promoteMutation.mutate({ ...data, employee: employee.id, from_designation: employee.designation?.title })}
        isLoading={promoteMutation.isPending}
      />

      {/* Provision Account Modal */}
      {showProvisionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provision-dialog-title"
        >
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              if (!provisionMutation.isPending) {
                setShowProvisionModal(false);
                setProvisionResult(null);
              }
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2
              id="provision-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Create Login Account
            </h2>

            {provisionResult ? (
              /* Success result view */
              <div className="mt-4">
                <div className="rounded-md bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    {provisionResult.message}
                  </p>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email</dt>
                    <dd className="font-medium text-gray-900">{provisionResult.email}</dd>
                  </div>
                  {provisionResult.email_sent && (
                    <p className="mt-2 text-xs text-green-600">
                      A password setup link has been sent to the employee&apos;s email.
                    </p>
                  )}
                  {provisionResult.already_existed && (
                    <p className="mt-2 text-xs text-gray-500">
                      Account already existed — no new credentials were created.
                    </p>
                  )}
                </dl>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProvisionModal(false);
                      setProvisionResult(null);
                    }}
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation view */
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  This will create a login account for{' '}
                  <span className="font-medium">{fullName}</span> and send a password
                  setup link to <span className="font-medium">{employee.email}</span>.
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  The employee will receive an email with a link to set up their own password.
                  The link expires in 72 hours.
                </p>

                {provisionMutation.isError && (
                  <div className="mt-3 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">
                      {(provisionMutation.error as any)?.response?.data?.error ||
                        'Failed to provision account. Please try again.'}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    disabled={provisionMutation.isPending}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => provisionMutation.mutate()}
                    disabled={provisionMutation.isPending}
                    className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {provisionMutation.isPending && (
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    )}
                    Send Setup Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable detail row for definition lists */
function DetailRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value?: string | null;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd
        className={`text-sm font-medium text-gray-900 text-right ${capitalize ? 'capitalize' : ''}`}
      >
        {value || '--'}
      </dd>
    </div>
  );
}
