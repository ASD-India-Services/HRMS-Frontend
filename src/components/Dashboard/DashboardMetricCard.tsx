import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Iconify, type IconName } from '@/components/Iconify';
import { cx } from '@/components/ui/cx';

export interface DashboardMetricCardProps {
  title: string;
  value: number | string | null;
  icon?: IconName;
  caption?: ReactNode;
  href?: string;
  isLoading?: boolean;
  className?: string;
}

export function DashboardMetricCard({
  title,
  value,
  icon,
  caption,
  href,
  isLoading = false,
  className,
}: DashboardMetricCardProps) {
  const content = (
    <>
      <div className="flex min-h-[8.5rem] items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-secondary">{title}</p>
          {isLoading ? (
            <div className="mt-4 h-9 w-24 animate-pulse rounded bg-surface-neutral" />
          ) : (
            <p className="mt-3 truncate text-3xl font-bold tracking-tight text-ink-primary">{value ?? '—'}</p>
          )}
        </div>
        {icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-divider/40 bg-primary-lighter text-primary-main">
            <Iconify icon={icon} width={23} />
          </span>
        )}
      </div>
      {(caption || href) && (
        <div className="flex min-h-12 items-center gap-2 border-t border-divider/30 bg-secondary-lighter px-5 py-3 text-sm text-ink-secondary">
          <Iconify icon={href ? 'arrow-right' : 'chart'} width={16} className="shrink-0 text-primary-main" />
          <span className="min-w-0 truncate">{caption ?? 'View details'}</span>
        </div>
      )}
    </>
  );
  const classes = cx(
    'block h-full overflow-hidden rounded-xl border border-divider/35 bg-surface-paper shadow-z1 transition-shadow hover:shadow-z4',
    href && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-2',
    isLoading && 'pointer-events-none',
    className,
  );

  return href ? (
    <Link to={href} className={classes} aria-label={`${title}: ${value ?? 'N/A'}`}>
      {content}
    </Link>
  ) : (
    <div className={classes} aria-busy={isLoading}>
      {content}
    </div>
  );
}
