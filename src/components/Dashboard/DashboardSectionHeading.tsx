import type { ReactNode } from 'react';
import { Iconify, type IconName } from '@/components/Iconify';

export function DashboardSectionHeading({
  title,
  description,
  icon = 'chart',
  action,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-divider/35 bg-surface-paper text-primary-main shadow-z1">
          <Iconify icon={icon} width={21} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-secondary">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
