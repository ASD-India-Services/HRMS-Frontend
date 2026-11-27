/** Shared page title row with an optional subtitle, breadcrumb, and right-aligned page actions. */
import { useLayoutEffect, type ReactNode } from 'react';
import { cx } from '../cx';
import { usePageTitleContext } from '@/components/Layout/PageTitleContext';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, breadcrumb, className }: PageHeaderProps) {
  const pageTitleContext = usePageTitleContext();

  useLayoutEffect(() => {
    if (!pageTitleContext) return;
    pageTitleContext.setTitle(title);
    return () => pageTitleContext.setTitle('');
  }, [pageTitleContext?.setTitle, title]);

  if (!subtitle && !actions && !breadcrumb && pageTitleContext) return null;

  return (
    <div className={cx('relative mb-6 flex min-h-14 flex-wrap items-center justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {/* Breadcrumb floats above the title so the title sits at the same y on every page. */}
        {breadcrumb && <div className="absolute -top-6 left-0 text-sm text-ink-secondary">{breadcrumb}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}
