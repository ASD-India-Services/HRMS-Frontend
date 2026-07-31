/**
 * EmployeeForm — Create/Edit Employee Page
 *
 * Uses FormBuilder with the employeeCrudConfig's formFields and formSteps
 * to render a multi-step employee creation/editing form.
 *
 * - In create mode: POSTs to the employees API and navigates to the list
 * - In edit mode: fetches existing employee data as initialValues,
 *   PATCHes the record, and navigates back to the detail view
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FormBuilder } from '@/components/FormBuilder';
import { createCrudHooks } from '@/hooks/useCrud';
import { employeeCrudConfig } from '@/config/crud/employees';
import type { Employee } from '@/types/employee';

interface EmployeeFormProps {
  /** When provided, the form operates in edit mode fetching the employee record */
  employeeId?: string;
}

const employeeCrud = createCrudHooks<Employee>({
  queryKey: employeeCrudConfig.queryKey,
  endpoints: employeeCrudConfig.endpoints,
});

export function EmployeeForm({ employeeId }: EmployeeFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(employeeId);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch existing employee data when in edit mode
  const { data: existingEmployee, isLoading: isLoadingEmployee } = employeeCrud.useDetail(
    employeeId ?? ''
  );

  // Mutations
  const createMutation = employeeCrud.useCreate();
  const updateMutation = employeeCrud.useUpdate(employeeId ?? '');

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      // Convert empty date fields to null so the backend doesn't try to parse ""
      const cleanedData = { ...data };
      if (cleanedData.date_of_birth === '') {
        cleanedData.date_of_birth = null;
      }

      if (isEditMode && employeeId) {
        await updateMutation.mutateAsync(cleanedData);
        // Invalidate the singular employee detail query used by EmployeeDetail page
        queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
        setSuccessMessage('Employee updated successfully');
        // Navigate back to the employee detail after a short delay for toast visibility
        setTimeout(() => navigate(`/employees/${employeeId}`), 800);
      } else {
        await createMutation.mutateAsync(cleanedData);
        setSuccessMessage('Employee created successfully');
        // Navigate back to the employee list
        setTimeout(() => navigate('/employees'), 800);
      }
    },
    [isEditMode, employeeId, createMutation, updateMutation, navigate, queryClient]
  );

  const handleCancel = useCallback(() => {
    if (isEditMode && employeeId) {
      navigate(`/employees/${employeeId}`);
    } else {
      navigate('/employees');
    }
  }, [isEditMode, employeeId, navigate]);

  // Show loading state while fetching employee data in edit mode
  if (isEditMode && isLoadingEmployee) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-200" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Build initial values from existing employee for edit mode
  // Flatten nested objects (department → department_id, designation → designation_id, etc.)
  const initialValues: Record<string, unknown> | undefined = isEditMode && existingEmployee
    ? (() => {
        const emp = existingEmployee as unknown as Record<string, unknown>;
        const flat: Record<string, unknown> = { ...emp };
        // Flatten nested FK objects to their IDs for form fields
        if (emp.department && typeof emp.department === 'object') {
          flat.department_id = (emp.department as Record<string, unknown>).id;
        }
        if (emp.designation && typeof emp.designation === 'object') {
          flat.designation_id = (emp.designation as Record<string, unknown>).id;
        }
        if (emp.branch && typeof emp.branch === 'object') {
          flat.branch_id = (emp.branch as Record<string, unknown>).id;
        }
        if (emp.reporting_manager && typeof emp.reporting_manager === 'object') {
          flat.reporting_manager_id = (emp.reporting_manager as Record<string, unknown>).id;
        }
        return flat;
      })()
    : undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Employee' : 'Add Employee'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {isEditMode
            ? 'Update employee information across all sections.'
            : 'Fill in the details below to add a new employee to the organization.'}
        </p>
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-3" role="status">
          <div className="flex items-center">
            <svg
              className="h-4 w-4 text-green-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-2 text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <FormBuilder
          fields={employeeCrudConfig.formFields}
          steps={employeeCrudConfig.formSteps}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
