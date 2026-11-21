import { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import { CheckIcon, LoaderIcon } from './SettingsIcons';
import { Switch } from '@/components/ui/Button';

const LOCAL_STORAGE_KEY = 'hrms_restrict_past_leave';

export function RestrictPastLeaveTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return false;
  });

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (settings && typeof settings.restrict_past_leave === 'boolean') {
      setEnabled(settings.restrict_past_leave);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings.restrict_past_leave));
    }
  }, [settings?.restrict_past_leave]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggle = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));

    updateSettings.mutate(
      { restrict_past_leave: nextState },
      {
        onSuccess: () => {
          showNotification(
            nextState
              ? 'Restrict Past Leave turned ON'
              : 'Restrict Past Leave turned OFF'
          );
        },
        onError: () => {
          showNotification(
            nextState
              ? 'Restrict Past Leave turned ON (saved locally)'
              : 'Restrict Past Leave turned OFF (saved locally)'
          );
        },
      }
    );
  };

  return (
    <div className="space-y-6 py-2">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-ink-primary">Restrict Past Leave</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Restricts Past Date Leave Request Creation
        </p>
      </div>

      <hr className="border-divider" />

      {/* Main card with ON / OFF button */}
      <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs max-w-2xl">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-ink-primary">Restrict Past Leave</h3>
            <p className="text-sm text-ink-secondary">
              When turned on, employees will be restricted from selecting past dates when creating new leave requests.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs font-medium text-ink-secondary">Current status:</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  enabled
                    ? 'bg-success-lighter text-success-dark'
                    : 'bg-surface-neutral text-ink-secondary'
                }`}
              >
                {enabled ? 'ON (Active)' : 'OFF (Disabled)'}
              </span>
            </div>
          </div>

          {/* Toggle button - Only ON and OFF */}
          <div className="flex items-center gap-3 shrink-0">
            {updateSettings.isPending && (
              <LoaderIcon className="h-4 w-4 animate-spin text-primary-main" />
            )}
            <Switch checked={enabled} disabled={isLoading || updateSettings.isPending} onClick={handleToggle} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestrictPastLeaveTab;

