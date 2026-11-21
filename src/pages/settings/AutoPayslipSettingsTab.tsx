import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { AutoPayslipRuleItem } from '@/hooks/useHRSettings';
import { PlusIcon, InfoIcon, CheckIcon, LoaderIcon, SearchIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton, Switch } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

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
      list.push('G7 Synergon PVT. LTD. CRO');
    }

    return list;
  }, [settings, branchesData]);

  const [rules, setRules] = useState<AutoPayslipRuleItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: '1',
        generate_day: '1st',
        company: 'G7 Synergon PVT. LTD. CRO',
        auto_generate: false,
      },
    ];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AutoPayslipRuleItem | null>(null);

  // Form states
  const [formGenerateDay, setFormGenerateDay] = useState('1st');
  const [formCompany, setFormCompany] = useState(() => availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
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
    setFormCompany(availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
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

    const companyToSave = formCompany || availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO';

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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Payslip Auto Generate</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Configure automated monthly payslip generation schedules and rules per company entity.
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

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled" />
          <Input
            type="text"
            placeholder="Search company or day..."
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

      {/* Table matching screenshot */}
      <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Payslip Generate Day
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Company
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Auto generate
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-ink-disabled">
                  No auto payslip schedules configured. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-surface-neutral/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink-primary">
                    {rule.generate_day}
                  </td>
                  <td className="px-6 py-4 font-medium text-ink-primary">
                    {rule.company}
                  </td>
                  <td className="px-6 py-4">
                    <Switch checked={rule.auto_generate} onClick={() => handleToggleAutoGenerate(rule.id)} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1">
                      <IconButton icon="pencil" size="small" aria-label="Edit Schedule" title="Edit Schedule" onClick={() => handleOpenEdit(rule)} />
                      <IconButton icon="trash" size="small" color="error" aria-label="Delete Schedule" title="Delete Schedule" onClick={() => setDeleteId(rule.id)} />
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
        <Modal open onClose={() => setModalOpen(false)} labelledBy="AutoPayslipSettingsTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <h3 id="AutoPayslipSettingsTab-modal-title-1" className="text-lg font-semibold text-ink-primary">
                {editingItem ? 'Edit Auto Payslip Generate' : 'Create Auto Payslip Generate'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setModalOpen(false)} />
            </div>

            {/* Modal Body Title matching screenshot */}
            <div className="pt-4 pb-2">
              <h2 className="text-lg font-semibold text-ink-primary">
                payslip auto generate
              </h2>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-6 pt-2">
              {/* Two columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Left: Payslip Generate Day * */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <label className="block text-sm font-semibold text-ink-primary">
                      Payslip Generate Day *
                    </label>
                    <div className="group relative cursor-pointer text-ink-disabled hover:text-ink-secondary">
                      <InfoIcon className="h-3.5 w-3.5" />
                      <div className="absolute left-1/2 -top-8 -translate-x-1/2 hidden group-hover:block rounded bg-grey-900 px-2 py-1 text-[11px] text-primary-contrast whitespace-nowrap shadow-md z-10">
                        Day of the month to automatically generate payslips
                      </div>
                    </div>
                  </div>
                  <Select
                    value={formGenerateDay}
                    onChange={(e) => setFormGenerateDay(e.target.value)}
                  >
                    {GENERATE_DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Right: Company (Only organization's linked companies) */}
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-2">
                    Company
                  </label>
                  <Select
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                  >
                    {availableCompanies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Below: Auto generate toggle */}
              <div className="space-y-2 pt-1">
                <label className="block text-sm font-semibold text-ink-primary">
                  Auto generate
                </label>
                <div>
                  <Switch checked={formAutoGenerate} onClick={() => setFormAutoGenerate((prev) => !prev)} />
                </div>
              </div>

              {/* Bottom Right Save Button */}
              <div className="flex justify-end gap-3 pt-3">
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
        <Modal open onClose={() => setDeleteId(null)} labelledBy="AutoPayslipSettingsTab-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="AutoPayslipSettingsTab-modal-title-2" className="text-lg font-semibold text-ink-primary">Delete Auto Payslip Rule</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              Are you sure you want to delete this auto payslip generation rule? This action cannot be undone.
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

export default AutoPayslipSettingsTab;
