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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
            <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., India Standard Gratuity" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
            <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="india">India</option>
              <option value="uae">UAE</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Salary Components */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Components (comma-separated) *</label>
            <input type="text" required value={form.salary_components} onChange={e => setForm(p => ({ ...p, salary_components: e.target.value }))} placeholder="Basic, DA" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-gray-400">These salary components will be summed to get the base salary for calculation</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe this gratuity rule" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded border-gray-300" />
            Active
          </label>

          {/* Slabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Slabs (Service Year Tiers)</h4>
              <button type="button" onClick={addSlab} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Slab
              </button>
            </div>
            <p className="text-xs text-gray-400">Define multipliers for different service year ranges. Set "To Years" to 0 for unlimited (no upper cap).</p>

            {form.slabs.length === 0 && (
              <p className="text-xs text-gray-400 italic">No slabs added yet. Add at least one slab.</p>
            )}

            {form.slabs.map((slab, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">From Years</label>
                  <input type="number" step="0.01" min="0" value={slab.from_years} onChange={e => updateSlab(idx, 'from_years', e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">To Years (0 = ∞)</label>
                  <input type="number" step="0.01" min="0" value={slab.to_years} onChange={e => updateSlab(idx, 'to_years', e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Multiplier</label>
                  <input type="number" step="0.0001" min="0" value={slab.multiplier} onChange={e => updateSlab(idx, 'multiplier', e.target.value)} placeholder="e.g., 0.5769" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                </div>
                <button type="button" onClick={() => removeSlab(idx)} className="mt-4 rounded p-1 text-red-500 hover:bg-red-50" aria-label="Remove slab">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}

            {/* Quick preset for India */}
            {form.slabs.length === 0 && form.region === 'india' && (
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, slabs: [{ from_years: 0, to_years: 5, multiplier: 0 }, { from_years: 5, to_years: 0, multiplier: 0.5769 }] }))}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Use India standard preset (0-5 yrs: not eligible, 5+ yrs: 15/26 days per year)
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading || !form.name.trim()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
        <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
        <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gratuity</h1>
        <p className="mt-1 text-sm text-gray-600">Configure gratuity rules and calculate end-of-service benefits</p>
      </div>

      {/* Calculator */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Calculate Gratuity</h2>
        <p className="mb-4 text-sm text-gray-500">Select an employee and rule to calculate their gratuity.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Employee</label>
            <select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); setCalcResult(null); }} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              {employeeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Gratuity Rule</label>
            <select value={selectedRule} onChange={e => { setSelectedRule(e.target.value); setCalcResult(null); }} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select rule</option>
              {ruleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleCalculate} disabled={calculating || !selectedEmployee || !selectedRule} className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {calculating ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
        </div>

        {calcError && <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{calcError}</div>}

        {calcResult && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
            <h3 className="text-base font-semibold text-green-900 mb-3">Result</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
              <div><p className="text-xs text-gray-500">Employee</p><p className="font-medium">{calcResult.employee_name}</p></div>
              <div><p className="text-xs text-gray-500">Joined</p><p className="font-medium">{calcResult.date_of_joining}</p></div>
              <div><p className="text-xs text-gray-500">Years of Service</p><p className="font-medium">{calcResult.years_of_service} yrs</p></div>
              <div><p className="text-xs text-gray-500">Base Salary</p><p className="font-medium">{formatCurrency(parseFloat(calcResult.base_salary))}</p></div>
              <div><p className="text-xs text-gray-500">Components</p><p className="font-medium">{calcResult.salary_components_used.join(', ')}</p></div>
              <div><p className="text-xs text-gray-500">Multiplier</p><p className="font-medium">×{calcResult.applicable_multiplier}</p></div>
              <div><p className="text-xs text-gray-500">Slab Range</p><p className="font-medium">{calcResult.slab_from_years}–{parseFloat(calcResult.slab_to_years) === 0 ? '∞' : calcResult.slab_to_years} yrs</p></div>
              <div><p className="text-xs text-gray-500">Rule</p><p className="font-medium">{calcResult.rule_name}</p></div>
            </div>
            <div className="mt-4 rounded-md bg-green-100 p-4 text-center">
              <p className="text-sm text-green-700">Gratuity Payable</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(parseFloat(calcResult.gratuity_amount))}</p>
              <p className="mt-1 text-xs text-green-600">= {formatCurrency(parseFloat(calcResult.base_salary))} × {calcResult.applicable_multiplier} × {calcResult.years_of_service}</p>
            </div>
          </div>
        )}
      </div>

      {/* Rules Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Gratuity Rules</h2>
          <CreateButton label="Create Rule" onClick={() => setShowCreate(true)} />
        </div>
        <DataTable queryResult={rulesQuery} columns={columnsWithActions} />
        {rulesQuery.data && rulesQuery.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={rulesQuery.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      </div>

      {/* Create Modal */}
      <RuleFormModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Gratuity Rule" initialValues={emptyForm} onSubmit={handleCreate} isLoading={createMutation.isPending} />

      {/* Edit Modal */}
      <RuleFormModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Gratuity Rule" initialValues={editInitialValues} onSubmit={handleEdit} isLoading={editLoading} />

      {/* Delete */}
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }} title="Delete Gratuity Rule" message="Are you sure? This will delete the rule and all its slabs." confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </div>
  );
}
