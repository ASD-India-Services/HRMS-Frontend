import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import {
  useFAQCategories,
  useCreateFAQCategory,
  useUpdateFAQCategory,
  useDeleteFAQCategory,
} from '@/hooks/useHelpdesk';
import type { FAQCategory } from '@/types/helpdesk';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';

export default function FAQCategories() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { hasPermission } = useHrmsPermissionsContext();

  const canCreate = hasPermission('faq_categories.create') || hasPermission('faqs.create');
  const canEdit = hasPermission('faq_categories.edit') || hasPermission('faqs.edit');
  const canDelete = hasPermission('faq_categories.delete') || hasPermission('faqs.delete');

  const [searchTerm, setSearchTerm] = useState('');
  const { data: categories = [], isLoading, isError, error } = useFAQCategories(searchTerm);

  const createMutation = useCreateFAQCategory();
  const updateMutation = useUpdateFAQCategory();
  const deleteMutation = useDeleteFAQCategory();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Active Dropdown for 3 dots menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Delete Confirm State
  const [deletingCategory, setDeletingCategory] = useState<FAQCategory | null>(null);

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormTitle('');
    setFormDescription('');
    setFormError(null);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleOpenEditModal = (cat: FAQCategory) => {
    setEditingCategory(cat);
    setFormTitle(cat.title);
    setFormDescription(cat.description || '');
    setFormError(null);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Title is required.');
      return;
    }
    setFormError(null);

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          payload: {
            title: formTitle.trim(),
            description: formDescription.trim(),
          },
        });
      } else {
        await createMutation.mutateAsync({
          title: formTitle.trim(),
          description: formDescription.trim(),
        });
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving.';
      setFormError(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    try {
      await deleteMutation.mutateAsync(deletingCategory.id);
      setDeletingCategory(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumb={
          <span className="flex items-center gap-1.5">
            <span>Help Desk</span>
            <Iconify icon="chevron-right" width={14} />
            <span className="font-medium text-ink-primary">FAQ</span>
          </span>
        }
        title="FAQ Categories"
        actions={
          <>
            {/* Search bar */}
            <div className="relative order-last ml-auto">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                aria-label="Search FAQ categories"
                className="w-48 pr-9 sm:w-64"
              />
              {searchTerm && (
                <IconButton
                  icon="close"
                  size="small"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                />
              )}
            </div>
            {/* Create Button */}
            {canCreate && (
              <Button onClick={handleOpenCreateModal} startIcon={<Iconify icon="plus" />}>
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
          <span className="ml-3 text-sm text-ink-secondary">Loading FAQ categories...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-card bg-error-lighter p-4 text-xs text-error-dark">
          Failed to load FAQ categories. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && categories.length === 0 && (
        <Card>
          <EmptyState
            module="helpdesk"
            title="No FAQ Categories Found"
            description={
              searchTerm
                ? 'No categories match your search. Try a different query.'
                : 'Create categories like Leave, Payroll, Asset, and Recruitment to organize help topics.'
            }
            ctaLabel="Create Category"
            onCtaClick={canCreate ? handleOpenCreateModal : undefined}
          />
        </Card>
      )}

      {/* Cards Grid */}
      {!isLoading && !isError && categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="relative flex flex-col justify-between p-6 transition-shadow hover:shadow-z8"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-ink-primary capitalize">{cat.title}</h3>

                  {/* 3 dots menu button */}
                  {(canEdit || canDelete) && (
                    <div className="relative">
                      <IconButton
                        icon="more-vertical"
                        size="small"
                        onClick={() => setActiveMenuId(activeMenuId === cat.id ? null : cat.id)}
                        aria-label="Actions"
                        title="Actions"
                      />

                      {/* Dropdown Menu */}
                      {activeMenuId === cat.id && (
                        <div
                          className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg bg-surface-paper p-1 shadow-dropdown animate-in fade-in zoom-in-95"
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          {canEdit && (
                            <Button
                              variant="text"
                              color="inherit"
                              size="small"
                              className="!w-full !justify-start"
                              onClick={() => handleOpenEditModal(cat)}
                              startIcon={<Iconify icon="pencil" />}
                            >
                              Edit
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="text"
                              color="error"
                              size="small"
                              className="!w-full !justify-start"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeletingCategory(cat);
                              }}
                              startIcon={<Iconify icon="trash" />}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="mt-2 text-xs text-ink-secondary line-clamp-3 min-h-[36px]">
                  {cat.description || `FAQs related to ${cat.title.toLowerCase()} are shown here`}
                </p>
              </div>

              {/* View FAQs Button */}
              <div className="mt-6 pt-2">
                <Button
                  onClick={() => navigate(`/helpdesk/faq-view/${cat.id}`)}
                  className="w-full"
                >
                  View FAQs
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── MODAL: Create / Edit FAQ Category ────────────────────────────── */}
      {isModalOpen && (
        <Modal open onClose={() => setIsModalOpen(false)} labelledBy="FAQCategories-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-divider">
              <h3 id="FAQCategories-modal-title-1" className="text-lg font-medium text-ink-primary">
                {editingCategory ? 'Edit FAQ Category' : 'Create FAQ Category'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setIsModalOpen(false)} />
            </div>

            {formError && (
              <div className="mt-3 rounded-card bg-error-lighter p-2.5 text-xs text-error-dark">
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

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Description:
                </label>
                <Textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description"
                />
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

      {/* ─── MODAL: Delete Confirmation ────────────────────────────────────── */}
      {deletingCategory && (
        <Modal open onClose={() => setDeletingCategory(null)} labelledBy="FAQCategories-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="FAQCategories-modal-title-2" className="text-base font-bold text-ink-primary">Delete FAQ Category</h3>
            <p className="mt-2 text-xs text-ink-secondary">
              Are you sure you want to delete <span className="font-semibold text-ink-primary">{deletingCategory.title}</span>? All FAQs under this category will also be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" onClick={() => setDeletingCategory(null)}>
                Cancel
              </Button>
              <Button color="error" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
