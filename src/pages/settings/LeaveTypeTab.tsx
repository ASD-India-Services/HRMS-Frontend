import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHRSettings } from '@/hooks/useHRSettings';
import { PlusIcon, SearchIcon, CheckIcon, LoaderIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

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
    company: 'digiHRMS',
  },
  {
    id: '2',
    name: 'Sick Leave',
    company: 'digiHRMS',
  },
  {
    id: '3',
    name: 'Earned Leave',
    company: 'digiHRMS',
  },
  {
    id: '4',
    name: 'Compensatory Off',
    company: 'digiHRMS',
  },
  {
    id: '5',
    name: 'Maternity / Paternity Leave',
    company: 'digiHRMS',
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
      list.push(settings?.company_name || 'digiHRMS');
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
              company: s.company || availableCompanies[0] || 'digiHRMS',
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
  const [formCompany, setFormCompany] = useState(() => availableCompanies[0] || 'digiHRMS');

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
    setFormCompany(availableCompanies[0] || 'digiHRMS');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: LeaveTypeItem) => {
    setEditingItem(item);
    setFormLeaveType(item.name);
    setFormCompany(
      !item.company || item.company.includes('Synergon') || item.company.includes('G7')
        ? availableCompanies[0] || 'digiHRMS'
        : item.company
    );
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLeaveType.trim()) return;

    const companyToSave = formCompany || availableCompanies[0] || 'digiHRMS';

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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Leave Type</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Define organizational leave categories and associated companies.
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

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled" />
          <Input
            type="text"
            placeholder="Search leave types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3"
          />
        </div>
        {(isSettingsLoading || isLeaveTypesLoading) && (
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <LoaderIcon className="h-3.5 w-3.5 animate-spin text-primary-main" />
            <span>Syncing...</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Leave Type
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
                  No leave types found. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-surface-neutral/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink-primary">{item.name}</td>
                  <td className="px-6 py-4 text-ink-secondary">{item.company}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <IconButton icon="pencil" size="small" aria-label="Edit leave type" title="Edit leave type" onClick={() => handleOpenEdit(item)} />
                      <IconButton icon="trash" size="small" color="error" aria-label="Delete leave type" title="Delete leave type" onClick={() => setDeleteTarget(item)} />
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
        <Modal open onClose={() => setModalOpen(false)} labelledBy="LeaveTypeTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <h3 id="LeaveTypeTab-modal-title-1" className="text-lg font-semibold text-ink-primary">
                {editingItem ? 'Edit Leave Type' : 'Create Leave Type'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setModalOpen(false)} />
            </div>

            {/* Form inside border box matching screenshot */}
            <form onSubmit={handleSubmit} className="pt-4">
              <div className="rounded-md border border-divider p-6 space-y-5">
                {/* Field 1: Leave Type: */}
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Leave Type:
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Leave Type"
                    value={formLeaveType}
                    onChange={(e) => setFormLeaveType(e.target.value)}
                  />
                </div>

                {/* Field 2: Company: */}
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

                {/* Save Button */}
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} labelledBy="LeaveTypeTab-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="LeaveTypeTab-modal-title-2" className="text-lg font-semibold text-ink-primary">Delete Leave Type</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              Are you sure you want to delete the leave type &quot;{deleteTarget.name}&quot;? This action cannot be undone.
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

export default LeaveTypeTab;

