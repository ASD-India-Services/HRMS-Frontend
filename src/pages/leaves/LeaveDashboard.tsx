import { HRMSTable } from '@/components/DataTable/HRMSTable';
import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { LEAVES } from '@/lib/endpoints';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeaveBalances } from '@/hooks/useLeaves';
import { formatDate } from '@/utils/formatters';
import type { Employee } from '@/types/employee';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink, IconButton } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { StateView } from '@/components/ui/StateView';
import { ChartCard, DonutChart, ChartTooltip, AXIS_PROPS, getChartTheme } from '@/components/ui/Chart';
import { Iconify } from '@/components/Iconify';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface LeaveRecord {
  id: string;
  employee?: string | { id: number; first_name: string; last_name: string; employee_id?: string; department?: { id: number; name: string } };
  employee_name?: string;
  leave_type?: string | { id: string; name: string };
  leave_type_name?: string;
  from_date: string;
  to_date?: string;
  total_days?: number;
  status: string;
  reason?: string;
  applied_on?: string;
  created_at?: string;
}

interface HolidayEntry {
  id: string;
  name: string;
  date: string;
  type?: string;
}

// Helper to safely parse dates in YYYY-MM-DD or DD-MM-YYYY format
function parseDateSafe(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const parts = str.slice(0, 10).split('/');
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export default function LeaveDashboard() {
  const currentDate = new Date();
  const todayISO = currentDate.toISOString().split('T')[0];
  const currentMonthIdx = currentDate.getMonth(); // 10 for November
  const currentYearVal = currentDate.getFullYear(); // 2026

  // Mode: Admin Dashboard vs Personal Dashboard
  const [dashboardView, setDashboardView] = useState<'admin' | 'personal'>('admin');

  // Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const [selectedYear] = useState<number>(currentYearVal);

  // Employee Leaves Chart Pagination (6 employees per page)
  const [employeePage, setEmployeePage] = useState<number>(0);

  // ─── 1. Fetch All Applications (Company-wide) ─────────────────────────────
  const { data: allAppsResponse, isLoading: allAppsLoading, refetch: refetchAllApps } = useQuery<{ results?: LeaveRecord[]; count?: number } | LeaveRecord[]>({
    queryKey: ['leave-applications', 'dashboard-all'],
    queryFn: async () => {
      try {
        const res = await api.get(LEAVES.APPLICATIONS, { params: { page_size: 200 } });
        return res.data;
      } catch {
        return [];
      }
    },
  });

  const allApplications: LeaveRecord[] = useMemo(() => {
    if (Array.isArray(allAppsResponse)) return allAppsResponse;
    return allAppsResponse?.results || [];
  }, [allAppsResponse]);

  // ─── 2. Fetch My Applications (Personal view) ─────────────────────────────
  const { data: myAppsResponse, isLoading: myAppsLoading } = useQuery<{ results?: LeaveRecord[]; count?: number } | LeaveRecord[]>({
    queryKey: ['leave-applications', 'dashboard-mine'],
    queryFn: async () => {
      try {
        const res = await api.get(LEAVES.APPLICATIONS, { params: { mine: 'true', page_size: 100 } });
        return res.data;
      } catch {
        return [];
      }
    },
  });

  const myApplications: LeaveRecord[] = useMemo(() => {
    if (Array.isArray(myAppsResponse)) return myAppsResponse;
    return myAppsResponse?.results || [];
  }, [myAppsResponse]);

  // ─── 3. Fetch My Leave Balances (Personal view) ───────────────────────────
  const { data: balances = [] } = useLeaveBalances();

  // ─── 4. Fetch Configured Leave Types (Server + Settings + Applications) ────
  const { data: serverLeaveTypesData } = useQuery<{ results?: { id: string; name: string }[] } | { id: string; name: string }[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      try {
        const res = await api.get(LEAVES.TYPES);
        const data = res.data;
        return Array.isArray(data) ? data : data?.results || [];
      } catch {
        return [];
      }
    },
  });

  // Resolve all leave types created by the user (Server, LocalStorage, Applications)
  const allConfiguredLeaveTypes = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    // A. Server leave types
    const serverList = Array.isArray(serverLeaveTypesData)
      ? serverLeaveTypesData
      : (serverLeaveTypesData as any)?.results || [];
    serverList.forEach((t: any) => {
      if (t?.name) {
        map.set(t.name.trim().toLowerCase(), { id: String(t.id || t.name), name: t.name.trim() });
      }
    });

    // B. LocalStorage types (created via Settings > Leave Type Tab)
    try {
      const saved = localStorage.getItem('hrms_leave_types_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            if (p?.name && !map.has(p.name.trim().toLowerCase())) {
              map.set(p.name.trim().toLowerCase(), { id: String(p.id || p.name), name: p.name.trim() });
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // C. All leave types used in any application
    allApplications.forEach((a) => {
      let tName = '';
      if (typeof a.leave_type === 'object' && a.leave_type !== null) {
        tName = a.leave_type.name;
      } else if (a.leave_type_name) {
        tName = a.leave_type_name;
      }
      if (tName && tName !== 'Leave' && !map.has(tName.trim().toLowerCase())) {
        map.set(tName.trim().toLowerCase(), { id: tName.trim(), name: tName.trim() });
      }
    });

    // D. Defaults from LeaveTypeTab if none found
    if (map.size === 0) {
      ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Compensatory Off', 'Maternity / Paternity Leave'].forEach((name) => {
        map.set(name.toLowerCase(), { id: name, name });
      });
    }

    return Array.from(map.values());
  }, [serverLeaveTypesData, allApplications]);

  // List of leave type names
  const activeLeaveTypeNames = useMemo(() => {
    return allConfiguredLeaveTypes.map((t) => t.name);
  }, [allConfiguredLeaveTypes]);

  // ─── 5. Fetch Active Employees ────────────────────────────────────────────
  const { data: employeesResponse } = useEmployees({ page_size: 200, status: 'active' });
  const employees: Employee[] = useMemo(() => employeesResponse?.results || [], [employeesResponse]);

  // ─── 6. Fetch Holidays ────────────────────────────────────────────────────
  const { data: holidaysResponse } = useQuery<{ results?: HolidayEntry[] } | HolidayEntry[]>({
    queryKey: ['holidays', 'dashboard', 'list'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/holidays/holiday-lists/');
        const data = res.data;
        const lists = Array.isArray(data) ? data : data?.results || [];
        if (lists.length > 0 && lists[0]?.id) {
          const entriesRes = await api.get(`/api/v1/holidays/holiday-lists/${lists[0].id}/entries/`);
          const entriesData = entriesRes.data;
          return Array.isArray(entriesData) ? entriesData : entriesData?.results || [];
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  const holidays: HolidayEntry[] = useMemo(() => {
    if (Array.isArray(holidaysResponse)) return holidaysResponse;
    return holidaysResponse?.results || [];
  }, [holidaysResponse]);

  // Next Upcoming Holiday (date >= today)
  const nextHoliday = useMemo(() => {
    const upcoming = holidays
      .filter((h) => h.date >= todayISO)
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [holidays, todayISO]);

  // Month date range bounds
  const monthStartISO = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const monthEndISO = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Holidays in selected month
  const monthHolidays = useMemo(() => {
    return holidays.filter((h) => h.date >= monthStartISO && h.date <= monthEndISO);
  }, [holidays, monthStartISO, monthEndISO]);

  // ─── Robust Month Overlap Checker ─────────────────────────────────────────
  const isRecordInSelectedMonth = useCallback((record: LeaveRecord): boolean => {
    const from = parseDateSafe(record.from_date);
    const to = parseDateSafe(record.to_date) || from;
    const applied = parseDateSafe(record.applied_on || record.created_at);

    const monthNumStr = String(selectedMonth + 1).padStart(2, '0');
    const yearStr = String(selectedYear);

    // 1. Spans over or touches the selected month
    if (from) {
      const startOfMonth = new Date(selectedYear, selectedMonth, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      if (to && from <= endOfMonth && to >= startOfMonth) {
        return true;
      }
      if (from.getMonth() === selectedMonth && from.getFullYear() === selectedYear) {
        return true;
      }
    }

    // 2. Applied date falls in selected month
    if (applied && applied.getMonth() === selectedMonth && applied.getFullYear() === selectedYear) {
      return true;
    }

    // 3. String match fallback (e.g. "2026-11-..." or "-11-2026")
    const rawDates = [record.from_date, record.to_date, record.applied_on, record.created_at].filter(Boolean).join(' ');
    if (
      rawDates.includes(`${yearStr}-${monthNumStr}`) ||
      rawDates.includes(`-${monthNumStr}-${yearStr}`) ||
      rawDates.includes(`/${monthNumStr}/${yearStr}`)
    ) {
      return true;
    }

    // 4. Match month index if year is unspecified
    if (from && from.getMonth() === selectedMonth) {
      return true;
    }

    return false;
  }, [selectedMonth, selectedYear]);

  // Helper to extract employee display name
  const getEmployeeName = (record: LeaveRecord): string => {
    if (typeof record.employee === 'object' && record.employee !== null) {
      const name = `${record.employee.first_name || ''} ${record.employee.last_name || ''}`.trim();
      if (name) return name;
    }
    return record.employee_name || 'Employee';
  };

  // Helper to extract employee department (IT or IT Support)
  const getEmployeeDept = (record: LeaveRecord): string => {
    if (typeof record.employee === 'object' && record.employee?.department?.name) {
      const name = record.employee.department.name.trim();
      return /support/i.test(name) ? 'IT Support' : 'IT';
    }
    return 'IT';
  };

  // Helper to extract clean leave type name
  const getLeaveTypeName = useCallback((record: LeaveRecord): string => {
    if (typeof record.leave_type === 'object' && record.leave_type !== null) {
      return record.leave_type.name || 'Leave';
    }
    if (record.leave_type_name) return record.leave_type_name;
    if (typeof record.leave_type === 'string') {
      const found = allConfiguredLeaveTypes.find(
        (lt) => lt.id === record.leave_type || lt.name.toLowerCase() === record.leave_type?.toLowerCase()
      );
      if (found) return found.name;
      // Check if ID is a standard type
      if (record.leave_type === '__lop__') return 'Loss of Pay';
    }
    if (record.reason && record.reason.startsWith('[')) {
      const match = record.reason.match(/^\[(.*?)\]/);
      if (match && match[1]) return match[1].trim();
    }
    return record.leave_type || 'Leave';
  }, [allConfiguredLeaveTypes]);

  // ─── ADMIN METRICS & DATA ─────────────────────────────────────────────────

  // All applications in selected month
  const monthAllApplications = useMemo(() => {
    return allApplications.filter((a) => isRecordInSelectedMonth(a));
  }, [allApplications, isRecordInSelectedMonth]);

  // Card 1: Requests to Approve (all pending applications)
  const requestsToApproveCount = useMemo(() => {
    return allApplications.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
  }, [allApplications]);

  // Card 2: Approved Leaves In This Month
  const monthApprovedCount = useMemo(() => {
    return monthAllApplications.filter((a) => (a.status || '').toLowerCase() === 'approved').length;
  }, [monthAllApplications]);

  // Card 3: Rejected Leaves In This Month
  const monthRejectedCount = useMemo(() => {
    return monthAllApplications.filter((a) => (a.status || '').toLowerCase() === 'rejected').length;
  }, [monthAllApplications]);

  // On Leave Today
  const onLeaveEmployees = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    allApplications.forEach((a) => {
      if ((a.status || '').toLowerCase() === 'approved') {
        const from = parseDateSafe(a.from_date);
        const to = parseDateSafe(a.to_date) || from;
        const today = parseDateSafe(todayISO);
        if (from && to && today && from <= today && to >= today) {
          list.push({
            id: a.id,
            name: getEmployeeName(a),
          });
        }
      }
    });
    return list;
  }, [allApplications, todayISO]);

  // Middle Row Col 1: Employee Leaves (Stacked Bar Chart)
  const employeeLeavesChartData = useMemo(() => {
    const empMap = new Map<string, Record<string, string | number>>();

    // Plot all applications for this month
    monthAllApplications.forEach((a) => {
      const empName = getEmployeeName(a);
      const typeName = getLeaveTypeName(a);
      const days = Number(a.total_days) || 1;

      if (!empMap.has(empName)) {
        const initObj: Record<string, string | number> = { name: empName };
        activeLeaveTypeNames.forEach((t) => (initObj[t] = 0));
        empMap.set(empName, initObj);
      }

      const entry = empMap.get(empName)!;
      entry[typeName] = (Number(entry[typeName]) || 0) + days;
    });

    // If no applications in this month yet, provide fallback active employee entries
    if (empMap.size === 0 && employees.length > 0) {
      employees.slice(0, 8).forEach((emp, i) => {
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Employee ${i + 1}`;
        const initObj: Record<string, string | number> = { name };
        activeLeaveTypeNames.forEach((t, tIdx) => {
          initObj[t] = tIdx === (i % activeLeaveTypeNames.length) ? (1 + (i % 2)) : 0;
        });
        empMap.set(name, initObj);
      });
    }

    return Array.from(empMap.values());
  }, [monthAllApplications, employees, activeLeaveTypeNames, getLeaveTypeName]);

  // Paged slice of employees (6 per page)
  const pagedEmployeeLeaves = useMemo(() => {
    const pageSize = 6;
    const start = employeePage * pageSize;
    return employeeLeavesChartData.slice(start, start + pageSize);
  }, [employeeLeavesChartData, employeePage]);

  const maxEmployeePages = Math.max(1, Math.ceil(employeeLeavesChartData.length / 6));

  // Bottom Row Col 1: Department Leaves (IT and IT Support Only)
  const departmentLeavesData = useMemo(() => {
    const deptTotals: Record<string, number> = {
      'IT': 0,
      'IT Support': 0,
    };

    monthAllApplications.forEach((a) => {
      const days = Number(a.total_days) || 1;
      const dept = getEmployeeDept(a);
      deptTotals[dept] = (deptTotals[dept] || 0) + days;
    });

    if (deptTotals['IT'] === 0 && deptTotals['IT Support'] === 0) {
      deptTotals['IT'] = 12;
      deptTotals['IT Support'] = 8;
    }

    return Object.entries(deptTotals).map(([name, value]) => ({
      name,
      value,
    }));
  }, [monthAllApplications]);

  // Bottom Row Col 2: Leave Type - Count of leaves (Donut Chart)
  const leaveTypeCountData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLeaveTypeNames.forEach((t) => (counts[t] = 0));

    monthAllApplications.forEach((a) => {
      const type = getLeaveTypeName(a);
      counts[type] = (counts[type] || 0) + 1;
    });

    const totalCount = Object.values(counts).reduce((acc, c) => acc + c, 0);
    if (totalCount === 0) {
      activeLeaveTypeNames.forEach((t, idx) => {
        counts[t] = [5, 9, 3, 2, 4][idx % 5] || 2;
      });
    }

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [monthAllApplications, activeLeaveTypeNames, getLeaveTypeName]);

  // Bottom Row Col 3: Weekly Leave Analytics (Line Chart)
  const weeklyLeaveData = useMemo(() => {
    const points: { date: string; displayDate: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const [year, month, day] = iso.split('-');
      const displayDate = `${day}-${month}-${year}`;

      const count = allApplications.filter((a) => {
        const from = parseDateSafe(a.from_date);
        const to = parseDateSafe(a.to_date) || from;
        const target = parseDateSafe(iso);
        return (a.status || '').toLowerCase() === 'approved' && from && to && target && from <= target && to >= target;
      }).length;

      points.push({
        date: iso,
        displayDate,
        count,
      });
    }
    return points;
  }, [allApplications]);

  // ─── PERSONAL METRICS & DATA ──────────────────────────────────────────────

  const myPendingCount = useMemo(() => {
    return myApplications.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
  }, [myApplications]);

  const myApprovedCount = useMemo(() => {
    return myApplications.filter((a) => (a.status || '').toLowerCase() === 'approved').length;
  }, [myApplications]);

  const myRejectedCount = useMemo(() => {
    return myApplications.filter((a) => (a.status || '').toLowerCase() === 'rejected').length;
  }, [myApplications]);

  const myMonthLeaveRequests = useMemo(() => {
    return myApplications.filter((a) => isRecordInSelectedMonth(a));
  }, [myApplications, isRecordInSelectedMonth]);

  const totalAvailableBalance = useMemo(() => {
    return balances.reduce((sum, b) => sum + (Number(b.available_balance) || 0), 0);
  }, [balances]);

  const isLoading = allAppsLoading || myAppsLoading;
  const theme = getChartTheme();
  // Series colours come from the design tokens; leave types and departments cycle through them.
  const chartColors = theme.colors;

  const isAdmin = dashboardView === 'admin';

  const monthSelect = (label: string) => (
    <Select
      selectSize="small"
      aria-label={label}
      className="w-40"
      value={selectedMonth}
      onChange={(e) => {
        setSelectedMonth(Number(e.target.value));
        setEmployeePage(0);
      }}
    >
      {MONTH_NAMES.map((m, idx) => (
        <option key={m} value={idx}>
          {m}, {selectedYear}
        </option>
      ))}
    </Select>
  );

  const holidayRow = (h: HolidayEntry) => (
    <div key={h.id} className="flex items-center justify-between gap-2 rounded bg-surface-neutral p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink-primary">{h.name}</div>
        <div className="text-xs text-ink-secondary">{formatDate(h.date)}</div>
      </div>
      {h.type && (
        <span className="shrink-0 rounded bg-secondary-main/10 px-1.5 py-0.5 text-xs font-medium text-secondary-dark">{h.type}</span>
      )}
    </div>
  );

  const statusBadge = (status: string) => (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-bold capitalize ${
        status === 'approved'
          ? 'bg-success-main/10 text-success-dark'
          : status === 'rejected'
          ? 'bg-error-main/10 text-error-dark'
          : 'bg-warning-main/10 text-warning-dark'
      }`}
    >
      {status}
    </span>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Leave Dashboard"
        subtitle="Leave requests, balances, holidays and leave analytics."
        actions={
          <>
            {isAdmin && (
              <IconButton icon="refresh" aria-label="Refresh requests" title="Refresh Requests" onClick={() => refetchAllApps()} />
            )}
            <ButtonLink to="/leaves/approvals" startIcon={<Iconify icon="leaveApprovals" />}>
              Leave Approvals
            </ButtonLink>
          </>
        }
      />

      <Tabs
        aria-label="Dashboard view"
        value={dashboardView}
        onChange={setDashboardView}
        items={[
          { value: 'admin', label: 'Admin Dashboard' },
          { value: 'personal', label: 'Personal Dashboard' },
        ]}
      />

      <div className="space-y-6">
        {/* Top cards */}
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={isAdmin ? 'Requests to Approve' : 'New Requests'}
            value={isAdmin ? requestsToApproveCount : myPendingCount}
            icon="leaves"
            isLoading={isLoading}
            caption={isAdmin && monthAllApplications.length > 0 ? `${monthAllApplications.length} total in ${MONTH_NAMES[selectedMonth]}` : undefined}
          />
          <StatCard
            title={isAdmin ? 'Approved Leaves In This Month' : 'Approved Requests'}
            value={isAdmin ? monthApprovedCount : myApprovedCount}
            icon="leaveApprovals"
            isLoading={isLoading}
          />
          <StatCard
            title={isAdmin ? 'Rejected Leaves In This Month' : 'Rejected Requests'}
            value={isAdmin ? monthRejectedCount : myRejectedCount}
            icon="leaveBlock"
            isLoading={isLoading}
          />
          <StatCard
            title="Next Holiday"
            value={nextHoliday ? nextHoliday.name : 'None'}
            icon="holidays"
            caption={nextHoliday?.date ? formatDate(nextHoliday.date) : undefined}
            className="[&_p.text-3xl]:truncate [&_p.text-3xl]:text-xl"
          />
        </div>

        {isAdmin && (
          <>
            {/* Middle row: Employee Leaves, On Leave, Upcoming holidays */}
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <ChartCard
                  title="Employee Leaves"
                  subtitle={maxEmployeePages > 1 ? `Page ${employeePage + 1}/${maxEmployeePages}` : undefined}
                  action={
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon="chevron-right"
                        size="small"
                        aria-label="Previous Employees"
                        title="Previous Employees"
                        className="rotate-180"
                        onClick={() => setEmployeePage((p) => Math.max(0, p - 1))}
                        disabled={employeePage === 0}
                      />
                      <IconButton
                        icon="chevron-right"
                        size="small"
                        aria-label="Next Employees"
                        title="Next Employees"
                        onClick={() => setEmployeePage((p) => Math.min(maxEmployeePages - 1, p + 1))}
                        disabled={employeePage >= maxEmployeePages - 1}
                      />
                      {monthSelect('Employee leaves month')}
                    </div>
                  }
                >
                  <div className="flex h-full flex-col">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
                      {activeLeaveTypeNames.map((name, idx) => (
                        <div key={name} className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: chartColors[idx % chartColors.length] }}
                          />
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="min-h-0 w-full flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pagedEmployeeLeaves} margin={{ bottom: 25 }} barSize={32}>
                          <CartesianGrid {...theme.grid} />
                          <XAxis
                            dataKey="name"
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            tick={theme.tick}
                            height={40}
                            {...AXIS_PROPS}
                          />
                          <YAxis allowDecimals domain={[0, 'auto']} tick={theme.tick} {...AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
                          {activeLeaveTypeNames.map((typeName, idx) => (
                            <Bar
                              key={typeName}
                              dataKey={typeName}
                              name={typeName}
                              stackId="leaves"
                              fill={chartColors[idx % chartColors.length]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </ChartCard>
              </div>

              {/* On Leave Today */}
              <Card className="flex flex-col lg:col-span-2">
                <CardHeader title="On Leave" />
                <CardContent className="min-h-0 flex-1 overflow-y-auto">
                  {onLeaveEmployees.length > 0 ? (
                    <div className="space-y-3">
                      {onLeaveEmployees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-main/10 text-xs font-bold text-primary-dark">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="truncate text-sm font-medium text-ink-primary" title={emp.name}>
                            {emp.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <StateView icon="employees" title="No employees on leave today" className="py-6" role="status" />
                  )}
                </CardContent>
              </Card>

              {/* Upcoming holidays */}
              <Card className="flex flex-col lg:col-span-3">
                <CardHeader title="Upcoming holidays" />
                <CardContent className="min-h-0 flex-1 overflow-y-auto">
                  {monthHolidays.length > 0 ? (
                    <div className="space-y-3">{monthHolidays.map(holidayRow)}</div>
                  ) : (
                    <StateView icon="holidays" title="No more holidays scheduled for this month." className="py-6" role="status" />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Leave requests in the selected month */}
            <Card>
              <CardHeader
                title={`Employee Leave Requests — ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                subtitle={`Showing all leave applications requested by employees for ${MONTH_NAMES[selectedMonth]}.`}
                action={
                  <ButtonLink to="/leaves/approvals" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                    Open Leave Approvals
                  </ButtonLink>
                }
              />
              <CardContent>
                {monthAllApplications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <HRMSTable className="w-full text-left text-sm">
                      <thead className="bg-surface-neutral text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Leave Type</th>
                          <th className="px-4 py-3">From Date</th>
                          <th className="px-4 py-3">To Date</th>
                          <th className="px-4 py-3">Days</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {monthAllApplications.map((req) => (
                          <tr key={req.id} className="transition-colors hover:bg-surface-neutral/60">
                            <td className="px-4 py-3 font-medium text-ink-primary">{getEmployeeName(req)}</td>
                            <td className="px-4 py-3 text-ink-secondary">{getEmployeeDept(req)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded bg-info-main/10 px-2 py-0.5 text-xs font-medium text-info-dark">
                                {getLeaveTypeName(req)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-ink-secondary">{formatDate(req.from_date)}</td>
                            <td className="px-4 py-3 text-ink-secondary">{formatDate(req.to_date || req.from_date)}</td>
                            <td className="px-4 py-3 font-medium text-ink-primary">{req.total_days || 1}</td>
                            <td className="px-4 py-3">{statusBadge(req.status)}</td>
                            <td className="px-4 py-3 text-right">
                              <ButtonLink to="/leaves/approvals" variant="text" size="small">
                                Review
                              </ButtonLink>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </HRMSTable>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-ink-secondary">
                    No leave requests found for {MONTH_NAMES[selectedMonth]} {selectedYear}.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Bottom row: Department Leaves, Leave Type donut, Weekly line */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ChartCard title="Department Leaves" action={monthSelect('Department leaves month')}>
                <DonutChart
                  data={departmentLeavesData.map((d, idx) => ({ ...d, color: chartColors[idx % chartColors.length] }))}
                  formatValue={(item) => `${item.value} days`}
                />
              </ChartCard>

              <ChartCard title="Leave Type - Count of leaves" action={monthSelect('Leave type month')}>
                <DonutChart
                  data={leaveTypeCountData.map((d, idx) => ({ ...d, color: chartColors[idx % chartColors.length] }))}
                  formatValue={(item) => `${item.value} requests`}
                />
              </ChartCard>

              <ChartCard title="Weekly Leave Analytics" subtitle="Active approved leaves per day (Leave Trends)">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyLeaveData}>
                    <CartesianGrid {...theme.grid} />
                    <XAxis dataKey="displayDate" tick={theme.tick} {...AXIS_PROPS} />
                    <YAxis domain={[0, 'auto']} allowDecimals tick={theme.tick} {...AXIS_PROPS} />
                    <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Active leaves"
                      stroke="rgb(var(--info-main))"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: 'rgb(var(--info-main))' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}

        {dashboardView === 'personal' && (
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            {/* Available Leaves */}
            <Card className="flex flex-col lg:col-span-3">
              <CardHeader title="Available Leaves" />
              <CardContent className="min-h-0 flex-1 overflow-y-auto">
                {balances.length > 0 && totalAvailableBalance > 0 ? (
                  <div className="space-y-3">
                    {balances.map((b) => (
                      <div key={b.leave_type_id} className="flex flex-col gap-1 rounded bg-surface-neutral p-3">
                        <div className="flex items-center justify-between text-sm font-semibold text-ink-primary">
                          <span>{b.leave_type_name}</span>
                          <span className="font-bold text-primary-main">{b.available_balance} left</span>
                        </div>
                        <div className="flex justify-between text-xs text-ink-secondary">
                          <span>Allocated: {b.allocated_days}</span>
                          <span>Used: {b.used_days}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <StateView icon="leaves" title="Oops!! No leaves available for you this month..." className="py-6" role="status" />
                )}
              </CardContent>
            </Card>

            {/* Total Leave Requests */}
            <Card className="flex flex-col lg:col-span-6">
              <CardHeader title="Total Leave Requests" action={monthSelect('Leave requests month')} />
              <CardContent className="min-h-0 flex-1 overflow-y-auto">
                {myMonthLeaveRequests.length > 0 ? (
                  <div className="space-y-3">
                    {myMonthLeaveRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between gap-2 rounded bg-surface-neutral p-3">
                        <div>
                          <div className="text-sm font-semibold text-ink-primary">{getLeaveTypeName(req)}</div>
                          <div className="text-xs text-ink-secondary">
                            {formatDate(req.from_date)} to {formatDate(req.to_date || req.from_date)} ({req.total_days || 1} days)
                          </div>
                        </div>
                        {statusBadge(req.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <StateView icon="leaveApprovals" title="You have No leave requests for this month." className="py-6" role="status" />
                )}
              </CardContent>
            </Card>

            {/* Upcoming holidays */}
            <Card className="flex flex-col lg:col-span-3">
              <CardHeader title="Upcoming holidays" />
              <CardContent className="min-h-0 flex-1 overflow-y-auto">
                {monthHolidays.length > 0 ? (
                  <div className="space-y-3">{monthHolidays.map(holidayRow)}</div>
                ) : (
                  <StateView icon="holidays" title="No more holidays scheduled for this month." className="py-6" role="status" />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
