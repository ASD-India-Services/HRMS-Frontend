/**
 * AppShell Layout
 *
 * Main application shell with responsive sidebar and header.
 * Wraps all authenticated routes via <Outlet />.
 * Supports sidebar collapse (icon-only mode) on tablet/desktop.
 *
 * Requirements: 16.1, 16.4
 */

import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ShiftEndConfirmationDialog } from './ShiftEndConfirmationDialog';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useHRSettings } from '@/hooks/useHRSettings';

/** Loading fallback shown during route transitions */
function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
    </div>
  );
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load organization HR settings (date format, time format, currency, pagination) on startup
  useHRSettings();

  return (
    <div className="flex h-screen w-full max-w-full overflow-hidden bg-surface-default">
      {/* Offline banner */}
      <OfflineIndicator />

      {/* Global Shift-End Confirmation & Auto-Logout Dialog */}
      <ShiftEndConfirmationDialog />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        {/* 
          Page content — Suspense boundary OUTSIDE the route elements.
          This ensures lazy-loaded route components properly trigger the 
          fallback during navigation transitions (React Router v7 + React 19).
        */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10 min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
