import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, CheckIcon, LoaderIcon } from './SettingsIcons';

export interface WorkTypeItem {
  id: string;
  name: string;
  company: string;
  [key: string]: any;
}

const DEFAULT_WORK_TYPES: WorkTypeItem[] = [
  {
    id: '1',
    name: 'Full-time On-site',
    company: 'digiHRMS',
  },
  {
    id: '2',
    name: 'Remote / Work From Home',
    company: 'digiHRMS',
  },
  {
    id: '3',
    name: 'Hybrid',
    company: 'digiHRMS',
  },
  {
    id: '4',
    name: 'Field & Client Site',
    company: 'digiHRMS',
  },
];

const LOCAL_STORAGE_KEY = 'hrms_work_types';

export function WorkTypeTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  // Query branches created inside this specific organization
  const { data: branchesData } = useQuery<any>({
    queryKey: ['branches-work-types'],
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

  const [workTypes, setWorkTypes] = useState<WorkTypeItem[]>(() => {
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
    return DEFAULT_WORK_TYPES;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkTypeItem | null>(null);

  // Form states matching screenshot
  const [formWorkType, setFormWorkType] = useState('');
  const [formCompany, setFormCompany] = useState(() => availableCompanies[0] || 'digiHRMS');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WorkTypeItem | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Keep formCompany in sync when available companies load
  useEffect(() => {
    if (availableCompanies.length > 0 && !availableCompanies.includes(formCompany) && !editingItem) {
      setFormCompany(availableCompanies[0]);
    }
  }, [availableCompanies, formCompany, editingItem]);

  const saveToStorage = (updated: WorkTypeItem[], msg: string) => {
    setWorkTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    showNotification(msg);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormWorkType('');
    setFormCompany(availableCompanies[0] || 'digiHRMS');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: WorkTypeItem) => {
    setEditingItem(item);
    setFormWorkType(item.name);
    setFormCompany(
      !item.company || item.company.includes('Synergon') || item.company.includes('G7')
        ? availableCompanies[0] || 'digiHRMS'
        : item.company
    );
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWorkType.trim()) return;

    const companyToSave = formCompany || availableCompanies[0] || 'digiHRMS';

    if (editingItem) {
      const updated = workTypes.map((w) =>
        w.id === editingItem.id
          ? {
              ...w,
              name: formWorkType.trim(),
              company: companyToSave,
            }
          : w
      );
      saveToStorage(updated, 'Work type updated successfully');
    } else {
      const newItem: WorkTypeItem = {
        id: Date.now().toString(),
        name: formWorkType.trim(),
        company: companyToSave,
      };
      saveToStorage([...workTypes, newItem], 'Work type created successfully');
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated = workTypes.filter((w) => w.id !== deleteTarget.id);
    saveToStorage(updated, 'Work type deleted');
    setDeleteTarget(null);
  };

  const filteredItems = workTypes.filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.company || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Work Type</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define recognized employment work arrangements and associated companies.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
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
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search work types..."
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

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Work Type
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Company
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-400">
                  No work types found. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-gray-600">{item.company}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                        title="Edit work type"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-px bg-gray-200 my-auto" />
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                        title="Delete work type"
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
          MODAL: Create / Edit Work Type matching screenshot
         ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                {editingItem ? 'Edit Work Type' : 'Create Work Type'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            {/* Form inside border box matching screenshot */}
            <form onSubmit={handleSubmit} className="pt-4">
              <div className="rounded-md border border-gray-200 p-6 space-y-5">
                {/* Field 1: Work Type: */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Work Type:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Work Type"
                    value={formWorkType}
                    onChange={(e) => setFormWorkType(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Field 2: Company: */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Company:
                  </label>
                  <div className="relative">
                    <select
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {availableCompanies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-center px-2.5 text-gray-400">
                      <svg className="h-3 w-3 -mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                      </svg>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl transition-all">
            <h3 className="text-lg font-bold text-gray-900">Delete Work Type</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete the work type &quot;{deleteTarget.name}&quot;? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
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

export default WorkTypeTab;
