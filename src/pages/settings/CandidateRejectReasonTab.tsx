import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHRSettings } from '@/hooks/useHRSettings';
import { PlusIcon, SearchIcon, CheckIcon, LoaderIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

export interface RejectReason {
  id: string;
  title: string;
  company: string;
  description: string;
  isActive: boolean;
}

const DEFAULT_REJECT_REASONS: RejectReason[] = [
  {
    id: '1',
    title: 'Skill Set & Experience Mismatch',
    company: 'G7 Synergon PVT. LTD. CRO',
    description: 'Candidate technical skills or years of relevant experience do not align with job opening requirements.',
    isActive: true,
  },
  {
    id: '2',
    title: 'Salary Expectation Exceeds Budget',
    company: 'G7 Synergon PVT. LTD. CRO',
    description: 'Candidate current CTC or expected CTC exceeds the approved budget band for this position.',
    isActive: true,
  },
  {
    id: '3',
    title: 'Notice Period Too Long',
    company: 'G7 Synergon PVT. LTD. CRO',
    description: 'Candidate notice period exceeds required immediate joiner timeframe (e.g. > 60 days).',
    isActive: true,
  },
  {
    id: '4',
    title: 'Did Not Clear Technical Assessment',
    company: 'G7 Synergon PVT. LTD. CRO',
    description: 'Candidate scored below the passing cutoff on coding or domain technical interview round.',
    isActive: true,
  },
  {
    id: '5',
    title: 'Candidate Withdrew / Accepted Counter Offer',
    company: 'G7 Synergon PVT. LTD. CRO',
    description: 'Candidate declined further rounds or accepted an alternative external offer.',
    isActive: true,
  },
  {
    id: '6',
    title: 'Location / Shift Incompatibility',
    company: 'G7 Synergon PVT. LTD. CRO',
    description: 'Candidate unwilling or unable to relocate or work required operational shifts.',
    isActive: true,
  },
];

const LOCAL_STORAGE_KEY = 'hrms_candidate_reject_reasons';

export function CandidateRejectReasonTab() {
  const { data: settings, isLoading } = useHRSettings();

  // Query branches created inside this specific organization
  const { data: branchesData } = useQuery<any>({
    queryKey: ['branches-reject-reasons'],
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

  const [reasons, setReasons] = useState<RejectReason[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure company field exists on older stored items
          return parsed.map((item: any) => ({
            ...item,
            company: item.company || 'G7 Synergon PVT. LTD. CRO',
          }));
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_REJECT_REASONS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<RejectReason | null>(null);

  // Form states matching Horilla / DigiHRMS modal standard
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState(() => availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<RejectReason | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Keep formCompany in sync when available companies load
  useEffect(() => {
    if (availableCompanies.length > 0 && !availableCompanies.includes(formCompany) && !editingReason) {
      setFormCompany(availableCompanies[0]);
    }
  }, [availableCompanies, formCompany, editingReason]);

  const saveToStorage = (updated: RejectReason[], msg: string) => {
    setReasons(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    showNotification(msg);
  };

  const handleOpenAdd = () => {
    setEditingReason(null);
    setFormTitle('');
    setFormCompany(availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
    setFormDescription('');
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (reason: RejectReason) => {
    setEditingReason(reason);
    setFormTitle(reason.title);
    setFormCompany(reason.company || availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO');
    setFormDescription(reason.description);
    setFormIsActive(reason.isActive);
    setModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated = reasons.filter((r) => r.id !== deleteTarget.id);
    saveToStorage(updated, 'Reject reason deleted successfully');
    setDeleteTarget(null);
  };

  const handleToggleActive = (id: string) => {
    const updated = reasons.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    saveToStorage(updated, 'Status updated');
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const companyToSave = formCompany || availableCompanies[0] || 'G7 Synergon PVT. LTD. CRO';

    if (editingReason) {
      const updated = reasons.map((r) =>
        r.id === editingReason.id
          ? {
              ...r,
              title: formTitle.trim(),
              company: companyToSave,
              description: formDescription.trim(),
              isActive: formIsActive,
            }
          : r
      );
      saveToStorage(updated, 'Reject reason updated successfully');
    } else {
      const newReason: RejectReason = {
        id: Date.now().toString(),
        title: formTitle.trim(),
        company: companyToSave,
        description: formDescription.trim(),
        isActive: formIsActive,
      };
      saveToStorage([newReason, ...reasons], 'Reject reason created successfully');
    }
    setModalOpen(false);
  };

  const filteredReasons = reasons.filter(
    (r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h2 className="text-lg font-semibold text-ink-primary">Candidate Reject Reason</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Define standardized rejection categories across applicant review and hiring pipeline stages.
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
            placeholder="Search reject reasons..."
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

      {/* Table of Reasons with Company column */}
      <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Reject Reason
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Company
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Description
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Status
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
            {filteredReasons.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-ink-disabled">
                  No reject reasons found. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredReasons.map((reason) => (
                <tr key={reason.id} className="hover:bg-surface-neutral/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink-primary">{reason.title}</td>
                  <td className="px-6 py-4 text-ink-secondary">{reason.company}</td>
                  <td className="px-6 py-4 text-ink-secondary max-w-sm truncate" title={reason.description}>
                    {reason.description || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Button
 type="button"
 size="small"
 variant="soft"
 color={reason.isActive ? 'success' : 'inherit'}
 startIcon={reason.isActive ? <CheckIcon /> : undefined}
 onClick={() => handleToggleActive(reason.id)}
 >
 {reason.isActive ? 'Active' : 'Inactive'}
 </Button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <IconButton icon="pencil" size="small" aria-label="Edit reason" title="Edit reason" onClick={() => handleOpenEdit(reason)} />
                      <IconButton icon="trash" size="small" color="error" aria-label="Delete reason" title="Delete reason" onClick={() => setDeleteTarget(reason)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog with Company field */}
      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} labelledBy="CandidateRejectReasonTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <h3 id="CandidateRejectReasonTab-modal-title-1" className="text-lg font-semibold text-ink-primary">
                {editingReason ? 'Edit Reject Reason' : 'Create Reject Reason'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setModalOpen(false)} />
            </div>

            {/* Form inside border box matching screenshot standard */}
            <form onSubmit={handleSubmitModal} className="pt-4">
              <div className="rounded-md border border-divider p-6 space-y-5">
                {/* Field 1: Reason Title */}
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Reason Title:
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Salary Expectation Exceeds Band"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                {/* Field 2: Company */}
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

                {/* Field 3: Description */}
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                    Description:
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Explanation of when this rejection reason should be applied..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                {/* Field 4: Is Active Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="formIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main cursor-pointer"
                  />
                  <label htmlFor="formIsActive" className="text-sm font-medium text-ink-primary cursor-pointer">
                    Mark as Active
                  </label>
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
        <Modal open onClose={() => setDeleteTarget(null)} labelledBy="CandidateRejectReasonTab-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="CandidateRejectReasonTab-modal-title-2" className="text-lg font-semibold text-ink-primary">Delete Reject Reason</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              Are you sure you want to delete the rejection reason &quot;{deleteTarget.title}&quot;? This action cannot be undone.
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

export default CandidateRejectReasonTab;
