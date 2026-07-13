/**
 * TanStack Query hook for fetching employees with search, filters, and pagination.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Employee, EmployeeFilters, PaginatedResponse } from '@/types/employee';

async function fetchEmployees(filters: EmployeeFilters): Promise<PaginatedResponse<Employee>> {
  const params: Record<string, string | number> = {};

  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.department) params.department = filters.department;
  if (filters.designation) params.designation = filters.designation;
  if (filters.employment_type) params.employment_type = filters.employment_type;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedResponse<Employee>>('/api/v1/employees/', { params });
  return response.data;
}

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => fetchEmployees(filters),
    placeholderData: keepPreviousData,
  });
}
