import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AccountRestrictions {
  restrict_login_account?: boolean;
  restrict_profile_edit?: boolean;
  restrict_bank_edit?: boolean;
  restrict_outside_checkin?: boolean;
  allow_employee_password_reset?: boolean;
}

export interface NamingSeriesConfig {
  employee?: string;
  applicant?: string;
  job_opening?: string;
  expense?: string;
  leave?: string;
  training?: string;
  grievance?: string;
  [key: string]: string | undefined;
}

export interface HistoryTagItem {
  id: string;
  title: string;
  highlight: boolean;
  created_at?: string;
  [key: string]: any;
}

export interface AttendanceBreakPointConfig {
  auto_validate_till?: string;
  min_hour_to_approve_ot?: string;
  ot_cut_off_per_day?: string;
  auto_approve_ot?: boolean;
  [key: string]: any;
}

export interface DefaultGraceTimeConfig {
  allowed_time?: string;
  is_active?: boolean;
  applicable_clock_in?: boolean;
  applicable_clock_out?: boolean;
  [key: string]: any;
}

export interface GraceTimeRecordItem {
  id: string;
  allowed_time: string;
  is_active: boolean;
  applicable_clock_in: boolean;
  applicable_clock_out: boolean;
  assigned_shifts?: string;
  [key: string]: any;
}

export interface CompensatoryLeaveSettingsConfig {
  request_enabled?: boolean;
  leave_type_name?: string;
  payment?: string;
  total_days?: number;
  [key: string]: any;
}

export interface AutoPayslipRuleItem {
  id: string;
  generate_day: string;
  company: string;
  auto_generate: boolean;
  [key: string]: any;
}

export interface BonusPointSettingItem {
  id: string;
  model: string;
  applicable_for: string;
  bonus_for: string;
  field_1: string;
  conditions: string;
  field_2: string;
  points: number;
  is_active: boolean;
  [key: string]: any;
}

export interface GDriveBackupConfig {
  service_account_filename?: string;
  service_account_file_data?: string;
  gdrive_folder_id?: string;
  backup_media?: boolean;
  backup_db?: boolean;
  interval_enabled?: boolean;
  interval_seconds?: number;
  fixed_enabled?: boolean;
  fixed_time?: string;
  last_backup_at?: string;
  last_status?: string;
}

export interface HRSettings {
  id: string;
  company_name: string;
  company_website: string;
  fiscal_year_start: string | null;
  notice_period_days: number;
  employee_naming_series: string;
  default_leave_approver: string | null;
  retirement_age: number;
  probation_period_days: number;
  location_check_interval_minutes: number;
  leave_settings: Record<string, any>;
  attendance_settings: Record<string, any>;
  payroll_settings: Record<string, any>;
  announcement_expire_days: number;
  default_pagination_size: number;
  account_restrictions: AccountRestrictions;
  resignation_request?: boolean;
  date_format: string;
  time_format: string;
  timezone: string;
  naming_series_config: NamingSeriesConfig;
  at_work_tracker?: boolean;
  badge_prefix?: string;
  badge_company?: string;
  encashment_bonus_unit?: number;
  encashment_leave_unit?: string;
  history_tracking_fields?: string[];
  history_tags?: HistoryTagItem[];
  work_information_tracking?: boolean;
  currency_symbol?: string;
  currency_position?: 'Prefix' | 'Postfix' | string;
  currency_company?: string;
  accessibility_restrictions?: Record<string, {
    label?: string;
    restrict_all?: boolean;
    category?: string;
    allowed_roles?: string[];
    description?: string;
    [key: string]: any;
  }>;
  gdrive_backup_config?: GDriveBackupConfig;
  track_late_come_early_out?: boolean;
  attendance_break_point?: AttendanceBreakPointConfig;
  default_grace_time?: DefaultGraceTimeConfig;
  grace_time_records?: GraceTimeRecordItem[];
  restrict_past_leave?: boolean;
  compensatory_leave_settings?: CompensatoryLeaveSettingsConfig;
  auto_payslip_rules?: AutoPayslipRuleItem[];
  bonus_point_settings?: BonusPointSettingItem[];
  created_at: string;
  updated_at: string;
}

