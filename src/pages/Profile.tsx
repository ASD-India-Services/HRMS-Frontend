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
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage your personal information.
          </p>
        </div>
        {!isEditing && canEditProfile && employee && (
          <button
            onClick={startEditing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit Profile
          </button>
        )}
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm flex items-center gap-2">
          <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile Header with Avatar */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative group">
            {employee?.photo ? (
              <img
                src={employee.photo}
                alt={name ?? 'Profile'}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-gray-100"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 ring-4 ring-primary-50">
                <span className="text-2xl font-bold text-white">
                  {name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                </span>
              </div>
            )}
            {/* Upload overlay hint */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
          </div>

          {/* Name and role info */}
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-gray-900">{name ?? 'User'}</h2>
            <p className="text-sm text-gray-500 capitalize">{role ?? 'employee'}</p>
            <p className="mt-1 text-sm text-gray-500">{email ?? '--'}</p>
            {employee && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  {employee.status === 'active' ? 'Active' : employee.status}
                </span>
                {employee.designation && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {employee.designation.title}
                  </span>
                )}
                {employee.department && (
                  <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    {employee.department.name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Account Details */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Account Details</h2>
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
            </>
          )}
        </dl>
      </section>

      {/* Employee Profile Section */}
      {isLoading && (
        <div className="mt-6 flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
          <span className="ml-2 text-sm text-gray-600">Loading profile...</span>
        </div>
      )}

      {employee && !isEditing && (
        <>
          {/* Profile Edit Restriction Banner */}
          {isProfileEditRestricted && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
              <svg className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold text-amber-950">Profile Editing Restricted</p>
                <p className="mt-0.5 text-amber-800">
                  Self-service profile and emergency contact editing have been disabled by your organization's HR settings. Please contact your HR administrator to update your details.
                </p>
              </div>
            </div>
          )}

          {/* Personal Details */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
              {canEditProfile && (
                <button
                  onClick={startEditing}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit
                </button>
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
            {isProfileEditRestricted && (
              <p className="mt-3 text-xs text-amber-600">
                Contact information editing is restricted by HR settings.
              </p>
            )}
          </section>

          {/* Emergency Contact */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Emergency Contact</h2>
              {canEditProfile && (
                <button
                  onClick={startEditing}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit
                </button>
              )}
            </div>
            <dl className="mt-4 space-y-3">
              <InfoRow label="Name" value={employee.emergency_contact_name} />
              <InfoRow label="Phone" value={employee.emergency_contact_phone} />
              <InfoRow label="Relation" value={employee.emergency_contact_relation} capitalize />
            </dl>
          </section>

          {/* Reporting Hierarchy */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Reporting Hierarchy</h2>
            {employee.reporting_manager ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                  {employee.reporting_manager.first_name.charAt(0)}
                  {employee.reporting_manager.last_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {employee.reporting_manager.first_name} {employee.reporting_manager.last_name}
                  </p>
                  <p className="text-xs text-gray-500">Reporting Manager</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No reporting manager assigned.</p>
            )}
          </section>
        </>
      )}

      {/* Edit Form */}
      {employee && isEditing && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Contact Info */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit Contact Information</h2>
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
          </section>

          {/* Emergency Contact */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Emergency Contact</h2>
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
          </section>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>

          {(errorMessage || updateMutation.isError) && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage || 'Failed to update profile. Please try again.'}</span>
            </div>
          )}
        </form>
      )}

      {/* Fallback when no employee record is linked */}
      {!isLoading && !employee && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Your employee profile is not linked yet. Contact your HR administrator.
          </p>
        </div>
      )}
    </div>
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
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className={`text-sm font-medium text-gray-900 text-right ${capitalize ? 'capitalize' : ''}`}>
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
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}
