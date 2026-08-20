/**
 * Dashboard Page — Role-Adaptive Entry Point
 *
 * Routes the logged-in user to the appropriate dashboard view based on their
 * HRMS role and permissions:
 *
 *   • org_admin / hr_manager  → Admin/HR view (org-wide metrics + all charts)
 *   • manager / dept_head / hod → Manager view (team metrics + approvals shortcuts)
 *   • Any other role (employee, intern, …) → Employee Self-Service view
 *
 * Every widget inside each sub-dashboard is additionally gated by <Can> so that
 * individual cards/charts are hidden when the user lacks the required permission,
 * even within the same role.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { useState } from 'react';
import { useUser } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { MetricsSection } from './dashboard/MetricsSection';
import { ChartsGrid } from './dashboard/ChartsGrid';
import { ManagerDashboard } from './dashboard/ManagerDashboard';
import { EmployeeDashboard } from './dashboard/EmployeeDashboard';
import { DateRangeFilter, getDefaultDateRange } from './dashboard/DateRangeFilter';
import type { DateRange } from './dashboard/DateRangeFilter';

/** Roles that see the full organisation-wide admin/HR dashboard */
const ADMIN_ROLES = ['org_admin', 'hr_manager'];

/** Roles that see the manager/team-lead dashboard */
const MANAGER_ROLES = ['manager', 'dept_head', 'hod', 'department_head'];

export default function Dashboard() {
  const { name } = useUser();
  const { roleName, isLoading: permLoading } = useHrmsPermissionsContext();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem('org-setup-banner-dismissed') === 'true',
  );

  const isOrgAdmin = roleName === 'org_admin';
  const showSetupBanner = isOrgAdmin && !bannerDismissed;

  const dismissBanner = () => {
    localStorage.setItem('org-setup-banner-dismissed', 'true');
    setBannerDismissed(true);
  };

  // Determine which sub-dashboard to render
  const isAdmin = roleName ? ADMIN_ROLES.includes(roleName) : false;
  const isManager = roleName ? MANAGER_ROLES.includes(roleName) : false;

  // Welcome subtitle varies by tier
  const subtitle = isAdmin
    ? "Here's an overview of your entire organization's HR operations."
    : isManager
    ? "Here's an overview of your team's HR status and pending actions."
    : "Here's your personal HR overview for today.";

  return (
    <div className="space-y-6">
      {/* Org Setup Banner — shown to first-time org admins only */}
      {showSetupBanner && (
        <div className="relative rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800">Complete Your Organization Setup</h3>
              <p className="mt-1 text-sm text-blue-700">
                Set up your company details, SMTP configuration, and HR policies to get the most out of your HRMS.
              </p>
              <a
                href="/hr-settings"
                className="mt-2 inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                Go to HR Settings →
              </a>
            </div>
            <button
              onClick={dismissBanner}
              className="shrink-0 rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
              aria-label="Dismiss banner"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back{name ? `, ${name}` : ''}. {subtitle}
          </p>
        </div>
        {/* Show date range filter only for admin/manager views that use charts */}
        {(isAdmin || isManager) && (
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        )}
      </div>

      {/* Loading state while permissions are being fetched */}
      {permLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : isAdmin ? (
        /* ── Admin / HR Manager View ───────────────────────────────────────── */
        <>
          <MetricsSection />
          <ChartsGrid dateRange={dateRange} />
        </>
      ) : isManager ? (
        /* ── Manager / Team Lead View ──────────────────────────────────────── */
        <ManagerDashboard dateRange={dateRange} />
      ) : (
        /* ── Employee Self-Service View ────────────────────────────────────── */
        <EmployeeDashboard />
      )}
    </div>
  );
}
