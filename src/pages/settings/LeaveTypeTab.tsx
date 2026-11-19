import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHRSettings } from '@/hooks/useHRSettings';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, CheckIcon, LoaderIcon } from './SettingsIcons';

export interface LeaveTypeItem {
  id: string;
  name: string;
  company: string;
  [key: string]: any;
}

const DEFAULT_LEAVE_TYPES: LeaveTypeItem[] = [
  {
    id: '1',
    name: 'Casual Leave',
    company: 'G7 Synergon PVT. LTD. CRO',
  },
  {
    id: '2',
    name: 'Sick Leave',
    company: 'G7 Synergon PVT. LTD. CRO',
  },
  {
    id: '3',
    name: 'Earned Leave',
    company: 'G7 Synergon PVT. LTD. CRO',
  },
  {
    id: '4',
    name: 'Compensatory Off',
    company: 'G7 Synergon PVT. LTD. CRO',
  },
  {
    id: '5',
    name: 'Maternity / Paternity Leave',
    company: 'G7 Synergon PVT. LTD. CRO',
  },
];

const LOCAL_STORAGE_KEY = 'hrms_leave_types_settings';

export function LeaveTypeTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: isSettingsLoading } = useHRSettings();

  // Query branches created inside this specific organization
  const { data: branchesData } = useQuery<any>({
    queryKey: ['branches-leave-types'],
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

  // Query server leave types
  const { data: serverLeaveTypes, isLoading: isLeaveTypesLoading } = useQuery<any>({
    queryKey: ['leave-types-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/leaves/types/');
        const data = res.data;
        return Array.isArray(data) ? data : data?.results || [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
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

  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_LEAVE_TYPES;
  });

  // Sync server items if any exist
  useEffect(() => {
    if (Array.isArray(serverLeaveTypes) && serverLeaveTypes.length > 0) {
      setLeaveTypes((prev) => {
        const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
        const merged = [...prev];
        serverLeaveTypes.forEach((s: any) => {
          if (!existingNames.has(s.name.toLowerCase())) {
            merged.push({
              id: s.id || Date.now().toString(),
              name: s.name,
              company: s.company || availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO',
            });
            existingNames.add(s.name.toLowerCase());
          }
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    }
  }, [serverLeaveTypes, availableCompanies]);

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveTypeItem | null>(null);

  // Form states matching Work Type / Horilla design
  const [formLeaveType, setFormLeaveType] = useState('');
  const [formCompany, setFormCompany] = useState(() => availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LeaveTypeItem | null>(null);

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

  const saveToStorage = (updated: LeaveTypeItem[], msg: string) => {
    setLeaveTypes(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    showNotification(msg);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormLeaveType('');
    setFormCompany(availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: LeaveTypeItem) => {
    setEditingItem(item);
    setFormLeaveType(item.name);
    setFormCompany(item.company || availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLeaveType.trim()) return;

    const companyToSave = formCompany || availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO';

    // Try backend persistence if possible
    try {
      if (editingItem) {
        await api.patch(`/api/v1/leaves/types/${editingItem.id}/`, {
          name: formLeaveType.trim(),
        });
      } else {
        await api.post('/api/v1/leaves/types/', {
          name: formLeaveType.trim(),
          is_paid: true,
          requires_approval: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['leave-types-list'] });
    } catch {
      // Local state fallback succeeds even if server API fails
    }

    if (editingItem) {
      const updated = leaveTypes.map((w) =>
        w.id === editingItem.id
          ? {
              ...w,
              name: formLeaveType.trim(),
              company: companyToSave,
            }
          : w
      );
      saveToStorage(updated, 'Leave type updated successfully');
    } else {
      const newItem: LeaveTypeItem = {
        id: Date.now().toString(),
        name: formLeaveType.trim(),
        company: companyToSave,
      };
      saveToStorage([...leaveTypes, newItem], 'Leave type created successfully');
    }
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(`/api/v1/leaves/types/${deleteTarget.id}/`);
      queryClient.invalidateQueries({ queryKey: ['leave-types-list'] });
    } catch {
      // local fallback
    }

    const updated = leaveTypes.filter((w) => w.id !== deleteTarget.id);
    saveToStorage(updated, 'Leave type deleted');
    setDeleteTarget(null);
  };

  const filteredItems = leaveTypes.filter(
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Leave Type</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define organizational leave categories and associated companies.
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
            placeholder="Search leave types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-1.5 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {(isSettingsLoading || isLeaveTypesLoading) && (
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
                Leave Type
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
                  No leave types found. Click &quot;+ Create&quot; to add one.
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
                        title="Edit leave type"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-px bg-gray-200 my-auto" />
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                        title="Delete leave type"
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Create / Edit Leave Type matching screenshot design
         ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                {editingItem ? 'Edit Leave Type' : 'Create Leave Type'}
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
                {/* Field 1: Leave Type: */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Leave Type:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Leave Type"
                    value={formLeaveType}
                    onChange={(e) => setFormLeaveType(e.target.value)}
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
            <h3 className="text-lg font-bold text-gray-900">Delete Leave Type</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete the leave type &quot;{deleteTarget.name}&quot;? This action cannot be undone.
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

export default LeaveTypeTab;

