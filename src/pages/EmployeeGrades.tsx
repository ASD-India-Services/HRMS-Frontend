/**
 * Employee Grades list page with full CRUD using DataTable.
 *
 * Requirements: 5.6, 11.5
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { EMPLOYEE_GRADES } from '@/lib/endpoints';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

interface EmployeeGrade {
  id: string;
  name: string;
  description: string;
  default_salary_structure: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const columns: ColumnDef<EmployeeGrade>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'description', header: 'Description', sortable: false },
  { key: 'default_salary_structure', header: 'Default Salary Structure', sortable: true },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search grades...', type: 'search', debounceMs: 300 },
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

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Grade Name', type: 'text', required: true, placeholder: 'e.g., Senior Engineer' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this grade' },
  { key: 'default_salary_structure', label: 'Default Salary Structure', type: 'text', placeholder: 'Salary structure name' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

const gradeCrud = createCrudHooks<EmployeeGrade>({
  queryKey: 'employee-grades',
  endpoints: {
    list: EMPLOYEE_GRADES.LIST,
    create: EMPLOYEE_GRADES.CREATE,
    detail: EMPLOYEE_GRADES.DETAIL,
    update: EMPLOYEE_GRADES.UPDATE,
    delete: EMPLOYEE_GRADES.DELETE,
  },
});

export default function EmployeeGrades() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) p.search = filterValues.search;
    if (filterValues.is_active) p.is_active = filterValues.is_active;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = gradeCrud.useList(params);
  const createMutation = gradeCrud.useCreate();
  const deleteMutation = gradeCrud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...(columns as ColumnDef<Record<string, unknown>>[]),
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
    createMutation.mutate(data as EmployeeGrade, { onSuccess: () => setShowCreate(false) });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/employee-grades/${editRecord.id}/`, data);
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
          <h1 className="text-2xl font-bold text-gray-900">Employee Grades</h1>
          <p className="mt-1 text-sm text-gray-600">Manage employee grade classifications</p>
        </div>
        <CreateButton label="Create Grade" onClick={() => setShowCreate(true)} />
      </div>

      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />

      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}

      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Employee Grade" fields={createFields} onSubmit={handleCreate} isLoading={createMutation.isPending} initialValues={{ is_active: true }} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Employee Grade" fields={createFields} onSubmit={handleEdit} isLoading={editLoading} initialValues={editRecord ?? {}} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }} title="Delete Employee Grade" message="Are you sure? This action cannot be undone." confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </div>
  );
}
