import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { EMPLOYEES } from '@/lib/endpoints';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  useMeetings,
  useQuestionTemplates,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useCancelMeeting,
  useCompleteMeeting,
} from '@/hooks/useMeetings';
import type { Meeting } from '@/hooks/useMeetings';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { StateView } from '@/components/ui/StateView';

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  email: string;
  department_id?: string;
  department?: { id: string; name: string };
}

interface SelectTagInputProps {
  label: React.ReactNode;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  options: Array<{ id: string; label: string; subLabel?: string; deptId?: string }>;
  placeholder?: string;
  footerRight?: React.ReactNode;
  required?: boolean;
}

/**
 * Clean Single-Line Tag + Input Box with Dropdown List
 * Matches the user's screenshot (media_1794384923180_0cefc9d9.png):
 * - Top input box with vertical scrollbar (arrows) and cursor '|'
 * - Clean dropdown list directly beneath with single-line names (no checkboxes)
 * - Selected items appear as tags with '×' inside the top box
 */
function SelectTagInput({
  label,
  selectedIds,
  onChange,
  options,
  placeholder = '',
  footerRight,
  required = false,
}: SelectTagInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, searchTerm]);

  const handleSelect = (id: string) => {
    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id]);
    } else {
      onChange(selectedIds.filter((item) => item !== id));
    }
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleRemove = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !searchTerm && selectedIds.length > 0) {
      onChange(selectedIds.slice(0, selectedIds.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Label matching screenshot */}
      <label className="block text-xs font-semibold text-ink-primary mb-1">
        {label}
        {required && <span className="text-error-main ml-0.5">*</span>}
      </label>

      {/* Top box with scrollbar and cursor matching media_1794384923180_0cefc9d9.png */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className="w-full min-h-[36px] max-h-[70px] overflow-y-scroll border border-divider rounded-sm bg-surface-paper px-2 py-1 flex flex-wrap items-center gap-1 cursor-text shadow-2xs hover:border-grey-400 focus-within:border-primary-main transition-colors"
      >
        {selectedIds.map((id) => {
          const opt = options.find((o) => o.id === id);
          const text = opt ? opt.label : id;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-divider bg-surface-paper text-xs text-ink-primary shadow-2xs shrink-0 select-none"
            >
              <IconButton icon="close" size="small" onClick={(e) => handleRemove(id, e)} aria-label="Remove" />
              <span>{text}</span>
            </span>
          );
        })}

        {/* Input where cursor '|' blinks */}
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedIds.length === 0 ? placeholder : ''}
          className="outline-none bg-transparent text-xs text-ink-primary min-w-[30px] grow py-0.5"
        />
      </div>

      {/* Optional Footer (such as Filter button) */}
      {footerRight && <div className="flex justify-end mt-1">{footerRight}</div>}

      {/* Pure text dropdown list matching media_1794384923180_0cefc9d9.png */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-50 bg-surface-paper border border-divider shadow-lg max-h-52 overflow-y-scroll rounded-sm animate-in fade-in duration-75">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-ink-disabled text-center">No options found</div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt.id);
                  }}
                  className={`px-3 py-1.5 text-xs text-ink-primary cursor-pointer transition-colors ${
                    idx === 0 && !searchTerm ? 'bg-surface-neutral hover:bg-surface-neutral' : 'hover:bg-surface-neutral'
                  } ${isSelected ? 'font-semibold bg-primary-lighter/70 text-primary-darker' : ''}`}
                >
                  {opt.label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function Meetings() {
  const { hasPermission } = useHrmsPermissionsContext();
  const canView = hasPermission('meetings.view');
  const canCreate = hasPermission('meetings.create');
  const canEdit = hasPermission('meetings.edit');
  const canDelete = hasPermission('meetings.delete');

  // Search and filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  // Confirmation Dialog States
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);
  const [cancelMeetingId, setCancelMeetingId] = useState<string | null>(null);

  // Form Fields matching Screenshot 2
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedAnswerable, setSelectedAnswerable] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Department quick-filter modal/drawer for Employees field
  const [isDeptFilterOpen, setIsDeptFilterOpen] = useState(false);
  const [deptFilterId, setDeptFilterId] = useState('');

  // Fetch logged in employee for default Manager selection
  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const res = await api.get('/api/v1/employees/me/');
      return res.data;
    },
  });

  // Fetch employees list for attendee selection
  const { data: employees = [] } = useQuery({
    queryKey: ['all-employees-for-meetings'],
    queryFn: async () => {
      const res = await api.get(EMPLOYEES.LIST, { params: { page_size: 200 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
  });

  // Fetch departments list for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await api.get('/api/v1/departments/', { params: { page_size: 100 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
  });

  // Fetch question templates
  const { data: questionTemplates = [] } = useQuestionTemplates();

  // Query meetings list
  const { data, isLoading, refetch } = useMeetings({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  });

  const meetings = data?.results || [];

  // Mutations
  const createMutation = useCreateMeeting();
  const updateMutation = useUpdateMeeting();
  const deleteMutation = useDeleteMeeting();
  const cancelMutation = useCancelMeeting();
  const completeMutation = useCompleteMeeting();

  // Reset form
  const resetForm = () => {
    setTitle('');
    setDate('');
    setSelectedEmployees([]);
    setSelectedManagers(currentEmployee?.id ? [currentEmployee.id] : []);
    setSelectedAnswerable([]);
    setSelectedTemplate('');
    setDescription('');
    setFormError('');
    setEditingMeeting(null);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    if (!canCreate) return;
    resetForm();
    if (currentEmployee?.id) {
      setSelectedManagers([currentEmployee.id]);
    } else if (employees.length > 0) {
      setSelectedManagers([employees[0].id]);
    }
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (m: Meeting) => {
    if (!canEdit) return;
    setEditingMeeting(m);
    setTitle(m.title);
    setDate(m.date ? m.date.slice(0, 16) : '');
    setSelectedEmployees(m.employees || []);
    setSelectedManagers(m.managers || []);
    setSelectedAnswerable(m.answerable_employees || []);
    setSelectedTemplate(m.question_template || '');
    setDescription(m.description || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Please enter a meeting title.');
      return;
    }
    if (!date) {
      setFormError('Please select meeting date and time.');
      return;
    }
    if (selectedEmployees.length === 0) {
      setFormError('Please select at least one employee.');
      return;
    }
    if (selectedManagers.length === 0) {
      setFormError('Please select at least one manager.');
      return;
    }

    try {
      if (editingMeeting) {
        await updateMutation.mutateAsync({
          id: editingMeeting.id,
          title: title.trim(),
          date,
          employees: selectedEmployees,
          managers: selectedManagers,
          answerable_employees: selectedAnswerable,
          question_template: selectedTemplate || null,
          description: description.trim(),
        });
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          date,
          employees: selectedEmployees,
          managers: selectedManagers,
          answerable_employees: selectedAnswerable,
          question_template: selectedTemplate || null,
          description: description.trim(),
        });
      }
      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.title?.[0] ||
        err?.response?.data?.date?.[0] ||
        'Failed to save meeting.';
      setFormError(msg);
    }
  };

  // Delete Meeting
  const handleDelete = (id: string) => {
    if (!canDelete) return;
    setDeleteMeetingId(id);
  };

  const confirmDeleteMeeting = async () => {
    if (!deleteMeetingId) return;
    try {
      await deleteMutation.mutateAsync(deleteMeetingId);
      setDeleteMeetingId(null);
      refetch();
    } catch (err: any) {
      console.error('Delete meeting failed:', err);
      setDeleteMeetingId(null);
    }
  };

  // Cancel Meeting
  const handleCancelMeeting = (id: string) => {
    if (!canEdit) return;
    setCancelMeetingId(id);
  };

  const confirmCancelMeeting = async () => {
    if (!cancelMeetingId) return;
    try {
      await cancelMutation.mutateAsync(cancelMeetingId);
      setCancelMeetingId(null);
      refetch();
    } catch (err: any) {
      console.error('Cancel meeting failed:', err);
      setCancelMeetingId(null);
    }
  };

  // Complete Meeting
  const handleCompleteMeeting = async (id: string) => {
    if (!canEdit) return;
    try {
      await completeMutation.mutateAsync(id);
      refetch();
    } catch (err: any) {
      console.error('Failed to mark meeting completed:', err);
    }
  };

  // Helper: toggle an ID in a list
  const toggleSelection = (
    id: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(id)) {
      setList(list.filter((x) => x !== id));
    } else {
      setList([...list, id]);
    }
  };

  // Filtered employees based on department quick-filter
  const filteredEmployeesByDept = useMemo(() => {
    if (!deptFilterId) return employees;
    return employees.filter(
      (e: any) => e.department?.id === deptFilterId || e.department_id === deptFilterId
    );
  }, [employees, deptFilterId]);

  // Formatted employee options for SelectTagInput matching Screenshot 2
  const employeeOptions = useMemo(() => {
    return employees
      .map((emp: any) => ({
        id: emp.id,
        label: `${emp.first_name || ''} ${emp.last_name || ''}${emp.employee_id ? ` (${emp.employee_id})` : ''}`.trim(),
        subLabel: emp.department?.name || emp.department_name || '',
        deptId: emp.department?.id || emp.department_id || '',
      }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label));
  }, [employees]);

  const filteredEmployeeOptions = useMemo(() => {
    if (!deptFilterId) return employeeOptions;
    return employeeOptions.filter((opt) => opt.deptId === deptFilterId);
  }, [employeeOptions, deptFilterId]);

  return (
    <PageContainer>
      <PageHeader
        title="Meetings"
        subtitle="Schedule, run and review team meetings."
        actions={
          canCreate && (
            <Button startIcon={<Iconify icon="plus" />} onClick={handleOpenCreate}>
              Create
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meetings..."
            inputSize="small"
            className="w-56 pl-8 pr-3 sm:w-72"
          />
          <Iconify icon="search" width={16} className="absolute left-2.5 top-2.5 text-ink-disabled" />
        </div>
        <Select selectSize="small" className="w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Main Content Area */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-ink-secondary">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-main mb-3" />
            <p className="text-xs font-medium">Loading meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          /* Empty State matching Screenshot 1 */
          <StateView icon="search" title="No records found" description="Try adjusting your filters or adding new data." />
        ) : (
          /* Meetings Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-neutral/80 border-b border-divider text-ink-primary font-semibold">
                  <th className="py-3 px-4 min-w-[200px]">Title</th>
                  <th className="py-3 px-3 min-w-[170px]">Date &amp; Time</th>
                  <th className="py-3 px-3 min-w-[160px]">Managers</th>
                  <th className="py-3 px-3 min-w-[180px]">Attendees</th>
                  <th className="py-3 px-3 min-w-[150px]">Question Template</th>
                  <th className="py-3 px-3 min-w-[110px]">Status</th>
                  <th className="py-3 px-3 text-center min-w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {meetings.map((m) => {
                  const isScheduled = m.status === 'scheduled';
                  const isInProgress = m.status === 'in_progress';
                  const isCompleted = m.status === 'completed';
                  const isCancelled = m.status === 'cancelled';

                  return (
                    <tr key={m.id} className="hover:bg-primary-lighter/20 transition-colors">
                      {/* Title & Description */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-ink-primary text-xs">{m.title}</span>
                          {m.description && (
                            <span className="text-[11px] text-ink-secondary truncate max-w-xs">
                              {m.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-3 text-ink-primary whitespace-nowrap font-medium">
                        {m.formatted_date || m.date}
                      </td>

                      {/* Managers */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {m.managers_details && m.managers_details.length > 0 ? (
                            m.managers_details.map((mgr) => (
                              <span
                                key={mgr.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-surface-neutral text-ink-primary font-medium border border-divider"
                              >
                                <Iconify icon="user" width={12} /> {mgr.full_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-ink-disabled text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Employees Attendees */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-primary-dark bg-primary-lighter px-2 py-0.5 rounded-md border border-primary-light">
                            {m.employees_details?.length || m.employees?.length || 0} Attendees
                          </span>
                          {m.employees_details?.slice(0, 2).map((emp) => (
                            <span
                              key={emp.id}
                              className="text-[11px] text-ink-secondary bg-surface-neutral px-1.5 py-0.5 rounded truncate max-w-[110px]"
                              title={emp.full_name}
                            >
                              {emp.first_name}
                            </span>
                          ))}
                          {(m.employees_details?.length || 0) > 2 && (
                            <span className="text-[11px] text-ink-disabled">
                              +{(m.employees_details?.length || 0) - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Question Template */}
                      <td className="py-3 px-3 text-ink-primary">
                        {m.question_template_name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-lighter text-secondary-dark border border-secondary-light text-[11px] font-medium">
                            <Iconify icon="policies" width={12} /> {m.question_template_name}
                          </span>
                        ) : (
                          <span className="text-ink-disabled text-[11px]">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isCompleted
                              ? 'bg-success-lighter text-success-dark'
                              : isCancelled
                              ? 'bg-error-lighter text-error-dark'
                              : isInProgress
                              ? 'bg-warning-lighter text-warning-dark'
                              : 'bg-primary-lighter text-primary-dark'
                          }`}
                        >
                          {m.status_display || m.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          {/* View details */}
                          <IconButton icon="eye" size="small" onClick={() => setSelectedMeeting(m)} aria-label="View Meeting Details" />

                          {/* Edit button */}
                          {canEdit && (
                            <IconButton
                              icon="pencil"
                              size="small"
                              onClick={() => handleOpenEdit(m)}
                              disabled={isCompleted || isCancelled}
                              aria-label={isCompleted || isCancelled ? 'Completed or cancelled meeting cannot be edited' : 'Edit Meeting'}
                            />
                          )}

                          {/* Complete button */}
                          {canEdit && isScheduled && (
                            <IconButton icon="check" size="small" color="success" onClick={() => handleCompleteMeeting(m.id)} aria-label="Mark Completed" />
                          )}

                          {/* Cancel button */}
                          {canEdit && isScheduled && (
                            <IconButton icon="leaveBlock" size="small" color="warning" onClick={() => handleCancelMeeting(m.id)} aria-label="Cancel Meeting" />
                          )}

                          {/* Delete button */}
                          {canDelete && (
                            <IconButton icon="trash" size="small" color="error" onClick={() => handleDelete(m.id)} aria-label="Delete Meeting" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal Matching Screenshot 2 */}
      {isModalOpen && (
        <Modal open onClose={() => setIsModalOpen(false)} labelledBy="Meetings-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header matching Screenshot 2: Meetings title with X */}
            <div className="flex items-center justify-between p-5 border-b border-divider shrink-0">
              <h2 id="Meetings-modal-title-1" className="text-lg font-bold text-ink-primary">Meetings</h2>
              <IconButton icon="close" size="small" onClick={() => setIsModalOpen(false)} aria-label="Close" />
            </div>

            {/* Modal Form matching Screenshot 2 */}
            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 overflow-y-auto grow">
              {formError && (
                <div className="p-2.5 bg-error-lighter border border-error-light rounded text-xs text-error-dark font-medium">
                  {formError}
                </div>
              )}

              {/* Title * and Date * Grid matching Screenshot 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title * */}
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    Title *
                  </label>
                  <Input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                  />
                </div>

                {/* Date * */}
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    Date *
                  </label>
                  <Input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Employees * Selection Box matching Screenshot 2 */}
              <SelectTagInput
                label="Employees"
                required
                selectedIds={selectedEmployees}
                onChange={setSelectedEmployees}
                options={filteredEmployeeOptions}
                placeholder=""
                footerRight={
                  <Button variant="text" color="error" size="small" onClick={() => setIsDeptFilterOpen(!isDeptFilterOpen)}>
                    <span className="text-sm leading-none font-bold">⊝</span>
                    <span>Filter</span>
                  </Button>
                }
              />

              {/* Department quick filter dropdown */}
              {isDeptFilterOpen && (
                <div className="p-2 bg-warning-lighter/80 border border-warning-light rounded text-xs space-y-1.5 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-warning-darker text-[11px]">Filter Employees by Department:</span>
                    <div className="flex items-center gap-2">
                      <Button variant="text" onClick={() => {
                          const ids = filteredEmployeesByDept.map((e: any) => e.id);
                          setSelectedEmployees(Array.from(new Set([...selectedEmployees, ...ids])));
                        }}>
                        Select All in Dept
                      </Button>
                      <Button variant="text" color="inherit" size="small" startIcon={<Iconify icon="close" />} onClick={() => {
                          setDeptFilterId('');
                          setIsDeptFilterOpen(false);
                        }}>
                        Close
                      </Button>
                    </div>
                  </div>
                  <Select
                    value={deptFilterId}
                    onChange={(e) => setDeptFilterId(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Manager * Selection Box matching Screenshot 2 */}
              <SelectTagInput
                label="Manager"
                required
                selectedIds={selectedManagers}
                onChange={setSelectedManagers}
                options={employeeOptions}
                placeholder=""
              />

              {/* Answerable Employees ⓘ matching Screenshot 2 */}
              <SelectTagInput
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <span>Answerable Employees</span>
                    <span
                      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-grey-400 text-primary-contrast text-[10px] font-bold cursor-help"
                      title="Employees who must prepare responses or reports for this meeting"
                    >
                      i
                    </span>
                  </span>
                }
                selectedIds={selectedAnswerable}
                onChange={setSelectedAnswerable}
                options={employeeOptions}
                placeholder=""
              />

              {/* Question Template matching Screenshot 2 */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">
                  Question template
                </label>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <option value="">---Choose Question template---</option>
                  {questionTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Description / Agenda (Collapsible so it doesn't clutter the form) */}
              <div className="pt-0.5">
                {description.trim() ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-secondary mb-1">
                      Notes / Description (Optional)
                    </label>
                    <Textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Meeting notes or agenda..."
                    />
                  </div>
                ) : (
                  <Button variant="text" color="inherit" startIcon={<Iconify icon="plus" />} onClick={() => setDescription(' ')}>Add notes (optional)
                  </Button>
                )}
              </div>

              {/* Modal Footer with Blue Save button matching requirement */}
              <div className="flex justify-end pt-2 shrink-0">
                <Button size="small"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <Modal open onClose={() => setSelectedMeeting(null)} labelledBy="Meetings-modal-title-2" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-4 border-b border-divider flex items-center justify-between">
              <h3 id="Meetings-modal-title-2" className="text-sm font-bold text-ink-primary">Meeting Details</h3>
              <IconButton icon="close" size="small" onClick={() => setSelectedMeeting(null)} aria-label="Close" />
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-bold text-ink-primary block text-[11px] uppercase tracking-wider mb-0.5">
                  Title
                </span>
                <span className="text-base font-bold text-ink-primary">{selectedMeeting.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-ink-primary block text-[11px] uppercase tracking-wider mb-0.5">
                    Date &amp; Time
                  </span>
                  <span className="text-ink-primary font-medium">{selectedMeeting.formatted_date}</span>
                </div>
                <div>
                  <span className="font-bold text-ink-primary block text-[11px] uppercase tracking-wider mb-0.5">
                    Status
                  </span>
                  <span className="text-ink-primary font-medium">{selectedMeeting.status_display}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-ink-primary block text-[11px] uppercase tracking-wider mb-1">
                  Managers / Hosts
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMeeting.managers_details?.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 bg-surface-neutral text-ink-primary px-2 py-0.5 rounded text-xs font-medium">
                      <Iconify icon="user" width={12} /> {m.full_name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-ink-primary block text-[11px] uppercase tracking-wider mb-1">
                  Attendees ({selectedMeeting.employees_details?.length || 0})
                </span>
                <div className="max-h-28 overflow-y-auto p-2 bg-surface-neutral rounded border border-divider flex flex-wrap gap-1.5">
                  {selectedMeeting.employees_details?.map((e) => (
                    <span key={e.id} className="bg-surface-paper border border-divider text-ink-primary px-2 py-0.5 rounded text-xs">
                      {e.full_name}
                    </span>
                  ))}
                </div>
              </div>

              {selectedMeeting.answerable_employees_details && selectedMeeting.answerable_employees_details.length > 0 && (
                <div>
                  <span className="font-bold text-ink-primary block text-[11px] uppercase tracking-wider mb-1">
                    Answerable Employees
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMeeting.answerable_employees_details.map((e) => (
                      <span key={e.id} className="bg-warning-lighter text-warning-darker border border-warning-light px-2 py-0.5 rounded text-xs">
                        {e.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedMeeting.question_template_name && (
                <div>
                  <span className="font-bold text-ink-primary block text-[11px] uppercase tracking-wider mb-0.5">
                    Question Template
                  </span>
                  <span className="inline-flex items-center gap-1 text-secondary-dark font-medium"><Iconify icon="policies" width={14} /> {selectedMeeting.question_template_name}</span>
                </div>
              )}

              {selectedMeeting.description && (
                <div>
                  <span className="font-bold text-ink-primary block text-[11px] uppercase tracking-wider mb-0.5">
                    Description / Agenda
                  </span>
                  <p className="p-3 bg-surface-neutral rounded text-ink-primary whitespace-pre-wrap border border-divider">
                    {selectedMeeting.description}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-neutral border-t border-divider flex justify-end">
              <Button size="small"
                type="button"
                onClick={() => setSelectedMeeting(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Meeting Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteMeetingId}
        onClose={() => setDeleteMeetingId(null)}
        onConfirm={confirmDeleteMeeting}
        title="Delete Meeting"
        message="Are you sure you want to delete this meeting? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      {/* Cancel Meeting Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!cancelMeetingId}
        onClose={() => setCancelMeetingId(null)}
        onConfirm={confirmCancelMeeting}
        title="Cancel Meeting"
        message="Are you sure you want to cancel this scheduled meeting? Attendees will see this meeting marked as cancelled."
        confirmLabel="Cancel Meeting"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />
    </PageContainer>
  );
}

