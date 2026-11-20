import { useState, useEffect } from 'react';
import { CheckIcon, LoaderIcon, AlertCircleIcon } from './SettingsIcons';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';

export const DATE_FORMAT_OPTIONS = [
  // Dash / Hyphen (-) separated
  { value: 'DD-MM-YYYY', label: 'Day, Month, Year (e.g., 30-12-2023)' },
  { value: 'DD-MM-YY', label: 'Day, Month, Year (e.g., 30-12-23)' },
  { value: 'MM-DD-YYYY', label: 'Month, Day, Year (e.g., 12-30-2023)' },
  { value: 'MM-DD-YY', label: 'Month, Day, Year (e.g., 12-30-23)' },
  { value: 'YYYY-MM-DD', label: 'Year, Month, Day (e.g., 2023-12-30)' },

  // Slash (/) separated
  { value: 'DD/MM/YYYY', label: 'Day, Month, Year (e.g., 30/12/2023)' },
  { value: 'DD/MM/YY', label: 'Day, Month, Year (e.g., 30/12/23)' },
  { value: 'MM/DD/YYYY', label: 'Month, Day, Year (e.g., 12/30/2023)' },
  { value: 'MM/DD/YY', label: 'Month, Day, Year (e.g., 12/30/23)' },
  { value: 'YYYY/MM/DD', label: 'Year, Month, Day (e.g., 2023/12/30)' },

  // Dot (.) separated
  { value: 'DD.MM.YYYY', label: 'Day, Month, Year (e.g., 30.12.2023)' },
  { value: 'DD.MM.YY', label: 'Day, Month, Year (e.g., 30.12.23)' },
  { value: 'MM.DD.YYYY', label: 'Month, Day, Year (e.g., 12.30.2023)' },
  { value: 'MM.DD.YY', label: 'Month, Day, Year (e.g., 12.30.23)' },
  { value: 'YYYY.MM.DD', label: 'Year, Month, Day (e.g., 2023.12.30)' },

  // Short Month Name (e.g., Dec)
  { value: 'DD-MMM-YYYY', label: 'Day, Month Name, Year (e.g., 30-Dec-2023)' },
  { value: 'DD/MMM/YYYY', label: 'Day, Month Name, Year (e.g., 30/Dec/2023)' },
  { value: 'DD.MMM.YYYY', label: 'Day, Month Name, Year (e.g., 30.Dec.2023)' },
  { value: 'DD MMM, YYYY', label: 'Day Month Name, Year (e.g., 30 Dec, 2023)' },
  { value: 'DD MMM YYYY', label: 'Day Month Name Year (e.g., 30 Dec 2023)' },
  { value: 'MMM DD, YYYY', label: 'Month Name Day, Year (e.g., Dec 30, 2023)' },
  { value: 'MMM DD YYYY', label: 'Month Name Day Year (e.g., Dec 30 2023)' },
  { value: 'YYYY-MMM-DD', label: 'Year, Month Name, Day (e.g., 2023-Dec-30)' },

  // Full Month Name (e.g., December)
  { value: 'DD MMMM, YYYY', label: 'Day Month Full Name, Year (e.g., 30 December, 2023)' },
  { value: 'DD MMMM YYYY', label: 'Day Month Full Name Year (e.g., 30 December 2023)' },
  { value: 'MMMM DD, YYYY', label: 'Month Full Name Day, Year (e.g., December 30, 2023)' },
  { value: 'MMMM DD YYYY', label: 'Month Full Name Day Year (e.g., December 30 2023)' },
  { value: 'DD-MMMM-YYYY', label: 'Day, Month Full Name, Year (e.g., 30-December-2023)' },
];

const TIME_FORMAT_OPTIONS = [
  { value: '24h', label: '24 Hr. (e.g., 06:00 or 18:00)' },
  { value: '12h', label: '12 Hr. (e.g., 06:00 AM or 06:00 PM)' },
];

