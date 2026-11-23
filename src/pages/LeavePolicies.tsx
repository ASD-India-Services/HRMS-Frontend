import { useMemo, useState, useEffect } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { ActionButton, CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ManageLeaveTypesModal } from '@/components/leaves/ManageLeaveTypesModal';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';

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
    if (!allocs || allocs.length === 0) return <span className="text-ink-secondary text-xs">–</span>;
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
  max_days_per_year?: number | string;
  max_carry_forward_days?: number | string;
  is_carry_forward?: boolean;
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
  const [showLeaveTypesModal, setShowLeaveTypesModal] = useState(false);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  const loadLeaveTypes = () => {
    api.get('/api/v1/leaves/types/').then(res => {
      const data = res.data as { results?: LeaveTypeOption[] } | LeaveTypeOption[];
      setLeaveTypes(Array.isArray(data) ? data : data.results || []);
    });
  };

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <Button variant="soft" size="small" onClick={() => openAllocations(row)}>
            Allocations
          </Button>
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
    <PageContainer>
      <PageHeader title="Leave Policies" subtitle="Manage leave allocation policy templates" actions={
        <>
<div className="flex items-center gap-3">
          <ActionButton
            permission="leave_types.create"
            variant="secondary"
            label="Manage Leave Types"
            icon="M12 4.5v15m7.5-7.5h-15"
            onClick={() => setShowLeaveTypesModal(true)}
          />
          <CreateButton permission="leave_policies.create" label="Create Policy" onClick={() => setShowCreate(true)} />
        </div>
        </>
      } />
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
        <Modal open onClose={() => {}} labelledBy="LeavePolicies-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h2 id="LeavePolicies-modal-title-1" className="text-lg font-semibold mb-1">Manage Leave Allocations</h2>
            <p className="text-sm text-ink-secondary mb-4">Policy: {showAllocations.name as string}</p>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              <div className="flex items-center gap-2 text-xs font-medium text-ink-secondary px-1">
                <span className="flex-1">Leave Type</span>
                <span className="w-24">Days/Year</span>
                <span className="w-24">Max Carry Fwd</span>
                <span className="w-5"></span>
              </div>
              {allocations.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    className="flex-1"
                    value={row.leave_type}
                    onChange={e => {
                      const updated = [...allocations];
                      const selectedId = e.target.value;
                      updated[idx].leave_type = selectedId;
                      const matched = leaveTypes.find(lt => lt.id === selectedId);
                      if (matched && !matched.is_carry_forward) {
                        updated[idx].max_carry_forward = '0';
                      }
                      setAllocations(updated);
                    }}
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>{lt.name}</option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    placeholder="Days/year"
                    className="w-24"
                    value={row.annual_allocation}
                    onChange={e => {
                      const updated = [...allocations];
                      updated[idx].annual_allocation = e.target.value;
                      setAllocations(updated);
                    }}
                  />
                  {(() => {
                    const matched = leaveTypes.find(lt => lt.id === row.leave_type);
                    const canCarry = matched ? matched.is_carry_forward : true;
                    return (
                      <input
                        type="number"
                        placeholder="Carry fwd"
                        disabled={!canCarry}
                        title={!canCarry ? 'Carry forward is not enabled on this leave type' : ''}
                        className={`w-24 rounded border border-divider px-2 py-1.5 text-sm ${
                          !canCarry ? 'bg-surface-neutral text-ink-disabled cursor-not-allowed' : ''
                        }`}
                        value={canCarry ? row.max_carry_forward : '0'}
                        onChange={e => {
                          const updated = [...allocations];
                          updated[idx].max_carry_forward = e.target.value;
                          setAllocations(updated);
                        }}
                      />
                    );
                  })()}
                  <IconButton icon="close" size="small" color="error" onClick={() => setAllocations(allocations.filter((_, i) => i !== idx))} aria-label="Remove leave type" />
                </div>
              ))}
            </div>

            <Button variant="text" startIcon={<Iconify icon="plus" />} onClick={() => setAllocations([...allocations, { leave_type: '', annual_allocation: '', max_carry_forward: '0' }])} className="mt-3">Add Leave Type
            </Button>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outlined" color="inherit" onClick={() => setShowAllocations(null)}>
                Cancel
              </Button>
              <Button type="button"
                disabled={allocLoading}
                onClick={handleSaveAllocations}
              >
                {allocLoading ? 'Saving...' : 'Save Allocations'}
              </Button>
            </div>
          </div>
        </Modal>
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

      <ManageLeaveTypesModal
        isOpen={showLeaveTypesModal}
        onClose={() => setShowLeaveTypesModal(false)}
        onLeaveTypesChanged={loadLeaveTypes}
      />
    </PageContainer>
  );
}
