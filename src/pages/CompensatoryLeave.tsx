import { HRMSTable } from '@/components/DataTable/HRMSTable';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { EMPLOYEES } from '@/lib/endpoints';
import { useDefaultPaginationSize, useHRSettings } from '@/hooks/useHRSettings';
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
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { SegmentedButton } from '@/components/ui/SegmentedControl/SegmentedControl';
import { StateView } from '@/components/ui/StateView';

export default function CompensatoryLeave() {
  const { showToast } = useToast();
  const { hasPermission } = useHrmsPermissionsContext();
  const canCreate = hasPermission('compensatory_leave.create');
  const canApprove = hasPermission('compensatory_leave.approve') || hasPermission('leaves.approve');
  const canReject = hasPermission('compensatory_leave.reject') || hasPermission('leaves.reject');
  const canDelete = hasPermission('compensatory_leave.delete');
  const isApproverOrAdmin = canApprove || canReject;

  // HR Settings integration
  const { data: hrSettings } = useHRSettings();
  const compSettings = hrSettings?.compensatory_leave_settings;
  const isRequestEnabled = compSettings?.request_enabled !== false;
  const configuredDays = compSettings?.total_days !== undefined ? String(compSettings.total_days) : '1.0';
  const configuredTypeName = compSettings?.leave_type_name || 'Compensatory Leave Type';
  const configuredPayment = compSettings?.payment || 'Paid';

  // Tabs: 'my' = My Compensatory Leave Requests, 'all' = Compensatory Leave Requests (approver / all)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const pageSize = useDefaultPaginationSize();
  const [page, setPage] = useState(1);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAttendance, setSelectedAttendance] = useState('');
  const [requestDays, setRequestDays] = useState(configuredDays);
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
    page_size: pageSize,
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
        days: requestDays || configuredDays,
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
      showToast(msg, 'error');
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
      showToast(err?.response?.data?.detail || 'Failed to delete comment.', 'error');
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
      showToast(err?.response?.data?.detail || 'Action failed.', 'error');
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this compensatory leave request?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Delete failed.', 'error');
    }
  };

  // If user clicked comments on a request, show the Comments view matching user screenshot
  if (commentsViewReq) {
    return (
      <PageContainer>
        <PageHeader
          title="Comments"
          subtitle={`${commentsViewReq.employee_name} (${formatDate(commentsViewReq.work_date) || commentsViewReq.formatted_work_date})`}
          actions={
            <Button variant="soft" size="small" startIcon={<Iconify icon="arrow-left" />} onClick={() => {
              setCommentsViewReq(null);
              setNewCommentText('');
            }}>Back to Requests
            </Button>
          }
        />
        {/* Input box matching screenshot: "Comment here" with full width border */}
        <form onSubmit={handlePostComment} className="mb-4">
          <div className="relative">
            <Input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Comment here"
            />
            {newCommentText.trim() && (
              <Button size="small"
                type="submit"
                disabled={addCommentMutation.isPending}
                className="absolute"
              >
                {addCommentMutation.isPending ? 'Posting...' : 'Post'}
              </Button>
            )}
          </div>
        </form>

        <div className="border-b border-divider mb-8" />

        {/* Body: Empty State or Comments List */}
        {commentsList.length === 0 ? (
          <StateView icon="feedback" title="There are no comments to show." />
        ) : (
          <div className="space-y-4 max-w-3xl">
            {commentsList.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-lighter text-primary-dark flex items-center justify-center text-xs font-bold">
                      {c.author_name ? c.author_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-bold text-ink-primary">{c.author_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-disabled">
                      {formatDateTime(c.created_at) !== '—' ? formatDateTime(c.created_at) : (c.created_at_display || c.created_at)}
                    </span>
                    {(isApproverOrAdmin || (currentEmployee && c.author === currentEmployee.id)) && (
                      <IconButton icon="trash" size="small" color="error" onClick={() => handleDeleteComment(c.id)} aria-label="Delete comment" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-ink-primary pl-9 whitespace-pre-wrap">{c.comment}</p>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  const requests = data?.results || [];

  return (
    <PageContainer>
      <PageHeader title="Compensatory Leave Requests" />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          aria-label="Request views"
          items={[
            { value: 'my', label: 'My Compensatory Leave Requests' },
            ...(isApproverOrAdmin ? [{ value: 'all' as const, label: 'Compensatory Leave Requests' }] : []),
          ]}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setPage(1);
          }}
        />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="w-48 pl-8 pr-3 sm:w-56"
            />
            <Iconify icon="search" width={16} className="absolute left-2.5 top-3 text-ink-disabled" />
          </div>

          <div className="relative translate-y-0.5">
            <SegmentedButton
              selected={Boolean(statusFilter) || isFilterOpen}
              aria-expanded={isFilterOpen}
              aria-haspopup="true"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Iconify icon="filter" className="mr-2" />
              Filter {statusFilter && `(${statusFilter})`}
            </SegmentedButton>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-divider bg-surface-paper p-3 shadow-xl z-30">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                  Filter by Status
                </p>
                <div className="flex flex-col items-stretch gap-2">
                  {['', 'approved', 'requested', 'rejected'].map((s) => (
                    <SegmentedButton
                      key={s}
                      selected={statusFilter === s}
                      className="w-full !justify-start"
                      onClick={() => {
                        setStatusFilter(s);
                        setIsFilterOpen(false);
                        setPage(1);
                      }}
                    >
                      {s === '' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </SegmentedButton>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            size="medium"
            type="button"
            onClick={() => {
              if (!canCreate || !isRequestEnabled) return;
              setIsCreateOpen(true);
              setRequestDays(configuredDays);
              setFormError('');
              if (employeesData && employeesData.length > 0 && !selectedEmployee) {
                setSelectedEmployee(employeesData[0].id);
              }
              if (attendanceOptions.length > 0 && !selectedAttendance) {
                setSelectedAttendance(attendanceOptions[0].attendance_date);
              }
            }}
            disabled={!canCreate || !isRequestEnabled}
            title={
              !isRequestEnabled
                ? 'Compensatory leave requests are disabled in Settings'
                : !canCreate
                ? 'Create permission required'
                : 'Create Compensatory Leave Request'
            }
          >
            <span>+ Create</span>
          </Button>
        </div>
      </div>

      {/* Status Indicators Legend matching Screenshots 1, 2, 4 */}
      <div className="mb-2 flex items-center justify-end gap-4 text-xs font-medium text-ink-primary">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success-main inline-block"></span>
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-main inline-block"></span>
          <span>Requested</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-error-main inline-block"></span>
          <span>Rejected</span>
        </div>
      </div>

      {/* Main Content: Table or Empty State */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-ink-secondary">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-main mb-3"></div>
            <p className="text-xs font-medium">Loading compensatory leave requests...</p>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State matching Screenshot 1 */
          <StateView icon="inbox" title="You have No leave requests for this filter." />
        ) : (
          /* Table View matching Screenshots 2 & 4 */
          <div className="overflow-x-auto">
            <HRMSTable className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-neutral/80 border-b border-divider text-ink-primary font-semibold">
                  <th className="py-3 px-4 min-w-[200px]">
                    <span className="inline-flex items-center gap-1">Employee</span>
                  </th>
                  <th className="py-3 px-3 min-w-[150px]">Leave Type</th>
                  <th className="py-3 px-3 min-w-[140px]">Attendance Dates</th>
                  <th className="py-3 px-3 min-w-[120px]">
                    <span className="inline-flex items-center gap-1">Requested Days</span>
                  </th>
                  <th className="py-3 px-3 min-w-[160px]">
                    <span className="inline-flex items-center gap-1">Created By</span>
                  </th>
                  <th className="py-3 px-3 min-w-[110px]">Status</th>
                  <th className="py-3 px-3 min-w-[180px]">Description</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Comment</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Actions</th>
                  <th className="py-3 px-3 text-center min-w-[120px]">Confirmation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {requests.map((req) => {
                  const isApproved = req.status === 'approved';
                  const isRejected = req.status === 'rejected';
                  const isRequested = req.status === 'submitted' || req.status === 'draft';

                  return (
                    <tr key={req.id} className="hover:bg-primary-lighter/20 transition-colors relative">
                      {/* Employee Column with Avatar & Left Indicator Pill */}
                      <td className="py-3 px-4 relative">
                        {/* Status Left Edge Bar */}
                        <span
                          className={`absolute left-0 top-1 bottom-1 w-1 rounded-r ${
                            isApproved
                              ? 'bg-success-main'
                              : isRejected
                              ? 'bg-error-main'
                              : 'bg-primary-main'
                          }`}
                        />
                        <div className="flex items-center gap-2.5 pl-1">
                          <div className="w-7 h-7 rounded-full bg-grey-200 text-ink-secondary flex items-center justify-center shrink-0">
                            <Iconify icon="user" width={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-ink-primary">
                              {req.employee_name || 'Employee'}
                            </span>
                            {req.employee_code && (
                              <span className="text-[11px] text-ink-secondary">
                                ({req.employee_code})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3 px-3 text-ink-primary font-medium">
                        {req.leave_type_name || 'Compensatory Leave'}
                      </td>

                      {/* Attendance Dates */}
                      <td className="py-3 px-3 text-ink-primary font-medium whitespace-nowrap">
                        {formatDate(req.work_date) || req.formatted_work_date || req.work_date}
                      </td>

                      {/* Requested Days */}
                      <td className="py-3 px-3 text-ink-primary font-bold">
                        {Number(req.days).toFixed(1)}
                      </td>

                      {/* Created By */}
                      <td className="py-3 px-3 text-ink-secondary font-medium">
                        {req.created_by || req.employee_name}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold text-xs ${
                            isApproved
                              ? 'text-success-main'
                              : isRejected
                              ? 'text-error-main'
                              : 'text-primary-main'
                          }`}
                        >
                          {req.status_display || (isRequested ? 'Requested' : req.status)}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3 text-ink-secondary max-w-[220px] truncate" title={req.reason}>
                        {req.reason || '—'}
                      </td>

                      {/* Comment */}
                      <td className="py-3 px-3 text-center">
                        <IconButton
                          icon="feedback"
                          size="small"
                          onClick={() => {
                            setCommentsViewReq(req);
                            setNewCommentText('');
                          }}
                          aria-label="View / Add Comments"
                        />
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          {/* Edit Button */}
                          <IconButton
                            icon="pencil"
                            size="small"
                            onClick={() => {
                              setEditReq(req);
                              setEditAttendance(req.work_date ? req.work_date.split('T')[0] : '');
                              setEditDescription(req.reason || '');
                              setEditFormError('');
                              setIsEditOpen(true);
                            }}
                            disabled={req.status === 'approved'}
                            aria-label={req.status === 'approved' ? 'Approved request cannot be edited' : 'Edit Request'}
                          />

                          {/* Delete Button */}
                          <IconButton
                            icon="trash"
                            size="small"
                            color="error"
                            onClick={() => handleDelete(req.id)}
                            disabled={req.status === 'approved'}
                            aria-label={req.status === 'approved' ? 'Approved request cannot be deleted' : 'Delete Request'}
                          />
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
                              <IconButton icon="check" size="small" color="success" onClick={() => {
                                  setCommentModalReq(req);
                                  setConfirmAction('approve');
                                }} aria-label="Approve Request" />
                            )}
                            {canReject && (
                              <IconButton icon="close" size="small" color="error" onClick={() => {
                                  setCommentModalReq(req);
                                  setConfirmAction('reject');
                                }} aria-label="Reject Request" />
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-disabled text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </HRMSTable>
          </div>
        )}

        {/* Bottom Pagination matching Screenshot 2 & 4 */}
        <div className="bg-surface-neutral border-t border-divider px-4 py-3 flex items-center justify-between text-xs text-ink-primary">
          <div>
            Page <span className="font-semibold">{data?.current_page || 1}</span> of{' '}
            <span className="font-semibold">{data?.total_pages || 1}</span>.
          </div>

          <div className="flex items-center gap-2">
            <span>Page</span>
            <Input
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
              className="w-12 text-center font-medium"
            />
            <span>of {data?.total_pages || 1}</span>

            {/* Blue Navigation Buttons */}
            <div className="flex items-center gap-1 ml-2">
              <Button size="small"
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <Button size="small"
                type="button"
                onClick={() => setPage((p) => Math.min(data?.total_pages || 1, p + 1))}
                disabled={page >= (data?.total_pages || 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Create Compensatory Leave Request Modal matching Screenshot 3 */}
      {isCreateOpen && (
        <Modal open onClose={() => setIsCreateOpen(false)} labelledBy="CompensatoryLeave-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-divider">
              <h2 id="CompensatoryLeave-modal-title-1" className="text-lg font-bold text-ink-primary">
                Create Compensatory Leave Request
              </h2>
              <IconButton icon="close" size="small" onClick={() => setIsCreateOpen(false)} aria-label="Close" />
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-error-lighter border border-error-light rounded text-xs text-error-dark font-medium">
                  {formError}
                </div>
              )}

              {/* Employee * */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Employee *
                </label>
                <Select selectSize="small"
                  value={selectedEmployee}
                  disabled={!isApproverOrAdmin}
                  onChange={(e) => {
                    setSelectedEmployee(e.target.value);
                    setSelectedAttendance('');
                  }}
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
                </Select>
                {!isApproverOrAdmin && (
                  <p className="text-[11px] text-ink-disabled mt-1">
                    Logged-in employee is automatically selected.
                  </p>
                )}
              </div>

              {/* Attendance * Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Attendance *
                </label>
                <Select
                  value={selectedAttendance}
                  onChange={(e) => setSelectedAttendance(e.target.value)}
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
                </Select>
                {selectedAttendance === 'custom' && (
                  <div className="mt-2">
                    <Input
                      type="date"
                      onChange={(e) => setSelectedAttendance(e.target.value)}
                    />
                    <p className="text-[11px] text-ink-disabled mt-1">
                      Enter the rest day, weekend, or holiday date worked.
                    </p>
                  </div>
                )}
              </div>

              {/* Compensatory Leave Type Details Card from Settings */}
              <div className="rounded-lg bg-surface-neutral/60 border border-divider p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-ink-secondary">Leave Type:</span>
                  <span className="font-semibold text-ink-primary">{configuredTypeName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-secondary">Payment:</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      configuredPayment === 'Paid'
                        ? 'bg-success-lighter text-success-dark'
                        : configuredPayment === 'Unpaid'
                        ? 'bg-error-lighter text-error-dark'
                        : 'bg-warning-lighter text-warning-dark'
                    }`}
                  >
                    {configuredPayment}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-secondary">Default Allocation:</span>
                  <span className="font-semibold text-ink-primary">{configuredDays} day(s)</span>
                </div>
              </div>

              {/* Requested Days */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Requested Days *
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={requestDays}
                  onChange={(e) => setRequestDays(e.target.value)}
                  placeholder={configuredDays}
                />
              </div>

              {/* Description * */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Description *
                </label>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                />
              </div>

              {/* Modal Footer with Blue Save button matching requirement */}
              <div className="flex justify-end pt-3">
                <Button size="small"
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Edit Compensatory Leave Request Modal */}
      {isEditOpen && editReq && (
        <Modal open onClose={() => {
                  setIsEditOpen(false);
                  setEditReq(null);
                }} labelledBy="CompensatoryLeave-modal-title-2" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-4 border-b border-divider flex items-center justify-between">
              <h3 id="CompensatoryLeave-modal-title-2" className="text-sm font-bold text-ink-primary">
                Edit Compensatory Leave Request
              </h3>
              <IconButton icon="close" size="small" onClick={() => {
                  setIsEditOpen(false);
                  setEditReq(null);
                }} aria-label="Close" />
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {editFormError && (
                <div className="p-3 bg-error-lighter border border-error-light rounded text-xs text-error-dark font-medium">
                  {editFormError}
                </div>
              )}

              {/* Employee (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Employee
                </label>
                <Input
                  type="text"
                  disabled
                  value={`${editReq.employee_name} ${editReq.employee_code ? `(${editReq.employee_code})` : ''}`}
                  className="cursor-not-allowed"
                />
              </div>

              {/* Attendance Date * */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Attendance Date *
                </label>
                <Input
                  type="date"
                  value={editAttendance}
                  onChange={(e) => setEditAttendance(e.target.value)}
                />
              </div>

              {/* Description * */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Description *
                </label>
                <Textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                />
              </div>

              {/* Blue Save button */}
              <div className="flex justify-end pt-3">
                <Button size="small"
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Decision / Comment Modal */}
      {commentModalReq && (
        <Modal open onClose={() => {
                  setCommentModalReq(null);
                  setConfirmAction(null);
                }} labelledBy="CompensatoryLeave-modal-title-3" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-4 border-b border-divider flex items-center justify-between">
              <h3 id="CompensatoryLeave-modal-title-3" className="text-sm font-bold text-ink-primary">
                {confirmAction === 'approve'
                  ? 'Approve Compensatory Leave'
                  : confirmAction === 'reject'
                  ? 'Reject Compensatory Leave'
                  : 'Compensatory Leave Details'}
              </h3>
              <IconButton icon="close" size="small" onClick={() => {
                  setCommentModalReq(null);
                  setConfirmAction(null);
                }} aria-label="Close" />
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-ink-secondary">Employee: </span>
                <span className="text-ink-primary">{commentModalReq.employee_name}</span>
              </div>
              <div>
                <span className="font-semibold text-ink-secondary">Attendance Date: </span>
                <span className="text-ink-primary">{formatDate(commentModalReq.work_date) || commentModalReq.formatted_work_date}</span>
              </div>
              <div>
                <span className="font-semibold text-ink-secondary">Reason: </span>
                <p className="mt-1 p-2 bg-surface-neutral rounded text-ink-primary border border-divider">
                  {commentModalReq.reason || 'No description provided.'}
                </p>
              </div>

              {confirmAction && (
                <div>
                  <label className="block font-semibold text-ink-primary mb-1">
                    Approver Comment / Note
                  </label>
                  <Textarea
                    rows={3}
                    value={approverComment}
                    onChange={(e) => setApproverComment(e.target.value)}
                    placeholder="Enter approval or rejection comments..."
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-neutral border-t border-divider flex justify-end gap-2">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => {
                  setCommentModalReq(null);
                  setConfirmAction(null);
                }}
              >
                Close
              </Button>

              {confirmAction && (
                <Button size="small"
                  type="button"
                  onClick={handleConfirmDecision}
                >
                  Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
