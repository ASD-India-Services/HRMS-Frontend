import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import {
  useFAQs,
  useFAQCategories,
  useCreateFAQ,
  useUpdateFAQ,
  useDeleteFAQ,
} from '@/hooks/useHelpdesk';
import type { FAQ } from '@/types/helpdesk';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

export default function FAQs() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { categoryId: paramCategoryId } = useParams<{ categoryId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCategoryId = searchParams.get('category');
  const activeCategoryId = paramCategoryId || queryCategoryId || '';

  const { hasPermission } = useHrmsPermissionsContext();
  const canCreate = hasPermission('faqs.create') || hasPermission('faq_categories.create');
  const canEdit = hasPermission('faqs.edit') || hasPermission('faq_categories.edit');
  const canDelete = hasPermission('faqs.delete') || hasPermission('faq_categories.delete');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(activeCategoryId);

  // Queries
  const { data: categories = [] } = useFAQCategories();
  const {
    data: faqs = [],
    isLoading,
    isError,
    error,
  } = useFAQs({
    category: selectedCategoryFilter || undefined,
    search: searchTerm || undefined,
  });

  const createMutation = useCreateFAQ();
  const updateMutation = useUpdateFAQ();
  const deleteMutation = useDeleteFAQ();

  // Selected Category Info
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryFilter);
  }, [categories, selectedCategoryFilter]);

  // Accordion Expanded State
  const [expandedFaqIds, setExpandedFaqIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formCategory, setFormCategory] = useState(selectedCategoryFilter || '');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm State
  const [deletingFaq, setDeletingFaq] = useState<FAQ | null>(null);

  const handleOpenCreateModal = () => {
    setEditingFaq(null);
    setFormCategory(selectedCategoryFilter || (categories[0]?.id ?? ''));
    setFormQuestion('');
    setFormAnswer('');
    setFormTags('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (faq: FAQ, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFaq(faq);
    setFormCategory(faq.category || '');
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormTags(faq.tags || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim()) {
      setFormError('Question is required.');
      return;
    }
    if (!formAnswer.trim()) {
      setFormError('Answer is required.');
      return;
    }
    setFormError(null);

    try {
      if (editingFaq) {
        await updateMutation.mutateAsync({
          id: editingFaq.id,
          payload: {
            category: formCategory || null,
            question: formQuestion.trim(),
            answer: formAnswer.trim(),
            tags: formTags.trim(),
          },
        });
      } else {
        await createMutation.mutateAsync({
          category: formCategory || null,
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          tags: formTags.trim(),
        });
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving.';
      setFormError(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFaq) return;
    try {
      await deleteMutation.mutateAsync(deletingFaq.id);
      setDeletingFaq(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete FAQ', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary mb-1">
          <span>Help Desk</span>
          <span>&gt;</span>
          <button
            onClick={() => navigate('/helpdesk/faq-categories')}
            className="hover:text-primary-main transition"
          >
            FAQ
          </button>
          <span>&gt;</span>
          <span className="text-ink-primary font-medium">
            {currentCategory ? currentCategory.title : 'All FAQs'}
          </span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-primary">FAQs</h1>
            {currentCategory && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-lighter px-3 py-1 text-xs font-semibold text-primary-dark border border-primary-light">
                <span>Category: {currentCategory.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter('');
                    if (paramCategoryId) {
                      navigate('/helpdesk/faqs');
                    } else {
                      setSearchParams({});
                    }
                  }}
                  className="ml-1 text-primary-main hover:text-primary-dark font-bold"
                  title="Clear category filter"
                >
                  &times;
                </button>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
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

            {/* Filter by Category */}
            <Select
              value={selectedCategoryFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategoryFilter(val);
                if (val) {
                  setSearchParams({ category: val });
                } else {
                  setSearchParams({});
                }
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </Select>

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
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
          <span className="ml-3 text-sm text-ink-secondary">Loading FAQs...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-error-light bg-error-lighter p-4 text-xs text-error-dark">
          Failed to load FAQs. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && faqs.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-divider bg-surface-paper py-16 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-lighter text-primary-main">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-bold text-ink-primary">No Frequently Asked Questions Found</h3>
          <p className="mt-1 text-xs text-ink-secondary max-w-sm mx-auto">
            {searchTerm || selectedCategoryFilter
              ? 'No FAQs match the current search or filter criteria.'
              : 'Start building your knowledge base by clicking "+ Create".'}
          </p>
          {canCreate && (
            <Button size="small"
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4"
            >
              + Create FAQ
            </Button>
          )}
        </div>
      )}

      {/* FAQs List */}
      {!isLoading && !isError && faqs.length > 0 && (
        <div className="divide-y divide-divider rounded-lg border border-divider bg-surface-paper shadow-xs overflow-hidden">
          {faqs.map((faq) => {
            const isExpanded = expandedFaqIds.has(faq.id);
            return (
              <div key={faq.id} className="transition-colors hover:bg-surface-neutral/50">
                {/* FAQ Row Header */}
                <div
                  onClick={() => toggleExpand(faq.id)}
                  className="flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 flex-1 pr-4">
                    <span className="text-ink-disabled font-mono text-xs">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span className="text-sm font-semibold text-ink-primary leading-snug">
                      {faq.question}
                    </span>
                    {faq.category_name && (
                      <span className="hidden sm:inline-flex items-center rounded-md bg-surface-neutral px-2 py-0.5 text-xs font-medium text-ink-secondary">
                        {faq.category_name}
                      </span>
                    )}
                  </div>

                  {/* Actions on right */}
                  <div className="flex items-center gap-3">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(faq, e)}
                        className="p-1 text-ink-disabled hover:text-primary-main transition"
                        title="Edit FAQ"
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
                          setDeletingFaq(faq);
                        }}
                        className="p-1 text-ink-disabled hover:text-error-main transition"
                        title="Delete FAQ"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Answer Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 text-sm text-ink-primary border-t border-divider bg-surface-neutral/40">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {faq.answer}
                    </div>

                    {/* Tags */}
                    {faq.tags && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-ink-disabled font-medium">Tags:</span>
                        {faq.tags.split(',').map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded bg-primary-lighter px-2 py-0.5 text-[11px] font-medium text-primary-dark border border-primary-light"
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: Create / Edit FAQ ─────────────────────────────────────── */}
      {isModalOpen && (
        <Modal open onClose={() => setIsModalOpen(false)} labelledBy="FAQs-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-divider">
              <h3 id="FAQs-modal-title-1" className="text-lg font-medium text-ink-primary">
                {editingFaq ? 'Edit FAQ' : 'Create FAQ'}
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
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Category:
                </label>
                <Select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="">No Category (General)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Question: <span className="text-error-main">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Question"
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Answer: <span className="text-error-main">*</span>
                </label>
                <Textarea
                  rows={4}
                  required
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder="Answer"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Tags:
                </label>
                <Input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Tags (comma separated, e.g. Leave, Vacation, Policy)"
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
      {deletingFaq && (
        <Modal open onClose={() => setDeletingFaq(null)} labelledBy="FAQs-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="FAQs-modal-title-2" className="text-base font-bold text-ink-primary">Delete FAQ</h3>
            <p className="mt-2 text-xs text-ink-secondary">
              Are you sure you want to delete this FAQ: <span className="font-semibold text-ink-primary">"{deletingFaq.question}"</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setDeletingFaq(null)}
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
