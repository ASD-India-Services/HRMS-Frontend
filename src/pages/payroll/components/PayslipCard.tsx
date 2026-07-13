/**
 * Payslip Card — displays gross pay, deductions, and net pay summary for a salary slip.
 * Requirements: 27.4
 */

import type { SalarySlipSummary } from '@/types/payroll';

interface PayslipCardProps {
  slip: SalarySlipSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PayslipCard({ slip, isSelected, onSelect }: PayslipCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slip.id)}
      className={`w-full rounded-lg border p-4 text-left transition-all hover:shadow-md ${
        isSelected
          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      aria-pressed={isSelected}
      aria-label={`Payslip for ${slip.employee.first_name} ${slip.employee.last_name}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {slip.employee.first_name} {slip.employee.last_name}
          </p>
          <p className="text-xs text-gray-500">{slip.employee.employee_id}</p>
          {slip.employee.department && (
            <p className="mt-0.5 text-xs text-gray-400">{slip.employee.department.name}</p>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[slip.status] ?? statusStyles.draft}`}
        >
          {slip.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-500">Gross</p>
          <p className="text-sm font-medium text-gray-900">{formatCurrency(slip.gross_pay)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Deductions</p>
          <p className="text-sm font-medium text-red-600">{formatCurrency(slip.total_deductions)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Net Pay</p>
          <p className="text-sm font-bold text-primary-700">{formatCurrency(slip.net_pay)}</p>
        </div>
      </div>
    </button>
  );
}
