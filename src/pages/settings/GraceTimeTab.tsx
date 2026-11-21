import React, { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { DefaultGraceTimeConfig, GraceTimeRecordItem } from '@/hooks/useHRSettings';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, LoaderIcon } from './SettingsIcons';

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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          SECTION 1: Default Grace Time
         ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Default Grace Time</h2>
        </div>

        <hr className="border-gray-200" />

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 w-1/4">
                  Allowed time
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 w-1/6">
                  Is active
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 w-1/5">
                  <div>Applicable on clock-</div>
                  <div>in</div>
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 w-1/5">
                  <div>Applicable on clock-</div>
                  <div>out</div>
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 w-1/6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {defaultGraceTime.allowed_time || '00:10:00 Hours'}
                </td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={defaultGraceTime.is_active}
                    onClick={() => handleToggleDefault('is_active')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${defaultGraceTime.is_active ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${defaultGraceTime.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={defaultGraceTime.applicable_clock_in}
                    onClick={() => handleToggleDefault('applicable_clock_in')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${defaultGraceTime.applicable_clock_in ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${defaultGraceTime.applicable_clock_in ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={defaultGraceTime.applicable_clock_out}
                    onClick={() => handleToggleDefault('applicable_clock_out')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${defaultGraceTime.applicable_clock_out ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${defaultGraceTime.applicable_clock_out ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50/50 p-0.5">
                    <button
                      type="button"
                      onClick={handleOpenEditDefault}
                      title="Edit Default Grace Time"
                      className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <div className="h-4 w-px bg-gray-200 my-auto" />
                    <button
                      type="button"
                      onClick={() => {
                        saveDefaultGraceTime(
                          { ...defaultGraceTime, is_active: false },
                          'Default grace time deactivated'
                        );
                      }}
                      title="Reset / Deactivate"
                      className="rounded p-1.5 text-red-500 hover:bg-white hover:text-red-700 hover:shadow-xs transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SECTION 2: Grace Time (Shift-specific)
         ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Grace Time</h2>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateRecord}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
          >
            <PlusIcon className="h-4 w-4" />
            Create
          </button>
        </div>

        <hr className="border-gray-200" />

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                  Allowed time
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                  Is active
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                  <div>Applicable on</div>
                  <div>clock-in</div>
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                  <div>Applicable on</div>
                  <div>clock-out</div>
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                  Assigned Shifts
                </th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    No shift-specific grace time rules configured. Click &quot;+ Create&quot; to add one.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {record.allowed_time}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={record.is_active}
                        onClick={() => handleToggleRecord(record.id, 'is_active')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${record.is_active ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${record.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={record.applicable_clock_in}
                        onClick={() => handleToggleRecord(record.id, 'applicable_clock_in')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${record.applicable_clock_in ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${record.applicable_clock_in ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={record.applicable_clock_out}
                        onClick={() => handleToggleRecord(record.id, 'applicable_clock_out')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${record.applicable_clock_out ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${record.applicable_clock_out ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {record.assigned_shifts || 'General shift'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50/50 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRecord(record)}
                          title="Edit Grace Time"
                          className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <div className="h-4 w-px bg-gray-200 my-auto" />
                        <button
                          type="button"
                          onClick={() => setDeleteId(record.id)}
                          title="Delete Grace Time"
                          className="rounded p-1.5 text-red-500 hover:bg-white hover:text-red-700 hover:shadow-xs transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          MODAL: Edit Default Grace Time
         ─────────────────────────────────────────────────────────── */}
      {editDefaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Default Grace Time</h3>
              <button
                type="button"
                onClick={() => setEditDefaultModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSaveDefault} className="space-y-5">
              <div className="rounded-md border border-gray-200 p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Allowed time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="00:10:00 Hours"
                    value={formDefaultAllowedTime}
                    onChange={(e) => setFormDefaultAllowedTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Default permissible delay (e.g., 00:10:00 Hours).</p>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-gray-900">Is active</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formDefaultIsActive}
                    onClick={() => setFormDefaultIsActive((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formDefaultIsActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formDefaultIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-gray-900">Applicable on clock-in</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formDefaultClockIn}
                    onClick={() => setFormDefaultClockIn((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formDefaultClockIn ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formDefaultClockIn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-gray-900">Applicable on clock-out</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formDefaultClockOut}
                    onClick={() => setFormDefaultClockOut((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formDefaultClockOut ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formDefaultClockOut ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDefaultModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSettings.isPending}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {updateSettings.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: Create / Edit Grace Time Record
         ─────────────────────────────────────────────────────────── */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingRecord ? 'Edit Grace Time' : 'Create Grace Time'}
              </h3>
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-5">
              <div className="rounded-md border border-gray-200 p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Allowed time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="00:15:00 Hours"
                    value={formRecordAllowedTime}
                    onChange={(e) => setFormRecordAllowedTime(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Grace period format: HH:MM:SS Hours.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Assigned Shifts
                  </label>
                  <select
                    value={formRecordAssignedShift}
                    onChange={(e) => setFormRecordAssignedShift(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {SHIFT_OPTIONS.map((shift) => (
                      <option key={shift} value={shift}>
                        {shift}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-gray-900">Is active</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formRecordIsActive}
                    onClick={() => setFormRecordIsActive((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formRecordIsActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formRecordIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-gray-900">Applicable on clock-in</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formRecordClockIn}
                    onClick={() => setFormRecordClockIn((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formRecordClockIn ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formRecordClockIn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-gray-900">Applicable on clock-out</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formRecordClockOut}
                    onClick={() => setFormRecordClockOut((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formRecordClockOut ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formRecordClockOut ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSettings.isPending}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {updateSettings.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl transition-all">
            <h3 className="text-lg font-bold text-gray-900">Delete Grace Time Rule</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete this grace time rule? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecord}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GraceTimeTab;

