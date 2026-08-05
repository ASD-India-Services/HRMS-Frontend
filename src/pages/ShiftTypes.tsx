/**
 * Shift Types Management Page
 *
 * CRUD interface for managing shift type templates (name, start/end time,
 * night shift flag, grace period). Used under Attendance → Shift Types.
 *
 * Requirements: 27.5
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

const ENDPOINT = '/api/v1/shifts/types/';

const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'shift-types',
  endpoints: {
    list: ENDPOINT,
    create: ENDPOINT,
    detail: (id) => `${ENDPOINT}${id}/`,
    update: (id) => `${ENDPOINT}${id}/`,
    delete: (id) => `${ENDPOINT}${id}/`,
  },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Shift Name', sortable: true },
  { key: 'start_time', header: 'Start Time', sortable: true },
  { key: 'end_time', header: 'End Time', sortable: true },
  {
    key: 'is_night_shift',
    header: 'Night Shift',
    sortable: true,
    render: (v: unknown) => (v ? 'Yes' : 'No'),
  },
  {
    key: 'grace_period_minutes',
    header: 'Grace Period (min)',
    sortable: true,
  },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search shift types...', type: 'search', debounceMs: 300 },
];

const formFields: FieldConfig[] = [
  {
    key: 'name',
    label: 'Shift Name',
    type: 'text',
    required: true,
    placeholder: 'e.g. General Shift',
  },
  {
    key: 'start_time',
    label: 'Start Time',
    type: 'text',
    required: true,
    placeholder: 'HH:MM (e.g. 09:00)',
  },
  {
    key: 'end_time',
    label: 'End Time',
    type: 'text',
    required: true,
    placeholder: 'HH:MM (e.g. 18:00)',
  },
  {
    key: 'is_night_shift',
    label: 'Night Shift',
    type: 'checkbox',
  },
  {
    key: 'grace_period_minutes',
    label: 'Grace Period (minutes)',
    type: 'number',
    placeholder: '15',
  },
];

export default function ShiftTypes() {
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
          <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    // Ensure grace_period_minutes is a number
    const payload = {
      ...data,
      grace_period_minutes: data.grace_period_minutes
        ? Number(data.grace_period_minutes)
        : 15,
      is_night_shift: !!data.is_night_shift,
    };
    createMutation.mutate(payload, {
      onSuccess: () => setShowCreate(false),
    });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      const payload = {
        ...data,
        grace_period_minutes: data.grace_period_minutes
          ? Number(data.grace_period_minutes)
          : 15,
        is_night_shift: !!data.is_night_shift,
      };
      await api.patch(`${ENDPOINT}${editRecord.id}/`, payload);
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
          <h1 className="text-2xl font-bold text-gray-900">Shift Types</h1>
          <p className="mt-1 text-sm text-gray-600">
            Define shift templates with timing and grace periods
          </p>
        </div>
        <CreateButton label="Create Shift Type" onClick={() => setShowCreate(true)} />
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

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Shift Type"
        fields={formFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Shift Type"
        fields={formFields}
        initialValues={editRecord ?? undefined}
        onSubmit={handleEdit}
        isLoading={editLoading}
      />

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
        title="Delete Shift Type"
        message="Are you sure you want to delete this shift type? Existing shift assignments using this type may be affected."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
