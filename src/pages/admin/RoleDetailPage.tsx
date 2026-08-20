/**
 * Role Detail Page — Admin UI for viewing and editing a role's permissions and data scope.
 *
 * Provides:
 *  1. Data Access Scope selection (Organisation-wide vs Own Department Only vs Normal Employee)
 *  2. Module-wise permission checkboxes
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'employees.view': 'Access the employee directory, view profiles, and see employee details',
  'employees.create': 'Add new employees to the system and fill their profile information',
  'employees.edit': 'Update employee personal details, job info, and profile data',
  'employees.delete': 'Permanently remove employee records from the system',
  'employees.manage': 'Access Departments, Designations, Grades, Branches, Approvers, Transfers, Promotions, and org structure settings',
  'leaves.view': 'Access My Leaves section to view personal leave balances, status, and apply for leaves',
  'leaves.create': 'Submit leave applications on behalf of self or others',
  'leaves.edit': 'Modify existing leave records and adjust balances',
  'leaves.delete': 'Remove leave application records',
  'leaves.approve': 'Access Leave Approvals section to view leave applicants and approve or reject leave applications',
  'leaves.manage': 'Access Leave Policies, Policy Assignments, Block Lists, Adjustments, and Earned Leave Schedules settings',
  'attendance.view': 'View attendance records, check in/out for self, and see shift schedule',
  'attendance.create': 'Manually create attendance entries for employees',
  'attendance.edit': 'Edit attendance records and approve/reject attendance correction requests',
  'attendance.delete': 'Delete attendance records from the system',
  'attendance.manage': 'Access Attendance Upload (CSV), Geo-fence Locations setup, Shift Types, and Shift Schedules management',
  'payroll.view': 'View salary slips, payroll summaries, and compensation data',
  'payroll.create': 'Generate new payroll runs and create salary slips',
  'payroll.edit': 'Modify salary components, structures, and payroll corrections',
  'payroll.delete': 'Delete payroll records and salary slips',
  'payroll.approve': 'Approve payroll runs for final processing and disbursement',
  'payroll.manage': 'Access Payroll Runs, Salary Components, Structures, Assignments, Periods, Corrections, Incentives, and Gratuity settings',
  'recruitment.view': 'Access Job Openings, Candidates pipeline (kanban), Pipeline (table view), Interviews schedule, and Referrals pages',
  'recruitment.create': 'Create new job openings, add candidates/applicants, schedule interviews, and submit referrals',
  'recruitment.edit': 'Edit job openings, update candidate details, change applicant stage (move through pipeline), and modify interview schedules',
  'recruitment.delete': 'Delete job openings, remove candidates, and cancel interviews',
  'recruitment.manage': 'Access Interview Types and Job Templates settings pages (configure interview rounds and reusable job descriptions)',
  'appraisals.view': 'View appraisal cycles, goals, KRAs, and performance feedback',
  'appraisals.create': 'Create new appraisal cycles, set goals, and give feedback',
  'appraisals.edit': 'Edit appraisal records, goals, and ratings',
  'appraisals.delete': 'Delete appraisal records',
  'appraisals.approve': 'Review and approve submitted appraisals and ratings',
  'appraisals.manage': 'Access KRA definitions, Appraisal Templates, and performance settings',
  'expenses.view': 'View expense claims and reimbursement history',
  'expenses.create': 'Submit new expense claims with receipts',
  'expenses.edit': 'Modify expense claim details',
  'expenses.delete': 'Delete expense claims',
  'expenses.approve': 'Approve or reject expense claims from team members',
  'expenses.manage': 'Access Expense Categories and Tax configuration settings',
  'onboarding.view': 'View onboarding checklists and new hire tasks',
  'onboarding.create': 'Create onboarding plans for new employees',
  'onboarding.edit': 'Edit onboarding tasks and checklists',
  'onboarding.delete': 'Delete onboarding records',
  'onboarding.manage': 'Access Onboarding Templates, task assignments, and onboarding tracking dashboard',
  'training.view': 'View training events, schedules, and enrollments',
  'training.create': 'Create training sessions and enroll employees',
  'training.edit': 'Edit training event details',
  'training.delete': 'Delete training records',
  'training.manage': 'Access Training Programs and Training Results management',
  'grievances.view': 'View submitted grievance tickets',
  'grievances.create': 'Submit new grievance complaints',
  'grievances.edit': 'Update grievance status and details',
  'grievances.delete': 'Delete grievance records',
  'travel.view': 'View travel requests and itineraries',
  'travel.create': 'Submit travel requests with trip details',
  'travel.edit': 'Modify travel request information',
  'travel.delete': 'Delete travel records',
  'travel.approve': 'Approve or reject travel requests from employees',
  'overtime.view': 'View overtime logs and hours worked',
  'overtime.create': 'Log overtime hours for self or team',
  'overtime.edit': 'Edit overtime entries',
  'overtime.delete': 'Delete overtime records',
  'overtime.approve': 'Approve overtime claims for payroll processing',
  'settlements.view': 'View full & final settlement records',
  'settlements.create': 'Initiate settlement process for exiting employees',
  'settlements.edit': 'Modify settlement calculations and details',
  'settlements.delete': 'Delete settlement records',
  'settlements.approve': 'Approve final settlement payouts',
  'shifts.view': 'View shift types, assignments, and personal shift schedule',
  'shifts.create': 'Create new shift types and manual shift assignments',
  'shifts.edit': 'Edit shift configurations and approve/reject shift change requests',
  'shifts.delete': 'Delete shift types and assignments',
  'roles.manage': 'Full access to Roles & Permissions, HR Settings, and Audit Logs in the Admin section',
  'permissions.view': 'View the list of all available permissions in the system',
  'dashboard.view': 'Access the main dashboard with charts and metrics',
  'exit_interviews.view': 'View exit interview records for departing employees',
  'exit_interviews.manage': 'Create, edit, and delete exit interview records',
  'holidays.view': 'View holiday lists and their entries',
  'holidays.manage': 'Create, edit, and delete holiday lists, entries, and assignments to employees/departments',
  'health_insurance.view': 'View employee health insurance records',
  'health_insurance.manage': 'Create, edit, and delete health insurance records for employees',
  'cost_centers.view': 'View employee cost center assignments',
  'cost_centers.manage': 'Create, edit, and delete cost center allocations',
  'documents.view': 'View document types and employee uploaded documents',
  'documents.manage': 'Create, edit, and delete document types and manage employee document submissions',
  'appointment_letters.view': 'View appointment letter templates',
  'appointment_letters.manage': 'Create, edit, and delete appointment letter templates and generate letters',
};

type DataScope = 'organisation' | 'department' | 'self';

interface PermissionItem {
  id: string;
  code: string;
  display_name: string;
}

interface RoleDetail {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  data_scope: DataScope;
  permissions: PermissionItem[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

type PermissionsGrouped = Record<string, PermissionItem[]>;

// ─── API Hooks ───────────────────────────────────────────────────────────────

function useRoleDetail(id: string) {
  return useQuery<RoleDetail>({
    queryKey: ['roles', 'detail', id],
    queryFn: () => api.get(`/api/v1/roles/${id}/`).then((res) => res.data),
    enabled: !!id,
  });
}

function useAllPermissions() {
  return useQuery<PermissionsGrouped>({
    queryKey: ['permissions', 'all'],
    queryFn: () => api.get('/api/v1/permissions/').then((res) => res.data),
  });
}

// ─── Skeleton Component ──────────────────────────────────────────────────────

function PermissionGridSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, groupIdx) => (
        <div key={groupIdx} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="ml-6 space-y-2">
            {Array.from({ length: 4 }).map((_, permIdx) => (
              <div key={permIdx} className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: role, isLoading: roleLoading, isError: roleError, error: roleErrorObj } = useRoleDetail(id!);
  const { data: allPermissions, isLoading: permsLoading, isError: permsError } = useAllPermissions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dataScope, setDataScope] = useState<DataScope>('organisation');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize from role
  useEffect(() => {
    if (role) {
      setSelectedIds(new Set(role.permissions.map((p) => p.id)));
      setDataScope(role.data_scope || 'organisation');
    }
  }, [role]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/v1/roles/${id}/`, {
        data_scope: dataScope,
        permission_ids: Array.from(selectedIds),
      }),
    onSuccess: () => {
      setSaveSuccess(true);
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['roles', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['hrms-permissions'] });
    },
    onError: (err: unknown) => {
      setSaveSuccess(false);
      if (err && typeof err === 'object' && 'message' in err) {
        setSaveError((err as Error).message);
      } else {
        setSaveError('Failed to save changes. Please try again.');
      }
    },
  });

  const togglePermission = useCallback((permId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  }, []);

  const toggleModule = useCallback((modulePermissions: PermissionItem[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = modulePermissions.every((p) => next.has(p.id));
      if (allSelected) {
        modulePermissions.forEach((p) => next.delete(p.id));
      } else {
        modulePermissions.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }, []);

  const hasChanges = useMemo(() => {
    if (!role) return false;
    if (dataScope !== (role.data_scope || 'organisation')) return true;
    const original = new Set(role.permissions.map((p) => p.id));
    if (original.size !== selectedIds.size) return true;
    for (const pId of selectedIds) {
      if (!original.has(pId)) return true;
    }
    return false;
  }, [role, dataScope, selectedIds]);

  const sortedModules = useMemo(() => {
    if (!allPermissions) return [];
    return Object.keys(allPermissions).sort();
  }, [allPermissions]);

  if (roleLoading || permsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-gray-200" />
        <div className="mb-2 h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-gray-200" />
        <PermissionGridSkeleton />
      </div>
    );
  }

  if (roleError || permsError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/admin/roles" className="mb-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-800">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Roles
        </Link>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load role details.{' '}
            {roleErrorObj instanceof Error ? roleErrorObj.message : 'Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  if (!role || !allPermissions) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        to="/admin/roles"
        className="mb-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
      >
        <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Roles
      </Link>

      {/* Header with Save Button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
          {role.description && (
            <p className="mt-1 text-sm text-gray-600">{role.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            className="inline-flex items-center rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Toast notification for save success */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-white px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Settings saved</p>
              <p className="text-xs text-gray-500">Permissions and data scope updated successfully.</p>
            </div>
          </div>
        </div>
      )}
      {saveError && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Save failed</p>
              <p className="text-xs text-gray-500">{saveError}</p>
            </div>
          </div>
        </div>
      )}

      {/* System role warning */}
      {role.is_system && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-amber-800">This is a system role. Changes may affect core functionality.</p>
        </div>
      )}

      {/* Data Scope Selection Box (Top) */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900">Data Access Scope</h2>
          <p className="text-sm text-gray-500">
            Define the reach of this role when viewing, editing, and managing employee records, attendance, leaves, and approvals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Option 1: Organisation-wide */}
          <label
            className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
              dataScope === 'organisation'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="data_scope"
              value="organisation"
              checked={dataScope === 'organisation'}
              onChange={() => setDataScope('organisation')}
              className="sr-only"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                </span>
                <span className="font-semibold text-gray-900">Organisation-wide</span>
              </div>
              <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'organisation' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                {dataScope === 'organisation' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Can access, view, and manage employees across the <strong>entire organisation</strong> (e.g. HR Manager, Operations Head, Org Admin).
            </p>
          </label>

          {/* Option 2: Own Department Only */}
          <label
            className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
              dataScope === 'department'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="data_scope"
              value="department"
              checked={dataScope === 'department'}
              onChange={() => setDataScope('department')}
              className="sr-only"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
                <span className="font-semibold text-gray-900">Own Department Only</span>
              </div>
              <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'department' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                {dataScope === 'department' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Restricted to employees in their <strong>own assigned department</strong> only (e.g. Department Head, Team Lead, Manager).
            </p>
          </label>

          {/* Option 3: Normal Employee (Self Only) */}
          <label
            className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
              dataScope === 'self'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="data_scope"
              value="self"
              checked={dataScope === 'self'}
              onChange={() => setDataScope('self')}
              className="sr-only"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="font-semibold text-gray-900">Normal Employee</span>
              </div>
              <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'self' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                {dataScope === 'self' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Self-service mode: only sees and accesses <strong>their own individual records</strong> (standard employee role).
            </p>
          </label>
        </div>
      </div>

      {/* Permission Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Module Permissions</h2>
        {sortedModules.map((module) => {
          const modulePerms = allPermissions[module];
          const allSelected = modulePerms.every((p) => selectedIds.has(p.id));
          const someSelected = !allSelected && modulePerms.some((p) => selectedIds.has(p.id));

          return (
            <div key={module} className="rounded-lg border border-gray-200 bg-white p-4">
              {/* Module header */}
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={() => toggleModule(modulePerms)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    aria-label={`Select all ${module} permissions`}
                  />
                  <span className="text-sm font-semibold capitalize text-gray-900">{module}</span>
                </label>
                <span className="text-xs text-gray-400">
                  {modulePerms.filter((p) => selectedIds.has(p.id)).length}/{modulePerms.length} selected
                </span>
              </div>

              {/* Individual permissions */}
              <div className="ml-6 space-y-3">
                {modulePerms.map((perm) => {
                  const isChecked = selectedIds.has(perm.id);

                  return (
                    <label key={perm.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(perm.id)}
                        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-label={perm.display_name}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700">
                          {perm.display_name}
                        </span>
                        {PERMISSION_DESCRIPTIONS[perm.code] && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {PERMISSION_DESCRIPTIONS[perm.code]}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
