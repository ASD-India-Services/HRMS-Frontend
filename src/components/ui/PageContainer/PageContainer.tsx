/**
 * PageContainer — single page wrapper. AppShell <main> already provides the page padding,
 * so this only centres and limits the width.
 */
import type { HTMLAttributes } from 'react';
import { cx } from '../cx';

const MAX_WIDTH = { lg: 'max-w-5xl', xl: 'max-w-7xl' } as const;

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** 'lg' for narrow forms, 'xl' (default) for lists and dashboards. */
  maxWidth?: keyof typeof MAX_WIDTH;
}

export function PageContainer({ maxWidth = 'xl', className, ...rest }: PageContainerProps) {
  return <div className={cx('mx-auto w-full', MAX_WIDTH[maxWidth], className)} {...rest} />;
}
