import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { PAYROLL } from '@/lib/endpoints';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { DonutChart, ChartCard, ChartTooltip, AXIS_PROPS, getChartTheme } from '@/components/ui/Chart';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';
import { formatDate } from '@/utils/formatters';

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
    { name: 'Net Pay (Disbursed)', value: Math.round(totalNetPay), color: 'rgb(var(--success-main))' },
    { name: 'Deductions (PF/Tax/ESI)', value: Math.round(totalDeductions), color: 'rgb(var(--warning-main))' },
    { name: 'Employer Contribution', value: Math.max(0, Math.round((totalGrossPay - totalNetPay) * 0.5)), color: 'rgb(var(--info-main))' },
  ];
  const costBreakdownEmpty = costBreakdownData.every((d) => d.value === 0);

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

  const theme = getChartTheme();
  return (
    <PageContainer>
      <PageHeader
        title="Payroll Dashboard"
        subtitle="Payroll cycles, net disbursement trends, salary slip generation, and compensation analytics."
        actions={
          <>
            <ButtonLink to="/payroll" variant="outlined" color="inherit" startIcon={<Iconify icon="salarySlips" />}>
              Salary Slips
            </ButtonLink>
            <ButtonLink to="/payroll/runs" startIcon={<Iconify icon="plus" />}>
              Payroll Runs
            </ButtonLink>
          </>
        }
      />
      <div className="space-y-6">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Disbursed Net Pay"
            value={formatCurrency(totalNetPay || 0)}
            icon="payroll"
            isLoading={isLoading}
            caption="Current period total"
          />
          <StatCard
            title="Processed Payslips"
            value={totalSlipsCount}
            icon="salarySlips"
            href="/payroll"
            isLoading={isLoading}
            caption="Slips generated · View all salary slips"
          />
          <StatCard
            title="Payroll Cycles"
            value={totalRunsCount}
            icon="refresh"
            href="/payroll/runs"
            isLoading={isLoading}
            caption="Total runs · Manage payroll runs"
          />
          <StatCard
            title="Salary Structures"
            value={activeStructuresCount}
            icon="documentTypes"
            href="/salary-structures"
            isLoading={isLoading}
            caption="Active plans · Configure structures"
          />
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 6-Month Payroll Expense Trend */}
          <ChartCard
            title="6-Month Payroll Expense Trend"
            subtitle="Monthly net compensation disbursement trajectory (INR ₹)"
            isLoading={trendLoading}
            isEmpty={chartTrend.length === 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrend}>
                <defs>
                  <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--success-main))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="rgb(var(--success-main))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...theme.grid} />
                <XAxis dataKey="label" tick={theme.tick} {...AXIS_PROPS} />
                <YAxis
                  tick={theme.tick}
                  {...AXIS_PROPS}
                  tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
                />
                <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
                <Area type="monotone" dataKey="value" name="Net Disbursement" stroke="rgb(var(--success-main))" strokeWidth={2} fillOpacity={1} fill="url(#payrollGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Salary Cost Breakdown */}
          <ChartCard
            title="Compensation Cost Breakdown"
            subtitle="Net pay vs statutory deductions and benefits"
            isLoading={slipsLoading}
            isEmpty={costBreakdownEmpty}
          >
            <DonutChart
              data={costBreakdownData}
              formatValue={(item) => formatCurrency(item.value)}
            />
          </ChartCard>
        </div>

        {/* Recent Payroll Runs Table */}
        <Card>
          <CardHeader
            title="Recent Payroll Runs"
            subtitle="Latest executed and pending payroll processing batches"
            action={
              <ButtonLink to="/payroll/runs" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                View all runs
              </ButtonLink>
            }
          />
          <CardContent>
            {recentRuns.length === 0 ? (
              <EmptyState module="payroll" title="No payroll runs found" description="Payroll runs will appear here once processed." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-neutral text-xs font-semibold uppercase tracking-wider text-ink-secondary">
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
                      <tr key={run.id} className="transition-colors hover:bg-surface-neutral/60">
                        <td className="px-4 py-3 font-medium text-ink-primary">
                          {run.title || run.name || `Payroll Run #${run.id.slice(0, 6)}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-secondary">
                          {run.number_of_employees || '—'} staff
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-secondary">
                          {formatDate(run.posting_date || run.start_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded bg-success-lighter px-2 py-0.5 text-xs font-semibold capitalize text-success-dark">
                            {run.status || 'Completed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ButtonLink to="/payroll/runs" variant="text" size="small">
                            Details
                          </ButtonLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
