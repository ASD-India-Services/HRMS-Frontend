/**
 * Salary Components list page with full CRUD using DataTable.
 *
 * Requirements: 3.6
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { salaryComponentCrudConfig } from '@/config/crud/salaryComponents';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const salaryComponentCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'salary-components',
  endpoints: salaryComponentCrudConfig.endpoints,
});

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Component Name', type: 'text', required: true, placeholder: 'e.g., Basic Salary, HRA' },
  { key: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'earning', label: 'Earning' }, { value: 'deduction', label: 'Deduction' }] },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this component' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

export default function SalaryComponents() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters: salaryComponentCrudConfig.filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) p.search = filterValues.search;
    if (filterValues.type) p.type = filterValues.type;
    if (filterValues.is_active) p.is_active = filterValues.is_active;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = salaryComponentCrud.useList(params);
  const createMutation = salaryComponentCrud.useCreate();
  const deleteMutation = salaryComponentCrud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...(salaryComponentCrudConfig.columns as ColumnDef<Record<string, unknown>>[]),
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton permission="salary_components.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="salary_components.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, { onSuccess: () => setShowCreate(false) });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/salary-components/${editRecord.id}/`, data);
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
          <h1 className="text-2xl font-bold text-gray-900">Salary Components</h1>
          <p className="mt-1 text-sm text-gray-600">Manage salary earning and deduction components</p>
        </div>
        <CreateButton permission="salary_components.create" label="Create Component" onClick={() => setShowCreate(true)} />
      </div>

      <FilterBar
        filters={salaryComponentCrudConfig.filters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable queryResult={queryResult} columns={columnsWithActions} />

      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}

      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Salary Component" fields={createFields} onSubmit={handleCreate} isLoading={createMutation.isPending} initialValues={{ is_active: true }} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Salary Component" fields={createFields} onSubmit={handleEdit} isLoading={editLoading} initialValues={editRecord ?? {}} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }} title="Delete Salary Component" message="Are you sure? This action cannot be undone." confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </div>
  );
}
