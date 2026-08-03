/**
 * Salary Structure Assignments list page with full CRUD using DataTable.
 *
 * Requirements: 4.6
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { salaryStructureAssignmentCrudConfig } from '@/config/crud/salaryStructureAssignments';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import type { AxiosError } from 'axios';

const assignmentCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'salary-structure-assignments',
  endpoints: salaryStructureAssignmentCrudConfig.endpoints,
});

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'salary_structure', label: 'Salary Structure', type: 'select', required: true, optionsEndpoint: '/api/v1/salary-structures/', optionsLabelKey: 'name' },
  { key: 'from_date', label: 'From Date', type: 'date', required: true },
  { key: 'base_amount', label: 'Base Amount', type: 'number', required: true, placeholder: '0.00' },
  { key: 'variable_amount', label: 'Variable Amount', type: 'number', placeholder: '0.00' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

/**
 * Extract field-level error messages from an Axios 400 response.
 * Backend returns: { field_name: ["error message", ...], ... }
 */
function extractApiErrors(error: unknown): Record<string, string> {
  const axiosErr = error as AxiosError<Record<string, string[] | string>>;
  const data = axiosErr?.response?.data;
  if (!data || typeof data !== 'object') return {};

  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      errors[key] = value.join(' ');
    } else if (typeof value === 'string') {
      errors[key] = value;
    }
  }
  return errors;
}

export default function SalaryStructureAssignments() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters: salaryStructureAssignmentCrudConfig.filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) p.search = filterValues.search;
    if (filterValues.is_active) p.is_active = filterValues.is_active;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = assignmentCrud.useList(params);
  const createMutation = assignmentCrud.useCreate();
  const deleteMutation = assignmentCrud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...(salaryStructureAssignmentCrudConfig.columns as ColumnDef<Record<string, unknown>>[]),
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton label="Edit" size="sm" onClick={() => { setEditRecord(row); setEditErrors({}); }} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    const payload = { ...data };
    if (!payload.variable_amount && payload.variable_amount !== 0) {
      payload.variable_amount = 0;
    }
    setCreateErrors({});
    createMutation.mutate(payload, {
      onSuccess: () => {
        setShowCreate(false);
        setCreateErrors({});
      },
      onError: (error) => {
        setCreateErrors(extractApiErrors(error));
      },
    });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    setEditErrors({});
    try {
      const payload = { ...data };
      if (!payload.variable_amount && payload.variable_amount !== 0) {
        payload.variable_amount = 0;
      }
      await api.patch(`/api/v1/salary-structure-assignments/${editRecord.id}/`, payload);
      setEditRecord(null);
      setEditErrors({});
      queryResult.refetch();
    } catch (error) {
      setEditErrors(extractApiErrors(error));
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    setCreateErrors({});
  };

  const handleCloseEdit = () => {
    setEditRecord(null);
    setEditErrors({});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Structure Assignments</h1>
          <p className="mt-1 text-sm text-gray-600">Manage employee salary structure assignments</p>
        </div>
        <CreateButton label="Create Assignment" onClick={() => { setShowCreate(true); setCreateErrors({}); }} />
      </div>

      <FilterBar
        filters={salaryStructureAssignmentCrudConfig.filters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable queryResult={queryResult} columns={columnsWithActions} />

      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}

      <CrudModal
        isOpen={showCreate}
        onClose={handleCloseCreate}
        title="Create Salary Structure Assignment"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        initialValues={{ is_active: true, variable_amount: 0 }}
        apiErrors={createErrors}
      />
      <CrudModal
        isOpen={!!editRecord}
        onClose={handleCloseEdit}
        title="Edit Salary Structure Assignment"
        fields={createFields}
        onSubmit={handleEdit}
        isLoading={editLoading}
        initialValues={editRecord ?? {}}
        apiErrors={editErrors}
      />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }} title="Delete Assignment" message="Are you sure? This action cannot be undone." confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </div>
  );
}
