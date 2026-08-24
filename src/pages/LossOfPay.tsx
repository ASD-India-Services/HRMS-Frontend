/**
 * Loss of Pay (LOP) Policy Configuration Page
 *
 * Admin page for configuring LOP settings:
 * - Whether LOP is active (employees can apply)
 * - Max days per year (optional — leave blank for unlimited)
 * - Deduction per day (₹)
 *
 * Only accessible by users with 'leaves.manage' permission.
 */

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const ENDPOINT = '/api/v1/leaves/lop-policy/';

interface LopPolicy {
  id: string;
  is_active: boolean;
  max_days_per_year: string | null;
  deduction_per_day: string;
  created_at: string;
  updated_at: string;
}

export default function LossOfPay() {
  const [policy, setPolicy] = useState<LopPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [isActive, setIsActive] = useState(true);
  const [maxDays, setMaxDays] = useState('');
  const [deductionPerDay, setDeductionPerDay] = useState('');

  useEffect(() => {
    fetchPolicy();
  }, []);

  async function fetchPolicy() {
    setLoading(true);
    try {
      const res = await api.get(ENDPOINT);
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
      // No policy yet — that's fine
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!deductionPerDay || Number(deductionPerDay) <= 0) {
      setError('Deduction per day is required and must be greater than 0.');
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
        await api.patch(`${ENDPOINT}${policy.id}/`, payload);
      } else {
        await api.post(ENDPOINT, payload);
      }

      setSuccess('Loss of Pay policy saved successfully.');
      await fetchPolicy();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown> } };
      const data = axiosErr?.response?.data;
      if (data) {
        const messages = Object.values(data).flat().filter(Boolean);
        setError(messages.map(String).join(' '));
      } else {
        setError('Failed to save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loss of Pay</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure the Loss of Pay (LOP) policy for your organization. When active, employees can
          apply for LOP leave and the specified amount will be deducted from their salary per day.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Active toggle */}
        <div className="mb-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-900">
              Enable Loss of Pay
            </span>
          </label>
          <p className="ml-7 mt-1 text-xs text-gray-500">
            When enabled, a "Loss of Pay" option will appear in the leave apply form for all employees.
          </p>
        </div>

        {/* Max Days */}
        <div className="mb-5">
          <label htmlFor="max-days" className="block text-sm font-medium text-gray-700">
            Maximum Days Per Year
            <span className="ml-1 text-xs font-normal text-gray-400">(Optional)</span>
          </label>
          <input
            type="number"
            id="max-days"
            value={maxDays}
            onChange={(e) => setMaxDays(e.target.value)}
            min="0"
            step="0.5"
            placeholder="Leave blank for unlimited"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            If set, employees cannot apply for more than this many LOP days per fiscal year.
            Leave blank to allow unlimited LOP applications.
          </p>
        </div>

        {/* Deduction per day */}
        <div className="mb-6">
          <label htmlFor="deduction" className="block text-sm font-medium text-gray-700">
            Deduction Per Day (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="deduction"
            value={deductionPerDay}
            onChange={(e) => setDeductionPerDay(e.target.value)}
            min="1"
            step="0.01"
            placeholder="e.g. 500"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            This amount will be deducted from the employee's salary for each day of LOP taken.
          </p>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : policy ? 'Update Policy' : 'Create Policy'}
          </button>
        </div>
      </form>

      {/* Info section */}
      {policy && (
        <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
          <p><strong>Policy ID:</strong> {policy.id}</p>
          <p><strong>Last updated:</strong> {new Date(policy.updated_at).toLocaleString('en-IN')}</p>
        </div>
      )}
    </div>
  );
}
