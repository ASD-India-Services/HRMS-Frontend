/**
 * MetricCardSkeleton
 *
 * Animated skeleton matching the MetricCard layout. Shown while metric data is loading.
 *
 * Requirements: 1.1, 1.3
 */
import { StatCard } from '@/components/ui/StatCard';

export function MetricCardSkeleton() {
  return <StatCard title="" value={null} isLoading />;
}
