import { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface RotatingWorkType {
  id: string;
  name: string;
  frequency: string;
  sequence: string;
  departments: string;
  isActive: boolean;
}

const DEFAULT_ROTATING_WORK_TYPES: RotatingWorkType[] = [
  {
    id: '1',
    name: 'Weekly Hybrid Alternation (Group A)',
    frequency: 'Every 7 Days',
    sequence: 'On-site ➔ Remote',
    departments: 'Engineering, Quality Assurance',
    isActive: true,
  },
  {
    id: '2',
    name: 'Bi-Weekly Regional Field Rotation',
    frequency: 'Every 14 Days',
    sequence: 'On-site ➔ Field / Client Site',
    departments: 'Sales, Customer Success',
    isActive: true,
  },
  {
    id: '3',
    name: 'Monthly Offshore Remote Swap',
    frequency: 'Every 30 Days',
    sequence: 'Hybrid ➔ Remote',
    departments: 'Product & Design',
    isActive: true,
  },
];

export function RotatingWorkTypeTab() {
  const [items, setItems] = useState<RotatingWorkType[]>(() => {
    const saved = localStorage.getItem('hrms_rotating_work_types');
    return saved ? JSON.parse(saved) : DEFAULT_ROTATING_WORK_TYPES;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RotatingWorkType | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formFrequency, setFormFrequency] = useState('Every 7 Days');
  const [formSequence, setFormSequence] = useState('On-site ➔ Remote');
  const [formDepartments, setFormDepartments] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const saveToStorage = (updated: RotatingWorkType[]) => {
    setItems(updated);
    localStorage.setItem('hrms_rotating_work_types', JSON.stringify(updated));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormFrequency('Every 7 Days');
    setFormSequence('On-site ➔ Remote');
    setFormDepartments('');
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: RotatingWorkType) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormFrequency(item.frequency);
    setFormSequence(item.sequence);
    setFormDepartments(item.departments);
    setFormIsActive(item.isActive);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this rotating work type policy?')) {
      const updated = items.filter((i) => i.id !== id);
      saveToStorage(updated);
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = items.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i));
    saveToStorage(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingItem) {
      const updated = items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              name: formName.trim(),
              frequency: formFrequency,
              sequence: formSequence,
              departments: formDepartments.trim() || 'All Departments',
              isActive: formIsActive,
            }
          : i
      );
      saveToStorage(updated);
    } else {
      const newItem: RotatingWorkType = {
        id: Date.now().toString(),
        name: formName.trim(),
        frequency: formFrequency,
        sequence: formSequence,
        departments: formDepartments.trim() || 'All Departments',
        isActive: formIsActive,
      };
      saveToStorage([newItem, ...items]);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Rotating Work Type</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Define recurring cyclic rotation schedules between multiple work arrangements.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenAdd}
          className="shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          Add Rotating Work Type
        </Button>
      </div>

      <hr className="border-divider" />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            <tr>
              <th className="px-6 py-3.5">Policy / Schedule Name</th>
              <th className="px-6 py-3.5">Rotation Frequency</th>
              <th className="px-6 py-3.5">Type Sequence</th>
              <th className="px-6 py-3.5">Applicable Departments</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface-paper">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-surface-neutral/80 transition-colors">
                <td className="px-6 py-4 font-semibold text-ink-primary">{item.name}</td>
                <td className="px-6 py-4 font-medium text-ink-primary">{item.frequency}</td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs text-primary-main font-semibold bg-primary-lighter px-2 py-0.5 rounded border border-primary-light">
                    {item.sequence}
                  </span>
                </td>
                <td className="px-6 py-4 text-ink-secondary text-xs">{item.departments}</td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
                      item.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-surface-neutral text-ink-secondary hover:bg-grey-200'
                    }`}
                  >
                    {item.isActive && <CheckIcon className="h-3 w-3" />}
                    {item.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="rounded p-1.5 text-ink-secondary hover:bg-surface-neutral hover:text-primary-main transition-colors"
                      title="Edit policy"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1.5 text-ink-secondary hover:bg-surface-neutral hover:text-red-600 transition-colors"
                      title="Delete policy"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} labelledBy="RotatingWorkTypeTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 space-y-4 min-h-0 flex-1 overflow-y-auto">
            <h3 id="RotatingWorkTypeTab-modal-title-1" className="text-lg font-bold text-ink-primary">
              {editingItem ? 'Edit Rotating Work Type' : 'Add Rotating Work Type'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-primary">Schedule Name *</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Weekly Hybrid Alternation"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary">Rotation Cycle</label>
                  <Select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value)}
                    className="mt-1"
                  >
                    <option value="Every 7 Days">Every 7 Days</option>
                    <option value="Every 14 Days">Every 14 Days</option>
                    <option value="Every 30 Days">Every 30 Days</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary">Sequence Pattern</label>
                  <Input
                    type="text"
                    value={formSequence}
                    onChange={(e) => setFormSequence(e.target.value)}
                    placeholder="e.g. On-site ➔ Remote"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-primary">Assigned Departments / Teams</label>
                <Input
                  type="text"
                  value={formDepartments}
                  onChange={(e) => setFormDepartments(e.target.value)}
                  placeholder="e.g. Engineering, Sales, QA"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rotActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
                />
                <label htmlFor="rotActive" className="text-sm font-medium text-ink-primary">
                  Active Rotation Schedule
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-divider">
                <Button variant="outlined" color="inherit"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                >
                  Save Schedule
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

