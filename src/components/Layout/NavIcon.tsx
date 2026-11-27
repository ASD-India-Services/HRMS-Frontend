/**
 * Navigation icon. Resolves a nav item's `name` through the Iconify registry
 * (bundled Solar icons, no runtime API calls). Unknown names fall back to the dashboard icon.
 */

import { Iconify, isIconName } from '@/components/Iconify';
import adminIcon from '../../../icons/admin.svg?raw';
import dashboardIcon from '../../../icons/dashboard.svg?raw';
import attendanceIcon from '../../../icons/attendance.svg?raw';
import expensesIcon from '../../../icons/expenses.svg?raw';
import helpDeskIcon from '../../../icons/help-desk.svg?raw';
import learningIcon from '../../../icons/learning.svg?raw';
import leaveIcon from '../../../icons/leave.svg?raw';
import moreIcon from '../../../icons/more.svg?raw';
import payrollIcon from '../../../icons/payroll.svg?raw';
import peopleIcon from '../../../icons/people.svg?raw';
import performanceIcon from '../../../icons/performance.svg?raw';
import permissionsIcon from '../../../icons/permissions.svg?raw';
import recruitmentIcon from '../../../icons/recruitment.svg?raw';

interface NavIconProps {
  name: string;
  className?: string;
}

export function NavIcon({ name, className = 'w-5 h-5' }: NavIconProps) {
  const customIcons: Record<string, string> = {
    'custom:admin': adminIcon,
    'custom:dashboard': dashboardIcon,
    'custom:attendance': attendanceIcon,
    'custom:expenses': expensesIcon,
    'custom:help-desk': helpDeskIcon,
    'custom:learning': learningIcon,
    'custom:leave': leaveIcon,
    'custom:more': moreIcon,
    'custom:payroll': payrollIcon,
    'custom:people': peopleIcon,
    'custom:performance': performanceIcon,
    'custom:permissions': permissionsIcon,
    'custom:recruitment': recruitmentIcon,
  };
  const customIcon = customIcons[name];

  if (customIcon) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 [&>svg]:h-full [&>svg]:w-full ${className}`}
        dangerouslySetInnerHTML={{ __html: customIcon }}
      />
    );
  }

  return <Iconify icon={isIconName(name) ? name : 'dashboard'} className={className} width={24} />;
}
