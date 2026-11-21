import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import {
  usePolicies,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
} from '@/hooks/usePolicies';
import type { CompanyPolicy } from '@/types/policies';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Policies() {
  const { showToast } = useToast();
  const permissionsCtx = useHrmsPermissionsContext();
  const hasPermission = permissionsCtx?.hasPermission ?? (() => false);
  const roleName = permissionsCtx?.roleName ?? null;
  const isOrgAdmin = roleName === 'org_admin';

  const canCreate = isOrgAdmin || hasPermission('policies.create');
  const canEdit = isOrgAdmin || hasPermission('policies.edit');
  const canDelete = isOrgAdmin || hasPermission('policies.delete');

  const [searchTerm, setSearchTerm] = useState('');
  const { data: rawPolicies, isLoading, isError, error } = usePolicies(searchTerm);

  const policies: CompanyPolicy[] = Array.isArray(rawPolicies)
    ? rawPolicies
    : Array.isArray((rawPolicies as any)?.results)
    ? (rawPolicies as any).results
    : [];

  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();
  const deleteMutation = useDeletePolicy();

  // Fetch HR Settings and Branches for dynamic company options
  const { data: hrSettings } = useQuery<{ company_name?: string }>({
    queryKey: ['hr-settings-company'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/hr-settings/');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

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

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    // 1. Primary Organization Company Name from HR Settings
    if (hrSettings?.company_name?.trim()) {
      set.add(hrSettings.company_name.trim());
    }
    // 2. Physical Branches / Locations of the company
    const branchList = Array.isArray(branchesData)
      ? branchesData
      : Array.isArray((branchesData as any)?.results)
      ? (branchesData as any).results
      : [];
    branchList.forEach((b: any) => {
      if (b?.name?.trim()) set.add(b.name.trim());
    });
    return Array.from(set);
  }, [hrSettings, branchesData]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CompanyPolicy | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formIsVisibleToAll, setFormIsVisibleToAll] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Close company dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggleCompany = (company: string) => {
    const trimmed = company.trim();
    if (!trimmed) return;
    setSelectedCompanies((prev) =>
      prev.includes(trimmed) ? prev.filter((c) => c !== trimmed) : [...prev, trimmed]
    );
    setCompanySearch('');
  };

  const handleRemoveCompany = (company: string) => {
    setSelectedCompanies((prev) => prev.filter((c) => c !== company));
  };

  const handleAddCustomCompany = () => {
    const trimmed = companySearch.trim();
    if (trimmed && !selectedCompanies.includes(trimmed)) {
      setSelectedCompanies((prev) => [...prev, trimmed]);
      setCompanySearch('');
    }
  };

  // View Policy Modal
  const [viewingPolicy, setViewingPolicy] = useState<CompanyPolicy | null>(null);

  // Delete Confirm State
  const [deletingPolicy, setDeletingPolicy] = useState<CompanyPolicy | null>(null);

  const handleOpenCreateModal = () => {
    setEditingPolicy(null);
    setFormTitle('');
    setFormBody('');
    setFormIsVisibleToAll(true);
    const defaultCompany = hrSettings?.company_name || availableCompanies[0] || '';
    setSelectedCompanies(defaultCompany ? [defaultCompany] : []);
    setCompanySearch('');
    setIsCompanyDropdownOpen(false);
    setFormFile(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (policy: CompanyPolicy, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPolicy(policy);
    setFormTitle(policy?.title || '');
    setFormBody(policy?.body || '');
    setFormIsVisibleToAll(Boolean(policy?.is_visible_to_all));
    const comps = policy?.company
      ? policy.company.split(',').map((c: string) => c.trim()).filter(Boolean)
      : (availableCompanies[0] ? [availableCompanies[0]] : []);
    setSelectedCompanies(comps);
    setCompanySearch('');
    setIsCompanyDropdownOpen(false);
    setFormFile(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!formBody.trim()) {
      setFormError('Body is required.');
      return;
    }
    setFormError(null);

    const compString = selectedCompanies.join(', ').trim() || hrSettings?.company_name || '';

    try {
      if (editingPolicy) {
        await updateMutation.mutateAsync({
          id: editingPolicy.id,
          payload: {
            title: formTitle.trim(),
            body: formBody.trim(),
            is_visible_to_all: formIsVisibleToAll,
            company: compString,
            attachment: formFile,
          },
        });
      } else {
        await createMutation.mutateAsync({
          title: formTitle.trim(),
          body: formBody.trim(),
          is_visible_to_all: formIsVisibleToAll,
          company: compString,
          attachment: formFile,
        });
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving.';
      setFormError(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPolicy) return;
    try {
      await deleteMutation.mutateAsync(deletingPolicy.id);
      setDeletingPolicy(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete policy', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary mb-1">
            <span>More</span>
            <span>&gt;</span>
            <span className="text-ink-primary font-medium">Policies</span>
          </div>
          <h1 className="text-2xl font-bold text-ink-primary">Policies</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-48 sm:w-64"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink-secondary text-sm"
              >
                &times;
              </button>
            )}
          </div>

          {/* Create Button */}
          {canCreate && (
            <Button
              type="button"
              onClick={handleOpenCreateModal}
            >
              <span className="text-base font-bold leading-none">+</span>
              <span>Create</span>
            </Button>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
          <span className="ml-3 text-sm text-ink-secondary">Loading policies...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-error-light bg-error-lighter p-4 text-xs text-error-dark">
          Failed to load policies. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && policies.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-divider bg-surface-paper py-16 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-lighter text-primary-main">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-bold text-ink-primary">No Policies Found</h3>
          <p className="mt-1 text-xs text-ink-secondary max-w-sm mx-auto">
            {searchTerm
              ? 'No policies match your search term. Try a different query.'
              : 'Add organizational policies, guidelines, and manuals for company staff to reference.'}
          </p>
          {canCreate && (
            <Button size="small"
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4"
            >
              + Create Policy
            </Button>
          )}
        </div>
      )}

      {/* Cards Grid */}
      {!isLoading && !isError && policies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {policies.map((policy) => {
            if (!policy) return null;
            return (
              <div
                key={policy.id || policy.title}
                className="rounded-lg border border-divider bg-surface-paper p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Top: Indicator + Title + Edit/Delete Icons */}
                  <div className="flex items-center justify-between pb-3 border-b border-divider">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="h-2 w-2 rounded-full bg-success-main flex-shrink-0" />
                      <span className="font-bold text-sm text-ink-primary truncate" title={policy.title || 'Untitled'}>
                        {policy.title || 'Untitled Policy'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(policy, e)}
                          className="p-1 text-ink-disabled hover:text-primary-main transition"
                          title="Edit Policy"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingPolicy(policy);
                          }}
                          className="p-1 text-ink-disabled hover:text-error-main transition"
                          title="Delete Policy"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body Preview (Scrollable content) */}
                  <div
                    className="mt-3 h-56 overflow-y-auto rounded bg-surface-neutral/50 p-3 text-xs text-ink-primary leading-relaxed font-sans prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{ __html: policy?.body || '' }}
                  />
                </div>

                {/* Card Footer: View Policy Button */}
                <div className="mt-4 pt-2">
                  <Button size="small"
                    type="button"
                    onClick={() => setViewingPolicy(policy)}
                    className="w-full"
                  >
                    View policy
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL 1: Create / Edit Policy ─────────────────────────────────── */}
      {isModalOpen && (
        <Modal open onClose={() => setIsModalOpen(false)} labelledBy="Policies-modal-title-1" size="lg" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 sm:p-7 min-h-0 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <h3 id="Policies-modal-title-1" className="text-xl font-normal text-ink-primary">
                {editingPolicy ? 'Edit Policy' : 'Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-disabled hover:text-ink-secondary text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-md bg-error-lighter p-2.5 text-xs text-error-dark border border-error-light">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Title: <span className="text-error-main">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Title"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Body: <span className="text-error-main">*</span>
                </label>
                <RichTextEditor
                  value={formBody}
                  onChange={setFormBody}
                  placeholder="Enter policy content or format with toolbar..."
                  minHeight="220px"
                />
              </div>

              {/* Is visible to all */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVisibleToAll"
                  checked={formIsVisibleToAll}
                  onChange={(e) => setFormIsVisibleToAll(e.target.checked)}
                  className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
                />
                <label htmlFor="isVisibleToAll" className="text-sm font-medium text-ink-primary cursor-pointer">
                  Is visible to all:
                </label>
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Company:
                </label>
                <div ref={companyDropdownRef} className="relative">
                  <div
                    onClick={() => setIsCompanyDropdownOpen(true)}
                    className="w-full min-h-[46px] rounded border border-divider bg-surface-paper p-2 text-xs flex flex-wrap gap-1.5 items-center cursor-pointer focus-within:border-primary-main transition shadow-2xs"
                  >
                    {selectedCompanies.map((comp) => (
                      <span
                        key={comp}
                        className="inline-flex items-center gap-1.5 rounded bg-surface-neutral px-2.5 py-1 text-ink-primary font-medium border border-divider shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCompany(comp);
                          }}
                          className="text-ink-disabled hover:text-ink-primary text-xs font-bold leading-none"
                          title={`Remove ${comp}`}
                        >
                          ✕
                        </button>
                        <span>{comp}</span>
                      </span>
                    ))}

                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        setIsCompanyDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomCompany();
                        }
                      }}
                      placeholder={selectedCompanies.length === 0 ? "Select or search company..." : "Type to add company..."}
                      className="flex-1 min-w-[140px] border-none bg-transparent p-1 text-xs text-ink-primary focus:outline-none placeholder-ink-disabled"
                    />

                    <div className="ml-auto flex items-center pr-1 text-ink-disabled">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  {isCompanyDropdownOpen && (
                    <div className="absolute left-0 top-full z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-divider bg-surface-paper py-1 shadow-xl text-xs">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-disabled">
                        Available Companies & Branches
                      </div>

                      {availableCompanies
                        .filter((c) =>
                          c.toLowerCase().includes(companySearch.toLowerCase().trim())
                        )
                        .map((comp) => {
                          const isSelected = selectedCompanies.includes(comp);
                          return (
                            <button
                              key={comp}
                              type="button"
                              onClick={() => handleToggleCompany(comp)}
                              className={`w-full px-3 py-2 text-left flex items-center justify-between transition ${
                                isSelected
                                  ? 'bg-primary-lighter text-primary-dark font-medium'
                                  : 'text-ink-primary hover:bg-surface-neutral'
                              }`}
                            >
                              <span>{comp}</span>
                              {isSelected && (
                                <span className="text-primary-main font-bold">✓</span>
                              )}
                            </button>
                          );
                        })}

                      {companySearch.trim() &&
                        !availableCompanies.some(
                          (c) => c.toLowerCase() === companySearch.trim().toLowerCase()
                        ) && (
                          <button
                            type="button"
                            onClick={handleAddCustomCompany}
                            className="w-full border-t border-divider px-3 py-2 text-left text-primary-main hover:bg-primary-lighter font-medium flex items-center gap-1.5"
                          >
                            <span>+</span>
                            <span>Add "{companySearch.trim()}"</span>
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Attachments:
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-ink-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-divider file:text-xs file:font-medium file:bg-surface-paper file:text-ink-primary hover:file:bg-surface-neutral cursor-pointer"
                />
                {editingPolicy?.attachment && !formFile && (
                  <p className="mt-1 text-xs text-primary-main">
                    Existing attachment uploaded:{' '}
                    <a
                      href={editingPolicy.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View Attachment
                    </a>
                  </p>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 2: View Policy Details ──────────────────────────────────── */}
      {viewingPolicy && (
        <Modal open onClose={() => setViewingPolicy(null)} labelledBy="Policies-modal-title-2" size="lg" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 sm:p-8 min-h-0 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-divider">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-success-main inline-block" />
                  <h2 id="Policies-modal-title-2" className="text-xl font-bold text-ink-primary">{viewingPolicy.title || 'Policy Details'}</h2>
                </div>
                <p className="text-xs text-ink-secondary mt-1">
                  Company: <span className="font-semibold text-ink-primary">{viewingPolicy.company || hrSettings?.company_name || 'All Companies'}</span>
                  {viewingPolicy.is_visible_to_all && (
                    <span className="ml-2 inline-flex items-center rounded bg-success-lighter px-2 py-0.5 text-[10px] font-semibold text-success-dark border border-success-light">
                      Visible to all
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPolicy(null)}
                className="text-ink-disabled hover:text-ink-secondary text-xl leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div
              className="mt-6 prose prose-sm max-w-none text-ink-primary leading-relaxed rounded-lg bg-surface-neutral/50 p-6 border border-divider"
              dangerouslySetInnerHTML={{ __html: viewingPolicy.body || '' }}
            />

            {/* Attachment Download */}
            {viewingPolicy.attachment && (
              <div className="mt-5 rounded-lg border border-primary-light bg-primary-lighter/50 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-primary-darker font-medium">
                  <svg className="h-5 w-5 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span>Official Policy Document Attached</span>
                </div>
                <a
                  href={viewingPolicy.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-primary-main px-3.5 py-1.5 text-xs font-semibold text-primary-contrast shadow-xs hover:bg-primary-dark transition"
                >
                  Download File
                </a>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setViewingPolicy(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 3: Delete Confirmation ──────────────────────────────────── */}
      {deletingPolicy && (
        <Modal open onClose={() => setDeletingPolicy(null)} labelledBy="Policies-modal-title-3" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="Policies-modal-title-3" className="text-base font-bold text-ink-primary">Delete Policy</h3>
            <p className="mt-2 text-xs text-ink-secondary">
              Are you sure you want to delete <span className="font-semibold text-ink-primary">{deletingPolicy.title}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setDeletingPolicy(null)}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="rounded bg-error-main px-4 py-2 text-xs font-semibold text-primary-contrast shadow-xs hover:bg-error-dark disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

