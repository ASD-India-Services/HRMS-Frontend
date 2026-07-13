import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import { GEOFENCE_LOCATIONS } from '@/lib/endpoints';
import { getCurrentPosition, isGeolocationSupported } from '@/utils/geolocation';

const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'geofence-locations',
  endpoints: {
    list: GEOFENCE_LOCATIONS.LIST,
    create: GEOFENCE_LOCATIONS.CREATE,
    detail: GEOFENCE_LOCATIONS.DETAIL,
    update: GEOFENCE_LOCATIONS.UPDATE,
    delete: GEOFENCE_LOCATIONS.DELETE,
  },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Location Name', sortable: true },
  { key: 'latitude', header: 'Latitude', sortable: true },
  { key: 'longitude', header: 'Longitude', sortable: true },
  { key: 'radius_meters', header: 'Radius (m)', sortable: true },
  { key: 'geofence_mode', header: 'Mode', sortable: true },
  { key: 'is_active', header: 'Active', sortable: true },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Location Name', type: 'text', required: true, placeholder: 'e.g., Head Office' },
  { key: 'latitude', label: 'Latitude', type: 'number', required: true, placeholder: 'e.g., 28.6139391' },
  { key: 'longitude', label: 'Longitude', type: 'number', required: true, placeholder: 'e.g., 77.2090212' },
  { key: 'radius_meters', label: 'Radius (meters)', type: 'number', required: true, placeholder: '200' },
  {
    key: 'geofence_mode',
    label: 'Enforcement Mode',
    type: 'select',
    required: true,
    options: [
      { label: 'Warn — Allow but flag', value: 'warn' },
      { label: 'Strict — Block check-in', value: 'strict' },
    ],
  },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
  { key: 'geo_tracking_enabled', label: 'Geo Tracking Enabled', type: 'checkbox' },
];

export default function GeoFenceLocations() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({
    radius_meters: 200,
    geofence_mode: 'warn',
    is_active: true,
    geo_tracking_enabled: true,
  });
  const [locationLoading, setLocationLoading] = useState(false);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  // Columns with Actions
  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton
            label="Edit"
            size="sm"
            onClick={() => {
              setEditRecord(row);
              setInitialValues(row);
            }}
          />
          <DeleteButton
            label="Delete"
            size="sm"
            onClick={() => setDeleteId(row.id as string)}
            permission="attendance.delete"
          />
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
      await api.patch(`/api/v1/attendance/geofence-locations/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } catch {
      // Error stays in the modal
    } finally {
      setEditLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!isGeolocationSupported()) {
      return;
    }
    try {
      setLocationLoading(true);
      const coords = await getCurrentPosition();
      setInitialValues((prev) => ({
        ...prev,
        latitude: Number(coords.latitude.toFixed(7)),
        longitude: Number(coords.longitude.toFixed(7)),
      }));
    } catch {
      // Silently fail — user can enter manually
    } finally {
      setLocationLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setInitialValues({
      radius_meters: 200,
      geofence_mode: 'warn',
      is_active: true,
      geo_tracking_enabled: true,
    });
    setShowCreate(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geo-Fence Locations</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure allowed check-in locations with radius-based validation
          </p>
        </div>
        <CreateButton label="Add Location" onClick={handleOpenCreate} />
      </div>

      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={queryResult.data.count}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Create Modal */}
      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Geo-Fence Location"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        initialValues={initialValues}
      />

      {/* Edit Modal */}
      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Geo-Fence Location"
        fields={createFields}
        onSubmit={handleEdit}
        isLoading={editLoading}
        initialValues={initialValues}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }}
        title="Delete Location"
        message="Are you sure you want to delete this geo-fence location? Employees will no longer be validated against this area."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      {/* Use My Current Location floating button (visible when modal is open) */}
      {(showCreate || editRecord) && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locationLoading}
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {locationLoading ? 'Locating...' : 'Use My Current Location'}
          </button>
        </div>
      )}
    </div>
  );
}
