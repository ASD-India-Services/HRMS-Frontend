import { useState, useMemo, useRef, useEffect } from 'react';
import {
  useDocumentRequests,
  useDocumentRequestSummary,
  useCreateDocumentRequest,
  useApproveDocumentRequest,
  useRejectDocumentRequest,
  useDeleteDocumentRequest,
} from '@/hooks/useDocumentRequests';
import {
  type DocumentRequest,
} from '@/types/documents';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { Modal } from '@/components/ui/Modal';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { StateView } from '@/components/ui/StateView';
import { StatCard } from '@/components/ui/StatCard';

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  employee_id?: string;
  department?: { id: string; name: string } | string;
  department_name?: string;
  designation?: { id: string; name: string } | string;
  designation_name?: string;
}

export default function DocumentRequests() {
  const { hasPermission } = useHrmsPermissionsContext();
  const canApprove = hasPermission('document_requests.approve') || hasPermission('documents.manage');
  const canReject = hasPermission('document_requests.reject') || hasPermission('documents.manage');
  const canCreate = hasPermission('document_requests.create') || hasPermission('documents.create') || hasPermission('documents.manage');
  const canDelete = hasPermission('document_requests.delete') || hasPermission('documents.delete') || hasPermission('documents.manage');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<DocumentRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<DocumentRequest | null>(null);
  const [viewingRequest, setViewingRequest] = useState<DocumentRequest | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states for Document Request (matches DigiHRMS / Horilla format)
  const [formTitle, setFormTitle] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showEmployeeFilter, setShowEmployeeFilter] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [formFormat, setFormFormat] = useState('');
  const [formMaxSize, setFormMaxSize] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);

  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Form states for Approve & Issue
  const [approveFile, setApproveFile] = useState<File | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [approveError, setApproveError] = useState<string | null>(null);

  // Form states for Reject
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Queries
  const { data: summary } = useDocumentRequestSummary();
  const { data: requestsData, isLoading, isError, error } = useDocumentRequests({
    status: selectedStatus || undefined,
    format: selectedFormat || undefined,
    search: search.trim() || undefined,
    page_size: 100,
  });

  // Fetch employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees-compact'],
    queryFn: async () => {
      const res = await api.get<{ results: EmployeeOption[] }>('/api/v1/employees/', {
        params: { page_size: 200 },
      });
      return res.data?.results || [];
    },
    staleTime: 60_000,
  });

  // Fetch departments for employee filter
  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      try {
        const res = await api.get<{ results: { id: string; name: string }[] }>('/api/v1/departments/', {
          params: { page_size: 100 },
        });
        return res.data?.results || [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  // Filtered employees for dropdown
  const filteredEmployeesForSelection = useMemo(() => {
    if (!employeesData) return [];
    return employeesData.filter((emp) => {
      const deptName =
        emp.department_name || (typeof emp.department === 'object' ? emp.department?.name : emp.department) || '';
      const matchesDept = selectedDeptFilter ? deptName === selectedDeptFilter : true;
      const fullName = (emp.full_name || `${emp.first_name} ${emp.last_name}`).toLowerCase();
      const code = (emp.employee_id || '').toLowerCase();
      const term = employeeSearchTerm.toLowerCase();
      const matchesSearch = term ? fullName.includes(term) || code.includes(term) : true;
      return matchesDept && matchesSearch;
    });
  }, [employeesData, selectedDeptFilter, employeeSearchTerm]);

  // Mutations
  const createMutation = useCreateDocumentRequest();
  const approveMutation = useApproveDocumentRequest();
  const rejectMutation = useRejectDocumentRequest();
  const deleteMutation = useDeleteDocumentRequest();

  const handleOpenRequestModal = () => {
    setRequestError(null);
    setFormTitle('');
    setSelectedEmployees([]);
    setEmployeeSearchTerm('');
    setShowEmployeeFilter(false);
    setSelectedDeptFilter('');
    setIsEmployeeDropdownOpen(false);
    setFormFormat('');
    setFormMaxSize('');
    setFormDescription('');
    setShowRequestModal(true);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setRequestError('Title is required.');
      return;
    }

    try {
      if (selectedEmployees.length > 1) {
        await createMutation.mutateAsync({
          title: formTitle.trim(),
          employee_ids: selectedEmployees,
          employee: selectedEmployees[0],
          format: formFormat || undefined,
          max_size: formMaxSize ? parseInt(formMaxSize, 10) : undefined,
          description: formDescription.trim(),
          reason: formDescription.trim() || formTitle.trim(),
          request_type: 'custom',
        });
      } else {
        await createMutation.mutateAsync({
          title: formTitle.trim(),
          employee: selectedEmployees[0] || undefined,
          format: formFormat || undefined,
          max_size: formMaxSize ? parseInt(formMaxSize, 10) : undefined,
          description: formDescription.trim(),
          reason: formDescription.trim() || formTitle.trim(),
          request_type: 'custom',
        });
      }
      setShowRequestModal(false);
      showToast('Document request saved successfully!');
    } catch (err: any) {
      const resp = err?.response?.data;
      const msg =
        resp?.error ||
        resp?.detail ||
        (typeof resp === 'object' ? Object.values(resp).flat().join(', ') : 'Failed to save document request.');
      setRequestError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleConfirmApprove = async () => {
    if (!approvingRequest) return;
    setApproveError(null);
    try {
      await approveMutation.mutateAsync({
        id: approvingRequest.id,
        file: approveFile,
        adminNotes: approveNotes.trim() || undefined,
      });
      setApprovingRequest(null);
      setApproveFile(null);
      setApproveNotes('');
      showToast(`Request for "${approvingRequest.title}" approved and completed.`);
    } catch (err: any) {
      const resp = err?.response?.data;
      const msg = resp?.error || resp?.detail || 'Failed to approve request.';
      setApproveError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required.');
      return;
    }
    setRejectError(null);
    try {
      await rejectMutation.mutateAsync({
        id: rejectingRequest.id,
        rejectionReason: rejectReason.trim(),
        adminNotes: rejectNotes.trim() || undefined,
      });
      setRejectingRequest(null);
      setRejectReason('');
      setRejectNotes('');
      showToast(`Request rejected for "${rejectingRequest.title}".`, 'error');
    } catch (err: any) {
      const resp = err?.response?.data;
      const msg = resp?.error || resp?.detail || 'Failed to reject request.';
      setRejectError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      setDeleteTargetId(null);
      showToast('Document request removed.');
    } catch (err: any) {
      showToast('Failed to delete document request.', 'error');
    }
  };

  const filteredRequests = useMemo(() => {
    return requestsData?.results || [];
  }, [requestsData]);

  return (
    <PageContainer>
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium shadow-sm border animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-success-lighter text-success-dark border-success-light'
              : 'bg-error-lighter text-error-dark border-error-light'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <Iconify icon="check" width={20} className="text-success-main" />
            ) : (
              <Iconify icon="close" width={20} className="text-error-main" />
            )}
            <span>{notification.message}</span>
          </div>
          <IconButton icon="close" size="small" onClick={() => setNotification(null)} aria-label="Close" />
        </div>
      )}

      <PageHeader
        title="Document Requests"
        subtitle="Employees can request verified certificates, proof of employment, and service letters."
        actions={
          canCreate && (
            <Button startIcon={<Iconify icon="plus" />} onClick={handleOpenRequestModal}>
              Create
            </Button>
          )
        }
      />
      {/* KPI Metric Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total Requests" value={summary?.total ?? 0} icon="leavePolicies" />
        <StatCard title="Pending Review" value={summary?.pending ?? 0} icon="attendance" />
        <StatCard title="Approved & Issued" value={summary?.approved ?? 0} icon="approvers" />
        <StatCard title="Rejected" value={summary?.rejected ?? 0} icon="leaveBlock" />
      </div>
      {/* Filter and Search Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-divider bg-surface-neutral/80 px-3 py-1.5 focus-within:border-primary-main focus-within:bg-surface-paper focus-within:ring-1 focus-within:ring-primary-main">
          <Iconify icon="search" width={16} className="text-ink-disabled" />
          <input
            type="text"
            placeholder="Search employee, title, format, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-ink-primary placeholder-ink-disabled focus:outline-none"
          />
          {search && (
            <IconButton icon="close" size="small" onClick={() => setSearch('')} aria-label="Close" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="in_progress">In Progress</option>
            <option value="approved">Approved / Issued</option>
            <option value="rejected">Rejected</option>
          </Select>

          {/* Format Filter */}
          <Select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
          >
            <option value="">All Formats</option>
            <option value="PDF">PDF</option>
            <option value="DOCX">DOCX</option>
            <option value="JPG">JPG</option>
            <option value="PNG">PNG</option>
            <option value="TXT">TXT</option>
            <option value="XLSX">XLSX</option>
          </Select>
        </div>
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
          <span className="ml-3 text-sm text-ink-secondary">Loading document requests...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-error-light bg-error-lighter p-4 text-xs text-error-dark">
          Failed to load document requests. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRequests.length === 0 && (
        <Card>
          <StateView
            icon="leavePolicies"
            title="No document requests found"
            description={
              search || selectedStatus || selectedFormat
                ? 'Try clearing the search or filters to see more results.'
                : 'Click "Create" to request documents or certificates from employees.'
            }
            action={
              <Button size="small" startIcon={<Iconify icon="plus" />} onClick={handleOpenRequestModal}>
                Create Document Request
              </Button>
            }
          />
        </Card>
      )}

      {/* Table of Requests */}
      {!isLoading && filteredRequests.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-secondary">
              <thead className="border-b border-divider bg-surface-neutral/75 text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Title</th>
                  <th className="px-4 py-3.5">Format & Max Size</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Requested Date</th>
                  <th className="px-4 py-3.5">Issued File</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-neutral/80 transition-colors">
                    {/* Employee */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-lighter text-xs font-bold text-primary-dark">
                          {req.employee_name
                            ? req.employee_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            : 'EM'}
                        </span>
                        <div>
                          <p className="font-semibold text-ink-primary">{req.employee_name || '—'}</p>
                          <p className="text-[11px] text-ink-disabled">
                            {req.employee_code && <span className="font-mono">{req.employee_code} • </span>}
                            {req.department_name || 'General'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink-primary">{req.title}</p>
                    </td>

                    {/* Format & Max Size */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {req.format ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-lighter px-2 py-0.5 text-[11px] font-semibold text-primary-dark border border-primary-light">
                          <span>{req.format}</span>
                          {req.max_size && <span className="text-primary-main font-normal">• Max {req.max_size} MB</span>}
                        </span>
                      ) : req.max_size ? (
                        <span className="inline-flex items-center rounded-md bg-surface-neutral px-2 py-0.5 text-[11px] font-medium text-ink-primary">
                          Max {req.max_size} MB
                        </span>
                      ) : (
                        <span className="text-ink-disabled text-xs">Any format</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3.5 max-w-[240px]">
                      <p className="truncate text-xs text-ink-primary" title={req.description || req.reason}>
                        {req.description || req.reason || '—'}
                      </p>
                      {req.admin_notes && (
                        <p className="mt-0.5 text-[10px] text-ink-secondary truncate" title={`HR note: ${req.admin_notes}`}>
                          Note: {req.admin_notes}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-lighter px-2.5 py-0.5 text-[11px] font-semibold text-success-dark border border-success-light">
                          <Iconify icon="check" width={12} className="text-success-main" />
                          Approved
                        </span>
                      )}
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-lighter px-2.5 py-0.5 text-[11px] font-semibold text-warning-dark border border-warning-light">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning-main" />
                          Pending Review
                        </span>
                      )}
                      {req.status === 'in_progress' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary-lighter px-2.5 py-0.5 text-[11px] font-semibold text-secondary-dark border border-secondary-light">
                          In Progress
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-error-lighter px-2.5 py-0.5 text-[11px] font-semibold text-error-dark border border-error-light">
                            Rejected
                          </span>
                          {req.rejection_reason && (
                            <p className="text-[10px] text-error-main truncate max-w-[140px]" title={req.rejection_reason}>
                              {req.rejection_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink-secondary">
                      {new Date(req.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                      {/* Issued Document */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {req.issued_document ? (
                          <ButtonLink
                            size="small"
                            variant="soft"
                            color="success"
                            href={req.issued_document}
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<Iconify icon="download" />}
                          >
                            Download
                          </ButtonLink>
                        ) : req.status === 'approved' ? (
                          <span className="text-[11px] text-ink-disabled">Approved (No file)</span>
                        ) : (
                          <span className="text-[11px] text-ink-disabled">Awaiting HR</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Action */}
                          {req.status === 'pending' && canApprove && (
                            <Button variant="soft" color="success" size="small" startIcon={<Iconify icon="check" />} onClick={() => {
                                setApproveError(null);
                                setApproveFile(null);
                                setApproveNotes('');
                                setApprovingRequest(req);
                              }} title="Approve & issue document">Approve</Button>
                          )}

                          {/* Reject Action */}
                          {req.status === 'pending' && canReject && (
                            <Button variant="soft" color="error" size="small" startIcon={<Iconify icon="close" />} onClick={() => {
                                setRejectError(null);
                                setRejectReason('');
                                setRejectNotes('');
                                setRejectingRequest(req);
                              }} title="Reject request">Reject</Button>
                          )}

                          {/* Details */}
                          <IconButton icon="eye" size="small" onClick={() => setViewingRequest(req)} aria-label="View details" />

                          {/* Delete (if pending) */}
                          {req.status === 'pending' && canDelete && (
                            <IconButton icon="trash" size="small" color="error" onClick={() => setDeleteTargetId(req.id)} aria-label="Cancel / Delete request" />
                          )}
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── MODAL 1: Document Request (DigiHRMS Form Format) ───────────────── */}
      {showRequestModal && (
        <Modal open onClose={() => setShowRequestModal(false)} labelledBy="DocumentRequests-modal-title-1" size="lg" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 sm:p-8 min-h-0 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <h3 id="DocumentRequests-modal-title-1" className="text-xl font-normal text-ink-primary">Document Request</h3>
              <IconButton icon="close" size="small" onClick={() => setShowRequestModal(false)} aria-label="Close" />
            </div>

            {requestError && (
              <div className="mb-3 rounded-md bg-error-lighter p-2.5 text-xs text-error-dark border border-error-light">
                {requestError}
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="rounded-md border border-divider p-5 sm:p-6 bg-surface-paper space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-normal text-ink-primary mb-1.5">Title</label>
                <Input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Title"
                />
              </div>

              {/* Employee */}
              <div>
                <label className="block text-sm font-normal text-ink-primary mb-1.5">Employee</label>
                <div ref={employeeDropdownRef} className="relative">
                  <div
                    onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                    className="w-full min-h-[38px] rounded border border-divider px-3.5 py-2 text-sm text-ink-primary bg-surface-paper cursor-pointer flex items-center justify-between hover:border-grey-400"
                  >
                    <div className="flex flex-wrap gap-1 items-center flex-1 pr-2">
                      {selectedEmployees.length === 0 ? (
                        <span className="text-ink-disabled text-sm"></span>
                      ) : selectedEmployees.length === 1 ? (
                        (() => {
                          const emp = employeesData?.find((e) => e.id === selectedEmployees[0]);
                          return emp ? (
                            <span className="text-ink-primary text-sm">
                              {emp.full_name || `${emp.first_name} ${emp.last_name}`} {emp.employee_id ? `(${emp.employee_id})` : ''}
                            </span>
                          ) : (
                            <span className="text-ink-primary text-sm">1 employee selected</span>
                          );
                        })()
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded bg-primary-lighter text-primary-dark px-2 py-0.5 text-xs font-semibold border border-primary-light">
                          {selectedEmployees.length} employees selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-ink-disabled">
                      <Iconify icon="chevron-up" width={16} className="text-ink-disabled" />
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {isEmployeeDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-60 overflow-y-auto rounded-md border border-divider bg-surface-paper p-2 shadow-lg">
                      <div className="p-1 mb-1">
                        <Input
                          type="text"
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          placeholder="Search employee name or code..."
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="divide-y divide-divider max-h-48 overflow-y-auto">
                        {filteredEmployeesForSelection.map((emp) => {
                          const isSelected = selectedEmployees.includes(emp.id);
                          const deptName =
                            emp.department_name ||
                            (typeof emp.department === 'object' ? emp.department?.name : emp.department) ||
                            '';
                          return (
                            <div
                              key={emp.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedEmployees(selectedEmployees.filter((id) => id !== emp.id));
                                } else {
                                  setSelectedEmployees([...selectedEmployees, emp.id]);
                                }
                              }}
                              className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer rounded hover:bg-surface-neutral ${
                                isSelected ? 'bg-primary-lighter/60 font-semibold text-primary-main' : 'text-ink-primary'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="h-3.5 w-3.5 rounded border-divider text-primary-main focus:ring-primary-main"
                                />
                                <span>
                                  {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                                </span>
                              </div>
                              <span className="text-[11px] text-ink-disabled">
                                {emp.employee_id} {deptName ? `• ${deptName}` : ''}
                              </span>
                            </div>
                          );
                        })}
                        {filteredEmployeesForSelection.length === 0 && (
                          <div className="p-3 text-center text-xs text-ink-disabled">No employees match the filter</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Link below employee */}
                <div className="flex justify-end mt-1.5">
                  <Button variant="text" size="small" onClick={() => setShowEmployeeFilter(!showEmployeeFilter)}>
                    <span className="h-2 w-2 rounded-full bg-primary-main inline-block" />
                    <span>Filter</span>
                  </Button>
                </div>

                {/* Filter Expand Panel */}
                {showEmployeeFilter && (
                  <div className="mt-2 rounded-lg border border-primary-light bg-primary-lighter/40 p-3 space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-primary">Filter Employees</span>
                      <div className="flex items-center gap-2">
                        <Button variant="text" onClick={() => {
                            const allIds = filteredEmployeesForSelection.map((e) => e.id);
                            setSelectedEmployees(allIds);
                          }}>
                          Select All ({filteredEmployeesForSelection.length})
                        </Button>
                        <span className="text-grey-300">|</span>
                        <Button variant="text" color="inherit" onClick={() => setSelectedEmployees([])}>
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-ink-secondary mb-1">Department</label>
                        <Select
                          value={selectedDeptFilter}
                          onChange={(e) => setSelectedDeptFilter(e.target.value)}
                        >
                          <option value="">All Departments</option>
                          {departmentsData?.map((dept) => (
                            <option key={dept.id} value={dept.name}>
                              {dept.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-ink-secondary mb-1">Search Name / Code</label>
                        <Input
                          type="text"
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          placeholder="Search..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Format & Max size (In MB) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Format */}
                <div>
                  <label className="block text-sm font-normal text-ink-primary mb-1.5">Format</label>
                  <Select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                  >
                    <option value="">---------</option>
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX</option>
                    <option value="JPG">JPG</option>
                    <option value="PNG">PNG</option>
                    <option value="TXT">TXT</option>
                    <option value="XLSX">XLSX</option>
                    <option value="ANY">Any</option>
                  </Select>
                </div>

                {/* Max size (In MB) */}
                <div>
                  <label className="block text-sm font-normal text-ink-primary mb-1.5">Max size (In MB)</label>
                  <Input
                    type="number"
                    min="1"
                    value={formMaxSize}
                    onChange={(e) => setFormMaxSize(e.target.value)}
                    placeholder="Max Size (In Mb)"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-normal text-ink-primary mb-1.5">Description</label>
                <Textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <Button
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

      {/* ─── MODAL 2: Approve & Issue Document ──────────────────────────────── */}
      {approvingRequest && (
        <Modal open onClose={() => setApprovingRequest(null)} labelledBy="DocumentRequests-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-lighter text-success-main flex-shrink-0">
                <Iconify icon="approvers" width={24} />
              </span>
              <div>
                <h3 id="DocumentRequests-modal-title-2" className="text-base font-bold text-ink-primary">Approve & Issue Document</h3>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  Fulfill this document request for <span className="font-semibold text-ink-primary">{approvingRequest.employee_name}</span>.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-surface-neutral p-3 text-xs space-y-1.5 border border-grey-300/80">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Document:</span>
                <span className="font-semibold text-ink-primary">{approvingRequest.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Purpose:</span>
                <span className="text-ink-primary truncate max-w-[200px]" title={approvingRequest.reason}>
                  {approvingRequest.reason}
                </span>
              </div>
            </div>

            {approveError && (
              <div className="mt-3 rounded-lg bg-error-lighter p-2.5 text-xs text-error-dark border border-error-light">
                {approveError}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">
                  Upload Signed / Generated Document <span className="text-ink-disabled font-normal">(PDF, DOCX, PNG)</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setApproveFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-ink-secondary file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-success-lighter file:text-success-dark hover:file:bg-success-lighter"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-primary mb-1">
                  Admin Remarks / Notes <span className="text-ink-disabled font-normal">(optional)</span>
                </label>
                <Textarea
                  rows={2}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="e.g. Verified and signed by HR Director on official letterhead."
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setApprovingRequest(null)}
              >
                Cancel
              </Button>
              <Button color="success" size="small" onClick={handleConfirmApprove} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? 'Fulfilling...' : 'Confirm & Approve'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 3: Reject Document Request ───────────────────────────────── */}
      {rejectingRequest && (
        <Modal open onClose={() => setRejectingRequest(null)} labelledBy="DocumentRequests-modal-title-3" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-lighter text-error-main flex-shrink-0">
                <Iconify icon="close" width={24} />
              </span>
              <div>
                <h3 id="DocumentRequests-modal-title-3" className="text-base font-bold text-ink-primary">Reject Document Request</h3>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  Provide a reason for declining <span className="font-semibold text-ink-primary">{rejectingRequest.employee_name}</span>'s request.
                </p>
              </div>
            </div>

            {rejectError && (
              <div className="mt-3 rounded-lg bg-error-lighter p-2.5 text-xs text-error-dark border border-error-light">
                {rejectError}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-primary mb-1">
                  Reason for Rejection <span className="text-error-main">*</span>
                </label>
                <Textarea
                  required
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Service period is under 6 months, required clearances not completed, request details invalid..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-primary mb-1">
                  Internal Notes <span className="text-ink-disabled font-normal">(optional)</span>
                </label>
                <Textarea
                  rows={2}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Internal notes for audit log..."
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setRejectingRequest(null)}
              >
                Cancel
              </Button>
              <Button color="error" size="small" onClick={handleConfirmReject} disabled={rejectMutation.isPending}>
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 4: View Request Details ──────────────────────────────────── */}
      {viewingRequest && (
        <Modal open onClose={() => setViewingRequest(null)} labelledBy="DocumentRequests-modal-title-4" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <h3 id="DocumentRequests-modal-title-4" className="text-base font-bold text-ink-primary">Document Request Details</h3>
              <IconButton icon="close" size="small" onClick={() => setViewingRequest(null)} aria-label="Close" />
            </div>

            <div className="mt-4 space-y-3 text-xs text-ink-primary">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-neutral p-3 border border-grey-300/80">
                <div>
                  <span className="text-ink-disabled">Employee:</span>
                  <p className="font-semibold text-ink-primary mt-0.5">{viewingRequest.employee_name}</p>
                  <p className="text-[11px] text-ink-secondary">{viewingRequest.employee_code} • {viewingRequest.department_name}</p>
                </div>
                <div>
                  <span className="text-ink-disabled">Status:</span>
                  <p className="mt-0.5 font-semibold capitalize text-ink-primary">{viewingRequest.status_display || viewingRequest.status}</p>
                  <p className="text-[11px] text-ink-secondary">Created: {new Date(viewingRequest.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <span className="text-ink-secondary font-medium">Document Title:</span>
                <p className="font-semibold text-ink-primary mt-0.5">{viewingRequest.title}</p>
              </div>

              {(viewingRequest.format || viewingRequest.max_size) && (
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-neutral p-2.5 border border-divider">
                  <div>
                    <span className="text-ink-disabled text-[11px]">Format:</span>
                    <p className="font-medium text-ink-primary">{viewingRequest.format || 'Any'}</p>
                  </div>
                  <div>
                    <span className="text-ink-disabled text-[11px]">Max Size:</span>
                    <p className="font-medium text-ink-primary">{viewingRequest.max_size ? `${viewingRequest.max_size} MB` : 'No limit'}</p>
                  </div>
                </div>
              )}

              <div>
                <span className="text-ink-secondary font-medium">Description / Reason:</span>
                <p className="mt-0.5 rounded-lg bg-surface-neutral p-2 text-ink-primary border border-divider whitespace-pre-wrap">
                  {viewingRequest.description || viewingRequest.reason}
                </p>
              </div>

              {viewingRequest.rejection_reason && (
                <div className="rounded-lg bg-error-lighter p-2.5 text-error-dark border border-error-light">
                  <span className="font-semibold">Rejection Reason:</span>
                  <p className="mt-0.5 text-xs">{viewingRequest.rejection_reason}</p>
                </div>
              )}

              {viewingRequest.issued_document && (
                <div className="rounded-xl border border-success-light bg-success-lighter p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Iconify icon="leavePolicies" width={20} className="text-success-main" />
                    <div>
                      <p className="font-semibold text-success-darker">Official Document Attached</p>
                      <p className="text-[10px] text-success-dark">Issued by {viewingRequest.reviewed_by_name || 'HR'}</p>
                    </div>
                  </div>
                  <ButtonLink
                    size="small"
                    href={viewingRequest.issued_document}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download File
                  </ButtonLink>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setViewingRequest(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 5: Delete Confirmation ───────────────────────────────────── */}
      {deleteTargetId && (
        <Modal open onClose={() => setDeleteTargetId(null)} labelledBy="DocumentRequests-modal-title-5" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="DocumentRequests-modal-title-5" className="text-base font-bold text-ink-primary">Delete Document Request</h3>
            <p className="mt-2 text-xs text-ink-secondary">
              Are you sure you want to delete this document request? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setDeleteTargetId(null)}
              >
                Cancel
              </Button>
              <Button color="error" size="small" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
