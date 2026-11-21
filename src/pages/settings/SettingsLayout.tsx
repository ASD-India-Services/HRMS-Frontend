import { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { SettingsIcon, ClipboardDocumentIcon, UsersIcon, ClockIcon, CalendarIcon, BanknotesIcon, ChartBarIcon, HeadphonesIcon, ChevronDownIcon, ChevronRightIcon } from './SettingsIcons';
import { Iconify } from '@/components/Iconify';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

interface NavItem {
  id: string;
  label: string;
  path: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  items: NavItem[];
}

const SETTINGS_GROUPS: NavGroup[] = [
  {
    id: 'general',
    label: 'General',
    icon: SettingsIcon,
    items: [
      { id: 'general-settings', label: 'General Settings', path: '/settings/general-settings' },
      { id: 'employee-permission', label: 'Employee Permission', path: '/settings/employee-permission' },
      { id: 'accessibility-restriction', label: 'Accessibility Restriction', path: '/settings/accessibility' },
      { id: 'date-time-format', label: 'Date & Time Format', path: '/settings/date-time-format' },
      { id: 'history-tags', label: 'History Tags', path: '/settings/history-tags' },
      { id: 'mail-server', label: 'Mail Server', path: '/settings/mail-server' },
      { id: 'gdrive-backup', label: 'Gdrive Backup', path: '/settings/gdrive-backup' },
    ],
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    icon: ClipboardDocumentIcon,
    items: [
      { id: 'candidate-self-tracking', label: 'Candidate Self Tracking', path: '/settings/candidate-self-tracking' },
      { id: 'candidate-reject-reasons', label: 'Candidate Reject Reason', path: '/settings/candidate-reject-reasons' },
    ],
  },
  {
    id: 'employee',
    label: 'Employee',
    icon: UsersIcon,
    items: [
      { id: 'work-types', label: 'Work Type', path: '/settings/work-types' },
      { id: 'employee-types', label: 'Employee Type', path: '/settings/employee-types' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: ClockIcon,
    items: [
      { id: 'track-late-come-early-out', label: 'Track Late Come Early Out', path: '/settings/track-late-come-early-out' },
      { id: 'attendance-breakpoints', label: 'Attendance Break Point', path: '/settings/attendance-breakpoints' },
      { id: 'grace-time', label: 'Grace Time', path: '/settings/grace-time' },
    ],
  },
  {
    id: 'leave',
    label: 'Leave',
    icon: CalendarIcon,
    items: [
      { id: 'restrict-past-leave', label: 'Restrict Past Leave', path: '/settings/restrict-past-leave' },
      { id: 'compensatory-leave', label: 'Compensatory Leave', path: '/settings/compensatory-leave' },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: BanknotesIcon,
    items: [
      { id: 'auto-payslip-settings', label: 'Payslip Auto Generation', path: '/settings/auto-payslip' },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: ChartBarIcon,
    items: [
      { id: 'bonus-point-setting', label: 'Bonus Point Setting', path: '/settings/bonus-point-setting' },
    ],
  },
  {
    id: 'helpdesk',
    label: 'Help Desk',
    icon: HeadphonesIcon,
    items: [
      { id: 'helpdesk-tags', label: 'Helpdesk Tags', path: '/settings/helpdesk-tags' },
    ],
  },
];

export function SettingsLayout() {
  const location = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      general: false,
      recruitment: false,
      employee: false,
      attendance: false,
      leave: false,
      payroll: false,
      performance: false,
      helpdesk: false,
    };
    // Auto-expand the group that contains current path
    const activeGroup = SETTINGS_GROUPS.find((g) =>
      g.items.some((item) => location.pathname === item.path || location.pathname.startsWith(item.path))
    );
    if (activeGroup) {
      initial[activeGroup.id] = false;
    }
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Extract current subpath for breadcrumb
  const currentPathSegment = location.pathname.split('/').pop() || 'general-settings';

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
            <Link to="/" className="transition-colors hover:text-ink-primary">
              DigiHRMS
            </Link>
            <Iconify icon="chevron-right" width={14} />
            <span>settings</span>
            <Iconify icon="chevron-right" width={14} />
            <span className="font-semibold text-ink-primary">{currentPathSegment}</span>
          </nav>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <Card className="p-4 lg:col-span-3">
          <div className="space-y-4">
            {SETTINGS_GROUPS.map((group) => {
              const isCollapsed = !!collapsedGroups[group.id];
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="space-y-1">
                  <Button
                    variant="text"
                    color="inherit"
                    size="small"
                    onClick={() => toggleGroup(group.id)}
                    startIcon={<GroupIcon />}
                    endIcon={isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                    aria-expanded={!isCollapsed}
                    className="!w-full !justify-between !text-xs !font-semibold uppercase tracking-wider"
                  >
                    <span className="mr-auto pl-2">{group.label}</span>
                  </Button>

                  {!isCollapsed && (
                    <div className="space-y-1 pl-1">
                      {group.items.map((item) => {
                        const isActive =
                          location.pathname === item.path ||
                          (item.id === 'general-settings' && location.pathname === '/settings');

                        return (
                          <NavLink
                            key={item.id}
                            to={item.path}
                            className={`flex items-center rounded px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-primary-main/10 font-semibold text-primary-main'
                                : 'font-medium text-ink-secondary hover:bg-grey-500/10 hover:text-ink-primary'
                            }`}
                          >
                            {item.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="min-h-[500px] p-6 sm:p-8 lg:col-span-9">
          <Outlet />
        </Card>
      </div>
    </PageContainer>
  );
}
