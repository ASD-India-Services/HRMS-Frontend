import { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import { CheckIcon, LoaderIcon } from './SettingsIcons';

const LOCAL_STORAGE_KEY = 'hrms_track_late_come_early_out';

export function TrackLateComeEarlyOutTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return true;
  });

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (settings && typeof settings.track_late_come_early_out === 'boolean') {
      setEnabled(settings.track_late_come_early_out);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings.track_late_come_early_out));
    }
  }, [settings?.track_late_come_early_out]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggle = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));

    updateSettings.mutate(
      { track_late_come_early_out: nextState },
      {
        onSuccess: () => {
          showNotification(
            nextState
              ? 'Track Late Come Early Out turned ON'
              : 'Track Late Come Early Out turned OFF'
          );
        },
        onError: () => {
          showNotification(
            nextState
              ? 'Track Late Come Early Out turned ON (saved locally)'
              : 'Track Late Come Early Out turned OFF (saved locally)'
          );
        },
      }
    );
  };

  return (
    <div className="space-y-6 py-2">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Track Late Come Early Out</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Enable or disable automatic tracking for late check-in and early check-out.
        </p>
      </div>

      <hr className="border-divider" />

      {/* Main card with ON / OFF button */}
      <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs max-w-2xl">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-ink-primary">Track Late Come Early Out</h3>
            <p className="text-sm text-ink-secondary">
              When turned on, the system monitors employee check-in and check-out punches against shift schedules to automatically flag late arrivals and early departures.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs font-medium text-ink-secondary">Current status:</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  enabled
                    ? 'bg-emerald-100 text-emerald-800'
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
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={isLoading || updateSettings.isPending}
              onClick={handleToggle}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 disabled:opacity-50 ${
                enabled ? 'bg-primary-main' : 'bg-grey-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-surface-paper shadow-md ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackLateComeEarlyOutTab;

