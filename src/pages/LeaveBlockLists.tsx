import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/leaves/block-lists/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'leave-block-lists',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Name', sortable: true, render: (v: unknown) => v ? String(v) : '–' },
  { key: 'applies_to_all', header: 'All Depts', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
  { key: 'block_dates', header: 'Blocked Dates', sortable: false, render: (v: unknown) => {
    const dates = v as Array<{ date?: string; reason?: string }> | null;
    if (!dates || dates.length === 0) return <span className="text-gray-500 text-xs">–</span>;
    return <span className="text-xs">{dates.map(d => d.date).join(', ')}</span>;
  }},
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [
  { key: 'is_active', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
];

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Block list name (e.g. Month-End Closing)' },
  { key: 'applies_to_all', label: 'Applies to All Departments', type: 'select', required: true, options: [{ value: 'true', label: 'Yes - All Departments' }, { value: 'false', label: 'No - Specific Departments' }] },
  { key: 'departments', label: 'Department', type: 'select', optionsEndpoint: '/api/v1/departments/', optionsLabelKey: 'name' },
  { key: 'block_date', label: 'Block Date', type: 'date', required: true },
  { key: 'reason', label: 'Reason', type: 'text', placeholder: 'Reason for blocking (e.g. Financial closing)' },
];

export default function LeaveBlockLists() {
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
          <EditButton permission="leave_block_lists.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="leave_block_lists.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    const { block_date, reason, applies_to_all, departments, ...rest } = data;
    const isAll = applies_to_all === 'true' || applies_to_all === true;
    const payload: Record<string, unknown> = {
      ...rest,
      applies_to_all: isAll,
      block_dates: [{ date: block_date, reason: reason || '' }],
    };
    // Only include departments if not applying to all
    if (!isAll && departments) {
      payload.departments = Array.isArray(departments) ? departments : [departments];
    } else {
      payload.departments = [];
    }
    createMutation.mutate(payload, {
      onSuccess: () => setShowCreate(false),
    });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      const { block_date, reason, applies_to_all, departments, ...rest } = data;
      const isAll = applies_to_all === 'true' || applies_to_all === true;
      const payload: Record<string, unknown> = {
        ...rest,
        applies_to_all: isAll,
      };
      // Only update block_dates if a new date was provided
      if (block_date) {
        payload.block_dates = [{ date: block_date, reason: reason || '' }];
      }
      if (!isAll && departments) {
        payload.departments = Array.isArray(departments) ? departments : [departments];
      } else if (isAll) {
        payload.departments = [];
      }
      await api.patch(`/api/v1/leaves/block-lists/${editRecord.id}/`, payload);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Leave Block Lists</h1><p className="mt-1 text-sm text-gray-600">Manage dates when leave cannot be taken</p></div>
        <CreateButton permission="leave_block_lists.create" label="Create Block List" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Leave Block List"
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
