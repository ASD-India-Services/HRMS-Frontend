import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { EMAIL_CONFIG } from '@/lib/endpoints';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';
import { formatDateTime } from '@/utils/formatters';

const ENDPOINT = '/api/v1/hr-settings/';

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
  attendance_settings?: {
    web_shift_end_confirmation?: {
      enabled: boolean;
      shift_end_buffer_minutes: number;
      unanswered_timeout_minutes: number;
      recheck_interval_minutes: number;
      max_continue_prompts: number;
      auto_checkout_timestamp_policy: 'shift_end_time' | 'prompt_time' | 'timeout_time';
    };
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

  const [embedMode, setEmbedMode] = useState<'widget' | 'iframe'>('widget');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8002';
  const tenantSlug = 'org_digihrms';

  const widgetSnippet = `<!-- Option 2: Drop-in JavaScript Widget for your existing blank careers page section -->
<div id="hrms-careers-widget" data-tenant="${tenantSlug}" data-api="${apiBaseUrl}" data-primary-color="#2563eb"></div>
<script src="${originUrl}/widget/careers.js" async></script>`;

  const iframeSnippet = `<!-- Option 1: Responsive iFrame with auto-height adjustment -->
<div id="hrms-careers-wrapper" style="width:100%;min-height:500px;">
  <iframe id="hrms-careers-frame" src="${originUrl}/careers/embed?hide_header=true&tenant=${tenantSlug}" width="100%" style="border:none;width:100%;min-height:500px;background:transparent;" scrolling="no" title="Careers"></iframe>
</div>
<script>
  window.addEventListener('message',function(e){if(e.data&&e.data.type==='HRMS_CAREERS_RESIZE'){var f=document.getElementById('hrms-careers-frame');if(f)f.style.height=(e.data.height+20)+'px';}});
</script>`;

  const embedCodeSnippet = embedMode === 'widget' ? widgetSnippet : iframeSnippet;

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
          attendance_settings: data.attendance_settings || {
            web_shift_end_confirmation: {
              enabled: true,
              shift_end_buffer_minutes: 15,
              unanswered_timeout_minutes: 5,
              recheck_interval_minutes: 30,
              max_continue_prompts: 3,
              auto_checkout_timestamp_policy: 'shift_end_time',
            },
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

  const handleWebShiftConfigChange = (field: string, value: any) => {
    setForm((prev) => {
      const currentAtt = prev.attendance_settings || {};
      const currentWebConfig = currentAtt.web_shift_end_confirmation || {
        enabled: true,
        shift_end_buffer_minutes: 15,
        unanswered_timeout_minutes: 5,
        recheck_interval_minutes: 30,
        max_continue_prompts: 3,
        auto_checkout_timestamp_policy: 'shift_end_time',
      };
      return {
        ...prev,
        attendance_settings: {
          ...currentAtt,
          web_shift_end_confirmation: {
            ...currentWebConfig,
            [field]: value,
          },
        },
      };
    });
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
    <PageContainer>
      <PageHeader title="HR Settings" subtitle="Configure global HR system settings" />

      {/* General HR Settings */}
      <Card className="p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="company_name" className="mb-1 block text-sm font-medium text-ink-primary">Company Name</label>
            <Input
              id="company_name"
              type="text"
              value={form.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              placeholder="Your company name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="embed_code" className="block text-sm font-medium text-ink-primary">
                Careers Website Embed
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant={embedMode === 'widget' ? 'soft' : 'text'}
                  color={embedMode === 'widget' ? 'primary' : 'inherit'}
                  size="small"
                  onClick={() => setEmbedMode('widget')}
                >
                  JS Widget
                </Button>
                <Button
                  variant={embedMode === 'iframe' ? 'soft' : 'text'}
                  color={embedMode === 'iframe' ? 'primary' : 'inherit'}
                  size="small"
                  onClick={() => setEmbedMode('iframe')}
                >
                  iFrame
                </Button>
                <a
                  href="/test-widget.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-main hover:text-primary-dark"
                  title="Test Drop-In Demo in simulated company page"
                >
                  Demo <Iconify icon="external" width={14} />
                </a>
                <a
                  href="/careers/embed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-main hover:text-primary-dark"
                  title="Open live preview in new tab"
                >
                  Preview <Iconify icon="external" width={14} />
                </a>
                <Button variant="soft" size="small" startIcon={<Iconify icon={copiedEmbed ? 'check' : 'copy'} />} onClick={handleCopyEmbed}>
                  {copiedEmbed ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
            </div>
            <div className="relative">
              <Textarea
                id="embed_code"
                rows={3}
                readOnly
                value={embedCodeSnippet}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="font-mono cursor-pointer"
                title="Click to select all and copy embed code"
              />
            </div>
            <p className="mt-1 text-xs text-ink-secondary">
              {embedMode === 'widget'
                ? 'Option 2 (Recommended): Paste this 15 KB snippet into your website blank careers section to inject native job cards.'
                : 'Option 1: Paste this responsive iframe into your existing website.'}
            </p>
          </div>

          <div>
            <label htmlFor="fiscal_year_start" className="mb-1 block text-sm font-medium text-ink-primary">Fiscal Year Start</label>
            <Input
              id="fiscal_year_start"
              type="date"
              value={form.fiscal_year_start}
              onChange={(e) => handleChange('fiscal_year_start', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="probation_period_days" className="mb-1 block text-sm font-medium text-ink-primary">Probation Period (days)</label>
            <Input
              id="probation_period_days"
              type="number"
              min={0}
              value={form.probation_period_days}
              onChange={(e) => handleChange('probation_period_days', parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div>
            <label htmlFor="notice_period_days" className="mb-1 block text-sm font-medium text-ink-primary">Notice Period (days)</label>
            <Input
              id="notice_period_days"
              type="number"
              min={0}
              value={form.notice_period_days}
              onChange={(e) => handleChange('notice_period_days', parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div>
            <label htmlFor="location_check_interval_minutes" className="mb-1 block text-sm font-medium text-ink-primary">
              Mobile Location Check Interval
            </label>
            <Select
              id="location_check_interval_minutes"
              value={form.location_check_interval_minutes}
              onChange={(e) => handleChange('location_check_interval_minutes', parseInt(e.target.value, 10) || 30)}
            >
              <option value={15}>15 Minutes (High Precision)</option>
              <option value={30}>30 Minutes (Recommended)</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes (Battery Saver)</option>
            </Select>
            <p className="mt-1 text-xs text-ink-secondary">
              Interval at which the mobile app checks whether a checked-in employee is inside the office.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {saved && <span className="text-sm text-success-main">Settings saved successfully.</span>}
        </div>
      </Card>

      {/* Web Shift-End Confirmation & Auto-Logout Configuration */}
      <Card className="mt-8 p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Iconify icon="clock" width={22} className="text-primary-main" />
            <h2 className="text-lg font-semibold text-ink-primary">
              Web Attendance Auto-Checkout &amp; Shift-End Confirmation
            </h2>
          </div>
          <p className="mt-1 text-sm text-ink-secondary">
            Configure automated shift-end prompts, waiting timers, and auto-checkout rules for employees working via the website.
          </p>
        </div>

        <div className="space-y-6">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-divider bg-surface-neutral/50 p-4">
            <div>
              <p className="text-sm font-semibold text-ink-primary">
                Enable Shift-End Confirmation &amp; Web Auto-Checkout
              </p>
              <p className="text-xs text-ink-secondary">
                When active, employees who punched in on the website are prompted when their shift ends, and automatically checked out if unanswered.
              </p>
            </div>
            <input
              type="checkbox"
              id="web_auto_checkout_enabled"
              checked={form.attendance_settings?.web_shift_end_confirmation?.enabled ?? true}
              onChange={(e) => handleWebShiftConfigChange('enabled', e.target.checked)}
              className="h-5 w-5 rounded border-divider text-primary-main focus:ring-primary-main cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 1. Shift End Buffer Time */}
            <div>
              <label htmlFor="shift_end_buffer_minutes" className="mb-1 block text-sm font-medium text-ink-primary">
                Shift-End Grace Buffer (Minutes)
              </label>
              <Input
                id="shift_end_buffer_minutes"
                type="number"
                min={0}
                max={60}
                value={form.attendance_settings?.web_shift_end_confirmation?.shift_end_buffer_minutes ?? 15}
                onChange={(e) => handleWebShiftConfigChange('shift_end_buffer_minutes', parseInt(e.target.value, 10) || 0)}
              />
              <p className="mt-1 text-xs text-ink-secondary">
                Minutes to wait after scheduled shift ends before showing the confirmation prompt (e.g. 15 mins).
              </p>
            </div>

            {/* 2. Unanswered Prompt Countdown */}
            <div>
              <label htmlFor="unanswered_timeout_minutes" className="mb-1 block text-sm font-medium text-ink-primary">
                Unanswered Prompt Countdown (Minutes)
              </label>
              <Input
                id="unanswered_timeout_minutes"
                type="number"
                min={1}
                max={30}
                value={form.attendance_settings?.web_shift_end_confirmation?.unanswered_timeout_minutes ?? 5}
                onChange={(e) => handleWebShiftConfigChange('unanswered_timeout_minutes', parseInt(e.target.value, 10) || 5)}
              />
              <p className="mt-1 text-xs text-ink-secondary">
                How long the pop-up modal waits for employee response before automatically checking out and logging out.
              </p>
            </div>

            {/* 3. Re-prompt Interval */}
            <div>
              <label htmlFor="recheck_interval_minutes" className="mb-1 block text-sm font-medium text-ink-primary">
                &quot;Continue Working&quot; Re-Prompt Interval (Minutes)
              </label>
              <Input
                id="recheck_interval_minutes"
                type="number"
                min={10}
                max={120}
                value={form.attendance_settings?.web_shift_end_confirmation?.recheck_interval_minutes ?? 30}
                onChange={(e) => handleWebShiftConfigChange('recheck_interval_minutes', parseInt(e.target.value, 10) || 30)}
              />
              <p className="mt-1 text-xs text-ink-secondary">
                If the employee clicks &quot;Continue Working&quot; (overtime), re-check and prompt again after this interval.
              </p>
            </div>

            {/* 4. Maximum Continue Reminders */}
            <div>
              <label htmlFor="max_continue_prompts" className="mb-1 block text-sm font-medium text-ink-primary">
                Maximum Continue Reminders (Safety Cap)
              </label>
              <Input
                id="max_continue_prompts"
                type="number"
                min={1}
                max={10}
                value={form.attendance_settings?.web_shift_end_confirmation?.max_continue_prompts ?? 3}
                onChange={(e) => handleWebShiftConfigChange('max_continue_prompts', parseInt(e.target.value, 10) || 3)}
              />
              <p className="mt-1 text-xs text-ink-secondary">
                Maximum number of times an employee can extend their shift before check-out is required.
              </p>
            </div>

            {/* 5. Auto-Checkout Stamped Time Policy */}
            <div className="sm:col-span-2">
              <label htmlFor="auto_checkout_timestamp_policy" className="mb-1 block text-sm font-medium text-ink-primary">
                Auto-Checkout Stamped Timestamp Policy
              </label>
              <Select
                id="auto_checkout_timestamp_policy"
                value={form.attendance_settings?.web_shift_end_confirmation?.auto_checkout_timestamp_policy ?? 'shift_end_time'}
                onChange={(e) => handleWebShiftConfigChange('auto_checkout_timestamp_policy', e.target.value)}
              >
                <option value="shift_end_time">Official Shift End Time (e.g. 06:00 PM) — Recommended</option>
                <option value="prompt_time">Prompt Trigger Time (Shift End + Buffer e.g. 06:15 PM)</option>
                <option value="timeout_time">Exact Moment Timeout Expired (e.g. 06:20 PM)</option>
              </Select>
              <p className="mt-1 text-xs text-ink-secondary">
                Timestamp recorded as check-out when employee left without answering the confirmation prompt.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Shift Confirmation Rules'}
          </Button>
          {saved && <span className="text-sm text-success-main">Settings saved successfully.</span>}
        </div>
      </Card>

      {/* Email Configuration */}
      <Card className="mt-8 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">Email Configuration (SMTP)</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Configure your organization&apos;s SMTP settings for sending emails (payslips, notifications, reminders).
            </p>
          </div>
          {emailConfig?.configured && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${emailConfig.is_verified
                  ? 'bg-success-lighter text-success-dark'
                  : 'bg-warning-lighter text-warning-dark'
                }`}
            >
              {emailConfig.is_verified ? (<><Iconify icon="check" width={14} className="mr-1" />Verified</>) : 'Not Verified'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* SMTP Host */}
          <div>
            <label htmlFor="smtp_host" className="mb-1 block text-sm font-medium text-ink-primary">SMTP Host</label>
            <Input
              id="smtp_host"
              type="text"
              value={emailForm.smtp_host}
              onChange={(e) => handleEmailChange('smtp_host', e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </div>

          {/* SMTP Port */}
          <div>
            <label htmlFor="smtp_port" className="mb-1 block text-sm font-medium text-ink-primary">SMTP Port</label>
            <Input
              id="smtp_port"
              type="number"
              min={1}
              max={65535}
              value={emailForm.smtp_port}
              onChange={(e) => handleEmailChange('smtp_port', parseInt(e.target.value, 10) || 587)}
              placeholder="587"
            />
          </div>

          {/* SMTP Username */}
          <div>
            <label htmlFor="smtp_username" className="mb-1 block text-sm font-medium text-ink-primary">SMTP Username</label>
            <Input
              id="smtp_username"
              type="text"
              value={emailForm.smtp_username}
              onChange={(e) => handleEmailChange('smtp_username', e.target.value)}
              placeholder="your-email@gmail.com"
            />
          </div>

          {/* SMTP Password */}
          <div>
            <label htmlFor="smtp_password" className="mb-1 block text-sm font-medium text-ink-primary">
              SMTP Password
              {emailConfig?.password_set && (
                <span className="ml-2 text-xs text-ink-secondary">(leave blank to keep current)</span>
              )}
            </label>
            <Input
              id="smtp_password"
              type="password"
              value={emailForm.smtp_password}
              onChange={(e) => handleEmailChange('smtp_password', e.target.value)}
              placeholder={emailConfig?.password_set ? '••••••••' : 'App password or SMTP password'}
            />
          </div>

          {/* From Email */}
          <div>
            <label htmlFor="from_email" className="mb-1 block text-sm font-medium text-ink-primary">From Email</label>
            <Input
              id="from_email"
              type="email"
              value={emailForm.from_email}
              onChange={(e) => handleEmailChange('from_email', e.target.value)}
              placeholder="hr@company.com"
            />
          </div>

          {/* From Name */}
          <div>
            <label htmlFor="from_name" className="mb-1 block text-sm font-medium text-ink-primary">From Name</label>
            <Input
              id="from_name"
              type="text"
              value={emailForm.from_name}
              onChange={(e) => handleEmailChange('from_name', e.target.value)}
              placeholder="HR Team"
            />
          </div>

          {/* Reply-To Email */}
          <div>
            <label htmlFor="reply_to_email" className="mb-1 block text-sm font-medium text-ink-primary">Reply-To Email (optional)</label>
            <Input
              id="reply_to_email"
              type="email"
              value={emailForm.reply_to_email}
              onChange={(e) => handleEmailChange('reply_to_email', e.target.value)}
              placeholder="noreply@company.com"
            />
          </div>

          {/* Encryption Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-ink-primary">
              <input
                type="checkbox"
                checked={emailForm.use_tls}
                onChange={(e) => {
                  handleEmailChange('use_tls', e.target.checked);
                  if (e.target.checked) handleEmailChange('use_ssl', false);
                }}
                className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
              />
              Use TLS (port 587)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-primary">
              <input
                type="checkbox"
                checked={emailForm.use_ssl}
                onChange={(e) => {
                  handleEmailChange('use_ssl', e.target.checked);
                  if (e.target.checked) handleEmailChange('use_tls', false);
                }}
                className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
              />
              Use SSL (port 465)
            </label>
          </div>

          {/* Is Active Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ink-primary">
              <input
                type="checkbox"
                checked={emailForm.is_active}
                onChange={(e) => handleEmailChange('is_active', e.target.checked)}
                className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
              />
              Enable email sending
            </label>
          </div>
        </div>

        {/* Error / Success Messages */}
        {emailError && (
          <div className="mt-4 rounded-md bg-error-lighter p-3">
            <p className="text-sm text-error-dark">{emailError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="button"
            onClick={handleEmailSave}
            disabled={emailSaving}
          >
            {emailSaving ? 'Saving...' : 'Save SMTP Settings'}
          </Button>

          <Button type="button" variant="outlined" color="inherit"
            onClick={() => setShowTestModal(true)}
            disabled={!emailConfig?.configured}
          >
            Send Test Email
          </Button>

          {emailSaved && <span className="text-sm text-success-main">Email settings saved successfully.</span>}
        </div>

        {emailConfig?.last_tested_at && (
          <p className="mt-3 text-xs text-ink-secondary">
            Last tested: {formatDateTime(emailConfig.last_tested_at)}
          </p>
        )}
      </Card>

      {/* Test Email Modal */}
      {showTestModal && (
        <Modal open onClose={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                  setTestEmailAddress('');
                }} labelledBy="HRSettings-modal-title-1" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="HRSettings-modal-title-1" className="text-lg font-semibold text-ink-primary">Send Test Email</h3>
            <p className="mt-1 text-sm text-ink-secondary">
              Enter an email address to receive a test message and verify your SMTP configuration.
            </p>

            <div className="mt-4">
              <label htmlFor="test_email" className="mb-1 block text-sm font-medium text-ink-primary">
                Recipient Email
              </label>
              <Input
                id="test_email"
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="test@example.com"
              />
            </div>

            {testResult && (
              <div className={`mt-4 rounded-md p-3 ${testResult.success ? 'bg-success-lighter' : 'bg-error-lighter'}`}>
                <p className={`text-sm ${testResult.success ? 'text-success-dark' : 'text-error-dark'}`}>
                  {testResult.success ? testResult.message : testResult.error}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outlined" color="inherit"
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                  setTestEmailAddress('');
                }}
              >
                Close
              </Button>
              <Button type="button"
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testEmailAddress}
              >
                {testingEmail ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
