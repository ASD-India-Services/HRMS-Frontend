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
  const textColor = variant === 'earnings' ? 'text-green-700' : 'text-red-700';
  const headerBg = variant === 'earnings' ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="overflow-hidden rounded-lg border border-divider">
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
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-primary">Payslip Viewer</h1>
        <p className="mt-1 text-sm text-ink-secondary">View and download your salary slips</p>
      </div>

      {/* Month/Year Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="month-select" className="block text-xs font-medium text-ink-secondary">Month</label>
          <Select
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
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">
            Salary Slips — {MONTHS[month - 1]} {year}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-surface-neutral" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700" role="alert">
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
                        <button
                          key={cs.id}
                          type="button"
                          onClick={() => setSelectedSlipId(cs.id)}
                          className={`w-full ml-4 rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                            selectedSlipId === cs.id
                              ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-400'
                              : 'border-orange-200 bg-orange-50/50 hover:border-orange-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-orange-700">↳ Correction Slip</span>
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              Supplementary
                            </span>
                          </div>
                          <div className="mt-1 flex gap-4 text-xs">
                            <span className="text-ink-secondary">Net: <span className="font-semibold text-orange-700">{formatCurrency(cs.net_pay)}</span></span>
                          </div>
                        </button>
                      ))}
                      {/* Total row if corrections exist */}
                      {hasCorrections && (
                        <div className="ml-4 rounded-md bg-primary-lighter border border-primary-light px-3 py-2">
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
            <div className="rounded-lg border border-divider bg-surface-paper p-6 text-center">
              <p className="text-sm text-ink-secondary">No salary slips for this period.</p>
            </div>
          )}
        </div>

        {/* Slip Detail */}
        <div className="lg:col-span-2">
          {selectedSlipId ? (
            isDetailLoading ? (
              <div className="space-y-4">
                <div className="h-10 animate-pulse rounded-lg bg-surface-neutral" />
                <div className="h-48 animate-pulse rounded-lg bg-surface-neutral" />
                <div className="h-48 animate-pulse rounded-lg bg-surface-neutral" />
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
              <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-sm">
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
                      <span className="mt-1 inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                        Correction Slip (Supplementary)
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    aria-label="Download payslip as PDF"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                  </Button>
                </div>

                {/* Combined Summary (original + correction) if correction slip */}
                {isCorrectionSlip && originalSlip ? (
                  <>
                    {/* Final combined totals */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-green-50 p-3 text-center">
                        <p className="text-xs font-medium text-green-600">Total Gross Pay</p>
                        <p className="mt-1 text-lg font-bold text-green-800">{formatCurrency(combinedGross)}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3 text-center">
                        <p className="text-xs font-medium text-red-600">Total Deductions</p>
                        <p className="mt-1 text-lg font-bold text-red-800">{formatCurrency(combinedDeductions)}</p>
                      </div>
                      <div className="rounded-lg bg-primary-lighter p-3 text-center">
                        <p className="text-xs font-medium text-primary-main">Final Net Pay</p>
                        <p className="mt-1 text-lg font-bold text-primary-dark">{formatCurrency(combinedNet)}</p>
                      </div>
                    </div>

                    {/* Original slip breakdown */}
                    <div className="mt-5 rounded-lg border border-divider p-4">
                      <h4 className="text-sm font-semibold text-ink-primary mb-3">Original Salary Slip</h4>
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div><span className="text-ink-secondary">Gross</span> <span className="font-medium">{formatCurrency(originalSlip.gross_pay)}</span></div>
                        <div><span className="text-ink-secondary">Deductions</span> <span className="font-medium text-red-600">{formatCurrency(originalSlip.total_deductions)}</span></div>
                        <div><span className="text-ink-secondary">Net</span> <span className="font-bold">{formatCurrency(originalSlip.net_pay)}</span></div>
                      </div>
                    </div>

                    {/* Correction adjustment */}
                    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <h4 className="text-sm font-semibold text-orange-700 mb-3">Correction Adjustment</h4>
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div><span className="text-ink-secondary">Added</span> <span className="font-medium text-green-700">+{formatCurrency(slipDetail.gross_pay)}</span></div>
                        <div><span className="text-ink-secondary">Deducted</span> <span className="font-medium text-red-600">{formatCurrency(slipDetail.total_deductions)}</span></div>
                        <div><span className="text-ink-secondary">Net Adj</span> <span className="font-bold text-orange-700">{formatCurrency(slipDetail.net_pay)}</span></div>
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
                      <div className="rounded-lg bg-green-50 p-3 text-center">
                        <p className="text-xs font-medium text-green-600">Gross Pay</p>
                        <p className="mt-1 text-lg font-bold text-green-800">{formatCurrency(slipDetail.gross_pay)}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3 text-center">
                        <p className="text-xs font-medium text-red-600">Deductions</p>
                        <p className="mt-1 text-lg font-bold text-red-800">{formatCurrency(slipDetail.total_deductions)}</p>
                      </div>
                      <div className="rounded-lg bg-primary-lighter p-3 text-center">
                        <p className="text-xs font-medium text-primary-main">Net Pay</p>
                        <p className="mt-1 text-lg font-bold text-primary-dark">{formatCurrency(slipDetail.net_pay)}</p>
                      </div>
                    </div>

                    {/* Working Days Info */}
                    {slipDetail.days_worked != null && slipDetail.total_working_days != null && (
                      <div className="mt-4 rounded-md bg-surface-neutral px-4 py-2 text-sm text-ink-secondary">
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
              </div>
                );
              })()
            ) : null
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-divider bg-surface-neutral">
              <p className="text-sm text-ink-secondary">Select a salary slip to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
