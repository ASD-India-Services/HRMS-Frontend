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
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard, ChartTooltip, AXIS_PROPS, getChartTheme } from '@/components/ui/Chart';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';
import api from '@/lib/api';
import { ATTENDANCE } from '@/lib/endpoints';

interface AttendanceItem {
  id: string;
  employee_name?: string;
  employee?: string;
  attendance_date?: string;
  date?: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | string;
  is_late?: boolean;
  working_hours?: string | number | null;
}

const STATUS_COLORS: Record<string, string> = {
  present: 'rgb(var(--success-main))',
  late: 'rgb(var(--warning-main))',
  half_day: 'rgb(var(--secondary-main))',
  absent: 'rgb(var(--error-main))',
  on_leave: 'rgb(var(--info-main))',
  holiday: 'rgb(var(--grey-500))',
};

export default function AttendanceDashboard() {
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch today's attendance logs
  const { data: todayAttendance, isLoading: todayLoading } = useQuery<{ results?: AttendanceItem[]; count?: number } | AttendanceItem[]>({
    queryKey: ['attendance', 'dashboard', 'today', todayStr],
    queryFn: async () => {
      try {
        const res = await api.get(ATTENDANCE.LIST, { params: { date: todayStr, page_size: 100 } });
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // Fetch 7-day attendance trend chart from backend reports or recent logs
  const { data: trendData, isLoading: trendLoading } = useQuery<{ data: { label: string; value: number }[] }>({
    queryKey: ['attendance', 'dashboard', 'trend'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/reports/dashboard-charts/', { params: { chart: 'attendance-overview' } });
        return res.data;
      } catch {
        // Fallback dummy days for smooth visualization if reports endpoint is empty
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return { data: days.map((d) => ({ label: d, value: 0 })) };
      }
    },
  });

  // Fetch total active employees to compute rate
  const { data: employeesData } = useQuery<{ count?: number }>({
    queryKey: ['employees', 'count', 'active'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/employees/', { params: { status: 'active', page_size: 1 } });
        return res.data;
      } catch {
        return { count: 0 };
      }
    },
  });

  const records: AttendanceItem[] = Array.isArray(todayAttendance)
    ? todayAttendance
    : todayAttendance?.results ?? [];

  const totalEmployees = employeesData?.count || (records.length > 0 ? records.length : 25);
  const presentCount = records.filter((r) => (r.status || '').toLowerCase() === 'present' || !!r.check_in).length;
  const lateCount = records.filter((r) => r.is_late).length;
  const onLeaveCount = records.filter((r) => (r.status || '').toLowerCase() === 'on_leave').length;
  const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);

  const attendanceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  // Pie chart data
  const statusPieData = [
    { name: 'Present On-Time', value: Math.max(0, presentCount - lateCount), color: 'rgb(var(--success-main))' },
    { name: 'Late Check-in', value: lateCount, color: 'rgb(var(--warning-main))' },
    { name: 'On Leave', value: onLeaveCount, color: 'rgb(var(--info-main))' },
    { name: 'Absent / Unlogged', value: absentCount, color: 'rgb(var(--error-main))' },
  ].filter((d) => d.value > 0);

  const chartTrend = trendData?.data ?? [];

  const recentRecords = records.slice(0, 6);

  const theme = getChartTheme();
  return (
    <PageContainer>
      <PageHeader
        title="Attendance Dashboard"
        subtitle="Workforce attendance tracking, punctuality metrics, and daily working hours overview."
        actions={
          <>
            <ButtonLink to="/attendance/hour-account" variant="outlined" color="inherit" startIcon={<Iconify icon="attendance" />}>
              Hour Account
            </ButtonLink>
            <ButtonLink to="/attendance/work-records" startIcon={<Iconify icon="attendanceRegister" />}>
              Work Records
            </ButtonLink>
          </>
        }
      />
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            icon="success"
            isLoading={todayLoading}
            caption={`${presentCount} of ${totalEmployees} employees present`}
          />
          <StatCard
            title="Present Today"
            value={presentCount}
            icon="employees"
            href="/attendance-register"
            isLoading={todayLoading}
            caption="Checked-in · Open attendance register"
          />
          <StatCard
            title="Late Arrivals"
            value={lateCount}
            icon="attendance"
            isLoading={todayLoading}
            caption="After grace period"
          />
          <StatCard
            title="On Leave / Absent"
            value={onLeaveCount + absentCount}
            icon="leaves"
            href="/leaves/approvals"
            isLoading={todayLoading}
            caption={`${onLeaveCount} on approved leave · Check leave records`}
          />
        </div>

        {/* Visual Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Weekly Attendance Trend */}
          <ChartCard
            title="7-Day Attendance Trend"
            subtitle="Daily present employee volume over the past week"
            isLoading={trendLoading}
            isEmpty={chartTrend.length === 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrend}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--info-main))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="rgb(var(--info-main))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...theme.grid} />
                <XAxis dataKey="label" tick={theme.tick} {...AXIS_PROPS} />
                <YAxis allowDecimals={false} tick={theme.tick} {...AXIS_PROPS} />
                <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
                <Area type="monotone" dataKey="value" name="Employees" stroke="rgb(var(--info-main))" strokeWidth={2} fillOpacity={1} fill="url(#attendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Status Distribution */}
          <ChartCard
            title="Today's Attendance Breakdown"
            subtitle={`Distribution of present, late, on-leave and absent · ${totalEmployees} total`}
            isEmpty={statusPieData.length === 0}
          >
            <div className="flex h-full flex-col items-center justify-around sm:flex-row">
              <div className="h-full w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`status-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-2.5 text-xs sm:w-1/2">
                {statusPieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-ink-primary">{item.name}</span>
                    </span>
                    <span className="font-semibold text-ink-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Today's Activity Table */}
        <Card>
          <CardHeader
            title="Today's Attendance Activity"
            subtitle="Real-time check-ins and time logs"
            action={
              <ButtonLink to="/attendance-register" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                View full register
              </ButtonLink>
            }
          />
          <CardContent>
            {recentRecords.length === 0 ? (
              <EmptyState module="attendance" title="No activity yet" description="No check-in activity recorded today yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-neutral text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Check In</th>
                      <th className="px-4 py-3">Check Out</th>
                      <th className="px-4 py-3">Worked Hours</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {recentRecords.map((rec) => (
                      <tr key={rec.id} className="transition-colors hover:bg-surface-neutral/60">
                        <td className="px-4 py-3 font-medium text-ink-primary">
                          {rec.employee_name || 'Staff Member'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-secondary">
                          {rec.check_in ? rec.check_in.slice(0, 5) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-secondary">
                          {rec.check_out ? rec.check_out.slice(0, 5) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-primary">
                          {rec.working_hours ? String(rec.working_hours) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[rec.status || 'present'] || 'rgb(var(--success-main))'} 8%, transparent)`,
                              color: STATUS_COLORS[rec.status || 'present'] || 'rgb(var(--success-main))',
                            }}
                          >
                            {rec.is_late ? 'Late' : rec.status || 'Present'}
                          </span>
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
