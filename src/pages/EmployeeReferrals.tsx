import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';

const ENDPOINT = '/api/v1/recruitment/referrals/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'employee-referrals',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  {
    key: 'referring_employee_name',
    header: 'Referring Employee',
    sortable: true,
    render: (_val, row) =>
      (row.referring_employee_name as string) ||
      (row.referring_employee as string) ||
      '—',
  },
  { key: 'candidate_name', header: 'Candidate', sortable: true },
  {
    key: 'job_opening_title',
    header: 'Job Opening',
    sortable: true,
    render: (_val, row) =>
      (row.job_opening_title as string) ||
      (row.job_opening as string) ||
      '—',
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (val) => {
      const status = String(val || '').toLowerCase();
      const colors: Record<string, string> = {
        pending: 'bg-warning-lighter text-warning-dark',
        in_progress: 'bg-primary-lighter text-primary-dark',
        accepted: 'bg-success-lighter text-success-dark',
        rejected: 'bg-error-lighter text-error-dark',
      };
      const badgeClass = colors[status] || 'bg-surface-neutral text-ink-primary';
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${badgeClass}`}>
          {String(val || '').replace('_', ' ')}
        </span>
      );
    },
  },
  {
    key: 'reward_amount',
    header: 'Reward Amount',
    sortable: true,
    render: (val) => (val != null && val !== '' ? `$${val}` : '—'),
  },
  {
    key: 'pipeline_link',
    header: 'Hiring Pipeline',
    render: (_val, row) => (
      <ButtonLink
        variant="text"
        size="small"
        href="/recruitment/candidates"
        title="View in Recruitment Candidates Pipeline"
        endIcon={<Iconify icon="arrow-right" />}
      >
        View in Pipeline
      </ButtonLink>
    ),
  },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  {
    key: 'referring_employee',
    label: 'Referrer',
    type: 'select',
    required: true,
    optionsEndpoint: '/api/v1/employees/',
    optionsLabelKey: 'full_name',
  },
  { key: 'candidate_name', label: 'Candidate Name', type: 'text', required: true, placeholder: 'Candidate full name' },
  { key: 'candidate_email', label: 'Candidate Email', type: 'text', required: true, placeholder: 'Candidate email address' },
  {
    key: 'job_opening',
    label: 'Job Opening',
    type: 'select',
    required: true,
    optionsEndpoint: '/api/v1/recruitment/job-openings/?status=open',
    optionsLabelKey: 'title',
  },
  { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes' },
];

export default function EmployeeReferrals() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
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
          <EditButton permission="referrals.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="referrals.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreate(false),
    });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/recruitment/referrals/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <PageContainer>
      <PageHeader title="Employee Referrals" subtitle="Track employee referral submissions" actions={<CreateButton permission="referrals.create" label="Create Referral" onClick={() => setShowCreate(true)} />} />
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Employee Referral"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
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
