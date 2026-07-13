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

const STATUS_TABS: { label: string; value: ExpenseClaimStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Paid', value: 'paid' },
];

const statusStyles: Record<ExpenseClaimStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ExpenseList() {
  const [activeStatus, setActiveStatus] = useState<ExpenseClaimStatus | ''>('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useExpenseClaims({
    status: activeStatus || undefined,
    page,
    page_size: 10,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Claims</h1>
          <p className="mt-1 text-sm text-gray-600">View and manage your expense reimbursement claims</p>
        </div>
        <Link
          to="/expenses/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          New Expense Claim
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="mb-4 border-b border-gray-200" role="tablist" aria-label="Filter by status">
        <nav className="-mb-px flex gap-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeStatus === tab.value}
              onClick={() => { setActiveStatus(tab.value); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeStatus === tab.value
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Expense Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Amount</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Submitted On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.results.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {claim.expense_type.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(claim.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(claim.expense_date)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600" title={claim.description}>
                      {claim.description}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[claim.status]}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(claim.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {data.results.length} of {data.count} claims
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.next}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
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
