import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { PAYROLL } from '@/lib/endpoints';

interface SalarySlip {
  id: string;
  employee_name?: string;
  employee?: string;
  posting_date?: string;
  pay_period_start?: string;
  pay_period_end?: string;
  gross_pay?: number | string;
  net_pay?: number | string;
  total_deduction?: number | string;
  status?: string;
}

interface PayrollEntry {
  id: string;
  title?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  posting_date?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'disbursed' | string;
  number_of_employees?: number;
  total_gross_pay?: number | string;
  total_net_pay?: number | string;
}

interface SalaryStructure {
  id: string;
  name: string;
  is_active?: boolean;
}

const COST_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function PayrollDashboard() {
  // Fetch salary slips
  const { data: slipsData, isLoading: slipsLoading } = useQuery<{ results?: SalarySlip[]; count?: number } | SalarySlip[]>({
    queryKey: ['payroll', 'dashboard', 'slips'],
    queryFn: async () => {
      try {
        const res = await api.get(PAYROLL.SALARY_SLIPS, { params: { page_size: 100 } });
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // Fetch payroll entries / runs
  const { data: runsData, isLoading: runsLoading } = useQuery<{ results?: PayrollEntry[]; count?: number } | PayrollEntry[]>({
    queryKey: ['payroll', 'dashboard', 'runs'],
    queryFn: async () => {
      try {
        const res = await api.get(PAYROLL.PAYROLL_ENTRIES, { params: { page_size: 10 } });
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // Fetch 6-month payroll expense trend
  const { data: trendData, isLoading: trendLoading } = useQuery<{ data: { label: string; value: number }[] }>({
    queryKey: ['payroll', 'dashboard', 'trend'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/reports/dashboard-charts/', { params: { chart: 'payroll-summary' } });
        return res.data;
      } catch {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return { data: months.map((m) => ({ label: m, value: 0 })) };
      }
    },
  });

  // Fetch salary structures
  const { data: structuresData } = useQuery<{ results?: SalaryStructure[]; count?: number } | SalaryStructure[]>({
    queryKey: ['payroll', 'dashboard', 'structures'],
    queryFn: async () => {
      try {
        const res = await api.get(PAYROLL.SALARY_STRUCTURES);
        return res.data;
      } catch {
        return [];
      }
    },
  });

  const slips: SalarySlip[] = Array.isArray(slipsData) ? slipsData : slipsData?.results ?? [];
  const runs: PayrollEntry[] = Array.isArray(runsData) ? runsData : runsData?.results ?? [];
  const structures: SalaryStructure[] = Array.isArray(structuresData)
    ? structuresData
    : structuresData?.results ?? [];

  // Metrics
  const totalNetPay = slips.reduce((sum, s) => sum + (Number(s.net_pay) || 0), 0);
  const totalGrossPay = slips.reduce((sum, s) => sum + (Number(s.gross_pay) || 0), 0);
  const totalDeductions = slips.reduce((sum, s) => sum + (Number(s.total_deduction) || 0), 0);

  const totalSlipsCount = slipsData && 'count' in slipsData && typeof slipsData.count === 'number'
    ? slipsData.count
    : slips.length;

  const totalRunsCount = runsData && 'count' in runsData && typeof runsData.count === 'number'
    ? runsData.count
    : runs.length;

  const activeStructuresCount = structures.length;

  // Breakdown chart
  const costBreakdownData = [
    { name: 'Net Pay (Disbursed)', value: Math.max(1, Math.round(totalNetPay || 750000)), color: '#10b981' },
    { name: 'Deductions (PF/Tax/ESI)', value: Math.max(1, Math.round(totalDeductions || 120000)), color: '#f59e0b' },
    { name: 'Employer Contribution', value: Math.max(1, Math.round((totalGrossPay - totalNetPay) * 0.5 || 60000)), color: '#3b82f6' },
  ];

  const chartTrend = trendData?.data ?? [];
  const recentRuns = runs.slice(0, 5);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isLoading = slipsLoading || runsLoading || trendLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Payroll Dashboard</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Payroll cycles, net disbursement trends, salary slip generation, and compensation analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/payroll"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md border border-divider bg-surface-paper text-ink-primary hover:bg-surface-neutral shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Salary Slips
          </Link>
          <Link
            to="/payroll/runs"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-white bg-primary-main hover:bg-primary-dark shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Payroll Runs
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Payroll Cost */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Disbursed Net Pay
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">
              {isLoading ? '...' : formatCurrency(totalNetPay || 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            <span>Current period total</span>
          </div>
        </div>

        {/* Processed Payslips */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Processed Payslips
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-lighter text-primary-main">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{isLoading ? '...' : totalSlipsCount}</span>
            <span className="ml-2 text-xs text-primary-main font-medium">slips generated</span>
          </div>
          <div className="mt-2 text-xs text-primary-main font-medium">
            <Link to="/payroll" className="hover:underline">View all salary slips →</Link>
          </div>
        </div>

        {/* Payroll Runs */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Payroll Cycles
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{isLoading ? '...' : totalRunsCount}</span>
            <span className="ml-2 text-xs text-ink-secondary">total runs</span>
          </div>
          <div className="mt-2 text-xs text-indigo-600 font-medium">
            <Link to="/payroll/runs" className="hover:underline">Manage payroll runs →</Link>
          </div>
        </div>

        {/* Salary Structures */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Salary Structures
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{isLoading ? '...' : activeStructuresCount}</span>
            <span className="ml-2 text-xs text-purple-600 font-medium">Active Plans</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 font-medium">
            <Link to="/salary-structures" className="hover:underline">Configure structures →</Link>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 6-Month Payroll Expense Trend */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">6-Month Payroll Expense Trend</h2>
              <p className="text-xs text-ink-secondary">Monthly net compensation disbursement trajectory</p>
            </div>
            <span className="text-xs font-medium text-ink-secondary">INR (₹)</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
                />
                <Tooltip
                  formatter={(val: unknown) => [typeof val === 'number' ? formatCurrency(val) : '₹0', 'Net Disbursement']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#payrollGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary Cost Breakdown */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Compensation Cost Breakdown</h2>
              <p className="text-xs text-ink-secondary">Net pay vs statutory deductions and benefits</p>
            </div>
            <span className="text-xs font-medium text-ink-secondary">Overview</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-around h-64">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cost-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [typeof val === 'number' ? formatCurrency(val) : '₹0', 'Amount']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-2.5 text-xs">
              {costBreakdownData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-ink-primary truncate max-w-[130px]">{item.name}</span>
                  </span>
                  <span className="font-semibold text-ink-primary">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payroll Runs Table */}
      <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-ink-primary">Recent Payroll Runs</h2>
            <p className="text-xs text-ink-secondary">Latest executed and pending payroll processing batches</p>
          </div>
          <Link to="/payroll/runs" className="text-xs font-semibold text-primary-main hover:underline">
            View all runs →
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-disabled">No payroll runs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-divider bg-surface-neutral text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Cycle Title / Period</th>
                  <th className="px-4 py-3">Employees</th>
                  <th className="px-4 py-3">Posting Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-surface-neutral/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink-primary">
                      {run.title || run.name || `Payroll Run #${run.id.slice(0, 6)}`}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary text-xs">
                      {run.number_of_employees || '—'} staff
                    </td>
                    <td className="px-4 py-3 text-ink-secondary font-mono text-xs">
                      {run.posting_date || run.start_date || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 capitalize">
                        {run.status || 'Completed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/payroll/runs"
                        className="text-xs font-semibold text-primary-main hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

