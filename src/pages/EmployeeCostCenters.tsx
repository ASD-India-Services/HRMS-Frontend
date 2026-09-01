import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/employee-cost-centers/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'employee-cost-centers',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true },
  { key: 'cost_center_name', header: 'Cost Center', sortable: true },
  { key: 'allocation_percentage', header: 'Allocation %', sortable: true },
  { key: 'effective_from', header: 'Effective From', sortable: true },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'cost_center_name', label: 'Cost Center', type: 'text', required: true, placeholder: 'Cost center name' },
  { key: 'allocation_percentage', label: 'Allocation (%)', type: 'number', required: true, placeholder: 'e.g. 100' },
  { key: 'effective_from', label: 'Effective From', type: 'date', required: true },
  { key: 'effective_to', label: 'Effective To', type: 'date' },
];

export default function EmployeeCostCenters() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
          <EditButton permission="cost_centers.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="cost_centers.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
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
      await api.patch(`/api/v1/employee-cost-centers/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Cost Centers</h1><p className="mt-1 text-sm text-gray-600">Manage employee cost center allocations</p></div>
        <CreateButton permission="cost_centers.create" label="Create Allocation" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Cost Center Allocation"
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
    </div>
  );
}
