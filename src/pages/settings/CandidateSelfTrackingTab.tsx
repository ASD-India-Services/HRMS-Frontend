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

export function CandidateSelfTrackingTab() {
  const [enabled, setEnabled] = useState(true);
  const [showProgression, setShowProgression] = useState(true);
  const [showInterviewDetails, setShowInterviewDetails] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [allowDocUpload, setAllowDocUpload] = useState(true);
  const [expirationDays, setExpirationDays] = useState(45);
  const [portalUrl] = useState(`${window.location.origin}/candidate-portal/tracking`);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  return (
    <div className="space-y-6 py-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Candidate Self Tracking</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Configure the public candidate self-service portal where applicants can track their job application progression.
        </p>
      </div>

      <hr className="border-divider" />

      {/* Portal Link Banner */}
      <div className="rounded-xl border border-primary-light bg-primary-lighter/60 p-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-primary-darker mb-1">
          Candidate Portal Public Tracking URL
        </label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            type="text"
            readOnly
            value={portalUrl}
            className="font-mono"
          />
          <Button
            type="button"
            onClick={handleCopyLink}
          >
            <CopyIcon className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7 pt-2">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Enable Candidate Self Tracking Portal</span>
              <span title="Allow applicants to view their current application status online." className="cursor-help text-ink-disabled hover:text-ink-secondary">
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={enabled} onChange={setEnabled} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Show Pipeline Stage Progression</span>
              <span title="Expose the current recruitment stage (e.g., Shortlisted, Interview, Offer)." className="cursor-help text-ink-disabled hover:text-ink-secondary">
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={showProgression} onChange={setShowProgression} disabled={!enabled} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Show Interview Schedule & Meeting Details</span>
              <span title="Display scheduled interview date, time, and online video meeting URL." className="cursor-help text-ink-disabled hover:text-ink-secondary">
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={showInterviewDetails} onChange={setShowInterviewDetails} disabled={!enabled} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Allow Candidate Document Upload</span>
              <span title="Allow candidates to upload revised resumes, identity proof, or certifications." className="cursor-help text-ink-disabled hover:text-ink-secondary">
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={allowDocUpload} onChange={setAllowDocUpload} disabled={!enabled} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Show Interview Rating to Candidate</span>
              <span title="Make interviewer score cards and numerical ratings visible to applicant." className="cursor-help text-ink-disabled hover:text-ink-secondary">
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={showRating} onChange={setShowRating} disabled={!enabled} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Tracking Link Validity (Days)</span>
              <span title="Number of days the self-tracking link remains active after application closing." className="cursor-help text-ink-disabled hover:text-ink-secondary">
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <Input
                type="number"
                min={1}
                max={365}
                value={expirationDays}
                onChange={(e) => setExpirationDays(Number(e.target.value))}
                className="w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {saved && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Candidate Self Tracking configuration saved successfully.</span>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-6 flex justify-end">
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

