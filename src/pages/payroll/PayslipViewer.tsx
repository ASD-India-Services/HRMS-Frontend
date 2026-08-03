/**
 * Payslip Viewer Page — month/year selection, salary slip list, and detail view.
 * Requirements: 27.4
 */

import { useState } from 'react';
import { useSalarySlips, useSalarySlipDetail, downloadPayslip } from '@/hooks/usePayroll';
import { PayslipCard } from './components/PayslipCard';
import type { SalaryComponent } from '@/types/payroll';

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
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
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className={`px-4 py-2.5 ${headerBg}`}>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Component</th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {components.map((component, idx) => {
            const name = component.name || (component as unknown as Record<string, unknown>).component as string || '';
            const amt = typeof component.amount === 'string' ? parseFloat(component.amount) : component.amount;
            return (
              <tr key={name || idx}>
                <td className="px-4 py-2 text-sm text-gray-700">{name}</td>
                <td className="px-4 py-2 text-right text-sm text-gray-900">{formatCurrency(amt)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50">
            <td className="px-4 py-2 text-sm font-semibold text-gray-900">Total</td>
            <td className={`px-4 py-2 text-right text-sm font-bold ${textColor}`}>{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PayslipViewer() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
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
        <h1 className="text-2xl font-bold text-gray-900">Payslip Viewer</h1>
        <p className="mt-1 text-sm text-gray-600">View and download your salary slips</p>
      </div>

      {/* Month/Year Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="month-select" className="block text-xs font-medium text-gray-600">Month</label>
          <select
            id="month-select"
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); setSelectedSlipId(null); }}
            className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {MONTHS.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="year-input" className="block text-xs font-medium text-gray-600">Year</label>
          <input
            id="year-input"
            type="number"
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setSelectedSlipId(null); }}
            className="mt-1 w-24 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            min={2020}
            max={2099}
          />
        </div>
      </div>

      {/* Main Layout: List + Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Slip List */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Salary Slips — {MONTHS[month - 1]} {year}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
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
                            <span className="text-gray-600">Net: <span className="font-semibold text-orange-700">{formatCurrency(cs.net_pay)}</span></span>
                          </div>
                        </button>
                      ))}
                      {/* Total row if corrections exist */}
                      {hasCorrections && (
                        <div className="ml-4 rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-blue-700">Total Net for Month</span>
                            <span className="text-sm font-bold text-blue-800">{formatCurrency(totalNet)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-500">No salary slips for this period.</p>
            </div>
          )}
        </div>

        {/* Slip Detail */}
        <div className="lg:col-span-2">
          {selectedSlipId ? (
            isDetailLoading ? (
              <div className="space-y-4">
                <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
                <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
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
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {/* Detail Header */}
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {slipDetail.employee.first_name} {slipDetail.employee.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {slipDetail.employee.employee_id}
                      {slipDetail.employee.designation && ` • ${slipDetail.employee.designation.name}`}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {MONTHS[slipDetail.month - 1]} {slipDetail.year}
                      {slipDetail.salary_structure && ` • ${slipDetail.salary_structure.name}`}
                    </p>
                    {isCorrectionSlip && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                        Correction Slip (Supplementary)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                    aria-label="Download payslip as PDF"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                  </button>
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
                      <div className="rounded-lg bg-primary-50 p-3 text-center">
                        <p className="text-xs font-medium text-primary-600">Final Net Pay</p>
                        <p className="mt-1 text-lg font-bold text-primary-800">{formatCurrency(combinedNet)}</p>
                      </div>
                    </div>

                    {/* Original slip breakdown */}
                    <div className="mt-5 rounded-lg border border-gray-200 p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Original Salary Slip</h4>
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div><span className="text-gray-500">Gross</span> <span className="font-medium">{formatCurrency(originalSlip.gross_pay)}</span></div>
                        <div><span className="text-gray-500">Deductions</span> <span className="font-medium text-red-600">{formatCurrency(originalSlip.total_deductions)}</span></div>
                        <div><span className="text-gray-500">Net</span> <span className="font-bold">{formatCurrency(originalSlip.net_pay)}</span></div>
                      </div>
                    </div>

                    {/* Correction adjustment */}
                    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <h4 className="text-sm font-semibold text-orange-700 mb-3">Correction Adjustment</h4>
                      <div className="grid grid-cols-3 gap-3 text-center text-sm">
                        <div><span className="text-gray-500">Added</span> <span className="font-medium text-green-700">+{formatCurrency(slipDetail.gross_pay)}</span></div>
                        <div><span className="text-gray-500">Deducted</span> <span className="font-medium text-red-600">{formatCurrency(slipDetail.total_deductions)}</span></div>
                        <div><span className="text-gray-500">Net Adj</span> <span className="font-bold text-orange-700">{formatCurrency(slipDetail.net_pay)}</span></div>
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
                      <div className="rounded-lg bg-primary-50 p-3 text-center">
                        <p className="text-xs font-medium text-primary-600">Net Pay</p>
                        <p className="mt-1 text-lg font-bold text-primary-800">{formatCurrency(slipDetail.net_pay)}</p>
                      </div>
                    </div>

                    {/* Working Days Info */}
                    {slipDetail.days_worked != null && slipDetail.total_working_days != null && (
                      <div className="mt-4 rounded-md bg-gray-50 px-4 py-2 text-sm text-gray-600">
                        Days Worked: <span className="font-medium text-gray-900">{slipDetail.days_worked}</span> / {slipDetail.total_working_days}
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
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
              <p className="text-sm text-gray-500">Select a salary slip to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
