/**
 * TypeScript interfaces for Employee Directory
 */

export interface Department {
  id: string;
  name: string;
}

export interface Designation {
  id: string;
  title: string;
}

export type EmploymentStatus = 'active' | 'on_notice' | 'terminated' | 'retired';
export type EmploymentType = 'permanent' | 'contract' | 'intern' | 'probation' | 'freelance';

export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  phone?: string;
  photo?: string | null;
  department: Department | null;
  designation: Designation | null;
  status: EmploymentStatus;
  employment_type: EmploymentType;
  date_of_joining: string;
  reporting_manager?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

/** Full employee detail returned by GET /api/v1/employees/{id}/ */
export interface EmployeeDetail extends Employee {
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  marital_status?: string;
  blood_group?: string;
  nationality?: string;
  personal_email?: string;
  address?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  pan_number?: string;
  aadhaar_number?: string;
  uan_number?: string;
  date_of_leaving?: string;
  notice_period_days?: number;
  probation_end_date?: string;
  confirmation_date?: string;
  custom_fields?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Payload for PATCH /api/v1/employees/{id}/ — self-service profile updates */
export interface EmployeeProfileUpdate {
  phone?: string;
  personal_email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface EmployeeFilters {
  search?: string;
  status?: EmploymentStatus | '';
  department?: string;
  designation?: string;
  employment_type?: EmploymentType | '';
  page?: number;
  page_size?: number;
}
