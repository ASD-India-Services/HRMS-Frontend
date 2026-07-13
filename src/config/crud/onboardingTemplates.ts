/**
 * Onboarding Templates CRUD Module Configuration
 *
 * Declarative config for the Onboarding Templates module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { ONBOARDING } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface OnboardingTemplate {
  id: string;
  name: string;
  department: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const onboardingTemplateColumns: ColumnDef<OnboardingTemplate>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'department', header: 'Department', sortable: true },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
];

export const onboardingTemplateFilters: FilterConfig[] = [
  { key: 'search', label: 'Search templates...', type: 'search', debounceMs: 300 },
];

export const onboardingTemplateFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Template Name',
    type: 'text',
    required: true,
    validation: [{ type: 'required', message: 'Template name is required' }],
  },
  {
    name: 'department',
    label: 'Department',
    type: 'select',
    optionsQuery: { queryKey: ['departments', 'options'], endpoint: '/api/v1/departments/' },
  },
  { name: 'is_active', label: 'Active', type: 'toggle' },
];

export const onboardingTemplateEndpoints: CrudEndpoints = {
  list: ONBOARDING.TEMPLATES,
  create: ONBOARDING.TEMPLATES,
  detail: ONBOARDING.TEMPLATE_DETAIL,
  update: ONBOARDING.TEMPLATE_DETAIL,
  delete: ONBOARDING.TEMPLATE_DETAIL,
};

export const onboardingTemplateAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const onboardingTemplatesCrudConfig = {
  id: 'onboarding-templates',
  title: 'Onboarding Templates',
  endpoints: onboardingTemplateEndpoints,
  columns: onboardingTemplateColumns,
  filters: onboardingTemplateFilters,
  formFields: onboardingTemplateFormFields,
  access: onboardingTemplateAccess,
  queryKey: 'onboarding-templates',
};
