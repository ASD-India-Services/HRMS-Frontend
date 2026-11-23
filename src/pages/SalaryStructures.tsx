/**
 * Salary Structures list page with full CRUD.
 *
 * Earnings and deductions are managed via dynamic row-based forms
 * (add/remove rows) instead of raw JSON input.
 *
 * Requirements: 3.1, 9.1
 */

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import { salaryStructuresCrudConfig } from '@/config/crud/salaryStructures';
import { SALARY_COMPONENTS, PAYROLL } from '@/lib/endpoints';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComponentRow {
  component: string;
  amount: number;
  is_percentage: boolean;
  percentage_of: string;
}

interface SalaryStructureFormData {
  name: string;
  is_active: boolean;
  earnings: ComponentRow[];
  deductions: ComponentRow[];
}

// ---------------------------------------------------------------------------
// Component Row Editor
// ---------------------------------------------------------------------------

function ComponentRowEditor({
  rows,
  onChange,
  label,
  componentOptions,
}: {
  rows: ComponentRow[];
  onChange: (rows: ComponentRow[]) => void;
  label: string;
  componentOptions: { value: string; label: string }[];
}) {
  const addRow = () => {
    onChange([...rows, { component: '', amount: 0, is_percentage: false, percentage_of: '' }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof ComponentRow, value: unknown) => {
    const updated = rows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-ink-primary">{label}</h4>
        <Button variant="soft" size="small" startIcon={<Iconify icon="plus" />} onClick={addRow}>Add {label.slice(0, -1)}
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-ink-disabled italic">No {label.toLowerCase()} added yet.</p>
      )}

      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2 rounded-md border border-divider bg-surface-neutral p-2">
          <Select
            value={row.component}
            onChange={(e) => updateRow(index, 'component', e.target.value)}
            className="flex-1"
          >
            <option value="">Select component</option>
            {componentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>

          <Input
            type="number"
            value={row.amount || ''}
            onChange={(e) => updateRow(index, 'amount', parseFloat(e.target.value) || 0)}
            placeholder="Amount"
            className="w-28"
          />

          <label className="flex items-center gap-1 text-xs text-ink-secondary whitespace-nowrap">
            <input
              type="checkbox"
              checked={row.is_percentage}
              onChange={(e) => updateRow(index, 'is_percentage', e.target.checked)}
              className="rounded border-divider"
            />
            %
          </label>

          {row.is_percentage && (
            <Input
              type="text"
              value={row.percentage_of || ''}
              onChange={(e) => updateRow(index, 'percentage_of', e.target.value)}
              placeholder="% of (e.g., Basic)"
              className="w-32"
            />
          )}

          <IconButton icon="trash" size="small" color="error" onClick={() => removeRow(index)} aria-label="Remove row" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Salary Structure Form Modal
// ---------------------------------------------------------------------------

function SalaryStructureFormModal({
  isOpen,
  onClose,
  title,
  initialValues,
  onSubmit,
  isLoading,
  earningOptions,
  deductionOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialValues: SalaryStructureFormData;
  onSubmit: (data: SalaryStructureFormData) => void;
  isLoading: boolean;
  earningOptions: { value: string; label: string }[];
  deductionOptions: { value: string; label: string }[];
}) {
  const [formData, setFormData] = useState<SalaryStructureFormData>(initialValues);

  // Reset form when modal opens with new initial values
  useState(() => {
    setFormData(initialValues);
  });

  // Sync when initialValues change (e.g., opening edit modal)
  useMemo(() => {
    if (isOpen) setFormData(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <Modal open onClose={onClose} labelledBy="SalaryStructures-modal-title-1" size="lg" closeOnEscape={false}>
      <div className="p-6 min-h-0 flex-1 overflow-y-auto">
        <h2 id="SalaryStructures-modal-title-1" className="mb-4 text-lg font-semibold text-ink-primary">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Structure Name *</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Junior Structure, Senior Structure"
              required
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm text-ink-primary">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-divider"
            />
            Active
          </label>

          {/* Earnings */}
          <ComponentRowEditor
            rows={formData.earnings}
            onChange={(earnings) => setFormData((prev) => ({ ...prev, earnings }))}
            label="Earnings"
            componentOptions={earningOptions}
          />

          {/* Deductions */}
          <ComponentRowEditor
            rows={formData.deductions}
            onChange={(deductions) => setFormData((prev) => ({ ...prev, deductions }))}
            label="Deductions"
            componentOptions={deductionOptions}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outlined" color="inherit" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const salaryStructureCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'salary-structures',
  endpoints: salaryStructuresCrudConfig.endpoints,
});

const emptyForm: SalaryStructureFormData = {
  name: '',
  is_active: true,
  earnings: [],
  deductions: [],
};

export default function SalaryStructures() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters: salaryStructuresCrudConfig.filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) p.search = filterValues.search;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = salaryStructureCrud.useList(params);
  const createMutation = salaryStructureCrud.useCreate();
  const deleteMutation = salaryStructureCrud.useDelete();

  // Fetch salary components for the dropdown
  const { data: componentsData } = useQuery({
    queryKey: ['salary-components-options'],
    queryFn: async () => {
      const res = await api.get(SALARY_COMPONENTS.LIST, { params: { page_size: 200 } });
      return res.data;
    },
  });

  const earningOptions = useMemo(() => {
    const items = componentsData?.results || componentsData || [];
    return (items as { id: string; name: string; type: string }[])
      .filter((c) => c.type === 'earning')
      .map((c) => ({ value: c.name, label: c.name }));
  }, [componentsData]);

  const deductionOptions = useMemo(() => {
    const items = componentsData?.results || componentsData || [];
    return (items as { id: string; name: string; type: string }[])
      .filter((c) => c.type === 'deduction')
      .map((c) => ({ value: c.name, label: c.name }));
  }, [componentsData]);

  // Columns with earnings/deductions count for readability
  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'earnings',
      header: 'Earnings',
      sortable: false,
      render: (value: unknown) => {
        const arr = value as ComponentRow[] | null;
        if (!arr || arr.length === 0) return <span className="text-ink-disabled">—</span>;
        return (
          <span className="text-sm text-ink-primary">
            {arr.map((e) => e.component).join(', ')}
          </span>
        );
      },
    },
    {
      key: 'deductions',
      header: 'Deductions',
      sortable: false,
      render: (value: unknown) => {
        const arr = value as ComponentRow[] | null;
        if (!arr || arr.length === 0) return <span className="text-ink-disabled">—</span>;
        return (
          <span className="text-sm text-ink-primary">
            {arr.map((d) => d.component).join(', ')}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      header: 'Active',
      sortable: true,
      render: (value: unknown) => (value ? 'Yes' : 'No'),
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton permission="salary_structures.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="salary_structures.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = useCallback((data: SalaryStructureFormData) => {
    createMutation.mutate(data as unknown as Record<string, unknown>, {
      onSuccess: () => setShowCreate(false),
    });
  }, [createMutation]);

  const handleEdit = useCallback(async (data: SalaryStructureFormData) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/salary-structures/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  }, [editRecord, queryResult]);

  const editInitialValues: SalaryStructureFormData = useMemo(() => {
    if (!editRecord) return emptyForm;
    return {
      name: (editRecord.name as string) || '',
      is_active: editRecord.is_active !== false,
      earnings: (editRecord.earnings as ComponentRow[]) || [],
      deductions: (editRecord.deductions as ComponentRow[]) || [],
    };
  }, [editRecord]);

  return (
    <PageContainer>
      <PageHeader title="Salary Structures" subtitle="Manage salary structures with earnings and deductions" actions={<CreateButton permission="salary_structures.create" label="Create Structure" onClick={() => setShowCreate(true)} />} />

      <FilterBar
        filters={salaryStructuresCrudConfig.filters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable queryResult={queryResult} columns={columnsWithActions} />

      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}

      {/* Create Modal */}
      <SalaryStructureFormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Salary Structure"
        initialValues={emptyForm}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        earningOptions={earningOptions}
        deductionOptions={deductionOptions}
      />

      {/* Edit Modal */}
      <SalaryStructureFormModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Salary Structure"
        initialValues={editInitialValues}
        onSubmit={handleEdit}
        isLoading={editLoading}
        earningOptions={earningOptions}
        deductionOptions={deductionOptions}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }}
        title="Delete Salary Structure"
        message="Are you sure? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
