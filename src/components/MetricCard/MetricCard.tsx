/**
 * MetricCard
 *
 * A clickable summary card for the admin dashboard overview. Thin wrapper over the shared
 * StatCard: title, value, icon and optional trend, linking to a detail page.
 *
 * Requirements: 1.1, 1.3, 1.4
 */
import { StatCard } from '@/components/ui/StatCard';
import type { MetricCardProps } from '../../types/dashboard';

export function MetricCard({ title, value, icon, href, isLoading, trend }: MetricCardProps) {
  return <StatCard title={title} value={value} icon={icon} href={href} isLoading={isLoading} trend={trend} />;
}
