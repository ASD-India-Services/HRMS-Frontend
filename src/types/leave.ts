/**
 * TypeScript interfaces for Leave Management
 * Requirements: 27.2, 27.7
 */

export interface LeaveType {
  id: string;
  name: string;
  max_days_allowed?: number;
  is_carry_forward?: boolean;
  is_encashable?: boolean;
}

export interface LeaveBalance {
  id?: string;
  leave_type_id: string;
  leave_type_name: string;
  allocated_days: number;
  used_days: number;
  carry_forwarded: number;
  available_balance: number;
  remaining_days?: number;
  fiscal_year: string;
  /** @deprecated Use leave_type_name directly */
  leave_type?: LeaveType;
}

export type LeaveApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveApplication {
  id: string;
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    department?: { id: number; name: string };
  };
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  total_days: number;
  reason: string;
  status: LeaveApplicationStatus;
  comments?: string;
  approved_by?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface LeaveApplicationPayload {
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
}

export interface LeaveApprovalPayload {
  comments?: string;
}

export interface LeaveFilters {
  status?: LeaveApplicationStatus | '';
  page?: number;
  page_size?: number;
}

export interface PaginatedLeaveResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LeaveApplication[];
}
