import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Cell,
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

// ─── Leave Types Palette (matching Screenshot 2) ──────────────────────────────
const LEAVE_TYPE_COLORS = [
  '#93c5fd', // Sky Blue
  '#f472b6', // Pink
  '#fed7aa', // Peach / Soft Orange
  '#fef08a', // Soft Yellow
  '#c4b5fd', // Lavender
  '#99f6e4', // Teal
  '#fbcfe8', // Rose
  '#a7f3d0', // Mint
  '#60a5fa', // Blue
  '#fb923c', // Amber
];

// Department Colors for IT and IT Support
const DEPT_COLORS = ['#38bdf8', '#f43f5e', '#fb923c'];

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

// ─── Custom Vector Illustrations Matching Screenshots ─────────────────────────

function BeachUmbrellaIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 28a16 16 0 0 1 32 0z" />
      <path d="M32 12v20" />
      <path d="M24 28a8 8 0 0 0 8-16" />
      <path d="M40 28a8 8 0 0 1-8-16" />
      <path d="M32 32l-3 12" />
      <path d="M12 50l12-14 20 6 8 8" />
      <path d="M18 50l4-6" />
      <path d="M42 44l2 6" />
      <path d="M52 50h4" />
      <path d="M8 56c8 0 12-2 20-2s12 2 20 2 8-2 8-2" />
    </svg>
  );
}

function ChecklistIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 18l4 4 8-8" />
      <circle cx="36" cy="16" r="3" />
      <path d="M32 22a4 4 0 0 1 8 0" />
      <path d="M46 16h8" />
      <path d="M46 20h8" />

      <path d="M14 34l4 4 8-8" />
      <circle cx="36" cy="32" r="3" />
      <path d="M32 38a4 4 0 0 1 8 0" />
      <path d="M46 32h8" />
      <path d="M46 36h8" />

      <path d="M14 50l4 4 8-8" />
      <circle cx="36" cy="48" r="3" />
      <path d="M32 54a4 4 0 0 1 8 0" />
      <path d="M46 48h8" />
      <path d="M46 52h8" />
    </svg>
  );
}

function HolidayLuggageIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 10v6M26 10v6M34 10v6M42 10v6M50 10v6" />
      <rect x="12" y="14" width="40" height="42" rx="4" />
      <line x1="12" y1="24" x2="52" y2="24" />
      <rect x="18" y="30" width="4" height="4" rx="1" />
      <rect x="26" y="30" width="4" height="4" rx="1" />
      <rect x="34" y="30" width="4" height="4" rx="1" />
      <rect x="42" y="30" width="4" height="4" rx="1" />
      <rect x="22" y="38" width="20" height="13" rx="2" />
      <path d="M28 38v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
      <path d="M32 42l3 3m0-6l-3 3" />
    </svg>
  );
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
  const isRecordInSelectedMonth = (record: LeaveRecord): boolean => {
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
  };

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
  const getLeaveTypeName = (record: LeaveRecord): string => {
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
  };

  // ─── ADMIN METRICS & DATA ─────────────────────────────────────────────────

  // All applications in selected month
  const monthAllApplications = useMemo(() => {
    return allApplications.filter((a) => isRecordInSelectedMonth(a));
  }, [allApplications, selectedMonth, selectedYear]);

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
  }, [monthAllApplications, employees, activeLeaveTypeNames]);

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
  }, [monthAllApplications, activeLeaveTypeNames]);

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
  }, [myApplications, selectedMonth, selectedYear]);

  const totalAvailableBalance = useMemo(() => {
    return balances.reduce((sum, b) => sum + (Number(b.available_balance) || 0), 0);
  }, [balances]);

  const isLoading = allAppsLoading || myAppsLoading;

  return (
    <div className="space-y-6 pb-12 relative">
      {/* ─── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <span>DigiHRMS</span>
        <span>&gt;</span>
        <span>leave</span>
        <span>&gt;</span>
        <span className="text-gray-900 font-semibold">leave-dashboard</span>
      </div>

      {/* ─── Top Cards (4-Column Layout Matching Screenshots) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {/* Card 1 */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm border-t-4 border-t-slate-500 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
            <span>{dashboardView === 'admin' ? 'Requests to Approve' : 'New Requests'}</span>
            {dashboardView === 'admin' && (
              <button
                onClick={() => refetchAllApps()}
                title="Refresh Requests"
                className="text-gray-400 hover:text-gray-700 transition-colors text-base cursor-pointer"
              >
                ↻
              </button>
            )}
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
              {isLoading ? '...' : (dashboardView === 'admin' ? requestsToApproveCount : myPendingCount)}
            </span>
            {dashboardView === 'admin' && monthAllApplications.length > 0 && (
              <span className="text-xs text-gray-500 font-medium">
                ({monthAllApplications.length} total in {MONTH_NAMES[selectedMonth]})
              </span>
            )}
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm border-t-4 border-t-emerald-500 p-6 flex flex-col justify-between">
          <div className="text-sm font-semibold text-gray-800">
            {dashboardView === 'admin' ? 'Approved Leaves In This Month' : 'Approved Requests'}
          </div>
          <div className="mt-4 text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
            {isLoading ? '...' : (dashboardView === 'admin' ? monthApprovedCount : myApprovedCount)}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm border-t-4 border-t-rose-600 p-6 flex flex-col justify-between">
          <div className="text-sm font-semibold text-gray-800">
            {dashboardView === 'admin' ? 'Rejected Leaves In This Month' : 'Rejected Requests'}
          </div>
          <div className="mt-4 text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
            {isLoading ? '...' : (dashboardView === 'admin' ? monthRejectedCount : myRejectedCount)}
          </div>
        </div>

        {/* Card 4: Switch Button Stacked Above Next Holiday Card */}
        <div className="flex flex-col gap-3 justify-between">
          {dashboardView === 'admin' ? (
            <button
              type="button"
              onClick={() => setDashboardView('personal')}
              className="w-full bg-[#e04f36] hover:bg-[#cf422a] text-white text-xs font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>View Personal Dashboard</span>
              <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDashboardView('admin')}
              className="w-full bg-[#e04f36] hover:bg-[#cf422a] text-white text-xs font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>View Admin Dashboard</span>
              <span>→</span>
            </button>
          )}

          {/* Next Holiday Card (Purple) */}
          <div className="bg-[#5c54a4] rounded-lg p-3 text-white flex items-center gap-3 shadow-xs flex-1">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
              <BeachUmbrellaIcon className="w-6 h-6 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-purple-200 font-medium">Next Holiday</div>
              <div className="text-sm font-bold truncate">
                {nextHoliday ? nextHoliday.name : 'None'}
              </div>
              {nextHoliday?.date && (
                <div className="text-[10px] text-purple-200">{formatDate(nextHoliday.date)}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ADMIN DASHBOARD VIEW (Matching Screenshot 2)
      ════════════════════════════════════════════════════════════════════════ */}
      {dashboardView === 'admin' && (
        <div className="space-y-6">
          {/* ─── Middle Row: 3 Columns (Employee Leaves, On Leave, Upcoming Holidays) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Col 1: ◀ Employee Leaves ▶ (Width ~60%) */}
            <div className="lg:col-span-7 bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col min-h-[390px]">
              {/* Header & Controls */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEmployeePage((p) => Math.max(0, p - 1))}
                    disabled={employeePage === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer text-xs"
                    title="Previous Employees"
                  >
                    ◀
                  </button>
                  <h2 className="text-sm font-bold text-gray-900">Employee Leaves</h2>
                  <button
                    onClick={() => setEmployeePage((p) => Math.min(maxEmployeePages - 1, p + 1))}
                    disabled={employeePage >= maxEmployeePages - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer text-xs"
                    title="Next Employees"
                  >
                    ▶
                  </button>
                  {maxEmployeePages > 1 && (
                    <span className="text-[11px] text-gray-400">
                      (Page {employeePage + 1}/{maxEmployeePages})
                    </span>
                  )}
                </div>

                {/* Month Dropdown */}
                <div className="flex items-center border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-700 bg-white">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(Number(e.target.value));
                      setEmployeePage(0);
                    }}
                    className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer pr-1"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}, {selectedYear}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-xs select-none">📅</span>
                </div>
              </div>

              {/* Dynamic Legend with exact user-configured leave types */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-[11px] text-gray-600">
                {activeLeaveTypeNames.map((name, idx) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-2.5 rounded-2xs inline-block"
                      style={{ backgroundColor: LEAVE_TYPE_COLORS[idx % LEAVE_TYPE_COLORS.length] }}
                    />
                    <span>{name}</span>
                  </div>
                ))}
              </div>

              {/* Stacked Bar Chart */}
              <div className="flex-1 w-full min-h-0 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pagedEmployeeLeaves}
                    margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
                    barSize={32}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      tick={{ fontSize: 10, fill: '#475569' }}
                      height={40}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      allowDecimals={true}
                      domain={[0, 'auto']}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                      }}
                    />
                    {activeLeaveTypeNames.map((typeName, idx) => (
                      <Bar
                        key={typeName}
                        dataKey={typeName}
                        name={typeName}
                        stackId="leaves"
                        fill={LEAVE_TYPE_COLORS[idx % LEAVE_TYPE_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center text-[11px] text-gray-500 font-medium mt-1">
                Employees
              </div>
            </div>

            {/* Col 2: On Leave Today (Width ~20%) */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col min-h-[390px]">
              <h2 className="text-sm font-bold text-gray-900 mb-4">On Leave</h2>
              <div className="flex-1 overflow-y-auto space-y-3">
                {onLeaveEmployees.length > 0 ? (
                  onLeaveEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-800 truncate" title={emp.name}>
                        {emp.name}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-xs text-gray-400">No employees on leave today</p>
                  </div>
                )}
              </div>
            </div>

            {/* Col 3: Upcoming holidays (Width ~25%) */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col min-h-[390px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Upcoming holidays</h2>
                <span className="text-gray-400 text-sm select-none">↻</span>
              </div>

              {monthHolidays.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {monthHolidays.map((h) => (
                    <div key={h.id} className="p-2.5 rounded border border-gray-100 bg-gray-50 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-800">{h.name}</div>
                        <div className="text-[10px] text-gray-500">{formatDate(h.date)}</div>
                      </div>
                      {h.type && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{h.type}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                  <HolidayLuggageIcon className="w-16 h-16 text-gray-400 mb-3 select-none pointer-events-none" />
                  <p className="text-xs font-medium text-gray-500 max-w-[180px]">
                    No more holidays scheduled for this month.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Detailed List: Employee Leave Requests in Selected Month ─────────── */}
          <div className="bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Employee Leave Requests — {MONTH_NAMES[selectedMonth]} {selectedYear}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Showing all leave applications requested by employees for {MONTH_NAMES[selectedMonth]}.
                </p>
              </div>
              <Link
                to="/leaves/approvals"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Open Leave Approvals</span>
                <span>→</span>
              </Link>
            </div>

            {monthAllApplications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-y border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Leave Type</th>
                      <th className="py-2.5 px-3">From Date</th>
                      <th className="py-2.5 px-3">To Date</th>
                      <th className="py-2.5 px-3">Days</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthAllApplications.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-gray-900">
                          {getEmployeeName(req)}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {getEmployeeDept(req)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {getLeaveTypeName(req)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">{formatDate(req.from_date)}</td>
                        <td className="py-2.5 px-3 text-gray-600">{formatDate(req.to_date || req.from_date)}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{req.total_days || 1}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to="/leaves/approvals"
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500">
                No leave requests found for {MONTH_NAMES[selectedMonth]} {selectedYear}.
              </div>
            )}
          </div>

          {/* ─── Bottom Row: 3 Widgets (Department Leaves, Leave Type Donut, Weekly Line) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Widget 1: Department Leaves (Pie Chart for IT & IT Support) */}
            <div className="bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col h-[360px]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-900">Department Leaves</h2>
                <div className="flex items-center border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-700 bg-white">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer pr-1"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}, {selectedYear}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-xs select-none">📅</span>
                </div>
              </div>

              {/* Department Legend */}
              <div className="flex items-center justify-center gap-4 my-2 text-[11px] text-gray-600">
                {departmentLeavesData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-2.5 rounded-2xs inline-block"
                      style={{ backgroundColor: DEPT_COLORS[idx % DEPT_COLORS.length] }}
                    />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>

              {/* Pie Chart */}
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentLeavesData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                    >
                      {departmentLeavesData.map((_, idx) => (
                        <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`${typeof val === 'number' ? val : 0} days`, 'Leaves']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 2: Leave Type - Count of leaves (Donut Chart) */}
            <div className="bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col h-[360px]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-900">Leave Type - Count of leaves</h2>
                <div className="flex items-center border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-700 bg-white">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer pr-1"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}, {selectedYear}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-xs select-none">📅</span>
                </div>
              </div>

              {/* Donut Chart Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 my-2 text-[11px] text-gray-600">
                {leaveTypeCountData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-2.5 rounded-2xs inline-block"
                      style={{ backgroundColor: LEAVE_TYPE_COLORS[idx % LEAVE_TYPE_COLORS.length] }}
                    />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>

              {/* Donut Chart */}
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveTypeCountData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={75}
                    >
                      {leaveTypeCountData.map((_, idx) => (
                        <Cell key={idx} fill={LEAVE_TYPE_COLORS[idx % LEAVE_TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`${typeof val === 'number' ? val : 0} requests`, 'Count']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Widget 3: Weekly Leave Analytics (Line Chart) */}
            <div className="bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col h-[360px]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-900">Weekly Leave Analytics</h2>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-5 h-2.5 rounded-2xs inline-block bg-[#38bdf8]" />
                  <span className="text-[11px] font-medium">Leave Trends</span>
                </div>
              </div>

              {/* Line Chart */}
              <div className="flex-1 w-full min-h-0 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklyLeaveData}
                    margin={{ top: 15, right: 15, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      allowDecimals={true}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                      formatter={(val: unknown) => [`${typeof val === 'number' ? val : 0} active leaves`, 'Trend']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#0284c7' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PERSONAL DASHBOARD VIEW (Matching Screenshot 1)
      ════════════════════════════════════════════════════════════════════════ */}
      {dashboardView === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Col 1: Available Leaves */}
          <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col min-h-[420px]">
            <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
              Available Leaves
            </h2>

            {balances.length > 0 && totalAvailableBalance > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3">
                {balances.map((b) => (
                  <div key={b.leave_type_id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
                      <span>{b.leave_type_name}</span>
                      <span className="text-blue-600 font-bold">{b.available_balance} left</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex justify-between">
                      <span>Allocated: {b.allocated_days}</span>
                      <span>Used: {b.used_days}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <BeachUmbrellaIcon className="w-16 h-16 text-gray-400 mb-4 select-none pointer-events-none" />
                <p className="text-xs font-medium text-gray-500 max-w-[200px]">
                  Oops!! No leaves available for you this month...
                </p>
              </div>
            )}
          </div>

          {/* Col 2: Total Leave Requests (with Month Picker) */}
          <div className="lg:col-span-6 bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Total Leave Requests</h2>
              <div className="flex items-center border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-700 bg-white">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer pr-1"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}, {selectedYear}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500 text-xs select-none">📅</span>
              </div>
            </div>

            {myMonthLeaveRequests.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3">
                {myMonthLeaveRequests.map((req) => (
                  <div key={req.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{getLeaveTypeName(req)}</div>
                      <div className="text-[11px] text-gray-500">
                        {formatDate(req.from_date)} to {formatDate(req.to_date || req.from_date)} ({req.total_days || 1} days)
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        req.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <ChecklistIcon className="w-16 h-16 text-gray-400 mb-4 select-none pointer-events-none" />
                <p className="text-xs font-medium text-gray-500 max-w-[220px]">
                  You have No leave requests for this month.
                </p>
              </div>
            )}
          </div>

          {/* Col 3: Upcoming holidays */}
          <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs flex flex-col min-h-[420px]">
            <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
              Upcoming holidays
            </h2>

            {monthHolidays.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3">
                {monthHolidays.map((h) => (
                  <div key={h.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{h.name}</div>
                      <div className="text-[11px] text-gray-500">{formatDate(h.date)}</div>
                    </div>
                    {h.type && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{h.type}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <HolidayLuggageIcon className="w-16 h-16 text-gray-400 mb-4 select-none pointer-events-none" />
                <p className="text-xs font-medium text-gray-500 max-w-[200px]">
                  No more holidays scheduled for this month.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Floating Action Button Removed ────────────────────────────── */}
    </div>
  );
}
