import { HRMSTable } from '@/components/DataTable/HRMSTable';
import React, { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { DefaultGraceTimeConfig, GraceTimeRecordItem } from '@/hooks/useHRSettings';
import { PlusIcon, CheckIcon, LoaderIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton, Switch } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const DEFAULT_GRACE_TIME_STORAGE_KEY = 'hrms_default_grace_time';
const GRACE_TIME_RECORDS_STORAGE_KEY = 'hrms_grace_time_records';

const INITIAL_DEFAULT_GRACE_TIME: DefaultGraceTimeConfig = {
  allowed_time: '00:10:00 Hours',
  is_active: true,
  applicable_clock_in: true,
  applicable_clock_out: true,
};

const INITIAL_GRACE_TIME_RECORDS: GraceTimeRecordItem[] = [
  {
    id: '1',
    allowed_time: '00:15:00 Hours',
    is_active: true,
    applicable_clock_in: true,
    applicable_clock_out: true,
    assigned_shifts: 'General shift',
  },
];

const SHIFT_OPTIONS = ['General shift', 'Morning Shift', 'Evening Shift', 'Night Shift', 'Rotational Shift', 'Flexible Shift'];

export function GraceTimeTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  // ─── Default Grace Time State ─────────────────────────────
  const [defaultGraceTime, setDefaultGraceTime] = useState<DefaultGraceTimeConfig>(() => {
    try {
      const saved = localStorage.getItem(DEFAULT_GRACE_TIME_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...INITIAL_DEFAULT_GRACE_TIME, ...parsed };
      }
    } catch {
      // fallback
    }
    return INITIAL_DEFAULT_GRACE_TIME;
  });

  // ─── Shift-Specific Grace Time Records State ───────────────
  const [records, setRecords] = useState<GraceTimeRecordItem[]>(() => {
    try {
      const saved = localStorage.getItem(GRACE_TIME_RECORDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_GRACE_TIME_RECORDS;
  });

  // Modal states
  const [editDefaultModalOpen, setEditDefaultModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GraceTimeRecordItem | null>(null);

  // Form states for Default Grace Time modal
  const [formDefaultAllowedTime, setFormDefaultAllowedTime] = useState('');
  const [formDefaultIsActive, setFormDefaultIsActive] = useState(true);
  const [formDefaultClockIn, setFormDefaultClockIn] = useState(true);
  const [formDefaultClockOut, setFormDefaultClockOut] = useState(true);

  // Form states for Grace Time Record modal
  const [formRecordAllowedTime, setFormRecordAllowedTime] = useState('');
  const [formRecordIsActive, setFormRecordIsActive] = useState(true);
  const [formRecordClockIn, setFormRecordClockIn] = useState(true);
  const [formRecordClockOut, setFormRecordClockOut] = useState(true);
  const [formRecordAssignedShift, setFormRecordAssignedShift] = useState('General shift');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  // Sync from backend
  useEffect(() => {
    if (settings?.default_grace_time && Object.keys(settings.default_grace_time).length > 0) {
      const merged = { ...INITIAL_DEFAULT_GRACE_TIME, ...settings.default_grace_time };
      setDefaultGraceTime(merged);
      localStorage.setItem(DEFAULT_GRACE_TIME_STORAGE_KEY, JSON.stringify(merged));
    }
    if (settings?.grace_time_records && Array.isArray(settings.grace_time_records) && settings.grace_time_records.length > 0) {
      setRecords(settings.grace_time_records);
      localStorage.setItem(GRACE_TIME_RECORDS_STORAGE_KEY, JSON.stringify(settings.grace_time_records));
    }
  }, [settings?.default_grace_time, settings?.grace_time_records]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // ─── Default Grace Time Handlers ──────────────────────────
  const saveDefaultGraceTime = (updated: DefaultGraceTimeConfig, msg: string) => {
    setDefaultGraceTime(updated);
    localStorage.setItem(DEFAULT_GRACE_TIME_STORAGE_KEY, JSON.stringify(updated));
    updateSettings.mutate(
      { default_grace_time: updated },
      {
        onSuccess: () => showNotification(msg),
        onError: () => showNotification(`${msg} (saved locally)`),
      }
    );
  };

  const handleOpenEditDefault = () => {
    setFormDefaultAllowedTime(defaultGraceTime.allowed_time || '00:10:00 Hours');
    setFormDefaultIsActive(defaultGraceTime.is_active ?? true);
    setFormDefaultClockIn(defaultGraceTime.applicable_clock_in ?? true);
    setFormDefaultClockOut(defaultGraceTime.applicable_clock_out ?? true);
    setEditDefaultModalOpen(true);
  };

  const handleSaveDefault = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DefaultGraceTimeConfig = {
      allowed_time: formDefaultAllowedTime.trim() || '00:10:00 Hours',
      is_active: formDefaultIsActive,
      applicable_clock_in: formDefaultClockIn,
      applicable_clock_out: formDefaultClockOut,
    };
    saveDefaultGraceTime(updated, 'Default grace time updated successfully');
    setEditDefaultModalOpen(false);
  };

  const handleToggleDefault = (field: 'is_active' | 'applicable_clock_in' | 'applicable_clock_out') => {
    const nextVal = !defaultGraceTime[field];
    const updated: DefaultGraceTimeConfig = {
      ...defaultGraceTime,
      [field]: nextVal,
    };
    const fieldNames: Record<string, string> = {
      is_active: 'Default grace time active status',
      applicable_clock_in: 'Applicable on clock-in',
      applicable_clock_out: 'Applicable on clock-out',
    };
    saveDefaultGraceTime(updated, `${fieldNames[field]} ${nextVal ? 'enabled' : 'disabled'}`);
  };

  // ─── Shift-Specific Grace Time Records Handlers ───────────
  const saveRecords = (newRecords: GraceTimeRecordItem[], msg: string) => {
    setRecords(newRecords);
    localStorage.setItem(GRACE_TIME_RECORDS_STORAGE_KEY, JSON.stringify(newRecords));
    updateSettings.mutate(
      { grace_time_records: newRecords },
      {
        onSuccess: () => showNotification(msg),
        onError: () => showNotification(`${msg} (saved locally)`),
      }
    );
  };

  const handleOpenCreateRecord = () => {
    setEditingRecord(null);
    setFormRecordAllowedTime('00:15:00 Hours');
    setFormRecordIsActive(true);
    setFormRecordClockIn(true);
    setFormRecordClockOut(true);
    setFormRecordAssignedShift('General shift');
    setRecordModalOpen(true);
  };

  const handleOpenEditRecord = (record: GraceTimeRecordItem) => {
    setEditingRecord(record);
    setFormRecordAllowedTime(record.allowed_time);
    setFormRecordIsActive(record.is_active);
    setFormRecordClockIn(record.applicable_clock_in);
    setFormRecordClockOut(record.applicable_clock_out);
    setFormRecordAssignedShift(record.assigned_shifts || 'General shift');
    setRecordModalOpen(true);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecordAllowedTime.trim()) return;

    if (editingRecord) {
      const updated = records.map((r) =>
        r.id === editingRecord.id
          ? {
              ...r,
              allowed_time: formRecordAllowedTime.trim(),
              is_active: formRecordIsActive,
              applicable_clock_in: formRecordClockIn,
              applicable_clock_out: formRecordClockOut,
              assigned_shifts: formRecordAssignedShift,
            }
          : r
      );
      saveRecords(updated, 'Grace time rule updated successfully');
    } else {
      const newRec: GraceTimeRecordItem = {
        id: Date.now().toString(),
        allowed_time: formRecordAllowedTime.trim(),
        is_active: formRecordIsActive,
        applicable_clock_in: formRecordClockIn,
        applicable_clock_out: formRecordClockOut,
        assigned_shifts: formRecordAssignedShift,
      };
      saveRecords([...records, newRec], 'Grace time rule created successfully');
    }
    setRecordModalOpen(false);
  };

  const handleToggleRecord = (id: string, field: 'is_active' | 'applicable_clock_in' | 'applicable_clock_out') => {
    const updated = records.map((r) => (r.id === id ? { ...r, [field]: !r[field] } : r));
    saveRecords(updated, 'Grace time status updated');
  };

  const confirmDeleteRecord = () => {
    if (!deleteId) return;
    const updated = records.filter((r) => r.id !== deleteId);
    saveRecords(updated, 'Grace time rule deleted');
    setDeleteId(null);
  };

  return (
    <div className="space-y-8 py-2">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          SECTION 1: Default Grace Time
         ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Default Grace Time</h2>
        </div>

        <hr className="border-divider" />

        <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
          <HRMSTable className="min-w-full divide-y divide-divider text-left text-sm">
            <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary w-1/4">
                  Allowed time
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary w-1/6">
                  Is active
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary w-1/5">
                  <div>Applicable on clock-</div>
                  <div>in</div>
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary w-1/5">
                  <div>Applicable on clock-</div>
                  <div>out</div>
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary w-1/6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
              <tr className="hover:bg-surface-neutral/50 transition-colors">
                <td className="px-6 py-4 font-medium text-ink-primary">
                  {defaultGraceTime.allowed_time || '00:10:00 Hours'}
                </td>
                <td className="px-6 py-4">
                  <Switch checked={!!defaultGraceTime.is_active} onClick={() => handleToggleDefault('is_active')} />
                </td>
                <td className="px-6 py-4">
                  <Switch checked={!!defaultGraceTime.applicable_clock_in} onClick={() => handleToggleDefault('applicable_clock_in')} />
                </td>
                <td className="px-6 py-4">
                  <Switch checked={!!defaultGraceTime.applicable_clock_out} onClick={() => handleToggleDefault('applicable_clock_out')} />
                </td>
                <td className="px-6 py-4">
                  <div className="inline-flex items-center gap-1">
                    <IconButton icon="pencil" size="small" aria-label="Edit Default Grace Time" title="Edit Default Grace Time" onClick={handleOpenEditDefault} />
                    <IconButton
 icon="trash"
 size="small"
 color="error"
 aria-label="Reset / Deactivate"
 title="Reset / Deactivate"
 onClick={() => {
 saveDefaultGraceTime(
                          { ...defaultGraceTime, is_active: false },
                          'Default grace time deactivated'
                        );
 }}
 />
                  </div>
                </td>
              </tr>
            </tbody>
          </HRMSTable>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SECTION 2: Grace Time (Shift-specific)
         ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">Grace Time</h2>
          </div>
          <Button
            type="button"
            onClick={handleOpenCreateRecord}
            className="shrink-0"
          >
            <PlusIcon className="h-4 w-4" />
            Create
          </Button>
        </div>

        <hr className="border-divider" />

        <div className="overflow-x-auto rounded-lg border border-divider bg-surface-paper shadow-xs">
          <HRMSTable className="min-w-full divide-y divide-divider text-left text-sm">
            <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                  Allowed time
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                  Is active
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                  <div>Applicable on</div>
                  <div>clock-in</div>
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                  <div>Applicable on</div>
                  <div>clock-out</div>
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                  Assigned Shifts
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-ink-disabled">
                    No shift-specific grace time rules configured. Click &quot;+ Create&quot; to add one.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-neutral/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-ink-primary whitespace-nowrap">
                      {record.allowed_time}
                    </td>
                    <td className="px-6 py-4">
                      <Switch checked={!!record.is_active} onClick={() => handleToggleRecord(record.id, 'is_active')} />
                    </td>
                    <td className="px-6 py-4">
                      <Switch checked={!!record.applicable_clock_in} onClick={() => handleToggleRecord(record.id, 'applicable_clock_in')} />
                    </td>
                    <td className="px-6 py-4">
                      <Switch checked={!!record.applicable_clock_out} onClick={() => handleToggleRecord(record.id, 'applicable_clock_out')} />
                    </td>
                    <td className="px-6 py-4 font-medium text-ink-primary whitespace-nowrap">
                      {record.assigned_shifts || 'General shift'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1">
                        <IconButton icon="pencil" size="small" aria-label="Edit Grace Time" title="Edit Grace Time" onClick={() => handleOpenEditRecord(record)} />
                        <IconButton icon="trash" size="small" color="error" aria-label="Delete Grace Time" title="Delete Grace Time" onClick={() => setDeleteId(record.id)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </HRMSTable>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          MODAL: Edit Default Grace Time
         ─────────────────────────────────────────────────────────── */}
      {editDefaultModalOpen && (
        <Modal open onClose={() => setEditDefaultModalOpen(false)} labelledBy="GraceTimeTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between pb-4">
              <h3 id="GraceTimeTab-modal-title-1" className="text-lg font-semibold text-ink-primary">Edit Default Grace Time</h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setEditDefaultModalOpen(false)} />
            </div>

            <form onSubmit={handleSaveDefault} className="space-y-5">
              <div className="rounded-md border border-divider p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Allowed time
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="00:10:00 Hours"
                    value={formDefaultAllowedTime}
                    onChange={(e) => setFormDefaultAllowedTime(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-ink-secondary">Default permissible delay (e.g., 00:10:00 Hours).</p>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-ink-primary">Is active</span>
                  <Switch checked={formDefaultIsActive} onClick={() => setFormDefaultIsActive((prev) => !prev)} />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-ink-primary">Applicable on clock-in</span>
                  <Switch checked={formDefaultClockIn} onClick={() => setFormDefaultClockIn((prev) => !prev)} />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-ink-primary">Applicable on clock-out</span>
                  <Switch checked={formDefaultClockOut} onClick={() => setFormDefaultClockOut((prev) => !prev)} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outlined" color="inherit"
                  type="button"
                  onClick={() => setEditDefaultModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: Create / Edit Grace Time Record
         ─────────────────────────────────────────────────────────── */}
      {recordModalOpen && (
        <Modal open onClose={() => setRecordModalOpen(false)} labelledBy="GraceTimeTab-modal-title-2" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between pb-4">
              <h3 id="GraceTimeTab-modal-title-2" className="text-lg font-semibold text-ink-primary">
                {editingRecord ? 'Edit Grace Time' : 'Create Grace Time'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setRecordModalOpen(false)} />
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-5">
              <div className="rounded-md border border-divider p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Allowed time
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="00:15:00 Hours"
                    value={formRecordAllowedTime}
                    onChange={(e) => setFormRecordAllowedTime(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-ink-secondary">Grace period format: HH:MM:SS Hours.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Assigned Shifts
                  </label>
                  <Select
                    value={formRecordAssignedShift}
                    onChange={(e) => setFormRecordAssignedShift(e.target.value)}
                  >
                    {SHIFT_OPTIONS.map((shift) => (
                      <option key={shift} value={shift}>
                        {shift}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-ink-primary">Is active</span>
                  <Switch checked={formRecordIsActive} onClick={() => setFormRecordIsActive((prev) => !prev)} />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-ink-primary">Applicable on clock-in</span>
                  <Switch checked={formRecordClockIn} onClick={() => setFormRecordClockIn((prev) => !prev)} />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-ink-primary">Applicable on clock-out</span>
                  <Switch checked={formRecordClockOut} onClick={() => setFormRecordClockOut((prev) => !prev)} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outlined" color="inherit"
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal open onClose={() => setDeleteId(null)} labelledBy="GraceTimeTab-modal-title-3" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="GraceTimeTab-modal-title-3" className="text-lg font-semibold text-ink-primary">Delete Grace Time Rule</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              Are you sure you want to delete this grace time rule? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outlined" color="inherit"
                type="button"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteRecord}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default GraceTimeTab;

