/**
 * Sidebar Navigation
 *
 * Minimal-style collapsible sidebar with Iconify icons, expandable nav groups,
 * and active state highlighting. Responsive behavior:
 * - Desktop (lg+): always visible, collapsible to icon-only mode
 * - Tablet (md): icon-only mode by default
 * - Mobile (<md): hamburger menu with overlay
 *
 * Collapsed state UX:
 * - Icons centered with hover tooltip showing label
 * - Thin divider lines between groups
 * - Larger click targets for icons
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions, useUser } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { getFilteredNavigation, type NavGroup } from '@/config/navigation';
import { Iconify } from '@/components/Iconify';
import { Button, IconButton } from '@/components/ui/Button';
import { NavIcon } from './NavIcon';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

/** Chevron icon for group expand/collapse toggle */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <Iconify
      icon="chevron-right"
      width={14}
      className={`text-ink-disabled transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
    />
  );
}

/** Shared item styles (expanded and mini). */
const itemBase = 'group relative flex items-center transition-colors duration-150';
const itemActive = 'bg-primary-main/10 text-primary-main font-semibold hover:bg-primary-main/20';
const itemIdle = 'text-ink-secondary font-medium hover:bg-grey-500/10 hover:text-ink-primary';
const itemExpanded = `${itemBase} gap-4 rounded-lg px-3 min-h-11 text-sm`;
const itemMini = `${itemBase} mx-auto h-11 w-11 justify-center rounded-lg`;

/** Hover tooltip shown in mini mode. */
function MiniTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-3 hidden items-center whitespace-nowrap rounded-lg bg-grey-800 px-2.5 py-1.5 text-xs font-medium text-primary-contrast shadow-z8 group-hover:flex">
      {label}
    </span>
  );
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { hasFeature } = usePermissions();
  const { role } = useUser();
  const { hasPermission, roleName } = useHrmsPermissionsContext();
  const location = useLocation();

  // Admin roles bypass permission and feature checks (full access)
  const normalizedRole = (roleName || role || '').toLowerCase().trim();
  const isAdmin =
    normalizedRole === 'org_admin' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'administrator' ||
    normalizedRole === 'org admin' ||
    normalizedRole === 'superadmin';

  // org_admin and other admin roles see everything; other roles are checked against their actual permissions
  const effectiveHasPermission = isAdmin
    ? () => true
    : hasPermission;

  const effectiveHasFeature = isAdmin
    ? () => true
    : hasFeature;

  // Filter navigation based on HRMS permissions and feature flags
  const visibleGroups = getFilteredNavigation(effectiveHasPermission, effectiveHasFeature);

  // Track which groups are expanded (map of group label -> boolean)
  // By default all visible groups are expanded so all navigation features are immediately accessible
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    visibleGroups.forEach((g) => {
      initial[g.label] = true;
    });
    return initial;
  });

  // Ensure active route's group stays expanded upon route changes
  useEffect(() => {
    const active = visibleGroups.find((g) =>
      g.items.some((item) => location.pathname === item.href || location.pathname.startsWith(item.href + '/'))
    );
    if (active) {
      setExpandedGroups((prev) => ({
        ...prev,
        [active.label]: true,
      }));
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

  /** Check if any item in a group is active */
  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => location.pathname === item.href || location.pathname.startsWith(item.href + '/'));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-grey-800/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 bg-surface-paper border-r border-dashed border-divider
          transform transition-all duration-200 ease-in-out
          ${isCollapsed ? 'w-nav-mini' : 'w-nav'}
          lg:translate-x-0 lg:static lg:z-auto
          md:translate-x-0 md:static md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label="Sidebar navigation"
      >
        {/* Logo area */}
        <div className={`flex h-header shrink-0 items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-main shadow-primary">
              <span className="text-sm font-bold text-primary-contrast">D</span>
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight text-ink-primary">DigiHRMS</span>
            )}
          </div>
          {!isCollapsed && (
            <IconButton
              icon="collapse"
              size="small"
              onClick={onToggleCollapse}
              className="hidden md:inline-flex"
              aria-label="Collapse sidebar"
            />
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center pb-2">
            <IconButton
              icon="expand"
              size="small"
              onClick={onToggleCollapse}
              className="hidden md:inline-flex"
              aria-label="Expand sidebar"
            />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-1" aria-label="Main navigation">
          <div className={isCollapsed ? 'space-y-1' : 'space-y-3'}>
            {visibleGroups.map((group, groupIdx) => {
              const groupExpanded = Boolean(expandedGroups[group.label]);

              return (
                <div key={group.label}>
                  {/* Group divider in collapsed mode */}
                  {isCollapsed && groupIdx > 0 && (
                    <div className="mx-2 my-2 border-t border-dashed border-divider" />
                  )}

                  {/* Group caption — only show in expanded mode */}
                  {!isCollapsed && (
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={() => toggleGroup(group.label)}
                      className="!h-auto w-full !justify-between !rounded-none !px-3 pb-1 pt-2 !text-[11px] uppercase tracking-wider !text-ink-disabled hover:!text-ink-primary"
                    >
                      <span className="flex items-center gap-2">
                        {group.icon && <NavIcon name={group.icon} className="h-4 w-4 flex-shrink-0" />}
                        {group.label}
                      </span>
                      <ChevronIcon expanded={groupExpanded} />
                    </Button>
                  )}

                  {/* Group items */}
                  {(groupExpanded || isCollapsed) && (
                    <ul className="space-y-0.5">
                      {group.items.map((item) => (
                        <li key={item.href} className="relative">
                          <NavLink
                            to={item.href}
                            end={item.href === '/payroll' || item.href === '/recruitment' || item.href === '/leaves' || item.href === '/expenses'}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `${isCollapsed ? itemMini : itemExpanded} ${isActive ? itemActive : itemIdle}`
                            }
                          >
                            <NavIcon name={item.icon} className="h-6 w-6 flex-shrink-0" />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                            {isCollapsed && <MiniTooltip label={item.label} />}
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
        <div className="shrink-0 border-t border-dashed border-divider p-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${isCollapsed ? itemMini : itemExpanded} ${isActive ? itemActive : itemIdle}`
            }
          >
            <NavIcon name="profile" className="h-6 w-6 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">My Profile</span>}
            {isCollapsed && <MiniTooltip label="My Profile" />}
          </NavLink>
        </div>
      </aside>
    </>
  );
}
