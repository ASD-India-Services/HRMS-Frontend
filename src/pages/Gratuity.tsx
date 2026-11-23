/**
 * Gratuity page — Rule management with slabs + Employee gratuity calculator.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';
import { Card } from '@/components/ui/Card';

const RULES_ENDPOINT = '/api/v1/gratuity/rules/';
const rulesCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'gratuity-rules',
  endpoints: { list: RULES_ENDPOINT, create: RULES_ENDPOINT, detail: (id) => `${RULES_ENDPOINT}${id}/`, update: (id) => `${RULES_ENDPOINT}${id}/`, delete: (id) => `${RULES_ENDPOINT}${id}/` },
});

const rulesColumns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Rule Name', sortable: true },
  { key: 'region', header: 'Region', sortable: true, render: (v: unknown) => String(v).charAt(0).toUpperCase() + String(v).slice(1) },
  { key: 'slab_count', header: 'Slabs', sortable: false },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [];

// ---------------------------------------------------------------------------
// Slab Row type
// ---------------------------------------------------------------------------
interface SlabRow {
  from_years: number;
  to_years: number; // 0 = unlimited
  multiplier: number;
}

interface RuleFormData {
  name: string;
  region: string;
  salary_components: string;
  description: string;
  is_active: boolean;
  slabs: SlabRow[];
}

// ---------------------------------------------------------------------------
// Rule Form Modal (with inline slab builder)
// ---------------------------------------------------------------------------
function RuleFormModal({
  isOpen, onClose, title, initialValues, onSubmit, isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialValues: RuleFormData;
  onSubmit: (data: RuleFormData) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<RuleFormData>(initialValues);

  useMemo(() => { if (isOpen) setForm(initialValues); }, [isOpen, initialValues]);

  const addSlab = () => {
    setForm(prev => ({ ...prev, slabs: [...prev.slabs, { from_years: 0, to_years: 0, multiplier: 0 }] }));
  };
  const removeSlab = (idx: number) => {
    setForm(prev => ({ ...prev, slabs: prev.slabs.filter((_, i) => i !== idx) }));
  };
  const updateSlab = (idx: number, field: keyof SlabRow, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setForm(prev => ({ ...prev, slabs: prev.slabs.map((s, i) => i === idx ? { ...s, [field]: isNaN(numValue) ? 0 : numValue } : s) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <Modal open onClose={onClose} labelledBy="gratuity-rule-modal-title" size="lg" closeOnEscape={false}>
      <div className="p-6 min-h-0 flex-1 overflow-y-auto">
        <h2 id="gratuity-rule-modal-title" className="mb-4 text-lg font-semibold text-ink-primary">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Rule Name *</label>
            <Input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., India Standard Gratuity"/>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Region *</label>
            <Select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}>
              <option value="india">India</option>
              <option value="uae">UAE</option>
              <option value="custom">Custom</option>
            </Select>
          </div>

          {/* Salary Components */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Salary Components (comma-separated) *</label>
            <Input type="text" required value={form.salary_components} onChange={e => setForm(p => ({ ...p, salary_components: e.target.value }))} placeholder="Basic, DA"/>
            <p className="mt-1 text-xs text-ink-disabled">These salary components will be summed to get the base salary for calculation</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">Description</label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe this gratuity rule" rows={2}/>
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm text-ink-primary">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded border-divider" />
            Active
          </label>

          {/* Slabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-ink-primary">Slabs (Service Year Tiers)</h4>
              <Button variant="soft" size="small" startIcon={<Iconify icon="plus" />} onClick={addSlab}>Add Slab
              </Button>
            </div>
            <p className="text-xs text-ink-disabled">Define multipliers for different service year ranges. Set "To Years" to 0 for unlimited (no upper cap).</p>

            {form.slabs.length === 0 && (
              <p className="text-xs text-ink-disabled italic">No slabs added yet. Add at least one slab.</p>
            )}

            {form.slabs.map((slab, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-md border border-divider bg-surface-neutral p-3">
                <div className="flex-1">
                  <label className="block text-xs text-ink-secondary mb-0.5">From Years</label>
                  <Input type="number" step="0.01" min="0" value={slab.from_years} onChange={e => updateSlab(idx, 'from_years', e.target.value)}/>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-ink-secondary mb-0.5">To Years (0 = ∞)</label>
                  <Input type="number" step="0.01" min="0" value={slab.to_years} onChange={e => updateSlab(idx, 'to_years', e.target.value)}/>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-ink-secondary mb-0.5">Multiplier</label>
                  <Input type="number" step="0.0001" min="0" value={slab.multiplier} onChange={e => updateSlab(idx, 'multiplier', e.target.value)} placeholder="e.g., 0.5769"/>
                </div>
                <IconButton icon="trash" size="small" color="error" onClick={() => removeSlab(idx)} aria-label="Remove slab" className="mt-4" />
              </div>
            ))}

            {/* Quick preset for India */}
            {form.slabs.length === 0 && form.region === 'india' && (
              <Button variant="text" size="small" onClick={() => setForm(p => ({ ...p, slabs: [{ from_years: 0, to_years: 5, multiplier: 0 }, { from_years: 5, to_years: 0, multiplier: 0.5769 }] }))}>
                Use India standard preset (0-5 yrs: not eligible, 5+ yrs: 15/26 days per year)
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outlined" color="inherit" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !form.name.trim()}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Calculation result type
// ---------------------------------------------------------------------------
interface GratuityResult {
  employee_name: string;
  years_of_service: string;
  base_salary: string;
  applicable_multiplier: string;
  gratuity_amount: string;
  slab_from_years: string;
  slab_to_years: string;
  salary_components_used: string[];
  rule_name: string;
  date_of_joining: string;
  calculation_date: string;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const emptyForm: RuleFormData = { name: '', region: 'india', salary_components: '', description: '', is_active: true, slabs: [] };

export default function Gratuity() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Calculator
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRule, setSelectedRule] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<GratuityResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const { page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => ({ page, page_size: pageSize }), [page, pageSize]);
  const rulesQuery = rulesCrud.useList(params);
  const createMutation = rulesCrud.useCreate();
  const deleteMutation = rulesCrud.useDelete();

  // Employees for calculator
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-gratuity'],
    queryFn: async () => { const res = await api.get('/api/v1/employees/', { params: { page_size: 200 } }); return res.data; },
  });
  const employeeOptions = useMemo(() => {
    const items = employeesData?.results || employeesData || [];
    return (items as { id: string; first_name: string; last_name: string }[]).map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}`.trim() }));
  }, [employeesData]);

  const ruleOptions = useMemo(() => {
    const items = rulesQuery.data?.results || [];
    return (items as { id: string; name: string }[]).map(r => ({ value: r.id as string, label: r.name as string }));
  }, [rulesQuery.data]);

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...rulesColumns,
    { key: 'id', header: 'Actions', sortable: false, render: (_: unknown, row: Record<string, unknown>) => (
      <div className="flex items-center gap-1">
        <EditButton permission="gratuity.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
        <DeleteButton permission="gratuity.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
      </div>
    )},
  ];

  const handleCreate = (data: RuleFormData) => {
    const payload: Record<string, unknown> = {
      ...data,
      salary_components: data.salary_components.split(',').map(s => s.trim()).filter(Boolean),
    };
    createMutation.mutate(payload, { onSuccess: () => setShowCreate(false) });
  };

  const handleEdit = async (data: RuleFormData) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      const payload = {
        ...data,
        salary_components: data.salary_components.split(',').map(s => s.trim()).filter(Boolean),
      };
      await api.patch(`${RULES_ENDPOINT}${editRecord.id}/`, payload);
      setEditRecord(null);
      rulesQuery.refetch();
    } finally {
      setEditLoading(false);
    }
  };

  const editInitialValues: RuleFormData = useMemo(() => {
    if (!editRecord) return emptyForm;
    return {
      name: (editRecord.name as string) || '',
      region: (editRecord.region as string) || 'india',
      salary_components: Array.isArray(editRecord.salary_components) ? (editRecord.salary_components as string[]).join(', ') : '',
      description: (editRecord.description as string) || '',
      is_active: editRecord.is_active !== false,
      slabs: (editRecord.slabs as SlabRow[]) || [],
    };
  }, [editRecord]);

  const handleCalculate = async () => {
    if (!selectedEmployee || !selectedRule) return;
    setCalculating(true); setCalcError(null); setCalcResult(null);
    try {
      const res = await api.post('/api/v1/gratuity/calculate/', { employee_id: selectedEmployee, rule_id: selectedRule });
      setCalcResult(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setCalcError(axiosErr?.response?.data?.detail || 'Calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Gratuity" subtitle="Configure gratuity rules and calculate end-of-service benefits" />

      {/* Calculator */}
      <Card className="mb-8 p-6">
        <h2 className="mb-2 text-lg font-semibold text-ink-primary">Calculate Gratuity</h2>
        <p className="mb-4 text-sm text-ink-secondary">Select an employee and rule to calculate their gratuity.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-primary">Employee</label>
            <Select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); setCalcResult(null); }}>
              <option value="">Select employee</option>
              {employeeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-primary">Gratuity Rule</label>
            <Select value={selectedRule} onChange={e => { setSelectedRule(e.target.value); setCalcResult(null); }}>
              <option value="">Select rule</option>
              {ruleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleCalculate} disabled={calculating || !selectedEmployee || !selectedRule} className="w-full">
              {calculating ? 'Calculating...' : 'Calculate'}
            </Button>
          </div>
        </div>

        {calcError && <div className="mt-4 rounded-md bg-error-lighter border border-error-light p-3 text-sm text-error-dark">{calcError}</div>}

        {calcResult && (
          <div className="mt-6 rounded-lg border border-success-light bg-success-lighter p-5">
            <h3 className="text-base font-semibold text-success-darker mb-3">Result</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
              <div><p className="text-xs text-ink-secondary">Employee</p><p className="font-medium">{calcResult.employee_name}</p></div>
              <div><p className="text-xs text-ink-secondary">Joined</p><p className="font-medium">{calcResult.date_of_joining ? formatDate(calcResult.date_of_joining) : '—'}</p></div>
              <div><p className="text-xs text-ink-secondary">Years of Service</p><p className="font-medium">{calcResult.years_of_service} yrs</p></div>
              <div><p className="text-xs text-ink-secondary">Base Salary</p><p className="font-medium">{formatCurrency(parseFloat(calcResult.base_salary))}</p></div>
              <div><p className="text-xs text-ink-secondary">Components</p><p className="font-medium">{calcResult.salary_components_used.join(', ')}</p></div>
              <div><p className="text-xs text-ink-secondary">Multiplier</p><p className="font-medium">×{calcResult.applicable_multiplier}</p></div>
              <div><p className="text-xs text-ink-secondary">Slab Range</p><p className="font-medium">{calcResult.slab_from_years}–{parseFloat(calcResult.slab_to_years) === 0 ? '∞' : calcResult.slab_to_years} yrs</p></div>
              <div><p className="text-xs text-ink-secondary">Rule</p><p className="font-medium">{calcResult.rule_name}</p></div>
            </div>
            <div className="mt-4 rounded-md bg-success-lighter p-4 text-center">
              <p className="text-sm text-success-dark">Gratuity Payable</p>
              <p className="text-2xl font-bold text-success-darker">{formatCurrency(parseFloat(calcResult.gratuity_amount))}</p>
              <p className="mt-1 text-xs text-success-main">= {formatCurrency(parseFloat(calcResult.base_salary))} × {calcResult.applicable_multiplier} × {calcResult.years_of_service}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Rules Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary">Gratuity Rules</h2>
          <CreateButton permission="gratuity.create" label="Create Rule" onClick={() => setShowCreate(true)} />
        </div>
        <DataTable queryResult={rulesQuery} columns={columnsWithActions} />
        {rulesQuery.data && rulesQuery.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={rulesQuery.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      </Card>

      {/* Create Modal */}
      <RuleFormModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Gratuity Rule" initialValues={emptyForm} onSubmit={handleCreate} isLoading={createMutation.isPending} />

      {/* Edit Modal */}
      <RuleFormModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Gratuity Rule" initialValues={editInitialValues} onSubmit={handleEdit} isLoading={editLoading} />

      {/* Delete */}
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }} title="Delete Gratuity Rule" message="Are you sure? This will delete the rule and all its slabs." confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </PageContainer>
  );
}
