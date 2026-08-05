/**
 * Employee CRUD Module Configuration
 *
 * Declarative config for the Employees module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 2.1, 2.2, 2.4
 */

import { EMPLOYEES } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const employeeCrudConfig = {
  id: 'employees',
  title: 'Employees',
  queryKey: 'employees',
  endpoints: {
    list: EMPLOYEES.LIST,
    create: EMPLOYEES.CREATE,
    detail: EMPLOYEES.DETAIL,
    update: EMPLOYEES.UPDATE,
    delete: EMPLOYEES.DELETE,
  },
  columns: [
    { key: 'employee_id', header: 'Employee ID', sortable: true },
    { key: 'first_name', header: 'First Name', sortable: true },
    { key: 'last_name', header: 'Last Name', sortable: true },
    { key: 'department.name', header: 'Department', sortable: true },
    { key: 'designation.title', header: 'Designation', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'employment_type', header: 'Type', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    { key: 'search', label: 'Search employees...', type: 'search' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'on_notice', label: 'On Notice' },
        { value: 'terminated', label: 'Terminated' },
        { value: 'retired', label: 'Retired' },
      ],
    },
    {
      key: 'employment_type',
      label: 'Employment Type',
      type: 'select',
      options: [
        { value: 'permanent', label: 'Permanent' },
        { value: 'contract', label: 'Contract' },
        { value: 'intern', label: 'Intern' },
        { value: 'probation', label: 'Probation' },
        { value: 'freelance', label: 'Freelance' },
      ],
    },
  ] as FilterConfig[],
  formFields: [
    // Step 0: Personal Details
    { name: 'first_name', label: 'First Name', type: 'text', required: true, step: 0 },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true, step: 0 },
    { name: 'email', label: 'Email', type: 'email', required: true, step: 0 },
    { name: 'phone', label: 'Phone', type: 'phone', step: 0 },
    { name: 'date_of_birth', label: 'Date of Birth', type: 'date', step: 0 },
    {
      name: 'gender',
      label: 'Gender',
      type: 'select',
      step: 0,
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' },
      ],
    },
    // Step 1: Employment Details
    {
      name: 'department_id',
      label: 'Department',
      type: 'select',
      required: true,
      step: 1,
      optionsQuery: { queryKey: ['departments'], endpoint: '/api/v1/departments/' },
    },
    {
      name: 'designation_id',
      label: 'Designation',
      type: 'select',
      required: true,
      step: 1,
      optionsQuery: { queryKey: ['designations'], endpoint: '/api/v1/designations/' },
    },
    {
      name: 'branch_id',
      label: 'Branch',
      type: 'select',
      step: 1,
      optionsQuery: { queryKey: ['branches'], endpoint: '/api/v1/branches/' },
    },
    {
      name: 'grade_id',
      label: 'Grade',
      type: 'select',
      step: 1,
      optionsQuery: { queryKey: ['employee-grades'], endpoint: '/api/v1/employee-grades/' },
    },
    {
      name: 'employment_type',
      label: 'Employment Type',
      type: 'select',
      required: true,
      step: 1,
      options: [
        { value: 'permanent', label: 'Permanent' },
        { value: 'contract', label: 'Contract' },
        { value: 'intern', label: 'Intern' },
        { value: 'probation', label: 'Probation' },
        { value: 'freelance', label: 'Freelance' },
      ],
    },
    {
      name: 'reporting_manager_id',
      label: 'Report To',
      type: 'select',
      step: 1,
      optionsQuery: {
        queryKey: ['employees-managers'],
        endpoint: '/api/v1/employees/',
        labelKey: (item: Record<string, unknown>) =>
          `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim(),
      },
    },
    { name: 'date_of_joining', label: 'Date of Joining', type: 'date', required: true, step: 1 },
    // Step 2: Address
    { name: 'address', label: 'Address', type: 'textarea', step: 2 },
    { name: 'city', label: 'City', type: 'text', step: 2 },
    { name: 'state', label: 'State', type: 'text', step: 2 },
    { name: 'country', label: 'Country', type: 'text', step: 2 },
    { name: 'pincode', label: 'PIN Code', type: 'text', step: 2 },
    // Step 3: Emergency Contact
    { name: 'emergency_contact_name', label: 'Emergency Contact Name', type: 'text', step: 3 },
    { name: 'emergency_contact_phone', label: 'Emergency Contact Phone', type: 'phone', step: 3 },
    { name: 'emergency_contact_relation', label: 'Relation', type: 'text', step: 3 },
  ] as FieldSchema[],
  formSteps: ['Personal Details', 'Employment', 'Address', 'Emergency Contact'],
  access: {
    list: ['org_admin', 'hr_manager', 'department_head'],
    create: ['org_admin', 'hr_manager'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
