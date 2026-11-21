/**
 * StatCard — neutral summary card: title, large value, optional trend and a single tinted icon badge.
 * Renders as a react-router Link when `href` is given.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Iconify, type IconName } from '@/components/Iconify';
import { Card } from '../Card';
import { cx } from '../cx';

export interface StatTrend {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
}

export interface StatCardProps {
  title: string;
  value: number | string | null;
  icon?: IconName;
  trend?: StatTrend;
  /** Small supporting text under the value. */
  caption?: ReactNode;
  href?: string;
  isLoading?: boolean;
  className?: string;
}

const TREND_STYLE = {
  up: { icon: 'trend-up', className: 'text-success-dark' },
  down: { icon: 'trend-down', className: 'text-error-main' },
  flat: { icon: null, className: 'text-ink-secondary' },
} as const;

function Trend({ direction, percentage }: StatTrend) {
  const style = TREND_STYLE[direction];
  return (
    <span className={cx('inline-flex items-center gap-0.5 text-sm font-medium', style.className)}>
      {style.icon ? <Iconify icon={style.icon} width={16} /> : <span aria-hidden="true">–</span>}
      {percentage}%
    </span>
  );
}

function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cx('flex h-full items-start justify-between gap-4 p-6', className)} aria-busy="true" aria-label="Loading metric">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-surface-neutral" />
        <div className="h-8 w-20 animate-pulse rounded bg-surface-neutral" />
      </div>
      <div className="h-12 w-12 animate-pulse rounded-full bg-surface-neutral" />
    </Card>
  );
}

export function StatCard({ title, value, icon, trend, caption, href, isLoading, className }: StatCardProps) {
  if (isLoading) return <StatCardSkeleton className={className} />;

  const body = (
    <>
      <div className="min-w-0">
        <p className="text-sm text-ink-secondary">{title}</p>
        <p className="mt-2 text-3xl font-bold text-ink-primary">{value ?? '—'}</p>
        {trend && (
          <div className="mt-1">
            <Trend {...trend} />
          </div>
        )}
        {caption && <p className="mt-1 text-xs text-ink-secondary">{caption}</p>}
      </div>
      {icon && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-main/10 text-primary-main">
          <Iconify icon={icon} width={24} />
        </span>
      )}
    </>
  );
  const classes = cx('flex h-full items-start justify-between gap-4 p-6', className);

  if (href) {
    return (
      <Link
        to={href}
        aria-label={`${title}: ${value ?? 'N/A'}`}
        className={cx(
          'rounded-card bg-surface-paper shadow-card transition-shadow hover:shadow-z8 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-2',
          classes,
        )}
      >
        {body}
      </Link>
    );
  }
  return <Card className={classes}>{body}</Card>;
}
