/**
 * Expense List Page — displays expense claims with status filter tabs.
 * Requirements: 27.6
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useExpenseClaims } from '@/hooks/useExpenses';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import type { ExpenseClaimStatus } from '@/types/expense';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';

const STATUS_TABS: { label: string; value: ExpenseClaimStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Paid', value: 'paid' },
];

const statusStyles: Record<ExpenseClaimStatus, string> = {
  pending: 'bg-warning-lighter text-warning-dark',
  approved: 'bg-success-lighter text-success-dark',
  rejected: 'bg-error-lighter text-error-dark',
  paid: 'bg-primary-lighter text-primary-dark',
};

export function ExpenseList() {
  const [activeStatus, setActiveStatus] = useState<ExpenseClaimStatus | ''>('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useExpenseClaims({
    status: activeStatus || undefined,
    page,
    page_size: 10,
    mine: true,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Expense Claims</h1>
          <p className="mt-1 text-sm text-ink-secondary">View and manage your expense reimbursement claims</p>
        </div>
        <Link
          to="/expenses/new"
          className="rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-primary-contrast shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2"
        >
          New Expense Claim
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="mb-4 border-b border-divider" role="tablist" aria-label="Filter by status">
        <nav className="-mb-px flex gap-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeStatus === tab.value}
              onClick={() => { setActiveStatus(tab.value); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeStatus === tab.value
                  ? 'border-primary-main text-primary-main'
                  : 'border-transparent text-ink-secondary hover:border-divider hover:text-ink-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : data && data.results.length > 0 ? (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-sm">
            <table className="min-w-full divide-y divide-divider">
              <thead className="bg-surface-neutral">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Expense Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Amount</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Description</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Submitted On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.results.map((claim) => (
                  <tr key={claim.id} className="hover:bg-surface-neutral">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink-primary">
                      {claim.expense_type_name || claim.expense_type?.name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink-primary">
                      {formatCurrency(claim.total_amount || claim.amount || 0)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {formatDate(claim.expense_date)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-ink-secondary" title={claim.description || claim.title || ''}>
                      {claim.title || claim.description || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[claim.status]}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {formatDate(claim.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-secondary">
              Showing {data.results.length} of {data.count} claims
            </p>
            <div className="flex gap-2">
              <Button type="submit" variant="outlined" color="inherit"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
              >
                Previous
              </Button>
              <Button type="submit" variant="outlined" color="inherit"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.next}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          module="expenses"
          ctaPermission="expenses.create"
          onCtaClick={() => navigate('/expenses/new')}
        />
      )}
    </div>
  );
}
