/**
 * TrainingEvents Page — HR/Admin interface for managing training events
 * using DataTable, FilterBar, Pagination, WorkflowEngine, and Can components.
 *
 * - Inline workflow actions (Start/Complete/Cancel) per row via WorkflowEngine
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import {
  trainingEventsCrudConfig,
  type TrainingEvent,
} from '@/config/crud/trainingEvents';
import { trainingWorkflow } from '@/config/workflows/training';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { formatDate } from '@/utils/formatters';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { CreateButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Event Name', type: 'text', required: true },
  {
    key: 'event_type', label: 'Event Type', type: 'select', required: true, options: [
      { value: 'workshop', label: 'Workshop' },
      { value: 'seminar', label: 'Seminar' },
      { value: 'webinar', label: 'Webinar' },
      { value: 'certification', label: 'Certification' },
      { value: 'on_the_job', label: 'On the Job' },
      { value: 'self_paced', label: 'Self-Paced' },
      { value: 'conference', label: 'Conference' },
    ]
  },
  { key: 'trainer', label: 'Trainer Name', type: 'text', placeholder: 'Trainer name' },
  { key: 'start_date', label: 'Start Date', type: 'date', required: true },
  { key: 'end_date', label: 'End Date', type: 'date', required: true },
  { key: 'location', label: 'Location', type: 'text', placeholder: 'Location or online link' },
  { key: 'max_participants', label: 'Max Participants', type: 'number', placeholder: '30', required: true },
  {
    key: 'status', label: 'Status', type: 'select', required: true, options: [
      { value: 'draft', label: 'Draft' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ]
  },
];

const trainingCrud = createCrudHooks<TrainingEvent>({
  queryKey: trainingEventsCrudConfig.queryKey,
  endpoints: trainingEventsCrudConfig.endpoints,
});


function useTrainingColumns(): ColumnDef<TrainingEvent>[] {
  return useMemo(
    () => [
      { key: 'name', header: 'Event Name', sortable: true },
      {
        key: 'event_type',
        header: 'Type',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-secondary-lighter px-2 py-0.5 text-xs font-medium capitalize text-secondary-dark">
            {String(value || '—')}
          </span>
        ),
      },
      {
        key: 'start_date',
        header: 'Start Date',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-ink-primary">{formatDate(value as string)}</span>
        ),
      },
      { key: 'trainer', header: 'Trainer', sortable: true },
      {
        key: 'max_participants',
        header: 'Max Participants',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-surface-neutral px-2 py-0.5 text-xs font-semibold text-ink-primary">
            {String(value ?? '—')}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status & Actions',
        sortable: false,
        render: (_value: unknown, row: TrainingEvent) => (
          <WorkflowEngine
            config={trainingWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[[trainingEventsCrudConfig.queryKey, 'list']]}
          />
        ),
      },
    ],
    []
  );
}

export function TrainingEvents({ onSelectEvent }: { onSelectEvent?: (id: string) => void }) {
  return (
    <Can
      permissions={['training.view']}
      fallback={<AccessDenied />}
    >
      <TrainingEventsContent onSelectEvent={onSelectEvent} />
    </Can>
  );
}

function TrainingEventsContent({ onSelectEvent }: { onSelectEvent?: (id: string) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/training/events/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-events'] });
      setShowCreate(false);
    },
  });

  const columns = useTrainingColumns();
  const filters = trainingEventsCrudConfig.filters;

  const {
    filterValues,
    setFilter,
    clearFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFilterSync({ filters });

  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) params.search = filterValues.search;
    if (filterValues.status) params.status = filterValues.status;
    return params;
  }, [filterValues, page, pageSize]);

  const queryResult = trainingCrud.useList(apiParams);

  return (
    <PageContainer>
      <PageHeader
        title="Training Events"
        subtitle="Manage training events, track statuses, and control lifecycle."
        actions={
          <CreateButton
              label="Create Training Event"
              permission="training.create"
              onClick={() => setShowCreate(true)}
            />
        }
      />

      <FilterBar
        filters={filters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable<TrainingEvent>
        queryResult={queryResult}
        columns={columns}
        onRowClick={onSelectEvent ? (row) => onSelectEvent(row.id) : undefined}
      />

      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={queryResult.data.count}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Training Event"
        fields={createFields}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </PageContainer>
  );
}
