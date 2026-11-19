import React, { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { BonusPointSettingItem } from '@/hooks/useHRSettings';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, LoaderIcon, SearchIcon } from './SettingsIcons';

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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Bonus Point Setting</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure automated performance bonus point rules and criteria based on objective models.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          + Create
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* Filter / Search Bar matching screenshot */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-1.5 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <LoaderIcon className="h-3.5 w-3.5 animate-spin text-blue-600" />
            <span>Syncing...</span>
          </div>
        )}
      </div>

      {/* Table / Empty State matching screenshot */}
      {filteredSettings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 rounded-lg border border-gray-200 bg-white shadow-xs text-center">
          <p className="text-xl font-medium text-gray-700">No bonus point setting found</p>
          <p className="mt-1 text-sm text-gray-400">
            Get started by creating a new bonus point configuration for your performance models.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            + Create
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900">
                  Model
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900">
                  Applicable for
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900">
                  Bonus for
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900">
                  Field 1
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900">
                  Conditions
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900">
                  Field 2
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900">
                  Points
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900">
                  Is active
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-gray-900 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
              {filteredSettings.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{item.model}</td>
                  <td className="px-5 py-3.5 text-gray-600">{item.applicable_for}</td>
                  <td className="px-5 py-3.5 text-gray-600">{item.bonus_for}</td>
                  <td className="px-5 py-3.5 text-gray-600">{item.field_1}</td>
                  <td className="px-5 py-3.5 text-gray-600">{item.conditions}</td>
                  <td className="px-5 py-3.5 text-gray-600">{item.field_2}</td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{item.points}</td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.is_active}
                      onClick={() => handleToggleActive(item.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        item.is_active ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          item.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit"
                        className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-px bg-gray-200 my-auto" />
                      <button
                        type="button"
                        onClick={() => setDeleteId(item.id)}
                        title="Delete"
                        className="rounded p-1.5 text-red-500 hover:bg-white hover:text-red-700 hover:shadow-xs transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                {editingItem ? 'Edit Bonus Point Setting' : 'Create Bonus Point Setting'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-5 pt-4">
              {/* Row 1: Model * & Applicable for */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Model *
                  </label>
                  <select
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {MODEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Applicable for
                  </label>
                  <select
                    value={formApplicableFor}
                    onChange={(e) => setFormApplicableFor(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {APPLICABLE_FOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Bonus for * & Field 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Bonus for *
                  </label>
                  <select
                    value={formBonusFor}
                    onChange={(e) => setFormBonusFor(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {BONUS_FOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Field 1
                  </label>
                  <select
                    value={formField1}
                    onChange={(e) => setFormField1(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {FIELD_1_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Conditions & Field 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Conditions
                  </label>
                  <select
                    value={formConditions}
                    onChange={(e) => setFormConditions(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {CONDITION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Field 2
                  </label>
                  <select
                    value={formField2}
                    onChange={(e) => setFormField2(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {FIELD_2_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Points * & Is active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Points *
                  </label>
                  <input
                    type="number"
                    value={formPoints}
                    onChange={(e) => setFormPoints(Number(e.target.value))}
                    min={0}
                    required
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Is active
                  </label>
                  <div className="pt-1">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formIsActive}
                      onClick={() => setFormIsActive((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        formIsActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={updateSettings.isPending}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
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
            <h3 className="text-lg font-bold text-gray-900">Delete Bonus Point Setting</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete this bonus point setting rule? This action cannot be undone.
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
                onClick={confirmDelete}
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

export default BonusPointSettingTab;

