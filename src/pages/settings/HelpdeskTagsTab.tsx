import React, { useState, useMemo } from 'react';
import {
  useHelpdeskTags,
  useCreateHelpdeskTag,
  useUpdateHelpdeskTag,
  useDeleteHelpdeskTag,
} from '@/hooks/useHelpdesk';
import { DEFAULT_HELPDESK_TAGS, type HelpdeskTag } from '@/types/helpdesk';
import { PlusIcon, CheckIcon, LoaderIcon, SearchIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const DEFAULT_TAGS: HelpdeskTag[] = DEFAULT_HELPDESK_TAGS;

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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Helpdesk Tags</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Create and organize tags to label and categorize Help Desk tickets, inquiries, and FAQs.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenCreate}
          className="shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          Create
        </Button>
      </div>

      <hr className="border-divider" />

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled" />
          <Input
            type="text"
            placeholder="Search tags..."
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

      {/* Table matching screenshot */}
      <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Title
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Color
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
            {filteredTags.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-ink-disabled">
                  No helpdesk tags found. Click &quot;+ Create&quot; to add one.
                </td>
              </tr>
            ) : (
              filteredTags.map((tag) => (
                <tr key={tag.id} className="hover:bg-surface-neutral/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink-primary">{tag.title}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-6 w-6 rounded-full shadow-xs border border-grey-900/10 shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-xs font-mono text-ink-secondary uppercase">{tag.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <IconButton icon="pencil" size="small" aria-label="Edit Tag" title="Edit Tag" onClick={() => handleOpenEdit(tag)} />
                      <IconButton icon="trash" size="small" color="error" aria-label="Delete Tag" title="Delete Tag" onClick={() => setDeleteTarget(tag)} />
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
        <Modal open onClose={() => setModalOpen(false)} labelledBy="HelpdeskTagsTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <h3 id="HelpdeskTagsTab-modal-title-1" className="text-lg font-semibold text-ink-primary">
                {editingTag ? 'Edit Helpdesk Tag' : 'Create Helpdesk Tag'}
              </h3>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setModalOpen(false)} />
            </div>

            <form onSubmit={handleSaveModal} className="space-y-6 pt-4">
              {formError && (
                <div className="rounded-md bg-error-lighter p-3 text-sm text-error-main">
                  {formError}
                </div>
              )}

              {/* Box container matching screenshot */}
              <div className="rounded-md border border-divider p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                  {/* Title * */}
                  <div>
                    <label className="block text-sm font-semibold text-ink-primary mb-2">
                      Title *
                    </label>
                    <Input
                      type="text"
                      placeholder="Title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Color * */}
                  <div>
                    <label className="block text-sm font-semibold text-ink-primary mb-2">
                      Color *
                    </label>
                    <div className="rounded-md bg-surface-neutral p-3 flex flex-col gap-2">
                      {/* Color Preview Bar matching screenshot */}
                      <div
                        className="w-full h-8 rounded shadow-inner border border-grey-900/10 transition-colors cursor-pointer"
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
                          className="h-8 w-10 cursor-pointer rounded border border-divider bg-transparent p-0"
                        />
                        <Input
                          type="text"
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="font-mono uppercase"
                          placeholder="#000000"
                        />
                      </div>

                      {/* Quick preset color swatches */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {PRESET_COLORS.map((c) => (
                          <Button
                            key={c}
                            variant="text"
                            color="inherit"
                            onClick={() => setFormColor(c)}
                            className={`!h-5 !w-5 !min-w-0 !rounded-full !p-0 border border-grey-900/15 hover:scale-110 ${formColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-primary-main ring-offset-1 scale-110' : ''
                              }`}
                            style={{ backgroundColor: c }}
                            title={c}
                            aria-label={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button matching bottom right positioning */}
                <div className="flex justify-end pt-5">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <span className="flex items-center gap-1.5">
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} labelledBy="HelpdeskTagsTab-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <h3 id="HelpdeskTagsTab-modal-title-2" className="text-lg font-semibold text-ink-primary">Delete Helpdesk Tag</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              Are you sure you want to delete the tag &quot;{deleteTarget.title}&quot;? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outlined" color="inherit"
                type="button"
                onClick={() => setDeleteTarget(null)}
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

export default HelpdeskTagsTab;

