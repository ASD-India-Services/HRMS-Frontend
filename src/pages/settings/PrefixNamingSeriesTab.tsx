import { useState, useEffect } from 'react';
import { CheckIcon, LoaderIcon, AlertCircleIcon, HashIcon, SparklesIcon } from './SettingsIcons';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface PrefixFieldDef {
  key: string;
  label: string;
  description: string;
  defaultPattern: string;
}

const PREFIX_FIELDS: PrefixFieldDef[] = [
  {
    key: 'employee',
    label: 'Employee ID Series',
    description: 'Auto-generated unique identifier for new employees',
    defaultPattern: 'EMP-{####}',
  },
  {
    key: 'applicant',
    label: 'Job Applicant Series',
    description: 'Candidate application tracking identifier',
    defaultPattern: 'APP-{####}',
  },
  {
    key: 'job_opening',
    label: 'Job Opening Code',
    description: 'Public job requisition and recruitment opening code',
    defaultPattern: 'JOB-{####}',
  },
  {
    key: 'expense',
    label: 'Expense Claim Series',
    description: 'Claim tracking reference number for reimbursements',
    defaultPattern: 'EXP-{####}',
  },
  {
    key: 'leave',
    label: 'Leave Application Series',
    description: 'Reference number for employee leave requests',
    defaultPattern: 'LEV-{####}',
  },
  {
    key: 'training',
    label: 'Training Program Series',
    description: 'Identifier for company workshops and courses',
    defaultPattern: 'TRN-{####}',
  },
  {
    key: 'grievance',
    label: 'Grievance Ticket Series',
    description: 'Confidential tracking code for employee grievances',
    defaultPattern: 'GRV-{####}',
  },
];

function generatePreview(pattern: string, sampleNum = 1): string {
  if (!pattern) return 'N/A';
  const match = pattern.match(/\{(#+)\}/);
  if (!match) return `${pattern}${String(sampleNum).padStart(4, '0')}`;
  const hashCount = match[1].length;
  const prefix = pattern.substring(0, match.index);
  const suffix = pattern.substring((match.index || 0) + match[0].length);
  return `${prefix}${String(sampleNum).padStart(hashCount, '0')}${suffix}`;
}

export function PrefixNamingSeriesTab() {
  const { data: settings, isLoading, isError, error } = useHRSettings();
  const updateMutation = useUpdateHRSettings();

  const [patterns, setPatterns] = useState<Record<string, string>>({
    employee: 'EMP-{####}',
    applicant: 'APP-{####}',
    job_opening: 'JOB-{####}',
    expense: 'EXP-{####}',
    leave: 'LEV-{####}',
    training: 'TRN-{####}',
    grievance: 'GRV-{####}',
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      const config = settings.naming_series_config || {};
      setPatterns({
        employee: settings.employee_naming_series || config.employee || 'EMP-{####}',
        applicant: config.applicant || 'APP-{####}',
        job_opening: config.job_opening || 'JOB-{####}',
        expense: config.expense || 'EXP-{####}',
        leave: config.leave || 'LEV-{####}',
        training: config.training || 'TRN-{####}',
        grievance: config.grievance || 'GRV-{####}',
      });
    }
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setPatterns((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    // Validate each pattern has placeholder
    for (const [key, pat] of Object.entries(patterns)) {
      if (pat && !pat.includes('{') && !pat.includes('#')) {
        setFormError(`Pattern for ${key} must include a sequential placeholder like {####}`);
        return;
      }
    }

    setSaving(true);
    setSaved(false);
    try {
      await updateMutation.mutateAsync({
        employee_naming_series: patterns.employee || 'EMP-{####}',
        naming_series_config: patterns,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save naming series');
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
        <p className="mt-2 text-sm text-error-dark">Failed to load prefixes: {(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-ink-primary">Prefixes & Naming Series</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Configure auto-generated identifier patterns for employees, applicants, leave requests, and claims.
        </p>
      </div>

      {/* Guide Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-warning-light bg-warning-lighter/70 p-4 text-xs text-warning-darker shadow-xs">
        <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning-main" />
        <div>
          <span className="font-semibold">How placeholder formatting works:</span>
          <p className="mt-0.5 text-warning-dark">
            Use <code className="font-mono font-bold bg-warning-lighter px-1 py-0.5 rounded text-warning-darker">{'{####}'}</code> for zero-padded sequential numbers.
            For example, <code className="font-mono">EMP-{'{####}'}</code> generates <strong className="font-mono">EMP-0001</strong>, <strong className="font-mono">EMP-0002</strong>.
            Adding more hashes increases the padding width: <code className="font-mono">ORG-{'{######}'}</code> generates <strong className="font-mono">ORG-000001</strong>.
          </p>
        </div>
      </div>

      {/* Prefix Fields Grid */}
      <div className="divide-y divide-divider rounded-2xl border border-divider bg-surface-paper shadow-xs">
        {PREFIX_FIELDS.map((field) => {
          const currentVal = patterns[field.key] || field.defaultPattern;
          const preview1 = generatePreview(currentVal, 1);
          const preview2 = generatePreview(currentVal, 42);

          return (
            <div key={field.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 items-center">
              <div className="md:col-span-5">
                <div className="flex items-center gap-2">
                  <HashIcon className="h-4 w-4 text-ink-disabled" />
                  <label className="text-sm font-semibold text-ink-primary">{field.label}</label>
                </div>
                <p className="mt-0.5 text-xs text-ink-secondary">{field.description}</p>
              </div>

              <div className="md:col-span-4">
                <Input
                  type="text"
                  value={currentVal}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.defaultPattern}
                  className="font-mono"
                />
              </div>

              <div className="md:col-span-3 flex items-center justify-end md:justify-start gap-2">
                <span className="text-[11px] font-medium text-ink-disabled uppercase tracking-wider">Preview:</span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="rounded-md border border-divider bg-surface-neutral px-2.5 py-1 font-semibold text-ink-primary">
                    {preview1}
                  </span>
                  <span className="text-grey-300">...</span>
                  <span className="rounded-md border border-primary-light bg-primary-lighter px-2.5 py-1 font-semibold text-primary-dark">
                    {preview2}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {formError && (
        <div className="rounded-lg bg-error-lighter p-3 text-sm text-error-dark">
          {formError}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
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
            <CheckIcon className="h-4 w-4" /> Prefix configurations saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
