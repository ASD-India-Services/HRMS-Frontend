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
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { StateView } from '@/components/ui/StateView';
import { Iconify } from '@/components/Iconify';

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
    <PageContainer>
      <PageHeader
        title="Policies"
        breadcrumb={
          <span className="inline-flex items-center gap-1.5">
            <span>More</span>
            <Iconify icon="chevron-right" width={14} />
            <span className="text-ink-primary font-medium">Policies</span>
          </span>
        }
        actions={
        <>
          {/* Search Bar */}
          <div className="relative">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              inputSize="small"
              className="w-48 sm:w-64"
            />
            {searchTerm && (
              <IconButton icon="close" size="small" onClick={() => setSearchTerm('')} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Create Button */}
          {canCreate && (
            <Button startIcon={<Iconify icon="plus" />} onClick={handleOpenCreateModal}>
              Create
            </Button>
          )}
        </>
        }
      />

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
        <Card>
          <StateView
            icon="policies"
            title="No records found"
            description={
              searchTerm
                ? 'No policies match your search term. Try a different query.'
                : 'Add organizational policies, guidelines, and manuals for company staff to reference.'
            }
            action={
              canCreate && (
                <Button startIcon={<Iconify icon="plus" />} onClick={handleOpenCreateModal}>
                  Create Policy
                </Button>
              )
            }
          />
        </Card>
      )}

      {/* Cards Grid */}
      {!isLoading && !isError && policies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {policies.map((policy) => {
            if (!policy) return null;
            return (
              <Card
                key={policy.id || policy.title}
                className="p-5 hover:shadow-md transition flex flex-col justify-between"
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
                        <IconButton icon="pencil" size="small" onClick={(e) => handleOpenEditModal(policy, e)} aria-label="Edit Policy" />
                      )}
                      {canDelete && (
                        <IconButton icon="trash" size="small" color="error" onClick={(e) => {
                            e.stopPropagation();
                            setDeletingPolicy(policy);
                          }} aria-label="Delete Policy" />
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
              </Card>
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
              <IconButton icon="close" size="small" onClick={() => setIsModalOpen(false)} aria-label="Close" />
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
                        <IconButton icon="close" size="small" onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCompany(comp);
                          }} aria-label={`Remove ${comp}`} />
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
                      <Iconify icon="chevron-down" width={14} />
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
                            <Button
                              key={comp}
                              variant={isSelected ? 'soft' : 'text'}
                              color={isSelected ? 'primary' : 'inherit'}
                              size="small"
                              className="w-full !justify-between !rounded-none"
                              endIcon={isSelected ? <Iconify icon="check" /> : undefined}
                              onClick={() => handleToggleCompany(comp)}
                            >
                              {comp}
                            </Button>
                          );
                        })}

                      {companySearch.trim() &&
                        !availableCompanies.some(
                          (c) => c.toLowerCase() === companySearch.trim().toLowerCase()
                        ) && (
                          <Button variant="soft" onClick={handleAddCustomCompany} className="w-full">
                            <span>+</span>
                            <span>Add "{companySearch.trim()}"</span>
                          </Button>
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
              <IconButton icon="close" size="small" onClick={() => setViewingPolicy(null)} aria-label="Close" />
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
                  <Iconify icon="download" width={20} className="text-primary-main" />
                  <span>Official Policy Document Attached</span>
                </div>
                <ButtonLink
                  size="small"
                  href={viewingPolicy.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download File
                </ButtonLink>
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
              <Button color="error" size="small" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}

