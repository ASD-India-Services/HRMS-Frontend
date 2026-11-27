import { usePermissions, useUser } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { UpgradePrompt } from '@/components/UpgradePrompt';

interface FeatureGatedRouteProps {
  /** The feature flag key to check (e.g., 'payroll_enabled') */
  featureFlag?: string | null;
  /** Human-readable module name for the upgrade prompt */
  moduleName: string;
  /** The child route element to render when access is granted */
  children: React.ReactNode;
}

/**
 * Route wrapper that checks if a feature flag is enabled for the organization.
 * If the flag is disabled, renders an UpgradePrompt instead of the route content.
 */
export function FeatureGatedRoute({ featureFlag, moduleName, children }: FeatureGatedRouteProps) {
  const { hasFeature } = usePermissions();
  const { role } = useUser();
  const { roleName } = useHrmsPermissionsContext();

  const normalizedRole = (roleName || role || '').toLowerCase().trim();
  const isAdmin =
    normalizedRole === 'org_admin' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'administrator' ||
    normalizedRole === 'org admin' ||
    normalizedRole === 'superadmin' ||
    normalizedRole === 'hr' ||
    normalizedRole === 'hr_manager' ||
    normalizedRole === 'hr manager';

  if (!isAdmin && featureFlag && !hasFeature(featureFlag)) {
    return <UpgradePrompt moduleName={moduleName} />;
  }

  return <>{children}</>;
}
