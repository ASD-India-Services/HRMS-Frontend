/**
 * Loss of Pay (LOP) Policy Configuration Page
 *
 * Admin page for configuring LOP settings:
 * - Global policy: is_active, max_days, default deduction
 * - Scoped rates: different deduction amounts for all/department/grade/employee
 */

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Iconify } from '@/components/Iconify';
import { Card } from '@/components/ui/Card';

const POLICY_ENDPOINT = '/api/v1/leaves/lop-policy/';
const RATES_ENDPOINT = '/api/v1/leaves/lop-rates/';

interface LopPolicy {
  id: string;
  is_active: boolean;
  max_days_per_year: string | null;
  deduction_per_day: string;
  rates: LopRate[];
  created_at: string;
  updated_at: string;
}

interface LopRate {
  id: string;
  policy: string;
  applies_to: string;
  employee: string | null;
  employee_name: string | null;
  department: string | null;
  department_name: string | null;
  grade: string | null;
  grade_name: string | null;
  target_name: string;
  deduction_per_day: string;
  max_days_per_year: string | null;
}

interface SelectOption {
  id: string;
  name: string;
}

export default function LossOfPay() {
  const { hasPermission } = useHrmsPermissionsContext();
  const canCreate = hasPermission('loss_of_pay.create');
  const canEdit = hasPermission('loss_of_pay.edit');
  const canDelete = hasPermission('loss_of_pay.delete');

  const [policy, setPolicy] = useState<LopPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Policy form
  const [isActive, setIsActive] = useState(true);
  const [maxDays, setMaxDays] = useState('');
  const [deductionPerDay, setDeductionPerDay] = useState('');

  // Rate form
  const [showRateForm, setShowRateForm] = useState(false);
  const [rateAppliesTo, setRateAppliesTo] = useState('all');
  const [rateTarget, setRateTarget] = useState('');
  const [rateDeduction, setRateDeduction] = useState('');
  const [rateMaxDays, setRateMaxDays] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [deleteRateId, setDeleteRateId] = useState<string | null>(null);

  // Dropdown options
  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [grades, setGrades] = useState<SelectOption[]>([]);

  useEffect(() => {
    fetchPolicy();
    fetchOptions();
  }, []);

  async function fetchPolicy() {
    setLoading(true);
    try {
      const res = await api.get(POLICY_ENDPOINT);
      const results = res.data?.results ?? res.data;
      const list = Array.isArray(results) ? results : [];
      if (list.length > 0) {
        const p = list[0] as LopPolicy;
        setPolicy(p);
        setIsActive(p.is_active);
        setMaxDays(p.max_days_per_year ?? '');
        setDeductionPerDay(p.deduction_per_day ?? '');
      }
    } catch {
      // No policy yet
    } finally {
      setLoading(false);
    }
  }

  async function fetchOptions() {
    try {
      const [empRes, deptRes, gradeRes] = await Promise.all([
        api.get('/api/v1/employees/', { params: { page_size: 500, status: 'active' } }),
        api.get('/api/v1/departments/', { params: { page_size: 500 } }),
        api.get('/api/v1/employee-grades/', { params: { page_size: 500 } }),
      ]);
      const empList = empRes.data?.results ?? empRes.data ?? [];
      setEmployees(empList.map((e: Record<string, unknown>) => ({
        id: String(e.id),
        name: String(e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id),
      })));
      const deptList = deptRes.data?.results ?? deptRes.data ?? [];
      setDepartments(deptList.map((d: Record<string, unknown>) => ({ id: String(d.id), name: String(d.name) })));
      const gradeList = gradeRes.data?.results ?? gradeRes.data ?? [];
      setGrades(gradeList.map((g: Record<string, unknown>) => ({ id: String(g.id), name: String(g.name) })));
    } catch {
      // Options failed to load
    }
  }

  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!deductionPerDay || Number(deductionPerDay) <= 0) {
      setError('Default deduction per day is required and must be greater than 0.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        is_active: isActive,
        max_days_per_year: maxDays ? Number(maxDays) : null,
        deduction_per_day: Number(deductionPerDay),
      };

      if (policy) {
        await api.patch(`${POLICY_ENDPOINT}${policy.id}/`, payload);
      } else {
        await api.post(POLICY_ENDPOINT, payload);
      }

      setSuccess('Policy saved successfully.');
      await fetchPolicy();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown> } };
      const data = axiosErr?.response?.data;
      if (data) {
        setError(Object.values(data).flat().filter(Boolean).map(String).join(' '));
      } else {
        setError('Failed to save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRate() {
    if (!policy) return;
    if (!rateDeduction || Number(rateDeduction) <= 0) {
      setError('Deduction amount is required.');
      return;
    }
    if (rateAppliesTo !== 'all' && !rateTarget) {
      setError('Please select a target for the selected scope.');
      return;
    }

    setRateSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        policy: policy.id,
        applies_to: rateAppliesTo,
        deduction_per_day: Number(rateDeduction),
        max_days_per_year: rateMaxDays ? Number(rateMaxDays) : null,
      };
      if (rateAppliesTo === 'employee') payload.employee = rateTarget;
      if (rateAppliesTo === 'department') payload.department = rateTarget;
      if (rateAppliesTo === 'grade') payload.grade = rateTarget;

      await api.post(RATES_ENDPOINT, payload);
      setShowRateForm(false);
      setRateAppliesTo('all');
      setRateTarget('');
      setRateDeduction('');
      setRateMaxDays('');
      setSuccess('Rate added successfully.');
      await fetchPolicy();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown> } };
      const data = axiosErr?.response?.data;
      if (data) {
        setError(Object.values(data).flat().filter(Boolean).map(String).join(' '));
      } else {
        setError('Failed to add rate.');
      }
    } finally {
      setRateSaving(false);
    }
  }

  async function handleDeleteRate() {
    if (!deleteRateId) return;
    try {
      await api.delete(`${RATES_ENDPOINT}${deleteRateId}/`);
      setDeleteRateId(null);
      setSuccess('Rate removed.');
      await fetchPolicy();
    } catch {
      setError('Failed to remove rate.');
    }
  }

  const targetOptions = rateAppliesTo === 'employee' ? employees
    : rateAppliesTo === 'department' ? departments
    : rateAppliesTo === 'grade' ? grades
    : [];

  if (loading) {
    return (
      <PageContainer maxWidth="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-grey-200" />
          <div className="h-64 rounded bg-surface-neutral" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="Loss of Pay"
        subtitle="Configure LOP policy and set different deduction rates for specific employees, departments, or grades."
      />

      {error && (
        <div className="mb-4 rounded-md border border-error-light bg-error-lighter p-3 text-sm text-error-dark">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-success-light bg-success-lighter p-3 text-sm text-success-dark">{success}</div>
      )}

      {/* ─── Single Card with all settings ───────────────────── */}
      <Card>
      <form onSubmit={handleSavePolicy} className="p-6">
        <div className="mb-6">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-divider text-primary-main focus:ring-primary-main"
            />
            <span className="text-sm font-medium text-ink-primary">Enable Loss of Pay</span>
          </label>
          <p className="ml-7 mt-1 text-xs text-ink-secondary">
            When enabled, employees can apply for LOP leave. Configure deduction rates below.
          </p>
        </div>
        {/* ─── Default Policy Settings ─────────────────────────── */}
<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div>
    <label className="block text-sm font-medium text-ink-primary mb-1">
      Default Deduction Per Day (₹) <span className="text-error-main">*</span>
    </label>
    <Input
      type="number"
      value={deductionPerDay}
      onChange={(e) => setDeductionPerDay(e.target.value)}
      min="1"
      step="0.01"
      placeholder="e.g. 500"
      required
    />
    <p className="mt-1 text-xs text-ink-secondary">
      Amount deducted per day of LOP. Used when no specific rate applies.
    </p>
  </div>

  <div>
    <label className="block text-sm font-medium text-ink-primary mb-1">
      Max Days Per Year <span className="text-ink-disabled">(Optional)</span>
    </label>
    <Input
      type="number"
      value={maxDays}
      onChange={(e) => setMaxDays(e.target.value)}
      min="0"
      step="0.5"
      placeholder="Leave blank for unlimited"
    />
    <p className="mt-1 text-xs text-ink-secondary">
      Maximum LOP days allowed per year. Leave blank for unlimited.
    </p>
  </div>
</div>

        {/* ─── Deduction Rates Section ─────────────────────────── */}
        {policy && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-primary">Deduction Rates</h3>
                <p className="text-xs text-ink-secondary">Most specific wins: Employee &gt; Grade &gt; Department &gt; All Employees.</p>
              </div>
              {canCreate && (
                <Button size="small" startIcon={<Iconify icon="plus" />} onClick={() => setShowRateForm(true)}>
                  Add Rate
                </Button>
              )}
            </div>

            {/* Add Rate Form */}
            {showRateForm && (
              <div className="mb-5 rounded-md border border-divider bg-surface-neutral p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-primary mb-1">Applies To</label>
                    <Select value={rateAppliesTo} onChange={(e) => { setRateAppliesTo(e.target.value); setRateTarget(''); }}>
                      <option value="all">All Employees</option>
                      <option value="department">Department</option>
                      <option value="grade">Grade</option>
                      <option value="employee">Employee</option>
                    </Select>
                  </div>

                  {rateAppliesTo !== 'all' && (
                    <div>
                      <label className="block text-xs font-medium text-ink-primary mb-1">
                        {rateAppliesTo === 'employee' ? 'Select Employee' : rateAppliesTo === 'department' ? 'Select Department' : 'Select Grade'}
                      </label>
                      <Select value={rateTarget} onChange={(e) => setRateTarget(e.target.value)}>
                        <option value="">-- Select --</option>
                        {targetOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-ink-primary mb-1">Deduction/Day (₹) <span className="text-error-main">*</span></label>
                    <Input type="number" value={rateDeduction} onChange={(e) => setRateDeduction(e.target.value)}
                      min="1" step="0.01" placeholder="e.g. 500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-primary mb-1">Max Days/Year <span className="text-ink-disabled">(Optional)</span></label>
                    <Input type="number" value={rateMaxDays} onChange={(e) => setRateMaxDays(e.target.value)}
                      min="0" step="0.5" placeholder="Unlimited" />
                  </div>
                </div>

                <div className="mt-4 flex gap-2 justify-end">
                  <Button variant="outlined" color="inherit" size="small" type="button" onClick={() => setShowRateForm(false)}>
                    Cancel
                  </Button>
                  <Button size="small" type="button" onClick={handleAddRate} disabled={rateSaving}>
                    {rateSaving ? 'Adding...' : 'Add Rate'}
                  </Button>
                </div>
              </div>
            )}

            {/* Rates Table */}
            {policy.rates && policy.rates.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-divider">
                <table className="min-w-full divide-y divide-divider">
                  <thead className="bg-surface-neutral">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-secondary">Scope</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-secondary">Target</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-secondary">Deduction/Day</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-secondary">Max Days</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-ink-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider bg-surface-paper">
                    {policy.rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-surface-neutral">
                        <td className="px-4 py-2 text-sm text-ink-primary capitalize">{rate.applies_to}</td>
                        <td className="px-4 py-2 text-sm text-ink-primary font-medium">{rate.target_name}</td>
                        <td className="px-4 py-2 text-sm text-ink-primary">₹{rate.deduction_per_day}</td>
                        <td className="px-4 py-2 text-sm text-ink-secondary">{rate.max_days_per_year ?? 'Unlimited'}</td>
                        <td className="px-4 py-2">
                          {canDelete ? (
                            <Button variant="soft" color="error" size="small" onClick={() => setDeleteRateId(rate.id)}>
                              Remove
                            </Button>
                          ) : (
                            <span className="text-xs text-ink-disabled">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-ink-secondary text-center py-4 border border-dashed border-divider rounded-md">
                No deduction rates configured yet. Add a rate to enable LOP for employees.
              </p>
            )}
          </div>
        )}

        {/* Save button — needs create (new policy) or edit (existing policy) */}
        {(policy ? canEdit : canCreate) && (
          <div className="mt-6 flex justify-end border-t border-divider pt-5">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : policy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        )}
      </form>
      </Card>

      {/* Delete Rate Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteRateId}
        onClose={() => setDeleteRateId(null)}
        onConfirm={handleDeleteRate}
        title="Remove Deduction Rate"
        message="Are you sure you want to remove this deduction rate? Affected employees will fall back to the next applicable rate or the default."
        confirmLabel="Remove"
        variant="destructive"
      />
    </PageContainer>
  );
}
