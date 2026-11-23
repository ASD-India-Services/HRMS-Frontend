/**
 * DataTableEmpty — Empty state for DataTable
 *
 * Renders the shared empty state when no records match the current filters.
 *
 * Requirements: 17.4
 */
import { StateView } from '@/components/ui/StateView';

interface DataTableEmptyProps {
  /** Primary message (default: "No records found") */
  message?: string;
  /** Optional secondary description */
  description?: string;
}

export function DataTableEmpty({
  message = 'No records found',
  description,
}: DataTableEmptyProps) {
  return <StateView icon="inbox" title={message} description={description} />;
}
