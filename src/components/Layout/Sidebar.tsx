/**
 * Sidebar Navigation
 *
 * Redesigned DigiHRMS Sidebar following the modern linear/outline UI/UX reference design.
 * Features:
 * - Pure white background (#ffffff) with soft light-gray active menu highlights (bg-gray-100)
 * - Clean linear/outline icons from Iconify (@iconify/react Solar Linear collection)
 * - Tree connector lines (continuous vertical guide line + horizontal branch connector ticks)
 * - Expandable/collapsible accordion sections with smooth rotation
 * - Active child items highlighted with rounded-xl pill and right chevron (›)
 * - Preserves all existing DigiHRMS menu items, hierarchy, routes, permissions, and functionality
 * - Responsive desktop (open/collapsed) and mobile drawer modes with sleek scrollbar
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { usePermissions, useUser } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { getFilteredNavigation, type NavGroup, type NavItem } from '@/config/navigation';
import { NavIcon } from './NavIcon';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { hasFeature } = usePermissions();
  const { role: authRole } = useUser();
  const { hasPermission, roleName } = useHrmsPermissionsContext();
  const location = useLocation();

  // org_admin / admin / administrator sees everything; other roles are checked against their actual permissions
  const normalizedRole = (roleName || authRole || '').toLowerCase().trim();
  const isAdmin =
    normalizedRole === 'org_admin' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'administrator' ||
    normalizedRole === 'org admin' ||
    normalizedRole === 'superadmin';

  const effectiveHasPermission = isAdmin ? () => true : hasPermission;

  // Filter navigation based on HRMS permissions and feature flags
  const visibleGroups: NavGroup[] = useMemo(
    () => getFilteredNavigation(effectiveHasPermission, hasFeature),
    [effectiveHasPermission, hasFeature]
  );

  /** Check if any item in a group is active */
  const isGroupActive = useCallback(
    (group: NavGroup) =>
      group.items.some((item: NavItem) => location.pathname === item.href || location.pathname.startsWith(item.href + '/')),
    [location.pathname]
  );

  // Track which groups are expanded (Record of group.label -> boolean)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    visibleGroups.forEach((g: NavGroup) => {
      if (isGroupActive(g)) {
        initial[g.label] = true;
      }
    });
    // Default open active group or first group
    if (Object.keys(initial).length === 0 && visibleGroups[0]) {
      initial[visibleGroups[0].label] = true;
    }
    return initial;
  });

  // Keep active route's group expanded when navigating
  useEffect(() => {
    const active = visibleGroups.find((g: NavGroup) =>
      g.items.some((item: NavItem) => location.pathname === item.href || location.pathname.startsWith(item.href + '/'))
    );
    if (active) {
      setExpandedGroups((prev) => {
        if (prev[active.label]) return prev;
        return { ...prev, [active.label]: true };
      });
    }
  }, [location.pathname, visibleGroups]);

  const toggleGroup = (label: string) => {
    if (isCollapsed) {
      onToggleCollapse();
    }
    setExpandedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 bg-white border-r border-gray-100 shadow-[1px_0_4px_rgba(0,0,0,0.02)]
          transform transition-all duration-200 ease-in-out select-none
          ${isCollapsed ? 'w-[68px]' : 'w-64'}
          lg:translate-x-0 lg:static lg:z-auto
          md:translate-x-0 md:static md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label="Sidebar navigation"
      >
        {/* Brand Header */}
        <div className={`flex h-16 items-center border-b border-gray-100 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Logo Badge: Vibrant blue rounded square with 'D' */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm text-white font-bold text-sm">
              <span>D</span>
            </div>
            {!isCollapsed && (
              <span className="text-[15px] font-bold text-gray-900 tracking-tight">DigiHRMS</span>
            )}
          </div>

          {/* Collapse sidebar button */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <Icon icon="solar:arrow-left-linear" className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-2.5 border-b border-gray-100">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <Icon icon="solar:arrow-right-linear" className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300"
          aria-label="Main navigation"
        >
          {/* Main Menu Label */}
          {!isCollapsed && (
            <div className="px-3 pt-1 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Main Menu
            </div>
          )}

          <div className="space-y-1">
            {visibleGroups.map((group: NavGroup) => {
              const groupExpanded = !!expandedGroups[group.label];
              const groupActive = isGroupActive(group);

              // ─── Collapsed Mode (Icon only with hover tooltip) ─────────────
              if (isCollapsed) {
                return (
                  <div key={group.label} className="relative group/collapsed flex justify-center py-0.5">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ${
                        groupActive
                          ? 'bg-gray-100 text-gray-900 font-semibold'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      aria-label={group.label}
                    >
                      <NavIcon
                        icon={group.icon || group.items[0]?.iconName || group.items[0]?.icon}
                        className="w-5 h-5"
                        isActive={groupActive}
                      />
                    </button>

                    {/* Tooltip on hover */}
                    <div className="absolute left-full ml-3 z-50 hidden group-hover/collapsed:flex items-center px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium shadow-xl whitespace-nowrap pointer-events-none">
                      {group.label}
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                    </div>
                  </div>
                );
              }

              // ─── Expanded Mode (Full Designer Reference Layout) ────────────
              return (
                <div key={group.label} className="group-wrapper">
                  {/* Parent Group Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className={`flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] transition-all duration-150 ${
                      groupExpanded || groupActive
                        ? 'bg-gray-100 text-gray-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <NavIcon
                        icon={group.icon || group.items[0]?.iconName || group.items[0]?.icon}
                        className="w-[18px] h-[18px]"
                        isActive={groupExpanded || groupActive}
                      />
                      <span className="truncate">{group.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {group.badge != null && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-purple-600 text-white">
                          {group.badge}
                        </span>
                      )}
                      <Icon
                        icon="solar:alt-arrow-down-linear"
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                          groupExpanded ? 'rotate-180' : ''
                        }`}
                        strokeWidth={2}
                      />
                    </div>
                  </button>

                  {/* Expanded Submenu with Tree Connector Lines */}
                  {groupExpanded && (
                    <div className="relative ml-2.5 pl-6 py-1 space-y-0.5">
                      {/* 
                        Continuous vertical guide line:
                        Starts below parent icon and terminates precisely at the horizontal tick of the last child item (bottom-[14px])
                      */}
                      <div
                        className="absolute left-[13px] top-0 bottom-[14px] w-px bg-gray-200 pointer-events-none"
                        aria-hidden="true"
                      />

                      <ul className="space-y-0.5" role="menu">
                        {group.items.map((item: NavItem) => (
                          <li key={item.href} className="relative flex items-center" role="none">
                            {/* Horizontal branch connector tick extending from the vertical line */}
                            <span
                              className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 pointer-events-none"
                              aria-hidden="true"
                            />

                            <NavLink
                              to={item.href}
                              end={
                                item.href === '/payroll' ||
                                item.href === '/recruitment' ||
                                item.href === '/leaves' ||
                                item.href === '/expenses' ||
                                item.href === '/dashboard'
                              }
                              onClick={onClose}
                              role="menuitem"
                              className={({ isActive }) =>
                                `group/item relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] transition-all duration-150 ${
                                  isActive
                                    ? 'bg-gray-100 text-gray-900 font-semibold'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
                                }`
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  <span className="truncate text-left">{item.label}</span>

                                  {/* Badge count if present */}
                                  {item.badge != null && (
                                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-purple-600 text-white ml-auto">
                                      {item.badge}
                                    </span>
                                  )}

                                  {/* Active item right chevron (›) matching Screenshot 2 'Study Team' reference */}
                                  {isActive && (
                                    <Icon
                                      icon="solar:alt-arrow-right-linear"
                                      className="h-3.5 w-3.5 text-gray-400 ml-auto flex-shrink-0"
                                      strokeWidth={2}
                                    />
                                  )}
                                </>
                              )}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom Profile Section */}
        <div className={`border-t border-gray-100 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) =>
              isCollapsed
                ? `group relative flex items-center justify-center rounded-xl h-10 w-10 mx-auto transition-all duration-150 ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`
                : `group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] transition-all duration-150 ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                  }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    icon="solar:user-circle-linear"
                    className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                      isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-800'
                    }`}
                    strokeWidth={1.5}
                  />
                  {!isCollapsed && <span className="truncate">My Profile</span>}
                </div>

                {!isCollapsed && (
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="h-3.5 w-3.5 text-gray-400 flex-shrink-0"
                    strokeWidth={2}
                  />
                )}

                {/* Tooltip for collapsed mode */}
                {isCollapsed && (
                  <span className="absolute left-full ml-3 z-50 hidden group-hover:flex items-center px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium shadow-xl whitespace-nowrap pointer-events-none">
                    My Profile
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </span>
                )}
              </>
            )}
          </NavLink>
        </div>
      </aside>
    </>
  );
}
