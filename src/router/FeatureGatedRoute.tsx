import { usePermissions } from '@platform/auth-sdk';
import { UpgradePrompt } from '@/components/UpgradePrompt';

interface FeatureGatedRouteProps {
  /** The feature flag key to check (e.g., 'payroll_enabled') */
  featureFlag: string;
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

  if (!hasFeature(featureFlag)) {
    return <UpgradePrompt moduleName={moduleName} />;
  }

  return <>{children}</>;
}
