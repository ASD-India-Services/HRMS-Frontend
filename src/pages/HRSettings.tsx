import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { EMAIL_CONFIG } from '@/lib/endpoints';

const ENDPOINT = '/api/v1/hr-settings/';

export interface SystemPermissionItem {
  id?: string;
  code: string;
  display_name: string;
  description: string;
  module: string;
  module_label: string;
  subsection: string;
  subsection_label: string;
  roles: string[];
}

export const DEFAULT_SYSTEM_PERMISSIONS: SystemPermissionItem[] = [
  // ── Leaves Module: Compensatory Leave Requests ──────────────────────────────
  {
    code: 'compensatory_leave.view',
    display_name: 'View Compensatory Leave Requests',
    description: 'View employee compensatory leave applications, status, and eligible attendances.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'compensatory_leave',
    subsection_label: 'Compensatory Leave Requests',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'compensatory_leave.create',
    display_name: 'Create Compensatory Leave Request',
    description: 'Submit new compensatory leave request for working on off-days, weekends, or holidays.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'compensatory_leave',
    subsection_label: 'Compensatory Leave Requests',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'compensatory_leave.approve',
    display_name: 'Approve Compensatory Leave Request',
    description: 'Review and approve compensatory leave requests; credit earned balance to employee leave ledger.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'compensatory_leave',
    subsection_label: 'Compensatory Leave Requests',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head'],
  },
  {
    code: 'compensatory_leave.reject',
    display_name: 'Reject Compensatory Leave Request',
    description: 'Reject compensatory leave request with approver comments and notify employee.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'compensatory_leave',
    subsection_label: 'Compensatory Leave Requests',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head'],
  },
  {
    code: 'compensatory_leave.delete',
    display_name: 'Delete Compensatory Leave Request',
    description: 'Permanently remove draft or unapproved compensatory leave requests.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'compensatory_leave',
    subsection_label: 'Compensatory Leave Requests',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },

  // ── Attendance Module: Work Records ──────────────────────────────────────────
  {
    code: 'work_records.view',
    display_name: 'View Work Records',
    description: 'Access the monthly work records matrix, view daily attendance markers (P, HP, L, A), and filters.',
    module: 'attendance',
    module_label: 'Attendance',
    subsection: 'work_records',
    subsection_label: 'Work Records',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'work_records.export',
    display_name: 'Export Work Records',
    description: 'Export monthly attendance work records matrix and calculations to CSV or Excel file.',
    module: 'attendance',
    module_label: 'Attendance',
    subsection: 'work_records',
    subsection_label: 'Work Records',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },

  // ── Attendance Module: Hour Account ─────────────────────────────────────────
  {
    code: 'hour_account.view',
    display_name: 'View Hour Accounts',
    description: 'View worked hours, monthly scheduled hours, pending hours, and overtime calculations.',
    module: 'attendance',
    module_label: 'Attendance',
    subsection: 'hour_account',
    subsection_label: 'Hour Account',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'hour_account.export',
    display_name: 'Export Hour Accounts',
    description: 'Export employee hour accounts and daily hours summary records to CSV/Excel.',
    module: 'attendance',
    module_label: 'Attendance',
    subsection: 'hour_account',
    subsection_label: 'Hour Account',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },

  // ── Attendance Module: Regular Attendance Register ──────────────────────────
  {
    code: 'attendance.view',
    display_name: 'View Attendance Records',
    description: 'View daily punches, logs, geo-fence check-ins, and shift timestamps.',
    module: 'attendance',
    module_label: 'Attendance',
    subsection: 'attendance_register',
    subsection_label: 'Attendance Register',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'attendance.create',
    display_name: 'Create Attendance Entry',
    description: 'Manually record punch-in and punch-out attendance entries for staff.',
    module: 'attendance',
    module_label: 'Attendance',
    subsection: 'attendance_register',
    subsection_label: 'Attendance Register',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },
  {
    code: 'attendance.edit',
    display_name: 'Edit Attendance Entry',
    description: 'Correct in-times, out-times, and working duration for attendance records.',
    module: 'attendance',
    module_label: 'Attendance',
    subsection: 'attendance_register',
    subsection_label: 'Attendance Register',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },
  {
    code: 'attendance.approve',
    display_name: 'Approve Attendance Requests',
    description: 'Approve or reject employee manual punch adjustment and regularization requests.',
    module: 'attendance',
    module_label: 'Attendance',
    subsection: 'attendance_requests',
    subsection_label: 'Attendance Requests',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head'],
  },

  // ── Leaves Module: Leave Applications ────────────────────────────────────────
  {
    code: 'leaves.view',
    display_name: 'View Leave Applications',
    description: 'View employee leave requests, available quotas, leave calendar, and approval status.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'leave_applications',
    subsection_label: 'Leave Applications',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'leaves.create',
    display_name: 'Apply for Leave',
    description: 'Submit leave applications for annual, sick, casual, maternity, or unpaid leave.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'leave_applications',
    subsection_label: 'Leave Applications',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'leaves.approve',
    display_name: 'Approve Leave Applications',
    description: 'Review and approve employee leave requests in approval workflows.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'leave_approvals',
    subsection_label: 'Leave Approvals',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head'],
  },
  {
    code: 'leaves.reject',
    display_name: 'Reject Leave Applications',
    description: 'Decline employee leave applications with reason/remarks.',
    module: 'leaves',
    module_label: 'Leaves',
    subsection: 'leave_approvals',
    subsection_label: 'Leave Approvals',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head'],
  },

  // ── Employees Module ────────────────────────────────────────────────────────
  {
    code: 'employees.view',
    display_name: 'View Employees',
    description: 'View employee directory, personal details, department, designation, and lifecycle.',
    module: 'employees',
    module_label: 'Employees',
    subsection: 'directory',
    subsection_label: 'Employee Directory',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'employees.create',
    display_name: 'Create Employee',
    description: 'Onboard and create new employee records and user accounts.',
    module: 'employees',
    module_label: 'Employees',
    subsection: 'directory',
    subsection_label: 'Employee Directory',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },
  {
    code: 'employees.edit',
    display_name: 'Edit Employee',
    description: 'Modify employee personal, financial, departmental, and shift details.',
    module: 'employees',
    module_label: 'Employees',
    subsection: 'directory',
    subsection_label: 'Employee Directory',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },

  // ── Payroll Module ──────────────────────────────────────────────────────────
  {
    code: 'payroll.view',
    display_name: 'View Payroll & Payslips',
    description: 'Access salary structures, monthly payroll runs, and employee payslips.',
    module: 'payroll',
    module_label: 'Payroll',
    subsection: 'payroll_runs',
    subsection_label: 'Payroll Runs',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Employee'],
  },
  {
    code: 'payroll.process',
    display_name: 'Process Payroll Runs',
    description: 'Calculate salary, apply deductions, generate payslips, and finalize payouts.',
    module: 'payroll',
    module_label: 'Payroll',
    subsection: 'payroll_runs',
    subsection_label: 'Payroll Runs',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },

  // ── Recruitment Module ──────────────────────────────────────────────────────
  {
    code: 'recruitment.view',
    display_name: 'View Recruitment & Candidates',
    description: 'View job openings, applicant pipelines, resume submissions, and interview scores.',
    module: 'recruitment',
    module_label: 'Recruitment',
    subsection: 'job_openings',
    subsection_label: 'Job Openings',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head'],
  },
  {
    code: 'recruitment.manage',
    display_name: 'Manage Recruitment Pipeline',
    description: 'Create job postings, schedule interviews, and issue job offers.',
    module: 'recruitment',
    module_label: 'Recruitment',
    subsection: 'job_openings',
    subsection_label: 'Job Openings',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },

  // ── Appraisals Module ───────────────────────────────────────────────────────
  {
    code: 'appraisals.view',
    display_name: 'View Appraisals & Goals',
    description: 'Access appraisal cycles, key performance indicators (KRAs), and employee reviews.',
    module: 'appraisals',
    module_label: 'Appraisals',
    subsection: 'appraisal_cycles',
    subsection_label: 'Appraisal Cycles',
    roles: ['Org Admin', 'Admin', 'HR Manager', 'Department Head', 'Employee'],
  },
  {
    code: 'appraisals.manage',
    display_name: 'Manage Appraisals',
    description: 'Configure appraisal cycles, rating templates, and approve evaluation scores.',
    module: 'appraisals',
    module_label: 'Appraisals',
    subsection: 'appraisal_cycles',
    subsection_label: 'Appraisal Cycles',
    roles: ['Org Admin', 'Admin', 'HR Manager'],
  },
];

