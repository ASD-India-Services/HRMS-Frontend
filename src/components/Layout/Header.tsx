/**
 * Header Component
 *
 * Minimal-style sticky blurred top bar with notification bell, user profile dropdown, ProductSwitcher,
 * and mobile menu toggle.
 *
 * Requirements: 16.5
 */

import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@platform/auth-sdk';
import { useQuery } from '@tanstack/react-query';
import { ProductSwitcher } from '@/components/ProductSwitcher';
import { useNotifications } from '@/hooks/useNotifications';
import { Iconify, type IconName } from '@/components/Iconify';
import { Button, IconButton } from '@/components/ui/Button';
import { TimeRunnerWidget } from './TimeRunnerWidget';
import api from '@/lib/api';
import { usePageTitleContext } from './PageTitleContext';

/** Registry icon per notification type. */
const NOTIFICATION_ICONS: Record<string, IconName> = {
  leave_approval: 'leaves',
  expense_approval: 'expenses',
  travel_approval: 'travel',
  overtime_approval: 'overtime',
  onboarding_task: 'training',
};

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { logout } = useAuth();
  const { name, email, role } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageTitleContext = usePageTitleContext();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Fetch current employee's designation
  const { data: currentEmployee } = useQuery<{ designation?: { title?: string } | null }>({
    queryKey: ['employee', 'me'],
    queryFn: () => api.get('/api/v1/employees/me/').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const displayRole = currentEmployee?.designation?.title ?? role ?? 'Employee';
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications();

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = name
    ? name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : '??';

  const pendingCount = notifications.length;
  const routeTitle = pathname === '/'
    ? 'Dashboard'
    : pathname.split('/').filter(Boolean).at(-1)?.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? 'DigiHRMS';
  const pageTitle = pageTitleContext?.title || routeTitle;

  return (
    <header className="sticky top-0 z-30 flex h-header w-full max-w-full min-w-0 shrink-0 items-center gap-4 border-b border-divider bg-white px-4 sm:px-6 lg:px-10">
      {/* Mobile menu toggle */}
      <IconButton
        icon="menu"
        onClick={onMenuToggle}
        className="-ml-2 md:hidden"
        aria-label="Toggle sidebar"
      />

      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink-primary sm:text-xl" title={typeof pageTitle === 'string' ? pageTitle : undefined}>
        {pageTitle}
      </h1>

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Time Runner (At-Work Tracker) Widget */}
        <TimeRunnerWidget />

        {/* Notification bell */}
        <div className="relative" ref={notificationRef}>
          <IconButton
            icon="bell"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative"
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
            aria-haspopup="true"
          >
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error-main text-[10px] font-bold text-error-contrast">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </IconButton>

          {/* Notification dropdown */}
          {isNotificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl bg-surface-paper shadow-dropdown z-50"
              role="menu"
              aria-label="Notifications"
            >
              <div className="px-4 py-3 border-b border-dashed border-divider">
                <p className="text-sm font-semibold text-ink-primary">Pending Approvals</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationsLoading && (
                  <div className="px-4 py-6 text-center text-sm text-ink-secondary">Loading...</div>
                )}
                {!notificationsLoading && notifications.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-ink-secondary">
                    No pending approvals
                  </div>
                )}
                {!notificationsLoading &&
                  notifications.map((item) => (
                    <Button
                      key={item.id}
                      variant="text"
                      color="inherit"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate(item.link);
                      }}
                      className="!h-auto w-full !items-start !justify-start gap-3 !rounded-none px-4 py-3 text-left !font-normal"
                      role="menuitem"
                    >
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-lighter text-primary-main">
                        {NOTIFICATION_ICONS[item.type] && <Iconify icon={NOTIFICATION_ICONS[item.type]} width={16} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-primary truncate">{item.title}</p>
                        <p className="text-xs text-ink-secondary truncate">{item.description}</p>
                      </div>
                    </Button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings button */}
        <IconButton
          icon="settings"
          onClick={() => navigate('/settings/general-settings')}
          title="Settings"
          aria-label="Settings"
        />

        {/* Product Switcher */}
        <ProductSwitcher />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <Button
            variant="text"
            color="inherit"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="!h-auto gap-2 !rounded-full !p-1.5 !font-normal"
            aria-label="User menu"
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-lighter text-primary-darker text-sm font-semibold">
              {initials}
            </div>
            <div className="hidden sm:block text-left shrink-0">
              <p className="text-sm font-medium text-ink-primary leading-tight whitespace-nowrap">{name ?? 'User'}</p>
              <p className="text-xs text-ink-secondary leading-tight capitalize whitespace-nowrap">{displayRole}</p>
            </div>
            <Iconify icon="chevron-down" width={16} className="hidden sm:block text-ink-disabled shrink-0" />
          </Button>

          {/* Dropdown menu */}
          {isProfileOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-paper shadow-dropdown py-1 z-50"
              role="menu"
              aria-label="User menu"
            >
              <div className="px-4 py-3 border-b border-dashed border-divider">
                <p className="text-sm font-medium text-ink-primary">{name}</p>
                <p className="text-xs text-ink-secondary truncate">{email}</p>
              </div>
              <a
                href="/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-ink-primary hover:bg-grey-500/10"
                role="menuitem"
              >
                <Iconify icon="user" width={18} />
                My Profile
              </a>
              <Button
                variant="text"
                color="error"
                startIcon={<Iconify icon="logout" width={18} />}
                onClick={() => {
                  setIsProfileOpen(false);
                  void logout();
                }}
                className="w-full !justify-start !rounded-none px-4 !font-normal"
                role="menuitem"
              >
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
