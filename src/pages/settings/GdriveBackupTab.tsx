import { useState, useEffect, useRef } from 'react';
import { InfoIcon, CheckIcon, LoaderIcon, AlertCircleIcon } from './SettingsIcons';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import api from '@/lib/api';
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

export function GdriveBackupTab() {
  const { data: settings, isLoading, isError, error } = useHRSettings();
  const updateMutation = useUpdateHRSettings();

  // Form states matching screenshot
  const [serviceAccountFilename, setServiceAccountFilename] = useState<string>('');
  const [serviceAccountFileData, setServiceAccountFileData] = useState<string>('');
  const [gdriveFolderId, setGdriveFolderId] = useState<string>('');
  const [backupMedia, setBackupMedia] = useState<boolean>(false);
  const [backupDb, setBackupDb] = useState<boolean>(false);
  const [intervalEnabled, setIntervalEnabled] = useState<boolean>(false);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(3600);
  const [fixedEnabled, setFixedEnabled] = useState<boolean>(false);
  const [fixedTime, setFixedTime] = useState<string>('02:00');

  // Action states
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state from loaded settings
  useEffect(() => {
    if (settings?.gdrive_backup_config) {
      const cfg = settings.gdrive_backup_config;
      setServiceAccountFilename(cfg.service_account_filename || '');
      setServiceAccountFileData(cfg.service_account_file_data || '');
      setGdriveFolderId(cfg.gdrive_folder_id || '');
      setBackupMedia(!!cfg.backup_media);
      setBackupDb(!!cfg.backup_db);
      setIntervalEnabled(!!cfg.interval_enabled);
      setIntervalSeconds(cfg.interval_seconds ?? 3600);
      setFixedEnabled(!!cfg.fixed_enabled);
      setFixedTime(cfg.fixed_time || '02:00');
    }
  }, [settings]);

  // Handle service account JSON file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setServiceAccountFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setServiceAccountFileData(content);
    };
    reader.readAsText(file);
  };

  // Clear chosen file
  const handleRemoveFile = () => {
    setServiceAccountFilename('');
    setServiceAccountFileData('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);
    setTestResult(null);

    try {
      await updateMutation.mutateAsync({
        gdrive_backup_config: {
          service_account_filename: serviceAccountFilename,
          service_account_file_data: serviceAccountFileData,
          gdrive_folder_id: gdriveFolderId.trim(),
          backup_media: backupMedia,
          backup_db: backupDb,
          interval_enabled: intervalEnabled,
          interval_seconds: Number(intervalSeconds) || 3600,
          fixed_enabled: fixedEnabled,
          fixed_time: fixedTime,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to save Gdrive Backup settings.');
    } finally {
      setSaving(false);
    }
  };

  // Test connection to Google Drive folder
  const handleTestConnection = async () => {
    if (!gdriveFolderId.trim()) {
      setTestResult({
        status: 'error',
        message: 'Please enter a Gdrive Folder ID before testing.',
      });
      return;
    }
    if (!serviceAccountFilename && !serviceAccountFileData) {
      setTestResult({
        status: 'error',
        message: 'Please choose a Service Account File before testing.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.post('/hr-settings/current/gdrive-backup/test/', {
        gdrive_folder_id: gdriveFolderId.trim(),
        service_account_filename: serviceAccountFilename,
      });
      setTestResult({
        status: 'success',
        message: res.data?.message || 'Connection verified successfully.',
      });
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err?.response?.data?.message || err?.message || 'Verification failed. Check folder permissions.',
      });
    } finally {
      setTesting(false);
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
        <p className="mt-2 text-sm text-error-dark">Failed to load Gdrive settings: {(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* ─── Header matching screenshot ───────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Gdrive Backup</h2>
      </div>

      <hr className="border-divider" />

      {/* ─── Form Fields: 2 Columns matching screenshot ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-7 items-start">
        {/* ── Left Column ── */}
        <div className="space-y-7">
          {/* 1. Service Account File * */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Service Account File *</span>
              <span
                title="Upload Google Cloud service account JSON credentials key file."
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="block w-full text-sm text-ink-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-divider file:text-sm file:font-medium file:bg-surface-neutral file:text-ink-primary hover:file:bg-surface-neutral cursor-pointer"
              />
            </div>

            {serviceAccountFilename && (
              <div className="flex items-center gap-2 text-xs text-ink-secondary bg-surface-neutral border border-divider rounded-md px-3 py-1.5 w-fit">
                <span className="font-medium text-ink-primary">{serviceAccountFilename}</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-error-main hover:text-error-dark font-semibold ml-2"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* 2. Backup Media */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Backup Media</span>
              <span
                title="Enable automated backup of employee profile images, attachments, and media."
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={backupMedia} onChange={setBackupMedia} />
            </div>
          </div>

          {/* 3. Interval */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Interval</span>
              <span
                title="Schedule automated backups at repeating duration intervals (in seconds)."
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={intervalEnabled} onChange={setIntervalEnabled} />
            </div>

            {intervalEnabled && (
              <div className="mt-2.5 rounded-lg border border-divider bg-surface-neutral/70 p-3 space-y-1.5 max-w-sm">
                <label className="block text-xs font-semibold text-ink-primary">
                  Interval Duration (seconds):
                </label>
                <Input
                  type="number"
                  min={60}
                  step={60}
                  value={intervalSeconds}
                  onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                  placeholder="3600"
                />
                <p className="text-[11px] text-ink-secondary">
                  e.g., 3600 = every 1 hour, 86400 = every 24 hours
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-7">
          {/* 1. Gdrive Folder ID * */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Gdrive Folder ID *</span>
              <span
                title="The ID of the target Google Drive folder (the string after /folders/ in the URL)."
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <Input
                type="text"
                value={gdriveFolderId}
                onChange={(e) => setGdriveFolderId(e.target.value)}
                placeholder="Gdrive Folder Id"
              />
            </div>
          </div>

          {/* 2. Backup DB */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Backup DB</span>
              <span
                title="Enable automated database dumps to Google Drive."
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={backupDb} onChange={setBackupDb} />
            </div>
          </div>

          {/* 3. Fixed */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <span>Fixed</span>
              <span
                title="Schedule daily backups at a fixed time (24 Hr format HH:MM)."
                className="cursor-help text-ink-disabled hover:text-ink-secondary"
              >
                <InfoIcon className="h-4 w-4" />
              </span>
            </label>
            <div>
              <SwitchToggle checked={fixedEnabled} onChange={setFixedEnabled} />
            </div>

            {fixedEnabled && (
              <div className="mt-2.5 rounded-lg border border-divider bg-surface-neutral/70 p-3 space-y-1.5 max-w-sm">
                <label className="block text-xs font-semibold text-ink-primary">
                  Fixed Daily Time (HH:MM):
                </label>
                <Input
                  type="time"
                  value={fixedTime}
                  onChange={(e) => setFixedTime(e.target.value)}
                />
                <p className="text-[11px] text-ink-secondary">
                  24-hour time e.g., 02:00 for 2:00 AM
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Status Feedback Banners ───────────────────────────────────────── */}
      {saved && (
        <div className="rounded-md border border-success-light bg-success-lighter px-4 py-3 text-sm text-success-dark flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-success-main shrink-0" />
          <span>Gdrive Backup settings saved successfully.</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-error-light bg-error-lighter px-4 py-3 text-sm text-error-dark flex items-center gap-2">
          <AlertCircleIcon className="h-4 w-4 text-error-main shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {testResult && (
        <div
          className={`rounded-md border px-4 py-3 text-sm flex items-center gap-2 ${
            testResult.status === 'success'
              ? 'border-success-light bg-success-lighter text-success-dark'
              : 'border-warning-light bg-warning-lighter text-warning-dark'
          }`}
        >
          {testResult.status === 'success' ? (
            <CheckIcon className="h-4 w-4 text-success-main shrink-0" />
          ) : (
            <AlertCircleIcon className="h-4 w-4 text-warning-main shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* ─── Bottom Actions matching screenshot ────────────────────────────── */}
      <div className="pt-6 flex flex-wrap items-center justify-end gap-3">
        <Button variant="outlined" color="inherit"
          type="button"
          onClick={handleTestConnection}
          disabled={testing || saving}
        >
          {testing ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 text-primary-main" /> Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>

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
            'Save'
          )}
        </Button>
      </div>
    </div>
  );
}

