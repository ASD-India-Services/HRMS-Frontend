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
        <h4 className="text-sm font-medium text-gray-700">{label}</h4>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add {label.slice(0, -1)}
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-gray-400 italic">No {label.toLowerCase()} added yet.</p>
      )}

      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
          <select
            value={row.component}
            onChange={(e) => updateRow(index, 'component', e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select component</option>
            {componentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="number"
            value={row.amount || ''}
            onChange={(e) => updateRow(index, 'amount', parseFloat(e.target.value) || 0)}
            placeholder="Amount"
            className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

          <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={row.is_percentage}
              onChange={(e) => updateRow(index, 'is_percentage', e.target.checked)}
              className="rounded border-gray-300"
            />
            %
          </label>

          {row.is_percentage && (
            <input
              type="text"
              value={row.percentage_of || ''}
              onChange={(e) => updateRow(index, 'percentage_of', e.target.value)}
              placeholder="% of (e.g., Basic)"
              className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          )}

          <button
            type="button"
            onClick={() => removeRow(index)}
            className="rounded p-1 text-red-500 hover:bg-red-50"
            aria-label="Remove row"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Structure Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Junior Structure, Senior Structure"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300"
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
        if (!arr || arr.length === 0) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-sm text-gray-700">
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
        if (!arr || arr.length === 0) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-sm text-gray-700">
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
          <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Structures</h1>
          <p className="mt-1 text-sm text-gray-600">Manage salary structures with earnings and deductions</p>
        </div>
        <CreateButton label="Create Structure" onClick={() => setShowCreate(true)} />
      </div>

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
    </div>
  );
}
