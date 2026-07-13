/**
 * Branches management page.
 *
 * CRUD interface for managing office branches/locations within the organization.
 * Supports linking branches to geo-fence locations, holiday lists, and default shifts.
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import { BRANCHES } from '@/lib/endpoints';

const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'branches',
  endpoints: {
    list: BRANCHES.LIST,
    create: BRANCHES.CREATE,
    detail: BRANCHES.DETAIL,
    update: BRANCHES.UPDATE,
    delete: BRANCHES.DELETE,
  },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Branch Name', sortable: true },
  { key: 'code', header: 'Code', sortable: true },
  { key: 'city', header: 'City', sortable: true },
  { key: 'state', header: 'State', sortable: true },
  { key: 'employee_count', header: 'Employees', sortable: true },
  { key: 'geo_fence_location_name', header: 'Geo-Fence', sortable: false },
  { key: 'holiday_list_name', header: 'Holiday List', sortable: false },
  {
    key: 'is_head_office',
    header: 'Head Office',
    sortable: true,
    render: (value: unknown) => (value ? '⭐ Yes' : 'No'),
  },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search branches...', type: 'search', debounceMs: 300 },
  {
    key: 'is_active',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ],
  },
];

const formFields: FieldConfig[] = [
  { key: 'name', label: 'Branch Name', type: 'text', required: true, placeholder: 'e.g., Mumbai Head Office' },
  { key: 'code', label: 'Branch Code', type: 'text', placeholder: 'e.g., MUM-HQ' },
  { key: 'address', label: 'Address', type: 'textarea', placeholder: 'Full street address' },
  { key: 'city', label: 'City', type: 'text', placeholder: 'e.g., Mumbai' },
  { key: 'state', label: 'State', type: 'text', placeholder: 'e.g., Maharashtra' },
  { key: 'country', label: 'Country', type: 'text', placeholder: 'India' },
  { key: 'pincode', label: 'PIN Code', type: 'text', placeholder: 'e.g., 400001' },
  { key: 'phone', label: 'Phone', type: 'text', placeholder: 'Office phone number' },
  { key: 'email', label: 'Email', type: 'text', placeholder: 'branch@company.com' },
  { key: 'is_head_office', label: 'Head Office', type: 'checkbox' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

const defaultValues: Record<string, unknown> = {
  country: 'India',
  is_active: true,
  is_head_office: false,
};

export default function Branches() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
          <EditButton
            label="Edit"
            size="sm"
            onClick={() => setEditRecord(row)}
          />
          <DeleteButton
            label="Delete"
            size="sm"
            onClick={() => setDeleteId(row.id as string)}
            permission="employees.delete"
          />
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
      await api.patch(`/api/v1/branches/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } catch {
      // Error stays in the modal
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage office branches and locations across the organization
          </p>
        </div>
        <CreateButton label="Add Branch" onClick={() => setShowCreate(true)} />
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

      {/* Create Modal */}
      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Branch"
        fields={formFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        initialValues={defaultValues}
      />

      {/* Edit Modal */}
      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Branch"
        fields={formFields}
        onSubmit={handleEdit}
        isLoading={editLoading}
        initialValues={editRecord ?? defaultValues}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) });
        }}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? Employees assigned to this branch will be unassigned."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
