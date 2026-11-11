import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { EMPLOYEES } from '@/lib/endpoints';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import {
  useCompensatoryLeaveRequests,
  useEligibleAttendances,
  useCreateCompensatoryLeaveRequest,
  useApproveCompensatoryLeaveRequest,
  useRejectCompensatoryLeaveRequest,
  useDeleteCompensatoryLeaveRequest,
} from '@/hooks/useCompensatoryLeave';
import type { CompensatoryLeaveRequest } from '@/hooks/useCompensatoryLeave';

export default function CompensatoryLeave() {
  const { hasPermission } = useHrmsPermissionsContext();
  const canCreate = hasPermission('compensatory_leave.create');
  const canApprove = hasPermission('compensatory_leave.approve') || hasPermission('leaves.approve');
  const canReject = hasPermission('compensatory_leave.reject') || hasPermission('leaves.reject');
  const canDelete = hasPermission('compensatory_leave.delete');

  // Tabs: 'my' = My Compensatory Leave Requests, 'all' = Compensatory Leave Requests (approver / all)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAttendance, setSelectedAttendance] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Comment Modal State
  const [commentModalReq, setCommentModalReq] = useState<CompensatoryLeaveRequest | null>(null);
  const [approverComment, setApproverComment] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  // Fetch employees for create modal dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['comp-leave-employees'],
    queryFn: async () => {
      const res = await api.get(EMPLOYEES.LIST, { params: { page_size: 100 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
  });

  // Query Requests
  const { data, isLoading, refetch } = useCompensatoryLeaveRequests({
    scope: activeTab === 'my' ? 'my' : 'all',
    status: statusFilter || undefined,
    search: search.trim() || undefined,
    page,
    page_size: 20,
  });

  // Eligible Attendances for selected employee
  const { data: eligibleAttendances, isLoading: isAttLoading } = useEligibleAttendances(
    selectedEmployee || undefined
  );

  // Auto-select first employee when list loads
  React.useEffect(() => {
    if (employeesData && employeesData.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employeesData[0].id);
    }
  }, [employeesData, selectedEmployee]);

  // Generate selectable dates for attendance (recent weekends & work days)
  const attendanceOptions = useMemo(() => {
    if (eligibleAttendances && eligibleAttendances.length > 0) {
      return eligibleAttendances.map((a) => ({
        id: a.id,
        attendance_date: a.attendance_date,
        label: a.label,
      }));
    }
    // Generate fallback dates from current month / past 30 days (weekends & recent days)
    const fallback: { id: string; attendance_date: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const formatted = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      if (isWeekend || i < 5) {
        fallback.push({
          id: `fallback-${iso}`,
          attendance_date: iso,
          label: `${formatted} (${dayName}) — ${isWeekend ? 'Weekend Work Day' : 'Work Day'}`,
        });
      }
    }
    return fallback;
  }, [eligibleAttendances]);

  // Auto-select first attendance date if empty
  React.useEffect(() => {
    if (attendanceOptions.length > 0 && !selectedAttendance) {
      setSelectedAttendance(attendanceOptions[0].attendance_date);
    }
  }, [attendanceOptions, selectedAttendance]);

  // Mutations
  const createMutation = useCreateCompensatoryLeaveRequest();
  const approveMutation = useApproveCompensatoryLeaveRequest();
  const rejectMutation = useRejectCompensatoryLeaveRequest();
  const deleteMutation = useDeleteCompensatoryLeaveRequest();

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const empId = selectedEmployee || (employeesData && employeesData[0]?.id);
    const attDate = selectedAttendance || (attendanceOptions[0]?.attendance_date);

    if (!empId) {
      setFormError('Please select an employee.');
      return;
    }
    if (!attDate || attDate === 'custom') {
      setFormError('Please select an attendance date.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please enter a description / reason.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        employee: empId,
        attendance_date: attDate,
        description: description.trim(),
        days: '1.0',
      });
      setIsCreateOpen(false);
      setDescription('');
      refetch();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.work_date?.[0] ||
        err?.response?.data?.reason?.[0] ||
        'Failed to submit compensatory leave request.';
      setFormError(msg);
    }
  };

  // Handle Approve / Reject
  const handleConfirmDecision = async () => {
    if (!commentModalReq || !confirmAction) return;
    try {
      if (confirmAction === 'approve') {
        await approveMutation.mutateAsync({
          id: commentModalReq.id,
          comments: approverComment.trim(),
        });
      } else {
        await rejectMutation.mutateAsync({
          id: commentModalReq.id,
          comments: approverComment.trim(),
        });
      }
      setCommentModalReq(null);
      setConfirmAction(null);
      setApproverComment('');
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Action failed.');
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this compensatory leave request?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Delete failed.');
    }
  };

  const requests = data?.results || [];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Compensatory Leave Requests
          </h1>
        </div>

        {/* Right Top Actions: Search, Filter, Blue + Create */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="text-xs w-48 sm:w-56 pl-8 pr-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 border rounded-md text-xs font-semibold shadow-sm transition-colors ${
                statusFilter
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>Filter {statusFilter && `(${statusFilter})`}</span>
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-xl p-3 z-30">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Filter by Status
                </p>
                <div className="space-y-1">
                  {['', 'approved', 'requested', 'rejected'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStatusFilter(s);
                        setIsFilterOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                        statusFilter === s
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {s === '' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Blue + Create Button gated on compensatory_leave.create permission */}
          <button
            type="button"
            onClick={() => {
              if (!canCreate) return;
              setIsCreateOpen(true);
              setFormError('');
              if (employeesData && employeesData.length > 0 && !selectedEmployee) {
                setSelectedEmployee(employeesData[0].id);
              }
              if (attendanceOptions.length > 0 && !selectedAttendance) {
                setSelectedAttendance(attendanceOptions[0].attendance_date);
              }
            }}
            disabled={!canCreate}
            title={!canCreate ? 'Create permission required' : 'Create Compensatory Leave Request'}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>+ Create</span>
          </button>
        </div>
      </div>

      {/* Status Indicators Legend matching Screenshots 1, 2, 4 */}
      <div className="flex justify-end items-center gap-4 py-2 text-xs font-medium text-gray-700">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
          <span>Requested</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
          <span>Rejected</span>
        </div>
      </div>

      {/* Tabs matching Screenshots */}
      <div className="bg-white rounded-t-lg border border-b-0 border-gray-200 flex items-center">
        <button
          type="button"
          onClick={() => {
            setActiveTab('my');
            setPage(1);
          }}
          className={`py-3 px-6 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'my'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          My Compensatory Leave Requests
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setPage(1);
          }}
          className={`py-3 px-6 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Compensatory Leave Requests
        </button>
      </div>

      {/* Main Content: Table or Empty State */}
      <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-xs font-medium">Loading compensatory leave requests...</p>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State matching Screenshot 1 */
          <div className="py-24 flex flex-col items-center justify-center text-center">
            {/* 3 Checklist Icons illustration */}
            <div className="flex flex-col items-center gap-1 text-gray-800 mb-4 opacity-80">
              <div className="flex items-center gap-2 text-base font-bold">
                <span>☑ 👤 ═</span>
              </div>
              <div className="flex items-center gap-2 text-base font-bold">
                <span>☑ 👤 ═</span>
              </div>
              <div className="flex items-center gap-2 text-base font-bold">
                <span>☑ 👤 ═</span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">
              You have No leave requests for this filter.
            </p>
          </div>
        ) : (
          /* Table View matching Screenshots 2 & 4 */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-semibold">
                  <th className="py-3 px-4 min-w-[200px]">
                    <span className="inline-flex items-center gap-1">⇅ Employee</span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px]">Leave Type</th>
                  <th className="py-3 px-3 min-w-[140px]">Attendance Dates</th>
                  <th className="py-3 px-3 min-w-[120px]">
                    <span className="inline-flex items-center gap-1">⇅ Requested Days</span>
                  </th>
                  <th className="py-3 px-3 min-w-[160px]">
                    <span className="inline-flex items-center gap-1">⇅ Created By</span>
                  </th>
                  <th className="py-3 px-3 min-w-[110px]">Status</th>
                  <th className="py-3 px-3 min-w-[180px]">Description</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Comment</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Actions</th>
                  <th className="py-3 px-3 text-center min-w-[120px]">Confirmation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => {
                  const isApproved = req.status === 'approved';
                  const isRejected = req.status === 'rejected';
                  const isRequested = req.status === 'submitted' || req.status === 'draft';

                  return (
                    <tr key={req.id} className="hover:bg-blue-50/20 transition-colors relative">
                      {/* Employee Column with Avatar & Left Indicator Pill */}
                      <td className="py-3 px-4 relative">
                        {/* Status Left Edge Bar */}
                        <span
                          className={`absolute left-0 top-1 bottom-1 w-1 rounded-r ${
                            isApproved
                              ? 'bg-green-500'
                              : isRejected
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <div className="flex items-center gap-2.5 pl-1">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                            👤
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {req.employee_name || 'Employee'}
                            </span>
                            {req.employee_code && (
                              <span className="text-[11px] text-gray-500">
                                ({req.employee_code})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3 px-3 text-gray-700 font-medium">
                        {req.leave_type_name || 'Compensatory Leave'}
                      </td>

                      {/* Attendance Dates */}
                      <td className="py-3 px-3 text-gray-700 font-medium whitespace-nowrap">
                        {req.formatted_work_date || req.work_date}
                      </td>

                      {/* Requested Days */}
                      <td className="py-3 px-3 text-gray-800 font-bold">
                        {Number(req.days).toFixed(1)}
                      </td>

                      {/* Created By */}
                      <td className="py-3 px-3 text-gray-600 font-medium">
                        {req.created_by || req.employee_name}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold text-xs ${
                            isApproved
                              ? 'text-green-600'
                              : isRejected
                              ? 'text-red-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {req.status_display || (isRequested ? 'Requested' : req.status)}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3 text-gray-600 max-w-[220px] truncate" title={req.reason}>
                        {req.reason || '—'}
                      </td>

                      {/* Comment */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setCommentModalReq(req);
                            setConfirmAction(null);
                          }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                          title="View Comments"
                        >
                          💬
                        </button>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {canDelete && isRequested && (
                            <button
                              type="button"
                              onClick={() => handleDelete(req.id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete Request"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Confirmation: Approve & Reject buttons */}
                      <td className="py-3 px-3 text-center">
                        {isRequested && (canApprove || canReject) ? (
                          <div className="inline-flex items-center gap-1">
                            {canApprove && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCommentModalReq(req);
                                  setConfirmAction('approve');
                                }}
                                className="w-7 h-7 rounded bg-green-500 hover:bg-green-600 text-white flex items-center justify-center font-bold text-xs shadow-xs transition-colors"
                                title="Approve Request"
                              >
                                ✓
                              </button>
                            )}
                            {canReject && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCommentModalReq(req);
                                  setConfirmAction('reject');
                                }}
                                className="w-7 h-7 rounded bg-red-500 hover:bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs transition-colors"
                                title="Reject Request"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination matching Screenshot 2 & 4 */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between text-xs text-gray-700">
          <div>
            Page <span className="font-semibold">{data?.current_page || 1}</span> of{' '}
            <span className="font-semibold">{data?.total_pages || 1}</span>.
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
            </div>
          </div>
        </div>
      </div>

      {/* Create Compensatory Leave Request Modal matching Screenshot 3 */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                Create Compensatory Leave Request
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Employee * */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => {
                    setSelectedEmployee(e.target.value);
                    setSelectedAttendance('');
                  }}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employeesData?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id || 'ID'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendance * Dropdown matching Screenshot 9 */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Attendance *
                </label>
                <select
                  value={selectedAttendance}
                  onChange={(e) => setSelectedAttendance(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select attendance date worked</option>
                  {attendanceOptions.map((att) => (
                    <option key={att.id} value={att.attendance_date}>
                      {att.label}
                    </option>
                  ))}
                  <option value="custom">-- Custom Date (Enter Below) --</option>
                </select>
                {selectedAttendance === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="date"
                      onChange={(e) => setSelectedAttendance(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Enter the rest day, weekend, or holiday date worked.
                    </p>
                  </div>
                )}
              </div>

              {/* Description * */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Description *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Modal Footer with Blue Save button matching requirement */}
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision / Comment Modal */}
      {commentModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {confirmAction === 'approve'
                  ? 'Approve Compensatory Leave'
                  : confirmAction === 'reject'
                  ? 'Reject Compensatory Leave'
                  : 'Compensatory Leave Details'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCommentModalReq(null);
                  setConfirmAction(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-gray-600">Employee: </span>
                <span className="text-gray-900">{commentModalReq.employee_name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Attendance Date: </span>
                <span className="text-gray-900">{commentModalReq.formatted_work_date}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Reason: </span>
                <p className="mt-1 p-2 bg-gray-50 rounded text-gray-800 border border-gray-200">
                  {commentModalReq.reason || 'No description provided.'}
                </p>
              </div>

              {confirmAction && (
                <div>
                  <label className="block font-semibold text-gray-800 mb-1">
                    Approver Comment / Note
                  </label>
                  <textarea
                    rows={3}
                    value={approverComment}
                    onChange={(e) => setApproverComment(e.target.value)}
                    placeholder="Enter approval or rejection comments..."
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCommentModalReq(null);
                  setConfirmAction(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              >
                Close
              </button>

              {confirmAction && (
                <button
                  type="button"
                  onClick={handleConfirmDecision}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm"
                >
                  Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
