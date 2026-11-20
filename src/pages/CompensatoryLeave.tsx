import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { EMPLOYEES } from '@/lib/endpoints';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { formatDate, formatDateTime } from '@/utils/formatters';
import {
  useCompensatoryLeaveRequests,
  useEligibleAttendances,
  useCreateCompensatoryLeaveRequest,
  useUpdateCompensatoryLeaveRequest,
  useApproveCompensatoryLeaveRequest,
  useRejectCompensatoryLeaveRequest,
  useDeleteCompensatoryLeaveRequest,
  useCompensatoryLeaveComments,
  useAddCompensatoryLeaveComment,
  useDeleteCompensatoryLeaveComment,
} from '@/hooks/useCompensatoryLeave';
import type { CompensatoryLeaveRequest } from '@/hooks/useCompensatoryLeave';

export default function CompensatoryLeave() {
  const { hasPermission } = useHrmsPermissionsContext();
  const canCreate = hasPermission('compensatory_leave.create');
  const canApprove = hasPermission('compensatory_leave.approve') || hasPermission('leaves.approve');
  const canReject = hasPermission('compensatory_leave.reject') || hasPermission('leaves.reject');
  const canDelete = hasPermission('compensatory_leave.delete');
  const isApproverOrAdmin = canApprove || canReject;

  // Tabs: 'my' = My Compensatory Leave Requests, 'all' = Compensatory Leave Requests (approver / all)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAttendance, setSelectedAttendance] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editReq, setEditReq] = useState<CompensatoryLeaveRequest | null>(null);
  const [editAttendance, setEditAttendance] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFormError, setEditFormError] = useState('');

  // Comments Page / View State (matching user screenshot)
  const [commentsViewReq, setCommentsViewReq] = useState<CompensatoryLeaveRequest | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Approver Decision Modal State
  const [commentModalReq, setCommentModalReq] = useState<CompensatoryLeaveRequest | null>(null);
  const [approverComment, setApproverComment] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  // Fetch logged in employee
  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const res = await api.get('/api/v1/employees/me/');
      return res.data;
    },
  });

  // Guard activeTab: non-approvers can ONLY view 'my'
  React.useEffect(() => {
    if (!isApproverOrAdmin && activeTab !== 'my') {
      setActiveTab('my');
    }
  }, [isApproverOrAdmin, activeTab]);

  // Fetch employees for create modal dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['comp-leave-employees'],
    queryFn: async () => {
      const res = await api.get(EMPLOYEES.LIST, { params: { page_size: 100 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
    enabled: isApproverOrAdmin,
  });

  // Default selected employee
  React.useEffect(() => {
    if (!isApproverOrAdmin && currentEmployee?.id) {
      setSelectedEmployee(currentEmployee.id);
    } else if (isApproverOrAdmin && employeesData && employeesData.length > 0 && !selectedEmployee) {
      if (currentEmployee?.id && employeesData.some((e: any) => e.id === currentEmployee.id)) {
        setSelectedEmployee(currentEmployee.id);
      } else {
        setSelectedEmployee(employeesData[0].id);
      }
    }
  }, [isApproverOrAdmin, currentEmployee, employeesData, selectedEmployee]);

  // Query Requests
  const { data, isLoading, refetch } = useCompensatoryLeaveRequests({
    scope: isApproverOrAdmin && activeTab === 'all' ? 'all' : 'my',
    status: statusFilter || undefined,
    search: search.trim() || undefined,
    page,
    page_size: 20,
  });

  // Eligible Attendances for selected employee
  const effectiveEmpId = !isApproverOrAdmin ? (currentEmployee?.id || selectedEmployee) : selectedEmployee;
  const { data: eligibleAttendances } = useEligibleAttendances(
    effectiveEmpId || undefined
  );

  // Selectable dates for attendance: strictly attendances on holidays or company week-offs
  const attendanceOptions = useMemo(() => {
    if (eligibleAttendances && eligibleAttendances.length > 0) {
      return eligibleAttendances.map((a) => ({
        id: a.id,
        attendance_date: a.attendance_date,
        label: a.label,
      }));
    }
    return [];
  }, [eligibleAttendances]);

  // Auto-select first attendance date if available and not yet set
  React.useEffect(() => {
    if (attendanceOptions.length > 0 && !selectedAttendance) {
      setSelectedAttendance(attendanceOptions[0].attendance_date);
    }
  }, [attendanceOptions, selectedAttendance]);

  // Mutations
  const createMutation = useCreateCompensatoryLeaveRequest();
  const updateMutation = useUpdateCompensatoryLeaveRequest();
  const approveMutation = useApproveCompensatoryLeaveRequest();
  const rejectMutation = useRejectCompensatoryLeaveRequest();
  const deleteMutation = useDeleteCompensatoryLeaveRequest();

  // Comments Query & Mutation for currently viewed comments
  const { data: commentsList = [], refetch: refetchComments } = useCompensatoryLeaveComments(
    commentsViewReq?.id || null
  );
  const addCommentMutation = useAddCompensatoryLeaveComment();
  const deleteCommentMutation = useDeleteCompensatoryLeaveComment();

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const empId = !isApproverOrAdmin
      ? (currentEmployee?.id || selectedEmployee)
      : selectedEmployee || (employeesData && employeesData[0]?.id);
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

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReq) return;
    setEditFormError('');

    if (!editAttendance) {
      setEditFormError('Please select an attendance date.');
      return;
    }
    if (!editDescription.trim()) {
      setEditFormError('Please enter a description / reason.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editReq.id,
        attendance_date: editAttendance,
        description: editDescription.trim(),
      });
      setIsEditOpen(false);
      setEditReq(null);
      refetch();
    } catch (err: any) {
      setEditFormError(
        err?.response?.data?.detail ||
        err?.response?.data?.work_date?.[0] ||
        'Failed to update compensatory leave request.'
      );
    }
  };

  // Post Comment Submit
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !commentsViewReq) return;
    try {
      await addCommentMutation.mutateAsync({
        requestId: commentsViewReq.id,
        comment: newCommentText.trim(),
      });
      setNewCommentText('');
      refetchComments();
      refetch();
    } catch (err: any) {
      const msg =
        err?.response?.data?.comment?.[0] ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Unable to post comment.';
      alert(msg);
    }
  };

  // Delete Comment Submit
  const handleDeleteComment = async (commentId: string) => {
    if (!commentsViewReq) return;
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteCommentMutation.mutateAsync({
        requestId: commentsViewReq.id,
        commentId,
      });
      refetchComments();
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete comment.');
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

  // If user clicked comments on a request, show the Comments view matching user screenshot
  if (commentsViewReq) {
    return (
      <div className="p-8 bg-white min-h-screen">
        {/* Top Header matching user screenshot: > Comments */}
        <div className="flex items-center justify-between pb-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCommentsViewReq(null);
                setNewCommentText('');
              }}
              className="flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <span className="text-gray-600 font-bold">&gt;</span>
              <span>Comments</span>
            </button>
            <span className="text-xs text-gray-500 font-medium">
              — {commentsViewReq.employee_name} ({formatDate(commentsViewReq.work_date) || commentsViewReq.formatted_work_date})
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setCommentsViewReq(null);
              setNewCommentText('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
          >
            ← Back to Requests
          </button>
        </div>

        {/* Input box matching screenshot: "Comment here" with full width border */}
        <form onSubmit={handlePostComment} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Comment here"
              className="w-full text-xs px-4 py-3 border border-gray-900 rounded-none bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 text-gray-900"
            />
            {newCommentText.trim() && (
              <button
                type="submit"
                disabled={addCommentMutation.isPending}
                className="absolute right-2 top-2 px-3.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {addCommentMutation.isPending ? 'Posting...' : 'Post'}
              </button>
            )}
          </div>
        </form>

        <div className="border-b border-gray-200 mb-8" />

        {/* Body: Empty State or Comments List */}
        {commentsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base font-medium text-gray-800 mb-8">
              There are no comments to show.
            </p>

            {/* Illustration matching screenshot: speech bubble with user avatar & pencil */}
            <div className="w-28 h-28 flex items-center justify-center">
              <svg
                className="w-24 h-24 text-gray-900"
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Speech bubble outline */}
                <path d="M12 20C12 15.58 15.58 12 20 12H44C48.42 12 52 15.58 52 20V38C52 42.42 48.42 46 44 46H20L12 53V20Z" />
                {/* User avatar head and shoulders inside bubble */}
                <circle cx="21" cy="22" r="3.5" />
                <path d="M15 31C15 28 17.5 26.5 21 26.5C24.5 26.5 27 28 27 31" />
                {/* Text lines */}
                <path d="M31 23H41" />
                <path d="M31 29H41" />
                {/* Pencil angled across */}
                <path d="M48 18L32 38L27 41L30 36L46 16L48 18Z" strokeWidth={2.4} fill="white" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {commentsList.map((c) => (
              <div key={c.id} className="p-4 bg-white border border-gray-200 rounded-md shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {c.author_name ? c.author_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-bold text-gray-900">{c.author_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">
                      {formatDateTime(c.created_at) !== '—' ? formatDateTime(c.created_at) : (c.created_at_display || c.created_at)}
                    </span>
                    {(isApproverOrAdmin || (currentEmployee && c.author === currentEmployee.id)) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Delete comment"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-800 pl-9 whitespace-pre-wrap">{c.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

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

        {isApproverOrAdmin && (
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
        )}
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
                        {formatDate(req.work_date) || req.formatted_work_date || req.work_date}
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
                            setCommentsViewReq(req);
                            setNewCommentText('');
                          }}
                          className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          title="View / Add Comments"
                        >
                          <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center border border-gray-200 rounded divide-x divide-gray-200 bg-white shadow-2xs">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditReq(req);
                              setEditAttendance(req.work_date ? req.work_date.split('T')[0] : '');
                              setEditDescription(req.reason || '');
                              setEditFormError('');
                              setIsEditOpen(true);
                            }}
                            disabled={req.status === 'approved'}
                            className={`p-1.5 transition-colors ${
                              req.status === 'approved'
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
                            }`}
                            title={req.status === 'approved' ? 'Approved request cannot be edited' : 'Edit Request'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(req.id)}
                            disabled={req.status === 'approved'}
                            className={`p-1.5 transition-colors ${
                              req.status === 'approved'
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                            }`}
                            title={req.status === 'approved' ? 'Approved request cannot be deleted' : 'Delete Request'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>

                      {/* Confirmation: Approve & Reject buttons */}
                      <td className="py-3 px-3 text-center">
                        {isRequested &&
                        isApproverOrAdmin &&
                        (!currentEmployee ||
                          (req.employee !== currentEmployee.id &&
                            req.employee_id !== currentEmployee.id)) ? (
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
                  disabled={!isApproverOrAdmin}
                  onChange={(e) => {
                    setSelectedEmployee(e.target.value);
                    setSelectedAttendance('');
                  }}
                  className={`w-full text-xs px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    !isApproverOrAdmin ? 'bg-gray-100 cursor-not-allowed opacity-90' : ''
                  }`}
                >
                  {!isApproverOrAdmin && currentEmployee ? (
                    <option value={currentEmployee.id}>
                      {currentEmployee.first_name} {currentEmployee.last_name} ({currentEmployee.employee_id || 'ID'})
                    </option>
                  ) : (
                    <>
                      <option value="">Select Employee</option>
                      {employeesData?.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id || 'ID'})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {!isApproverOrAdmin && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Logged-in employee is automatically selected.
                  </p>
                )}
              </div>

              {/* Attendance * Dropdown */}
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
                  {isApproverOrAdmin && (
                    <option value="custom">-- Custom Date (Enter Below) --</option>
                  )}
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

      {/* Edit Compensatory Leave Request Modal */}
      {isEditOpen && editReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Edit Compensatory Leave Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditReq(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {editFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                  {editFormError}
                </div>
              )}

              {/* Employee (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Employee
                </label>
                <input
                  type="text"
                  disabled
                  value={`${editReq.employee_name} ${editReq.employee_code ? `(${editReq.employee_code})` : ''}`}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* Attendance Date * */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Attendance Date *
                </label>
                <input
                  type="date"
                  value={editAttendance}
                  onChange={(e) => setEditAttendance(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Description * */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Description *
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Blue Save button */}
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
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
                <span className="text-gray-900">{formatDate(commentModalReq.work_date) || commentModalReq.formatted_work_date}</span>
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
