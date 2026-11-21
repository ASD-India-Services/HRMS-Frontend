/**
 * TanStack Query hooks for fetching and updating a single employee.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { EmployeeDetail, EmployeeProfileUpdate } from '@/types/employee';

async function fetchEmployee(id: string): Promise<EmployeeDetail> {
  const response = await api.get<EmployeeDetail>(`/api/v1/employees/${id}/`);
  return response.data;
}

async function updateEmployee(
  id: string,
  data: EmployeeProfileUpdate
): Promise<EmployeeDetail> {
  const url = id && id !== 'me' ? `/api/v1/employees/${id}/` : `/api/v1/employees/me/`;
  const response = await api.patch<EmployeeDetail>(url, data);
  return response.data;
}

/**
 * Fetch a single employee's full profile by ID.
 */
export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id!),
    enabled: !!id,
  });
}

/**
 * Mutation hook for updating an employee's profile (contact info, etc.).
 * Invalidates the employee query and the employees list on success.
 */
export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeProfileUpdate) => updateEmployee(id, data),
    onSuccess: (updatedEmployee) => {
      if (id) {
        queryClient.setQueryData(['employee', id], updatedEmployee);
      }
      queryClient.setQueryData(['employee', 'me'], updatedEmployee);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
    },
  });
}
