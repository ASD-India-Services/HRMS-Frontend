import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/utils/formatters';
import { useToast } from '@/components/ui/Toast';

const ENDPOINT = '/api/v1/leaves/policy-assignments/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'leave-policy-assignments',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'leave_policy_name', header: 'Leave Policy', sortable: true, render: (v: unknown) => v ? String(v) : '–' },
  { key: 'assignment_type', header: 'Assignment Type', sortable: true, render: (v: unknown) => v ? String(v) : '–' },
  { key: 'target_name', header: 'Assigned To', sortable: false, render: (v: unknown) => v ? String(v) : '–' },
  { key: 'effective_from', header: 'Effective From', sortable: true, render: (v: unknown) => v ? formatDate(v as string) : '–' },
  { key: 'effective_to', header: 'Effective To', sortable: true, render: (v: unknown) => v ? formatDate(v as string) : '–' },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'leave_policy', label: 'Leave Policy', type: 'select', required: true, optionsEndpoint: '/api/v1/leaves/policies/' },
  { key: 'assignment_type', label: 'Assignment Type', type: 'select', required: true, options: [
    { value: 'employee', label: 'Employee' },
    { value: 'department', label: 'Department' },
    { value: 'grade', label: 'Grade' },
  ]},
  { key: 'employee', label: 'Employee', type: 'select', optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'department', label: 'Department', type: 'select', optionsEndpoint: '/api/v1/departments/' },
  { key: 'grade', label: 'Grade', type: 'select', optionsEndpoint: '/api/v1/employee-grades/' },
  { key: 'effective_from', label: 'Effective From', type: 'date', required: true },
  { key: 'effective_to', label: 'Effective To', type: 'date' },
];

export default function LeavePolicyAssignments() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();


  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton permission="leave_policy_assignments.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="leave_policy_assignments.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = async (data: Record<string, unknown>) => {
    const assignmentType = String(data.assignment_type ?? '');
    const payload = {
      ...data,
      employee: assignmentType === 'employee' ? data.employee || null : null,
      department: assignmentType === 'department' ? data.department || null : null,
      grade: assignmentType === 'grade' ? data.grade || null : null,
      effective_to: data.effective_to || null,
    };

    try {
      await createMutation.mutateAsync(payload);
      setShowCreate(false);
    } catch (error) {
      const responseData = (error as { response?: { data?: unknown } }).response?.data;
      const message = responseData && typeof responseData === 'object'
        ? Object.entries(responseData as Record<string, unknown>)
            .map(([field, detail]) => {
              const text = Array.isArray(detail) ? detail.join(' ') : String(detail);
              return field === 'non_field_errors' || field === 'detail' ? text : `${field}: ${text}`;
            })
            .join(' ')
        : error instanceof Error ? error.message : 'Could not save the leave policy assignment.';
      showToast(message || 'Could not save the leave policy assignment.', 'error');
    }
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/leaves/policy-assignments/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <PageContainer>
      <PageHeader title="Leave Policy Assignments" subtitle="Manage policy assignments to employees, departments, and grades" actions={<CreateButton permission="leave_policy_assignments.create" label="Create Assignment" onClick={() => setShowCreate(true)} />} />
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Leave Policy Assignment"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Edit Modal */}
      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit"
        fields={createFields}
        initialValues={editRecord ?? undefined}
        onSubmit={handleEdit}
        isLoading={editLoading}
      />

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
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
