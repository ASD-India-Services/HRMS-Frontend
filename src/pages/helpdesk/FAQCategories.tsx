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

export default function FAQCategories() {
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
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <span>Help Desk</span>
            <span>&gt;</span>
            <span className="text-gray-900 font-medium">FAQ</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FAQ Categories</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
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

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-600">Loading FAQ categories...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          Failed to load FAQ categories. {error instanceof Error ? error.message : 'Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && categories.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm0 5.25h.007v.008H3.75V12Zm0 5.25h.007v.008H3.75v-.008Z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-bold text-gray-900">No FAQ Categories Found</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            {searchTerm
              ? 'No categories match your search. Try a different query.'
              : 'Create categories like Leave, Payroll, Asset, and Recruitment to organize help topics.'}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              + Create Category
            </button>
          )}
        </div>
      )}

      {/* Cards Grid */}
      {!isLoading && !isError && categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between relative"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-gray-900 capitalize">{cat.title}</h3>

                  {/* 3 dots menu button */}
                  {(canEdit || canDelete) && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === cat.id ? null : cat.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition"
                        title="Actions"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === cat.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-32 rounded-md bg-white py-1 shadow-lg border border-gray-200 z-20 animate-in fade-in zoom-in-95"
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(cat)}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeletingCategory(cat);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                            >
                              <svg className="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="mt-2 text-xs text-gray-500 line-clamp-3 min-h-[36px]">
                  {cat.description || `FAQs related to ${cat.title.toLowerCase()} are shown here`}
                </p>
              </div>

              {/* View FAQs Button */}
              <div className="mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/helpdesk/faq-view/${cat.id}`)}
                  className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition focus:outline-none"
                >
                  View FAQs
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: Create / Edit FAQ Category ────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCategory ? 'Edit FAQ Category' : 'Create FAQ Category'}
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
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description:
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description"
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
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-gray-900">Delete FAQ Category</h3>
            <p className="mt-2 text-xs text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{deletingCategory.title}</span>? All FAQs under this category will also be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
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
