import React, { useState, useEffect, useRef } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { CompensatoryLeaveSettingsConfig } from '@/hooks/useHRSettings';
import { InfoIcon, CheckIcon, LoaderIcon, PencilIcon } from './SettingsIcons';

const LOCAL_STORAGE_KEY = 'hrms_compensatory_leave_settings';

const DEFAULT_SETTINGS: CompensatoryLeaveSettingsConfig = {
  request_enabled: true,
  leave_type_name: 'Compensatory Leave Type',
  payment: 'Paid',
  total_days: 1.0,
};

export function CompensatoryLeaveSettingsTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  const [config, setConfig] = useState<CompensatoryLeaveSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form editing states
  const [formTypeName, setFormTypeName] = useState(config.leave_type_name || 'Compensatory Leave Type');
  const [formPayment, setFormPayment] = useState(config.payment || 'Paid');
  const [formTotalDays, setFormTotalDays] = useState(config.total_days ?? 1.0);

  const [notification, setNotification] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync with backend
  useEffect(() => {
    if (settings?.compensatory_leave_settings && Object.keys(settings.compensatory_leave_settings).length > 0) {
      const merged = { ...DEFAULT_SETTINGS, ...settings.compensatory_leave_settings };
      setConfig(merged);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    }
  }, [settings?.compensatory_leave_settings]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const saveConfig = (newConfig: CompensatoryLeaveSettingsConfig, msg: string) => {
    setConfig(newConfig);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
    updateSettings.mutate(
      { compensatory_leave_settings: newConfig },
      {
        onSuccess: () => showNotification(msg),
        onError: () => showNotification(`${msg} (saved locally)`),
      }
    );
  };

  const handleToggleRequest = () => {
    const nextState = !config.request_enabled;
    const updated = { ...config, request_enabled: nextState };
    saveConfig(
      updated,
      nextState ? 'Compensatory Leave Request enabled' : 'Compensatory Leave Request disabled'
    );
  };

  const handleOpenEdit = () => {
    setFormTypeName(config.leave_type_name || 'Compensatory Leave Type');
    setFormPayment(config.payment || 'Paid');
    setFormTotalDays(config.total_days ?? 1.0);
    setMenuOpen(false);
    setModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompensatoryLeaveSettingsConfig = {
      ...config,
      leave_type_name: formTypeName.trim() || 'Compensatory Leave Type',
      payment: formPayment,
      total_days: Number(formTotalDays) || 1.0,
    };
    saveConfig(updated, 'Compensatory leave type updated successfully');
    setModalOpen(false);
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

      {/* Main Header matching screenshot */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Compensatory Leave</h2>
      </div>

      <hr className="border-gray-200" />

      {/* ───────────────────────────────────────────────────────────
          SECTION 1: Compensatory Leave Request
         ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-gray-900">Compensatory Leave Request</span>
          <div className="group relative cursor-pointer text-gray-400 hover:text-gray-600">
            <InfoIcon className="h-4 w-4" />
            <div className="absolute left-1/2 -top-8 -translate-x-1/2 hidden group-hover:block rounded bg-gray-900 px-2 py-1 text-[11px] text-white whitespace-nowrap shadow-md z-10">
              Allow employees to request compensatory leave for overtime or off-day work
            </div>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            role="switch"
            aria-checked={config.request_enabled}
            disabled={isLoading || updateSettings.isPending}
            onClick={handleToggleRequest}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
              config.request_enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                config.request_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* ───────────────────────────────────────────────────────────
          SECTION 2: Compensatory Leave Type Card matching screenshot
         ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-gray-900">Compensatory Leave Type</span>
          <div className="group relative cursor-pointer text-gray-400 hover:text-gray-600">
            <InfoIcon className="h-4 w-4" />
            <div className="absolute left-1/2 -top-8 -translate-x-1/2 hidden group-hover:block rounded bg-gray-900 px-2 py-1 text-[11px] text-white whitespace-nowrap shadow-md z-10">
              Configuration details for standard compensatory leave allocations
            </div>
          </div>
        </div>

        {/* Card matching screenshot */}
        <div className="relative rounded-lg border border-gray-200 bg-white shadow-xs max-w-xl overflow-hidden border-l-4 border-l-[#8bc34a] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Teal Avatar with "CT" */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#009688] text-white font-bold text-lg shadow-xs">
                CT
              </div>

              {/* Info Details */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {config.leave_type_name || 'Compensatory Leave Type'}
                </h3>
                <div className="flex items-center gap-8 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Payment</div>
                    <div className="text-xs text-gray-500 font-medium">{config.payment || 'Paid'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Total Days</div>
                    <div className="text-xs text-gray-500 font-medium">{config.total_days ?? 1.0}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Three dots menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="Options"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-32 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 z-20">
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          MODAL: Edit Compensatory Leave Type
         ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Compensatory Leave Type</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="rounded-md border border-gray-200 p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Leave Type Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formTypeName}
                    onChange={(e) => setFormTypeName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Payment
                  </label>
                  <select
                    value={formPayment}
                    onChange={(e) => setFormPayment(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Half Paid">Half Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Total Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={formTotalDays}
                    onChange={(e) => setFormTotalDays(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
    </div>
  );
}

export default CompensatoryLeaveSettingsTab;

