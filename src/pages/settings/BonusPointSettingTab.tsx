import React, { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { BonusPointSettingItem } from '@/hooks/useHRSettings';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, LoaderIcon, SearchIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const LOCAL_STORAGE_KEY = 'hrms_bonus_point_settings';

const MODEL_OPTIONS = [
  'Objective',
  'Goal',
  'Key Result',
  'Feedback',
  'Appraisal',
  'Attendance',
];

const APPLICABLE_FOR_OPTIONS = [
  '--------',
  'Employee',
  'Department',
  'Job Position',
  'Role',
  'All Employees',
];

const BONUS_FOR_OPTIONS = [
  '--------',
  'Objective Completion',
  'Exceeding Target',
  'High Rating',
  'On Time Submission',
  'Attendance Consistency',
  'Special Achievement',
];

const FIELD_1_OPTIONS = [
  '--------',
  'Target',
  'Status',
  'Progress',
  'Rating',
  'Score',
  'Weightage',
  'Result',
];

const CONDITION_OPTIONS = [
  '--------',
  'Equals',
  'Not Equals',
  'Greater than or equal to',
  'Greater than',
  'Less than or equal to',
  'Less than',
  'Is Complete',
  'Contains',
];

const FIELD_2_OPTIONS = [
  '--------',
  'Target Value',
  '100%',
  'Exceeded',
  'Custom Value',
  'Pass',
  'A+',
  'Completed',
];

export function BonusPointSettingTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  const [settingsList, setSettingsList] = useState<BonusPointSettingItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BonusPointSettingItem | null>(null);

  // Form states matching screenshot
  const [formModel, setFormModel] = useState('Objective');
  const [formApplicableFor, setFormApplicableFor] = useState('--------');
  const [formBonusFor, setFormBonusFor] = useState('--------');
  const [formField1, setFormField1] = useState('--------');
  const [formConditions, setFormConditions] = useState('--------');
  const [formField2, setFormField2] = useState('--------');
  const [formPoints, setFormPoints] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  // Sync with backend
  useEffect(() => {
    if (settings?.bonus_point_settings && Array.isArray(settings.bonus_point_settings)) {
      setSettingsList(settings.bonus_point_settings);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings.bonus_point_settings));
    }
  }, [settings?.bonus_point_settings]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const saveList = (newList: BonusPointSettingItem[], msg: string) => {
    setSettingsList(newList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
    updateSettings.mutate(
      { bonus_point_settings: newList },
      {
        onSuccess: () => showNotification(msg),
        onError: () => showNotification(`${msg} (saved locally)`),
      }
    );
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormModel('Objective');
    setFormApplicableFor('--------');
    setFormBonusFor('--------');
    setFormField1('--------');
    setFormConditions('--------');
    setFormField2('--------');
    setFormPoints(0);
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: BonusPointSettingItem) => {
    setEditingItem(item);
    setFormModel(item.model || 'Objective');
    setFormApplicableFor(item.applicable_for || '--------');
    setFormBonusFor(item.bonus_for || '--------');
    setFormField1(item.field_1 || '--------');
    setFormConditions(item.conditions || '--------');
    setFormField2(item.field_2 || '--------');
    setFormPoints(item.points ?? 0);
    setFormIsActive(item.is_active ?? true);
    setModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      const updated = settingsList.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              model: formModel,
              applicable_for: formApplicableFor,
              bonus_for: formBonusFor,
              field_1: formField1,
              conditions: formConditions,
              field_2: formField2,
              points: Number(formPoints),
              is_active: formIsActive,
            }
          : item
      );
      saveList(updated, 'Bonus point setting updated successfully');
    } else {
      const newItem: BonusPointSettingItem = {
        id: Date.now().toString(),
        model: formModel,
        applicable_for: formApplicableFor,
        bonus_for: formBonusFor,
        field_1: formField1,
        conditions: formConditions,
        field_2: formField2,
        points: Number(formPoints),
        is_active: formIsActive,
      };
      saveList([...settingsList, newItem], 'Bonus point setting created successfully');
    }

    setModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    const updated = settingsList.map((item) =>
      item.id === id ? { ...item, is_active: !item.is_active } : item
    );
    saveList(updated, 'Bonus point setting status updated');
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const updated = settingsList.filter((item) => item.id !== deleteId);
    saveList(updated, 'Bonus point setting deleted');
    setDeleteId(null);
  };

  const filteredSettings = settingsList.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      (item.model || '').toLowerCase().includes(q) ||
      (item.applicable_for || '').toLowerCase().includes(q) ||
      (item.bonus_for || '').toLowerCase().includes(q) ||
      (item.field_1 || '').toLowerCase().includes(q) ||
      (item.conditions || '').toLowerCase().includes(q) ||
      (item.field_2 || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 py-2">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Bonus Point Setting</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Configure automated performance bonus point rules and criteria based on objective models.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenCreate}
          className="shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          + Create
        </Button>
      </div>

      <hr className="border-divider" />

      {/* Filter / Search Bar matching screenshot */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled" />
          <Input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3"
          />
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <LoaderIcon className="h-3.5 w-3.5 animate-spin text-primary-main" />
            <span>Syncing...</span>
          </div>
        )}
      </div>

      {/* Table / Empty State matching screenshot */}
      {filteredSettings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 rounded-lg border border-divider bg-surface-paper shadow-xs text-center">
          <p className="text-xl font-medium text-ink-primary">No bonus point setting found</p>
          <p className="mt-1 text-sm text-ink-disabled">
            Get started by creating a new bonus point configuration for your performance models.
          </p>
          <Button
            type="button"
            onClick={handleOpenCreate}
            className="mt-4"
          >
            <PlusIcon className="h-4 w-4" />
            + Create
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-divider bg-surface-paper shadow-xs">
          <table className="min-w-full divide-y divide-divider text-left text-sm">
            <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary">
                  Model
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary">
                  Applicable for
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary">
                  Bonus for
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary">
                  Field 1
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary">
                  Conditions
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary">
                  Field 2
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary">
                  Points
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary">
                  Is active
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-ink-primary text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
              {filteredSettings.map((item) => (
                <tr key={item.id} className="hover:bg-surface-neutral/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-ink-primary">{item.model}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{item.applicable_for}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{item.bonus_for}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{item.field_1}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{item.conditions}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{item.field_2}</td>
                  <td className="px-5 py-3.5 font-semibold text-ink-primary">{item.points}</td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.is_active}
                      onClick={() => handleToggleActive(item.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 ${
                        item.is_active ? 'bg-primary-main' : 'bg-grey-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-paper shadow-md ring-0 transition duration-200 ease-in-out ${
                          item.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center rounded-md border border-divider bg-surface-neutral/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit"
                        className="rounded p-1.5 text-ink-secondary hover:bg-surface-paper hover:text-primary-main hover:shadow-xs transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-px bg-grey-200 my-auto" />
                      <button
                        type="button"
                        onClick={() => setDeleteId(item.id)}
                        title="Delete"
                        className="rounded p-1.5 text-error-main hover:bg-surface-paper hover:text-error-dark hover:shadow-xs transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: Create / Edit Bonus Point Setting matching screenshot
         ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} labelledBy="BonusPointSettingTab-modal-title-1" size="lg" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <h3 id="BonusPointSettingTab-modal-title-1" className="text-base font-semibold text-ink-primary">
                {editingItem ? 'Edit Bonus Point Setting' : 'Create Bonus Point Setting'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-ink-disabled hover:bg-surface-neutral hover:text-ink-secondary transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-5 pt-4">
              {/* Row 1: Model * & Applicable for */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Model *
                  </label>
                  <Select
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    required
                  >
                    {MODEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Applicable for
                  </label>
                  <Select
                    value={formApplicableFor}
                    onChange={(e) => setFormApplicableFor(e.target.value)}
                  >
                    {APPLICABLE_FOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Row 2: Bonus for * & Field 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Bonus for *
                  </label>
                  <Select
                    value={formBonusFor}
                    onChange={(e) => setFormBonusFor(e.target.value)}
                    required
                  >
                    {BONUS_FOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Field 1
                  </label>
                  <Select
                    value={formField1}
                    onChange={(e) => setFormField1(e.target.value)}
                  >
                    {FIELD_1_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Row 3: Conditions & Field 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Conditions
                  </label>
                  <Select
                    value={formConditions}
                    onChange={(e) => setFormConditions(e.target.value)}
                  >
                    {CONDITION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Field 2
                  </label>
                  <Select
                    value={formField2}
                    onChange={(e) => setFormField2(e.target.value)}
                  >
                    {FIELD_2_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Row 4: Points * & Is active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Points *
                  </label>
                  <Input
                    type="number"
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    min={0}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Is active
                  </label>
                  <div className="pt-1">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formIsActive}
                      onClick={() => setFormIsActive((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 ${
                        formIsActive ? 'bg-primary-main' : 'bg-grey-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-paper shadow-md ring-0 transition duration-200 ease-in-out ${
                          formIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
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
        <Modal open onClose={() => setDeleteId(null)} labelledBy="BonusPointSettingTab-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="BonusPointSettingTab-modal-title-2" className="text-lg font-bold text-ink-primary">Delete Bonus Point Setting</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              Are you sure you want to delete this bonus point setting rule? This action cannot be undone.
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
                onClick={confirmDelete}
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

export default BonusPointSettingTab;

