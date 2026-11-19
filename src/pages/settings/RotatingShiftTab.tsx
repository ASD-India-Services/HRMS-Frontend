import { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon } from './SettingsIcons';

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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Rotating Shift</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure cyclical rotation sequences between multiple shifts with mandatory transition rest hours.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          Add Rotating Shift
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-3.5">Policy Name</th>
              <th className="px-6 py-3.5">Cycle Frequency</th>
              <th className="px-6 py-3.5">Shift Progression Sequence</th>
              <th className="px-6 py-3.5">Rest Gap</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {shifts.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-6 py-4 font-semibold text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-gray-700 font-medium">{item.rotationPeriod}</td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs text-blue-700 font-medium bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md block max-w-md">
                    {item.shiftsInOrder}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700 font-mono text-xs">{item.restHours} hrs</td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
                      item.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                      title="Edit shift"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"
                      title="Delete shift"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {editingItem ? 'Edit Rotating Shift Policy' : 'Add Rotating Shift Policy'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Policy Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24/7 Operations 3-Shift Roster"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Rotation Cycle</label>
                  <select
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Weekly (Every 7 Days)">Weekly (Every 7 Days)</option>
                    <option value="Bi-Weekly (Every 14 Days)">Bi-Weekly (Every 14 Days)</option>
                    <option value="Monthly (Every 30 Days)">Monthly (Every 30 Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Rest Gap (Hours)</label>
                  <input
                    type="number"
                    min={8}
                    max={72}
                    value={formRestHours}
                    onChange={(e) => setFormRestHours(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Shift Progression Sequence *</label>
                <textarea
                  rows={2}
                  required
                  value={formShifts}
                  onChange={(e) => setFormShifts(e.target.value)}
                  placeholder="Morning ➔ Afternoon ➔ Night"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shiftActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="shiftActive" className="text-sm font-medium text-gray-700">
                  Active Rotating Shift Policy
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

