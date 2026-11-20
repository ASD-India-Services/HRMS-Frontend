import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { AutoPayslipRuleItem } from '@/hooks/useHRSettings';
import { PlusIcon, PencilIcon, TrashIcon, InfoIcon, CheckIcon, LoaderIcon, SearchIcon } from './SettingsIcons';

const LOCAL_STORAGE_KEY = 'hrms_auto_payslip_rules';

const GENERATE_DAYS = [
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
  '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
  '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st',
  'Last day of month',
];

export function AutoPayslipSettingsTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  // Query branches created inside this specific organization
  const { data: branchesData } = useQuery<any>({
    queryKey: ['branches-company-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/branches/');
        return res.data;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Dynamically resolve only companies created inside this specific organization
  const availableCompanies = useMemo(() => {
    const list: string[] = [];
    const add = (val?: string) => {
      const trimmed = val?.trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    };

    // 1. Primary Organization Company Name from HR Settings
    add(settings?.company_name);
    add(settings?.badge_company);
    add(settings?.currency_company);

    // 2. Physical Branches / Locations created within this organization
    const branchList = Array.isArray(branchesData)
      ? branchesData
      : Array.isArray((branchesData as any)?.results)
      ? (branchesData as any).results
      : [];
    branchList.forEach((b: any) => {
      add(b?.name);
    });

    // 3. Fallback to organization company name if none loaded yet
    if (list.length === 0) {
      list.push(settings?.company_name || 'digiHRMS');
    }

    return list;
  }, [settings, branchesData]);

  const [rules, setRules] = useState<AutoPayslipRuleItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            ...item,
            company:
              !item.company || item.company.includes('Synergon') || item.company.includes('G7')
                ? 'digiHRMS'
                : item.company,
          }));
        }
      }
    } catch {
      // fallback
    }
    return [
      {
        id: '1',
        generate_day: '1st',
        company: 'digiHRMS',
        auto_generate: false,
      },
    ];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AutoPayslipRuleItem | null>(null);

  // Form states
  const [formGenerateDay, setFormGenerateDay] = useState('1st');
  const [formCompany, setFormCompany] = useState(() => availableCompanies[0] || 'digiHRMS');
  const [formAutoGenerate, setFormAutoGenerate] = useState(false);

  // Keep formCompany in sync when available companies load
  useEffect(() => {
    if (availableCompanies.length > 0 && !availableCompanies.includes(formCompany) && !editingItem) {
      setFormCompany(availableCompanies[0]);
    }
  }, [availableCompanies, formCompany, editingItem]);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  // Sync with backend
  useEffect(() => {
    if (settings?.auto_payslip_rules && Array.isArray(settings.auto_payslip_rules) && settings.auto_payslip_rules.length > 0) {
      setRules(settings.auto_payslip_rules);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings.auto_payslip_rules));
    }
  }, [settings?.auto_payslip_rules]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const saveRules = (newRules: AutoPayslipRuleItem[], msg: string) => {
    setRules(newRules);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newRules));
    updateSettings.mutate(
      { auto_payslip_rules: newRules },
      {
        onSuccess: () => showNotification(msg),
        onError: () => showNotification(`${msg} (saved locally)`),
      }
    );
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormGenerateDay('1st');
    setFormCompany(availableCompanies[0] || 'digiHRMS');
    setFormAutoGenerate(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: AutoPayslipRuleItem) => {
    setEditingItem(item);
    setFormGenerateDay(item.generate_day);
    setFormCompany(item.company);
    setFormAutoGenerate(item.auto_generate);
    setModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();

    const companyToSave = formCompany || availableCompanies[0] || 'digiHRMS';

    if (editingItem) {
      const updated = rules.map((r) =>
        r.id === editingItem.id
          ? {
              ...r,
              generate_day: formGenerateDay,
              company: companyToSave,
              auto_generate: formAutoGenerate,
            }
          : r
      );
      saveRules(updated, 'Auto payslip schedule updated successfully');
    } else {
      const newRule: AutoPayslipRuleItem = {
        id: Date.now().toString(),
        generate_day: formGenerateDay,
        company: companyToSave,
        auto_generate: formAutoGenerate,
      };
      saveRules([...rules, newRule], 'Auto payslip schedule created successfully');
    }

    setModalOpen(false);
  };

  const handleToggleAutoGenerate = (id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, auto_generate: !r.auto_generate } : r
    );
    saveRules(updated, 'Auto generate status updated');
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const updated = rules.filter((r) => r.id !== deleteId);
    saveRules(updated, 'Auto payslip rule deleted');
    setDeleteId(null);
  };

  const filteredRules = rules.filter(
    (r) =>
      r.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.generate_day.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Payslip Auto Generate</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure automated monthly payslip generation schedules and rules per company entity.
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

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search company or day..."
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

      {/* Table matching screenshot */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Payslip Generate Day
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Company
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Auto generate
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                  No auto payslip schedules configured. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {rule.generate_day}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {rule.company}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.auto_generate}
                      onClick={() => handleToggleAutoGenerate(rule.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        rule.auto_generate ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          rule.auto_generate ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rule)}
                        title="Edit Schedule"
                        className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-px bg-gray-200 my-auto" />
                      <button
                        type="button"
                        onClick={() => setDeleteId(rule.id)}
                        title="Delete Schedule"
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

      {/* ───────────────────────────────────────────────────────────
          MODAL: Create / Edit Auto Payslip Generate matching screenshot
         ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">
                {editingItem ? 'Edit Auto Payslip Generate' : 'Create Auto Payslip Generate'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            {/* Modal Body Title matching screenshot */}
            <div className="pt-4 pb-2">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                payslip auto generate
              </h2>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-6 pt-2">
              {/* Two columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Left: Payslip Generate Day * */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <label className="block text-sm font-semibold text-gray-900">
                      Payslip Generate Day *
                    </label>
                    <div className="group relative cursor-pointer text-gray-400 hover:text-gray-600">
                      <InfoIcon className="h-3.5 w-3.5" />
                      <div className="absolute left-1/2 -top-8 -translate-x-1/2 hidden group-hover:block rounded bg-gray-900 px-2 py-1 text-[11px] text-white whitespace-nowrap shadow-md z-10">
                        Day of the month to automatically generate payslips
                      </div>
                    </div>
                  </div>
                  <select
                    value={formGenerateDay}
                    onChange={(e) => setFormGenerateDay(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {GENERATE_DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Right: Company (Only organization's linked companies) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Company
                  </label>
                  <select
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {availableCompanies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Below: Auto generate toggle */}
              <div className="space-y-2 pt-1">
                <label className="block text-sm font-semibold text-gray-900">
                  Auto generate
                </label>
                <div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formAutoGenerate}
                    onClick={() => setFormAutoGenerate((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formAutoGenerate ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formAutoGenerate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bottom Right Save Button */}
              <div className="flex justify-end gap-3 pt-3">
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
            <h3 className="text-lg font-bold text-gray-900">Delete Auto Payslip Rule</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete this auto payslip generation rule? This action cannot be undone.
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

export default AutoPayslipSettingsTab;
