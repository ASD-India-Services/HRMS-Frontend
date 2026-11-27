/** Shared page title row with an optional subtitle, breadcrumb, and right-aligned page actions. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  const pageHeaderRef = useRef<HTMLDivElement>(null);
  const [tableActionTarget, setTableActionTarget] = useState<HTMLElement | null>(null);
  const hasActions = Boolean(actions);

  useLayoutEffect(() => {
    if (!pageTitleContext) return;
    pageTitleContext.setTitle(title);
    return () => pageTitleContext.setTitle('');
  }, [pageTitleContext?.setTitle, title]);

  useEffect(() => {
    if (!hasActions) {
      setTableActionTarget(null);
      return;
    }

    const page = pageHeaderRef.current?.closest<HTMLElement>('[data-page-container]');
    if (!page) return;

    const findActionTarget = () => {
      const target = page.querySelector<HTMLElement>('[data-table-action-slot]');
      setTableActionTarget((current) => current === target ? current : target);
    };

    findActionTarget();
    const observer = new MutationObserver(findActionTarget);
    observer.observe(page, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [hasActions]);

  if (!subtitle && !actions && !breadcrumb && pageTitleContext) return null;

  const actionsPortal = actions && tableActionTarget ? createPortal(actions, tableActionTarget) : null;
  if (tableActionTarget && !breadcrumb) return actionsPortal;

  return (
    <>
      {actionsPortal}
      <div ref={pageHeaderRef} className={cx('relative mb-6 flex min-h-14 flex-wrap items-center justify-between gap-4', className)}>
        <div className="min-w-0 flex-1">
          {/* Breadcrumb floats above the title so the title sits at the same y on every page. */}
          {breadcrumb && <div className="absolute -top-6 left-0 text-sm text-ink-secondary">{breadcrumb}</div>}
        </div>
        {actions && !tableActionTarget && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
    </>
  );
}
