import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHRSettings } from '@/hooks/useHRSettings';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, CheckIcon, LoaderIcon } from './SettingsIcons';

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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Candidate Reject Reason</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define standardized rejection categories across applicant review and hiring pipeline stages.
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
            placeholder="Search reject reasons..."
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

      {/* Table of Reasons with Company column */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Reject Reason
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Company
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Description
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Status
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
            {filteredReasons.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  No reject reasons found. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredReasons.map((reason) => (
                <tr key={reason.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{reason.title}</td>
                  <td className="px-6 py-4 text-gray-600">{reason.company}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-sm truncate" title={reason.description}>
                    {reason.description || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(reason.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
                        reason.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {reason.isActive && <CheckIcon className="h-3 w-3" />}
                      {reason.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(reason)}
                        className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                        title="Edit reason"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-px bg-gray-200 my-auto" />
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(reason)}
                        className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                        title="Delete reason"
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

      {/* Modal Dialog with Company field */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                {editingReason ? 'Edit Reject Reason' : 'Create Reject Reason'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            {/* Form inside border box matching screenshot standard */}
            <form onSubmit={handleSubmitModal} className="pt-4">
              <div className="rounded-md border border-gray-200 p-6 space-y-5">
                {/* Field 1: Reason Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Reason Title:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Salary Expectation Exceeds Band"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Field 2: Company */}
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

                {/* Field 3: Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                    Description:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explanation of when this rejection reason should be applied..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Field 4: Is Active Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="formIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="formIsActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Mark as Active
                  </label>
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
            <h3 className="text-lg font-bold text-gray-900">Delete Reject Reason</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete the rejection reason &quot;{deleteTarget.title}&quot;? This action cannot be undone.
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

export default CandidateRejectReasonTab;
