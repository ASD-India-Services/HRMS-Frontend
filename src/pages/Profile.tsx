/**
 * Self-service Profile page — employees can view personal details and update
 * contact information (phone, address, emergency contact).
 *
 * Requirements: 27.8
 */

import { useState } from 'react';
import { useUser } from '@platform/auth-sdk';
import { useQuery } from '@tanstack/react-query';
import { useUpdateEmployee } from '@/hooks/useEmployee';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { useHRSettings } from '@/hooks/useHRSettings';
import api from '@/lib/api';
import { formatDate } from '@/utils/formatters';
import type { EmployeeDetail, EmployeeProfileUpdate } from '@/types/employee';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';
import { cx } from '@/components/ui/cx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { PropertyHistoryTimeline } from './employees/components/PropertyHistoryTimeline';

function useCurrentEmployee() {
  return useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const response = await api.get<EmployeeDetail>('/api/v1/employees/me/');
      return response.data;
    },
  });
}

export default function Profile() {
  const { name, email, role, orgId } = useUser();
  const { roleName, hasPermission } = useHrmsPermissionsContext();
  const { data: hrSettings } = useHRSettings();
  const { data: employee, isLoading } = useCurrentEmployee();
  const updateMutation = useUpdateEmployee(employee?.id?.toString() ?? 'me');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EmployeeProfileUpdate>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine if user is admin (exempt from restrictions)
  const isAdmin =
    roleName?.toLowerCase() === 'org_admin' ||
    roleName?.toLowerCase() === 'admin' ||
    roleName?.toLowerCase() === 'superadmin' ||
    roleName?.toLowerCase() === 'hr_manager' ||
    hasPermission('employees.edit');

  // Check if profile edit is restricted by HR settings
  const isProfileEditRestricted = !isAdmin && !!hrSettings?.account_restrictions?.restrict_profile_edit;
  // If not restricted, user can edit profile
  const canEditProfile = !isProfileEditRestricted;
  const isReadOnlyEmployee = !isAdmin;

  const startEditing = () => {
    if (isProfileEditRestricted) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    if (employee) {
      setFormData({
        phone: employee.phone ?? '',
        personal_email: employee.personal_email ?? '',
        address: employee.address ?? '',
        city: employee.city ?? '',
        state: employee.state ?? '',
        country: employee.country ?? '',
        pincode: employee.pincode ?? '',
        emergency_contact_name: employee.emergency_contact_name ?? '',
        emergency_contact_phone: employee.emergency_contact_phone ?? '',
        emergency_contact_relation: employee.emergency_contact_relation ?? '',
      });
    }
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormData({});
    setErrorMessage(null);
  };

  // Resignation request query
  const { data: resignationData, refetch: refetchResignations } = useQuery({
    queryKey: ['resignation-requests', 'mine'],
    queryFn: async () => {
      const res = await api.get('/api/v1/resignation-requests/?mine=true');
      const results = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      return results as any[];
    },
  });

  const latestResignation = resignationData && resignationData.length > 0 ? resignationData[0] : null;

  const [isResignationModalOpen, setIsResignationModalOpen] = useState(false);
  const [resignationSubmitting, setResignationSubmitting] = useState(false);
  const [isCancellingResignation, setIsCancellingResignation] = useState(false);
  const defaultNoticePeriod = hrSettings?.notice_period_days ?? employee?.notice_period_days ?? 30;
  const [resignationForm, setResignationForm] = useState({
    resignation_date: new Date().toISOString().split('T')[0],
    notice_period_days: defaultNoticePeriod,
    requested_relieving_date: '',
    reason: '',
  });

  const handleOpenResignationModal = () => {
    const today = new Date();
    const noticeDays = hrSettings?.notice_period_days ?? employee?.notice_period_days ?? 30;
    const relieving = new Date(today);
    relieving.setDate(relieving.getDate() + noticeDays);
    setResignationForm({
      resignation_date: today.toISOString().split('T')[0],
      notice_period_days: noticeDays,
      requested_relieving_date: relieving.toISOString().split('T')[0],
      reason: '',
    });
    setIsResignationModalOpen(true);
  };

  const handleResignationDateChange = (dateStr: string) => {
    const d = new Date(dateStr);
    const noticeDays = resignationForm.notice_period_days || 30;
    if (!isNaN(d.getTime())) {
      const relieving = new Date(d);
      relieving.setDate(relieving.getDate() + noticeDays);
      setResignationForm((prev) => ({
        ...prev,
        resignation_date: dateStr,
        requested_relieving_date: relieving.toISOString().split('T')[0],
      }));
    } else {
      setResignationForm((prev) => ({ ...prev, resignation_date: dateStr }));
    }
  };

  const handleNoticeDaysChange = (days: number) => {
    const d = new Date(resignationForm.resignation_date);
    if (!isNaN(d.getTime())) {
      const relieving = new Date(d);
      relieving.setDate(relieving.getDate() + days);
      setResignationForm((prev) => ({
        ...prev,
        notice_period_days: days,
        requested_relieving_date: relieving.toISOString().split('T')[0],
      }));
    } else {
      setResignationForm((prev) => ({ ...prev, notice_period_days: days }));
    }
  };

  const submitResignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resignationForm.resignation_date) {
      alert('Resignation date is required.');
      return;
    }
    setResignationSubmitting(true);
    try {
      const payload: Record<string, any> = { ...resignationForm };
      if (employee?.id) {
        payload.employee = employee.id;
      }
      await api.post('/api/v1/resignation-requests/', payload);
      setIsResignationModalOpen(false);
      refetchResignations();
      setSuccessMessage('Resignation request submitted successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        'Failed to submit resignation request.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setResignationSubmitting(false);
    }
  };

  const cancelResignation = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to cancel your resignation request?')) {
      return;
    }
    setIsCancellingResignation(true);
    try {
      await api.post(`/api/v1/resignation-requests/${id}/cancel/`);
      refetchResignations();
      setSuccessMessage('Resignation request cancelled successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Failed to cancel resignation request.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsCancellingResignation(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProfileEditRestricted) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    updateMutation.mutate(formData, {
      onSuccess: () => {
        setIsEditing(false);
        setSuccessMessage('Profile updated successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
      },
      onError: (err: any) => {
        const detail =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          (typeof err?.response?.data === 'string' ? err.response.data : null) ||
          'Failed to update profile. Please try again.';
        setErrorMessage(detail);
      },
    });
  };

  const handleChange = (field: keyof EmployeeProfileUpdate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <PageContainer maxWidth="lg">
      <PageHeader title="My Profile" subtitle="View and manage your personal information." />

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm flex items-center gap-2">
          <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile Header with Avatar */}
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative group">
            {employee?.photo ? (
              <img
                src={employee.photo}
                alt={name ?? 'Profile'}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-grey-100"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary-main ring-4 ring-primary-lighter">
                <span className="text-2xl font-bold text-primary-contrast">
                  {name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                </span>
              </div>
            )}
            {/* Upload overlay hint */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-grey-900/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Iconify icon="upload" width={24} className="text-primary-contrast" />
            </div>
          </div>

          {/* Name and role info */}
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-ink-primary">{name ?? 'User'}</h2>
            <p className="text-sm text-ink-secondary capitalize">{role ?? 'employee'}</p>
            <p className="mt-1 text-sm text-ink-secondary">{email ?? '--'}</p>
            {employee && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-success-lighter px-2.5 py-0.5 text-xs font-medium text-success-dark">
                  {employee.status === 'active' ? 'Active' : employee.status}
                </span>
                {employee.designation && (
                  <span className="inline-flex items-center rounded-full bg-primary-lighter px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                    {employee.designation.title}
                  </span>
                )}
                {employee.department && (
                  <span className="inline-flex items-center rounded-full bg-secondary-lighter px-2.5 py-0.5 text-xs font-medium text-secondary-dark">
                    {employee.department.name}
                  </span>
                )}
                {(() => {
                  const tags = (employee as any).history_tags || (employee as any).custom_fields?.history_tags;
                  if (Array.isArray(tags) && tags.length > 0) {
                    return tags.map((tagTitle: string) => {
                      const tagItem = hrSettings?.history_tags?.find(
                        (t) => t.title.toLowerCase() === tagTitle.toLowerCase()
                      );
                      const isHighlighted = tagItem ? tagItem.highlight : false;
                      return (
                        <span
                          key={tagTitle}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isHighlighted
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold shadow-xs'
                              : 'bg-surface-neutral text-ink-primary border border-divider'
                          }`}
                          title={isHighlighted ? 'Highlighted History Tag' : 'History Tag'}
                        >
                          <Iconify
                            icon={isHighlighted ? 'solar:shield-star-bold' : 'solar:tag-outline'}
                            className={`w-3.5 h-3.5 ${isHighlighted ? 'text-amber-600' : 'text-ink-secondary'}`}
                          />
                          {tagTitle}
                        </span>
                      );
                    });
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Account Details */}
      <Card className="mt-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink-primary">Account Details</h2>
        <dl className="space-y-3">
          <InfoRow label="Full Name" value={name ?? '--'} />
          <InfoRow label="Email" value={email ?? '--'} />
          <InfoRow label="Role" value={role ?? '--'} capitalize />
          <InfoRow label="Organization" value={orgId ?? '--'} />
          {employee && (
            <>
              <InfoRow label="Employee ID" value={employee.employee_id} />
              {employee.badge_id && (
                <InfoRow label="Security Badge ID" value={employee.badge_id} />
              )}
              <InfoRow label="Date of Joining" value={employee.date_of_joining ? formatDate(employee.date_of_joining) : '--'} />
              <InfoRow label="Employment Type" value={employee.employment_type?.replace('_', ' ')} capitalize />
              {(() => {
                const tags = (employee as any).history_tags || (employee as any).custom_fields?.history_tags;
                if (Array.isArray(tags) && tags.length > 0) {
                  return (
                    <div className="flex justify-between gap-4">
                      <dt className="text-sm text-ink-secondary">History Tags</dt>
                      <dd className="flex flex-wrap gap-1.5 justify-end">
                        {tags.map((tagTitle: string) => {
                          const tagItem = hrSettings?.history_tags?.find(
                            (t) => t.title.toLowerCase() === tagTitle.toLowerCase()
                          );
                          const isHighlighted = tagItem ? tagItem.highlight : false;
                          return (
                            <span
                              key={tagTitle}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                isHighlighted
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                                  : 'bg-surface-neutral text-ink-secondary border border-divider'
                              }`}
                            >
                              <Iconify
                                icon={isHighlighted ? 'solar:shield-star-bold' : 'solar:tag-outline'}
                                className={`w-3 h-3 ${isHighlighted ? 'text-amber-600' : 'text-ink-disabled'}`}
                              />
                              {tagTitle}
                            </span>
                          );
                        })}
                      </dd>
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}
        </dl>
      </Card>

      {/* Employee Profile Section */}
      {isLoading && (
        <div className="mt-6 flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
          <span className="ml-2 text-sm text-ink-secondary">Loading profile...</span>
        </div>
      )}

      {employee && !isEditing && (
        <>
          {/* Personal Details (read-only) */}
          <Card className="mt-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-primary">Contact Information</h2>
              {isAdmin && (
                <Button type="button"
                  onClick={startEditing}
                >
                  Edit
                </Button>
              )}
            </div>
            <dl className="mt-4 space-y-3">
              <InfoRow label="Phone" value={employee.phone} />
              <InfoRow label="Personal Email" value={employee.personal_email} />
              <InfoRow label="Address" value={employee.address} />
              <InfoRow label="City" value={employee.city} />
              <InfoRow label="State" value={employee.state} />
              <InfoRow label="Country" value={employee.country} />
              <InfoRow label="PIN Code" value={employee.pincode} />
            </dl>
            {isReadOnlyEmployee && (
              <p className="mt-3 text-xs text-ink-disabled">
                Contact information is read-only. Please contact HR for changes.
              </p>
            )}
          </Card>

          {/* Emergency Contact (editable by employee) */}
          <Card className="mt-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-primary">Emergency Contact</h2>
              {!isEditing && (
                <Button type="button"
                  onClick={startEditing}
                >
                  Edit
                </Button>
              )}
            </div>
            <dl className="mt-4 space-y-3">
              <InfoRow label="Name" value={employee.emergency_contact_name} />
              <InfoRow label="Phone" value={employee.emergency_contact_phone} />
              <InfoRow label="Relation" value={employee.emergency_contact_relation} capitalize />
            </dl>
          </Card>

          {/* Reporting Hierarchy */}
          <Card className="mt-6 p-6">
            <h2 className="mb-4 text-lg font-semibold text-ink-primary">Reporting Hierarchy</h2>
            {employee.reporting_manager ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-neutral text-sm font-semibold text-ink-secondary">
                  {employee.reporting_manager.first_name.charAt(0)}
                  {employee.reporting_manager.last_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-primary">
                    {employee.reporting_manager.first_name} {employee.reporting_manager.last_name}
                  </p>
                  <p className="text-xs text-ink-secondary">Reporting Manager</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-secondary">No reporting manager assigned.</p>
            )}
          </Card>

          {/* Resignation & Notice Period */}
          <Card className="mt-6 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-light pb-4">
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">Resignation & Notice Period</h2>
                <p className="text-xs text-ink-secondary">Notice Period: {hrSettings?.notice_period_days ?? employee.notice_period_days ?? 30} days</p>
              </div>
              {(!latestResignation || latestResignation.status === 'cancelled' || latestResignation.status === 'rejected') && (
                hrSettings?.resignation_request ? (
                  <Button
                    type="button"
                    onClick={handleOpenResignationModal}
                    className="bg-error-main hover:bg-error-dark text-white text-xs px-3 py-1.5 self-start sm:self-auto"
                  >
                    <Iconify icon="logout" className="w-4 h-4 mr-1.5" />
                    Submit Resignation Request
                  </Button>
                ) : (
                  <span className="text-xs text-ink-disabled italic">
                    Self-service resignation is currently disabled in organization settings.
                  </span>
                )
              )}
            </div>

            {latestResignation ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-neutral p-4">
                  <div className="flex items-center gap-3">
                    <span className={cx(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
                      latestResignation.status === 'approved' && "bg-emerald-100 text-emerald-800",
                      latestResignation.status === 'pending' && "bg-amber-100 text-amber-800",
                      latestResignation.status === 'rejected' && "bg-red-100 text-red-800",
                      latestResignation.status === 'cancelled' && "bg-slate-100 text-slate-800",
                    )}>
                      {latestResignation.status}
                    </span>
                    <span className="text-sm font-medium text-ink-primary">
                      Requested on {formatDate(latestResignation.resignation_date)}
                    </span>
                  </div>
                  {latestResignation.status === 'pending' && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="sm"
                      onClick={() => cancelResignation(latestResignation.id)}
                      disabled={isCancellingResignation}
                      className="text-xs text-red-600 hover:bg-red-50 border-red-200"
                    >
                      {isCancellingResignation ? 'Cancelling...' : 'Cancel Request'}
                    </Button>
                  )}
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-ink-secondary">Notice Period</dt>
                    <dd className="font-medium text-ink-primary">{latestResignation.notice_period_days} days</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-secondary">Requested Relieving Date</dt>
                    <dd className="font-medium text-ink-primary">{formatDate(latestResignation.requested_relieving_date)}</dd>
                  </div>
                  {latestResignation.approved_relieving_date && (
                    <div>
                      <dt className="text-xs text-ink-secondary">Confirmed Relieving Date</dt>
                      <dd className="font-semibold text-emerald-700">{formatDate(latestResignation.approved_relieving_date)}</dd>
                    </div>
                  )}
                  {latestResignation.approver_name && (
                    <div>
                      <dt className="text-xs text-ink-secondary">Approver</dt>
                      <dd className="font-medium text-ink-primary">{latestResignation.approver_name}</dd>
                    </div>
                  )}
                  {latestResignation.rejection_reason && (
                    <div className="sm:col-span-2 rounded bg-red-50 p-3 text-xs text-red-800">
                      <strong>Rejection Reason:</strong> {latestResignation.rejection_reason}
                    </div>
                  )}
                  {latestResignation.reason && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-ink-secondary">Reason</dt>
                      <dd className="text-sm text-ink-primary whitespace-pre-line mt-1 bg-surface-neutral p-3 rounded">
                        {latestResignation.reason}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-secondary">
                No active resignation request.
              </p>
            )}
          </Card>
        </>
      )}

      {/* Edit Form */}
      {employee && isEditing && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Contact Info — only shown for admins */}
          {isAdmin && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-ink-primary">Edit Contact Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Phone"
                  value={formData.phone ?? ''}
                  onChange={(v) => handleChange('phone', v)}
                  type="tel"
                />
                <FormField
                  label="Personal Email"
                  value={formData.personal_email ?? ''}
                  onChange={(v) => handleChange('personal_email', v)}
                  type="email"
                />
                <FormField
                  label="Address"
                  value={formData.address ?? ''}
                  onChange={(v) => handleChange('address', v)}
                  className="sm:col-span-2"
                />
                <FormField
                  label="City"
                  value={formData.city ?? ''}
                  onChange={(v) => handleChange('city', v)}
                />
                <FormField
                  label="State"
                  value={formData.state ?? ''}
                  onChange={(v) => handleChange('state', v)}
                />
                <FormField
                  label="Country"
                  value={formData.country ?? ''}
                  onChange={(v) => handleChange('country', v)}
                />
                <FormField
                  label="PIN Code"
                  value={formData.pincode ?? ''}
                  onChange={(v) => handleChange('pincode', v)}
                />
              </div>
            </Card>
          )}

          {/* Emergency Contact — editable by everyone */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-ink-primary">Emergency Contact</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Contact Name"
                value={formData.emergency_contact_name ?? ''}
                onChange={(v) => handleChange('emergency_contact_name', v)}
              />
              <FormField
                label="Contact Phone"
                value={formData.emergency_contact_phone ?? ''}
                onChange={(v) => handleChange('emergency_contact_phone', v)}
                type="tel"
              />
              <FormField
                label="Relation"
                value={formData.emergency_contact_relation ?? ''}
                onChange={(v) => handleChange('emergency_contact_relation', v)}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outlined" color="inherit"
              type="button"
              onClick={cancelEditing}
            >
              Cancel
            </Button>
          </div>

          {updateMutation.isError && (
            <div className="rounded-md bg-error-lighter p-3">
              <p className="text-sm text-error-dark">
                Failed to update profile. Please try again.
              </p>
            </div>
          )}
        </form>
      )}

      {/* Fallback when no employee record is linked */}
      {!isLoading && !employee && (
        <Card className="mt-6 p-6">
          <p className="text-sm text-ink-secondary">
            Your employee profile is not linked yet. Contact your HR administrator.
          </p>
        </Card>
      )}

      {/* Employee History Tracking Timeline */}
      {employee && (
        <div className="mt-6">
          <PropertyHistoryTimeline employeeId={employee.id} />
        </div>
      )}
      {/* Resignation Request Modal */}
      <Modal
        open={isResignationModalOpen}
        onClose={() => setIsResignationModalOpen(false)}
        labelledBy="resignation-modal-title"
        size="md"
      >
        <form onSubmit={submitResignation}>
          <ModalHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Iconify icon="logout" className="w-5 h-5 text-red-500" />
              <h2 id="resignation-modal-title" className="text-lg font-semibold text-ink-primary">
                Submit Resignation Request
              </h2>
            </div>
            <button type="button" onClick={() => setIsResignationModalOpen(false)} className="text-ink-secondary hover:text-ink-primary">
              <Iconify icon="close" width={18} />
            </button>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                Please review your notice period before submitting. Your reporting manager and HR will be notified to review and approve your request.
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Resignation Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={resignationForm.resignation_date}
                  onChange={(e) => handleResignationDateChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Notice Period (days) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={resignationForm.notice_period_days}
                  onChange={(e) => handleNoticeDaysChange(parseInt(e.target.value, 10) || 0)}
                  required
                />
                <p className="text-xs text-ink-disabled mt-1">
                  Auto-filled from Settings ({hrSettings?.notice_period_days ?? 30} days configured).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Requested Relieving Date
                </label>
                <Input
                  type="date"
                  value={resignationForm.requested_relieving_date}
                  onChange={(e) => setResignationForm((prev) => ({ ...prev, requested_relieving_date: e.target.value }))}
                />
                <p className="text-xs text-ink-disabled mt-1">Calculated based on resignation date + notice period</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Reason for Resignation
                </label>
                <Textarea
                  rows={4}
                  value={resignationForm.reason}
                  onChange={(e) => setResignationForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Provide reason or comments for your resignation..."
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              onClick={() => setIsResignationModalOpen(false)}
              disabled={resignationSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={resignationSubmitting}
              className="bg-error-main hover:bg-error-dark text-white"
            >
              {resignationSubmitting ? 'Submitting...' : 'Submit Resignation'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </PageContainer>
  );
}

/** Read-only info row */
function InfoRow({
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
      <dd className={`text-sm font-medium text-ink-primary text-right ${capitalize ? 'capitalize' : ''}`}>
        {value || '--'}
      </dd>
    </div>
  );
}

/** Form input field */
function FormField({
  label,
  value,
  onChange,
  type = 'text',
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-primary">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      />
    </div>
  );
}
