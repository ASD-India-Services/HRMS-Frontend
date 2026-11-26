import { HRMSTable } from '@/components/DataTable/HRMSTable';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DEPARTMENTS, DESIGNATIONS, BRANCHES, SHIFTS, HR_SETTINGS } from '@/lib/endpoints';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import {
  useHourAccounts,
  useCreateHourAccount,
  useUpdateHourAccount,
  useDeleteHourAccount,
  useBulkDeleteHourAccounts,
  useSyncHourAccounts,
} from '@/hooks/useHourAccounts';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanyLeaves, type CompanyLeave } from '@/hooks/useCompanyLeaves';
import type { HourAccount, HourAccountFilterParams } from '@/types/hourAccount';
import { Select } from '@/components/ui/Select';
import { Button, IconButton } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { StateView } from '@/components/ui/StateView';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SegmentedButton } from '@/components/ui/SegmentedControl/SegmentedControl';

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

const WORK_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Remote',
  'Hybrid',
  'Freelance',
  'Permanent',
  'Probation',
];

const GROUP_BY_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'employee_name', label: 'Employee' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'country', label: 'Country' },
  { value: 'reporting_manager', label: 'Reporting Manager' },
  { value: 'shift_name', label: 'Shift' },
  { value: 'work_type', label: 'Work Type' },
  { value: 'department_name', label: 'Department' },
  { value: 'job_position', label: 'Job Position' },
  { value: 'employment_type', label: 'Employment Type' },
  { value: 'company_name', label: 'Company' },
];

function parseHoursToMinutes(timeStr?: string): number | null {
  if (!timeStr || !timeStr.trim()) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m;
    }
  }
  const num = parseFloat(timeStr);
  if (!isNaN(num)) return Math.round(num * 60);
  return null;
}

