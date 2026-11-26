import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import {
  useFAQs,
  useFAQCategories,
  useCreateFAQ,
  useUpdateFAQ,
  useDeleteFAQ,
  useHelpdeskTags,
} from '@/hooks/useHelpdesk';
import { DEFAULT_HELPDESK_TAGS, type FAQ, type HelpdeskTag } from '@/types/helpdesk';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';

export default function FAQs() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { categoryId: paramCategoryId } = useParams<{ categoryId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCategoryId = searchParams.get('category');
  const queryTag = searchParams.get('tag') || '';
  const activeCategoryId = paramCategoryId || queryCategoryId || '';

  const { hasPermission } = useHrmsPermissionsContext();
  const canCreate = hasPermission('faqs.create') || hasPermission('faq_categories.create');
  const canEdit = hasPermission('faqs.edit') || hasPermission('faq_categories.edit');
  const canDelete = hasPermission('faqs.delete') || hasPermission('faq_categories.delete');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(activeCategoryId);
  const [selectedTagFilter, setSelectedTagFilter] = useState(queryTag);

  // Helpdesk Tags from Settings (with fallback)
  const { data: serverTags = [] } = useHelpdeskTags();
  const availableTags = useMemo<HelpdeskTag[]>(() => {
    if (serverTags && serverTags.length > 0) return serverTags;
    try {
      const saved = localStorage.getItem('hrms_helpdesk_tags');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_HELPDESK_TAGS;
  }, [serverTags]);

  const getTagColor = (tagName: string): string => {
    const match = availableTags.find(
      (t) => t.title.toLowerCase() === tagName.trim().toLowerCase()
    );
    return match?.color || '#3b82f6';
  };

  // Queries
  const { data: categories = [] } = useFAQCategories();
  const {
    data: faqs = [],
    isLoading,
    isError,
    error,
  } = useFAQs({
    category: selectedCategoryFilter || undefined,
    tag: selectedTagFilter || undefined,
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

  // Handle URL & Filter Sync
  const handleCategoryFilterChange = (val: string) => {
    setSelectedCategoryFilter(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val) {
      nextParams.set('category', val);
    } else {
      nextParams.delete('category');
    }
    setSearchParams(nextParams);
  };

  const handleTagFilterChange = (tagTitle: string) => {
    setSelectedTagFilter(tagTitle);
    const nextParams = new URLSearchParams(searchParams);
    if (tagTitle) {
      nextParams.set('tag', tagTitle);
    } else {
      nextParams.delete('tag');
    }
    setSearchParams(nextParams);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formCategory, setFormCategory] = useState(selectedCategoryFilter || '');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Selected tags in modal
  const selectedModalTags = useMemo(() => {
    return new Set(
      formTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    );
  }, [formTags]);

  const handleToggleModalTag = (tagTitle: string) => {
    const currentList = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const exists = currentList.some((t) => t.toLowerCase() === tagTitle.toLowerCase());
    let updated: string[];
    if (exists) {
      updated = currentList.filter((t) => t.toLowerCase() !== tagTitle.toLowerCase());
    } else {
      updated = [...currentList, tagTitle];
    }
    setFormTags(updated.join(', '));
  };

  // Delete Confirm State
  const [deletingFaq, setDeletingFaq] = useState<FAQ | null>(null);

  const handleOpenCreateModal = () => {
    setEditingFaq(null);
    setFormCategory(selectedCategoryFilter || (categories[0]?.id ?? ''));
    setFormQuestion('');
    setFormAnswer('');
    setFormTags(selectedTagFilter ? selectedTagFilter : '');
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
    <PageContainer>
      <PageHeader
        breadcrumb={
          <span className="flex items-center gap-1.5">
            <span>Help Desk</span>
            <Iconify icon="chevron-right" width={14} />
            <Button
              variant="text"
              color="inherit"
              size="small"
              className="!h-auto !px-1 !py-0.5 !font-normal"
              onClick={() => navigate('/helpdesk/faq-categories')}
            >
              FAQ
            </Button>
            <Iconify icon="chevron-right" width={14} />
            <span className="font-medium text-ink-primary">
              {currentCategory ? currentCategory.title : 'All FAQs'}
            </span>
          </span>
        }
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span>FAQs</span>
            {currentCategory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-lighter py-1 pl-3 pr-1 text-xs font-semibold text-primary-dark">
                <span>Category: {currentCategory.title}</span>
                <IconButton
                  icon="close"
                  size="small"
                  color="primary"
                  className="!h-5 !w-5"
                  aria-label="Clear category filter"
                  title="Clear category filter"
                  onClick={() => {
                    handleCategoryFilterChange('');
                    if (paramCategoryId) {
                      navigate('/helpdesk/faqs');
                    }
                  }}
                />
              </span>
            )}
            {selectedTagFilter && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-neutral border border-divider py-1 pl-2.5 pr-1 text-xs font-semibold text-ink-primary">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getTagColor(selectedTagFilter) }}
                />
                <span>Tag: #{selectedTagFilter}</span>
                <IconButton
                  icon="close"
                  size="small"
                  className="!h-5 !w-5"
                  aria-label="Clear tag filter"
                  title="Clear tag filter"
                  onClick={() => handleTagFilterChange('')}
                />
              </span>
            )}
          </span>
        }
        actions={
          <>
            {/* Search Input */}
            <div className="relative">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                aria-label="Search FAQs"
                className="w-44 pr-9 sm:w-56"
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

            {/* Filter by Category */}
            <Select
              className="w-40 sm:w-44"
              value={selectedCategoryFilter}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </Select>

            {/* Filter by Tag (Linked to Settings > Helpdesk Tags) */}
            <Select
              className="w-36 sm:w-40"
              value={selectedTagFilter}
              onChange={(e) => handleTagFilterChange(e.target.value)}
              aria-label="Filter by helpdesk tag"
            >
              <option value="">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.title}>
                  #{tag.title}
                </option>
              ))}
            </Select>

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
          <span className="ml-3 text-sm text-ink-secondary">Loading FAQs...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-card bg-error-lighter p-4 text-xs text-error-dark">
          Failed to load FAQs. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && faqs.length === 0 && (
        <Card>
          <EmptyState
            module="helpdesk"
            title="No Frequently Asked Questions Found"
            description={
              searchTerm || selectedCategoryFilter || selectedTagFilter
                ? 'No FAQs match the current search or filter criteria.'
                : 'Start building your knowledge base by creating your first FAQ.'
            }
            ctaLabel="Create FAQ"
            onCtaClick={canCreate ? handleOpenCreateModal : undefined}
          />
        </Card>
      )}

      {/* FAQs List */}
      {!isLoading && !isError && faqs.length > 0 && (
        <Card className="divide-y divide-divider overflow-hidden">
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
                    <Iconify
                      icon={isExpanded ? 'chevron-down' : 'chevron-right'}
                      width={16}
                      className="text-ink-disabled shrink-0"
                    />
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
                      <IconButton
                        icon="pencil"
                        size="small"
                        onClick={(e) => handleOpenEditModal(faq, e)}
                        aria-label="Edit FAQ"
                        title="Edit FAQ"
                      />
                    )}
                    {canDelete && (
                      <IconButton
                        icon="trash"
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingFaq(faq);
                        }}
                        aria-label="Delete FAQ"
                        title="Delete FAQ"
                      />
                    )}
                  </div>
                </div>

                {/* Expanded Answer Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 text-sm text-ink-primary bg-surface-neutral/40">
                    <div className="whitespace-pre-wrap leading-relaxed">{faq.answer}</div>

                    {/* Linked Tags with Configured Colors */}
                    {faq.tags && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-ink-disabled font-medium">Tags:</span>
                        {faq.tags
                          .split(',')
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((cleanTag, idx) => {
                            const color = getTagColor(cleanTag);
                            const isFiltered =
                              selectedTagFilter.toLowerCase() === cleanTag.toLowerCase();
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTagFilterChange(isFiltered ? '' : cleanTag);
                                }}
                                title={
                                  isFiltered
                                    ? 'Click to clear tag filter'
                                    : `Filter FAQs by #${cleanTag}`
                                }
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer border ${
                                  isFiltered
                                    ? 'ring-2 ring-primary-main ring-offset-1 font-semibold text-ink-primary'
                                    : 'hover:opacity-85 text-ink-primary'
                                }`}
                                style={{
                                  backgroundColor: `${color}18`,
                                  borderColor: `${color}60`,
                                }}
                              >
                                <span
                                  className="inline-block h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span>#{cleanTag}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* ─── MODAL: Create / Edit FAQ ─────────────────────────────────────── */}
      {isModalOpen && (
        <Modal
          open
          onClose={() => setIsModalOpen(false)}
          labelledBy="FAQs-modal-title-1"
          closeOnEscape={false}
          closeOnOverlayClick={false}
        >
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-divider">
              <h3 id="FAQs-modal-title-1" className="text-lg font-medium text-ink-primary">
                {editingFaq ? 'Edit FAQ' : 'Create FAQ'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setIsModalOpen(false)} />
            </div>

            {formError && (
              <div className="mt-3 rounded-card bg-error-lighter p-2.5 text-xs text-error-dark">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">
                  Category:
                </label>
                <Select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
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

              {/* Tags (Linked to Settings > Helpdesk Tags) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-ink-primary">
                    Tags:
                  </label>
                  <span className="text-xs text-ink-secondary">
                    Pick from configured Helpdesk Tags:
                  </span>
                </div>

                {/* Tag Selector Chips from Settings */}
                {availableTags.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-1.5 rounded-lg border border-divider bg-surface-neutral/40 p-2.5 max-h-32 overflow-y-auto">
                    {availableTags.map((tag) => {
                      const isSelected = selectedModalTags.has(tag.title.toLowerCase());
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleModalTag(tag.title)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-surface-paper shadow-xs border-primary-main ring-1 ring-primary-main font-semibold text-ink-primary'
                              : 'bg-surface-paper/70 hover:bg-surface-paper border-divider text-ink-secondary hover:text-ink-primary'
                          }`}
                        >
                          <span
                            className="inline-block h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.title}</span>
                          {isSelected && (
                            <Iconify icon="check" width={12} className="text-primary-main ml-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <Input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Tags (comma separated, e.g. Attendance, Asset, Request)"
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
        <Modal
          open
          onClose={() => setDeletingFaq(null)}
          labelledBy="FAQs-modal-title-2"
          size="sm"
          closeOnEscape={false}
          closeOnOverlayClick={false}
        >
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="FAQs-modal-title-2" className="text-base font-bold text-ink-primary">
              Delete FAQ
            </h3>
            <p className="mt-2 text-xs text-ink-secondary">
              Are you sure you want to delete this FAQ:{' '}
              <span className="font-semibold text-ink-primary">"{deletingFaq.question}"</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" onClick={() => setDeletingFaq(null)}>
                Cancel
              </Button>
              <Button
                color="error"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
