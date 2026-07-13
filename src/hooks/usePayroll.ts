/**
 * TanStack Query hooks for Payroll module.
 * Handles fetching salary slips (list and detail) for the payslip viewer.
 * Requirements: 27.4
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SalarySlipDetail,
  PayslipFilters,
  PaginatedSalarySlipResponse,
} from '@/types/payroll';

// --- Fetch Functions ---

async function fetchSalarySlips(filters: PayslipFilters): Promise<PaginatedSalarySlipResponse> {
  const response = await api.get<PaginatedSalarySlipResponse>('/api/v1/salary-slips/', {
    params: { month: filters.month, year: filters.year },
  });
  return response.data;
}

async function fetchSalarySlipDetail(id: string): Promise<SalarySlipDetail> {
  const response = await api.get<SalarySlipDetail>(`/api/v1/salary-slips/${id}/`);
  return response.data;
}

async function downloadPayslipPdf(id: string): Promise<Blob> {
  const response = await api.get(`/api/v1/salary-slips/${id}/pdf/`, {
    responseType: 'blob',
  });
  return response.data;
}

// --- Query Hooks ---

export function useSalarySlips(filters: PayslipFilters) {
  return useQuery({
    queryKey: ['salary-slips', filters],
    queryFn: () => fetchSalarySlips(filters),
  });
}

export function useSalarySlipDetail(id: string | null) {
  return useQuery({
    queryKey: ['salary-slip-detail', id],
    queryFn: () => fetchSalarySlipDetail(id!),
    enabled: !!id,
  });
}

// --- Utility Functions ---

/**
 * Trigger browser download for a payslip PDF.
 */
export async function downloadPayslip(id: string, filename: string): Promise<void> {
  const blob = await downloadPayslipPdf(id);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
