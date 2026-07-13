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
  const total = components.reduce((sum, c) => sum + c.amount, 0);
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
          {components.map((component) => (
            <tr key={component.name}>
              <td className="px-4 py-2 text-sm text-gray-700">{component.name}</td>
              <td className="px-4 py-2 text-right text-sm text-gray-900">{formatCurrency(component.amount)}</td>
            </tr>
          ))}
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
          <label htmlFor="year-select" className="block text-xs font-medium text-gray-600">Year</label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setSelectedSlipId(null); }}
            className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {getYearOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
              {slipsData.results.map((slip) => (
                <PayslipCard
                  key={slip.id}
                  slip={slip}
                  isSelected={selectedSlipId === slip.id}
                  onSelect={setSelectedSlipId}
                />
              ))}
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

                {/* Summary Cards */}
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
              </div>
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
