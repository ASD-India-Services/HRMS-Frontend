/**
 * Settings Layout
 *
 * Modern settings page navigation following the DigiHRMS linear/outline design system.
 * Features:
 * - Pure white container with soft light-gray active highlights
 * - Clean linear/outline icons from Iconify for top-level setting groups
 * - Tree connector lines with vertical guides and horizontal connector ticks for sub labels
 * - Text-only sub labels (no icons on sub labels) matching the design specification
 * - Active sub label highlighting with right chevron (›)
 * - Smooth collapsible accordion sections
 */

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

interface NavItem {
  id: string;
  label: string;
  path: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

const SETTINGS_GROUPS: NavGroup[] = [
  {
    id: 'general',
    label: 'General',
    icon: 'solar:settings-linear',
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
    icon: 'solar:case-round-linear',
    items: [
      { id: 'candidate-self-tracking', label: 'Candidate Self Tracking', path: '/settings/candidate-self-tracking' },
      { id: 'candidate-reject-reasons', label: 'Candidate Reject Reason', path: '/settings/candidate-reject-reasons' },
      { id: 'careers-widget', label: 'Careers Website Embed', path: '/settings/careers-widget' },
    ],
  },
  {
    id: 'employee',
    label: 'Employee',
    icon: 'solar:users-group-rounded-linear',
    items: [
      { id: 'work-types', label: 'Work Type', path: '/settings/work-types' },
      { id: 'employee-types', label: 'Employee Type', path: '/settings/employee-types' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'solar:clock-circle-linear',
    items: [
      { id: 'track-late-come-early-out', label: 'Track Late Come Early Out', path: '/settings/track-late-come-early-out' },
      { id: 'attendance-breakpoints', label: 'Attendance Break Point', path: '/settings/attendance-breakpoints' },
      { id: 'grace-time', label: 'Grace Time', path: '/settings/grace-time' },
    ],
  },
  {
    id: 'leave',
    label: 'Leave',
    icon: 'solar:calendar-date-linear',
    items: [
      { id: 'restrict-past-leave', label: 'Restrict Past Leave', path: '/settings/restrict-past-leave' },
      { id: 'compensatory-leave', label: 'Compensatory Leave', path: '/settings/compensatory-leave' },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: 'solar:wallet-money-linear',
    items: [
      { id: 'auto-payslip-settings', label: 'Payslip Auto Generation', path: '/settings/auto-payslip' },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: 'solar:chart-square-linear',
    items: [
      { id: 'bonus-point-setting', label: 'Bonus Point Setting', path: '/settings/bonus-point-setting' },
    ],
  },
  {
    id: 'helpdesk',
    label: 'Help Desk',
    icon: 'solar:help-linear',
    items: [
      { id: 'helpdesk-tags', label: 'Helpdesk Tags', path: '/settings/helpdesk-tags' },
    ],
  },
];

export function SettingsLayout() {
  const location = useLocation();

  /** Check if any item in a group is active */
  const isGroupActive = (group: NavGroup) =>
    group.items.some(
      (item) =>
        location.pathname === item.path ||
        (item.id === 'general-settings' && (location.pathname === '/settings' || location.pathname === '/settings/'))
    );

  // Track expanded group with auto-expansion for current route
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    const active = SETTINGS_GROUPS.find((g) => isGroupActive(g));
    return active?.id ?? 'general';
  });

  // Keep expanded group aligned when route changes
  useEffect(() => {
    const active = SETTINGS_GROUPS.find((g) =>
      g.items.some(
        (item) =>
          location.pathname === item.path ||
          (item.id === 'general-settings' && (location.pathname === '/settings' || location.pathname === '/settings/'))
      )
    );
    if (active) {
      setExpandedGroup((prev) => (prev !== active.id ? active.id : prev));
    }
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroup((prev) => (prev === groupId ? null : groupId));
  };

  // Find active item label for breadcrumb
  const currentItem = SETTINGS_GROUPS.flatMap((g) => g.items).find(
    (item) =>
      location.pathname === item.path ||
      (item.id === 'general-settings' && (location.pathname === '/settings' || location.pathname === '/settings/'))
  );
  const activeLabel = currentItem?.label || 'General Settings';

  return (
    <div className="min-h-screen bg-[#fafbfc] px-4 py-6 sm:px-6 lg:px-8">
      {/* ─── Breadcrumb Navigation ────────────────────────────────────── */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-gray-900 transition-colors font-medium">
          DigiHRMS
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3 text-gray-400" />
        <Link to="/settings" className="hover:text-gray-900 transition-colors font-medium">
          Settings
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3 text-gray-400" />
        <span className="font-semibold text-gray-900">{activeLabel}</span>
      </nav>

      {/* ─── Page Title ──────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage and configure your organization settings and preferences</p>
        </div>
      </div>

      {/* ─── Two-Column Layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings Navbar Panel */}
        <aside className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-xs sticky top-4 select-none">
          {/* Header Label */}
          <div className="px-3 pt-1 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Settings Menu
          </div>

          <div className="space-y-1">
            {SETTINGS_GROUPS.map((group) => {
              const groupExpanded = expandedGroup === group.id;
              const groupActive = isGroupActive(group);

              return (
                <div key={group.id} className="group-wrapper">
                  {/* Category Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] transition-all duration-150 ${
                      groupExpanded || groupActive
                        ? 'bg-gray-100 text-gray-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        icon={group.icon}
                        className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                          groupExpanded || groupActive ? 'text-gray-900' : 'text-gray-500'
                        }`}
                        strokeWidth={1.5}
                      />
                      <span className="truncate">{group.label}</span>
                    </div>

                    <Icon
                      icon="solar:alt-arrow-down-linear"
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                        groupExpanded ? 'rotate-180' : ''
                      }`}
                      strokeWidth={2}
                    />
                  </button>

                  {/* Sub-items with Tree Connector Lines (No icons for sub labels) */}
                  {groupExpanded && (
                    <div className="relative ml-2.5 pl-6 py-1 space-y-0.5">
                      {/* Vertical connector line */}
                      <div
                        className="absolute left-[13px] top-0 bottom-[14px] w-px bg-gray-200 pointer-events-none"
                        aria-hidden="true"
                      />

                      <ul className="space-y-0.5" role="menu">
                        {group.items.map((item) => {
                          const isActive =
                            location.pathname === item.path ||
                            (item.id === 'general-settings' &&
                              (location.pathname === '/settings' || location.pathname === '/settings/'));

                          return (
                            <li key={item.id} className="relative flex items-center" role="none">
                              {/* Horizontal branch connector tick */}
                              <span
                                className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 pointer-events-none"
                                aria-hidden="true"
                              />

                              <NavLink
                                to={item.path}
                                role="menuitem"
                                className={`group/item relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] transition-all duration-150 ${
                                  isActive
                                    ? 'bg-gray-100 text-gray-900 font-semibold'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
                                }`}
                              >
                                <span className="truncate text-left">{item.label}</span>

                                {/* Active item right chevron (›) */}
                                {isActive && (
                                  <Icon
                                    icon="solar:alt-arrow-right-linear"
                                    className="h-3.5 w-3.5 text-gray-400 ml-auto flex-shrink-0"
                                    strokeWidth={2}
                                  />
                                )}
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Main Content Panel */}
        <main className="lg:col-span-9 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs min-h-[600px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
