import { HRMSTable } from '@/components/DataTable/HRMSTable';
import { useState } from 'react';
import { PlusIcon, CheckIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

interface RotatingShift {
  id: string;
  name: string;
  rotationPeriod: string;
  shiftsInOrder: string;
  restHours: number;
  isActive: boolean;
}

const DEFAULT_ROTATING_SHIFTS: RotatingShift[] = [
  {
    id: '1',
    name: '24/7 Operations 3-Shift Roster',
    rotationPeriod: 'Weekly (Every 7 Days)',
    shiftsInOrder: 'Morning (06:00-14:00) ➔ Afternoon (14:00-22:00) ➔ Night (22:00-06:00)',
    restHours: 24,
    isActive: true,
  },
  {
    id: '2',
    name: 'Day / Evening Bi-Weekly Rotation',
    rotationPeriod: 'Bi-Weekly (Every 14 Days)',
    shiftsInOrder: 'General Shift (09:00-18:00) ➔ Evening Shift (13:00-22:00)',
    restHours: 16,
    isActive: true,
  },
  {
    id: '3',
    name: 'Support Weekend Swap Roster',
    rotationPeriod: 'Weekly (Every 7 Days)',
    shiftsInOrder: 'Weekday Shift ➔ Weekend Coverage',
    restHours: 48,
    isActive: true,
  },
];

export function RotatingShiftTab() {
  const [shifts, setShifts] = useState<RotatingShift[]>(() => {
    const saved = localStorage.getItem('hrms_rotating_shifts');
    return saved ? JSON.parse(saved) : DEFAULT_ROTATING_SHIFTS;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RotatingShift | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPeriod, setFormPeriod] = useState('Weekly (Every 7 Days)');
  const [formShifts, setFormShifts] = useState('');
  const [formRestHours, setFormRestHours] = useState(24);
  const [formIsActive, setFormIsActive] = useState(true);

  const saveToStorage = (updated: RotatingShift[]) => {
    setShifts(updated);
    localStorage.setItem('hrms_rotating_shifts', JSON.stringify(updated));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormPeriod('Weekly (Every 7 Days)');
    setFormShifts('Morning (06:00-14:00) ➔ Afternoon (14:00-22:00) ➔ Night (22:00-06:00)');
    setFormRestHours(24);
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: RotatingShift) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPeriod(item.rotationPeriod);
    setFormShifts(item.shiftsInOrder);
    setFormRestHours(item.restHours);
    setFormIsActive(item.isActive);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this rotating shift policy?')) {
      const updated = shifts.filter((s) => s.id !== id);
      saveToStorage(updated);
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = shifts.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    saveToStorage(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingItem) {
      const updated = shifts.map((s) =>
        s.id === editingItem.id
          ? {
              ...s,
              name: formName.trim(),
              rotationPeriod: formPeriod,
              shiftsInOrder: formShifts.trim(),
              restHours: Number(formRestHours) || 24,
              isActive: formIsActive,
            }
          : s
      );
      saveToStorage(updated);
    } else {
      const newItem: RotatingShift = {
        id: Date.now().toString(),
        name: formName.trim(),
        rotationPeriod: formPeriod,
        shiftsInOrder: formShifts.trim(),
        restHours: Number(formRestHours) || 24,
        isActive: formIsActive,
      };
      saveToStorage([newItem, ...shifts]);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Rotating Shift</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Configure cyclical rotation sequences between multiple shifts with mandatory transition rest hours.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenAdd}
          className="shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          Add Rotating Shift
        </Button>
      </div>

      <hr className="border-divider" />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-divider bg-surface-paper shadow-xs">
        <HRMSTable className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            <tr>
              <th className="px-6 py-3.5">Policy Name</th>
              <th className="px-6 py-3.5">Cycle Frequency</th>
              <th className="px-6 py-3.5">Shift Progression Sequence</th>
              <th className="px-6 py-3.5">Rest Gap</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface-paper">
            {shifts.map((item) => (
              <tr key={item.id} className="hover:bg-surface-neutral/80 transition-colors">
                <td className="px-6 py-4 font-semibold text-ink-primary">{item.name}</td>
                <td className="px-6 py-4 text-ink-primary font-medium">{item.rotationPeriod}</td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs text-primary-dark font-medium bg-primary-lighter border border-primary-light px-2.5 py-1 rounded-md block max-w-md">
                    {item.shiftsInOrder}
                  </span>
                </td>
                <td className="px-6 py-4 text-ink-primary font-mono text-xs">{item.restHours} hrs</td>
                <td className="px-6 py-4">
                  <Button
 type="button"
 size="small"
 variant="soft"
 color={item.isActive ? 'success' : 'inherit'}
 startIcon={item.isActive ? <CheckIcon /> : undefined}
 onClick={() => handleToggleActive(item.id)}
 >
 {item.isActive ? 'Active' : 'Inactive'}
 </Button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <IconButton icon="pencil" size="small" aria-label="Edit shift" title="Edit shift" onClick={() => handleOpenEdit(item)} />
                    <IconButton icon="trash" size="small" color="error" aria-label="Delete shift" title="Delete shift" onClick={() => handleDelete(item.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </HRMSTable>
      </div>

      {/* Modal */}
      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} labelledBy="RotatingShiftTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 space-y-4 min-h-0 flex-1 overflow-y-auto">
            <h3 id="RotatingShiftTab-modal-title-1" className="text-lg font-semibold text-ink-primary">
              {editingItem ? 'Edit Rotating Shift Policy' : 'Add Rotating Shift Policy'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-primary">Policy Name *</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. 24/7 Operations 3-Shift Roster"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary">Rotation Cycle</label>
                  <Select
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="mt-1"
                  >
                    <option value="Weekly (Every 7 Days)">Weekly (Every 7 Days)</option>
                    <option value="Bi-Weekly (Every 14 Days)">Bi-Weekly (Every 14 Days)</option>
                    <option value="Monthly (Every 30 Days)">Monthly (Every 30 Days)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary">Rest Gap (Hours)</label>
                  <Input
                    type="number"
                    min={8}
                    max={72}
                    value={formRestHours}
                    onChange={(e) => setFormRestHours(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-primary">Shift Progression Sequence *</label>
                <Textarea
                  rows={2}
                  required
                  value={formShifts}
                  onChange={(e) => setFormShifts(e.target.value)}
                  placeholder="Morning ➔ Afternoon ➔ Night"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shiftActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
                />
                <label htmlFor="shiftActive" className="text-sm font-medium text-ink-primary">
                  Active Rotating Shift Policy
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
                  Save Policy
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

