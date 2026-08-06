/**
 * TypeScript types for Shift Management module.
 * Requirements: 27.5
 */

export interface ShiftType {
  id: string;
  name: string;
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  is_night_shift: boolean;
  grace_period_minutes: number;
}

export interface ShiftAssignment {
  id: string;
  employee: string;
  employee_name: string;
  shift_type: ShiftType;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

export interface ShiftAssignmentFilters {
  employee?: string;
  mine?: string;
  date?: string;
  from_date?: string;
  to_date?: string;
  department?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedShiftAssignmentResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ShiftAssignment[];
}
