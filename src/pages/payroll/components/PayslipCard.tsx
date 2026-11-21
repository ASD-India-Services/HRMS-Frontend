/**
 * Payslip Card — displays gross pay, deductions, and net pay summary for a salary slip.
 * Requirements: 27.4
 */

import type { SalarySlipSummary } from '@/types/payroll';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';

interface PayslipCardProps {
  slip: SalarySlipSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-surface-neutral text-ink-primary',
  submitted: 'bg-warning-lighter text-warning-dark',
  paid: 'bg-success-lighter text-success-dark',
  cancelled: 'bg-error-lighter text-error-dark',
};

export function PayslipCard({ slip, isSelected, onSelect }: PayslipCardProps) {
  return (
    <Button
      variant="text"
      color="inherit"
      onClick={() => onSelect(slip.id)}
      className={`!h-auto !w-full !flex-col !items-stretch !justify-start !rounded-card !p-5 !font-normal text-left shadow-card transition-shadow hover:shadow-z8 ${
        isSelected
          ? 'bg-primary-lighter ring-2 ring-primary-main hover:!bg-primary-lighter'
          : 'bg-surface-paper hover:!bg-surface-paper'
      }`}
      aria-pressed={isSelected}
      aria-label={`Payslip for ${slip.employee.first_name} ${slip.employee.last_name}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-primary">
            {slip.employee.first_name} {slip.employee.last_name}
          </p>
          <p className="text-xs text-ink-secondary">{slip.employee.employee_id}</p>
          {slip.employee.department && (
            <p className="mt-0.5 text-xs text-ink-disabled">{slip.employee.department.name}</p>
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
          <p className="text-xs text-ink-secondary">Gross</p>
          <p className="text-sm font-medium text-ink-primary">{formatCurrency(slip.gross_pay)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Deductions</p>
          <p className="text-sm font-medium text-error-main">{formatCurrency(slip.total_deductions)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-secondary">Net Pay</p>
          <p className="text-sm font-bold text-primary-dark">{formatCurrency(slip.net_pay)}</p>
        </div>
      </div>
    </Button>
  );
}
