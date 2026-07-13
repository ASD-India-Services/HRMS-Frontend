/**
 * Vehicles CRUD Module Configuration
 *
 * Declarative config for the Fleet Vehicles module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { FLEET } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface Vehicle {
  id: string;
  name: string;
  model: string;
  license_plate: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const vehicleColumns: ColumnDef<Vehicle>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'model', header: 'Model', sortable: true },
  { key: 'license_plate', header: 'License Plate', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

export const vehicleFilters: FilterConfig[] = [
  { key: 'search', label: 'Search vehicles...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'maintenance', label: 'In Maintenance' },
    ],
  },
];

export const vehicleFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Vehicle Name',
    type: 'text',
    required: true,
    validation: [{ type: 'required', message: 'Vehicle name is required' }],
  },
  { name: 'model', label: 'Model', type: 'text', required: true },
  { name: 'license_plate', label: 'License Plate', type: 'text', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'maintenance', label: 'In Maintenance' },
    ],
  },
];

export const vehicleEndpoints: CrudEndpoints = {
  list: FLEET.VEHICLES,
  create: FLEET.VEHICLES,
  detail: FLEET.VEHICLE_DETAIL,
  update: FLEET.VEHICLE_DETAIL,
  delete: FLEET.VEHICLE_DETAIL,
};

export const vehicleAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const vehiclesCrudConfig = {
  id: 'vehicles',
  title: 'Vehicles',
  endpoints: vehicleEndpoints,
  columns: vehicleColumns,
  filters: vehicleFilters,
  formFields: vehicleFormFields,
  access: vehicleAccess,
  queryKey: 'vehicles',
};
