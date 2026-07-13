/**
 * MetricCard
 *
 * A clickable summary card for the admin dashboard overview.
 * Displays a metric title, value, icon, and optional trend indicator.
 * Links to a detail page via react-router-dom's Link component.
 *
 * Requirements: 1.1, 1.3, 1.4
 */

import { Link } from 'react-router-dom';
import type { MetricCardProps } from '../../types/dashboard';
import { MetricCardSkeleton } from './MetricCardSkeleton';

function TrendIndicator({ direction, percentage }: { direction: 'up' | 'down' | 'flat'; percentage: number }) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-sm font-medium text-green-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
        {percentage}%
      </span>
    );
  }

  if (direction === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-sm font-medium text-red-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {percentage}%
      </span>
    );
  }

  // flat
  return (
    <span className="inline-flex items-center gap-0.5 text-sm font-medium text-gray-500">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {percentage}%
    </span>
  );
}

export function MetricCard({ title, value, icon, href, isLoading, trend }: MetricCardProps) {
  if (isLoading) {
    return <MetricCardSkeleton />;
  }

  return (
    <Link
      to={href}
      className="block rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label={`${title}: ${value ?? 'N/A'}`}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-xl" aria-hidden="true">
          {icon}
        </span>

        {/* Trend indicator */}
        {trend && <TrendIndicator direction={trend.direction} percentage={trend.percentage} />}
      </div>

      {/* Value */}
      <p className="mt-4 text-2xl font-bold text-gray-900">
        {value ?? '—'}
      </p>

      {/* Title */}
      <p className="mt-1 text-sm text-gray-500">
        {title}
      </p>
    </Link>
  );
}
