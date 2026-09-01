import { useMemo, useState, useEffect } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/leaves/policies/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'leave-policies',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'effective_date', header: 'Effective Date', sortable: true },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
  { key: 'allocations', header: 'Leave Types', sortable: false, render: (v: unknown) => {
    const allocs = v as Array<{ leave_type_name?: string; annual_allocation?: number }> | null;
    if (!allocs || allocs.length === 0) return <span className="text-gray-500 text-xs">–</span>;
    return <span className="text-xs">{allocs.map(a => `${a.leave_type_name}: ${a.annual_allocation}d`).join(', ')}</span>;
  }},
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
  { key: 'is_active', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
];

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Policy Name', type: 'text', required: true, placeholder: 'Enter policy name' },
  { key: 'effective_date', label: 'Effective Date', type: 'date', required: true },
];

interface LeaveTypeOption {
  id: string;
  name: string;
}

interface AllocationRow {
  leave_type: string;
  annual_allocation: string;
  max_carry_forward: string;
}

export default function LeavePolicies() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAllocations, setShowAllocations] = useState<Record<string, unknown> | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  useEffect(() => {
    api.get('/api/v1/leaves/types/').then(res => {
      const data = res.data as { results?: LeaveTypeOption[] } | LeaveTypeOption[];
      setLeaveTypes(Array.isArray(data) ? data : data.results || []);
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
          <button
            className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            onClick={() => openAllocations(row)}
          >
            Allocations
          </button>
          <EditButton permission="leave_policies.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="leave_policies.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const openAllocations = (policy: Record<string, unknown>) => {
    setShowAllocations(policy);
    const existing = policy.allocations as Array<{ leave_type: string; annual_allocation: number; max_carry_forward: number }> | undefined;
    if (existing && existing.length > 0) {
      setAllocations(existing.map(a => ({
        leave_type: a.leave_type,
        annual_allocation: String(a.annual_allocation),
        max_carry_forward: String(a.max_carry_forward),
      })));
    } else {
      setAllocations([{ leave_type: '', annual_allocation: '', max_carry_forward: '0' }]);
    }
  };

  const handleSaveAllocations = async () => {
    if (!showAllocations) return;
    setAllocLoading(true);
    try {
      const validAllocations = allocations
        .filter(a => a.leave_type && a.annual_allocation)
        .map(a => ({
          leave_type: a.leave_type,
          annual_allocation: parseFloat(a.annual_allocation),
          max_carry_forward: parseFloat(a.max_carry_forward) || 0,
        }));
      await api.patch(`${ENDPOINT}${showAllocations.id}/`, { allocations: validAllocations });
      setShowAllocations(null);
      queryResult.refetch();
    } finally {
      setAllocLoading(false);
    }
  };

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreate(false),
    });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`${ENDPOINT}${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Leave Policies</h1><p className="mt-1 text-sm text-gray-600">Manage leave allocation policy templates</p></div>
        <CreateButton permission="leave_policies.create" label="Create Policy" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Leave Policy"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Leave Policy"
        fields={createFields}
        initialValues={editRecord ?? undefined}
        onSubmit={handleEdit}
        isLoading={editLoading}
      />

      {/* Allocations Modal */}
      {showAllocations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-1">Manage Leave Allocations</h2>
            <p className="text-sm text-gray-500 mb-4">Policy: {showAllocations.name as string}</p>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 px-1">
                <span className="flex-1">Leave Type</span>
                <span className="w-24">Days/Year</span>
                <span className="w-24">Max Carry Fwd</span>
                <span className="w-5"></span>
              </div>
              {allocations.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                    value={row.leave_type}
                    onChange={e => {
                      const updated = [...allocations];
                      updated[idx].leave_type = e.target.value;
                      setAllocations(updated);
                    }}
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>{lt.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Days/year"
                    className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                    value={row.annual_allocation}
                    onChange={e => {
                      const updated = [...allocations];
                      updated[idx].annual_allocation = e.target.value;
                      setAllocations(updated);
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Carry fwd"
                    className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                    value={row.max_carry_forward}
                    onChange={e => {
                      const updated = [...allocations];
                      updated[idx].max_carry_forward = e.target.value;
                      setAllocations(updated);
                    }}
                  />
                  <button
                    className="text-red-500 hover:text-red-700 text-sm px-1"
                    onClick={() => setAllocations(allocations.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              onClick={() => setAllocations([...allocations, { leave_type: '', annual_allocation: '', max_carry_forward: '0' }])}
            >
              + Add Leave Type
            </button>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => setShowAllocations(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={allocLoading}
                onClick={handleSaveAllocations}
              >
                {allocLoading ? 'Saving...' : 'Save Allocations'}
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
        title="Delete Leave Policy"
        message="Are you sure you want to delete this leave policy? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
