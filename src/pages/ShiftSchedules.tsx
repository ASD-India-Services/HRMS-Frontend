/**
 * Shift Schedules Management Page
 *
 * CRUD interface for managing recurring shift schedules.
 * Each schedule must target either an employee or a department, with
 * repeat_on days of the week and date range.
 *
 * Requirements: 27.5
 */

import { useMemo, useState, useEffect } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';

const ENDPOINT = '/api/v1/shifts/schedules/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'shift-schedules',
  endpoints: {
    list: ENDPOINT,
    create: ENDPOINT,
    detail: (id) => `${ENDPOINT}${id}/`,
    update: (id) => `${ENDPOINT}${id}/`,
    delete: (id) => `${ENDPOINT}${id}/`,
  },
});

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'shift_type_name', header: 'Shift Type', sortable: false },
  {
    key: 'employee_name',
    header: 'Employee',
    sortable: false,
    render: (v: unknown) => {
      if (!v) return <span className="text-gray-400">—</span>;
      return <span>{v as string}</span>;
    },
  },
  {
    key: 'department_name',
    header: 'Department',
    sortable: false,
    render: (v: unknown) => {
      if (!v) return <span className="text-gray-400">—</span>;
      return <span>{v as string}</span>;
    },
  },
  { key: 'start_date', header: 'Start Date', sortable: true },
  { key: 'end_date', header: 'End Date', sortable: true },
  {
    key: 'repeat_on',
    header: 'Repeat Days',
    sortable: false,
    render: (v: unknown) => {
      const arr = v as number[] | null;
      if (!arr || arr.length === 0) return <span className="text-gray-400">—</span>;
      return <span className="text-xs">{arr.map((d) => DAY_LABELS[d]).join(', ')}</span>;
    },
  },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (v: unknown) => (v ? 'Yes' : 'No'),
  },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

interface SelectOption {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
}

interface FormState {
  name: string;
  shift_type: string;
  employee: string;
  department: string;
  start_date: string;
  end_date: string;
  repeat_on: number[];
}

const emptyForm: FormState = {
  name: '',
  shift_type: '',
  employee: '',
  department: '',
  start_date: '',
  end_date: '',
  repeat_on: [0, 1, 2, 3, 4], // Mon-Fri default
};

export default function ShiftSchedules() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Options for dropdowns
  const [shiftTypes, setShiftTypes] = useState<SelectOption[]>([]);
  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [departments, setDepartments] = useState<SelectOption[]>([]);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters });
  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v) p[k] = v;
    });
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = crud.useList(params);
  const deleteMutation = crud.useDelete();

  // Load dropdown options
  useEffect(() => {
    api.get('/api/v1/shifts/types/').then((res) => {
      const data = res.data as { results?: SelectOption[] } | SelectOption[];
      setShiftTypes(Array.isArray(data) ? data : data.results || []);
    });
    api.get('/api/v1/employees/?page_size=500').then((res) => {
      const data = res.data as { results?: SelectOption[] } | SelectOption[];
      setEmployees(Array.isArray(data) ? data : data.results || []);
    });
    api.get('/api/v1/departments/').then((res) => {
      const data = res.data as { results?: SelectOption[] } | SelectOption[];
      setDepartments(Array.isArray(data) ? data : data.results || []);
    });
  }, []);

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton permission="shift_schedules.edit" label="Edit" size="sm" onClick={() => openEdit(row)} />
          <DeleteButton permission="shift_schedules.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const openCreate = () => {
    setFormData(emptyForm);
    setFormError('');
    setShowCreate(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setFormData({
      name: (row.name as string) || '',
      shift_type: (row.shift_type as string) || '',
      employee: (row.employee as string) || '',
      department: (row.department as string) || '',
      start_date: (row.start_date as string) || '',
      end_date: (row.end_date as string) || '',
      repeat_on: (row.repeat_on as number[]) || [0, 1, 2, 3, 4],
    });
    setFormError('');
    setEditRecord(row);
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      repeat_on: prev.repeat_on.includes(day)
        ? prev.repeat_on.filter((d) => d !== day)
        : [...prev.repeat_on, day].sort(),
    }));
  };

  const handleSubmit = async () => {
    setFormError('');

    if (!formData.name || !formData.shift_type || !formData.start_date || !formData.end_date) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!formData.employee && !formData.department) {
      setFormError('Either employee or department must be specified.');
      return;
    }
    if (formData.employee && formData.department) {
      setFormError('Cannot specify both employee and department. Choose one.');
      return;
    }
    if (formData.repeat_on.length === 0) {
      setFormError('Select at least one repeat day.');
      return;
    }

    const payload: Record<string, unknown> = {
      name: formData.name,
      shift_type: formData.shift_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      repeat_on: formData.repeat_on,
    };
    if (formData.employee) payload.employee = formData.employee;
    if (formData.department) payload.department = formData.department;

    setSubmitting(true);
    try {
      if (editRecord) {
        await api.patch(`${ENDPOINT}${editRecord.id}/`, payload);
        setEditRecord(null);
      } else {
        await api.post(ENDPOINT, payload);
        setShowCreate(false);
      }
      queryResult.refetch();
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> } };
      if (error.response?.data) {
        const data = error.response.data;
        const msg =
          (data.non_field_errors as string[])?.join(', ') ||
          (data.detail as string) ||
          Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('; ');
        setFormError(msg);
      } else {
        setFormError('An error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isModalOpen = showCreate || !!editRecord;
  const modalTitle = editRecord ? 'Edit Shift Schedule' : 'Create Shift Schedule';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Schedules</h1>
          <p className="mt-1 text-sm text-gray-600">Manage recurring shift schedules</p>
        </div>
        <CreateButton permission="shift_schedules.create" label="+ Create Schedule" onClick={openCreate} />
      </div>

      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={queryResult.data.count}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{modalTitle}</h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditRecord(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. August 2026 General"
                />
              </div>

              {/* Shift Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shift Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={formData.shift_type}
                  onChange={(e) => setFormData((p) => ({ ...p, shift_type: e.target.value }))}
                >
                  <option value="">Select shift type...</option>
                  {shiftTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employee <span className="text-xs text-gray-400">(or pick a department below)</span>
                </label>
                <select
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={formData.employee}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, employee: e.target.value, department: '' }))
                  }
                >
                  <option value="">— None —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department <span className="text-xs text-gray-400">(or pick an employee above)</span>
                </label>
                <select
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, department: e.target.value, employee: '' }))
                  }
                >
                  <option value="">— None —</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.start_date}
                    onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.end_date}
                    onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Repeat On (day checkboxes) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Repeat On <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        formData.repeat_on.includes(idx)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowCreate(false);
                  setEditRecord(null);
                }}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            });
          }
        }}
        title="Delete Shift Schedule"
        message="Are you sure you want to delete this schedule? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
