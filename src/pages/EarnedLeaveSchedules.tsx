import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/leaves/earned-leave-schedules/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'earned-leave-schedules',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'leave_type_name', header: 'Leave Type', sortable: true, render: (v: unknown) => v ? String(v) : '–' },
  { key: 'earning_frequency', header: 'Earning Cycle', sortable: true, render: (v: unknown) => v ? String(v) : '–' },
  { key: 'fraction_of_daily_earning', header: 'Monthly Leave Days', sortable: true, render: (v: unknown) => v != null ? `${v} days/period` : '–' },
  { key: 'min_attendance_percentage', header: 'Min Attendance %', sortable: true, render: (v: unknown) => v != null ? String(v) : '–' },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'leave_type', label: 'Leave Type', type: 'select', required: true, optionsEndpoint: '/api/v1/leaves/types/' },
  { key: 'earning_frequency', label: 'Earning Cycle', type: 'select', required: true, options: [{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }] },
  { key: 'fraction_of_daily_earning', label: 'Days Earned Per Period', type: 'number', required: true, placeholder: 'e.g. 1.25 days per month' },
  { key: 'min_attendance_percentage', label: 'Min Attendance %', type: 'number', placeholder: 'Default: 80' },
];

export default function EarnedLeaveSchedules() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editDaysEarned, setEditDaysEarned] = useState('');
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
          <EditButton permission="earned_leave_schedules.edit" label="Edit" size="sm" onClick={() => { setEditRecord(row); setEditDaysEarned(''); }} />
          <DeleteButton permission="earned_leave_schedules.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreate(false),
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Earned Leave Schedules</h1><p className="mt-1 text-sm text-gray-600">Configure automatic leave accrual — days earned per period for all employees</p></div>
        <CreateButton permission="earned_leave_schedules.create" label="Create Schedule" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Earned Leave Schedule"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Edit Modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Earned Leave Schedule</h2>
              <button onClick={() => setEditRecord(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              <span className="font-medium">{editRecord.leave_type_name as string || '–'}</span> — {editRecord.earning_frequency as string || '–'}
            </div>

            <div className="mb-4 rounded-md bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Current Monthly Leave Days</p>
              <p className="text-lg font-bold text-gray-800">{String(editRecord.fraction_of_daily_earning ?? 0)} days/period</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Days Per Period</label>
              <input
                type="number"
                value={editDaysEarned}
                onChange={e => setEditDaysEarned(e.target.value)}
                placeholder="0"
                step="0.25"
                min="0"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {editDaysEarned && Number(editDaysEarned) > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  New monthly leave days: <strong>{(Number(editRecord.fraction_of_daily_earning) + Number(editDaysEarned)).toFixed(2)}</strong> days/period
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50" onClick={() => setEditRecord(null)}>Cancel</button>
              <button
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={editLoading || !editDaysEarned || Number(editDaysEarned) === 0}
                onClick={async () => {
                  if (!editRecord) return;
                  setEditLoading(true);
                  try {
                    const current = Number(editRecord.fraction_of_daily_earning) || 0;
                    const additional = Number(editDaysEarned) || 0;
                    await api.patch(`${ENDPOINT}${editRecord.id}/`, { fraction_of_daily_earning: current + additional });
                    setEditRecord(null);
                    setEditDaysEarned('');
                    queryResult.refetch();
                  } finally {
                    setEditLoading(false);
                  }
                }}
              >
                {editLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        title="Delete Schedule"
        message="Are you sure you want to delete this earned leave schedule? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
