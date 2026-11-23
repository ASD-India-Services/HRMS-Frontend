/**
 * StateView — the one empty / error look: round icon badge, title, description and optional action.
 * EmptyState, ErrorState, DataTableEmpty/Error and ChartCard states are all built on it.
 */
import type { ReactNode } from 'react';
import { Iconify, type IconName } from '@/components/Iconify';
import { cx } from '../cx';

export interface StateViewProps {
  icon: IconName;
  title: ReactNode;
  description?: ReactNode;
  /** 'error' tints the icon badge with the error colour. */
  tone?: 'neutral' | 'error';
  action?: ReactNode;
  role?: 'status' | 'alert';
  'aria-label'?: string;
  className?: string;
}

export function StateView({ icon, title, description, tone = 'neutral', action, role, className, ...rest }: StateViewProps) {
  return (
    <div className={cx('flex flex-col items-center justify-center py-12 text-center', className)} role={role} aria-label={rest['aria-label']}>
      <div
        className={cx(
          'mb-4 flex h-16 w-16 items-center justify-center rounded-full',
          tone === 'error' ? 'bg-error-main/10 text-error-main' : 'bg-grey-500/10 text-ink-disabled',
        )}
      >
        <Iconify icon={icon} width={32} />
      </div>
      <h3 className="text-base font-semibold text-ink-primary">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-secondary">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