export function DateTimeFormatTab() {
  const { data: settings, isLoading, isError, error } = useHRSettings();
  const updateMutation = useUpdateHRSettings();

  // Selected dropdown values
  const [selectedDateFormat, setSelectedDateFormat] = useState<string>(() => {
    return localStorage.getItem('hrms_date_format') || 'DD/MM/YYYY';
  });
  const [selectedTimeFormat, setSelectedTimeFormat] = useState<string>(() => {
    return localStorage.getItem('hrms_time_format') || '12h';
  });

  // Currently saved display values
  const [currentDateFormat, setCurrentDateFormat] = useState<string>(() => {
    return localStorage.getItem('hrms_date_format') || 'DD/MM/YYYY';
  });
  const [currentTimeFormat, setCurrentTimeFormat] = useState<string>(() => {
    return localStorage.getItem('hrms_time_format') || '12h';
  });

  // Status indicators
  const [savingDate, setSavingDate] = useState(false);
  const [savedDate, setSavedDate] = useState(false);

  const [savingTime, setSavingTime] = useState(false);
  const [savedTime, setSavedTime] = useState(false);

  // Sync state with server
  useEffect(() => {
    if (settings) {
      const serverDate = settings.date_format || localStorage.getItem('hrms_date_format') || 'DD/MM/YYYY';
      setSelectedDateFormat(serverDate);
      setCurrentDateFormat(serverDate);

      const serverTime = settings.time_format || localStorage.getItem('hrms_time_format') || '12h';
      setSelectedTimeFormat(serverTime);
      setCurrentTimeFormat(serverTime);
    }
  }, [settings]);

  // Save Date Format
  const handleSaveDateFormat = async () => {
    setSavingDate(true);
    setSavedDate(false);
    try {
      // 1. Instantly write to localStorage so all components/formatters reflect change immediately
      localStorage.setItem('hrms_date_format', selectedDateFormat);
      try {
        const raw = localStorage.getItem('hrms_cached_settings');
        const parsed = raw ? JSON.parse(raw) : {};
        parsed.date_format = selectedDateFormat;
        localStorage.setItem('hrms_cached_settings', JSON.stringify(parsed));
      } catch {
        // ignore JSON parse error
      }

      // 2. Dispatch events
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('hrms-format-changed', { detail: { date_format: selectedDateFormat } }));

      // 3. Persist to server
      await updateMutation.mutateAsync({
        date_format: selectedDateFormat,
      });
      setCurrentDateFormat(selectedDateFormat);
      setSavedDate(true);
      setTimeout(() => setSavedDate(false), 3000);
    } catch (err) {
      console.error('Failed to save date format:', err);
    } finally {
      setSavingDate(false);
    }
  };

  // Save Time Format
  const handleSaveTimeFormat = async () => {
    setSavingTime(true);
    setSavedTime(false);
    try {
      // 1. Instantly write to localStorage
      localStorage.setItem('hrms_time_format', selectedTimeFormat);
      try {
        const raw = localStorage.getItem('hrms_cached_settings');
        const parsed = raw ? JSON.parse(raw) : {};
        parsed.time_format = selectedTimeFormat;
        localStorage.setItem('hrms_cached_settings', JSON.stringify(parsed));
      } catch {
        // ignore JSON parse error
      }

      // 2. Dispatch events
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('hrms-format-changed', { detail: { time_format: selectedTimeFormat } }));

      // 3. Persist to server
      await updateMutation.mutateAsync({
        time_format: selectedTimeFormat,
      });
      setCurrentTimeFormat(selectedTimeFormat);
      setSavedTime(true);
      setTimeout(() => setSavedTime(false), 3000);
    } catch (err) {
      console.error('Failed to save time format:', err);
    } finally {
      setSavingTime(false);
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
        <p className="mt-2 text-sm text-red-700">Failed to load format settings: {(error as Error)?.message}</p>
      </div>
    );
  }

  // Find human-readable labels for the "Current Format" lines
  const currentDateDisplay =
    DATE_FORMAT_OPTIONS.find((opt) => opt.value === currentDateFormat)?.label ||
    currentDateFormat;

  const currentTimeDisplay =
    TIME_FORMAT_OPTIONS.find((opt) => opt.value === currentTimeFormat)?.label ||
    (currentTimeFormat === '24h'
      ? '24 Hr. (e.g., 06:00 or 18:00)'
      : '12 Hr. (e.g., 06:00 AM or 06:00 PM)');

  return (
    <div className="space-y-10 py-2">
      {/* ─── 1. Date Format Section ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Date Format</h2>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800">
            Select Date Format:
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <div className="w-full max-w-md">
              <select
                value={selectedDateFormat}
                onChange={(e) => setSelectedDateFormat(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveDateFormat}
              disabled={savingDate}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 transition-colors"
            >
              {savingDate ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Date Format'
              )}
            </button>

            {savedDate && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>

          {/* Current Date Format line matching screenshot */}
          <p className="mt-4 text-sm">
            <span className="font-bold text-blue-600">Current Date Format : </span>
            <span className="font-medium text-gray-900 ml-1">{currentDateDisplay}</span>
          </p>
        </div>
      </section>

      {/* ─── Horizontal Divider ──────────────────────────────────────────── */}
      <hr className="my-8 border-gray-200" />

      {/* ─── 2. Time Format Section ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Time Format</h2>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800">
            Select Time Format:
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <div className="w-full max-w-md">
              <select
                value={selectedTimeFormat}
                onChange={(e) => setSelectedTimeFormat(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {TIME_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveTimeFormat}
              disabled={savingTime}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 transition-colors"
            >
              {savingTime ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Time Format'
              )}
            </button>

            {savedTime && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>

          {/* Current Time Format line matching screenshot */}
          <p className="mt-4 text-sm">
            <span className="font-bold text-blue-600">Current Time Format : </span>
            <span className="font-medium text-gray-900 ml-1">{currentTimeDisplay}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