export const HR_SETTINGS_QUERY_KEY = ['hr-settings'];

export function useHRSettings() {
  return useQuery<HRSettings>({
    queryKey: HR_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<HRSettings>('/api/v1/hr-settings/');
      try {
        localStorage.setItem('hrms_cached_settings', JSON.stringify(res.data));
        if (res.data.default_pagination_size) localStorage.setItem('hrms_default_pagination_size', String(res.data.default_pagination_size));
        if (res.data.currency_symbol) localStorage.setItem('hrms_currency_symbol', res.data.currency_symbol);
        if (res.data.currency_position) localStorage.setItem('hrms_currency_position', res.data.currency_position);
        if (res.data.date_format) localStorage.setItem('hrms_date_format', res.data.date_format);
        if (res.data.time_format) localStorage.setItem('hrms_time_format', res.data.time_format);
        if (typeof res.data.restrict_past_leave === 'boolean') {
          localStorage.setItem('hrms_restrict_past_leave', JSON.stringify(res.data.restrict_past_leave));
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('hrms-format-changed', { detail: res.data }));
      } catch {
        // ignore storage errors
      }
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateHRSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<HRSettings>) => {
      const res = await api.patch<HRSettings>('/api/v1/hr-settings/', payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<HRSettings>(HR_SETTINGS_QUERY_KEY, (prev) => {
        if (!prev) return updated;
        return { ...prev, ...updated };
      });
      try {
        localStorage.setItem('hrms_cached_settings', JSON.stringify(updated));
        if (updated.default_pagination_size) {
          localStorage.setItem('hrms_default_pagination_size', String(updated.default_pagination_size));
          window.dispatchEvent(new CustomEvent('hrms-pagination-size-changed', { detail: updated.default_pagination_size }));
        }
        if (updated.currency_symbol) localStorage.setItem('hrms_currency_symbol', updated.currency_symbol);
        if (updated.currency_position) localStorage.setItem('hrms_currency_position', updated.currency_position);
        if (updated.date_format) localStorage.setItem('hrms_date_format', updated.date_format);
        if (updated.time_format) localStorage.setItem('hrms_time_format', updated.time_format);
        if (typeof updated.restrict_past_leave === 'boolean') {
          localStorage.setItem('hrms_restrict_past_leave', JSON.stringify(updated.restrict_past_leave));
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('hrms-format-changed', { detail: updated }));
      } catch {
        // ignore storage errors
      }
      queryClient.invalidateQueries({ queryKey: HR_SETTINGS_QUERY_KEY });
    },
  });
}

/**
 * Synchronous helper to retrieve default pagination size from localStorage or settings cache.
 * Falls back to 20 if not set.
 */
export function getDefaultPaginationSize(): number {
  try {
    const stored = localStorage.getItem('hrms_default_pagination_size');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const cached = localStorage.getItem('hrms_cached_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.default_pagination_size && typeof parsed.default_pagination_size === 'number' && parsed.default_pagination_size > 0) {
        return parsed.default_pagination_size;
      }
    }
  } catch {
    // ignore
  }
  return 20;
}

/**
 * Reactive hook to get the configured default pagination size.
 * Updates dynamically if the user updates General Settings in another tab or the same session.
 */
export function useDefaultPaginationSize(): number {
  const { data } = useHRSettings();
  const [size, setSize] = useState<number>(() => {
    return data?.default_pagination_size ?? getDefaultPaginationSize();
  });

  useEffect(() => {
    if (data?.default_pagination_size && data.default_pagination_size !== size) {
      setSize(data.default_pagination_size);
    }
  }, [data?.default_pagination_size, size]);

  useEffect(() => {
    const handleStorage = () => {
      setSize(getDefaultPaginationSize());
    };
    const handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail && typeof customEvent.detail === 'number') {
        setSize(customEvent.detail);
      } else {
        setSize(getDefaultPaginationSize());
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('hrms-pagination-size-changed', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('hrms-pagination-size-changed', handleCustom);
    };
  }, []);

  return size;
}

