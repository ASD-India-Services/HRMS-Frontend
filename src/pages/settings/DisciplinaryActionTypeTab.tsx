import { HRMSTable } from '@/components/DataTable/HRMSTable';
import { useState } from 'react';
import { PlusIcon, CheckIcon } from './SettingsIcons';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

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
        return 'bg-primary-lighter text-primary-dark border-primary-light';
      case 'Medium':
        return 'bg-warning-lighter text-warning-dark border-warning-light';
      case 'High':
        return 'bg-warning-lighter text-warning-dark border-warning-light';
      case 'Critical':
        return 'bg-error-lighter text-error-dark border-error-light';
    }
  };

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Disciplinary Action Type</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Configure standardized policy violation types, severity categories, and HR review workflows.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenAdd}
          className="shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          Add Action Type
        </Button>
      </div>

      <hr className="border-divider" />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-divider bg-surface-paper shadow-xs">
        <HRMSTable className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral text-xs font-semibold uppercase tracking-wider text-ink-secondary">
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
          <tbody className="divide-y divide-divider bg-surface-paper">
            {types.map((item) => (
              <tr key={item.id} className="hover:bg-surface-neutral/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-ink-primary">{item.title}</div>
                  <div className="text-xs text-ink-secondary mt-0.5 line-clamp-1">{item.description}</div>
                </td>
                <td className="px-6 py-4 font-mono text-xs font-bold text-ink-primary">{item.code}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getSeverityBadge(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-ink-primary">
                  {item.requiresHrApproval ? 'Mandatory' : 'Optional'}
                </td>
                <td className="px-6 py-4 text-xs text-ink-secondary">
                  {item.validityMonths > 0 ? `${item.validityMonths} Months` : 'Permanent'}
                </td>
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
                    <IconButton icon="pencil" size="small" aria-label="Edit type" title="Edit type" onClick={() => handleOpenEdit(item)} />
                    <IconButton icon="trash" size="small" color="error" aria-label="Delete type" title="Delete type" onClick={() => handleDelete(item.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </HRMSTable>
      </div>

      {/* Modal */}
      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} labelledBy="DisciplinaryActionTypeTab-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 space-y-4 min-h-0 flex-1 overflow-y-auto">
            <h3 id="DisciplinaryActionTypeTab-modal-title-1" className="text-lg font-semibold text-ink-primary">
              {editingItem ? 'Edit Disciplinary Action Type' : 'Add Disciplinary Action Type'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-primary">Action Title *</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Written Warning"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary">Code / Identifier *</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. WRITTEN_WARN"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="mt-1 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-primary">Severity Level</label>
                  <Select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as any)}
                    className="mt-1"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-primary">Record Validity (Months)</label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={formValidity}
                    onChange={(e) => setFormValidity(Number(e.target.value))}
                    className="mt-1"
                  />
                  <span className="text-[11px] text-ink-disabled">0 = Permanent record</span>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRequiresHr}
                      onChange={(e) => setFormRequiresHr(e.target.checked)}
                      className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
                    />
                    <span className="text-sm font-medium text-ink-primary">Requires HR Approval</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-primary">Description</label>
                <Textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Define when this disciplinary action applies..."
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="discActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
                />
                <label htmlFor="discActive" className="text-sm font-medium text-ink-primary">
                  Mark as Active
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
                  Save Action Type
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

