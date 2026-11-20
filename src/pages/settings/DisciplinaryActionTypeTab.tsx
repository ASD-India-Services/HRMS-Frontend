import { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon } from './SettingsIcons';

interface DisciplinaryType {
  id: string;
  title: string;
  code: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  requiresHrApproval: boolean;
  validityMonths: number;
  description: string;
  isActive: boolean;
}

const DEFAULT_DISCIPLINARY_TYPES: DisciplinaryType[] = [
  {
    id: '1',
    title: 'Verbal Warning',
    code: 'VERBAL_WARN',
    severity: 'Low',
    requiresHrApproval: false,
    validityMonths: 3,
    description: 'First-level informal notification documented for minor policy infractions or attendance lapses.',
    isActive: true,
  },
  {
    id: '2',
    title: 'Written Warning',
    code: 'WRITTEN_WARN',
    severity: 'Medium',
    requiresHrApproval: true,
    validityMonths: 6,
    description: 'Formal written documentation delivered to employee with an acknowledgment requirement.',
    isActive: true,
  },
  {
    id: '3',
    title: 'Final Written Warning',
    code: 'FINAL_WARN',
    severity: 'High',
    requiresHrApproval: true,
    validityMonths: 12,
    description: 'Critical warning preceded by earlier notices or severe code-of-conduct breach.',
    isActive: true,
  },
  {
    id: '4',
    title: 'Suspension Without Pay',
    code: 'SUSPENSION',
    severity: 'Critical',
    requiresHrApproval: true,
    validityMonths: 12,
    description: 'Temporary cessation of employment duties pending full internal investigation.',
    isActive: true,
  },
  {
    id: '5',
    title: 'Demotion / Role Reassignment',
    code: 'DEMOTION',
    severity: 'Critical',
    requiresHrApproval: true,
    validityMonths: 24,
    description: 'Reclassification of employee designation, salary tier, or department duties.',
    isActive: true,
  },
  {
    id: '6',
    title: 'Termination Review',
    code: 'TERMINATION',
    severity: 'Critical',
    requiresHrApproval: true,
    validityMonths: 0,
    description: 'Initiation of contract separation under gross misconduct policies.',
    isActive: true,
  },
];

export function DisciplinaryActionTypeTab() {
  const [types, setTypes] = useState<DisciplinaryType[]>(() => {
    const saved = localStorage.getItem('hrms_disciplinary_types');
    return saved ? JSON.parse(saved) : DEFAULT_DISCIPLINARY_TYPES;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DisciplinaryType | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSeverity, setFormSeverity] = useState<DisciplinaryType['severity']>('Medium');
  const [formRequiresHr, setFormRequiresHr] = useState(true);
  const [formValidity, setFormValidity] = useState(6);
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const saveToStorage = (updated: DisciplinaryType[]) => {
    setTypes(updated);
    localStorage.setItem('hrms_disciplinary_types', JSON.stringify(updated));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormCode('');
    setFormSeverity('Medium');
    setFormRequiresHr(true);
    setFormValidity(6);
    setFormDescription('');
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: DisciplinaryType) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCode(item.code);
    setFormSeverity(item.severity);
    setFormRequiresHr(item.requiresHrApproval);
    setFormValidity(item.validityMonths);
    setFormDescription(item.description);
    setFormIsActive(item.isActive);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this disciplinary action type?')) {
      const updated = types.filter((t) => t.id !== id);
      saveToStorage(updated);
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = types.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t));
    saveToStorage(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCode.trim()) return;

    if (editingItem) {
      const updated = types.map((t) =>
        t.id === editingItem.id
          ? {
              ...t,
              title: formTitle.trim(),
              code: formCode.trim().toUpperCase(),
              severity: formSeverity,
              requiresHrApproval: formRequiresHr,
              validityMonths: Number(formValidity) || 0,
              description: formDescription.trim(),
              isActive: formIsActive,
            }
          : t
      );
      saveToStorage(updated);
    } else {
      const newItem: DisciplinaryType = {
        id: Date.now().toString(),
        title: formTitle.trim(),
        code: formCode.trim().toUpperCase(),
        severity: formSeverity,
        requiresHrApproval: formRequiresHr,
        validityMonths: Number(formValidity) || 0,
        description: formDescription.trim(),
        isActive: formIsActive,
      };
      saveToStorage([newItem, ...types]);
    }
    setModalOpen(false);
  };

  const getSeverityBadge = (sev: DisciplinaryType['severity']) => {
    switch (sev) {
      case 'Low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Disciplinary Action Type</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure standardized policy violation types, severity categories, and HR review workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          Add Action Type
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-3.5">Action Title</th>
              <th className="px-6 py-3.5">Code</th>
              <th className="px-6 py-3.5">Severity</th>
              <th className="px-6 py-3.5">HR Approval</th>
              <th className="px-6 py-3.5">Validity</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {types.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</div>
                </td>
                <td className="px-6 py-4 font-mono text-xs font-bold text-gray-700">{item.code}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getSeverityBadge(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-gray-700">
                  {item.requiresHrApproval ? 'Mandatory' : 'Optional'}
                </td>
                <td className="px-6 py-4 text-xs text-gray-600">
                  {item.validityMonths > 0 ? `${item.validityMonths} Months` : 'Permanent'}
                </td>
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
                      title="Edit type"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"
                      title="Delete type"
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
              {editingItem ? 'Edit Disciplinary Action Type' : 'Add Disciplinary Action Type'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Action Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Written Warning"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Code / Identifier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WRITTEN_WARN"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 uppercase font-mono shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">Severity Level</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Record Validity (Months)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={formValidity}
                    onChange={(e) => setFormValidity(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-gray-400">0 = Permanent record</span>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresHr}
                      onChange={(e) => setFormRequiresHr(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Requires HR Approval</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Define when this disciplinary action applies..."
                  className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="discActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="discActive" className="text-sm font-medium text-gray-700">
                  Mark as Active
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
                  Save Action Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

