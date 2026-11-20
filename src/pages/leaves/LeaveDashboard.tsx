import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
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
import { LEAVES } from '@/lib/endpoints';

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

const TYPE_COLORS = ['rgb(var(--info-main))', 'rgb(var(--success-main))', 'rgb(var(--warning-main))', 'rgb(var(--secondary-main))', 'rgb(var(--error-light))', 'rgb(var(--primary-main))'];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Leave Management Dashboard</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Workforce absence forecasting, pending approval workflows, and leave quota analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/leaves/company-leaves"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md border border-divider bg-surface-paper text-ink-primary hover:bg-surface-neutral shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Company Leaves
          </Link>
          <Link
            to="/leaves/approvals"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-white bg-primary-main hover:bg-primary-dark shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Leave Approvals
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* On Leave Today */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              On Leave Today
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-lighter text-primary-main">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{isLoading ? '...' : onLeaveToday}</span>
            <span className="ml-2 text-xs text-primary-main font-medium">staff members</span>
          </div>
          <div className="mt-2 text-xs text-ink-secondary">
            Active approved absences
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Pending Approvals
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-600">{isLoading ? '...' : pendingApps.length}</span>
            <span className="ml-2 text-xs text-amber-700 font-medium">requests awaiting action</span>
          </div>
          <div className="mt-2 text-xs text-amber-600 font-medium">
            <Link to="/leaves/approvals" className="hover:underline">Review pending requests →</Link>
          </div>
        </div>

        {/* Approved Leaves */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Approved Requests
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{isLoading ? '...' : approvedApps.length}</span>
            <span className="ml-2 text-xs text-emerald-600 font-semibold">Total Approved</span>
          </div>
          <div className="mt-2 text-xs text-ink-secondary">
            <span>Successful leave periods</span>
          </div>
        </div>

        {/* Configured Policies */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Leave Policies
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">{isLoading ? '...' : leaveTypes.length}</span>
            <span className="ml-2 text-xs text-purple-600 font-medium">Types Configured</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 font-medium">
            <Link to="/leave-policies" className="hover:underline">Manage policies →</Link>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Breakdown */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Application Status Distribution</h2>
              <p className="text-xs text-ink-secondary">Breakdown of submitted leave requests</p>
            </div>
            <Link to="/leaves/approvals" className="text-xs font-medium text-primary-main hover:underline">
              Approvals Queue →
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--grey-200))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Applications']}
                  contentStyle={{ backgroundColor: 'rgb(var(--surface-paper))', borderRadius: '8px', border: '1px solid rgb(var(--grey-300))' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`leave-status-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leaves by Type */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Leaves by Type</h2>
              <p className="text-xs text-ink-secondary">Distribution across Casual, Sick, Earned and other types</p>
            </div>
            <span className="text-xs font-medium text-ink-secondary">{typeChartData.length} Categories</span>
          </div>
          {typeChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-ink-disabled">
              No leave applications recorded
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around h-64">
              <div className="w-full sm:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {typeChartData.map((_, index) => (
                        <Cell key={`type-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Requests']}
                      contentStyle={{ backgroundColor: 'rgb(var(--surface-paper))', borderRadius: '8px', border: '1px solid rgb(var(--grey-300))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2 text-xs">
                {typeChartData.slice(0, 5).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[idx % TYPE_COLORS.length] }}
                      />
                      <span className="text-ink-primary truncate max-w-[140px]">{item.name}</span>
                    </span>
                    <span className="font-semibold text-ink-primary">{item.value} requests</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Section: Pending Approvals & Upcoming Holidays */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Approvals Table */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Pending Leave Approvals</h2>
              <p className="text-xs text-ink-secondary">Requires supervisor or HR decision</p>
            </div>
            <Link to="/leaves/approvals" className="text-xs font-semibold text-primary-main hover:underline">
              View all ({pendingApps.length}) →
            </Link>
          </div>
          {pendingApps.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-disabled">All leave requests have been reviewed!</p>
          ) : (
            <div className="divide-y divide-divider">
              {pendingApps.slice(0, 5).map((app) => (
                <div key={app.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-primary">{app.employee_name || 'Staff Member'}</p>
                    <p className="text-xs text-ink-secondary">
                      {app.leave_type_name || 'Leave'} · {app.from_date} to {app.to_date}
                    </p>
                  </div>
                  <Link
                    to="/leaves/approvals"
                    className="px-3 py-1 text-xs font-semibold rounded bg-primary-lighter text-primary-dark hover:bg-primary-lighter transition-colors"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Holidays & Company Leaves */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Upcoming Company Leaves</h2>
              <p className="text-xs text-ink-secondary">Scheduled public and company holidays</p>
            </div>
            <Link to="/leaves/company-leaves" className="text-xs font-semibold text-primary-main hover:underline">
              Calendar →
            </Link>
          </div>
          {upcomingHolidays.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-disabled">No upcoming company holidays scheduled.</p>
          ) : (
            <div className="divide-y divide-divider">
              {upcomingHolidays.map((holiday) => (
                <div key={holiday.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-lighter text-primary-dark flex flex-col items-center justify-center text-[10px] font-bold">
                      <span>{new Date(holiday.from_date).toLocaleString('default', { month: 'short' })}</span>
                      <span>{new Date(holiday.from_date).getDate()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{holiday.leave_name}</p>
                      <p className="text-xs text-ink-secondary">{holiday.from_date} {holiday.from_date !== holiday.to_date ? `to ${holiday.to_date}` : ''}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-surface-neutral text-ink-primary">
                    {holiday.leave_type || 'Company Holiday'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

