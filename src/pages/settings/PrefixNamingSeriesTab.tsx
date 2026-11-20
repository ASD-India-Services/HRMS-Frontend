import { useState, useEffect } from 'react';
import { CheckIcon, LoaderIcon, AlertCircleIcon, HashIcon, SparklesIcon } from './SettingsIcons';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';

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
        <LoaderIcon className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircleIcon className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-sm text-red-700">Failed to load prefixes: {(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Prefixes & Naming Series</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure auto-generated identifier patterns for employees, applicants, leave requests, and claims.
        </p>
      </div>

      {/* Guide Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-xs">
        <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <span className="font-semibold">How placeholder formatting works:</span>
          <p className="mt-0.5 text-amber-800">
            Use <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded text-amber-950">{'{####}'}</code> for zero-padded sequential numbers.
            For example, <code className="font-mono">EMP-{'{####}'}</code> generates <strong className="font-mono">EMP-0001</strong>, <strong className="font-mono">EMP-0002</strong>.
            Adding more hashes increases the padding width: <code className="font-mono">ORG-{'{######}'}</code> generates <strong className="font-mono">ORG-000001</strong>.
          </p>
        </div>
      </div>

      {/* Prefix Fields Grid */}
      <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-xs">
        {PREFIX_FIELDS.map((field) => {
          const currentVal = patterns[field.key] || field.defaultPattern;
          const preview1 = generatePreview(currentVal, 1);
          const preview2 = generatePreview(currentVal, 42);

          return (
            <div key={field.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 items-center">
              <div className="md:col-span-5">
                <div className="flex items-center gap-2">
                  <HashIcon className="h-4 w-4 text-gray-400" />
                  <label className="text-sm font-semibold text-gray-900">{field.label}</label>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>
              </div>

              <div className="md:col-span-4">
                <input
                  type="text"
                  value={currentVal}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.defaultPattern}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 font-mono text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="md:col-span-3 flex items-center justify-end md:justify-start gap-2">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Preview:</span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold text-gray-700">
                    {preview1}
                  </span>
                  <span className="text-gray-300">...</span>
                  <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    {preview2}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {formError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
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
            'Save Changes'
          )}
        </button>

        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckIcon className="h-4 w-4" /> Prefix configurations saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
