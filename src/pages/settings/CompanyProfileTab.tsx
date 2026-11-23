import { useState, useEffect } from 'react';
import { CheckIcon, LoaderIcon, AlertCircleIcon, CopyIcon, ExternalLinkIcon } from './SettingsIcons';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function CompanyProfileTab() {
  const { data: settings, isLoading, isError, error } = useHRSettings();
  const updateMutation = useUpdateHRSettings();

  const [form, setForm] = useState({
    company_name: '',
    company_website: '',
    fiscal_year_start: '',
    probation_period_days: 90,
    notice_period_days: 30,
    retirement_age: 60,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const embedCodeSnippet = `<iframe id="hrms-careers-frame" src="${
    typeof window !== 'undefined' ? window.location.origin : ''
  }/careers/embed" width="100%" height="750" style="border:none;width:100%;min-height:700px;overflow:hidden;border-radius:12px;" scrolling="no" title="Careers Portal"></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || '',
        company_website: settings.company_website || '',
        fiscal_year_start: settings.fiscal_year_start || '',
        probation_period_days: settings.probation_period_days || 90,
        notice_period_days: settings.notice_period_days || 30,
        retirement_age: settings.retirement_age || 60,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateMutation.mutateAsync({
        company_name: form.company_name,
        company_website: form.company_website,
        fiscal_year_start: form.fiscal_year_start || null,
        probation_period_days: Number(form.probation_period_days) || 90,
        notice_period_days: Number(form.notice_period_days) || 30,
        retirement_age: Number(form.retirement_age) || 60,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderIcon className="h-8 w-8 text-primary-main" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-error-light bg-error-lighter p-6 text-center">
        <AlertCircleIcon className="mx-auto h-8 w-8 text-error-main" />
        <p className="mt-2 text-sm text-error-dark">Failed to load company profile: {(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-ink-primary">Company Profile &amp; Embed</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          General organization details and careers widget embedding.
        </p>
      </div>

      <div className="rounded-2xl border border-divider bg-surface-paper p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Company Name */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-primary">Company Name</label>
            <Input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
              placeholder="e.g. DigiHRMS Pvt Ltd"
            />
          </div>

          {/* Company Website */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-primary">Company Website</label>
            <Input
              type="text"
              value={form.company_website}
              onChange={(e) => setForm((p) => ({ ...p, company_website: e.target.value }))}
              placeholder="https://company.com"
            />
          </div>

          {/* Fiscal Year Start */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-primary">Fiscal Year Start</label>
            <Input
              type="date"
              value={form.fiscal_year_start}
              onChange={(e) => setForm((p) => ({ ...p, fiscal_year_start: e.target.value }))}
            />
          </div>

          {/* Notice Period */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-primary">Notice Period (Days)</label>
            <Input
              type="number"
              min={0}
              value={form.notice_period_days}
              onChange={(e) => setForm((p) => ({ ...p, notice_period_days: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>

          {/* Probation Period */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-primary">Probation Period (Days)</label>
            <Input
              type="number"
              min={0}
              value={form.probation_period_days}
              onChange={(e) => setForm((p) => ({ ...p, probation_period_days: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>

          {/* Retirement Age */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-primary">Default Retirement Age</label>
            <Input
              type="number"
              min={40}
              max={100}
              value={form.retirement_age}
              onChange={(e) => setForm((p) => ({ ...p, retirement_age: parseInt(e.target.value, 10) || 60 }))}
            />
          </div>
        </div>

        {/* Careers Embed Snippet */}
        <div className="pt-4 border-t border-divider">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-ink-primary">
              Careers Portal Embed Widget
            </label>
            <div className="flex items-center gap-3">
              <a
                href="/careers/embed"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-main hover:text-primary-dark"
              >
                <span>Live Preview</span>
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
              <Button size="small" variant="soft" startIcon={<CopyIcon />} onClick={handleCopyEmbed}>
                {copiedEmbed ? 'Copied' : 'Copy Code'}
              </Button>
            </div>
          </div>
          <Input
            type="text"
            readOnly
            value={embedCodeSnippet}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="font-mono cursor-pointer"
          />
          <p className="mt-1 text-xs text-ink-secondary">
            Copy and paste this HTML snippet into your external website or CMS to embed your open job listings.
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center gap-4">
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

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
              <CheckIcon className="h-4 w-4" /> Company profile updated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
