/**
 * TypeScript interfaces for Expense Management
 * Requirements: 27.6, 27.7
 */

export interface ExpenseType {
  id: string;
  name: string;
  description?: string;
}

export type ExpenseClaimStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface ExpenseClaimReceipt {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export interface ExpenseClaim {
  id: string;
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    department?: { id: number; name: string };
  };
  expense_type: ExpenseType;
  amount: number;
  description: string;
  expense_date: string;
  status: ExpenseClaimStatus;
  comments?: string;
  approved_by?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  receipts: ExpenseClaimReceipt[];
  created_at: string;
  updated_at: string;
}

export interface ExpenseClaimPayload {
  expense_type: string;
  amount: number;
  description: string;
  expense_date: string;
}

export interface ExpenseApprovalPayload {
  action: 'approve' | 'reject';
  comments?: string;
}

export interface ExpenseFilters {
  status?: ExpenseClaimStatus | '';
  page?: number;
  page_size?: number;
}

export interface PaginatedExpenseResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ExpenseClaim[];
}
