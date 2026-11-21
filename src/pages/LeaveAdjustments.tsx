import { useEffect, useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

const ENDPOINT = '/api/v1/leaves/adjustments/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'leave-adjustments',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true, render: (v: unknown) => v ? String(v) : '–' },
  { key: 'leave_type_name', header: 'Leave Type', sortable: true, render: (v: unknown) => v ? String(v) : '–' },
  {
    key: 'adjustment_amount', header: 'Adjustment', sortable: true, render: (v: unknown) => {
      const num = Number(v);
      return <span className={num > 0 ? 'text-success-main font-medium' : 'text-error-main font-medium'}>{num > 0 ? `+${num}` : num}</span>;
    }
  },
  { key: 'reason', header: 'Reason', sortable: false, render: (v: unknown) => v ? String(v) : '–' },
  { key: 'adjusted_by_name', header: 'Adjusted By', sortable: false, render: (v: unknown) => v ? String(v) : '–' },
  {
    key: 'created_at', header: 'Date', sortable: true, render: (v: unknown) => {
      if (!v) return '–';
      const d = new Date(v as string);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  },
];

const filters: FilterConfig[] = [
  { key: 'employee', label: 'Employee', type: 'search', debounceMs: 300 },
  { key: 'leave_type', label: 'Leave Type', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'leave_type', label: 'Leave Type', type: 'select', required: true, optionsEndpoint: '/api/v1/leaves/types/' },
  { key: 'adjustment_type', label: 'Adjustment Type', type: 'select', required: true, options: [{ value: 'credit', label: 'Credit' }, { value: 'debit', label: 'Debit' }] },
  { key: 'days', label: 'Days', type: 'number', required: true, placeholder: 'Number of days' },
  { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Reason for adjustment' },
];

interface BalanceInfo {
  allocated_days: number;
  used_days: number;
  available_balance: number;
  leave_type_name: string;
}

interface EmployeeOption { id: string; full_name?: string; name?: string }
interface LeaveTypeOption { id: string; name: string }

function CreateAdjustmentModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('credit');
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      api.get('/api/v1/employees/').then(res => {
        const d = res.data as { results?: EmployeeOption[] } | EmployeeOption[];
        setEmployees(Array.isArray(d) ? d : d.results || []);
      });
      api.get('/api/v1/leaves/types/').then(res => {
        const d = res.data as { results?: LeaveTypeOption[] } | LeaveTypeOption[];
        setLeaveTypes(Array.isArray(d) ? d : d.results || []);
      });
    }
  }, [isOpen]);

  // Fetch balance when employee + leave type are selected
  useEffect(() => {
    if (selectedEmployee && selectedLeaveType) {
      setBalanceLoading(true);
      api.get('/api/v1/leaves/allocations/', { params: { employee: selectedEmployee, leave_type: selectedLeaveType } })
        .then(res => {
          const data = res.data as { results?: BalanceInfo[] } | BalanceInfo[];
          const results = Array.isArray(data) ? data : data.results || [];
          if (results.length > 0) {
            const alloc = results[0] as unknown as { allocated_days: string | number; used_days: string | number; carry_forwarded: string | number; leave_type_name?: string };
            const allocated = Number(alloc.allocated_days) || 0;
            const used = Number(alloc.used_days) || 0;
            const carry = Number(alloc.carry_forwarded) || 0;
            setBalance({
              allocated_days: allocated,
              used_days: used,
              available_balance: allocated + carry - used,
              leave_type_name: alloc.leave_type_name || '',
            });
          } else {
            setBalance(null);
          }
        })
        .catch(() => setBalance(null))
        .finally(() => setBalanceLoading(false));
    } else {
      setBalance(null);
    }
  }, [selectedEmployee, selectedLeaveType]);

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee.');
      return;
    }
    if (!selectedLeaveType) {
      setError('Please select a leave type.');
      return;
    }
    if (!days || Number(days) <= 0) {
      setError('Please enter a valid number of days.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const amount = adjustmentType === 'debit' ? -Number(days) : Number(days);
    try {
      await api.post(ENDPOINT, {
        employee: selectedEmployee,
        leave_type: selectedLeaveType,
        adjustment_amount: amount,
        reason: reason.trim(),
      });
      // Reset form
      setSelectedEmployee('');
      setSelectedLeaveType('');
      setAdjustmentType('credit');
      setDays('');
      setReason('');
      setBalance(null);
      setError(null);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: Record<string, unknown> | string } };
      const data = errObj?.response?.data;
      if (typeof data === 'string') {
        setError(data);
      } else if (data && typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([field, msg]) => `${field !== 'detail' ? `${field}: ` : ''}${Array.isArray(msg) ? msg.join(', ') : msg}`)
          .join('\n');
        setError(messages || 'Failed to create adjustment.');
      } else {
        setError('Failed to create adjustment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal open onClose={onClose} labelledBy="LeaveAdjustments-modal-title-1" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
      <div className="p-6 min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="LeaveAdjustments-modal-title-1" className="text-lg font-semibold">Create Leave Adjustment</h2>
          <IconButton icon="close" size="small" onClick={onClose} aria-label="Close" />
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-error-lighter p-3 text-sm text-error-dark border border-error-light">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Employee *</label>
            <Select
              value={selectedEmployee}
              onChange={e => {
                setSelectedEmployee(e.target.value);
                if (error) setError(null);
              }}
            >
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name || emp.name}</option>)}
            </Select>
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Leave Type *</label>
            <Select
              value={selectedLeaveType}
              onChange={e => {
                setSelectedLeaveType(e.target.value);
                if (error) setError(null);
              }}
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
            </Select>
          </div>

          {/* Current Balance Display */}
          {selectedEmployee && selectedLeaveType && (
            <div className="rounded-md bg-primary-lighter border border-primary-light p-3">
              {balanceLoading ? (
                <p className="text-sm text-primary-main">Loading balance...</p>
              ) : balance ? (
                <div className="text-sm text-primary-dark">
                  <p className="font-medium">Current Balance</p>
                  <div className="mt-1 flex gap-4">
                    <span>Allocated: <strong>{balance.allocated_days}</strong></span>
                    <span>Used: <strong>{balance.used_days}</strong></span>
                    <span>Available: <strong>{balance.available_balance}</strong></span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-primary-main">No allocation found — balance will be created with this adjustment.</p>
              )}
            </div>
          )}

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Adjustment Type *</label>
            <Select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)}>
              <option value="credit">Credit (Add days)</option>
              <option value="debit">Debit (Remove days)</option>
            </Select>
          </div>

          {/* Days */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Days *</label>
            <Input
              type="number"
              placeholder="Number of days"
              value={days}
              onChange={e => {
                setDays(e.target.value);
                if (error) setError(null);
              }}
              min="0.5"
              step="0.5"
            />
            {balance && days && (
              <p className="mt-1 text-xs text-ink-secondary">
                After adjustment: <strong>{(balance.available_balance + (adjustmentType === 'debit' ? -Number(days) : Number(days))).toFixed(1)}</strong> days available
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Reason *</label>
            <Textarea
              rows={2}
              placeholder="Reason for adjustment (required)"
              value={reason}
              required
              onChange={e => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outlined" color="inherit" onClick={onClose}>Cancel</Button>
          <Button type="button"
            disabled={submitting || !selectedEmployee || !selectedLeaveType || !days || !reason.trim()}
            onClick={handleSubmit}
          >
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function LeaveAdjustments() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const deleteMutation = crud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <DeleteButton permission="leave_adjustments.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/leaves/adjustments/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Leave Adjustments" subtitle="Manual leave balance adjustments" actions={<CreateButton permission="leave_adjustments.create" label="Create Adjustment" onClick={() => setShowCreate(true)} />} />
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {/* Custom Create Modal with Balance Preview */}
      <CreateAdjustmentModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => queryResult.refetch()}
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
