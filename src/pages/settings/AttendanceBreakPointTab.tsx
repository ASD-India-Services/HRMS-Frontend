import React, { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { AttendanceBreakPointConfig } from '@/hooks/useHRSettings';
import { CheckIcon, LoaderIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
        <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Break Point Condition</h2>
      </div>

      <hr className="border-divider" />

      {/* Table matching screenshot */}
      <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Auto Validate Till
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                <div>Min Hour To Approve</div>
                <div>OT</div>
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                OT Cut-Off/Day
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Auto Approve OT
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
            <tr className="hover:bg-surface-neutral/50 transition-colors">
              <td className="px-6 py-4 font-medium text-ink-primary">
                {condition.auto_validate_till || '10:00'}
              </td>
              <td className="px-6 py-4 font-medium text-ink-primary">
                {condition.min_hour_to_approve_ot || '04:00'}
              </td>
              <td className="px-6 py-4 font-medium text-ink-primary">
                {condition.ot_cut_off_per_day || '00:00'}
              </td>
              <td className="px-6 py-4 font-medium text-ink-primary">
                {condition.auto_approve_ot ? 'Yes' : 'No'}
              </td>
              <td className="px-6 py-4">
                <Button
                  type="button"
                  onClick={handleOpenEdit}
                >
                  Edit
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} labelledBy="AttendanceBreakPointTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <h3 id="AttendanceBreakPointTab-modal-title-1" className="text-xl font-bold text-ink-primary">Edit Break Point Condition</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-ink-disabled hover:bg-surface-neutral hover:text-ink-secondary transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-5">
              <div className="rounded-md border border-divider p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Auto Validate Till
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="10:00"
                    value={formAutoValidateTill}
                    onChange={(e) => setFormAutoValidateTill(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-ink-secondary">Auto-validate attendance punches up to this daily time.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Min Hour To Approve OT
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="04:00"
                    value={formMinHourToApproveOT}
                    onChange={(e) => setFormMinHourToApproveOT(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-ink-secondary">Minimum overtime duration required to qualify for OT approval.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    OT Cut-Off/Day
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="00:00"
                    value={formOtCutOffPerDay}
                    onChange={(e) => setFormOtCutOffPerDay(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-ink-secondary">Maximum daily overtime cut-off limit.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Auto Approve OT
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formAutoApproveOT}
                    onClick={() => setFormAutoApproveOT((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 ${
                      formAutoApproveOT ? 'bg-primary-main' : 'bg-grey-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-paper shadow-md ring-0 transition duration-200 ease-in-out ${
                        formAutoApproveOT ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-medium text-ink-primary">
                    {formAutoApproveOT ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outlined" color="inherit"
                  type="button"
                  onClick={() => setModalOpen(false)}
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
    </div>
  );
}

export default AttendanceBreakPointTab;

