import { useState, useEffect } from 'react';
import { CheckIcon, LoaderIcon, AlertCircleIcon } from './SettingsIcons';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

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
  const [selectedDateFormat, setSelectedDateFormat] = useState<string>('DD-MM-YYYY');
  const [selectedTimeFormat, setSelectedTimeFormat] = useState<string>('24h');

  // Currently saved display values
  const [currentDateFormat, setCurrentDateFormat] = useState<string>('DD-MM-YYYY');
  const [currentTimeFormat, setCurrentTimeFormat] = useState<string>('24h');

  // Status indicators
  const [savingDate, setSavingDate] = useState(false);
  const [savedDate, setSavedDate] = useState(false);

  const [savingTime, setSavingTime] = useState(false);
  const [savedTime, setSavedTime] = useState(false);

  // Sync state with server
  useEffect(() => {
    if (settings) {
      const serverDate = settings.date_format || 'DD-MM-YYYY';
      setSelectedDateFormat(serverDate);
      setCurrentDateFormat(serverDate);

      const serverTime = settings.time_format || '24h';
      setSelectedTimeFormat(serverTime);
      setCurrentTimeFormat(serverTime);
    }
  }, [settings]);

  // Save Date Format
  const handleSaveDateFormat = async () => {
    setSavingDate(true);
    setSavedDate(false);
    try {
      await updateMutation.mutateAsync({
        date_format: selectedDateFormat,
      });
      setCurrentDateFormat(selectedDateFormat);
      setSavedDate(true);
      setTimeout(() => setSavedDate(false), 3000);
    } finally {
      setSavingDate(false);
    }
  };

  // Save Time Format
  const handleSaveTimeFormat = async () => {
    setSavingTime(true);
    setSavedTime(false);
    try {
      await updateMutation.mutateAsync({
        time_format: selectedTimeFormat,
      });
      setCurrentTimeFormat(selectedTimeFormat);
      setSavedTime(true);
      setTimeout(() => setSavedTime(false), 3000);
    } finally {
      setSavingTime(false);
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
        <p className="mt-2 text-sm text-error-dark">Failed to load format settings: {(error as Error)?.message}</p>
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
          <h2 className="text-lg font-semibold text-ink-primary">Date Format</h2>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-primary">
            Select Date Format:
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <div className="w-full max-w-md">
              <Select
                value={selectedDateFormat}
                onChange={(e) => setSelectedDateFormat(e.target.value)}
              >
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleSaveDateFormat}
              disabled={savingDate}
            >
              {savingDate ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Date Format'
              )}
            </Button>

            {savedDate && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>

          {/* Current Date Format line matching screenshot */}
          <p className="mt-4 text-sm">
            <span className="font-bold text-primary-main">Current Date Format : </span>
            <span className="font-medium text-ink-primary ml-1">{currentDateDisplay}</span>
          </p>
        </div>
      </section>

      {/* ─── Horizontal Divider ──────────────────────────────────────────── */}
      <hr className="my-8 border-divider" />

      {/* ─── 2. Time Format Section ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Time Format</h2>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-primary">
            Select Time Format:
          </label>

          <div className="mt-2.5 flex flex-wrap items-center gap-4">
            <div className="w-full max-w-md">
              <Select
                value={selectedTimeFormat}
                onChange={(e) => setSelectedTimeFormat(e.target.value)}
              >
                {TIME_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleSaveTimeFormat}
              disabled={savingTime}
            >
              {savingTime ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Time Format'
              )}
            </Button>

            {savedTime && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>

          {/* Current Time Format line matching screenshot */}
          <p className="mt-4 text-sm">
            <span className="font-bold text-primary-main">Current Time Format : </span>
            <span className="font-medium text-ink-primary ml-1">{currentTimeDisplay}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
