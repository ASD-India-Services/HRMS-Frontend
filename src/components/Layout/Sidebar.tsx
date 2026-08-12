/**
 * Sidebar Navigation
 *
 * Modern collapsible sidebar with SVG icons, expandable nav groups,
 * and active state highlighting. Responsive behavior:
 * - Desktop (lg+): always visible, collapsible to icon-only mode
 * - Tablet (md): icon-only mode by default
 * - Mobile (<md): hamburger menu with overlay
 *
 * Collapsed state UX:
 * - Icons centered with hover tooltip showing label
 * - Left accent bar on active item
 * - Thin divider lines between groups
 * - Larger click targets for icons
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { getFilteredNavigation, type NavGroup } from '@/config/navigation';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

/** Chevron icon for group expand/collapse toggle */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/** Renders SVG icon from path data */
function NavIcon({ path, isActive }: { path: string; isActive: boolean }) {
  return (
    <svg
      className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { hasFeature } = usePermissions();
  const { hasPermission, roleName } = useHrmsPermissionsContext();
  const location = useLocation();

  // org_admin sees everything; other roles are checked against their actual permissions
  const effectiveHasPermission = roleName === 'org_admin'
    ? () => true
    : hasPermission;

  // Filter navigation based on HRMS permissions and feature flags
  const visibleGroups = getFilteredNavigation(effectiveHasPermission, hasFeature);

  // Track collapsed/expanded state per group
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  /** Check if any item in a group is active */
  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => location.pathname === item.href || location.pathname.startsWith(item.href + '/'));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200/80
          transform transition-all duration-200 ease-in-out
          ${isCollapsed ? 'w-[60px]' : 'w-60'}
          lg:translate-x-0 lg:static lg:z-auto
          md:translate-x-0 md:static md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label="Sidebar navigation"
      >
        {/* Logo area */}
        <div className={`flex h-14 items-center border-b border-gray-100 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
              <span className="text-xs font-bold text-white">D</span>
            </div>
            {!isCollapsed && (
              <span className="text-sm font-bold text-gray-800 tracking-tight">DigiHRMS</span>
            )}
          </div>
          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Collapse sidebar"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-2 border-b border-gray-100">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Expand sidebar"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Main navigation">
          <div className={isCollapsed ? 'space-y-1' : 'space-y-4'}>
            {visibleGroups.map((group, groupIdx) => {
              const groupCollapsed = collapsedGroups[group.label] ?? false;
              const _groupActive = isGroupActive(group);

              return (
                <div key={group.label}>
                  {/* Group divider in collapsed mode */}
                  {isCollapsed && groupIdx > 0 && (
                    <div className="mx-2 my-2 border-t border-gray-100" />
                  )}

                  {/* Group header — only show in expanded mode */}
                  {!isCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className="flex w-full items-center justify-between px-2 py-1 mb-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      <span>{group.label}</span>
                      <ChevronIcon expanded={!groupCollapsed} />
                    </button>
                  )}

                  {/* Group items */}
                  {(!groupCollapsed || isCollapsed) && (
                    <ul className={isCollapsed ? 'space-y-0.5' : 'space-y-px'}>
                      {group.items.map((item) => (
                        <li key={item.href} className="relative">
                          <NavLink
                            to={item.href}
                            end={item.href === '/payroll' || item.href === '/recruitment' || item.href === '/leaves' || item.href === '/expenses'}
                            onClick={onClose}
                            className={({ isActive }) =>
                              isCollapsed
                                ? `group relative flex items-center justify-center rounded-md h-9 w-9 mx-auto transition-all duration-150 ${
                                    isActive
                                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                  }`
                                : `group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150 ${
                                    isActive
                                      ? 'bg-primary-50 text-primary-700 border-l-2 border-primary-500 pl-[8px]'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <NavIcon path={item.icon} isActive={isActive} />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                                {/* Tooltip for collapsed mode */}
                                {isCollapsed && (
                                  <span className="absolute left-full ml-2 z-50 hidden group-hover:flex items-center px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none">
                                    {item.label}
                                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                                  </span>
                                )}
                              </>
                            )}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom section — profile */}
        <div className={`border-t border-gray-100 ${isCollapsed ? 'p-2' : 'p-2.5'}`}>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isCollapsed
                ? `group relative flex items-center justify-center rounded-md h-9 w-9 mx-auto transition-all duration-150 ${
                    isActive ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`
                : `group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150 ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
            }
          >
            {({ isActive }) => (
              <>
                <svg
                  className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                {!isCollapsed && <span className="truncate">My Profile</span>}
                {isCollapsed && (
                  <span className="absolute left-full ml-2 z-50 hidden group-hover:flex items-center px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none">
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
