/**
 * PageContainer — single page wrapper. AppShell <main> already provides the page padding.
 * List and dashboard pages use the available content width; form/detail pages can opt into `lg`.
 */
import type { HTMLAttributes } from 'react';
import { cx } from '../cx';
import { ColumnFilterProvider } from '@/components/DataTable/ColumnFilterContext';

const MAX_WIDTH = { lg: 'max-w-7xl', xl: 'max-w-none' } as const;

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** 'lg' for narrow forms, 'xl' (default) for lists and dashboards. */
  maxWidth?: keyof typeof MAX_WIDTH;
}

export function PageContainer({ maxWidth = 'xl', className, ...rest }: PageContainerProps) {
  return (
    <ColumnFilterProvider>
      <div data-page-container="true" className={cx('w-full', MAX_WIDTH[maxWidth], className)} {...rest} />
    </ColumnFilterProvider>
  );
}
