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

export default function FAQs() {
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
      alert(err instanceof Error ? err.message : 'Failed to delete FAQ');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <span>Help Desk</span>
          <span>&gt;</span>
          <button
            onClick={() => navigate('/helpdesk/faq-categories')}
            className="hover:text-blue-600 transition"
          >
            FAQ
          </button>
          <span>&gt;</span>
          <span className="text-gray-900 font-medium">
            {currentCategory ? currentCategory.title : 'All FAQs'}
          </span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
            {currentCategory && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
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
                  className="ml-1 text-blue-500 hover:text-blue-800 font-bold"
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
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-48 sm:w-64 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Filter by Category */}
            <select
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
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-2xs focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>

            {/* Create Button */}
            {canCreate && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>Create</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-600">Loading FAQs...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          Failed to load FAQs. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && faqs.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-bold text-gray-900">No Frequently Asked Questions Found</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            {searchTerm || selectedCategoryFilter
              ? 'No FAQs match the current search or filter criteria.'
              : 'Start building your knowledge base by clicking "+ Create".'}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              + Create FAQ
            </button>
          )}
        </div>
      )}

      {/* FAQs List */}
      {!isLoading && !isError && faqs.length > 0 && (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden">
          {faqs.map((faq) => {
            const isExpanded = expandedFaqIds.has(faq.id);
            return (
              <div key={faq.id} className="transition-colors hover:bg-gray-50/50">
                {/* FAQ Row Header */}
                <div
                  onClick={() => toggleExpand(faq.id)}
                  className="flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 flex-1 pr-4">
                    <span className="text-gray-400 font-mono text-xs">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 leading-snug">
                      {faq.question}
                    </span>
                    {faq.category_name && (
                      <span className="hidden sm:inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
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
                        className="p-1 text-gray-400 hover:text-blue-600 transition"
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
                        className="p-1 text-gray-400 hover:text-rose-600 transition"
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
                  <div className="px-5 pb-5 pt-1 text-sm text-gray-700 border-t border-gray-100 bg-gray-50/40">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {faq.answer}
                    </div>

                    {/* Tags */}
                    {faq.tags && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-gray-400 font-medium">Tags:</span>
                        {faq.tags.split(',').map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900">
                {editingFaq ? 'Edit FAQ' : 'Create FAQ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category:
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No Category (General)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Question"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder="Answer"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags:
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Tags (comma separated, e.g. Leave, Vacation, Policy)"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition focus:outline-none disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Delete Confirmation ────────────────────────────────────── */}
      {deletingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-gray-900">Delete FAQ</h3>
            <p className="mt-2 text-xs text-gray-600">
              Are you sure you want to delete this FAQ: <span className="font-semibold text-gray-900">"{deletingFaq.question}"</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingFaq(null)}
                className="rounded border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="rounded bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
