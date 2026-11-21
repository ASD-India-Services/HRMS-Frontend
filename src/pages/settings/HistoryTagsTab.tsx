import React, { useState, useEffect } from 'react';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import type { HistoryTagItem } from '@/hooks/useHRSettings';
import { PlusIcon, SearchIcon, TagIcon, CheckIcon, LoaderIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton, Switch } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header matching screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">History Tags</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Define organizational visual markers and history badges for employee profiles and records.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenCreate}
          className="shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          + Create
        </Button>
      </div>

      <hr className="border-divider" />

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled" />
          <Input
            type="text"
            placeholder="Search history tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3"
          />
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <LoaderIcon className="h-3.5 w-3.5 animate-spin text-primary-main" />
            <span>Syncing...</span>
          </div>
        )}
      </div>

      {/* Table matching screenshot 1 */}
      <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral/80 text-xs font-semibold text-ink-primary">
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
          <tbody className="divide-y divide-divider bg-surface-paper">
            {filteredTags.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <TagIcon className="h-8 w-8 text-grey-300" />
                    <p className="text-sm font-medium text-ink-secondary">No history tags found</p>
                    <p className="text-xs text-ink-disabled">Click &quot;+ Create&quot; to add a history tag.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTags.map((tag) => (
                <tr key={tag.id} className="hover:bg-surface-neutral/60 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink-primary">
                    <div className="flex items-center gap-2">
                      <span>{tag.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-ink-primary">
                    {tag.highlight ? (
                      <span className="inline-flex items-center font-medium text-ink-primary">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-ink-secondary">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1">
                      <IconButton icon="pencil" size="small" aria-label="Edit Tag" title="Edit Tag" onClick={() => handleOpenEdit(tag)} />
                      <IconButton icon="trash" size="small" color="error" aria-label="Delete Tag" title="Delete Tag" onClick={() => setDeleteId(tag.id)} />
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
        <Modal open onClose={() => setModalOpen(false)} labelledBy="HistoryTagsTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4">
              <h3 id="HistoryTagsTab-modal-title-1" className="text-lg font-semibold text-ink-primary">
                {editingItem ? 'Edit History Tag' : 'Create History Tag'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setModalOpen(false)} />
            </div>

            {/* Modal Form Inner Box */}
            <form onSubmit={handleSave} className="space-y-6">
              <div className="rounded-md border border-divider p-5 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-2">
                    Title
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                {/* Highlight Toggle Switch */}
                <div>
                  <label className="block text-sm font-semibold text-ink-primary mb-2">
                    Highlight
                  </label>
                  <Switch checked={formHighlight} onClick={() => setFormHighlight((prev) => !prev)} />
                </div>
              </div>

              {/* Bottom Right Save Button (Blue per user instruction) */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal open onClose={() => setDeleteId(null)} labelledBy="HistoryTagsTab-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="HistoryTagsTab-modal-title-2" className="text-lg font-semibold text-ink-primary">Delete History Tag</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              Are you sure you want to delete this history tag? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outlined" color="inherit"
                type="button"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default HistoryTagsTab;
