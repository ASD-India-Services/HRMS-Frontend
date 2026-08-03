import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/payroll-corrections/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'payroll-corrections',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true },
  { key: 'correction_month', header: 'Month', sortable: true },
  { key: 'correction_year', header: 'Year', sortable: true },
  { key: 'net_adjustment_amount', header: 'Net Adjustment', sortable: true },
  { key: 'reason', header: 'Reason', sortable: false },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (value: unknown) => {
      const status = value as string;
      const colors: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-700',
        submitted: 'bg-yellow-100 text-yellow-800',
        applied: 'bg-green-100 text-green-800',
      };
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    },
  },
];

const filters: FilterConfig[] = [
  { key: 'status', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'applied', label: 'Applied' }] },
];

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'original_salary_slip', label: 'Original Salary Slip', type: 'select', required: true, optionsEndpoint: '/api/v1/salary-slips/', optionsLabelKey: 'name' },
  { key: 'correction_month', label: 'Correction Month', type: 'number', required: true, placeholder: '1-12' },
  { key: 'correction_year', label: 'Correction Year', type: 'number', required: true, placeholder: 'e.g., 2026' },
  { key: 'net_adjustment_amount', label: 'Net Adjustment Amount', type: 'number', required: true, placeholder: 'Positive = pay more, Negative = recover' },
  { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Reason for correction' },
  { key: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }] },
];

export default function PayrollCorrections() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  const handleApply = async () => {
    if (!applyId) return;
    setApplyLoading(true);
    try {
      await api.post(`/api/v1/payroll-corrections/${applyId}/apply/`);
      setApplyId(null);
      queryResult.refetch();
    } catch {
      // Could show error toast
    } finally {
      setApplyLoading(false);
    }
  };

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          {row.status === 'submitted' && (
            <button
              type="button"
              onClick={() => setApplyId(row.id as string)}
              className="inline-flex items-center rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              Apply
            </button>
          )}
          {row.status !== 'applied' && (
            <>
              <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
              <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
            </>
          )}
          {row.status === 'applied' && (
            <span className="text-xs text-gray-400 italic">Completed</span>
          )}
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreate(false),
    });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/payroll-corrections/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Corrections</h1>
          <p className="mt-1 text-sm text-gray-600">Manage salary correction entries</p>
        </div>
        <CreateButton label="Create Correction" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Payroll Correction"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        initialValues={{ status: 'draft' }}
      />

      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Payroll Correction"
        fields={createFields}
        initialValues={editRecord ?? undefined}
        onSubmit={handleEdit}
        isLoading={editLoading}
      />

      {/* Apply Confirmation */}
      <ConfirmDialog
        isOpen={!!applyId}
        onClose={() => setApplyId(null)}
        onConfirm={handleApply}
        title="Apply Correction"
        message="This will generate a supplementary salary slip for the adjustment amount. This action cannot be undone."
        confirmLabel="Apply Correction"
        variant="destructive"
        isLoading={applyLoading}
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
        title="Delete Correction"
        message="Are you sure you want to delete this correction? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
