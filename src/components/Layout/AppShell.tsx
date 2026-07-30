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
import { OfflineIndicator } from '@/components/OfflineIndicator';

/** Loading fallback shown during route transitions */
function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
    </div>
  );
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Offline banner */}
      <OfflineIndicator />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        {/* 
          Page content — Suspense boundary OUTSIDE the route elements.
          This ensures lazy-loaded route components properly trigger the 
          fallback during navigation transitions (React Router v7 + React 19).
        */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
