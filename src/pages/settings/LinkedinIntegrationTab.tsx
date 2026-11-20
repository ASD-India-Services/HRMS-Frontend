import { useState } from 'react';
import { InfoIcon, CheckIcon, LoaderIcon, CopyIcon } from './SettingsIcons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function SwitchToggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-main/30 ${
        checked ? 'bg-primary-main' : 'bg-grey-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-paper shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function LinkedinIntegrationTab() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [applyWithLinkedin, setApplyWithLinkedin] = useState(true);
  const [autoPostJobs, setAutoPostJobs] = useState(false);
  const [syncInMail, setSyncInMail] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const redirectUri = `${window.location.origin}/api/v1/auth/linkedin/callback`;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      if (clientId && clientSecret) {
        setIsConnected(true);
      }
      setTimeout(() => setSaved(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Linkedin Integration</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Connect LinkedIn Recruiter &amp; Talent Solutions API to distribute job vacancies and source candidates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {isConnected ? 'LinkedIn Connected' : 'Not Configured'}
          </span>
        </div>
      </div>

      <hr className="border-divider" />

      {/* Redirect URI Guidance */}
      <div className="rounded-xl border border-divider bg-surface-neutral p-4 space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary">
          Authorized Redirect URI (Enter in LinkedIn Developer Portal)
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            readOnly
            value={redirectUri}
            className="font-mono"
          />
          <Button variant="outlined" color="inherit"
            type="button"
            onClick={handleCopyUri}
          >
            <CopyIcon className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="text-xs text-ink-secondary">
          Add this redirect URI to your LinkedIn App under <strong>Auth &gt; OAuth 2.0 settings</strong>.
        </p>
      </div>

      {/* API Credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
            <span>LinkedIn Client ID *</span>
            <span title="Your LinkedIn Application Client ID." className="cursor-help text-ink-disabled hover:text-ink-secondary">
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>
          <Input
            type="text"
            placeholder="e.g. 77x1y2z3a4b5"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
            <span>LinkedIn Client Secret *</span>
            <span title="Your LinkedIn Application Secret Key." className="cursor-help text-ink-disabled hover:text-ink-secondary">
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              placeholder="••••••••••••••••••••••••"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
            >
              {showSecret ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="pt-4 border-t border-divider space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink-secondary">Sync &amp; Apply Features</h3>

        <div className="flex items-center justify-between max-w-xl">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Enable "Apply with LinkedIn"</p>
            <p className="text-xs text-ink-secondary">Allow candidates on the careers page to autofill applications using LinkedIn.</p>
          </div>
          <SwitchToggle checked={applyWithLinkedin} onChange={setApplyWithLinkedin} />
        </div>

        <div className="flex items-center justify-between max-w-xl">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Automated Job Postings</p>
            <p className="text-xs text-ink-secondary">Automatically broadcast newly published openings to LinkedIn Jobs.</p>
          </div>
          <SwitchToggle checked={autoPostJobs} onChange={setAutoPostJobs} />
        </div>

        <div className="flex items-center justify-between max-w-xl">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Recruiter System Connect (RSC)</p>
            <p className="text-xs text-ink-secondary">Sync recruiter notes and candidate InMails directly with HRMS profiles.</p>
          </div>
          <SwitchToggle checked={syncInMail} onChange={setSyncInMail} />
        </div>
      </div>

      {saved && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>LinkedIn integration settings saved successfully.</span>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-6 flex justify-end gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}

