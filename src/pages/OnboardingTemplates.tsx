/**
 * Onboarding Templates & Tasks Management Page
 *
 * HR/Admin interface for creating onboarding templates and assigning
 * tasks to employees. Accessible under Learning → Onboarding Templates.
 *
 * Permission: onboarding.manage (HR Manager / Org Admin only)
 */

import { useMemo, useState, useEffect } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

// ─── Templates CRUD ──────────────────────────────────────────────────────────

const TEMPLATE_ENDPOINT = '/api/v1/onboarding/templates/';
const templateCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'onboarding-templates',
  endpoints: {
    list: TEMPLATE_ENDPOINT,
    create: TEMPLATE_ENDPOINT,
    detail: (id) => `${TEMPLATE_ENDPOINT}${id}/`,
    update: (id) => `${TEMPLATE_ENDPOINT}${id}/`,
    delete: (id) => `${TEMPLATE_ENDPOINT}${id}/`,
  },
});

const templateColumns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Template Name', sortable: true },
  { key: 'department_name', header: 'Department', sortable: false, render: (v: unknown) => (v ? String(v) : 'All (Org-wide)') },
  { key: 'tasks_count', header: 'Tasks', sortable: false },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const templateFilters: FilterConfig[] = [
  { key: 'search', label: 'Search templates...', type: 'search', debounceMs: 300 },
];

const templateFields: FieldConfig[] = [
  { key: 'name', label: 'Template Name', type: 'text', required: true, placeholder: 'e.g. New Hire Checklist' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the onboarding template' },
  { key: 'department', label: 'Department (optional)', type: 'select', optionsEndpoint: '/api/v1/departments/', optionsLabelKey: 'name' },
];

// ─── Tasks CRUD ──────────────────────────────────────────────────────────────

const TASK_ENDPOINT = '/api/v1/onboarding/tasks/';
const taskCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'onboarding-tasks',
  endpoints: {
    list: TASK_ENDPOINT,
    create: TASK_ENDPOINT,
    detail: (id) => `${TASK_ENDPOINT}${id}/`,
    update: (id) => `${TASK_ENDPOINT}${id}/`,
    delete: (id) => `${TASK_ENDPOINT}${id}/`,
  },
});

const taskColumns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'title', header: 'Task Title', sortable: true },
  { key: 'template_name', header: 'Template', sortable: false },
  { key: 'employee_name', header: 'Employee', sortable: false, render: (v: unknown) => (v ? String(v) : '—') },
  { key: 'status', header: 'Status', sortable: true },
  { key: 'is_required', header: 'Required', sortable: false, render: (v: unknown) => (v ? 'Yes' : 'No') },
  { key: 'due_days', header: 'Due (days)', sortable: true },
];

const taskFilters: FilterConfig[] = [
  { key: 'search', label: 'Search tasks...', type: 'search', debounceMs: 300 },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ]},
];

const taskFields: FieldConfig[] = [
  { key: 'template', label: 'Template', type: 'select', required: true, optionsEndpoint: '/api/v1/onboarding/templates/', optionsLabelKey: 'name' },
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'first_name' },
  { key: 'title', label: 'Task Title', type: 'text', required: true, placeholder: 'e.g. Complete safety training' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Task details' },
  { key: 'due_days', label: 'Due in (days)', type: 'number', placeholder: '7' },
  { key: 'is_required', label: 'Required', type: 'checkbox' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

type Tab = 'templates' | 'tasks';

export default function OnboardingTemplates() {
  const [activeTab, setActiveTab] = useState<Tab>('templates');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Onboarding Management</h1>
        <p className="mt-1 text-sm text-gray-600">Create templates and assign onboarding tasks to employees</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-0">
          <button
            onClick={() => setActiveTab('templates')}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === 'templates'
                ? 'border-primary-500 text-primary-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === 'tasks'
                ? 'border-primary-500 text-primary-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Tasks
          </button>
        </nav>
      </div>

      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'tasks' && <TasksTab />}
    </div>
  );
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

function TemplatesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters: templateFilters });
  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filterValues, page, pageSize]);
  const queryResult = templateCrud.useList(params);
  const createMutation = templateCrud.useCreate();
  const deleteMutation = templateCrud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...templateColumns,
    {
      key: 'id', header: 'Actions', sortable: false,
      render: (_v: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    const payload: Record<string, unknown> = { ...data, is_active: true };
    if (!payload.department) delete payload.department;
    createMutation.mutate(payload, {
      onSuccess: () => setShowCreate(false),
    });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      const payload = { ...data };
      if (!payload.department) payload.department = null;
      await api.patch(`${TEMPLATE_ENDPOINT}${editRecord.id}/`, payload);
      setEditRecord(null);
      queryResult.refetch();
    } finally { setEditLoading(false); }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <CreateButton label="Create Template" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={templateFilters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Onboarding Template" fields={templateFields} onSubmit={handleCreate} isLoading={createMutation.isPending} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Template" fields={templateFields} initialValues={editRecord ?? undefined} onSubmit={handleEdit} isLoading={editLoading} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) }); }} title="Delete Template" message="Delete this onboarding template? All associated tasks will also be deleted." confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </>
  );
}

// ─── Tasks Tab ───────────────────────────────────────────────────────────────

function TasksTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters: taskFilters });
  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filterValues, page, pageSize]);
  const queryResult = taskCrud.useList(params);
  const createMutation = taskCrud.useCreate();
  const deleteMutation = taskCrud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...taskColumns,
    {
      key: 'id', header: 'Actions', sortable: false,
      render: (_v: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    const payload = {
      ...data,
      is_required: data.is_required !== undefined ? !!data.is_required : true,
      due_days: data.due_days ? Number(data.due_days) : 7,
    };
    createMutation.mutate(payload, { onSuccess: () => setShowCreate(false) });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`${TASK_ENDPOINT}${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally { setEditLoading(false); }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <CreateButton label="Create Task" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={taskFilters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Onboarding Task" fields={taskFields} onSubmit={handleCreate} isLoading={createMutation.isPending} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Task" fields={taskFields} initialValues={editRecord ?? undefined} onSubmit={handleEdit} isLoading={editLoading} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) }); }} title="Delete Task" message="Delete this onboarding task?" confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </>
  );
}
