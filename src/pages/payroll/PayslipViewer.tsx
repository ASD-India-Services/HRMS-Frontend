/**
 * Payslip Viewer Page — month/year selection, salary slip list, and detail view.
 * Requirements: 27.4
 */

import { useState } from 'react';
import { useSalarySlips, useSalarySlipDetail, downloadPayslip } from '@/hooks/usePayroll';
import { PayslipCard } from './components/PayslipCard';
import type { SalaryComponent } from '@/types/payroll';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StateView } from '@/components/ui/StateView';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getYearOptions(): number[] {
  const current = getCurrentYear();
  const years: number[] = [];
  for (let y = current; y >= current - 5; y--) {
    years.push(y);
  }
  return years;
}

function ComponentTable({ title, components, variant }: {
  title: string;
  components: SalaryComponent[];
  variant: 'earnings' | 'deductions';
}) {
  const total = components.reduce((sum, c) => {
    const amt = typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount;
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);
  const textColor = variant === 'earnings' ? 'text-success-dark' : 'text-error-dark';
  const headerBg = variant === 'earnings' ? 'bg-success-lighter' : 'bg-error-lighter';

  return (
    <div className="overflow-hidden rounded-lg bg-surface-neutral/40">
      <div className={`px-4 py-2.5 ${headerBg}`}>
        <h4 className="text-sm font-semibold text-ink-primary">{title}</h4>
      </div>
      <table className="min-w-full divide-y divide-divider">
        <thead>
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-secondary">Component</th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase text-ink-secondary">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {components.map((component, idx) => {
            const name = component.name || (component as unknown as Record<string, unknown>).component as string || '';
            const amt = typeof component.amount === 'string' ? parseFloat(component.amount) : component.amount;
            return (
              <tr key={name || idx}>
                <td className="px-4 py-2 text-sm text-ink-primary">{name}</td>
                <td className="px-4 py-2 text-right text-sm text-ink-primary">{formatCurrency(amt)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-divider bg-surface-neutral">
            <td className="px-4 py-2 text-sm font-semibold text-ink-primary">Total</td>
            <td className={`px-4 py-2 text-right text-sm font-bold ${textColor}`}>{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PayslipViewer() {
  // Default to previous month since payroll is run for the month that just ended
  const prevMonth = getCurrentMonth() === 1 ? 12 : getCurrentMonth() - 1;
  const prevYear = getCurrentMonth() === 1 ? getCurrentYear() - 1 : getCurrentYear();
  const [month, setMonth] = useState(prevMonth);
  const [year, setYear] = useState(prevYear);
  const [selectedSlipId, setSelectedSlipId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: slipsData, isLoading, isError } = useSalarySlips({ month, year });
  const { data: slipDetail, isLoading: isDetailLoading } = useSalarySlipDetail(selectedSlipId);

  async function handleDownloadPdf() {
    if (!slipDetail) return;
    setIsDownloading(true);
    try {
      const filename = `payslip-${slipDetail.employee.employee_id}-${MONTHS[slipDetail.month - 1]}-${slipDetail.year}.pdf`;
      await downloadPayslip(slipDetail.id, filename);
    } catch {
      // Could show a toast here — for now silently handle
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader title="Payslip Viewer" subtitle="View and download your salary slips" />

      {/* Month/Year Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="month-select" className="block text-xs font-medium text-ink-secondary">Month</label>
          <Select
            selectSize="small"
            id="month-select"
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); setSelectedSlipId(null); }}
            className="mt-1"
          >
            {MONTHS.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="year-input" className="block text-xs font-medium text-ink-secondary">Year</label>
          <Input
            inputSize="small"
            id="year-input"
            type="number"
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setSelectedSlipId(null); }}
            className="mt-1 w-24"
            min={2020}
            max={2099}
          />
        </div>
      </div>

      {/* Main Layout: List + Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Slip List */}
        <div className="lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-ink-primary">
            Salary Slips — {MONTHS[month - 1]} {year}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-card bg-surface-neutral" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-card bg-error-lighter p-4 text-sm text-error-dark" role="alert">
              Failed to load salary slips. Please try again.
            </div>
          ) : slipsData && slipsData.results.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                // Group slips by employee ID
                const grouped: Record<string, typeof slipsData.results> = {};
                for (const slip of slipsData.results) {
                  const empId = slip.employee.employee_id;
                  if (!grouped[empId]) grouped[empId] = [];
                  grouped[empId].push(slip);
                }

                return Object.entries(grouped).map(([empId, slips]) => {
                  const mainSlip = slips.find(s => s.gross_pay > 0 && s.net_pay > 5000) || slips[0];
                  const correctionSlips = slips.filter(s => s.id !== mainSlip.id);
                  const hasCorrections = correctionSlips.length > 0;
                  const totalNet = slips.reduce((sum, s) => sum + (parseFloat(String(s.net_pay)) || 0), 0);

                  return (
                    <div key={empId} className="space-y-1">
                      {/* Main slip card */}
                      <PayslipCard
                        slip={mainSlip}
                        isSelected={selectedSlipId === mainSlip.id}
                        onSelect={setSelectedSlipId}
                      />
                      {/* Correction slip cards */}
                      {correctionSlips.map((cs) => (
                        <Button
                          key={cs.id}
                          variant="text"
                          color="warning"
                          onClick={() => setSelectedSlipId(cs.id)}
                          className={`!ml-4 !h-auto !w-[calc(100%-1rem)] !flex-col !items-stretch !justify-start !rounded-lg !p-3 !font-normal text-left ${
                            selectedSlipId === cs.id
                              ? 'bg-warning-lighter ring-2 ring-warning-main'
                              : 'bg-warning-lighter/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning-dark"><Iconify icon="arrow-right" width={12} /> Correction Slip</span>
                            <span className="inline-flex items-center rounded-full bg-warning-lighter px-2 py-0.5 text-xs font-medium text-warning-dark">
                              Supplementary
                            </span>
                          </div>
                          <div className="mt-1 flex gap-4 text-xs">
                            <span className="text-ink-secondary">Net: <span className="font-semibold text-warning-dark">{formatCurrency(cs.net_pay)}</span></span>
                          </div>
                        </Button>
                      ))}
                      {/* Total row if corrections exist */}
                      {hasCorrections && (
                        <div className="ml-4 rounded-lg bg-primary-lighter px-3 py-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-primary-dark">Total Net for Month</span>
                            <span className="text-sm font-bold text-primary-dark">{formatCurrency(totalNet)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <Card>
              <EmptyState module="payroll" title="No salary slips" description="No salary slips for this period." />
            </Card>
          )}
        </div>

        {/* Slip Detail */}
        <div className="lg:col-span-2">
          {selectedSlipId ? (
            isDetailLoading ? (
              <div className="space-y-4">
                <div className="h-10 animate-pulse rounded-card bg-surface-neutral" />
                <div className="h-48 animate-pulse rounded-card bg-surface-neutral" />
                <div className="h-48 animate-pulse rounded-card bg-surface-neutral" />
              </div>
            ) : slipDetail ? (
              (() => {
                // Check if this is a correction slip (has very few earnings, typically just "Correction Adjustment")
                const isCorrectionSlip = slipDetail.earnings_breakdown.some(
                  (e) => e.name === 'Correction Adjustment' || e.name === 'Correction Recovery'
                ) || (slipDetail.earnings_breakdown.length <= 1 && slipDetail.gross_pay < 50000 && slipsData?.results && slipsData.results.filter(s => s.employee.employee_id === slipDetail.employee.employee_id).length > 1);

                // Find the original slip for same employee in same month
                const allEmployeeSlips = slipsData?.results?.filter(
                  s => s.employee.employee_id === slipDetail.employee.employee_id
                ) || [];
                const originalSlip = allEmployeeSlips.find(s => s.id !== slipDetail.id && s.gross_pay > slipDetail.gross_pay);

                // Calculate combined totals if this is a correction slip
                const combinedGross = isCorrectionSlip && originalSlip
                  ? (parseFloat(String(originalSlip.gross_pay)) || 0) + (parseFloat(String(slipDetail.gross_pay)) || 0)
                  : slipDetail.gross_pay;
                const combinedDeductions = isCorrectionSlip && originalSlip
                  ? (parseFloat(String(originalSlip.total_deductions)) || 0) + (parseFloat(String(slipDetail.total_deductions)) || 0)
                  : slipDetail.total_deductions;
                const combinedNet = isCorrectionSlip && originalSlip
                  ? (parseFloat(String(originalSlip.net_pay)) || 0) + (parseFloat(String(slipDetail.net_pay)) || 0)
                  : slipDetail.net_pay;

                return (
              <Card className="p-6">
                {/* Detail Header */}
                <div className="flex items-start justify-between border-b border-divider pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-ink-primary">
                      {slipDetail.employee.first_name} {slipDetail.employee.last_name}
                    </h3>
                    <p className="text-sm text-ink-secondary">
                      {slipDetail.employee.employee_id}
                      {slipDetail.employee.designation && ` • ${slipDetail.employee.designation.name}`}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-disabled">
                      {MONTHS[slipDetail.month - 1]} {slipDetail.year}
                      {slipDetail.salary_structure && ` • ${slipDetail.salary_structure.name}`}
                    </p>
                    {isCorrectionSlip && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-warning-lighter px-2.5 py-0.5 text-xs font-medium text-warning-dark">
                        Correction Slip (Supplementary)
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    aria-label="Download payslip as PDF"
                    startIcon={<Iconify icon="download" />}
                  >
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                  </Button>
                </div>

                {/* Combined Summary (original + correction) if correction slip */}
                {isCorrectionSlip && originalSlip ? (
                  <>
                    {/* Final combined totals */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-success-lighter p-3 text-center">
                        <p className="text-xs font-medium text-success-main">Total Gross Pay</p>
                        <p className="mt-1 text-lg font-bold text-success-dark">{formatCurrency(combinedGross)}</p>
                      </div>
                      <div className="rounded-lg bg-error-lighter p-3 text-center">
                        <p className="text-xs font-medium text-error-main">Total Deductions</p>
                        <p className="mt-1 text-lg font-bold text-error-dark">{formatCurrency(combinedDeductions)}</p>
                      </div>
                      <div className="rounded-lg bg-primary-lighter p-3 text-center">
                        <p className="text-xs font-medium text-primary-main">Final Net Pay</p>
                        <p className="mt-1 text-lg font-bold text-primary-dark">{formatCurrency(combinedNet)}</p>
                      </div>
                    </div>

                    {/* Original slip breakdown */}
                    <div className="mt-5 rounded-lg bg-surface-neutral p-4">
                      <h4 className="text-sm font-semibold text-ink-primary mb-3">Original Salary Slip</h4>
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div><span className="text-ink-secondary">Gross</span> <span className="font-medium">{formatCurrency(originalSlip.gross_pay)}</span></div>
                        <div><span className="text-ink-secondary">Deductions</span> <span className="font-medium text-error-main">{formatCurrency(originalSlip.total_deductions)}</span></div>
                        <div><span className="text-ink-secondary">Net</span> <span className="font-bold">{formatCurrency(originalSlip.net_pay)}</span></div>
                      </div>
                    </div>

                    {/* Correction adjustment */}
                    <div className="mt-3 rounded-lg bg-warning-lighter p-4">
                      <h4 className="text-sm font-semibold text-warning-dark mb-3">Correction Adjustment</h4>
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div><span className="text-ink-secondary">Added</span> <span className="font-medium text-success-dark">+{formatCurrency(slipDetail.gross_pay)}</span></div>
                        <div><span className="text-ink-secondary">Deducted</span> <span className="font-medium text-error-main">{formatCurrency(slipDetail.total_deductions)}</span></div>
                        <div><span className="text-ink-secondary">Net Adj</span> <span className="font-bold text-warning-dark">{formatCurrency(slipDetail.net_pay)}</span></div>
                      </div>
                    </div>

                    {/* Earnings & Deductions combined */}
                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <ComponentTable
                        title="Earnings (incl. correction)"
                        components={[
                          ...(slipDetail.earnings_breakdown || []),
                        ]}
                        variant="earnings"
                      />
                      <ComponentTable
                        title="Deductions"
                        components={[
                          ...(slipDetail.deductions_breakdown || []),
                        ]}
                        variant="deductions"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Normal slip display */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-success-lighter p-3 text-center">
                        <p className="text-xs font-medium text-success-main">Gross Pay</p>
                        <p className="mt-1 text-lg font-bold text-success-dark">{formatCurrency(slipDetail.gross_pay)}</p>
                      </div>
                      <div className="rounded-lg bg-error-lighter p-3 text-center">
                        <p className="text-xs font-medium text-error-main">Deductions</p>
                        <p className="mt-1 text-lg font-bold text-error-dark">{formatCurrency(slipDetail.total_deductions)}</p>
                      </div>
                      <div className="rounded-lg bg-primary-lighter p-3 text-center">
                        <p className="text-xs font-medium text-primary-main">Net Pay</p>
                        <p className="mt-1 text-lg font-bold text-primary-dark">{formatCurrency(slipDetail.net_pay)}</p>
                      </div>
                    </div>

                    {/* Working Days Info */}
                    {slipDetail.days_worked != null && slipDetail.total_working_days != null && (
                      <div className="mt-4 rounded-lg bg-surface-neutral px-4 py-2 text-sm text-ink-secondary">
                        Days Worked: <span className="font-medium text-ink-primary">{slipDetail.days_worked}</span> / {slipDetail.total_working_days}
                      </div>
                    )}

                    {/* Earnings & Deductions Breakdown */}
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <ComponentTable
                        title="Earnings"
                        components={slipDetail.earnings_breakdown}
                        variant="earnings"
                      />
                      <ComponentTable
                        title="Deductions"
                        components={slipDetail.deductions_breakdown}
                        variant="deductions"
                      />
                    </div>
                  </>
                )}
              </Card>
                );
              })()
            ) : null
          ) : (
            <Card>
              <StateView icon="payroll" title="Select a salary slip" description="Choose a salary slip to view its details." />
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
