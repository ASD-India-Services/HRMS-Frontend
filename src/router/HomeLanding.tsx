/**
 * Landing page after sign-in (/dashboard).
 *
 * Users with `dashboard.view` (admins, HR) see the Dashboard. Everyone else
 * (e.g. the default "employee" role, which has no dashboard permission) is
 * sent to the first self-service page they can open, instead of hitting
 * "Access Denied" right after sign-in.
 */
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';

const FALLBACKS: { path: string; permission?: string }[] = [
  { path: '/my-attendance', permission: 'my_attendance.view' },
  { path: '/my-leaves', permission: 'leaves.view' },
  { path: '/profile' }, // always available
];

export function HomeLanding({ dashboard }: { dashboard: ReactNode }) {
  const { hasPermission, isLoading } = useHrmsPermissionsContext();

  if (isLoading) return null; // RoleGatedRoute shows the dashboard optimistically; avoid a flash
  if (hasPermission('dashboard.view')) return <>{dashboard}</>;

  const target = FALLBACKS.find((f) => !f.permission || hasPermission(f.permission));
  return <Navigate to={target?.path ?? '/profile'} replace />;
}
