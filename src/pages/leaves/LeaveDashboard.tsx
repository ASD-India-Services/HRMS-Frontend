import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { LEAVES } from '@/lib/endpoints';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { DonutChart, ChartCard, ChartTooltip, AXIS_PROPS, getChartTheme } from '@/components/ui/Chart';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';

interface LeaveApplication {
  id: string;
  employee_name?: string;
  employee?: string;
  leave_type_name?: string;
  leave_type?: string;
  from_date: string;
  to_date: string;
  total_days?: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
  reason?: string;
}

interface LeaveType {
  id: string;
  name: string;
  code?: string;
  max_days_per_year?: number;
}

interface CompanyLeave {
  id: string;
  leave_name: string;
  from_date: string;
  to_date: string;
  leave_type?: string;
}


export default function LeaveDashboard() {
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch leave applications
  const { data: applicationsData, isLoading: appsLoading } = useQuery<{ results?: LeaveApplication[]; count?: number } | LeaveApplication[]>({
    queryKey: ['leaves', 'dashboard', 'applications'],
    queryFn: async () => {
      try {
        const res = await api.get(LEAVES.APPLICATIONS, { params: { page_size: 100 } });
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // Fetch leave types
  const { data: typesData, isLoading: typesLoading } = useQuery<{ results?: LeaveType[] } | LeaveType[]>({
    queryKey: ['leaves', 'dashboard', 'types'],
    queryFn: async () => {
      try {
        const res = await api.get(LEAVES.TYPES);
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // Fetch company leaves / holidays
  const { data: companyLeavesData } = useQuery<{ results?: CompanyLeave[] } | CompanyLeave[]>({
    queryKey: ['leaves', 'dashboard', 'company-leaves'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/leaves/company-leaves/');
        return res.data;
      } catch {
        return [];
      }
    },
  });

  const applications: LeaveApplication[] = Array.isArray(applicationsData)
    ? applicationsData
    : applicationsData?.results ?? [];

  const leaveTypes: LeaveType[] = Array.isArray(typesData)
    ? typesData
    : typesData?.results ?? [];

  const companyLeaves: CompanyLeave[] = Array.isArray(companyLeavesData)
    ? companyLeavesData
    : companyLeavesData?.results ?? [];

  // Metrics calculation
  const pendingApps = applications.filter((a) => (a.status || '').toLowerCase() === 'pending');
  const approvedApps = applications.filter((a) => (a.status || '').toLowerCase() === 'approved');
  const rejectedApps = applications.filter((a) => (a.status || '').toLowerCase() === 'rejected');

  const onLeaveToday = approvedApps.filter(
    (a) => a.from_date <= todayStr && a.to_date >= todayStr
  ).length;

  // Status chart
  const statusChartData = [
    { label: 'Approved', count: approvedApps.length, fill: 'rgb(var(--success-main))' },
    { label: 'Pending', count: pendingApps.length, fill: 'rgb(var(--warning-main))' },
    { label: 'Rejected', count: rejectedApps.length, fill: 'rgb(var(--error-main))' },
  ];

  // Leaves by Type distribution
  const typeCounts: Record<string, number> = {};
  applications.forEach((a) => {
    const type = a.leave_type_name || a.leave_type || 'General';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const typeChartData = Object.entries(typeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const upcomingHolidays = companyLeaves
    .filter((cl) => cl.from_date >= todayStr)
    .slice(0, 4);

  const isLoading = appsLoading || typesLoading;

  const theme = getChartTheme();
  return (
    <PageContainer>
      <PageHeader
        title="Leave Management Dashboard"
        subtitle="Workforce absence forecasting, pending approval workflows, and leave quota analytics."
        actions={
          <>
            <ButtonLink to="/leaves/company-leaves" variant="outlined" color="inherit" startIcon={<Iconify icon="holidayLists" />}>
              Company Leaves
            </ButtonLink>
            <ButtonLink to="/leaves/approvals" startIcon={<Iconify icon="leaveApprovals" />}>
              Leave Approvals
            </ButtonLink>
          </>
        }
      />
      <div className="space-y-6">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="On Leave Today"
            value={onLeaveToday}
            icon="employees"
            isLoading={isLoading}
            caption="Active approved absences"
          />
          <StatCard
            title="Pending Approvals"
            value={pendingApps.length}
            icon="attendance"
            href="/leaves/approvals"
            isLoading={isLoading}
            caption="Requests awaiting action · Review pending requests"
          />
          <StatCard
            title="Approved Requests"
            value={approvedApps.length}
            icon="success"
            isLoading={isLoading}
            caption="Successful leave periods"
          />
          <StatCard
            title="Leave Policies"
            value={leaveTypes.length}
            icon="leavePolicies"
            href="/leave-policies"
            isLoading={isLoading}
            caption="Types configured · Manage policies"
          />
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Status Breakdown */}
          <ChartCard
            title="Application Status Distribution"
            subtitle="Breakdown of submitted leave requests"
            action={
              <ButtonLink to="/leaves/approvals" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                Approvals Queue
              </ButtonLink>
            }
            isEmpty={applications.length === 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <CartesianGrid {...theme.grid} />
                <XAxis dataKey="label" tick={theme.tick} {...AXIS_PROPS} />
                <YAxis allowDecimals={false} tick={theme.tick} {...AXIS_PROPS} />
                <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
                <Bar dataKey="count" name="Applications" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`leave-status-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Leaves by Type */}
          <ChartCard
            title="Leaves by Type"
            subtitle={`Distribution across Casual, Sick, Earned and other types · ${typeChartData.length} categories`}
            isEmpty={typeChartData.length === 0}
          >
            <DonutChart
              data={typeChartData.slice(0, 5).map((item, idx) => ({ ...item, color: theme.colors[idx % theme.colors.length] }))}
              formatValue={(item) => `${item.value} requests`}
            />
          </ChartCard>
        </div>

        {/* Two-Column Section: Pending Approvals & Upcoming Holidays */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pending Approvals Table */}
          <Card>
            <CardHeader
              title="Pending Leave Approvals"
              subtitle="Requires supervisor or HR decision"
              action={
                <ButtonLink to="/leaves/approvals" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                  View all ({pendingApps.length})
                </ButtonLink>
              }
            />
            <CardContent>
              {pendingApps.length === 0 ? (
                <EmptyState module="leaves" title="All caught up" description="All leave requests have been reviewed!" />
              ) : (
                <div className="divide-y divide-divider">
                  {pendingApps.slice(0, 5).map((app) => (
                    <div key={app.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-ink-primary">{app.employee_name || 'Staff Member'}</p>
                        <p className="text-xs text-ink-secondary">
                          {app.leave_type_name || 'Leave'} · {app.from_date} to {app.to_date}
                        </p>
                      </div>
                      <ButtonLink to="/leaves/approvals" variant="soft" size="small">
                        Review
                      </ButtonLink>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Holidays & Company Leaves */}
          <Card>
            <CardHeader
              title="Upcoming Company Leaves"
              subtitle="Scheduled public and company holidays"
              action={
                <ButtonLink to="/leaves/company-leaves" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                  Calendar
                </ButtonLink>
              }
            />
            <CardContent>
              {upcomingHolidays.length === 0 ? (
                <EmptyState module="leaves" title="No upcoming holidays" description="No upcoming company holidays scheduled." />
              ) : (
                <div className="divide-y divide-divider">
                  {upcomingHolidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-primary-lighter text-[10px] font-bold text-primary-dark">
                          <span>{new Date(holiday.from_date).toLocaleString('default', { month: 'short' })}</span>
                          <span>{new Date(holiday.from_date).getDate()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{holiday.leave_name}</p>
                          <p className="text-xs text-ink-secondary">{holiday.from_date} {holiday.from_date !== holiday.to_date ? `to ${holiday.to_date}` : ''}</p>
                        </div>
                      </div>
                      <span className="rounded bg-surface-neutral px-2 py-0.5 text-xs font-medium text-ink-primary">
                        {holiday.leave_type || 'Company Holiday'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
