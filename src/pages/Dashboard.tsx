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
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

/** Roles that see the full organisation-wide admin/HR dashboard */
const ADMIN_ROLES = ['org_admin', 'hr_manager', 'hr', 'admin', 'administrator', 'superadmin', 'org admin'];

/** Roles that see the manager/team-lead dashboard */
const MANAGER_ROLES = ['manager', 'dept_head', 'hod', 'department_head', 'team_lead', 'team lead'];

export default function Dashboard() {
  const { name, role: authRole } = useUser();
  const { roleName, isLoading: permLoading } = useHrmsPermissionsContext();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  // Determine which sub-dashboard to render
  const effectiveRole = (roleName || authRole || '').trim().toLowerCase();
  const isAdmin = ADMIN_ROLES.includes(effectiveRole);
  const isManager = MANAGER_ROLES.includes(effectiveRole);

  // Welcome subtitle varies by tier
  const subtitle = isAdmin
    ? "Here's an overview of your entire organization's HR operations."
    : isManager
    ? "Here's an overview of your team's HR status and pending actions."
    : "Here's your personal HR overview for today.";

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back${name ? `, ${name}` : ''}. ${subtitle}`}
        actions={
          /* Show date range filter only for admin/manager views that use charts */
          (isAdmin || isManager) && <DateRangeFilter value={dateRange} onChange={setDateRange} />
        }
      />
      {/* Loading state while permissions are being fetched */}
      {permLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-surface-neutral" />
          ))}
        </div>
      ) : isAdmin ? (
        /* ── Admin / HR Manager View ───────────────────────────────────────── */
        <div className="space-y-6">
          <MetricsSection />
          <ChartsGrid dateRange={dateRange} />
        </div>
      ) : isManager ? (
        /* ── Manager / Team Lead View ──────────────────────────────────────── */
        <ManagerDashboard dateRange={dateRange} />
      ) : (
        /* ── Employee Self-Service View ────────────────────────────────────── */
        <EmployeeDashboard />
      )}
    </PageContainer>
  );
}
