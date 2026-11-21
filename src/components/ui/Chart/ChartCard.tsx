/**
 * ChartCard — Card + CardHeader + a fixed-height body. Owns the loading, error and empty
 * states so a chart never renders bare axes.
 */
import type { ReactNode } from 'react';
import { ChartSkeleton } from '@/components/ChartWidget/ChartSkeleton';
import { ChartError } from '@/components/ChartWidget/ChartError';
import { StateView } from '../StateView';
import { Card, CardHeader } from '../Card';
import { CHART_HEIGHT } from './chartTheme';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Right-aligned header slot. */
  action?: ReactNode;
  /** Body height in px. */
  height?: number;
  isLoading?: boolean;
  /** Error message; when set the error state is shown. */
  error?: string | null;
  onRetry?: () => void;
  /** True when there is nothing to plot. */
  isEmpty?: boolean;
  children?: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  action,
  height = CHART_HEIGHT,
  isLoading = false,
  error = null,
  onRetry,
  isEmpty = false,
  children,
}: ChartCardProps) {
  const showState = !isLoading && (error !== null || isEmpty);
  let body: ReactNode = children;
  if (isLoading) {
    body = <ChartSkeleton height={height} />;
  } else if (error !== null) {
    body = <ChartError message={error} onRetry={onRetry ?? (() => undefined)} />;
  } else if (isEmpty) {
    body = <StateView icon="chart" title="No data to display" className="py-0" role="status" />;
  }
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className="px-6 pb-6 pt-4">
        <div style={{ height }} className={showState ? 'flex items-center justify-center' : undefined}>
          {body}
        </div>
      </div>
    </Card>
  );
}
