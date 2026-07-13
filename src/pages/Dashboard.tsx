/**
 * Admin Dashboard Page
 *
 * Main landing page for org_admin and hr_manager roles.
 * Displays a welcome message, date range filter, key metric cards,
 * and analytics charts in a responsive layout.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { useState } from 'react';
import { useUser } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { MetricsSection } from './dashboard/MetricsSection';
import { ChartsGrid } from './dashboard/ChartsGrid';
import { DateRangeFilter, getDefaultDateRange } from './dashboard/DateRangeFilter';
import type { DateRange } from './dashboard/DateRangeFilter';

export default function Dashboard() {
  const { name } = useUser();
  const { roleName } = useHrmsPermissionsContext();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem('org-setup-banner-dismissed') === 'true',
  );

  const isOrgAdmin = roleName === 'org_admin';
  const showSetupBanner = isOrgAdmin && !bannerDismissed;

  const dismissBanner = () => {
    localStorage.setItem('org-setup-banner-dismissed', 'true');
    setBannerDismissed(true);
  };

  return (
    <div className="space-y-6">
      {/* Org Setup Banner — shown to first-time org admins */}
      {showSetupBanner && (
        <div className="relative rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800">Complete Your Organization Setup</h3>
              <p className="mt-1 text-sm text-blue-700">
                Set up your company details, SMTP configuration, and HR policies to get the most out of your HRMS.
              </p>
              <a
                href="/hr-settings"
                className="mt-2 inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                Go to HR Settings →
              </a>
            </div>
            <button
              onClick={dismissBanner}
              className="shrink-0 rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
              aria-label="Dismiss banner"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back{name ? `, ${name}` : ''}. Here's an overview of your HR operations.
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Metrics Cards */}
      <MetricsSection />

      {/* Analytics Charts */}
      <ChartsGrid dateRange={dateRange} />
    </div>
  );
}
