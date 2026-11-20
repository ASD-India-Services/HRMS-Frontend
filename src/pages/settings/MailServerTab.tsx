import { useState, useEffect } from 'react';
import { CheckIcon, LoaderIcon, AlertCircleIcon, MailIcon, SendIcon, ShieldCheckIcon, ShieldAlertIcon } from './SettingsIcons';
import api from '@/lib/api';
import { EMAIL_CONFIG } from '@/lib/endpoints';
import { formatDateTime } from '@/utils/formatters';

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

export function MailServerTab() {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Test email modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const fetchEmailConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get<EmailConfigData>(EMAIL_CONFIG.GET);
      const d = res.data;
      setEmailConfig(d);
      setEmailForm({
        smtp_host: d.smtp_host || '',
        smtp_port: d.smtp_port || 587,
        smtp_username: d.smtp_username || '',
        smtp_password: '',
        use_tls: d.use_tls ?? true,
        use_ssl: d.use_ssl ?? false,
        from_email: d.from_email || '',
        from_name: d.from_name || '',
        reply_to_email: d.reply_to_email || '',
        is_active: d.is_active ?? false,
      });
    } catch {
      // Configuration might not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSaved(false);

    try {
      const payload: Record<string, unknown> = {
        smtp_host: emailForm.smtp_host,
        smtp_port: emailForm.smtp_port,
        smtp_username: emailForm.smtp_username,
        use_tls: emailForm.use_tls,
        use_ssl: emailForm.use_ssl,
        from_email: emailForm.from_email,
        from_name: emailForm.from_name,
        reply_to_email: emailForm.reply_to_email,
        is_active: emailForm.is_active,
      };

      if (emailForm.smtp_password) {
        payload.smtp_password = emailForm.smtp_password;
      }

      await api.post(EMAIL_CONFIG.UPDATE, payload);
      setSaved(true);
      await fetchEmailConfig();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to save email settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) return;
    setTestingEmail(true);
    setTestResult(null);

    try {
      const res = await api.post(EMAIL_CONFIG.TEST, { to_email: testEmailAddress });
      setTestResult({ success: true, message: res.data?.message || 'Test email sent successfully!' });
      fetchEmailConfig();
    } catch (err: any) {
      setTestResult({ error: err?.response?.data?.error || 'Failed to deliver test email.' });
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderIcon className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Mail Server (SMTP)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure SMTP credentials for transactional emails, payslips, and applicant invitations.
          </p>
        </div>

        {emailConfig?.configured && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              emailConfig.is_verified
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {emailConfig.is_verified ? (
              <>
                <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" /> Verified & Active
              </>
            ) : (
              <>
                <ShieldAlertIcon className="h-3.5 w-3.5 text-amber-600" /> Not Tested
              </>
            )}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* SMTP Host */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">SMTP Host</label>
            <input
              type="text"
              value={emailForm.smtp_host}
              onChange={(e) => setEmailForm((p) => ({ ...p, smtp_host: e.target.value }))}
              placeholder="smtp.gmail.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* SMTP Port */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">SMTP Port</label>
            <input
              type="number"
              min={1}
              max={65535}
              value={emailForm.smtp_port}
              onChange={(e) => setEmailForm((p) => ({ ...p, smtp_port: parseInt(e.target.value, 10) || 587 }))}
              placeholder="587"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* SMTP Username */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">SMTP Username</label>
            <input
              type="text"
              value={emailForm.smtp_username}
              onChange={(e) => setEmailForm((p) => ({ ...p, smtp_username: e.target.value }))}
              placeholder="hr@company.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* SMTP Password */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              SMTP Password
              {emailConfig?.password_set && (
                <span className="ml-2 text-xs font-normal text-gray-400">(leave blank to keep current)</span>
              )}
            </label>
            <input
              type="password"
              value={emailForm.smtp_password}
              onChange={(e) => setEmailForm((p) => ({ ...p, smtp_password: e.target.value }))}
              placeholder={emailConfig?.password_set ? '••••••••' : 'App password or SMTP secret'}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* From Email */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">From Email Address</label>
            <input
              type="email"
              value={emailForm.from_email}
              onChange={(e) => setEmailForm((p) => ({ ...p, from_email: e.target.value }))}
              placeholder="notifications@company.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* From Name */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">From Name</label>
            <input
              type="text"
              value={emailForm.from_name}
              onChange={(e) => setEmailForm((p) => ({ ...p, from_name: e.target.value }))}
              placeholder="DigiHRMS Notifications"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Reply-To Email */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Reply-To Email (Optional)</label>
            <input
              type="email"
              value={emailForm.reply_to_email}
              onChange={(e) => setEmailForm((p) => ({ ...p, reply_to_email: e.target.value }))}
              placeholder="support@company.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Encryption Checkboxes */}
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={emailForm.use_tls}
              onChange={(e) => {
                setEmailForm((p) => ({
                  ...p,
                  use_tls: e.target.checked,
                  use_ssl: e.target.checked ? false : p.use_ssl,
                }));
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Use TLS (Port 587 recommended)</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={emailForm.use_ssl}
              onChange={(e) => {
                setEmailForm((p) => ({
                  ...p,
                  use_ssl: e.target.checked,
                  use_tls: e.target.checked ? false : p.use_tls,
                }));
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Use SSL (Port 465)</span>
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 cursor-pointer">
            <input
              type="checkbox"
              checked={emailForm.is_active}
              onChange={(e) => setEmailForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Enable System Email Delivery</span>
          </label>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
              </>
            ) : (
              'Save SMTP Settings'
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            disabled={!emailConfig?.configured}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 transition-colors"
          >
            <SendIcon className="h-4 w-4 text-gray-500" /> Send Test Email
          </button>

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckIcon className="h-4 w-4" /> Mail server updated successfully
            </span>
          )}
        </div>

        {emailConfig?.last_tested_at && (
          <p className="text-xs text-gray-400">
            Last successful delivery test: {formatDateTime(emailConfig.last_tested_at)}
          </p>
        )}
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <MailIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Send Test Email</h3>
                <p className="text-xs text-gray-500">Verify SMTP handshake & authentication</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700">Recipient Email</label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {testResult && (
              <div
                className={`mt-4 rounded-lg p-3 text-sm ${
                  testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.success ? testResult.message : testResult.error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testEmailAddress}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {testingEmail ? (
                  <>
                    <LoaderIcon className="mr-1.5 h-4 w-4" /> Sending...
                  </>
                ) : (
                  'Send Test'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
