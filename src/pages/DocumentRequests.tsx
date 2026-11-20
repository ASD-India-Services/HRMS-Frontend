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
import { formatDate } from '@/utils/formatters';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';

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
      alert('Failed to delete document request.');
    }
  };

  const filteredRequests = useMemo(() => {
    return requestsData?.results || [];
  }, [requestsData]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium shadow-sm border animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
      )}

      {/* Header and Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Document Requests</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Employees can request verified certificates, proof of employment, and service letters.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={handleOpenRequestModal}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>Create</span>
          </button>
        )}
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Requests</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary?.total ?? 0}</p>
        </div>

        {/* Pending Review */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Pending Review</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{summary?.pending ?? 0}</p>
        </div>

        {/* Approved & Issued */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Approved & Issued</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{summary?.approved ?? 0}</p>
        </div>

        {/* Rejected */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>Rejected</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-900">{summary?.rejected ?? 0}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search employee, title, format, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              &times;
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="in_progress">In Progress</option>
            <option value="approved">Approved / Issued</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Format Filter */}
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Formats</option>
            <option value="PDF">PDF</option>
            <option value="DOCX">DOCX</option>
            <option value="JPG">JPG</option>
            <option value="PNG">PNG</option>
            <option value="TXT">TXT</option>
            <option value="XLSX">XLSX</option>
          </select>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-600">Loading document requests...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          Failed to load document requests. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRequests.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-bold text-gray-900">No document requests found</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            {search || selectedStatus || selectedFormat
              ? 'Try clearing the search or filters to see more results.'
              : 'Click "+ Create" to request documents or certificates from employees.'}
          </p>
          <button
            type="button"
            onClick={handleOpenRequestModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            + Create Document Request
          </button>
        </div>
      )}

      {/* Table of Requests */}
      {!isLoading && filteredRequests.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
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
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Employee */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
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
                          <p className="font-semibold text-gray-900">{req.employee_name || '—'}</p>
                          <p className="text-[11px] text-gray-400">
                            {req.employee_code && <span className="font-mono">{req.employee_code} • </span>}
                            {req.department_name || 'General'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900">{req.title}</p>
                    </td>

                    {/* Format & Max Size */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {req.format ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                          <span>{req.format}</span>
                          {req.max_size && <span className="text-blue-500 font-normal">• Max {req.max_size} MB</span>}
                        </span>
                      ) : req.max_size ? (
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                          Max {req.max_size} MB
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Any format</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3.5 max-w-[240px]">
                      <p className="truncate text-xs text-gray-700" title={req.description || req.reason}>
                        {req.description || req.reason || '—'}
                      </p>
                      {req.admin_notes && (
                        <p className="mt-0.5 text-[10px] text-gray-500 truncate" title={`HR note: ${req.admin_notes}`}>
                          Note: {req.admin_notes}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                          <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Approved
                        </span>
                      )}
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Pending Review
                        </span>
                      )}
                      {req.status === 'in_progress' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
                          In Progress
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                            Rejected
                          </span>
                          {req.rejection_reason && (
                            <p className="text-[10px] text-rose-600 truncate max-w-[140px]" title={req.rejection_reason}>
                              {req.rejection_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-500">
                      {formatDate(req.created_at)}
                    </td>

                      {/* Issued Document */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {req.issued_document ? (
                          <a
                            href={req.issued_document}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                          >
                            <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Download</span>
                          </a>
                        ) : req.status === 'approved' ? (
                          <span className="text-[11px] text-gray-400">Approved (No file)</span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Awaiting HR</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Action */}
                          {req.status === 'pending' && canApprove && (
                            <button
                              type="button"
                              onClick={() => {
                                setApproveError(null);
                                setApproveFile(null);
                                setApproveNotes('');
                                setApprovingRequest(req);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition shadow-2xs"
                              title="Approve & issue document"
                            >
                              <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Reject Action */}
                          {req.status === 'pending' && canReject && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectError(null);
                                setRejectReason('');
                                setRejectNotes('');
                                setRejectingRequest(req);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition shadow-2xs"
                              title="Reject request"
                            >
                              <svg className="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Details */}
                          <button
                            type="button"
                            onClick={() => setViewingRequest(req)}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                            title="View details"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Delete (if pending) */}
                          {req.status === 'pending' && canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetId(req.id)}
                              className="rounded-lg p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Cancel / Delete request"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: Document Request (DigiHRMS Form Format) ───────────────── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-normal text-gray-800">Document Request</h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {requestError && (
              <div className="mb-3 rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                {requestError}
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="rounded-md border border-gray-200 p-5 sm:p-6 bg-white space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-normal text-gray-800 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full rounded border border-gray-300 px-3.5 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none transition"
                />
              </div>

              {/* Employee */}
              <div>
                <label className="block text-sm font-normal text-gray-800 mb-1.5">Employee</label>
                <div ref={employeeDropdownRef} className="relative">
                  <div
                    onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                    className="w-full min-h-[38px] rounded border border-gray-300 px-3.5 py-2 text-sm text-gray-800 bg-white cursor-pointer flex items-center justify-between hover:border-gray-400"
                  >
                    <div className="flex flex-wrap gap-1 items-center flex-1 pr-2">
                      {selectedEmployees.length === 0 ? (
                        <span className="text-gray-400 text-sm"></span>
                      ) : selectedEmployees.length === 1 ? (
                        (() => {
                          const emp = employeesData?.find((e) => e.id === selectedEmployees[0]);
                          return emp ? (
                            <span className="text-gray-800 text-sm">
                              {emp.full_name || `${emp.first_name} ${emp.last_name}`} {emp.employee_id ? `(${emp.employee_id})` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-800 text-sm">1 employee selected</span>
                          );
                        })()
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-semibold border border-blue-200">
                          {selectedEmployees.length} employees selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.7 9.24a.75.75 0 011.1 1.02L10 16.148l2.7-2.888a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.05-1.04z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {isEmployeeDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                      <div className="p-1 mb-1">
                        <input
                          type="text"
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          placeholder="Search employee name or code..."
                          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
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
                              className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer rounded hover:bg-gray-50 ${
                                isSelected ? 'bg-blue-50/60 font-semibold text-blue-600' : 'text-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>
                                  {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400">
                                {emp.employee_id} {deptName ? `• ${deptName}` : ''}
                              </span>
                            </div>
                          );
                        })}
                        {filteredEmployeesForSelection.length === 0 && (
                          <div className="p-3 text-center text-xs text-gray-400">No employees match the filter</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Link below employee */}
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => setShowEmployeeFilter(!showEmployeeFilter)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                    <span>Filter</span>
                  </button>
                </div>

                {/* Filter Expand Panel */}
                {showEmployeeFilter && (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">Filter Employees</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = filteredEmployeesForSelection.map((e) => e.id);
                            setSelectedEmployees(allIds);
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-semibold"
                        >
                          Select All ({filteredEmployeesForSelection.length})
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedEmployees([])}
                          className="text-[11px] text-gray-500 hover:underline"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">Department</label>
                        <select
                          value={selectedDeptFilter}
                          onChange={(e) => setSelectedDeptFilter(e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">All Departments</option>
                          {departmentsData?.map((dept) => (
                            <option key={dept.id} value={dept.name}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">Search Name / Code</label>
                        <input
                          type="text"
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          placeholder="Search..."
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
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
                  <label className="block text-sm font-normal text-gray-800 mb-1.5">Format</label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3.5 py-2 text-sm text-gray-800 bg-white focus:border-gray-400 focus:outline-none transition"
                  >
                    <option value="">---------</option>
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX</option>
                    <option value="JPG">JPG</option>
                    <option value="PNG">PNG</option>
                    <option value="TXT">TXT</option>
                    <option value="XLSX">XLSX</option>
                    <option value="ANY">Any</option>
                  </select>
                </div>

                {/* Max size (In MB) */}
                <div>
                  <label className="block text-sm font-normal text-gray-800 mb-1.5">Max size (In MB)</label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxSize}
                    onChange={(e) => setFormMaxSize(e.target.value)}
                    placeholder="Max Size (In Mb)"
                    className="w-full rounded border border-gray-300 px-3.5 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-normal text-gray-800 mb-1.5">Description</label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description"
                  className="w-full rounded border border-gray-300 px-3.5 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none transition"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition focus:outline-none disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Approve & Issue Document ──────────────────────────────── */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 flex-shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">Approve & Issue Document</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Fulfill this document request for <span className="font-semibold text-gray-800">{approvingRequest.employee_name}</span>.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs space-y-1.5 border border-gray-200/80">
              <div className="flex justify-between">
                <span className="text-gray-500">Document:</span>
                <span className="font-semibold text-gray-900">{approvingRequest.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Purpose:</span>
                <span className="text-gray-800 truncate max-w-[200px]" title={approvingRequest.reason}>
                  {approvingRequest.reason}
                </span>
              </div>
            </div>

            {approveError && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                {approveError}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Upload Signed / Generated Document <span className="text-gray-400 font-normal">(PDF, DOCX, PNG)</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setApproveFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Admin Remarks / Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="e.g. Verified and signed by HR Director on official letterhead."
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 shadow-2xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setApprovingRequest(null)}
                className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approveMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Fulfilling...' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Reject Document Request ───────────────────────────────── */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 flex-shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reject Document Request</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Provide a reason for declining <span className="font-semibold text-gray-800">{rejectingRequest.employee_name}</span>'s request.
                </p>
              </div>
            </div>

            {rejectError && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                {rejectError}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Service period is under 6 months, required clearances not completed, request details invalid..."
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 shadow-2xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Internal Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Internal notes for audit log..."
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 shadow-2xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: View Request Details ──────────────────────────────────── */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Document Request Details</h3>
              <button onClick={() => setViewingRequest(null)} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 border border-gray-200/80">
                <div>
                  <span className="text-gray-400">Employee:</span>
                  <p className="font-semibold text-gray-900 mt-0.5">{viewingRequest.employee_name}</p>
                  <p className="text-[11px] text-gray-500">{viewingRequest.employee_code} • {viewingRequest.department_name}</p>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <p className="mt-0.5 font-semibold capitalize text-gray-900">{viewingRequest.status_display || viewingRequest.status}</p>
                  <p className="text-[11px] text-gray-500">Created: {formatDate(viewingRequest.created_at)}</p>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-medium">Document Title:</span>
                <p className="font-semibold text-gray-900 mt-0.5">{viewingRequest.title}</p>
              </div>

              {(viewingRequest.format || viewingRequest.max_size) && (
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-2.5 border border-gray-200">
                  <div>
                    <span className="text-gray-400 text-[11px]">Format:</span>
                    <p className="font-medium text-gray-900">{viewingRequest.format || 'Any'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px]">Max Size:</span>
                    <p className="font-medium text-gray-900">{viewingRequest.max_size ? `${viewingRequest.max_size} MB` : 'No limit'}</p>
                  </div>
                </div>
              )}

              <div>
                <span className="text-gray-500 font-medium">Description / Reason:</span>
                <p className="mt-0.5 rounded-lg bg-gray-50 p-2 text-gray-800 border border-gray-100 whitespace-pre-wrap">
                  {viewingRequest.description || viewingRequest.reason}
                </p>
              </div>

              {viewingRequest.rejection_reason && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-rose-800 border border-rose-200">
                  <span className="font-semibold">Rejection Reason:</span>
                  <p className="mt-0.5 text-xs">{viewingRequest.rejection_reason}</p>
                </div>
              )}

              {viewingRequest.issued_document && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-emerald-900">Official Document Attached</p>
                      <p className="text-[10px] text-emerald-700">Issued by {viewingRequest.reviewed_by_name || 'HR'}</p>
                    </div>
                  </div>
                  <a
                    href={viewingRequest.issued_document}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: Delete Confirmation ───────────────────────────────────── */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-gray-900">Delete Document Request</h3>
            <p className="mt-2 text-xs text-gray-500">
              Are you sure you want to delete this document request? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
