import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHRSettings } from '@/hooks/useHRSettings';
import { PlusIcon, SearchIcon, CheckIcon, LoaderIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export interface EmployeeTypeItem {
  id: string;
  name: string;
  company: string;
  [key: string]: any;
}

const DEFAULT_EMPLOYEE_TYPES: EmployeeTypeItem[] = [
  { id: '1', name: 'Permanent / Full-Time', company: 'G7 Synergon PVT. LTD. CRO' },
  { id: '2', name: 'Contract / Consultant', company: 'G7 Synergon PVT. LTD. CRO' },
  { id: '3', name: 'Probationary', company: 'G7 Synergon PVT. LTD. CRO' },
  { id: '4', name: 'Internship', company: 'G7 Synergon PVT. LTD. CRO' },
  { id: '5', name: 'Part-Time', company: 'G7 Synergon PVT. LTD. CRO' },
];

const LOCAL_STORAGE_KEY = 'hrms_employee_types_settings';

export function EmployeeTypeTab() {
  const { data: settings, isLoading } = useHRSettings();

  const { data: branchesData } = useQuery<any>({
    queryKey: ['branches-employee-types'],
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

  const availableCompanies = useMemo(() => {
    const list: string[] = [];
    const add = (val?: string) => {
      const trimmed = val?.trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    };

    add(settings?.company_name);
    add(settings?.badge_company);
    add(settings?.currency_company);

    const branchList = Array.isArray(branchesData)
      ? branchesData
      : Array.isArray((branchesData as any)?.results)
      ? (branchesData as any).results
      : [];
    branchList.forEach((b: any) => {
      add(b?.name);
    });

    if (list.length === 0) {
      list.push('G7 Synergon PVT. LTD. CRO');
    }

    return list;
  }, [settings, branchesData]);

  const [employeeTypes, setEmployeeTypes] = useState<EmployeeTypeItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_EMPLOYEE_TYPES;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EmployeeTypeItem | null>(null);

  const [formEmployeeType, setFormEmployeeType] = useState('');
  const [formCompany, setFormCompany] = useState(() => availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
  const [deleteTarget, setDeleteTarget] = useState<EmployeeTypeItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (availableCompanies.length > 0 && !availableCompanies.includes(formCompany) && !editingItem) {
      setFormCompany(availableCompanies[0]);
    }
  }, [availableCompanies, formCompany, editingItem]);

  const saveToStorage = (updated: EmployeeTypeItem[], msg: string) => {
    setEmployeeTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    showNotification(msg);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormEmployeeType('');
    setFormCompany(availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: EmployeeTypeItem) => {
    setEditingItem(item);
    setFormEmployeeType(item.name);
    setFormCompany(item.company || availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeType.trim()) return;

    const companyToSave = formCompany || availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO';

    if (editingItem) {
      const updated = employeeTypes.map((w) =>
        w.id === editingItem.id
          ? { ...w, name: formEmployeeType.trim(), company: companyToSave }
          : w
      );
      saveToStorage(updated, 'Employee type updated successfully');
    } else {
      const newItem: EmployeeTypeItem = {
        id: Date.now().toString(),
        name: formEmployeeType.trim(),
        company: companyToSave,
      };
      saveToStorage([...employeeTypes, newItem], 'Employee type created successfully');
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated = employeeTypes.filter((w) => w.id !== deleteTarget.id);
    saveToStorage(updated, 'Employee type deleted');
    setDeleteTarget(null);
  };

  const filteredItems = employeeTypes.filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.company || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 py-2">
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Employee Type</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Define organizational worker categories and associated companies.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenAdd}
          className="shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          + Create
        </Button>
      </div>

      <hr className="border-divider" />

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled" />
          <Input
            type="text"
            placeholder="Search employee types..."
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

      <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Employee Type
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Company
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-ink-disabled">
                  No employee types found. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-surface-neutral/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink-primary">{item.name}</td>
                  <td className="px-6 py-4 text-ink-secondary">{item.company}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <IconButton icon="pencil" size="small" aria-label="Edit employee type" title="Edit employee type" onClick={() => handleOpenEdit(item)} />
                      <IconButton icon="trash" size="small" color="error" aria-label="Delete employee type" title="Delete employee type" onClick={() => setDeleteTarget(item)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} labelledBy="EmployeeTypeTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <h3 id="EmployeeTypeTab-modal-title-1" className="text-lg font-semibold text-ink-primary">
                {editingItem ? 'Edit Employee Type' : 'Create Employee Type'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setModalOpen(false)} />
            </div>

            <form onSubmit={handleSubmit} className="pt-4">
              <div className="rounded-md border border-divider p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Employee Type:
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Employee Type"
                    value={formEmployeeType}
                    onChange={(e) => setFormEmployeeType(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Company:
                  </label>
                  <div className="relative">
                    <Select
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="appearance-none pr-10 cursor-pointer"
                    >
                      {availableCompanies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-center px-2.5 text-ink-disabled">
                      <svg className="h-3 w-3 -mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                      </svg>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <Button
                    type="submit"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} labelledBy="EmployeeTypeTab-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="EmployeeTypeTab-modal-title-2" className="text-lg font-semibold text-ink-primary">Delete Employee Type</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              Are you sure you want to delete the employee type &quot;{deleteTarget.name}&quot;? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outlined" color="inherit"
                type="button"
                onClick={() => setDeleteTarget(null)}
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

export default EmployeeTypeTab;

