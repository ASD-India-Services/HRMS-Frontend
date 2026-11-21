/**
 * Card — Minimal-style surface: paper background, large radius, soft shadow, no border.
 * Compose with CardHeader and CardContent.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-card bg-surface-paper shadow-card', className)} {...rest} />;
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot (buttons, selects, menus). */
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action, className, ...rest }: CardHeaderProps) {
  return (
    <div className={cx('flex items-start justify-between gap-4 p-6 pb-0', className)} {...rest}>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-ink-primary">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink-secondary">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('p-6', className)} {...rest} />;
}
