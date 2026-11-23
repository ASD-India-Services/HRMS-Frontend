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
import { useHRSettings } from '@/hooks/useHRSettings';
import { UserPermissionsPanel } from '@/pages/admin/UserPermissionsPanel';
import { EmployeeStatusChange } from '@/pages/employees/EmployeeStatusChange';
import { Can } from '@/components/Can/Can';
import { EditButton, DeleteButton, ActionButton } from '@/components/ActionButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import { PropertyHistoryTimeline } from './components/PropertyHistoryTimeline';
import { formatDate } from '@/utils/formatters';
import api from '@/lib/api';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

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

function getInitials(firstName?: string | null, lastName?: string | null): string {
  return `${(firstName || '?').charAt(0)}${(lastName || '?').charAt(0)}`.toUpperCase();
}

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: employee, isLoading, isError, error } = useEmployee(id);
  const { data: hrSettings } = useHRSettings();

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
    { key: 'new_designation', label: 'New Designation', type: 'select', required: true, optionsEndpoint: '/api/v1/designations/', optionsLabelKey: 'name' },
    { key: 'new_department', label: 'New Department', type: 'select', required: false, optionsEndpoint: '/api/v1/departments/', optionsLabelKey: 'name' },
    { key: 'new_grade', label: 'New Grade', type: 'select', required: false, optionsEndpoint: '/api/v1/employee-grades/', optionsLabelKey: 'name' },
    { key: 'revised_base_amount', label: 'New Base Pay', type: 'text', required: false, placeholder: 'Leave empty to keep current base pay' },
    { key: 'effective_date', label: 'Effective Date', type: 'date', required: true },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-main border-t-transparent" />
        <span className="ml-3 text-ink-secondary">Loading employee details...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <PageContainer maxWidth="lg">
        <div className="rounded-card bg-error-lighter p-4">
          <p className="text-sm text-error-dark">
            Failed to load employee details.{' '}
            {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
        <ButtonLink to="/employees" variant="text" size="small" className="mt-4 -ml-2.5" startIcon={<Iconify icon="arrow-left" />}>
          Back to Employee Directory
        </ButtonLink>
      </PageContainer>
    );
  }

  if (!employee) return null;

  const fullName = `${employee.first_name} ${employee.last_name}`;
  const statusColor = statusColors[employee.status] ?? 'bg-surface-neutral text-ink-primary';
  const statusLabel = statusLabels[employee.status] ?? employee.status;

  const effectiveNoticeDays = employee.notice_period_days ?? hrSettings?.notice_period_days ?? 30;
  const isCustomNotice = Boolean(employee.custom_fields && (employee.custom_fields as any).notice_period_days);
  const isOnNotice = employee.status === 'on_notice';
  const noticeStart = employee.notice_period_start || (employee.custom_fields as any)?.notice_period_start;
  const relievingDate = employee.date_of_leaving;
  const separationReason = employee.separation_reason || (employee.custom_fields as any)?.separation_reason;

  let daysRemaining: number | null = null;
  if (relievingDate) {
    const target = new Date(relievingDate).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    daysRemaining = Math.max(0, Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        breadcrumb={
          <nav aria-label="Breadcrumb">
            <Link to="/employees" className="hover:text-primary-main">
              Employees
            </Link>
            <span className="mx-2">/</span>
            <span className="text-ink-primary">{fullName}</span>
          </nav>
        }
        title={
          <span className="flex items-center gap-3">
            {employee.photo ? (
              <img
                src={employee.photo}
                alt={fullName}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-lighter text-lg font-semibold text-primary-dark">
                {getInitials(employee.first_name, employee.last_name)}
              </span>
            )}
            <span>{fullName}</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
            >
              {statusLabel}
            </span>
          </span>
        }
        subtitle={
          <>
            {employee.designation?.title || 'No Designation'} · {employee.department?.name || 'No Department'}
            <span className="mt-0.5 block text-xs text-ink-disabled">Employee ID: {employee.employee_id}</span>
          </>
        }
        actions={
          <>
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
            <ButtonLink
              to={`/org-chart?employee=${employee.id}`}
              variant="outlined"
              color="inherit"
              size="small"
              title="View this employee's reporting hierarchy in the Org Chart"
              startIcon={<Iconify icon="orgChart" />}
            >
              Org Chart
            </ButtonLink>
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
          </>
        }
      />

      {/* Notice Period Alert Banner — Shown when employee is currently On Notice */}
      {isOnNotice && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-900">
                  Serving Notice Period
                </h3>
                {daysRemaining !== null && (
                  <span className="inline-flex items-center rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    {daysRemaining === 0 ? 'Last Working Day Today' : `${daysRemaining} days remaining`}
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-amber-800 sm:grid-cols-3">
                <div>
                  <span className="font-medium text-amber-900">Notice Start: </span>
                  {noticeStart ? formatDate(noticeStart) : '—'}
                </div>
                <div>
                  <span className="font-medium text-amber-900">Notice Duration: </span>
                  {effectiveNoticeDays} days
                </div>
                <div>
                  <span className="font-medium text-amber-900">Relieving Date: </span>
                  <span className="font-semibold text-amber-950">
                    {relievingDate ? formatDate(relievingDate) : '—'}
                  </span>
                </div>
              </div>
              {separationReason && (
                <p className="mt-2 text-xs text-amber-800 border-t border-amber-200/60 pt-2">
                  <span className="font-medium text-amber-900">Reason: </span>
                  {separationReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Status Change — visible to users with employees.edit permission */}
      <div>
        <EmployeeStatusChange
          employeeId={employee.id}
          currentStatus={employee.status as any}
          onStatusChanged={() => { }}
        />
      </div>

      {/* Detail Sections */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader title="Personal Information" className="pb-4" />
          <CardContent className="pt-4">
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
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader title="Employment Details" className="pb-4" />
          <CardContent className="pt-4">
            <dl className="space-y-3">
              <DetailRow label="Department" value={employee.department?.name} />
              <DetailRow label="Designation" value={employee.designation?.title} />
              <DetailRow label="Grade" value={employee.grade?.name} />
              <DetailRow label="Branch" value={employee.branch?.name} />
              <DetailRow
                label="Employment Type"
                value={employee.employment_type?.replace('_', ' ')}
                capitalize
              />
              <DetailRow label="Work Type" value={(employee as any).work_type} />
              <DetailRow label="Date of Joining" value={formatDate(employee.date_of_joining)} />
              <DetailRow label="Probation End" value={formatDate(employee.probation_end_date)} />
              <DetailRow label="Confirmation Date" value={formatDate(employee.confirmation_date)} />
              <DetailRow
                label="Notice Period"
                value={`${effectiveNoticeDays} days ${isCustomNotice ? '(Custom)' : '(Company Policy)'}`}
              />
              {employee.badge_id && (
                <DetailRow label="Security Badge ID" value={employee.badge_id} />
              )}
              {employee.date_of_leaving && (
                <DetailRow
                  label={isOnNotice ? 'Expected Relieving Date' : 'Date of Leaving'}
                  value={formatDate(employee.date_of_leaving)}
                />
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader title="Address" className="pb-4" />
          <CardContent className="pt-4">
            <dl className="space-y-3">
              <DetailRow label="Address" value={employee.address} />
              <DetailRow label="City" value={employee.city} />
              <DetailRow label="State" value={employee.state} />
              <DetailRow label="Country" value={employee.country} />
              <DetailRow label="PIN Code" value={employee.pincode} />
            </dl>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader title="Emergency Contact" className="pb-4" />
          <CardContent className="pt-4">
            <dl className="space-y-3">
              <DetailRow label="Name" value={employee.emergency_contact_name} />
              <DetailRow label="Phone" value={employee.emergency_contact_phone} />
              <DetailRow label="Relation" value={employee.emergency_contact_relation} capitalize />
            </dl>
          </CardContent>
        </Card>

        {/* Reporting Hierarchy */}
        <Card className="lg:col-span-2">
          <CardHeader title="Reporting Hierarchy" className="pb-4" />
          <CardContent className="pt-4">
            {employee.reporting_manager ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-neutral text-sm font-semibold text-ink-secondary">
                  {getInitials(
                    employee.reporting_manager.first_name,
                    employee.reporting_manager.last_name
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-primary">
                    <Link
                      to={`/employees/${employee.reporting_manager.id}`}
                      className="hover:text-primary-main hover:underline"
                    >
                      {employee.reporting_manager.first_name} {employee.reporting_manager.last_name}
                    </Link>
                  </p>
                  <p className="text-xs text-ink-secondary">Reporting Manager</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-secondary">No reporting manager assigned.</p>
            )}
          </CardContent>
        </Card>

        {/* Permissions Panel — visible only to admins with roles.manage permission */}
        <Can permissions={['roles.manage']}>
          <section className="lg:col-span-2">
            <UserPermissionsPanel userId={employee.id} />
          </section>
        </Can>

        {/* Work Information & History Tracking Timeline */}
        <section className="lg:col-span-2">
          <PropertyHistoryTimeline employeeId={employee.id} />
        </section>
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
        onSubmit={(data) => promoteMutation.mutate({ ...data, employee: employee.id })}
        isLoading={promoteMutation.isPending}
      />

      {/* Provision Account Modal */}
      {showProvisionModal && (
        <Modal
          open
          onClose={() => {
            if (!provisionMutation.isPending) {
              setShowProvisionModal(false);
              setProvisionResult(null);
            }
          }}
          labelledBy="provision-dialog-title"
          size="sm"
          closeOnEscape={false}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <h2
              id="provision-dialog-title"
              className="text-lg font-semibold text-ink-primary"
            >
              Create Login Account
            </h2>

            {provisionResult ? (
              /* Success result view */
              <div className="mt-4">
                <div className="rounded-card bg-success-lighter p-4">
                  <p className="text-sm font-medium text-success-dark">
                    {provisionResult.message}
                  </p>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-secondary">Email</dt>
                    <dd className="font-medium text-ink-primary">{provisionResult.email}</dd>
                  </div>
                  {provisionResult.email_sent && (
                    <p className="mt-2 text-xs text-success-main">
                      A password setup link has been sent to the employee&apos;s email.
                    </p>
                  )}
                  {provisionResult.already_existed && (
                    <p className="mt-2 text-xs text-ink-secondary">
                      Account already existed — no new credentials were created.
                    </p>
                  )}
                </dl>
                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowProvisionModal(false);
                      setProvisionResult(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Confirmation view */
              <div className="mt-4">
                <p className="text-sm text-ink-secondary">
                  This will create a login account for{' '}
                  <span className="font-medium">{fullName}</span> and send a password
                  setup link to <span className="font-medium">{employee.email}</span>.
                </p>
                <p className="mt-2 text-xs text-ink-secondary">
                  The employee will receive an email with a link to set up their own password.
                  The link expires in 72 hours.
                </p>

                {provisionMutation.isError && (
                  <div className="mt-3 rounded-card bg-error-lighter p-3">
                    <p className="text-sm text-error-dark">
                      {(provisionMutation.error as any)?.response?.data?.error ||
                        'Failed to provision account. Please try again.'}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outlined" color="inherit"
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    disabled={provisionMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => provisionMutation.mutate()}
                    loading={provisionMutation.isPending}
                  >
                    Send Setup Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </PageContainer>
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
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd
        className={`text-sm font-medium text-ink-primary text-right ${capitalize ? 'capitalize' : ''}`}
      >
        {value || '--'}
      </dd>
    </div>
  );
}
