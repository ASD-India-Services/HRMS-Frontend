/**
 * TanStack Query hooks for Shift Management.
 * Handles fetching shift types and shift assignments for schedule/roster views.
 * Requirements: 27.5
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ShiftType,
  ShiftAssignmentFilters,
  PaginatedShiftAssignmentResponse,
} from '@/types/shift';

// --- Fetch Functions ---

async function fetchShiftTypes(): Promise<ShiftType[]> {
  const response = await api.get<ShiftType[]>('/api/v1/shifts/types/');
  return response.data;
}

async function fetchShiftAssignments(
  filters: ShiftAssignmentFilters,
): Promise<PaginatedShiftAssignmentResponse> {
  const params: Record<string, string | number> = {};

  if (filters.mine) params.mine = filters.mine;
  if (filters.employee) params.employee = filters.employee;
  if (filters.date) params.date = filters.date;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.department) params.department = filters.department;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedShiftAssignmentResponse>(
    '/api/v1/shifts/assignments/',
    { params },
  );
  return response.data;
}

// --- Query Hooks ---

/**
 * Fetch all available shift type definitions.
 */
export function useShiftTypes() {
  return useQuery({
    queryKey: ['shift-types'],
    queryFn: fetchShiftTypes,
  });
}

/**
 * Fetch shift assignments with optional filters (employee, date, department).
 * Used for both personal schedule and team roster views.
 */
export function useShiftAssignments(filters: ShiftAssignmentFilters) {
  return useQuery({
    queryKey: ['shift-assignments', filters],
    queryFn: () => fetchShiftAssignments(filters),
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch shift assignments for a specific week range.
 * Queries assignments that overlap with the given week start/end dates.
 */
export function useWeeklyShiftSchedule(employeeId: string, weekStartDate: string) {
  return useQuery({
    queryKey: ['shift-schedule', 'weekly', employeeId, weekStartDate],
    queryFn: () =>
      fetchShiftAssignments({
        employee: employeeId,
        date: weekStartDate,
        page_size: 50,
      }),
    enabled: !!employeeId && !!weekStartDate,
  });
}
