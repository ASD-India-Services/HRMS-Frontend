/** PageHeader — page title, optional subtitle and breadcrumb, with a right-aligned actions row. */
import type { ReactNode } from 'react';
import { cx } from '../cx';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cx('mb-8 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2 text-sm text-ink-secondary">{breadcrumb}</div>}
        <h1 className="text-2xl font-bold text-ink-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}
