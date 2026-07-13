import { useEffect, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import api from '@/lib/api';
import { EMAIL_CONFIG } from '@/lib/endpoints';

const ENDPOINT = '/api/v1/hr-settings/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'hr-settings',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: () => ENDPOINT, update: () => ENDPOINT, delete: () => ENDPOINT },
});

interface HRSettingsData {
  company_name: string;
  fiscal_year_start: string;
  probation_months: number;
  notice_period_days: number;
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
    probation_months: 0,
    notice_period_days: 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const queryResult = crud.useList({});

  useEffect(() => {
    if (queryResult.data && queryResult.data.results && queryResult.data.results.length > 0) {
      const data = queryResult.data.results[0] as unknown as HRSettingsData;
      setForm({
        company_name: data.company_name || '',
        fiscal_year_start: data.fiscal_year_start || '',
        probation_months: data.probation_months || 0,
        notice_period_days: data.notice_period_days || 0,
      });
    }
  }, [queryResult.data]);

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
      const response = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        setSaved(true);
      }
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
            <label htmlFor="probation_months" className="mb-1 block text-sm font-medium text-gray-700">Probation Period (months)</label>
            <input
              id="probation_months"
              type="number"
              min={0}
              value={form.probation_months}
              onChange={(e) => handleChange('probation_months', parseInt(e.target.value, 10) || 0)}
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
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm text-green-600">Settings saved successfully.</span>}
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
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                emailConfig.is_verified
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
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
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
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
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
