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
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';

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

  const tabItems: { value: Tab; label: string }[] = [
    ...(canViewOwn ? [{ value: 'schedule' as const, label: 'My Schedule' }] : []),
    ...(canViewTeam ? [{ value: 'roster' as const, label: 'Team Roster' }] : []),
  ];

  return (
    <PageContainer>
      <PageHeader title="Shift Management" subtitle="View shift schedules, assignments, and roster planning." />

      <Tabs items={tabItems} value={effectiveTab} onChange={setActiveTab} aria-label="Shift navigation" />

      <div>
        {effectiveTab === 'schedule' && canViewOwn && <ShiftSchedule />}
        {effectiveTab === 'roster' && canViewTeam && <ShiftRoster />}
      </div>
    </PageContainer>
  );
}
