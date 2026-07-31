import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/vehicles/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'fleet-vehicles',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'registration_number', header: 'Registration No.', sortable: true },
  { key: 'make_model', header: 'Make & Model', sortable: true },
  { key: 'vehicle_type', header: 'Vehicle Type', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
  { key: 'assigned_to', header: 'Assigned To', sortable: true },
];

const filters: FilterConfig[] = [
  { key: 'vehicle_type', label: 'Vehicle Type', type: 'select', options: [{ value: '', label: 'All' }, { value: 'car', label: 'Car' }, { value: 'bike', label: 'Bike' }, { value: 'van', label: 'Van' }, { value: 'truck', label: 'Truck' }] },
  { key: 'status', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'available', label: 'Available' }, { value: 'assigned', label: 'Assigned' }, { value: 'maintenance', label: 'Maintenance' }] },
];

const createFields: FieldConfig[] = [
  { key: 'registration_number', label: 'Registration Number', type: 'text', required: true, placeholder: 'Vehicle registration number' },
  { key: 'make', label: 'Make', type: 'text', required: true, placeholder: 'Vehicle make (e.g. Toyota)' },
  { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'Vehicle model (e.g. Camry)' },
  { key: 'vehicle_type', label: 'Vehicle Type', type: 'select', required: true, options: [{ value: 'car', label: 'Car' }, { value: 'bike', label: 'Bike' }, { value: 'van', label: 'Van' }, { value: 'truck', label: 'Truck' }] },
  { key: 'fuel_type', label: 'Fuel Type', type: 'select', required: true, options: [{ value: 'petrol', label: 'Petrol' }, { value: 'diesel', label: 'Diesel' }, { value: 'electric', label: 'Electric' }, { value: 'cng', label: 'CNG' }] },
];

export default function Fleet() {
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
          <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
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
      await api.patch(`/api/v1/vehicles/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1><p className="mt-1 text-sm text-gray-600">Manage vehicles, logs, and service records</p></div>
        <CreateButton label="Add Vehicle" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Vehicle"
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
