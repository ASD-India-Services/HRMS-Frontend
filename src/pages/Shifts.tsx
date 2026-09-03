/**
 * Shift Management module — tabbed view for schedule and roster.
 * Uses internal state-based tabs (no nested Routes).
 * Requirements: 27.5
 */

import { useState } from 'react';
import { ShiftSchedule } from './shifts/ShiftSchedule';
import { ShiftRoster } from './shifts/ShiftRoster';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';

type Tab = 'schedule' | 'roster';

export default function Shifts() {
  const { hasPermission, roleName } = useHrmsPermissionsContext();

  // org_admin sees everything; otherwise each tab is gated by its own code.
  const isOrgAdmin = roleName === 'org_admin';
  const canViewOwn = isOrgAdmin || hasPermission('shifts.view_own');
  const canViewTeam = isOrgAdmin || hasPermission('shifts.view_team');

  // Land on the first tab the user is allowed to see.
  const [activeTab, setActiveTab] = useState<Tab>(
    canViewOwn ? 'schedule' : 'roster',
  );

  // No access to either view.
  if (!canViewOwn && !canViewTeam) {
    return <AccessDenied />;
  }

  // Never trust stale tab state: if the selected tab is no longer permitted
  // (e.g. the permission was just unticked), fall back to the allowed one.
  const effectiveTab: Tab =
    activeTab === 'schedule' && canViewOwn
      ? 'schedule'
      : activeTab === 'roster' && canViewTeam
        ? 'roster'
        : canViewOwn
          ? 'schedule'
          : 'roster';

  const linkClasses = (isActive: boolean) =>
    `inline-flex items-center border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'border-primary-500 text-primary-700'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Shift Management</h1>
      <p className="mt-1 text-sm text-gray-600">
        View shift schedules, assignments, and roster planning.
      </p>

      <div className="mt-4">
        <nav className="border-b border-gray-200" aria-label="Shift navigation">
          <div className="flex gap-0">
            {canViewOwn && (
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={linkClasses(effectiveTab === 'schedule')}
              >
                My Schedule
              </button>
            )}
            {canViewTeam && (
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={linkClasses(effectiveTab === 'roster')}
              >
                Team Roster
              </button>
            )}
          </div>
        </nav>
      </div>

      <div className="mt-6">
        {effectiveTab === 'schedule' && canViewOwn && <ShiftSchedule />}
        {effectiveTab === 'roster' && canViewTeam && <ShiftRoster />}
      </div>
    </div>
  );
}
