/**
 * Navigation icon. Resolves a nav item's `name` through the Iconify registry
 * (bundled Solar icons, no runtime API calls). Unknown names fall back to the dashboard icon.
 */

import { Iconify, isIconName } from '@/components/Iconify';

interface NavIconProps {
  name: string;
  className?: string;
}

export function NavIcon({ name, className = 'w-5 h-5' }: NavIconProps) {
  return <Iconify icon={isIconName(name) ? name : 'dashboard'} className={className} width={24} />;
}
