import { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  SettingsIcon,
  LayersIcon,
  GridIcon,
  ClipboardDocumentIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
  HeadphonesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from './SettingsIcons';

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
      { id: 'careers-widget', label: 'Careers Website Embed', path: '/settings/careers-widget' },
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
    <div className="min-h-screen bg-[#fafbfc] px-4 py-6 sm:px-6 lg:px-8">
      {/* ─── Breadcrumb Navigation ────────────────────────────────────── */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-gray-900 transition-colors">
          DigiHRMS
        </Link>
        <span>&gt;</span>
        <span className="text-gray-600">settings</span>
        <span>&gt;</span>
        <span className="font-semibold text-gray-900">{currentPathSegment}</span>
      </nav>

      {/* ─── Page Title ──────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Settings</h1>
        </div>
      </div>

      {/* ─── Two-Column Container ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="space-y-6">
            {SETTINGS_GROUPS.map((group) => {
              const isCollapsed = !!collapsedGroups[group.id];
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="space-y-2">
                  {/* Category Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className="h-4 w-4 text-gray-400" />
                      <span>{group.label}</span>
                    </div>
                    {isCollapsed ? (
                      <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </button>

                  {/* Sub-items */}
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
                            className={`flex items-center justify-between px-3.5 py-2.5 text-sm transition-all ${
                              isActive
                                ? 'rounded-2xl border-2 border-blue-600 bg-blue-50/70 font-bold text-blue-600 shadow-xs'
                                : 'rounded-xl text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                            }`}
                          >
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Main Content Panel */}
        <main className="lg:col-span-9 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs min-h-[500px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
