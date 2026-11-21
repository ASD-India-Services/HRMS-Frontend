import React, { useState, useMemo } from 'react';
import {
  useHelpdeskTags,
  useCreateHelpdeskTag,
  useUpdateHelpdeskTag,
  useDeleteHelpdeskTag,
} from '@/hooks/useHelpdesk';
import type { HelpdeskTag } from '@/types/helpdesk';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, LoaderIcon, SearchIcon } from './SettingsIcons';

const DEFAULT_TAGS: HelpdeskTag[] = [
  { id: '1', title: 'Horilla', color: '#000000' },
  { id: '2', title: 'Asset', color: '#4fc3f7' },
  { id: '3', title: 'Request', color: '#afb42b' },
  { id: '4', title: 'Allocation', color: '#00838f' },
  { id: '5', title: 'Recruitment', color: '#ef9a9a' },
  { id: '6', title: 'Stage', color: '#b39ddb' },
  { id: '7', title: 'Manager', color: '#00bfa5' },
  { id: '8', title: 'Attendance', color: '#9fa8da' },
];

const PRESET_COLORS = [
  '#000000',
  '#4fc3f7',
  '#afb42b',
  '#00838f',
  '#ef9a9a',
  '#b39ddb',
  '#00bfa5',
  '#9fa8da',
  '#ff9800',
  '#4caf50',
  '#e91e63',
  '#3f51b5',
];

export function HelpdeskTagsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: serverTags = [], isLoading } = useHelpdeskTags(searchTerm);

  const createMutation = useCreateHelpdeskTag();
  const updateMutation = useUpdateHelpdeskTag();
  const deleteMutation = useDeleteHelpdeskTag();

  // Local fallback if server empty on initial load
  const [localTags, setLocalTags] = useState<HelpdeskTag[]>(() => {
    try {
      const saved = localStorage.getItem('hrms_helpdesk_tags');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_TAGS;
  });

  const displayTags = useMemo(() => {
    if (serverTags && serverTags.length > 0) {
      return serverTags;
    }
    return localTags;
  }, [serverTags, localTags]);

  const filteredTags = useMemo(() => {
    if (!searchTerm.trim()) return displayTags;
    const q = searchTerm.toLowerCase();
    return displayTags.filter((t) => t.title.toLowerCase().includes(q));
  }, [displayTags, searchTerm]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<HelpdeskTag | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formColor, setFormColor] = useState('#000000');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<HelpdeskTag | null>(null);

  // Toast Notification
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenCreate = () => {
    setEditingTag(null);
    setFormTitle('');
    setFormColor('#000000');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (tag: HelpdeskTag) => {
    setEditingTag(tag);
    setFormTitle(tag.title);
    setFormColor(tag.color || '#000000');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Title is required');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      color: formColor.trim() || '#000000',
    };

    try {
      if (editingTag) {
        await updateMutation.mutateAsync({ id: editingTag.id, payload });
        const updated = localTags.map((t) => (t.id === editingTag.id ? { ...t, ...payload } : t));
        setLocalTags(updated);
        localStorage.setItem('hrms_helpdesk_tags', JSON.stringify(updated));
        showNotification('Helpdesk tag updated successfully');
      } else {
        const created = await createMutation.mutateAsync(payload);
        const updated = [...localTags, created || { id: Date.now().toString(), ...payload }];
        setLocalTags(updated);
        localStorage.setItem('hrms_helpdesk_tags', JSON.stringify(updated));
        showNotification('Helpdesk tag created successfully');
      }
      setModalOpen(false);
    } catch {
      // Fallback local save if offline
      if (editingTag) {
        const updated = localTags.map((t) => (t.id === editingTag.id ? { ...t, ...payload } : t));
        setLocalTags(updated);
        localStorage.setItem('hrms_helpdesk_tags', JSON.stringify(updated));
        showNotification('Helpdesk tag updated locally');
      } else {
        const newTag: HelpdeskTag = { id: Date.now().toString(), ...payload };
        const updated = [...localTags, newTag];
        setLocalTags(updated);
        localStorage.setItem('hrms_helpdesk_tags', JSON.stringify(updated));
        showNotification('Helpdesk tag created locally');
      }
      setModalOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
    } catch {
      // ignore
    }
    const updated = localTags.filter((t) => t.id !== deleteTarget.id);
    setLocalTags(updated);
    localStorage.setItem('hrms_helpdesk_tags', JSON.stringify(updated));
    showNotification('Helpdesk tag deleted');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Helpdesk Tags</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and organize tags to label and categorize Help Desk tickets, inquiries, and FAQs.
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
            placeholder="Search tags..."
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

      {/* Table matching screenshot */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Title
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Color
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
            {filteredTags.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-400">
                  No helpdesk tags found. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredTags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{tag.title}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-6 w-6 rounded-full shadow-xs border border-black/10 shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-xs font-mono text-gray-500 uppercase">{tag.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
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
                        onClick={() => setDeleteTarget(tag)}
                        title="Delete Tag"
                        className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-colors"
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

      {/* ───────────────────────────────────────────────────────────
          MODAL: Create / Edit Helpdesk Tag matching screenshot
         ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                {editingTag ? 'Edit Helpdesk Tag' : 'Create Helpdesk Tag'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-6 pt-4">
              {formError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              {/* Box container matching screenshot */}
              <div className="rounded-md border border-gray-200 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                  {/* Title * */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      placeholder="Title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Color * */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Color *
                    </label>
                    <div className="rounded-md bg-gray-100 p-3 flex flex-col gap-2">
                      {/* Color Preview Bar matching screenshot */}
                      <div
                        className="w-full h-8 rounded shadow-inner border border-black/10 transition-colors cursor-pointer"
                        style={{ backgroundColor: formColor }}
                        title="Click to choose color"
                        onClick={() => document.getElementById('native-color-picker')?.click()}
                      />

                      <div className="flex items-center gap-2">
                        <input
                          id="native-color-picker"
                          type="color"
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-transparent p-0"
                        />
                        <input
                          type="text"
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono uppercase text-gray-800"
                          placeholder="#000000"
                        />
                      </div>

                      {/* Quick preset color swatches */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setFormColor(c)}
                            className={`h-5 w-5 rounded-full border border-black/15 transition-transform hover:scale-110 shrink-0 ${formColor.toLowerCase() === c.toLowerCase()
                                ? 'ring-2 ring-blue-500 ring-offset-1 scale-110'
                                : ''
                              }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button matching bottom right positioning */}
                <div className="flex justify-end pt-5">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <span className="flex items-center gap-1.5">
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Save'
                    )}
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
            <h3 className="text-lg font-bold text-gray-900">Delete Helpdesk Tag</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete the tag &quot;{deleteTarget.title}&quot;? This action cannot be undone.
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

export default HelpdeskTagsTab;

