/**
 * TypeScript interfaces for Payroll module.
 * Requirements: 27.4
 */

export interface SalaryComponent {
  name: string;
  amount: number;
  is_taxable?: boolean;
}

export interface SalarySlipSummary {
  id: string;
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    department?: { id: number; name: string };
    designation?: { id: number; name: string };
  };
  month: number;
  year: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: SalarySlipStatus;
  payment_date: string | null;
  created_at: string;
}

export interface SalarySlipDetail extends SalarySlipSummary {
  earnings_breakdown: SalaryComponent[];
  deductions_breakdown: SalaryComponent[];
  salary_structure: {
    id: string;
    name: string;
  };
  days_worked?: number;
  total_working_days?: number;
}

export type SalarySlipStatus = 'draft' | 'submitted' | 'paid' | 'cancelled';

export interface PayslipFilters {
  month: number;
  year: number;
}

export interface PaginatedSalarySlipResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SalarySlipSummary[];
}
