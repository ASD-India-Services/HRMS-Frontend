/**
 * Header Component
 *
 * Minimal-style sticky blurred top bar with notification bell, user profile dropdown, ProductSwitcher,
 * and mobile menu toggle.
 *
 * Requirements: 16.5
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@platform/auth-sdk';
import { useQuery } from '@tanstack/react-query';
import { ProductSwitcher } from '@/components/ProductSwitcher';
import { useNotifications } from '@/hooks/useNotifications';
import { Iconify } from '@/components/Iconify';
import { useThemeMode } from '@/hooks/useThemeMode';
import api from '@/lib/api';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { logout } = useAuth();
  const { name, email, role } = useUser();
  const navigate = useNavigate();
  const { mode, toggleMode } = useThemeMode();
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

  return (
    <header className="sticky top-0 z-30 flex h-header w-full max-w-full min-w-0 shrink-0 items-center gap-4 bg-surface-default/80 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="md:hidden -ml-2 rounded-full p-2 text-ink-secondary hover:bg-grey-500/10"
        aria-label="Toggle sidebar"
      >
        <Iconify icon="menu" width={24} />
      </button>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right side actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative rounded-full p-2 text-ink-secondary hover:bg-grey-500/10 transition-colors"
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
            aria-haspopup="true"
          >
            <Iconify icon="bell" width={24} />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error-main text-[10px] font-bold text-error-contrast">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

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
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate(item.link);
                      }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-grey-500/10 transition-colors"
                      role="menuitem"
                    >
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-lighter text-xs">
                        {item.type === 'leave_approval' && '🏖️'}
                        {item.type === 'expense_approval' && '🧾'}
                        {item.type === 'travel_approval' && '✈️'}
                        {item.type === 'overtime_approval' && '⏱️'}
                        {item.type === 'onboarding_task' && '🎓'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-primary truncate">{item.title}</p>
                        <p className="text-xs text-ink-secondary truncate">{item.description}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Colour mode toggle */}
        <button
          type="button"
          onClick={toggleMode}
          className="rounded-full p-2 text-ink-secondary hover:bg-grey-500/10 transition-colors"
          title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Iconify icon={mode === 'dark' ? 'sun' : 'moon'} width={24} />
        </button>
        {/* Settings button */}
        <button
          type="button"
          onClick={() => navigate('/settings/general-settings')}
          className="rounded-full p-2 text-ink-secondary hover:bg-grey-500/10 transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <Iconify icon="settings" width={24} />
        </button>

        {/* Product Switcher */}
        <ProductSwitcher />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full p-1.5 hover:bg-grey-500/10 transition-colors"
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
          </button>

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
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error-main hover:bg-error-main/10"
                role="menuitem"
              >
                <Iconify icon="logout" width={18} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
