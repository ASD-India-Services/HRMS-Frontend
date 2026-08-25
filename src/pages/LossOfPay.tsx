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
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loss of Pay</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure LOP policy and set different deduction rates for specific employees, departments, or grades.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      {/* ─── Single Card with all settings ───────────────────── */}
      <form onSubmit={handleSavePolicy} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-900">Enable Loss of Pay</span>
          </label>
          <p className="ml-7 mt-1 text-xs text-gray-500">
            When enabled, employees can apply for LOP leave. Configure deduction rates below.
          </p>
        </div>

        {/* ─── Deduction Rates Section ─────────────────────────── */}
        {policy && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Deduction Rates</h3>
                <p className="text-xs text-gray-500">Most specific wins: Employee &gt; Grade &gt; Department &gt; All Employees.</p>
              </div>
              <button type="button" onClick={() => setShowRateForm(true)}
                className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Rate
              </button>
            </div>

            {/* Add Rate Form */}
            {showRateForm && (
              <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Applies To</label>
                    <select value={rateAppliesTo} onChange={(e) => { setRateAppliesTo(e.target.value); setRateTarget(''); }}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                      <option value="all">All Employees</option>
                      <option value="department">Department</option>
                      <option value="grade">Grade</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>

                  {rateAppliesTo !== 'all' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {rateAppliesTo === 'employee' ? 'Select Employee' : rateAppliesTo === 'department' ? 'Select Department' : 'Select Grade'}
                      </label>
                      <select value={rateTarget} onChange={(e) => setRateTarget(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                        <option value="">-- Select --</option>
                        {targetOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Deduction/Day (₹) <span className="text-red-500">*</span></label>
                    <input type="number" value={rateDeduction} onChange={(e) => setRateDeduction(e.target.value)}
                      min="1" step="0.01" placeholder="e.g. 500"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max Days/Year <span className="text-gray-400">(Optional)</span></label>
                    <input type="number" value={rateMaxDays} onChange={(e) => setRateMaxDays(e.target.value)}
                      min="0" step="0.5" placeholder="Unlimited"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                  </div>
                </div>

                <div className="mt-4 flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowRateForm(false)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="button" onClick={handleAddRate} disabled={rateSaving}
                    className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                    {rateSaving ? 'Adding...' : 'Add Rate'}
                  </button>
                </div>
              </div>
            )}

            {/* Rates Table */}
            {policy.rates && policy.rates.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Scope</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Target</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Deduction/Day</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Max Days</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {policy.rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700 capitalize">{rate.applies_to}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">{rate.target_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">₹{rate.deduction_per_day}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{rate.max_days_per_year ?? 'Unlimited'}</td>
                        <td className="px-4 py-2">
                          <button type="button" onClick={() => setDeleteRateId(rate.id)}
                            className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded-md">
                No deduction rates configured yet. Add a rate to enable LOP for employees.
              </p>
            )}
          </div>
        )}

        {/* Save button */}
        <div className="mt-6 flex justify-end border-t border-gray-200 pt-5">
          <button type="submit" disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Saving...' : policy ? 'Update Policy' : 'Create Policy'}
          </button>
        </div>
      </form>

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
    </div>
  );
}
