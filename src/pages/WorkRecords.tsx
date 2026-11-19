import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DEPARTMENTS, DESIGNATIONS, BRANCHES, SHIFTS } from '@/lib/endpoints';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { useWorkRecords } from '@/hooks/useWorkRecords';
import type {
  WorkRecordDay,
  EmployeeWorkRecord,
  WorkRecordsFilterParams,
} from '@/hooks/useWorkRecords';

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

export default function WorkRecords() {
  const { hasPermission } = useHrmsPermissionsContext();
  const canExport = hasPermission('work_records.export');

  // Month & Year state (defaults to current date, e.g. November 2026)
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Pagination & Search
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');

  // Filter Popover state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Filter Accordion open/close states (Employee open by default as in screenshot 2)
  const [filterEmployeeOpen, setFilterEmployeeOpen] = useState(true);
  const [filterWorkInfoOpen, setFilterWorkInfoOpen] = useState(false);
  const [filterAdvancedOpen, setFilterAdvancedOpen] = useState(false);

  // Section 1: Employee Filters
  const [filterFirstName, setFilterFirstName] = useState('');
  const [filterLastName, setFilterLastName] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterGender, setFilterGender] = useState('');

  // Section 2: Work Info Filters
  const [filterCompany, setFilterCompany] = useState('');
  const [filterReportingManager, setFilterReportingManager] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterJobPosition, setFilterJobPosition] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterWorkType, setFilterWorkType] = useState('');
  const [filterEmployeeTag, setFilterEmployeeTag] = useState('');
  const [filterCurrentlyWorking, setFilterCurrentlyWorking] = useState('Unknown');

  // Section 3: Advanced Filters
  const [filterGroups, setFilterGroups] = useState('');
  const [filterPermissions, setFilterPermissions] = useState('');
  const [filterProbationFrom, setFilterProbationFrom] = useState('');
  const [filterProbationTill, setFilterProbationTill] = useState('');
  const [filterIsActive, setFilterIsActive] = useState('');
  const [filterIsFromOnboarding, setFilterIsFromOnboarding] = useState('');
  const [filterIsDirectlyConverted, setFilterIsDirectlyConverted] = useState('');

  // Applied filter state (triggers API refetch when Filter button clicked)
  const [appliedFilters, setAppliedFilters] = useState<WorkRecordsFilterParams>({});

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterFirstName) count++;
    if (filterLastName) count++;
    if (filterEmail) count++;
    if (filterPhone) count++;
    if (filterCountry) count++;
    if (filterGender && filterGender !== '---------') count++;
    if (filterCompany) count++;
    if (filterReportingManager) count++;
    if (filterDepartment) count++;
    if (filterJobPosition) count++;
    if (filterShift) count++;
    if (filterWorkType) count++;
    if (filterEmployeeTag) count++;
    if (filterCurrentlyWorking && filterCurrentlyWorking !== 'Unknown') count++;
    if (filterGroups) count++;
    if (filterPermissions) count++;
    if (filterProbationFrom) count++;
    if (filterProbationTill) count++;
    if (filterIsActive && filterIsActive !== '---------') count++;
    if (filterIsFromOnboarding && filterIsFromOnboarding !== '---------') count++;
    if (filterIsDirectlyConverted && filterIsDirectlyConverted !== '---------') count++;
    return count;
  }, [
    filterFirstName,
    filterLastName,
    filterEmail,
    filterPhone,
    filterCountry,
    filterGender,
    filterCompany,
    filterReportingManager,
    filterDepartment,
    filterJobPosition,
    filterShift,
    filterWorkType,
    filterEmployeeTag,
    filterCurrentlyWorking,
    filterGroups,
    filterPermissions,
    filterProbationFrom,
    filterProbationTill,
    filterIsActive,
    filterIsFromOnboarding,
    filterIsDirectlyConverted,
  ]);

  // Click outside to close popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch dropdown options for filters
  const { data: departmentsData } = useQuery({
    queryKey: ['filter-departments'],
    queryFn: async () => {
      const res = await api.get(DEPARTMENTS.LIST, { params: { page_size: 100 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
  });

  const { data: designationsData } = useQuery({
    queryKey: ['filter-designations'],
    queryFn: async () => {
      const res = await api.get(DESIGNATIONS.LIST, { params: { page_size: 100 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['filter-branches'],
    queryFn: async () => {
      const res = await api.get(BRANCHES.LIST, { params: { page_size: 100 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
  });

  const { data: shiftsData } = useQuery({
    queryKey: ['filter-shifts'],
    queryFn: async () => {
      const res = await api.get(SHIFTS.TYPES, { params: { page_size: 100 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
  });

  // Query Work Records
  const queryParams: WorkRecordsFilterParams = useMemo(
    () => ({
      year: selectedYear,
      month: selectedMonth,
      page,
      page_size: 20,
      search: search.trim() || undefined,
      ...appliedFilters,
    }),
    [selectedYear, selectedMonth, page, search, appliedFilters]
  );

  const { data, isLoading, isError, refetch } = useWorkRecords(queryParams);

  // Apply filters handler
  const handleApplyFilters = () => {
    const f: WorkRecordsFilterParams = {};
    if (filterFirstName) f.first_name = filterFirstName;
    if (filterLastName) f.last_name = filterLastName;
    if (filterEmail) f.email = filterEmail;
    if (filterPhone) f.phone = filterPhone;
    if (filterCountry) f.country = filterCountry;
    if (filterGender && filterGender !== '---------') f.gender = filterGender;

    if (filterCompany) f.company = filterCompany;
    if (filterReportingManager) f.reporting_manager = filterReportingManager;
    if (filterDepartment) f.department = filterDepartment;
    if (filterJobPosition) f.job_position = filterJobPosition;
    if (filterShift) f.shift = filterShift;
    if (filterWorkType) f.work_type = filterWorkType;
    if (filterEmployeeTag) f.employee_tag = filterEmployeeTag;
    if (filterCurrentlyWorking && filterCurrentlyWorking !== 'Unknown') {
      f.currently_working = filterCurrentlyWorking;
    }

    if (filterGroups) f.groups = filterGroups;
    if (filterPermissions) f.permissions = filterPermissions;
    if (filterProbationFrom) f.probation_from = filterProbationFrom;
    if (filterProbationTill) f.probation_till = filterProbationTill;
    if (filterIsActive && filterIsActive !== '---------') f.is_active = filterIsActive;
    if (filterIsFromOnboarding && filterIsFromOnboarding !== '---------') {
      f.is_from_onboarding = filterIsFromOnboarding;
    }
    if (filterIsDirectlyConverted && filterIsDirectlyConverted !== '---------') {
      f.is_directly_converted = filterIsDirectlyConverted;
    }

    setPage(1);
    setAppliedFilters(f);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilterFirstName('');
    setFilterLastName('');
    setFilterEmail('');
    setFilterPhone('');
    setFilterCountry('');
    setFilterGender('');
    setFilterCompany('');
    setFilterReportingManager('');
    setFilterDepartment('');
    setFilterJobPosition('');
    setFilterShift('');
    setFilterWorkType('');
    setFilterEmployeeTag('');
    setFilterCurrentlyWorking('Unknown');
    setFilterGroups('');
    setFilterPermissions('');
    setFilterProbationFrom('');
    setFilterProbationTill('');
    setFilterIsActive('');
    setFilterIsFromOnboarding('');
    setFilterIsDirectlyConverted('');
    setAppliedFilters({});
    setPage(1);
    setIsFilterOpen(false);
  };

  // Days in month calculation
  const daysInMonth = data?.days_in_month || new Date(selectedYear, selectedMonth, 0).getDate();

  // Set of week-off days for this month (from backend company leaves or fallback)
  const weekOffDaysSet = useMemo(() => {
    if (data?.week_off_days && data.week_off_days.length > 0) {
      return new Set(data.week_off_days);
    }
    if (data?.results && data.results.length > 0) {
      const s = new Set<number>();
      for (const emp of data.results) {
        for (const [dayStr, rec] of Object.entries(emp.records || {})) {
          if (rec.is_week_off || rec.is_weekend) {
            s.add(Number(dayStr));
          }
        }
        if (s.size > 0) break;
      }
      if (s.size > 0) return s;
    }
    const fallback = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedYear, selectedMonth - 1, d);
      if (date.getDay() === 0) fallback.add(d);
    }
    return fallback;
  }, [data, daysInMonth, selectedYear, selectedMonth]);

  const dayColumns = useMemo(() => {
    const cols: { day: number; isWeekend: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const isWeekend = weekOffDaysSet.has(d);
      cols.push({ day: d, isWeekend });
    }
    return cols;
  }, [daysInMonth, weekOffDaysSet]);

  // Formatted date string for top right: "Nov. 10, 2026"
  const formattedToday = useMemo(() => {
    const mStr = today.toLocaleString('en-US', { month: 'short' });
    return `${mStr}. ${today.getDate()}, ${today.getFullYear()}`;
  }, [today]);

  const monthName = MONTH_NAMES[selectedMonth - 1] || 'November';

  // Export to CSV
  const handleExportCSV = () => {
    if (!data?.results || data.results.length === 0) {
      alert('No work records data to export.');
      return;
    }

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Designation',
      'Total Worked Hours',
      'Present Days',
      'Half Days',
      'Absent Days',
      'Leave Days',
      ...dayColumns.map((c) => `Day ${c.day}`),
    ];

    const rows = data.results.map((emp) => {
      const dayValues = dayColumns.map((c) => {
        const record = emp.records[String(c.day)];
        if (!record || !record.badge) return '-';
        return `${record.badge} (${record.working_hours})`;
      });

      return [
        `"${emp.employee_id || ''}"`,
        `"${emp.full_name || ''}"`,
        `"${emp.department || ''}"`,
        `"${emp.designation || ''}"`,
        `"${emp.total_worked_hours || '00:00'}"`,
        emp.present_days,
        emp.half_days,
        emp.absent_days,
        emp.leave_days,
        ...dayValues.map((v) => `"${v}"`),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Work_Records_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cell Tooltip Hover State
  const [hoveredCell, setHoveredCell] = useState<{
    empName: string;
    empCode: string;
    day: number;
    record?: WorkRecordDay;
    x: number;
    y: number;
  } | null>(null);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Work Records</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-sm font-semibold text-gray-800">
            Date: <span className="font-bold text-gray-900">{formattedToday}</span>
          </div>

          {/* Month Selector dropdown */}
          <div className="relative" ref={monthPickerRef}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-rose-500">Month</span>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="inline-flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span>
                  {monthName}, {selectedYear}
                </span>
                <span className="text-gray-500">📅</span>
              </button>
            </div>

            {/* Month Picker Dropdown */}
            {isMonthPickerOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Select Month & Year
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y - 1)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-600 font-bold"
                    >
                      ‹
                    </button>
                    <span className="text-sm font-bold text-gray-800 px-1">{selectedYear}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y + 1)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-600 font-bold"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {MONTH_NAMES.map((m, idx) => {
                    const mNum = idx + 1;
                    const isSelected = selectedMonth === mNum;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(mNum);
                          setPage(1);
                          setIsMonthPickerOpen(false);
                        }}
                        className={`text-xs font-medium py-1.5 px-2 rounded-md transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold'
                            : 'hover:bg-blue-50 text-gray-700'
                        }`}
                      >
                        {m.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Toolbar & Legend Bar */}
      <div className="bg-white rounded-t-lg border border-b-0 border-gray-200 p-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left Actions: Export & Filter buttons in BLUE */}
        <div className="flex items-center gap-2.5 relative" ref={filterRef}>
          {/* Blue Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!canExport}
            title={!canExport ? 'Export permission required' : 'Export Work Records to CSV'}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export</span>
          </button>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-md text-sm font-medium shadow-sm transition-colors ${
              activeFilterCount > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700'
            }`}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
          </button>

          {/* Filter Popover matching Screenshots 2, 3, 4 */}
          {isFilterOpen && (
            <div className="absolute top-12 left-0 w-[420px] max-w-[95vw] max-h-[85vh] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-2xl p-5 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Accordion 1: Employee */}
              <div className="border-b border-gray-200 pb-3 mb-3">
                <button
                  type="button"
                  onClick={() => setFilterEmployeeOpen(!filterEmployeeOpen)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-900 py-1"
                >
                  <span>Employee</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      filterEmployeeOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {filterEmployeeOpen && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">First Name</label>
                      <input
                        type="text"
                        value={filterFirstName}
                        onChange={(e) => setFilterFirstName(e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={filterLastName}
                        onChange={(e) => setFilterLastName(e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Email</label>
                      <input
                        type="text"
                        value={filterEmail}
                        onChange={(e) => setFilterEmail(e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Phone</label>
                      <input
                        type="text"
                        value={filterPhone}
                        onChange={(e) => setFilterPhone(e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Country</label>
                      <input
                        type="text"
                        value={filterCountry}
                        onChange={(e) => setFilterCountry(e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Gender</label>
                      <select
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">---------</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Work Info */}
              <div className="border-b border-gray-200 pb-3 mb-3">
                <button
                  type="button"
                  onClick={() => setFilterWorkInfoOpen(!filterWorkInfoOpen)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-900 py-1"
                >
                  <span>Work Info</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      filterWorkInfoOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {filterWorkInfoOpen && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Company</label>
                      <select
                        value={filterCompany}
                        onChange={(e) => setFilterCompany(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Company</option>
                        {branchesData?.map((b: any) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Reporting Manager
                      </label>
                      <input
                        type="text"
                        value={filterReportingManager}
                        onChange={(e) => setFilterReportingManager(e.target.value)}
                        placeholder="Manager Name"
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Department</label>
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Department</option>
                        {departmentsData?.map((d: any) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Job Position</label>
                      <select
                        value={filterJobPosition}
                        onChange={(e) => setFilterJobPosition(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Designation</option>
                        {designationsData?.map((ds: any) => (
                          <option key={ds.id} value={ds.name}>
                            {ds.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Shift</label>
                      <select
                        value={filterShift}
                        onChange={(e) => setFilterShift(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Shift</option>
                        {shiftsData?.map((s: any) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Work Type</label>
                      <select
                        value={filterWorkType}
                        onChange={(e) => setFilterWorkType(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Work Type</option>
                        {WORK_TYPES.map((wt) => (
                          <option key={wt} value={wt}>
                            {wt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Employee tag</label>
                      <input
                        type="text"
                        value={filterEmployeeTag}
                        onChange={(e) => setFilterEmployeeTag(e.target.value)}
                        placeholder="Tag"
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Currently Working</label>
                      <select
                        value={filterCurrentlyWorking}
                        onChange={(e) => setFilterCurrentlyWorking(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Unknown">Unknown</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Advanced */}
              <div className="pb-4 mb-3">
                <button
                  type="button"
                  onClick={() => setFilterAdvancedOpen(!filterAdvancedOpen)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-900 py-1"
                >
                  <span>Advanced</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      filterAdvancedOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {filterAdvancedOpen && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Groups?</label>
                      <input
                        type="text"
                        value={filterGroups}
                        onChange={(e) => setFilterGroups(e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Permissions</label>
                      <input
                        type="text"
                        value={filterPermissions}
                        onChange={(e) => setFilterPermissions(e.target.value)}
                        placeholder=""
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Probation From</label>
                      <input
                        type="date"
                        value={filterProbationFrom}
                        onChange={(e) => setFilterProbationFrom(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Probation Till</label>
                      <input
                        type="date"
                        value={filterProbationTill}
                        onChange={(e) => setFilterProbationTill(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Is Active?</label>
                      <select
                        value={filterIsActive}
                        onChange={(e) => setFilterIsActive(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">---------</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Is From Onboarding?
                      </label>
                      <select
                        value={filterIsFromOnboarding}
                        onChange={(e) => setFilterIsFromOnboarding(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">---------</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        Is Directly Converted?
                      </label>
                      <select
                        value={filterIsDirectlyConverted}
                        onChange={(e) => setFilterIsDirectlyConverted(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">---------</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Blue Filter Submit Button & Clear */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded shadow-sm transition-colors"
                >
                  Filter
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Status Indicators Legend matching Screenshot 1 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-gray-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>Half Day Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
            <span>On leave, But attendance exist</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block"></span>
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-300 inline-block"></span>
            <span>Absent</span>
          </div>
        </div>
      </div>

      {/* Monthly Attendance Matrix Grid Table */}
      <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto relative min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600 mb-3"></div>
              <p className="text-sm font-medium">Loading work records for {monthName}...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-600">
              <p className="text-sm font-semibold mb-2">Failed to load work records</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium"
              >
                Retry
              </button>
            </div>
          ) : !data?.results || data.results.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <p className="text-base font-semibold text-gray-700">No work records found</p>
              <p className="text-xs text-gray-500 mt-1">
                No active employee attendance records found for {monthName} {selectedYear}.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                  {/* Sticky Employee Column Header */}
                  <th className="sticky left-0 z-20 bg-gray-200/90 backdrop-blur font-semibold px-3 py-2.5 min-w-[210px] max-w-[240px] border-r border-gray-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    Employee
                  </th>

                  {/* Day Columns 1..N */}
                  {dayColumns.map(({ day, isWeekend }) => (
                    <th
                      key={day}
                      className={`text-center font-bold px-1.5 py-2 min-w-[34px] border-r border-gray-200 ${
                        isWeekend ? 'bg-slate-200/70 text-slate-700' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.results.map((emp) => (
                  <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Sticky Employee Info Cell */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/40 px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 truncate" title={emp.display_name}>
                          {emp.display_name}
                        </span>
                        {emp.department && (
                          <span className="text-[10px] text-gray-500 truncate">{emp.department}</span>
                        )}
                      </div>
                    </td>

                    {/* Day Cells */}
                    {dayColumns.map(({ day, isWeekend }) => {
                      const record = emp.records[String(day)];
                      const badge = record?.badge || '';

                      return (
                        <td
                          key={day}
                          className={`p-1 text-center border-r border-gray-100 align-middle ${
                            isWeekend ? 'bg-slate-100/60' : 'bg-white'
                          }`}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredCell({
                              empName: emp.full_name,
                              empCode: emp.employee_id,
                              day,
                              record,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className="flex items-center justify-center min-h-[30px]">
                            {badge === 'P' && (
                              <div
                                className="w-6 h-6 rounded bg-green-500 text-white font-bold text-[11px] flex items-center justify-center shadow-xs"
                                title={`Present (${record?.working_hours || '00:00'} hrs)`}
                              >
                                P
                              </div>
                            )}

                            {badge === 'HP' && (
                              <div
                                className="w-6 h-6 rounded bg-amber-400 text-gray-900 font-bold text-[10px] flex items-center justify-center shadow-xs"
                                title={`Half Day (${record?.working_hours || '00:00'} hrs)`}
                              >
                                HP
                              </div>
                            )}

                            {badge === 'OL' && (
                              <div
                                className="w-6 h-6 rounded bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs"
                                title={`On leave, but attended (${record?.working_hours || '00:00'} hrs)`}
                              >
                                OL
                              </div>
                            )}

                            {badge === 'L' && (
                              <div
                                className="w-6 h-6 rounded bg-slate-600 text-white font-bold text-[11px] flex items-center justify-center shadow-xs"
                                title="Leave"
                              >
                                L
                              </div>
                            )}

                            {badge === 'A' && (
                              <div
                                className="w-6 h-6 rounded bg-indigo-300 text-white font-bold text-[11px] flex items-center justify-center shadow-xs"
                                title="Absent"
                              >
                                A
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Hover Popover Tooltip for Cells */}
        {hoveredCell && hoveredCell.record && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-gray-900/95 text-white rounded-lg shadow-xl px-3 py-2 text-xs backdrop-blur-sm border border-gray-700 min-w-[170px]"
            style={{
              left: `${hoveredCell.x}px`,
              top: `${hoveredCell.y - 8}px`,
            }}
          >
            <div className="font-bold border-b border-gray-700 pb-1 mb-1 text-gray-200">
              {monthName} {hoveredCell.day}, {selectedYear}
            </div>
            <div className="text-[11px] text-gray-300">
              <span className="font-medium text-gray-400">Employee: </span>
              {hoveredCell.empName} ({hoveredCell.empCode})
            </div>
            <div className="text-[11px] text-gray-300">
              <span className="font-medium text-gray-400">Status: </span>
              <span
                className={`font-semibold ${
                  hoveredCell.record.badge === 'P'
                    ? 'text-green-400'
                    : hoveredCell.record.badge === 'HP'
                    ? 'text-yellow-400'
                    : hoveredCell.record.badge === 'L'
                    ? 'text-gray-300'
                    : hoveredCell.record.badge === 'A'
                    ? 'text-indigo-300'
                    : hoveredCell.record.status === 'week_off' || hoveredCell.record.is_week_off
                    ? 'text-sky-300'
                    : hoveredCell.record.status === 'holiday' || hoveredCell.record.is_holiday
                    ? 'text-emerald-300'
                    : 'text-orange-400'
                }`}
              >
                {hoveredCell.record.badge === 'P'
                  ? 'Present'
                  : hoveredCell.record.badge === 'HP'
                  ? 'Half Day'
                  : hoveredCell.record.badge === 'OL'
                  ? `On Leave (Attended)${hoveredCell.record.leave_type ? ` - ${hoveredCell.record.leave_type}` : ''}`
                  : hoveredCell.record.badge === 'L'
                  ? `Leave${hoveredCell.record.leave_type ? ` (${hoveredCell.record.leave_type})` : ''}`
                  : hoveredCell.record.badge === 'A'
                  ? 'Absent'
                  : hoveredCell.record.status === 'week_off' || hoveredCell.record.is_week_off
                  ? 'Week Off'
                  : hoveredCell.record.status === 'holiday' || hoveredCell.record.is_holiday
                  ? 'Holiday'
                  : 'No Status'}
              </span>
            </div>
            <div className="text-[11px] text-gray-300">
              <span className="font-medium text-gray-400">Worked Hours: </span>
              <span className="font-mono font-bold text-white">
                {hoveredCell.record.working_hours || '00:00'} hrs
              </span>
            </div>
            {hoveredCell.record.check_in && (
              <div className="text-[11px] text-gray-300">
                <span className="font-medium text-gray-400">In / Out: </span>
                {hoveredCell.record.check_in} - {hoveredCell.record.check_out || '--:--'}
              </div>
            )}
            {hoveredCell.record.shift_name && (
              <div className="text-[11px] text-gray-400">
                <span className="font-medium text-gray-400">Shift: </span>
                {hoveredCell.record.shift_name}
              </div>
            )}
          </div>
        )}

        {/* Bottom Pagination Bar matching Screenshot 3 & 4 */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-700">
          <div>
            Page <span className="font-semibold">{data?.current_page || 1}</span> of{' '}
            <span className="font-semibold">{data?.total_pages || 1}</span>. Total{' '}
            <span className="font-semibold">{data?.count || 0}</span> employees.
          </div>

          <div className="flex items-center gap-2">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={data?.total_pages || 1}
              value={page}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= (data?.total_pages || 1)) {
                  setPage(val);
                }
              }}
              className="w-12 text-center text-xs py-1 px-1.5 border border-gray-300 rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span>of {data?.total_pages || 1}</span>

            {/* Blue Navigation Buttons */}
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                First
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data?.total_pages || 1, p + 1))}
                disabled={page >= (data?.total_pages || 1)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setPage(data?.total_pages || 1)}
                disabled={page >= (data?.total_pages || 1)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
