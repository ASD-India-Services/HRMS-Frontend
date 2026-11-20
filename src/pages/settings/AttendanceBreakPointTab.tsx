import React, { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { AttendanceBreakPointConfig } from '@/hooks/useHRSettings';
import { CheckIcon, LoaderIcon } from './SettingsIcons';

const LOCAL_STORAGE_KEY = 'hrms_attendance_break_point';

const DEFAULT_BREAK_POINT: AttendanceBreakPointConfig = {
  auto_validate_till: '10:00',
  min_hour_to_approve_ot: '04:00',
  ot_cut_off_per_day: '00:00',
  auto_approve_ot: true,
};

export function AttendanceBreakPointTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  const [condition, setCondition] = useState<AttendanceBreakPointConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...DEFAULT_BREAK_POINT, ...parsed };
      }
    } catch {
      // fallback
    }
    return DEFAULT_BREAK_POINT;
  });

  const [modalOpen, setModalOpen] = useState(false);

  // Form editing state
  const [formAutoValidateTill, setFormAutoValidateTill] = useState(condition.auto_validate_till || '10:00');
  const [formMinHourToApproveOT, setFormMinHourToApproveOT] = useState(condition.min_hour_to_approve_ot || '04:00');
  const [formOtCutOffPerDay, setFormOtCutOffPerDay] = useState(condition.ot_cut_off_per_day || '00:00');
  const [formAutoApproveOT, setFormAutoApproveOT] = useState<boolean>(condition.auto_approve_ot ?? true);

  const [notification, setNotification] = useState<string | null>(null);

  // Sync with backend settings
  useEffect(() => {
    if (settings?.attendance_break_point && Object.keys(settings.attendance_break_point).length > 0) {
      const merged = { ...DEFAULT_BREAK_POINT, ...settings.attendance_break_point };
      setCondition(merged);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    }
  }, [settings?.attendance_break_point]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenEdit = () => {
    setFormAutoValidateTill(condition.auto_validate_till || '10:00');
    setFormMinHourToApproveOT(condition.min_hour_to_approve_ot || '04:00');
    setFormOtCutOffPerDay(condition.ot_cut_off_per_day || '00:00');
    setFormAutoApproveOT(condition.auto_approve_ot ?? true);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: AttendanceBreakPointConfig = {
      auto_validate_till: formAutoValidateTill.trim() || '10:00',
      min_hour_to_approve_ot: formMinHourToApproveOT.trim() || '04:00',
      ot_cut_off_per_day: formOtCutOffPerDay.trim() || '00:00',
      auto_approve_ot: formAutoApproveOT,
    };

    setCondition(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    updateSettings.mutate(
      { attendance_break_point: updated },
      {
        onSuccess: () => {
          showNotification('Break point condition updated successfully');
        },
        onError: () => {
          showNotification('Break point condition updated (saved locally)');
        },
      }
    );

    setModalOpen(false);
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

      {/* Header matching screenshot */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Break Point Condition</h2>
      </div>

      <hr className="border-gray-200" />

      {/* Table matching screenshot */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Auto Validate Till
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                <div>Min Hour To Approve</div>
                <div>OT</div>
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                OT Cut-Off/Day
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Auto Approve OT
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">
                {condition.auto_validate_till || '10:00'}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900">
                {condition.min_hour_to_approve_ot || '04:00'}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900">
                {condition.ot_cut_off_per_day || '00:00'}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900">
                {condition.auto_approve_ot ? 'Yes' : 'No'}
              </td>
              <td className="px-6 py-4">
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Break Point Condition</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-5">
              <div className="rounded-md border border-gray-200 p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Auto Validate Till
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10:00"
                    value={formAutoValidateTill}
                    onChange={(e) => setFormAutoValidateTill(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Auto-validate attendance punches up to this daily time.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Min Hour To Approve OT
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="04:00"
                    value={formMinHourToApproveOT}
                    onChange={(e) => setFormMinHourToApproveOT(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum overtime duration required to qualify for OT approval.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    OT Cut-Off/Day
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="00:00"
                    value={formOtCutOffPerDay}
                    onChange={(e) => setFormOtCutOffPerDay(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Maximum daily overtime cut-off limit.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Auto Approve OT
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formAutoApproveOT}
                    onClick={() => setFormAutoApproveOT((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formAutoApproveOT ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formAutoApproveOT ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {formAutoApproveOT ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* Actions */}
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

export default AttendanceBreakPointTab;

