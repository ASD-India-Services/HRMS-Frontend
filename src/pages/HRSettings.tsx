import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { EMAIL_CONFIG } from '@/lib/endpoints';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

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
        <h1 className="text-2xl font-bold text-ink-primary">HR Settings</h1>
        <p className="mt-1 text-sm text-ink-secondary">Configure global HR system settings</p>
      </div>

      {/* General HR Settings */}
      <div className="rounded-lg border border-divider bg-surface-paper p-6">
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
                Careers Embed Code
              </label>
              <div className="flex items-center gap-2">
                <a
                  href="/careers/embed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary-main hover:text-primary-dark"
                  title="Open live preview in new tab"
                >
                  Preview ↗
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmbed}
                  className="inline-flex items-center gap-1 rounded bg-primary-lighter px-2 py-0.5 text-xs font-semibold text-primary-dark hover:bg-primary-lighter transition-colors"
                >
                  {copiedEmbed ? '✓ Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>
            <div className="relative">
              <Input
                id="embed_code"
                type="text"
                readOnly
                value={embedCodeSnippet}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="font-mono cursor-pointer"
                title="Click to select all and copy embed code"
              />
            </div>
            <p className="mt-1 text-xs text-ink-secondary">
              Embed this iframe into your company website to display live open positions.
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
          <Button type="submit"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {saved && <span className="text-sm text-green-600">Settings saved successfully.</span>}
        </div>
      </div>

      {/* Email Configuration */}
      <div className="mt-8 rounded-lg border border-divider bg-surface-paper p-6">
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
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{emailError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="submit"
            onClick={handleEmailSave}
            disabled={emailSaving}
          >
            {emailSaving ? 'Saving...' : 'Save SMTP Settings'}
          </Button>

          <Button type="submit" variant="outlined" color="inherit"
            onClick={() => setShowTestModal(true)}
            disabled={!emailConfig?.configured}
          >
            Send Test Email
          </Button>

          {emailSaved && <span className="text-sm text-green-600">Email settings saved successfully.</span>}
        </div>

        {emailConfig?.last_tested_at && (
          <p className="mt-3 text-xs text-ink-secondary">
            Last tested: {new Date(emailConfig.last_tested_at).toLocaleString()}
          </p>
        )}
      </div>

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
              <div className={`mt-4 rounded-md p-3 ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.success ? testResult.message : testResult.error}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button type="submit" variant="outlined" color="inherit"
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                  setTestEmailAddress('');
                }}
              >
                Close
              </Button>
              <Button type="submit"
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testEmailAddress}
              >
                {testingEmail ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