interface HRSettingsData {
  company_name: string;
  fiscal_year_start: string;
  probation_period_days: number;
  notice_period_days: number;
  employee_naming_series?: string;
  retirement_age?: number;
  location_check_interval_minutes: number;
  leave_settings?: {
    compensatory_leave_enabled?: boolean;
    compensatory_leave_allow_weekend?: boolean;
    compensatory_leave_validity_days?: number;
    [key: string]: any;
  };
}

interface EmailConfigData {
  configured: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  use_tls: boolean;
  use_ssl: boolean;
  from_email: string;
  from_name: string;
  reply_to_email: string;
  is_active: boolean;
  is_verified: boolean;
  last_tested_at: string | null;
  password_set?: boolean;
}

export default function HRSettings() {
  const [form, setForm] = useState<HRSettingsData>({
    company_name: '',
    fiscal_year_start: '',
    probation_period_days: 90,
    notice_period_days: 30,
    location_check_interval_minutes: 30,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const embedCodeSnippet = `<iframe id="hrms-careers-frame" src="${typeof window !== 'undefined' ? window.location.origin : ''}/careers/embed" width="100%" height="750" style="border:none;width:100%;min-height:700px;overflow:hidden;border-radius:12px;" scrolling="no" title="Careers Portal"></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  // Email config state
  const [emailForm, setEmailForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    use_tls: true,
    use_ssl: false,
    from_email: '',
    from_name: '',
    reply_to_email: '',
    is_active: false,
  });
  const [emailConfig, setEmailConfig] = useState<EmailConfigData | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // Permission List state
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedPermissionModule, setSelectedPermissionModule] = useState('all');
  const [quickPermissionFilter, setQuickPermissionFilter] = useState<'all' | 'compensatory' | 'work_records' | 'hour_account'>('all');
  const [permissionsList, setPermissionsList] = useState<SystemPermissionItem[]>(DEFAULT_SYSTEM_PERMISSIONS);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [permissionsPage, setPermissionsPage] = useState(1);
  const permissionsPerPage = 12;

  const fetchPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const res = await api.get('/api/v1/permissions/');
      const data = res.data;
      if (data && data.sections && Array.isArray(data.sections)) {
        const fetched: SystemPermissionItem[] = [];
        data.sections.forEach((sec: any) => {
          const mod = sec.module;
          const modLabel = sec.label || mod;
          if (sec.common && Array.isArray(sec.common)) {
            sec.common.forEach((p: any) => {
              fetched.push({
                id: p.id,
                code: p.code,
                display_name: p.display_name || p.code,
                description: p.description || `${p.display_name || p.code} in ${modLabel}`,
                module: mod,
                module_label: modLabel,
                subsection: 'general',
                subsection_label: 'General',
                roles: ['Org Admin', 'Admin', 'HR Manager'],
              });
            });
          }
          if (sec.subsections && Array.isArray(sec.subsections)) {
            sec.subsections.forEach((sub: any) => {
              const subKey = sub.key;
              const subLabel = sub.label || subKey;
              if (sub.permissions && Array.isArray(sub.permissions)) {
                sub.permissions.forEach((p: any) => {
                  fetched.push({
                    id: p.id,
                    code: p.code,
                    display_name: p.display_name || p.code,
                    description: p.description || `${p.display_name || p.code} in ${subLabel}`,
                    module: mod,
                    module_label: modLabel,
                    subsection: subKey,
                    subsection_label: subLabel,
                    roles: ['Org Admin', 'Admin', 'HR Manager'],
                  });
                });
              }
            });
          }
        });

        if (fetched.length > 0) {
          const codeMap = new Map<string, SystemPermissionItem>();
          DEFAULT_SYSTEM_PERMISSIONS.forEach((p) => codeMap.set(p.code, p));
          fetched.forEach((p) => {
            if (!codeMap.has(p.code)) {
              codeMap.set(p.code, p);
            }
          });
          setPermissionsList(Array.from(codeMap.values()));
        }
      }
    } catch {
      // Keep rich DEFAULT_SYSTEM_PERMISSIONS
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const filteredPermissions = useMemo(() => {
    return permissionsList.filter((p) => {
      if (quickPermissionFilter === 'compensatory' && !p.code.startsWith('compensatory_leave.')) {
        return false;
      }
      if (quickPermissionFilter === 'work_records' && !p.code.startsWith('work_records.')) {
        return false;
      }
      if (quickPermissionFilter === 'hour_account' && !p.code.startsWith('hour_account.')) {
        return false;
      }
      if (selectedPermissionModule !== 'all' && p.module !== selectedPermissionModule) {
        return false;
      }
      if (permissionSearch.trim()) {
        const q = permissionSearch.trim().toLowerCase();
        return (
          p.code.toLowerCase().includes(q) ||
          p.display_name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.subsection_label.toLowerCase().includes(q) ||
          p.module_label.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [permissionsList, quickPermissionFilter, selectedPermissionModule, permissionSearch]);

  const totalPermissionPages = Math.max(1, Math.ceil(filteredPermissions.length / permissionsPerPage));
  const paginatedPermissions = filteredPermissions.slice(
    (permissionsPage - 1) * permissionsPerPage,
    permissionsPage * permissionsPerPage
  );

  // Fetch HR settings on mount (singleton endpoint returns single object)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get<HRSettingsData>(ENDPOINT);
        const data = response.data;
        setForm({
          company_name: data.company_name || '',
          fiscal_year_start: data.fiscal_year_start || '',
          probation_period_days: data.probation_period_days || 90,
          notice_period_days: data.notice_period_days || 30,
          location_check_interval_minutes: data.location_check_interval_minutes ?? 30,
          leave_settings: data.leave_settings || {
            compensatory_leave_enabled: true,
            compensatory_leave_allow_weekend: true,
            compensatory_leave_validity_days: 60,
          },
        });
      } catch {
        // Settings not found yet — keep defaults
      }
    };
    fetchSettings();
  }, []);

  // Fetch email config on mount
  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    try {
      const response = await api.get<EmailConfigData>(EMAIL_CONFIG.GET);
      const data = response.data;
      setEmailConfig(data);
      if (data.configured) {
        setEmailForm({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_username: data.smtp_username || '',
          smtp_password: '', // Never returned from backend
          use_tls: data.use_tls ?? true,
          use_ssl: data.use_ssl ?? false,
          from_email: data.from_email || '',
          from_name: data.from_name || '',
          reply_to_email: data.reply_to_email || '',
          is_active: data.is_active ?? false,
        });
      }
    } catch {
      // Config not found — keep defaults
    }
  };

  const handleChange = (key: keyof HRSettingsData, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(ENDPOINT, form);
      setSaved(true);
    } catch {
      // Handle error silently or add error state if needed
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = (key: keyof typeof emailForm, value: string | number | boolean) => {
    setEmailForm((prev) => ({ ...prev, [key]: value }));
    setEmailSaved(false);
    setEmailError('');
  };

  const handleEmailSave = async () => {
    setEmailSaving(true);
    setEmailError('');
    setEmailSaved(false);
    try {
      const payload = { ...emailForm };
      // Don't send empty password if config already exists and password wasn't changed
      if (emailConfig?.configured && emailConfig.password_set && !payload.smtp_password) {
        const { smtp_password: _removed, ...rest } = payload;
        const response = await api.put<EmailConfigData>(EMAIL_CONFIG.UPDATE, rest);
        setEmailConfig(response.data);
      } else {
        const response = await api.put<EmailConfigData>(EMAIL_CONFIG.UPDATE, payload);
        setEmailConfig(response.data);
      }
      setEmailSaved(true);
      // Clear password field after save
      setEmailForm((prev) => ({ ...prev, smtp_password: '' }));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } };
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        'Failed to save email configuration.';
      setEmailError(msg);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) return;
    setTestingEmail(true);
    setTestResult(null);
    try {
      const response = await api.post<{ success?: boolean; message?: string; error?: string }>(
        EMAIL_CONFIG.TEST,
        { test_email: testEmailAddress }
      );
      setTestResult(response.data);
      // Refresh config to get updated verification status
      fetchEmailConfig();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setTestResult({ error: error.response?.data?.error || 'Failed to send test email.' });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">HR Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Configure global HR system settings</p>
      </div>

      {/* General HR Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="company_name" className="mb-1 block text-sm font-medium text-gray-700">Company Name</label>
            <input
              id="company_name"
              type="text"
              value={form.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Your company name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="embed_code" className="block text-sm font-medium text-gray-700">
                Careers Embed Code
              </label>
              <div className="flex items-center gap-2">
                <a
                  href="/careers/embed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  title="Open live preview in new tab"
                >
                  Preview ↗
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmbed}
                  className="inline-flex items-center gap-1 rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  {copiedEmbed ? '✓ Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                id="embed_code"
                type="text"
                readOnly
                value={embedCodeSnippet}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 shadow-sm cursor-pointer focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                title="Click to select all and copy embed code"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Embed this iframe into your company website to display live open positions.
            </p>
          </div>

          <div>
            <label htmlFor="fiscal_year_start" className="mb-1 block text-sm font-medium text-gray-700">Fiscal Year Start</label>
            <input
              id="fiscal_year_start"
              type="date"
              value={form.fiscal_year_start}
              onChange={(e) => handleChange('fiscal_year_start', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="probation_period_days" className="mb-1 block text-sm font-medium text-gray-700">Probation Period (days)</label>
            <input
              id="probation_period_days"
              type="number"
              min={0}
              value={form.probation_period_days}
              onChange={(e) => handleChange('probation_period_days', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="notice_period_days" className="mb-1 block text-sm font-medium text-gray-700">Notice Period (days)</label>
            <input
              id="notice_period_days"
              type="number"
              min={0}
              value={form.notice_period_days}
              onChange={(e) => handleChange('notice_period_days', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="location_check_interval_minutes" className="mb-1 block text-sm font-medium text-gray-700">
              Mobile Location Check Interval
            </label>
            <select
              id="location_check_interval_minutes"
              value={form.location_check_interval_minutes}
              onChange={(e) => handleChange('location_check_interval_minutes', parseInt(e.target.value, 10) || 30)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={15}>15 Minutes (High Precision)</option>
              <option value={30}>30 Minutes (Recommended)</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes (Battery Saver)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Interval at which the mobile app checks whether a checked-in employee is inside the office.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm text-green-600">Settings saved successfully.</span>}
        </div>
      </div>

      {/* Compensatory Leave Policy & Permissions in HR Settings */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Compensatory Leave Settings & Permissions</h2>
            <p className="mt-1 text-sm text-gray-600">
              Configure compensatory leave rules and view role permissions for approving rest day and holiday work requests.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            Leaves Module
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Enable Comp-Off Requests
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Allow employees to submit compensatory leave requests for working on off-days.
            </p>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.leave_settings?.compensatory_leave_enabled ?? true}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      leave_settings: {
                        ...(prev.leave_settings || {}),
                        compensatory_leave_enabled: e.target.checked,
                      },
                    }));
                    setSaved(false);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-xs font-semibold text-gray-700">
                {(form.leave_settings?.compensatory_leave_enabled ?? true) ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Weekend Attendance Allowed
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Allow employees who worked on Saturday or Sunday to claim compensatory off.
            </p>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.leave_settings?.compensatory_leave_allow_weekend ?? true}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      leave_settings: {
                        ...(prev.leave_settings || {}),
                        compensatory_leave_allow_weekend: e.target.checked,
                      },
                    }));
                    setSaved(false);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-xs font-semibold text-gray-700">
                {(form.leave_settings?.compensatory_leave_allow_weekend ?? true) ? 'Allowed' : 'Holidays Only'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Comp-Off Validity (Days)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Maximum days within which earned compensatory leave must be utilized before expiry.
            </p>
            <input
              type="number"
              min={1}
              max={365}
              value={form.leave_settings?.compensatory_leave_validity_days ?? 60}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 60;
                setForm((prev) => ({
                  ...prev,
                  leave_settings: {
                    ...(prev.leave_settings || {}),
                    compensatory_leave_validity_days: val,
                  },
                }));
                setSaved(false);
              }}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Permissions Matrix Info */}
        <div className="mt-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
          <p className="text-xs font-semibold text-blue-900 mb-1">
            Active Permissions for Compensatory Leave:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-700 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-bold">✓</span>
              <span><strong className="font-semibold">compensatory_leave.view</strong> — View requests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-bold">✓</span>
              <span><strong className="font-semibold">compensatory_leave.create</strong> — Submit requests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-bold">✓</span>
              <span><strong className="font-semibold">compensatory_leave.approve</strong> — Approve requests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-bold">✓</span>
              <span><strong className="font-semibold">compensatory_leave.reject</strong> — Reject requests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-bold">✓</span>
              <span><strong className="font-semibold">compensatory_leave.delete</strong> — Delete draft requests</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">
              Role permissions can be fine-tuned per role in Roles &amp; Permissions.
            </span>
            <a
              href="/roles"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
            >
              Manage Role Permissions →
            </a>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Compensatory Settings'}
          </button>
          {saved && <span className="text-sm text-green-600">Compensatory settings saved successfully.</span>}
        </div>
      </div>

      {/* ── Comprehensive Permission List in HR Settings ────────────────────── */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Permission List</h2>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                {filteredPermissions.length} Permissions
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Complete catalog of HRMS granular system permissions, specifically featuring Compensatory Leave Requests, Work Records, and Role access levels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchPermissions}
              disabled={loadingPermissions}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${loadingPermissions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loadingPermissions ? 'Refreshing...' : 'Refresh Permissions'}</span>
            </button>

            <a
              href="/roles"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer"
            >
              <span>Manage Roles →</span>
            </a>
          </div>
        </div>

        {/* Quick Filter Pills highlighting Compensatory Leave and Work Records */}
        <div className="py-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 mr-1">Quick Filters:</span>
          <button
            type="button"
            onClick={() => {
              setQuickPermissionFilter('all');
              setSelectedPermissionModule('all');
              setPermissionsPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              quickPermissionFilter === 'all' && selectedPermissionModule === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Permissions ({permissionsList.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPermissionFilter('compensatory');
              setSelectedPermissionModule('leaves');
              setPermissionsPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              quickPermissionFilter === 'compensatory'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            ⭐ Compensatory Leave Requests (5)
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPermissionFilter('work_records');
              setSelectedPermissionModule('attendance');
              setPermissionsPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              quickPermissionFilter === 'work_records'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            ⭐ Work Records (2)
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPermissionFilter('hour_account');
              setSelectedPermissionModule('attendance');
              setPermissionsPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              quickPermissionFilter === 'hour_account'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            Hour Account (2)
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="sm:col-span-2 relative">
            <input
              type="text"
              value={permissionSearch}
              onChange={(e) => {
                setPermissionSearch(e.target.value);
                setPermissionsPage(1);
              }}
              placeholder="Search by code (e.g. compensatory_leave.create, work_records.view) or keyword..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div>
            <select
              value={selectedPermissionModule}
              onChange={(e) => {
                setSelectedPermissionModule(e.target.value);
                setQuickPermissionFilter('all');
                setPermissionsPage(1);
              }}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            >
              <option value="all">All Modules</option>
              <option value="leaves">Leaves Module</option>
              <option value="attendance">Attendance Module</option>
              <option value="employees">Employees Module</option>
              <option value="payroll">Payroll Module</option>
              <option value="recruitment">Recruitment Module</option>
              <option value="appraisals">Appraisals Module</option>
            </select>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Permission Code</th>
                <th className="py-2.5 px-3">Display Name & Purpose</th>
                <th className="py-2.5 px-3">Module & Subsection</th>
                <th className="py-2.5 px-3">Roles Access</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedPermissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-xs">
                    No permissions match your filter.
                  </td>
                </tr>
              ) : (
                paginatedPermissions.map((perm) => {
                  const isCompensatory = perm.code.startsWith('compensatory_leave.');
                  const isWorkRecords = perm.code.startsWith('work_records.');
                  return (
                    <tr
                      key={perm.code}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCompensatory
                          ? 'bg-blue-50/30'
                          : isWorkRecords
                          ? 'bg-emerald-50/20'
                          : ''
                      }`}
                    >
                      {/* Code */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {(isCompensatory || isWorkRecords) && (
                            <span className="text-amber-500 text-xs" title="Featured permission">★</span>
                          )}
                          <code className="font-mono text-[11px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {perm.code}
                          </code>
                        </div>
                      </td>

                      {/* Name & Description */}
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-semibold text-gray-900 text-xs">
                          {perm.display_name}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                          {perm.description}
                        </div>
                      </td>

                      {/* Module & Subsection */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase text-gray-500">
                            {perm.module_label}
                          </span>
                          <span
                            className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full w-max ${
                              isCompensatory
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : isWorkRecords
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {perm.subsection_label}
                          </span>
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {perm.roles.map((r) => (
                            <span
                              key={r}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                                r === 'Employee'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : r === 'Department Head'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-600 gap-3">
          <div>
            Showing <span className="font-semibold">{Math.min(filteredPermissions.length, (permissionsPage - 1) * permissionsPerPage + 1)}</span> to{' '}
            <span className="font-semibold">{Math.min(filteredPermissions.length, permissionsPage * permissionsPerPage)}</span> of{' '}
            <span className="font-semibold">{filteredPermissions.length}</span> permissions
          </div>

          {totalPermissionPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPermissionsPage((p) => Math.max(1, p - 1))}
                disabled={permissionsPage === 1}
                className="px-2.5 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPermissionPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPermissionsPage(num)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    permissionsPage === num
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPermissionsPage((p) => Math.min(totalPermissionPages, p + 1))}
                disabled={permissionsPage === totalPermissionPages}
                className="px-2.5 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Email Configuration */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email Configuration (SMTP)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Configure your organization&apos;s SMTP settings for sending emails (payslips, notifications, reminders).
            </p>
          </div>
          {emailConfig?.configured && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${emailConfig.is_verified
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                }`}
            >
              {emailConfig.is_verified ? '✓ Verified' : 'Not Verified'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* SMTP Host */}
          <div>
            <label htmlFor="smtp_host" className="mb-1 block text-sm font-medium text-gray-700">SMTP Host</label>
            <input
              id="smtp_host"
              type="text"
              value={emailForm.smtp_host}
              onChange={(e) => handleEmailChange('smtp_host', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="smtp.gmail.com"
            />
          </div>

          {/* SMTP Port */}
          <div>
            <label htmlFor="smtp_port" className="mb-1 block text-sm font-medium text-gray-700">SMTP Port</label>
            <input
              id="smtp_port"
              type="number"
              min={1}
              max={65535}
              value={emailForm.smtp_port}
              onChange={(e) => handleEmailChange('smtp_port', parseInt(e.target.value, 10) || 587)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="587"
            />
          </div>

          {/* SMTP Username */}
          <div>
            <label htmlFor="smtp_username" className="mb-1 block text-sm font-medium text-gray-700">SMTP Username</label>
            <input
              id="smtp_username"
              type="text"
              value={emailForm.smtp_username}
              onChange={(e) => handleEmailChange('smtp_username', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="your-email@gmail.com"
            />
          </div>

          {/* SMTP Password */}
          <div>
            <label htmlFor="smtp_password" className="mb-1 block text-sm font-medium text-gray-700">
              SMTP Password
              {emailConfig?.password_set && (
                <span className="ml-2 text-xs text-gray-500">(leave blank to keep current)</span>
              )}
            </label>
            <input
              id="smtp_password"
              type="password"
              value={emailForm.smtp_password}
              onChange={(e) => handleEmailChange('smtp_password', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder={emailConfig?.password_set ? '••••••••' : 'App password or SMTP password'}
            />
          </div>

          {/* From Email */}
          <div>
            <label htmlFor="from_email" className="mb-1 block text-sm font-medium text-gray-700">From Email</label>
            <input
              id="from_email"
              type="email"
              value={emailForm.from_email}
              onChange={(e) => handleEmailChange('from_email', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="hr@company.com"
            />
          </div>

          {/* From Name */}
          <div>
            <label htmlFor="from_name" className="mb-1 block text-sm font-medium text-gray-700">From Name</label>
            <input
              id="from_name"
              type="text"
              value={emailForm.from_name}
              onChange={(e) => handleEmailChange('from_name', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="HR Team"
            />
          </div>

          {/* Reply-To Email */}
          <div>
            <label htmlFor="reply_to_email" className="mb-1 block text-sm font-medium text-gray-700">Reply-To Email (optional)</label>
            <input
              id="reply_to_email"
              type="email"
              value={emailForm.reply_to_email}
              onChange={(e) => handleEmailChange('reply_to_email', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="noreply@company.com"
            />
          </div>

          {/* Encryption Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={emailForm.use_tls}
                onChange={(e) => {
                  handleEmailChange('use_tls', e.target.checked);
                  if (e.target.checked) handleEmailChange('use_ssl', false);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Use TLS (port 587)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={emailForm.use_ssl}
                onChange={(e) => {
                  handleEmailChange('use_ssl', e.target.checked);
                  if (e.target.checked) handleEmailChange('use_tls', false);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Use SSL (port 465)
            </label>
          </div>

          {/* Is Active Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={emailForm.is_active}
                onChange={(e) => handleEmailChange('is_active', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Enable email sending
            </label>
          </div>
        </div>

        {/* Error / Success Messages */}
        {emailError && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{emailError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            onClick={handleEmailSave}
            disabled={emailSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {emailSaving ? 'Saving...' : 'Save SMTP Settings'}
          </button>

          <button
            onClick={() => setShowTestModal(true)}
            disabled={!emailConfig?.configured}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Send Test Email
          </button>

          {emailSaved && <span className="text-sm text-green-600">Email settings saved successfully.</span>}
        </div>

        {emailConfig?.last_tested_at && (
          <p className="mt-3 text-xs text-gray-500">
            Last tested: {new Date(emailConfig.last_tested_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Send Test Email</h3>
            <p className="mt-1 text-sm text-gray-600">
              Enter an email address to receive a test message and verify your SMTP configuration.
            </p>

            <div className="mt-4">
              <label htmlFor="test_email" className="mb-1 block text-sm font-medium text-gray-700">
                Recipient Email
              </label>
              <input
                id="test_email"
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="test@example.com"
              />
            </div>

            {testResult && (
              <div className={`mt-4 rounded-md p-3 ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.success ? testResult.message : testResult.error}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                  setTestEmailAddress('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testEmailAddress}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {testingEmail ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
