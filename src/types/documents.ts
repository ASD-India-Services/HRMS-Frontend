/**
 * Document Request and Employee Document Types
 */

export type DocumentRequestType =
  | 'bonafide'
  | 'experience'
  | 'salary_certificate'
  | 'relieving'
  | 'address_proof'
  | 'visa_noc'
  | 'custom';

export type DocumentRequestStatus = 'pending' | 'in_progress' | 'approved' | 'rejected';

export type DocumentRequestUrgency = 'low' | 'normal' | 'high' | 'urgent';

export interface DocumentRequest {
  id: string;
  employee: string;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  document_type?: string | null;
  document_type_name?: string | null;
  request_type: DocumentRequestType;
  request_type_display?: string;
  title: string;
  format?: string;
  max_size?: number | null;
  description?: string;
  reason: string;
  urgency: DocumentRequestUrgency;
  urgency_display?: string;
  status: DocumentRequestStatus;
  status_display?: string;
  rejection_reason?: string;
  issued_document?: string | null;
  issued_at?: string | null;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequestSummary {
  total: number;
  pending: number;
  in_progress: number;
  approved: number;
  rejected: number;
  urgent: number;
}

export interface DocumentRequestFilters {
  status?: string;
  format?: string;
  urgency?: string;
  request_type?: string;
  employee?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export const DOCUMENT_TYPE_PRESETS: {
  key: DocumentRequestType;
  label: string;
  defaultTitle: string;
  description: string;
  badgeColor: string;
}[] = [
  {
    key: 'bonafide',
    label: 'Bonafide / Employment Certificate',
    defaultTitle: 'Bonafide Certificate of Employment',
    description: 'Confirms current employment, job title, and tenure in the organization.',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'salary_certificate',
    label: 'Salary / CTC Certificate',
    defaultTitle: 'Salary & Earnings Certificate',
    description: 'Statement of current compensation, designation, and monthly/annual breakdown.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: 'experience',
    label: 'Experience Certificate',
    defaultTitle: 'Certificate of Work Experience',
    description: 'Detailed work history, duration, and performance review for credentials verification.',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    key: 'visa_noc',
    label: 'Visa / Travel NOC Letter',
    defaultTitle: 'No Objection Certificate for Visa & Travel',
    description: 'Official letter addressed to embassy/consulate confirming approved leave and employment.',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    key: 'address_proof',
    label: 'Address Proof Letter',
    defaultTitle: 'Company Address & Employment Verification',
    description: 'Official company verification for bank account, rental, or legal documentation.',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'relieving',
    label: 'Relieving & Clearance Letter',
    defaultTitle: 'Relieving Letter & Service Certificate',
    description: 'Formal relieving documentation upon completion of notice period.',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    key: 'custom',
    label: 'Other / Custom Document',
    defaultTitle: 'Custom Document Request',
    description: 'Any other specific document, certificate, or letter required from HR.',
    badgeColor: 'bg-gray-50 text-gray-700 border-gray-200',
  },
];
