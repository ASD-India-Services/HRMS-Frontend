import React, { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { HistoryTagItem } from '@/hooks/useHRSettings';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, TagIcon, CheckIcon, LoaderIcon } from './SettingsIcons';

const LOCAL_STORAGE_KEY = 'hrms_history_tags';

const DEFAULT_TAGS: HistoryTagItem[] = [
  {
    id: '1',
    title: 'Safety Commitee',
    highlight: true,
  },
];

export function HistoryTagsTab() {
  const { data: settings, isLoading } = useHRSettings();
  const updateSettings = useUpdateHRSettings();

  const [tags, setTags] = useState<HistoryTagItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_TAGS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HistoryTagItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formHighlight, setFormHighlight] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Notification message
  const [notification, setNotification] = useState<string | null>(null);

  // Sync with backend when loaded
  useEffect(() => {
    if (settings?.history_tags && Array.isArray(settings.history_tags) && settings.history_tags.length > 0) {
      setTags(settings.history_tags);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings.history_tags));
    }
  }, [settings?.history_tags]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const saveTags = (newTags: HistoryTagItem[], successMsg: string) => {
    setTags(newTags);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTags));
    updateSettings.mutate(
      { history_tags: newTags },
      {
        onSuccess: () => showNotification(successMsg),
        onError: () => showNotification(`${successMsg} (saved locally)`),
      }
    );
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormHighlight(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: HistoryTagItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormHighlight(item.highlight);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingItem) {
      const updated = tags.map((t) =>
        t.id === editingItem.id ? { ...t, title: formTitle.trim(), highlight: formHighlight } : t
      );
      saveTags(updated, 'History tag updated successfully');
    } else {
      const newTag: HistoryTagItem = {
        id: Date.now().toString(),
        title: formTitle.trim(),
        highlight: formHighlight,
      };
      saveTags([...tags, newTag], 'History tag created successfully');
    }

    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const updated = tags.filter((t) => t.id !== deleteId);
    saveTags(updated, 'History tag deleted');
    setDeleteId(null);
  };

  const filteredTags = tags.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* Header matching screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">History Tags</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define organizational visual markers and history badges for employee profiles and records.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          Create
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search history tags..."
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

      {/* Table matching screenshot 1 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/80 text-xs font-semibold text-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3.5 w-1/2">
                Title
              </th>
              <th scope="col" className="px-6 py-3.5 w-1/4">
                Highlight
              </th>
              <th scope="col" className="px-6 py-3.5 w-1/4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredTags.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <TagIcon className="h-8 w-8 text-gray-300" />
                    <p className="text-sm font-medium text-gray-600">No history tags found</p>
                    <p className="text-xs text-gray-400">Click &quot;+ Create&quot; to add a history tag.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{tag.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {tag.highlight ? (
                      <span className="inline-flex items-center font-medium text-gray-900">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-500">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(tag)}
                        title="Edit Tag"
                        className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-px bg-gray-200 my-auto" />
                      <button
                        type="button"
                        onClick={() => setDeleteId(tag.id)}
                        title="Delete Tag"
                        className="rounded p-1.5 text-red-500 hover:bg-white hover:text-red-700 hover:shadow-xs transition-colors"
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

      {/* Create / Edit Modal matching screenshot 2 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit History Tag' : 'Create History Tag'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            {/* Modal Form Inner Box */}
            <form onSubmit={handleSave} className="space-y-6">
              <div className="rounded-md border border-gray-200 p-5 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Highlight Toggle Switch */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Highlight
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formHighlight}
                    onClick={() => setFormHighlight((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formHighlight ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formHighlight ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bottom Right Save Button (Blue per user instruction) */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updateSettings.isPending}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {updateSettings.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl transition-all">
            <h3 className="text-lg font-bold text-gray-900">Delete History Tag</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete this history tag? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
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

export default HistoryTagsTab;