function formatMinutesToHours(minutes: number): string {
  const isNeg = minutes < 0;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = isNeg ? '-' : '';
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface WeekDefinition {
  weekKey: string;
  weekNumber: number;
  label: string;
  dateRange: string;
  startDay: number;
  endDay: number;
  workingDays: number;
}

/**
 * Checks whether a calendar day is a company holiday / non-working day.
 * Respects Company Leave rules from the Company Holidays/Leaves configuration page:
 * - Recurring: based_on_week (all, second_week, fourth_week) & based_on_week_day (sunday, saturday)
 * Default Company Policy:
 * - All Sundays are holidays
 * - 2nd and 4th Saturday of each month are holidays
 * - 1st, 3rd, and 5th Saturdays are WORKING DAYS (along with Monday through Friday)
 */
export function isCompanyHolidayDay(
  day: number,
  monthIdx: number,
  year: number,
  companyLeaves?: CompanyLeave[]
): boolean {
  const date = new Date(year, monthIdx, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const weekOccurrence = Math.floor((day - 1) / 7) + 1; // 1, 2, 3, 4, 5

  const weekKeys = ['first_week', 'second_week', 'third_week', 'fourth_week', 'fifth_week'];
  const weekStr = weekKeys[weekOccurrence - 1] || 'fifth_week';

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayStr = dayKeys[dayOfWeek];

  if (companyLeaves && companyLeaves.length > 0) {
    const isLeave = companyLeaves.some((cl) => {
      if (!cl.is_active) return false;
      const matchDay = cl.based_on_week_day?.toLowerCase() === dayStr;
      const matchWeek =
        cl.based_on_week?.toLowerCase() === 'all' ||
        cl.based_on_week?.toLowerCase() === weekStr;
      return matchDay && matchWeek;
    });
    return isLeave;
  }

  // Fallback to default company holiday policy (All Sundays + 2nd & 4th Saturday off)
  if (dayOfWeek === 0) return true; // All Sundays
  if (dayOfWeek === 6 && (weekOccurrence === 2 || weekOccurrence === 4)) return true; // 2nd & 4th Saturday

  return false;
}

export function getWeeksForMonth(
  monthName: string,
  year: number,
  companyLeaves?: CompanyLeave[]
): WeekDefinition[] {
  const monthIdx = MONTH_NAMES.findIndex(
    (m) => m.toLowerCase() === monthName.toLowerCase()
  );
  const validMonthIdx = monthIdx >= 0 ? monthIdx : 10; // default November
  const totalDays = new Date(year, validMonthIdx + 1, 0).getDate();
  const shortMonth = MONTH_NAMES[validMonthIdx].slice(0, 3);

  const weeks: WeekDefinition[] = [];
  let currentStart = 1;
  let weekNum = 1;

  while (currentStart <= totalDays) {
    const currentEnd = Math.min(currentStart + 6, totalDays);

    let workingDays = 0;
    for (let d = currentStart; d <= currentEnd; d++) {
      if (!isCompanyHolidayDay(d, validMonthIdx, year, companyLeaves)) {
        workingDays++;
      }
    }
    if (workingDays === 0) workingDays = 1;

    const startStr = String(currentStart).padStart(2, '0');
    const endStr = String(currentEnd).padStart(2, '0');

    weeks.push({
      weekKey: `Week ${weekNum}`,
      weekNumber: weekNum,
      label: `Week ${weekNum}`,
      dateRange: `${shortMonth} ${startStr} – ${shortMonth} ${endStr}`,
      startDay: currentStart,
      endDay: currentEnd,
      workingDays,
    });

    currentStart = currentEnd + 1;
    weekNum++;
  }

  return weeks;
}

export default function HourAccountPage() {
  const { hasPermission } = useHrmsPermissionsContext();
  const canCreate = hasPermission('hour_account.create');
  const canEdit = hasPermission('hour_account.edit');
  const canDelete = hasPermission('hour_account.delete');

  // Company Leaves from Company Holidays page
  const { data: rawCompanyLeaves } = useCompanyLeaves();
  const companyLeavesList: CompanyLeave[] = useMemo(() => {
    if (Array.isArray(rawCompanyLeaves)) return rawCompanyLeaves;
    if (rawCompanyLeaves && Array.isArray((rawCompanyLeaves as any).results)) {
      return (rawCompanyLeaves as any).results;
    }
    return [];
  }, [rawCompanyLeaves]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [groupByField, setGroupByField] = useState<string>('month');

  // Detailed filters (Filter popover - Work Info section)
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterJobPosition, setFilterJobPosition] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterWorkType, setFilterWorkType] = useState('');
  const [filterReportingManager, setFilterReportingManager] = useState('');
  const [filterWorkLocation, setFilterWorkLocation] = useState('');

  // Detailed filters (Filter popover - Attendance section)
  const [filterAttendanceDate, setFilterAttendanceDate] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterInTime, setFilterInTime] = useState('');
  const [filterOutTime, setFilterOutTime] = useState('');
  const [filterValidated, setFilterValidated] = useState('');
  const [filterOtApproved, setFilterOtApproved] = useState('');
  const [filterMinHour, setFilterMinHour] = useState('');

  // Detailed filters (Filter popover - Advanced section)
  const [filterAttendanceFrom, setFilterAttendanceFrom] = useState('');
  const [filterAttendanceTill, setFilterAttendanceTill] = useState('');
  const [filterInFrom, setFilterInFrom] = useState('');
  const [filterInTill, setFilterInTill] = useState('');
  const [filterOutFrom, setFilterOutFrom] = useState('');
  const [filterOutTill, setFilterOutTill] = useState('');
  const [filterAtWorkGte, setFilterAtWorkGte] = useState('');
  const [filterAtWorkLte, setFilterAtWorkLte] = useState('');
  const [filterPendingGte, setFilterPendingGte] = useState('');
  const [filterPendingLte, setFilterPendingLte] = useState('');
  const [filterOtGte, setFilterOtGte] = useState('');
  const [filterOtLte, setFilterOtLte] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Accordion open/close in filter popover
  const [filterWorkInfoOpen, setFilterWorkInfoOpen] = useState(true);
  const [filterAttendanceOpen, setFilterAttendanceOpen] = useState(false);
  const [filterAdvancedOpen, setFilterAdvancedOpen] = useState(false);

  // Popover toggle states
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showGroupByPopover, setShowGroupByPopover] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Popover refs for outside click dismissal
  const filterBtnRef = useRef<HTMLDivElement>(null);
  const groupByBtnRef = useRef<HTMLDivElement>(null);
  const actionsBtnRef = useRef<HTMLDivElement>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Accordion state for grouped view (which group keys are expanded)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    October: true,
    November: true,
  });

  // View mode: 'monthly' (default) vs 'weekly'
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekKey]: !(prev[weekKey] ?? true),
    }));
  };

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HourAccount | null>(null);

  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<HourAccount | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employee: '',
    month: 'October',
    year: 2026,
    worked_hours: '00:00',
    pending_hours: '00:00',
    overtime: '00:00',
  });
  const [formError, setFormError] = useState('');

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterBtnRef.current && !filterBtnRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
      if (groupByBtnRef.current && !groupByBtnRef.current.contains(e.target as Node)) {
        setShowGroupByPopover(false);
      }
      if (actionsBtnRef.current && !actionsBtnRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch employees for dropdowns and create/edit modal
  const { data: employeesData } = useEmployees({ page_size: 200 });
  const employeesList = useMemo(() => employeesData?.results || [], [employeesData]);

  // Fetch departments
  const { data: departmentsRaw } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await api.get(DEPARTMENTS.LIST);
      const data = res.data;
      return Array.isArray(data) ? data : data?.results || [];
    },
  });
  const departmentsList: Array<{ id: string; name: string }> = useMemo(() => {
    return Array.isArray(departmentsRaw) ? departmentsRaw : [];
  }, [departmentsRaw]);

  // Fetch designations (Job Positions)
  const { data: designationsRaw } = useQuery({
    queryKey: ['designations-list'],
    queryFn: async () => {
      const res = await api.get(DESIGNATIONS.LIST);
      const data = res.data;
      return Array.isArray(data) ? data : data?.results || [];
    },
  });
  const designationsList: Array<{ id: string; name?: string; title?: string }> = useMemo(() => {
    return Array.isArray(designationsRaw) ? designationsRaw : [];
  }, [designationsRaw]);

  // Fetch branches (Work Locations)
  const { data: branchesRaw } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await api.get(BRANCHES.LIST);
      const data = res.data;
      return Array.isArray(data) ? data : data?.results || [];
    },
  });
  const branchesList: Array<{ id: string; name: string }> = useMemo(() => {
    return Array.isArray(branchesRaw) ? branchesRaw : [];
  }, [branchesRaw]);

  // Fetch shift types
  const { data: shiftTypesRaw } = useQuery({
    queryKey: ['shifts-types-list'],
    queryFn: async () => {
      const res = await api.get(SHIFTS.TYPES);
      const data = res.data;
      return Array.isArray(data) ? data : data?.results || [];
    },
  });
  const shiftsList: Array<{ id: string; name: string }> = useMemo(() => {
    return Array.isArray(shiftTypesRaw) ? shiftTypesRaw : [];
  }, [shiftTypesRaw]);

  // Fetch HR Settings (Company Name)
  const { data: hrSettingsData } = useQuery({
    queryKey: ['hr-settings'],
    queryFn: async () => {
      try {
        const res = await api.get(HR_SETTINGS.GET);
        return res.data;
      } catch {
        return null;
      }
    },
  });

  // Construct dynamic companies
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    if (hrSettingsData?.company_name) {
      set.add(hrSettingsData.company_name);
    }
    branchesList.forEach((b) => {
      if (b.name) set.add(b.name);
    });
    return Array.from(set);
  }, [hrSettingsData, branchesList]);

  // Construct dynamic reporting managers
  const reportingManagersList = useMemo(() => {
    const mgrMap = new Map<string, string>();
    employeesList.forEach((emp: any) => {
      if (emp.reporting_manager) {
        const name = `${emp.reporting_manager.first_name || ''} ${emp.reporting_manager.last_name || ''}`.trim();
        if (name) {
          mgrMap.set(emp.reporting_manager.id || name, name);
        }
      }
    });
    // Fallback: populate from all employees if no explicit reporting manager links exist
    if (mgrMap.size === 0) {
      employeesList.forEach((emp: any) => {
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
        if (name) {
          mgrMap.set(emp.id, name);
        }
      });
    }
    return Array.from(mgrMap.entries()).map(([id, name]) => ({ id, name }));
  }, [employeesList]);

  // Construct query params
  const queryParams: HourAccountFilterParams = useMemo(() => {
    const params: HourAccountFilterParams = {};
    if (search.trim()) params.search = search.trim();
    if (selectedYear) params.year = selectedYear;
    if (filterMonth) params.month = filterMonth;
    if (filterEmployee) params.employee = filterEmployee;
    if (filterDepartment) params.department = filterDepartment;
    if (filterJobPosition) params.job_position = filterJobPosition;
    if (filterShift) params.shift = filterShift;
    if (filterWorkType) params.work_type = filterWorkType;
    if (filterCompany) params.company = filterCompany;
    if (filterWorkLocation) params.work_location = filterWorkLocation;
    if (filterReportingManager) params.reporting_manager = filterReportingManager;
    if (filterAttendanceDate) params.date = filterAttendanceDate;
    if (filterAttendanceFrom) params.date_from = filterAttendanceFrom;
    if (filterAttendanceTill) params.date_to = filterAttendanceTill;
    if (filterMinHour) params.min_hour = filterMinHour;
    if (filterAtWorkGte) params.at_work_gte = filterAtWorkGte;
    if (filterAtWorkLte) params.at_work_lte = filterAtWorkLte;
    if (filterPendingGte) params.pending_gte = filterPendingGte;
    if (filterPendingLte) params.pending_lte = filterPendingLte;
    if (filterOtGte) params.ot_gte = filterOtGte;
    if (filterOtLte) params.ot_lte = filterOtLte;
    return params;
  }, [
    search,
    selectedYear,
    filterMonth,
    filterEmployee,
    filterDepartment,
    filterJobPosition,
    filterShift,
    filterWorkType,
    filterCompany,
    filterWorkLocation,
    filterReportingManager,
    filterAttendanceDate,
    filterAttendanceFrom,
    filterAttendanceTill,
    filterMinHour,
    filterAtWorkGte,
    filterAtWorkLte,
    filterPendingGte,
    filterPendingLte,
    filterOtGte,
    filterOtLte,
  ]);

  // Fetch Hour Accounts
  const { data: hourAccounts = [], isLoading } = useHourAccounts(queryParams);

  // Client-side fallback filtering
  const filteredHourAccounts = useMemo(() => {
    return hourAccounts.filter((item) => {
      // Work Info filters
      if (filterEmployee) {
        const matchId = item.employee === filterEmployee;
        const matchName = item.employee_name?.toLowerCase().includes(filterEmployee.toLowerCase());
        if (!matchId && !matchName) return false;
      }
      if (filterCompany) {
        if (item.company_name && !item.company_name.toLowerCase().includes(filterCompany.toLowerCase())) {
          return false;
        }
      }
      if (filterDepartment) {
        if (item.department_name && !item.department_name.toLowerCase().includes(filterDepartment.toLowerCase())) {
          return false;
        }
      }
      if (filterJobPosition) {
        if (item.job_position && !item.job_position.toLowerCase().includes(filterJobPosition.toLowerCase())) {
          return false;
        }
      }
      if (filterShift) {
        if (item.shift_name && !item.shift_name.toLowerCase().includes(filterShift.toLowerCase())) {
          return false;
        }
      }
      if (filterWorkType) {
        if (item.work_type && !item.work_type.toLowerCase().includes(filterWorkType.toLowerCase())) {
          return false;
        }
      }
      if (filterReportingManager) {
        if (item.reporting_manager && !item.reporting_manager.toLowerCase().includes(filterReportingManager.toLowerCase())) {
          return false;
        }
      }
      if (filterWorkLocation) {
        if (item.work_location && !item.work_location.toLowerCase().includes(filterWorkLocation.toLowerCase())) {
          return false;
        }
      }

      // Attendance section filters
      if (filterAttendanceDate) {
        const d = new Date(filterAttendanceDate);
        if (!isNaN(d.getTime())) {
          const mName = MONTH_NAMES[d.getMonth()];
          const yr = d.getFullYear();
          if (item.month?.toLowerCase() !== mName.toLowerCase()) return false;
          if (item.year && item.year !== yr) return false;
        }
      }
      if (filterMinHour) {
        const minM = parseHoursToMinutes(filterMinHour);
        const workedM = parseHoursToMinutes(item.worked_hours);
        if (minM !== null && (workedM === null || workedM < minM)) return false;
      }
      if (filterOtApproved === 'true') {
        const otM = parseHoursToMinutes(item.overtime);
        if (!otM || otM <= 0) return false;
      } else if (filterOtApproved === 'false') {
        const otM = parseHoursToMinutes(item.overtime);
        if (otM && otM > 0) return false;
      }

      // Advanced section filters
      if (filterAttendanceFrom || filterAttendanceTill) {
        const mIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === item.month?.toLowerCase());
        if (mIndex !== -1 && item.year) {
          const itemDate = new Date(item.year, mIndex, 1);
          if (filterAttendanceFrom) {
            const fromD = new Date(filterAttendanceFrom);
            fromD.setDate(1);
            if (itemDate < fromD) return false;
          }
          if (filterAttendanceTill) {
            const tillD = new Date(filterAttendanceTill);
            tillD.setDate(1);
            if (itemDate > tillD) return false;
          }
        }
      }
      if (filterAtWorkGte) {
        const gteM = parseHoursToMinutes(filterAtWorkGte);
        const workedM = parseHoursToMinutes(item.worked_hours);
        if (gteM !== null && (workedM === null || workedM < gteM)) return false;
      }
      if (filterAtWorkLte) {
        const lteM = parseHoursToMinutes(filterAtWorkLte);
        const workedM = parseHoursToMinutes(item.worked_hours);
        if (lteM !== null && (workedM === null || workedM > lteM)) return false;
      }
      if (filterPendingGte) {
        const gteM = parseHoursToMinutes(filterPendingGte);
        const pendingM = parseHoursToMinutes(item.pending_hours);
        if (gteM !== null && (pendingM === null || pendingM < gteM)) return false;
      }
      if (filterPendingLte) {
        const lteM = parseHoursToMinutes(filterPendingLte);
        const pendingM = parseHoursToMinutes(item.pending_hours);
        if (lteM !== null && (pendingM === null || pendingM > lteM)) return false;
      }
      if (filterOtGte) {
        const gteM = parseHoursToMinutes(filterOtGte);
        const otM = parseHoursToMinutes(item.overtime);
        if (gteM !== null && (otM === null || otM < gteM)) return false;
      }
      if (filterOtLte) {
        const lteM = parseHoursToMinutes(filterOtLte);
        const otM = parseHoursToMinutes(item.overtime);
        if (lteM !== null && (otM === null || otM > lteM)) return false;
      }
      if (filterMonth) {
        if (item.month?.toLowerCase() !== filterMonth.toLowerCase()) return false;
      }
      if (selectedYear) {
        if (String(item.year) !== String(selectedYear)) return false;
      }

      return true;
    });
  }, [
    hourAccounts,
    filterEmployee,
    filterCompany,
    filterDepartment,
    filterJobPosition,
    filterShift,
    filterWorkType,
    filterReportingManager,
    filterWorkLocation,
    filterAttendanceDate,
    filterBatch,
    filterInTime,
    filterOutTime,
    filterValidated,
    filterOtApproved,
    filterMinHour,
    filterAttendanceFrom,
    filterAttendanceTill,
    filterInFrom,
    filterInTill,
    filterOutFrom,
    filterOutTill,
    filterAtWorkGte,
    filterAtWorkLte,
    filterPendingGte,
    filterPendingLte,
    filterOtGte,
    filterOtLte,
    filterMonth,
    selectedYear,
  ]);

  // Mutations
  const createMutation = useCreateHourAccount();
  const updateMutation = useUpdateHourAccount();
  const deleteMutation = useDeleteHourAccount();
  const bulkDeleteMutation = useBulkDeleteHourAccounts();
  const syncMutation = useSyncHourAccounts();

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedYear) count++;
    if (filterMonth) count++;
    if (filterEmployee) count++;
    if (filterCompany) count++;
    if (filterDepartment) count++;
    if (filterJobPosition) count++;
    if (filterShift) count++;
    if (filterWorkType) count++;
    if (filterReportingManager) count++;
    if (filterWorkLocation) count++;
    // Attendance
    if (filterAttendanceDate) count++;
    if (filterBatch) count++;
    if (filterInTime) count++;
    if (filterOutTime) count++;
    if (filterValidated) count++;
    if (filterOtApproved) count++;
    if (filterMinHour) count++;
    // Advanced
    if (filterAttendanceFrom) count++;
    if (filterAttendanceTill) count++;
    if (filterInFrom) count++;
    if (filterInTill) count++;
    if (filterOutFrom) count++;
    if (filterOutTill) count++;
    if (filterAtWorkGte) count++;
    if (filterAtWorkLte) count++;
    if (filterPendingGte) count++;
    if (filterPendingLte) count++;
    if (filterOtGte) count++;
    if (filterOtLte) count++;
    return count;
  }, [
    selectedYear,
    filterMonth,
    filterEmployee,
    filterCompany,
    filterDepartment,
    filterJobPosition,
    filterShift,
    filterWorkType,
    filterReportingManager,
    filterWorkLocation,
    filterAttendanceDate,
    filterBatch,
    filterInTime,
    filterOutTime,
    filterValidated,
    filterOtApproved,
    filterMinHour,
    filterAttendanceFrom,
    filterAttendanceTill,
    filterInFrom,
    filterInTill,
    filterOutFrom,
    filterOutTill,
    filterAtWorkGte,
    filterAtWorkLte,
    filterPendingGte,
    filterPendingLte,
    filterOtGte,
    filterOtLte,
  ]);

  // Group the records
  const groupedData = useMemo(() => {
    if (!groupByField) {
      return { 'All Records': filteredHourAccounts };
    }

    const groups: Record<string, HourAccount[]> = {};

    // Standard ordering for months
    if (groupByField === 'month') {
      const monthOrder = [
        'November',
        'October',
        'September',
        'August',
        'July',
        'June',
        'May',
        'April',
        'March',
        'February',
        'January',
      ];
      monthOrder.forEach((m) => {
        groups[m] = [];
      });
    }

    filteredHourAccounts.forEach((item) => {
      let key = 'Other';
      if (groupByField === 'month') key = item.month || 'Unknown';
      else if (groupByField === 'year') key = String(item.year || 'Unknown');
      else if (groupByField === 'employee_name') key = item.employee_name || 'Unknown';
      else if (groupByField === 'department_name') key = item.department_name || 'Unassigned';
      else if (groupByField === 'job_position') key = item.job_position || 'Unassigned';
      else if (groupByField === 'shift_name') key = item.shift_name || 'General';
      else if (groupByField === 'work_type') key = item.work_type || 'Full-time';
      else if (groupByField === 'company_name') key = item.company_name || 'Default';
      else if (groupByField === 'country') key = item.country || 'India';
      else if (groupByField === 'reporting_manager') key = item.reporting_manager || 'None';
      else if (groupByField === 'employment_type') key = item.employment_type || 'Permanent';

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Remove empty groups unless it's the standard month view
    if (groupByField !== 'month') {
      Object.keys(groups).forEach((key) => {
        if (groups[key].length === 0) delete groups[key];
      });
    }

    return groups;
  }, [filteredHourAccounts, groupByField]);

  // Weekly grouped data per month (displays all months below exactly as in monthly view)
  const weeklyMonthsData = useMemo(() => {
    const yr = parseInt(selectedYear, 10) || 2026;

    // Standard ordering for all 12 months (identical to monthly view)
    const monthOrder = [
      'November',
      'October',
      'September',
      'August',
      'July',
      'June',
      'May',
      'April',
      'March',
      'February',
      'January',
    ];

    // If month filter is explicitly set, only show that month; otherwise show all months exactly as in monthly view
    const targetMonths = filterMonth ? [filterMonth] : monthOrder;

    const result: Record<
      string,
      {
        monthName: string;
        items: HourAccount[];
        totalWorkedMin: number;
        totalPendingMin: number;
        totalOtMin: number;
        weeks: Record<
          string,
          {
            definition: WeekDefinition;
            items: (HourAccount & {
              weekWorked: string;
              weekPending: string;
              weekOvertime: string;
              weekDateRange: string;
              weekId: string;
            })[];
            totalWorkedMin: number;
            totalPendingMin: number;
            totalOtMin: number;
          }
        >;
      }
    > = {};

    targetMonths.forEach((monthName) => {
      const monthAccounts = filteredHourAccounts.filter(
        (item) => item.month?.toLowerCase() === monthName.toLowerCase()
      );

      const weeks = getWeeksForMonth(monthName, yr, companyLeavesList);
      const totalWorkingDaysInMonth = weeks.reduce((sum, w) => sum + w.workingDays, 0) || 24;

      let monthWorkedMin = 0;
      let monthPendingMin = 0;
      let monthOtMin = 0;

      const weeksMap: Record<
        string,
        {
          definition: WeekDefinition;
          items: (HourAccount & {
            weekWorked: string;
            weekPending: string;
            weekOvertime: string;
            weekDateRange: string;
            weekId: string;
          })[];
          totalWorkedMin: number;
          totalPendingMin: number;
          totalOtMin: number;
        }
      > = {};

      weeks.forEach((week) => {
        const fraction = week.workingDays / totalWorkingDaysInMonth;
        const weekItems = monthAccounts.map((item) => {
          const workedMin = parseHoursToMinutes(item.worked_hours) || 0;
          const pendingMin = parseHoursToMinutes(item.pending_hours) || 0;
          const otMin = parseHoursToMinutes(item.overtime) || 0;

          const wWorked = Math.round(workedMin * fraction);
          const wPending = Math.round(pendingMin * fraction);
          const wOt = Math.round(otMin * fraction);

          return {
            ...item,
            weekWorked: formatMinutesToHours(wWorked),
            weekPending: formatMinutesToHours(wPending),
            weekOvertime: formatMinutesToHours(wOt),
            weekDateRange: week.dateRange,
            weekId: `${item.id}-${monthName}-${week.weekKey}`,
          };
        });

        const sumWorked = weekItems.reduce(
          (acc, r) => acc + (parseHoursToMinutes(r.weekWorked) || 0),
          0
        );
        const sumPending = weekItems.reduce(
          (acc, r) => acc + (parseHoursToMinutes(r.weekPending) || 0),
          0
        );
        const sumOt = weekItems.reduce(
          (acc, r) => acc + (parseHoursToMinutes(r.weekOvertime) || 0),
          0
        );

        monthWorkedMin += sumWorked;
        monthPendingMin += sumPending;
        monthOtMin += sumOt;

        weeksMap[week.label] = {
          definition: week,
          items: weekItems,
          totalWorkedMin: sumWorked,
          totalPendingMin: sumPending,
          totalOtMin: sumOt,
        };
      });

      result[monthName] = {
        monthName,
        items: monthAccounts,
        totalWorkedMin: monthWorkedMin,
        totalPendingMin: monthPendingMin,
        totalOtMin: monthOtMin,
        weeks: weeksMap,
      };
    });

    return result;
  }, [filteredHourAccounts, selectedYear, filterMonth, companyLeavesList]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle selection for individual record
  const toggleSelectRecord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle selection for a group
  const toggleSelectGroup = (items: HourAccount[]) => {
    const allSelected = items.every((item) => selectedIds.has(item.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      items.forEach((item) => {
        if (allSelected) next.delete(item.id);
        else next.add(item.id);
      });
      return next;
    });
  };

  // Select all records across all groups
  const handleSelectAllRecords = () => {
    if (selectedIds.size === filteredHourAccounts.length && filteredHourAccounts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHourAccounts.map((item) => item.id)));
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setSelectedYear('');
    setFilterMonth('');
    setFilterEmployee('');
    setFilterCompany('');
    setFilterDepartment('');
    setFilterJobPosition('');
    setFilterShift('');
    setFilterWorkType('');
    setFilterReportingManager('');
    setFilterWorkLocation('');
    setFilterAttendanceDate('');
    setFilterBatch('');
    setFilterInTime('');
    setFilterOutTime('');
    setFilterValidated('');
    setFilterOtApproved('');
    setFilterMinHour('');
    setFilterAttendanceFrom('');
    setFilterAttendanceTill('');
    setFilterInFrom('');
    setFilterInTill('');
    setFilterOutFrom('');
    setFilterOutTill('');
    setFilterAtWorkGte('');
    setFilterAtWorkLte('');
    setFilterPendingGte('');
    setFilterPendingLte('');
    setFilterOtGte('');
    setFilterOtLte('');
    setSearch('');
    setGroupByField('');
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      employee: employeesList[0]?.id || '',
      month: 'October',
      year: 2026,
      worked_hours: '167:10',
      pending_hours: '00:50',
      overtime: '00:00',
    });
    setFormError('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: HourAccount) => {
    setEditingItem(item);
    setFormData({
      employee: item.employee,
      month: item.month,
      year: item.year,
      worked_hours: item.worked_hours,
      pending_hours: item.pending_hours,
      overtime: item.overtime,
    });
    setFormError('');
    setModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee) {
      setFormError('Please select an employee.');
      return;
    }
    if (!formData.month) {
      setFormError('Please select a month.');
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          payload: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const errMessage = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(errMessage || 'Failed to save hour account record. Please try again.');
    }
  };

  // Single Delete
  const handleConfirmSingleDelete = (item: HourAccount) => {
    setItemToDelete(item);
    setIsBulkDeleting(false);
    setDeleteConfirmOpen(true);
  };

  // Bulk Delete
  const handleConfirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDelete = async () => {
    try {
      if (isBulkDeleting) {
        await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
        setSelectedIds(new Set());
      } else if (itemToDelete) {
        await deleteMutation.mutateAsync(itemToDelete.id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(itemToDelete.id);
          return next;
        });
      }
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch {
      alert('Failed to delete records.');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    setShowActionsMenu(false);
    const recordsToExport =
      selectedIds.size > 0
        ? filteredHourAccounts.filter((item) => selectedIds.has(item.id))
        : filteredHourAccounts;

    if (recordsToExport.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'Employee Name',
      'Employee Code',
      'Month',
      'Year',
      'Worked Hours',
      'Pending Hours',
      'Overtime',
      'Department',
      'Job Position',
      'Company',
    ];

    const csvRows = [headers.join(',')];

    recordsToExport.forEach((item) => {
      const row = [
        `"${item.employee_name || ''}"`,
        `"${item.employee_code || ''}"`,
        `"${item.month || ''}"`,
        `"${item.year || ''}"`,
        `"${item.worked_hours || '00:00'}"`,
        `"${item.pending_hours || '00:00'}"`,
        `"${item.overtime || '00:00'}"`,
        `"${item.department_name || ''}"`,
        `"${item.job_position || ''}"`,
        `"${item.company_name || ''}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hour_Accounts_${selectedYear || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer>
      {/* ─── Top Bar ───────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Hour Account"
        actions={
        <>
          {/* Monthly / Weekly View Mode Switcher */}
          <div className="inline-flex items-center gap-1 rounded-lg bg-surface-neutral p-0.5">
            <Button
              size="small"
              variant={viewMode === 'monthly' ? 'contained' : 'text'}
              color={viewMode === 'monthly' ? 'primary' : 'inherit'}
              onClick={() => setViewMode('monthly')}
            >
              Monthly
            </Button>
            <Button
              size="small"
              variant={viewMode === 'weekly' ? 'contained' : 'text'}
              color={viewMode === 'weekly' ? 'primary' : 'inherit'}
              onClick={() => setViewMode('weekly')}
            >
              Weekly
            </Button>
          </div>
          {/* Search Box */}
          <div className="relative order-last ml-auto">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-48 sm:w-64 pl-8 pr-3"
            />
            <Iconify icon="search" width={16} className="absolute left-2.5 top-2.5 text-ink-disabled" />
          </div>

          {/* Filter Button */}
          <div className="relative" ref={filterBtnRef}>
            <SegmentedButton selected={showFilterPopover || activeFiltersCount > 0} aria-expanded={showFilterPopover} aria-haspopup="true" onClick={() => {
                setShowFilterPopover(!showFilterPopover);
                setShowGroupByPopover(false);
                setShowActionsMenu(false);
              }}><Iconify icon="filter" className="mr-2" /><span>Filter{activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
            </SegmentedButton>

            {/* Filter Popover */}
            {showFilterPopover && (
              <div className="absolute right-0 mt-2 w-80 sm:w-[480px] max-h-[85vh] overflow-y-auto bg-surface-paper border border-divider rounded-lg shadow-2xl z-50 p-4 divide-y divide-divider">
                {/* Accordion: Work Info */}
                <div className="pb-3 mb-1">
                  <Button variant="text" color="inherit" onClick={() => setFilterWorkInfoOpen(!filterWorkInfoOpen)} className="w-full !justify-between" endIcon={<Iconify icon="chevron-down" className={`transition-transform ${filterWorkInfoOpen ? 'rotate-180' : ''}`} />}>Work Info</Button>

                  {filterWorkInfoOpen && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {/* Employee */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Employee</label>
                        <Select selectSize="small"
                          value={filterEmployee}
                          onChange={(e) => setFilterEmployee(e.target.value)}
                        >
                          <option value="">All Employees</option>
                          {employeesList.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name} {emp.employee_id ? `(${emp.employee_id})` : ''}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Company */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Company</label>
                        <Select selectSize="small"
                          value={filterCompany}
                          onChange={(e) => setFilterCompany(e.target.value)}
                        >
                          <option value="">All Companies</option>
                          {companyOptions.map((comp) => (
                            <option key={comp} value={comp}>
                              {comp}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Department</label>
                        <Select selectSize="small"
                          value={filterDepartment}
                          onChange={(e) => setFilterDepartment(e.target.value)}
                        >
                          <option value="">All Departments</option>
                          {departmentsList.map((dept) => (
                            <option key={dept.id || dept.name} value={dept.name}>
                              {dept.name}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Job Position */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Job Position</label>
                        <Select selectSize="small"
                          value={filterJobPosition}
                          onChange={(e) => setFilterJobPosition(e.target.value)}
                        >
                          <option value="">All Job Positions</option>
                          {designationsList.map((desig) => {
                            const val = desig.name || desig.title || '';
                            return (
                              <option key={desig.id || val} value={val}>
                                {val}
                              </option>
                            );
                          })}
                        </Select>
                      </div>

                      {/* Shift */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Shift</label>
                        <Select selectSize="small"
                          value={filterShift}
                          onChange={(e) => setFilterShift(e.target.value)}
                        >
                          <option value="">All Shifts</option>
                          {shiftsList.map((shift) => (
                            <option key={shift.id || shift.name} value={shift.name}>
                              {shift.name}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Work Type */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Work Type</label>
                        <Select selectSize="small"
                          value={filterWorkType}
                          onChange={(e) => setFilterWorkType(e.target.value)}
                        >
                          <option value="">All Work Types</option>
                          {WORK_TYPES.map((wt) => (
                            <option key={wt} value={wt}>
                              {wt}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Reporting Manager */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Reporting Manager</label>
                        <Select selectSize="small"
                          value={filterReportingManager}
                          onChange={(e) => setFilterReportingManager(e.target.value)}
                        >
                          <option value="">All Reporting Managers</option>
                          {reportingManagersList.map((mgr) => (
                            <option key={mgr.id || mgr.name} value={mgr.name}>
                              {mgr.name}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Work Location */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Work Location</label>
                        <Select selectSize="small"
                          value={filterWorkLocation}
                          onChange={(e) => setFilterWorkLocation(e.target.value)}
                        >
                          <option value="">All Locations</option>
                          {branchesList.map((b) => (
                            <option key={b.id || b.name} value={b.name}>
                              {b.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion: Attendance */}
                <div className="py-3">
                  <Button variant="text" color="inherit" onClick={() => setFilterAttendanceOpen(!filterAttendanceOpen)} className="w-full !justify-between" endIcon={<Iconify icon="chevron-down" className={`transition-transform ${filterAttendanceOpen ? 'rotate-180' : ''}`} />}>Attendance</Button>

                  {filterAttendanceOpen && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {/* Attendance Date */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Attendance Date</label>
                        <input
                          type="date"
                          value={filterAttendanceDate}
                          onChange={(e) => setFilterAttendanceDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* Batch */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Batch</label>
                        <Select selectSize="small"
                          value={filterBatch}
                          onChange={(e) => setFilterBatch(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="Batch A">Batch A</option>
                          <option value="Batch B">Batch B</option>
                          <option value="Morning Batch">Morning Batch</option>
                          <option value="Evening Batch">Evening Batch</option>
                          <option value="General Batch">General Batch</option>
                        </Select>
                      </div>

                      {/* In Time */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">In Time</label>
                        <input
                          type="time"
                          value={filterInTime}
                          onChange={(e) => setFilterInTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* Out Time */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Out Time</label>
                        <input
                          type="time"
                          value={filterOutTime}
                          onChange={(e) => setFilterOutTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* Validated? */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Validated?</label>
                        <Select selectSize="small"
                          value={filterValidated}
                          onChange={(e) => setFilterValidated(e.target.value)}
                        >
                          <option value="">Unknown</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </Select>
                      </div>

                      {/* OT Approved? */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">OT Approved?</label>
                        <Select selectSize="small"
                          value={filterOtApproved}
                          onChange={(e) => setFilterOtApproved(e.target.value)}
                        >
                          <option value="">Unknown</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </Select>
                      </div>

                      {/* Min Hour */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Min Hour</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filterMinHour}
                          onChange={(e) => setFilterMinHour(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                        />
                      </div>

                      {/* Empty right cell matching screenshot */}
                      <div></div>
                    </div>
                  )}
                </div>

                {/* Accordion: Advanced */}
                <div className="py-3">
                  <Button variant="text" color="inherit" onClick={() => setFilterAdvancedOpen(!filterAdvancedOpen)} className="w-full !justify-between" endIcon={<Iconify icon="chevron-down" className={`transition-transform ${filterAdvancedOpen ? 'rotate-180' : ''}`} />}>Advanced</Button>

                  {filterAdvancedOpen && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {/* Attendance From */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Attendance From</label>
                        <input
                          type="date"
                          value={filterAttendanceFrom}
                          onChange={(e) => setFilterAttendanceFrom(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* Attendance Till */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Attendance Till</label>
                        <input
                          type="date"
                          value={filterAttendanceTill}
                          onChange={(e) => setFilterAttendanceTill(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* In From */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">In From</label>
                        <input
                          type="time"
                          value={filterInFrom}
                          onChange={(e) => setFilterInFrom(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* In Till */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">In Till</label>
                        <input
                          type="time"
                          value={filterInTill}
                          onChange={(e) => setFilterInTill(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* Out From */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Out From</label>
                        <input
                          type="time"
                          value={filterOutFrom}
                          onChange={(e) => setFilterOutFrom(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* Out Till */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Out Till</label>
                        <input
                          type="time"
                          value={filterOutTill}
                          onChange={(e) => setFilterOutTill(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>

                      {/* At Work Greater or Equal */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">At Work Greater or Equal</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filterAtWorkGte}
                          onChange={(e) => setFilterAtWorkGte(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                        />
                      </div>

                      {/* At Work Less Than or Equal */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">At Work Less Than or Equal</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filterAtWorkLte}
                          onChange={(e) => setFilterAtWorkLte(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                        />
                      </div>

                      {/* Pending Hour Greater or Equal */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Pending Hour Greater or Equal</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filterPendingGte}
                          onChange={(e) => setFilterPendingGte(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                        />
                      </div>

                      {/* Pending Hour Less Than or Equal */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Pending Hour Less Than or Equal</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filterPendingLte}
                          onChange={(e) => setFilterPendingLte(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                        />
                      </div>

                      {/* OT Greater or Equal */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">OT Greater or Equal</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filterOtGte}
                          onChange={(e) => setFilterOtGte(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                        />
                      </div>

                      {/* OT Less Than or Equal */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">OT Less Than or Equal</label>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filterOtLte}
                          onChange={(e) => setFilterOtLte(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                        />
                      </div>

                      {/* Month */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Month</label>
                        <Select selectSize="small"
                          value={filterMonth}
                          onChange={(e) => setFilterMonth(e.target.value)}
                        >
                          <option value="">All</option>
                          {MONTH_NAMES.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </Select>
                      </div>

                      {/* Year */}
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1.5">Year</label>
                        <input
                          type="number"
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-divider rounded bg-surface-paper text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary-main"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Blue Filter Button */}
                <div className="pt-3">
                  <Button onClick={() => setShowFilterPopover(false)} className="w-full">
                    Filter
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Group By Button */}
          <div className="relative" ref={groupByBtnRef}>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<Iconify icon="list-bulleted" />}
              onClick={() => {
                setShowGroupByPopover(!showGroupByPopover);
                setShowFilterPopover(false);
                setShowActionsMenu(false);
              }}
            >
              Group By
            </Button>

            {/* Group By Popover */}
            {showGroupByPopover && (
              <div className="absolute right-0 mt-2 w-64 bg-surface-paper border border-divider rounded-lg shadow-xl z-50 p-4">
                <h4 className="text-sm font-semibold text-ink-primary mb-2">Group By</h4>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Field</label>
                <Select selectSize="small"
                  value={groupByField}
                  onChange={(e) => {
                    setGroupByField(e.target.value);
                    setShowGroupByPopover(false);
                  }}
                >
                  {GROUP_BY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Actions Dropdown Button */}
          <div className="relative" ref={actionsBtnRef}>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              endIcon={<Iconify icon="chevron-down" />}
              onClick={() => {
                setShowActionsMenu(!showActionsMenu);
                setShowFilterPopover(false);
                setShowGroupByPopover(false);
              }}
            >
              Actions
            </Button>

            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-surface-paper border border-divider rounded-md shadow-lg z-50 py-1">
                <Button variant="text" color="inherit" onClick={handleExportCSV} className="w-full">
                  Export
                </Button>
                {canDelete && (
                  <Button variant="soft" color="error" onClick={() => {
                      setShowActionsMenu(false);
                      handleConfirmBulkDelete();
                    }} disabled={selectedIds.size === 0} className="w-full">
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* + Create Button (Blue) */}
          {canCreate && (
            <Button size="small" startIcon={<Iconify icon="plus" />} onClick={handleOpenCreate}><span>Create</span>
            </Button>
          )}
        </>
        }
      />

      {/* ─── Selection Buttons & Active Filters Bar ────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 py-3 border-b border-divider">
        {/* Left: Selection Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Select All Records Button (White) */}
          <Button variant="outlined" color="inherit" size="small" onClick={handleSelectAllRecords}>
            Select All Records
          </Button>

          {selectedIds.size > 0 && (
            <>
              {/* Unselect All Records Button (White) */}
              <Button variant="outlined" color="inherit" size="small" onClick={() => setSelectedIds(new Set())}>
                Unselect All Records
              </Button>

              {/* Export Records Button (White) */}
              <Button variant="outlined" color="inherit" size="small" onClick={handleExportCSV}>
                Export Records
              </Button>

              {/* N - Selected Badge (Blue / White) */}
              <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded border border-primary-light text-primary-dark bg-primary-lighter">
                {selectedIds.size} - Selected
              </span>
            </>
          )}
        </div>

        {/* Right: Active Filter Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-surface-paper border border-divider text-ink-primary shadow-2xs">
            Filters:
          </span>

          {groupByField && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Field : {GROUP_BY_OPTIONS.find((o) => o.value === groupByField)?.label || groupByField}
              <IconButton icon="close" size="small" onClick={() => setGroupByField('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {selectedYear && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Year : {selectedYear}
              <IconButton icon="close" size="small" onClick={() => setSelectedYear('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterMonth && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Month : {filterMonth}
              <IconButton icon="close" size="small" onClick={() => setFilterMonth('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterEmployee && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Employee : {employeesList.find((e) => e.id === filterEmployee)?.first_name || filterEmployee}
              <IconButton icon="close" size="small" onClick={() => setFilterEmployee('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterCompany && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Company : {filterCompany}
              <IconButton icon="close" size="small" onClick={() => setFilterCompany('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterDepartment && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Dept : {filterDepartment}
              <IconButton icon="close" size="small" onClick={() => setFilterDepartment('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterJobPosition && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Job : {filterJobPosition}
              <IconButton icon="close" size="small" onClick={() => setFilterJobPosition('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterShift && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Shift : {filterShift}
              <IconButton icon="close" size="small" onClick={() => setFilterShift('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterWorkType && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Work Type : {filterWorkType}
              <IconButton icon="close" size="small" onClick={() => setFilterWorkType('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterReportingManager && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Manager : {filterReportingManager}
              <IconButton icon="close" size="small" onClick={() => setFilterReportingManager('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterWorkLocation && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Location : {filterWorkLocation}
              <IconButton icon="close" size="small" onClick={() => setFilterWorkLocation('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterAttendanceDate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Date : {filterAttendanceDate}
              <IconButton icon="close" size="small" onClick={() => setFilterAttendanceDate('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterBatch && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Batch : {filterBatch}
              <IconButton icon="close" size="small" onClick={() => setFilterBatch('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterInTime && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              In : {filterInTime}
              <IconButton icon="close" size="small" onClick={() => setFilterInTime('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterOutTime && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Out : {filterOutTime}
              <IconButton icon="close" size="small" onClick={() => setFilterOutTime('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterValidated && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Validated : {filterValidated === 'true' ? 'Yes' : 'No'}
              <IconButton icon="close" size="small" onClick={() => setFilterValidated('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterOtApproved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              OT Approved : {filterOtApproved === 'true' ? 'Yes' : 'No'}
              <IconButton icon="close" size="small" onClick={() => setFilterOtApproved('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterMinHour && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Min Hour : {filterMinHour}
              <IconButton icon="close" size="small" onClick={() => setFilterMinHour('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterAttendanceFrom && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              From : {filterAttendanceFrom}
              <IconButton icon="close" size="small" onClick={() => setFilterAttendanceFrom('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterAttendanceTill && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Till : {filterAttendanceTill}
              <IconButton icon="close" size="small" onClick={() => setFilterAttendanceTill('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterAtWorkGte && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              At Work &gt;= {filterAtWorkGte}
              <IconButton icon="close" size="small" onClick={() => setFilterAtWorkGte('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterAtWorkLte && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              At Work &lt;= {filterAtWorkLte}
              <IconButton icon="close" size="small" onClick={() => setFilterAtWorkLte('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterPendingGte && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Pending &gt;= {filterPendingGte}
              <IconButton icon="close" size="small" onClick={() => setFilterPendingGte('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterPendingLte && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              Pending &lt;= {filterPendingLte}
              <IconButton icon="close" size="small" onClick={() => setFilterPendingLte('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterOtGte && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              OT &gt;= {filterOtGte}
              <IconButton icon="close" size="small" onClick={() => setFilterOtGte('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {filterOtLte && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-surface-paper text-ink-primary border border-divider shadow-2xs">
              OT &lt;= {filterOtLte}
              <IconButton icon="close" size="small" onClick={() => setFilterOtLte('')} aria-label="Close" className="w-4" />
            </span>
          )}

          {/* Clear All Button */}
          {(selectedYear ||
            groupByField ||
            filterMonth ||
            filterEmployee ||
            filterCompany ||
            filterDepartment ||
            filterJobPosition ||
            filterShift ||
            filterWorkType ||
            filterReportingManager ||
            filterWorkLocation ||
            filterAttendanceDate ||
            filterBatch ||
            filterInTime ||
            filterOutTime ||
            filterValidated ||
            filterOtApproved ||
            filterMinHour ||
            filterAttendanceFrom ||
            filterAttendanceTill ||
            filterInFrom ||
            filterInTill ||
            filterOutFrom ||
            filterOutTill ||
            filterAtWorkGte ||
            filterAtWorkLte ||
            filterPendingGte ||
            filterPendingLte ||
            filterOtGte ||
            filterOtLte) && (
            <IconButton icon="close" size="small" onClick={handleClearAllFilters} aria-label="Clear all filters" className="w-6" />
          )}
        </div>
      </div>

      {/* ─── Accordion Groups & Tables ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-16 text-center text-ink-secondary">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-main" />
          Loading Hour Accounts...
        </div>
      ) : filteredHourAccounts.length === 0 ? (
        <Card>
          <StateView
            icon="inbox"
            title="No hour account records found."
            action={
              canCreate && (
                <Button startIcon={<Iconify icon="plus" />} onClick={handleOpenCreate}>
                  Create Hour Account
                </Button>
              )
            }
          />
        </Card>
      ) : viewMode === 'weekly' ? (
        <Card className="overflow-hidden divide-y divide-divider">
          {Object.entries(weeklyMonthsData).map(([monthName, monthData]) => {
            const isMonthExpanded = !!expandedGroups[monthName];
            const monthItems = monthData.items;

            return (
              <div key={monthName} className="bg-surface-paper">
                {/* Accordion Month Header (shows months below, matching monthly view style) */}
                <Button variant="outlined" onClick={() => toggleGroup(monthName)} className="w-full">
                  <span className="text-ink-secondary text-lg font-mono leading-none">
                    {isMonthExpanded ? '—' : '+'}
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-lighter text-primary-dark border border-primary-light min-w-[20px]">
                    {monthItems.length}
                  </span>
                  <span className="text-sm font-semibold text-ink-primary">{monthName}</span>
                </Button>

                {/* Weeks under this Month */}
                {isMonthExpanded && (
                  <div className="border-t border-divider divide-y divide-divider bg-surface-neutral/20 pl-2 sm:pl-4">
                    {monthItems.length === 0 ? (
                      <div className="py-8 text-center text-ink-disabled text-sm">
                        No records for this group.
                      </div>
                    ) : (
                      Object.entries(monthData.weeks).map(([weekLabel, weekData]) => {
                        const weekKey = `${monthName}-${weekLabel}`;
                        const isWeekExpanded = expandedWeeks[weekKey] ?? true;
                        const items = weekData.items;
                        const weekAllSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

                        return (
                          <div key={weekKey} className="bg-surface-paper">
                            {/* Accordion Week Header */}
                            <Button variant="outlined" onClick={() => toggleWeek(weekKey)} className="w-full">
                              <span className="text-ink-disabled text-base font-mono leading-none">
                                {isWeekExpanded ? '—' : '+'}
                              </span>
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-lighter text-primary-dark border border-primary-light min-w-[20px]">
                                {items.length}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-ink-primary">{monthName} — {weekLabel}</span>
                                <span className="text-xs font-medium text-primary-dark bg-primary-lighter px-2 py-0.5 rounded border border-primary-light">
                                  {weekData.definition.dateRange}
                                </span>
                              </div>
                            </Button>

                            {/* Expanded Week Table */}
                            {isWeekExpanded && (
                              <div className="border-t border-divider overflow-x-auto">
                                <HRMSTable className="w-full text-left text-sm">
                                  <thead className="bg-surface-neutral text-xs font-semibold text-ink-primary uppercase tracking-wider border-b border-divider">
                                    <tr>
                                      <th className="w-10 px-4 py-3">
                                        <input
                                          type="checkbox"
                                          checked={weekAllSelected}
                                          onChange={() => toggleSelectGroup(items)}
                                          className="w-4 h-4 rounded border-divider accent-primary-main text-primary-main focus:ring-primary-main cursor-pointer"
                                        />
                                      </th>
                                      <th className="px-4 py-3">Employee</th>
                                      <th className="px-4 py-3">Week</th>
                                      <th className="px-4 py-3">Date Range</th>
                                      <th className="px-4 py-3">Worked Hours</th>
                                      <th className="px-4 py-3">Pending Hours</th>
                                      <th className="px-4 py-3">Overtime</th>
                                      <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-divider">
                                    {items.map((row) => {
                                      const isSelected = selectedIds.has(row.id);
                                      return (
                                        <tr
                                          key={row.weekId}
                                          className={`transition-colors ${
                                            isSelected ? 'bg-primary-lighter/50' : 'hover:bg-surface-neutral/60'
                                          }`}
                                        >
                                          <td className="w-10 px-4 py-3">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleSelectRecord(row.id)}
                                              className="w-4 h-4 rounded border-divider accent-primary-main text-primary-main focus:ring-primary-main cursor-pointer"
                                            />
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                              {row.employee_avatar ? (
                                                <img
                                                  src={row.employee_avatar}
                                                  alt={row.employee_name}
                                                  className="w-8 h-8 rounded-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-8 h-8 rounded-full bg-grey-700 text-primary-contrast flex items-center justify-center text-xs font-semibold">
                                                  {row.employee_name
                                                    ? row.employee_name.slice(0, 2).toUpperCase()
                                                    : 'EM'}
                                                </div>
                                              )}
                                              <div>
                                                <div className="font-medium text-ink-primary">
                                                  {row.employee_name || 'Unnamed Employee'}
                                                </div>
                                                {row.department_name && (
                                                  <div className="text-xs text-ink-secondary">
                                                    {row.department_name}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 font-semibold text-ink-primary">{weekLabel}</td>
                                          <td className="px-4 py-3 text-ink-secondary text-xs font-mono">{row.weekDateRange}</td>
                                          <td className="px-4 py-3 font-mono font-medium text-ink-primary">
                                            {row.weekWorked}
                                          </td>
                                          <td className="px-4 py-3 font-mono text-ink-secondary">
                                            {row.weekPending}
                                          </td>
                                          <td className="px-4 py-3 font-mono text-ink-secondary">
                                            {row.weekOvertime}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-1.5">
                                              {canEdit && (
                                                <IconButton icon="pencil" size="small" onClick={() => handleOpenEdit(row)} aria-label="Edit" />
                                              )}
                                              {canDelete && (
                                                <IconButton icon="trash" size="small" color="error" onClick={() => handleConfirmSingleDelete(row)} aria-label="Delete" />
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </HRMSTable>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y divide-divider">
          {Object.entries(groupedData).map(([groupKey, items]) => {
            const isExpanded = !!expandedGroups[groupKey];
            const groupAllSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

            return (
              <div key={groupKey} className="bg-surface-paper">
                {/* Accordion Group Header */}
                <Button variant="outlined" onClick={() => toggleGroup(groupKey)} className="w-full">
                  <span className="text-ink-secondary text-lg font-mono leading-none">
                    {isExpanded ? '—' : '+'}
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-lighter text-primary-dark border border-primary-light min-w-[20px]">
                    {items.length}
                  </span>
                  <span className="text-sm font-semibold text-ink-primary">{groupKey}</span>
                </Button>

                {/* Expanded Table */}
                {isExpanded && (
                  <div className="border-t border-divider overflow-x-auto">
                    {items.length === 0 ? (
                      <div className="py-8 text-center text-ink-disabled text-sm">
                        No records for this group.
                      </div>
                    ) : (
                      <HRMSTable className="w-full text-left text-sm">
                        <thead className="bg-surface-neutral text-xs font-semibold text-ink-primary uppercase tracking-wider border-b border-divider">
                          <tr>
                            <th className="w-10 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={groupAllSelected}
                                onChange={() => toggleSelectGroup(items)}
                                className="w-4 h-4 rounded border-divider accent-primary-main text-primary-main focus:ring-primary-main cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-3">Employee</th>
                            <th className="px-4 py-3">Month</th>
                            <th className="px-4 py-3">Year</th>
                            <th className="px-4 py-3">Worked Hours</th>
                            <th className="px-4 py-3">Pending Hours</th>
                            <th className="px-4 py-3">Overtime</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-divider">
                          {items.map((row) => {
                            const isSelected = selectedIds.has(row.id);
                            return (
                              <tr
                                key={row.id}
                                className={`transition-colors ${
                                  isSelected ? 'bg-primary-lighter/50' : 'hover:bg-surface-neutral/60'
                                }`}
                              >
                                <td className="w-10 px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectRecord(row.id)}
                                    className="w-4 h-4 rounded border-divider accent-primary-main text-primary-main focus:ring-primary-main cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {row.employee_avatar ? (
                                      <img
                                        src={row.employee_avatar}
                                        alt={row.employee_name}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-grey-700 text-primary-contrast flex items-center justify-center text-xs font-semibold">
                                        {row.employee_name
                                          ? row.employee_name.slice(0, 2).toUpperCase()
                                          : 'EM'}
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-medium text-ink-primary">
                                        {row.employee_name || 'Unnamed Employee'}
                                      </div>
                                      {row.department_name && (
                                        <div className="text-xs text-ink-secondary">
                                          {row.department_name}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-ink-secondary">{row.month}</td>
                                <td className="px-4 py-3 text-ink-secondary">{row.year}</td>
                                <td className="px-4 py-3 font-mono font-medium text-ink-primary">
                                  {row.worked_hours}
                                </td>
                                <td className="px-4 py-3 font-mono text-ink-secondary">
                                  {row.pending_hours}
                                </td>
                                <td className="px-4 py-3 font-mono text-ink-secondary">
                                  {row.overtime}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    {canEdit && (
                                      <IconButton icon="pencil" size="small" onClick={() => handleOpenEdit(row)} aria-label="Edit" />
                                    )}
                                    {canDelete && (
                                      <IconButton icon="trash" size="small" color="error" onClick={() => handleConfirmSingleDelete(row)} aria-label="Delete" />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </HRMSTable>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* ─── Create / Edit Modal ───────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-grey-900/40 p-4">
          <div className="bg-surface-paper rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
              <h3 className="text-lg font-semibold text-ink-primary">
                {editingItem ? 'Edit Hour Account' : 'Create Hour Account'}
              </h3>
              <IconButton icon="close" size="small" onClick={() => setModalOpen(false)} aria-label="Close" />
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal}>
              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 text-xs bg-error-lighter text-error-dark border border-error-light rounded-md">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Employee */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-primary mb-1">
                      Employee *
                    </label>
                    <Select selectSize="small"
                      value={formData.employee}
                      onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                      required
                    >
                      <option value="">Select an employee</option>
                      {employeesList.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id || 'No ID'})
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Month */}
                  <div>
                    <label className="block text-xs font-medium text-ink-primary mb-1">
                      Month *
                    </label>
                    <Select selectSize="small"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      required
                    >
                      {MONTH_NAMES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-xs font-medium text-ink-primary mb-1">
                      Year *
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 text-sm border border-divider rounded-md focus:outline-none focus:ring-1 focus:ring-primary-main"
                    />
                  </div>

                  {/* Worked Hours */}
                  <div>
                    <label className="block text-xs font-medium text-ink-primary mb-1">
                      Worked Hours (HH:MM)
                    </label>
                    <input
                      type="text"
                      placeholder="167:10"
                      value={formData.worked_hours}
                      onChange={(e) => setFormData({ ...formData, worked_hours: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-divider rounded-md focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                    />
                  </div>

                  {/* Pending Hours */}
                  <div>
                    <label className="block text-xs font-medium text-ink-primary mb-1">
                      Pending Hours (HH:MM)
                    </label>
                    <input
                      type="text"
                      placeholder="00:50"
                      value={formData.pending_hours}
                      onChange={(e) => setFormData({ ...formData, pending_hours: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-divider rounded-md focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                    />
                  </div>

                  {/* Overtime */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-primary mb-1">
                      Overtime (HH:MM)
                    </label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={formData.overtime}
                      onChange={(e) => setFormData({ ...formData, overtime: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-divider rounded-md focus:outline-none focus:ring-1 focus:ring-primary-main font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer with Blue Save Button */}
              <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-surface-neutral border-t border-divider">
                <Button variant="outlined" color="inherit" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={createMutation.isPending || updateMutation.isPending} type="submit">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-grey-900/40 p-4">
          <div className="bg-surface-paper rounded-lg shadow-xl max-w-sm w-full p-5">
            <h4 className="text-base font-semibold text-ink-primary mb-2">Confirm Delete</h4>
            <p className="text-sm text-ink-secondary mb-5">
              {isBulkDeleting
                ? `Are you sure you want to delete ${selectedIds.size} selected hour account records? This action cannot be undone.`
                : `Are you sure you want to delete the hour account for "${itemToDelete?.employee_name}" (${itemToDelete?.month} ${itemToDelete?.year})?`}
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outlined" color="inherit" size="small" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button color="error" size="small" onClick={handleExecuteDelete} disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}>
                {deleteMutation.isPending || bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

