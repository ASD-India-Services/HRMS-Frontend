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
  present: '#10b981',
  late: '#f59e0b',
  half_day: '#8b5cf6',
  absent: '#ef4444',
  on_leave: '#3b82f6',
  holiday: '#6b7280',
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
    { name: 'Present On-Time', value: Math.max(0, presentCount - lateCount), color: '#10b981' },
    { name: 'Late Check-in', value: lateCount, color: '#f59e0b' },
    { name: 'On Leave', value: onLeaveCount, color: '#3b82f6' },
    { name: 'Absent / Unlogged', value: absentCount, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const chartTrend = trendData?.data ?? [];

  const recentRecords = records.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Attendance Dashboard</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Workforce attendance tracking, punctuality metrics, and daily working hours overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/attendance/hour-account"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md border border-divider bg-surface-paper text-ink-primary hover:bg-surface-neutral shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Hour Account
          </Link>
          <Link
            to="/attendance/work-records"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-white bg-primary-main hover:bg-primary-dark shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Work Records
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance Rate */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Attendance Rate
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{todayLoading ? '...' : `${attendanceRate}%`}</span>
            <span className="ml-2 text-xs text-emerald-600 font-medium">overall workforce</span>
          </div>
          <div className="mt-2 text-xs text-ink-secondary">
            {presentCount} of {totalEmployees} employees present
          </div>
        </div>

        {/* Present Today */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Present Today
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-lighter text-primary-main">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{todayLoading ? '...' : presentCount}</span>
            <span className="ml-2 text-xs text-primary-main font-medium">Checked-in</span>
          </div>
          <div className="mt-2 text-xs text-primary-main font-medium">
            <Link to="/attendance-register" className="hover:underline">Open attendance register →</Link>
          </div>
        </div>

        {/* Late Check-ins */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Late Arrivals
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{todayLoading ? '...' : lateCount}</span>
            <span className="ml-2 text-xs text-amber-600 font-medium">after grace period</span>
          </div>
          <div className="mt-2 text-xs text-ink-secondary">
            <span>Punctuality check</span>
          </div>
        </div>

        {/* Absent / Leave */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              On Leave / Absent
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{todayLoading ? '...' : onLeaveCount + absentCount}</span>
            <span className="ml-2 text-xs text-ink-secondary">({onLeaveCount} on approved leave)</span>
          </div>
          <div className="mt-2 text-xs text-rose-600 font-medium">
            <Link to="/leaves/approvals" className="hover:underline">Check leave records →</Link>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Attendance Trend */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">7-Day Attendance Trend</h2>
              <p className="text-xs text-ink-secondary">Daily present employee volume over the past week</p>
            </div>
            <span className="text-xs font-medium text-ink-secondary">Live summary</span>
          </div>
          <div className="h-64 w-full">
            {trendLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-ink-disabled">Loading trend...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTrend} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Employees']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#attendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Today's Attendance Breakdown</h2>
              <p className="text-xs text-ink-secondary">Distribution of present, late, on-leave and absent</p>
            </div>
            <span className="text-xs font-medium text-ink-secondary">{totalEmployees} Total</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-around h-64">
            <div className="w-full sm:w-1/2 h-full">
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
                  <Tooltip
                    formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Employees']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 space-y-2.5 text-xs">
              {statusPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-ink-primary">{item.name}</span>
                  </span>
                  <span className="font-semibold text-ink-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Activity Table */}
      <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-ink-primary">Today's Attendance Activity</h2>
            <p className="text-xs text-ink-secondary">Real-time check-ins and time logs</p>
          </div>
          <Link to="/attendance-register" className="text-xs font-semibold text-primary-main hover:underline">
            View full register →
          </Link>
        </div>
        {recentRecords.length === 0 ? (
          <div className="py-8 text-center text-sm text-ink-disabled">
            No check-in activity recorded today yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-divider bg-surface-neutral text-xs font-semibold text-ink-secondary uppercase tracking-wider">
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
                  <tr key={rec.id} className="hover:bg-surface-neutral/60 transition-colors">
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
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                        style={{
                          backgroundColor: `${STATUS_COLORS[rec.status || 'present'] || '#10b981'}15`,
                          color: STATUS_COLORS[rec.status || 'present'] || '#10b981',
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
      </div>
    </div>
  );
}

