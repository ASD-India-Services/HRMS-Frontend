import { useState, useEffect, useRef } from 'react';
import { InfoIcon, CheckIcon, LoaderIcon, AlertCircleIcon } from './SettingsIcons';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import { Button, IconButton, Switch } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

// Reusable iOS/Android-style pill toggle switch
function SwitchToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Switch checked={checked} disabled={disabled} onClick={() => onChange(!checked)} />
  );
}

export function GeneralSettingsTab() {
  const { data: settings, isLoading, isError, error } = useHRSettings();
  const updateMutation = useUpdateHRSettings();

  // 1. Announcement expire state
  const [expireDays, setExpireDays] = useState<number>(30);
  const [expireSaving, setExpireSaving] = useState(false);
  const [expireSaved, setExpireSaved] = useState(false);

  // 2. Pagination state
  const [pagination, setPagination] = useState<number>(50);
  const [paginationSaving, setPaginationSaving] = useState(false);
  const [paginationSaved, setPaginationSaved] = useState(false);

  // 3. Employee Account Restrictions state
  const [restrictions, setRestrictions] = useState({
    restrict_login_account: false,
    restrict_profile_edit: false,
    restrict_bank_edit: false,
    restrict_outside_checkin: false,
    allow_employee_password_reset: true,
  });
  const [restrictionsSaving, setRestrictionsSaving] = useState(false);
  const [restrictionsSaved, setRestrictionsSaved] = useState(false);

  // 4. Resignation Request state
  const [resignationRequest, setResignationRequest] = useState<boolean>(false);
  const [resignationSaving, setResignationSaving] = useState(false);
  const [resignationSaved, setResignationSaved] = useState(false);

  // 5. Time Runner (At-Work Tracker) state
  const [atWorkTracker, setAtWorkTracker] = useState<boolean>(true);
  const [timeRunnerSaving, setTimeRunnerSaving] = useState(false);
  const [timeRunnerSaved, setTimeRunnerSaved] = useState(false);

  // 6. Notice Period state
  const [noticePeriod, setNoticePeriod] = useState<number>(30);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);

  // 7. Badge Prefix state
  const [badgePrefix, setBadgePrefix] = useState<string>('PEP');
  const [badgeCompany, setBadgeCompany] = useState<string>('');
  const [badgeSaving, setBadgeSaving] = useState(false);
  const [badgeSaved, setBadgeSaved] = useState(false);

  // 8. Encashment Redeem Condition state
  const [bonusUnit, setBonusUnit] = useState<number>(1);
  const [leaveUnit, setLeaveUnit] = useState<string>('Amount');
  const [encashmentSaving, setEncashmentSaving] = useState(false);
  const [encashmentSaved, setEncashmentSaved] = useState(false);

  // 9. Employee History Tracking state
  const availableHistoryFields = [
    { id: 'department', label: 'Department' },
    { id: 'job_position', label: 'Job Position' },
    { id: 'job_role', label: 'Job Role' },
    { id: 'reporting_manager', label: 'Reporting Manager' },
    { id: 'shift', label: 'Shift' },
    { id: 'work_type', label: 'Work Type' },
    { id: 'employee_type', label: 'Employee Type' },
    { id: 'salary', label: 'Salary' },
    { id: 'branch', label: 'Branch' },
  ];
  const [trackingFields, setTrackingFields] = useState<string[]>([
    'department',
    'job_position',
    'reporting_manager',
  ]);
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setIsHistoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [workInfoTracking, setWorkInfoTracking] = useState<boolean>(false);
  const [historySaving, setHistorySaving] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);

  // 10. Currency state
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');
  const [currencyPosition, setCurrencyPosition] = useState<string>('Postfix');
  const [currencyCompany, setCurrencyCompany] = useState<string>('');
  const [currencySaving, setCurrencySaving] = useState(false);
  const [currencySaved, setCurrencySaved] = useState(false);

  // Synchronize state when settings load
  useEffect(() => {
    if (settings) {
      if (settings.announcement_expire_days !== undefined) {
        setExpireDays(settings.announcement_expire_days);
      }
      if (settings.default_pagination_size !== undefined) {
        setPagination(settings.default_pagination_size);
      }
      if (settings.account_restrictions) {
        setRestrictions({
          restrict_login_account: !!settings.account_restrictions.restrict_login_account,
          restrict_profile_edit: !!settings.account_restrictions.restrict_profile_edit,
          restrict_bank_edit: !!settings.account_restrictions.restrict_bank_edit,
          restrict_outside_checkin: !!settings.account_restrictions.restrict_outside_checkin,
          allow_employee_password_reset: settings.account_restrictions.allow_employee_password_reset ?? true,
        });
      }
      if (settings.resignation_request !== undefined) {
        setResignationRequest(!!settings.resignation_request);
      }
      if (settings.at_work_tracker !== undefined) {
        setAtWorkTracker(!!settings.at_work_tracker);
      }
      if (settings.notice_period_days !== undefined) {
        setNoticePeriod(settings.notice_period_days);
      }
      if (settings.badge_prefix !== undefined) {
        setBadgePrefix(settings.badge_prefix || 'PEP');
      }
      const defaultCompany = settings.company_name || 'G7 SYNERGON PVT. LTD. CRO.';
      setBadgeCompany(settings.badge_company || defaultCompany);
      if (settings.encashment_bonus_unit !== undefined) {
        setBonusUnit(Number(settings.encashment_bonus_unit) || 1);
      }
      if (settings.encashment_leave_unit !== undefined) {
        setLeaveUnit(settings.encashment_leave_unit || 'Amount');
      }
      if (Array.isArray(settings.history_tracking_fields) && settings.history_tracking_fields.length > 0) {
        setTrackingFields(settings.history_tracking_fields);
      }
      if (settings.work_information_tracking !== undefined) {
        setWorkInfoTracking(!!settings.work_information_tracking);
      }
      if (settings.currency_symbol !== undefined) {
        setCurrencySymbol(settings.currency_symbol || '₹');
      }
      if (settings.currency_position !== undefined) {
        setCurrencyPosition(settings.currency_position || 'Postfix');
      }
      setCurrencyCompany(settings.currency_company || defaultCompany);
    }
  }, [settings]);

  // Save 1. Announcement Expiry Days
  const handleSaveExpireDays = async () => {
    setExpireSaving(true);
    setExpireSaved(false);
    try {
      await updateMutation.mutateAsync({
        announcement_expire_days: Number(expireDays) || 30,
      });
      setExpireSaved(true);
      setTimeout(() => setExpireSaved(false), 3000);
    } finally {
      setExpireSaving(false);
    }
  };

  // Save 2. Pagination
  const handleSavePagination = async () => {
    setPaginationSaving(true);
    setPaginationSaved(false);
    try {
      await updateMutation.mutateAsync({
        default_pagination_size: Number(pagination) || 50,
      });
      setPaginationSaved(true);
      setTimeout(() => setPaginationSaved(false), 3000);
    } finally {
      setPaginationSaving(false);
    }
  };

  // Save 3. Account Restrictions (instant toggle with state persistence)
  const handleToggleRestriction = async (key: keyof typeof restrictions) => {
    const nextRestrictions = { ...restrictions, [key]: !restrictions[key] };
    setRestrictions(nextRestrictions);
    setRestrictionsSaving(true);
    try {
      await updateMutation.mutateAsync({
        account_restrictions: nextRestrictions,
      });
      setRestrictionsSaved(true);
      setTimeout(() => setRestrictionsSaved(false), 2500);
    } finally {
      setRestrictionsSaving(false);
    }
  };

  // Save 4. Resignation Request
  const handleToggleResignation = async (nextVal: boolean) => {
    setResignationRequest(nextVal);
    setResignationSaving(true);
    try {
      await updateMutation.mutateAsync({
        resignation_request: nextVal,
      });
      setResignationSaved(true);
      setTimeout(() => setResignationSaved(false), 2500);
    } finally {
      setResignationSaving(false);
    }
  };

  // Save 5. Time Runner (At-Work Tracker)
  const handleToggleTimeRunner = async (nextVal: boolean) => {
    setAtWorkTracker(nextVal);
    setTimeRunnerSaving(true);
    try {
      await updateMutation.mutateAsync({
        at_work_tracker: nextVal,
      });
      setTimeRunnerSaved(true);
      setTimeout(() => setTimeRunnerSaved(false), 2500);
    } finally {
      setTimeRunnerSaving(false);
    }
  };

  // Save 6. Notice Period
  const handleSaveNoticePeriod = async () => {
    setNoticeSaving(true);
    setNoticeSaved(false);
    try {
      await updateMutation.mutateAsync({
        notice_period_days: Number(noticePeriod) || 30,
      });
      setNoticeSaved(true);
      setTimeout(() => setNoticeSaved(false), 3000);
    } finally {
      setNoticeSaving(false);
    }
  };

  // Save 7. Badge Prefix
  const handleSaveBadgePrefix = async () => {
    setBadgeSaving(true);
    setBadgeSaved(false);
    try {
      await updateMutation.mutateAsync({
        badge_prefix: badgePrefix.trim(),
        badge_company: badgeCompany,
      });
      setBadgeSaved(true);
      setTimeout(() => setBadgeSaved(false), 3000);
    } finally {
      setBadgeSaving(false);
    }
  };

  // Save 8. Encashment Redeem Condition
  const handleSaveEncashment = async () => {
    setEncashmentSaving(true);
    setEncashmentSaved(false);
    try {
      await updateMutation.mutateAsync({
        encashment_bonus_unit: Number(bonusUnit) || 1,
        encashment_leave_unit: leaveUnit || 'Amount',
      });
      setEncashmentSaved(true);
      setTimeout(() => setEncashmentSaved(false), 3000);
    } finally {
      setEncashmentSaving(false);
    }
  };

  // Save 9. Employee History Tracking
  const handleToggleTrackingField = (fieldId: string) => {
    setTrackingFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSaveHistoryTracking = async () => {
    setHistorySaving(true);
    setHistorySaved(false);
    try {
      await updateMutation.mutateAsync({
        history_tracking_fields: trackingFields,
        work_information_tracking: workInfoTracking,
      });
      setHistorySaved(true);
      setTimeout(() => setHistorySaved(false), 3000);
    } finally {
      setHistorySaving(false);
    }
  };

  const handleToggleWorkInfo = async (nextVal: boolean) => {
    setWorkInfoTracking(nextVal);
    try {
      await updateMutation.mutateAsync({
        work_information_tracking: nextVal,
      });
    } catch {
      // Handled by query
    }
  };

  // Save 10. Currency
  const handleSaveCurrency = async () => {
    setCurrencySaving(true);
    setCurrencySaved(false);
    try {
      await updateMutation.mutateAsync({
        currency_symbol: currencySymbol.trim() || '₹',
        currency_position: currencyPosition,
        currency_company: currencyCompany,
      });
      setCurrencySaved(true);
      setTimeout(() => setCurrencySaved(false), 3000);
    } finally {
      setCurrencySaving(false);
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
        <p className="mt-2 text-sm text-error-dark">Failed to load general settings: {(error as Error)?.message}</p>
      </div>
    );
  }

  const companyDisplayName = settings?.company_name || 'G7 SYNERGON PVT. LTD. CRO.';

  return (
    <div className="space-y-10 divide-y divide-divider">
      {/* ─── 1. Announcement Expire ────────────────────────────────────── */}
      <section className="space-y-4 pt-1 first:pt-0">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Announcement Expire</h2>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Default Expire Days</span>
            <span
              title="Number of days an announcement or company notice remains visible before automatically expiring"
              className="cursor-help text-ink-disabled hover:text-ink-secondary"
            >
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <Input
              type="number"
              min={1}
              max={365}
              value={expireDays}
              onChange={(e) => setExpireDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-48"
            />
            <Button
              type="button"
              onClick={handleSaveExpireDays}
              disabled={expireSaving}
            >
              {expireSaving ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>

            {expireSaved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ─── 2. Default Records Per Page ───────────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Default Records Per Page</h2>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Pagination</span>
            <span
              title="Default number of rows displayed per page across data tables (e.g. 10, 25, 50, 100)"
              className="cursor-help text-ink-disabled hover:text-ink-secondary"
            >
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <div className="relative w-48">
              <Input
                type="number"
                min={5}
                max={500}
                value={pagination}
                onChange={(e) => setPagination(Math.max(5, parseInt(e.target.value, 10) || 5))}
              />
            </div>
            <Button
              type="button"
              onClick={handleSavePagination}
              disabled={paginationSaving}
            >
              {paginationSaving ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>

            {paginationSaved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-secondary">
            Quick presets:
            {[10, 25, 50, 100].map((preset) => (
              <Button
                key={preset}
                variant="text"
                color={pagination === preset ? 'primary' : 'inherit'}
                size="small"
                onClick={() => setPagination(preset)}
                className="ml-2"
              >
                {preset}
              </Button>
            ))}
          </p>
        </div>
      </section>

      {/* ─── 3. Employee Account Restrictions ──────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Employee Account Restrictions</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pt-1">
          {/* Restrict Login Account */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Restrict Login Account</span>
              <span
                title="Prevent inactive, contract-ended, or restricted employees from accessing the portal"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle
                checked={restrictions.restrict_login_account}
                onChange={() => handleToggleRestriction('restrict_login_account')}
                disabled={restrictionsSaving}
              />
            </div>
          </div>

          {/* Restrict Profile Edit */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Restrict Profile Edit</span>
              <span
                title="Disallow employees from directly editing personal contact details, address, or profile info"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle
                checked={restrictions.restrict_profile_edit}
                onChange={() => handleToggleRestriction('restrict_profile_edit')}
                disabled={restrictionsSaving}
              />
            </div>
          </div>
        </div>

        {restrictionsSaved && (
          <p className="text-xs font-medium text-success-main flex items-center gap-1">
            <CheckIcon className="h-3.5 w-3.5" /> Restrictions updated
          </p>
        )}
      </section>

      {/* ─── 4. Resignation Request ────────────────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Resignation Request</h2>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Resignation Request</span>
            <span
              title="Allow employees to initiate formal resignation requests and track notice period progress from their self-service dashboard"
              className="cursor-help text-ink-disabled hover:text-ink-secondary"
            >
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>
          <div className="flex items-center gap-3">
            <SwitchToggle
              checked={resignationRequest}
              onChange={handleToggleResignation}
              disabled={resignationSaving}
            />
            {resignationSaved && (
              <span className="text-xs font-medium text-success-main flex items-center gap-1">
                <CheckIcon className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ─── 5. Time Runner (At-Work Tracker) ──────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Time Runner</h2>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
            <span>At-Work Tracker</span>
            <span
              title="Display real-time running workday timer (00:00:00) on top navigation header and attendance records"
              className="cursor-help text-ink-disabled hover:text-ink-secondary"
            >
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>
          <div className="flex items-center gap-3">
            <SwitchToggle
              checked={atWorkTracker}
              onChange={handleToggleTimeRunner}
              disabled={timeRunnerSaving}
            />
            {timeRunnerSaved && (
              <span className="text-xs font-medium text-success-main flex items-center gap-1">
                <CheckIcon className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ─── 6. Notice Period ──────────────────────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Notice Period</h2>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Default Notice Period</span>
            <span
              title="Standard employee notice period in days required upon submitting resignation"
              className="cursor-help text-ink-disabled hover:text-ink-secondary"
            >
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <Input
              type="number"
              min={0}
              max={365}
              value={noticePeriod}
              onChange={(e) => setNoticePeriod(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-48"
            />
            <Button
              type="button"
              onClick={handleSaveNoticePeriod}
              disabled={noticeSaving}
            >
              {noticeSaving ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>

            {noticeSaved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ─── 7. Badge Prefix ───────────────────────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Badge Prefix</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Prefix */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Prefix</span>
              <span
                title="Prefix code used for employee security badges, access passes, and NFC cards"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <Input
              type="text"
              value={badgePrefix}
              onChange={(e) => setBadgePrefix(e.target.value)}
              placeholder="PEP"
              className="mt-2.5"
            />
          </div>

          {/* Company */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Company</span>
              <span
                title="Company entity associated with this badge prefix"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <Select
              value={badgeCompany}
              onChange={(e) => setBadgeCompany(e.target.value)}
              className="mt-2.5"
            >
              <option value={companyDisplayName}>{companyDisplayName}</option>
              <option value="G7 SYNERGON PVT. LTD. CRO.">G7 SYNERGON PVT. LTD. CRO.</option>
              <option value="DigiHRMS Corporate">DigiHRMS Corporate</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <Button
            type="button"
            onClick={handleSaveBadgePrefix}
            disabled={badgeSaving}
          >
            {badgeSaving ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

          {badgeSaved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
              <CheckIcon className="h-4 w-4" /> Saved successfully
            </span>
          )}
        </div>
      </section>

      {/* ─── 8. Encashment Redeem Condition ────────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Encashment Redeem Condition</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Bonus Unit */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Bonus Unit</span>
              <span
                title="Number of bonus points required to redeem leave encashment credit"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <Input
              type="number"
              min={1}
              value={bonusUnit}
              onChange={(e) => setBonusUnit(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="mt-2.5"
            />
          </div>

          {/* Leave Unit */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Leave Unit</span>
              <span
                title="Equivalent leave days or compensation amount granted per bonus point unit"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <Input
              type="text"
              value={leaveUnit}
              onChange={(e) => setLeaveUnit(e.target.value)}
              placeholder="Amount"
              className="mt-2.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <Button
            type="button"
            onClick={handleSaveEncashment}
            disabled={encashmentSaving}
          >
            {encashmentSaving ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

          {encashmentSaved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
              <CheckIcon className="h-4 w-4" /> Saved successfully
            </span>
          )}
        </div>
      </section>

      {/* ─── 9. Employee History Tracking ──────────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Employee History Tracking</h2>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary mb-2">
            <span>Tracking Fields</span>
            <span
              title="Employee profile and employment fields monitored for automated change tracking"
              className="cursor-help text-ink-disabled hover:text-ink-secondary"
            >
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>

          {/* Input & Save Changes row matching screenshot */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
            <div className="relative flex-1 max-w-md" ref={historyDropdownRef}>
              <div
                onClick={() => setIsHistoryDropdownOpen((prev) => !prev)}
                className="min-h-[42px] w-full cursor-pointer rounded-md border border-divider bg-surface-paper px-3 py-1.5 text-sm shadow-xs focus-within:border-primary-main focus-within:ring-1 focus-within:ring-primary-main flex items-center justify-between gap-2"
              >
                <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                  {trackingFields.length === 0 ? (
                    <span className="text-ink-disabled">Select fields to track...</span>
                  ) : (
                    trackingFields.map((fieldId) => {
                      const field = availableHistoryFields.find((f) => f.id === fieldId);
                      return (
                        <span
                          key={fieldId}
                          className="inline-flex items-center gap-1 rounded bg-primary-lighter px-2 py-0.5 text-xs font-medium text-primary-dark border border-primary-light"
                        >
                          {field?.label || fieldId}
                          <IconButton
                            icon="close"
                            size="small"
                            color="primary"
                            aria-label="Remove field"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTrackingField(fieldId);
                            }}
                          />
                        </span>
                      );
                    })
                  )}
                </div>
                <div className="flex flex-col items-center justify-center pl-1 text-ink-disabled shrink-0">
                  <svg className="h-3 w-3 -mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Dropdown list matching screenshot */}
              {isHistoryDropdownOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-divider bg-surface-paper py-1 shadow-lg">
                  {availableHistoryFields.map((field) => {
                    const isSelected = trackingFields.includes(field.id);
                    return (
                      <div
                        key={field.id}
                        onClick={() => handleToggleTrackingField(field.id)}
                        className={`flex cursor-pointer items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary-lighter/70 font-medium text-primary-darker'
                            : 'text-ink-primary hover:bg-surface-neutral'
                        }`}
                      >
                        <span>{field.label}</span>
                        {isSelected && <CheckIcon className="h-4 w-4 text-primary-main" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleSaveHistoryTracking}
              disabled={historySaving}
              className="shrink-0"
            >
              {historySaving ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>

            {historySaved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main self-center">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>
        </div>

        {/* Work Information Tracking Toggle */}
        <div className="pt-4 border-t border-divider space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Work Information Tracking</span>
            <span
              title="Automatically log lifecycle transfers and promotion snapshots whenever work information changes"
              className="cursor-help text-ink-disabled hover:text-ink-secondary"
            >
              <InfoIcon className="h-4 w-4" />
            </span>
          </label>
          <div>
            <SwitchToggle
              checked={workInfoTracking}
              onChange={handleToggleWorkInfo}
            />
          </div>
        </div>
      </section>

      {/* ─── 10. Currency ──────────────────────────────────────────────── */}
      <section className="space-y-4 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Currency</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Currency Symbol */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Currency Symbol</span>
              <span
                title="Primary currency symbol used across payroll, compensation, payslips, and expense reimbursements"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <Input
              type="text"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="₹"
              className="mt-2.5"
            />
          </div>

          {/* Position */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Position</span>
              <span
                title="Whether symbol appears before the amount (Prefix: ₹ 50,000) or after (Postfix: 50,000 ₹)"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <Select
              value={currencyPosition}
              onChange={(e) => setCurrencyPosition(e.target.value)}
              className="mt-2.5"
            >
              <option value="Postfix">Postfix (e.g. 50,000 {currencySymbol})</option>
              <option value="Prefix">Prefix (e.g. {currencySymbol} 50,000)</option>
            </Select>
          </div>

          {/* Company */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Company</span>
              <span
                title="Company entity using this currency configuration"
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <Select
              value={currencyCompany}
              onChange={(e) => setCurrencyCompany(e.target.value)}
              className="mt-2.5"
            >
              <option value={companyDisplayName}>{companyDisplayName}</option>
              <option value="G7 SYNERGON PVT. LTD. CRO.">G7 SYNERGON PVT. LTD. CRO.</option>
              <option value="DigiHRMS Corporate">DigiHRMS Corporate</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <Button
            type="button"
            onClick={handleSaveCurrency}
            disabled={currencySaving}
          >
            {currencySaving ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

          {currencySaved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
              <CheckIcon className="h-4 w-4" /> Saved successfully
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
