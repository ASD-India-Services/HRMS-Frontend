import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';

export interface LeaveTypeItem {
  id: string;
  name: string;
  is_carry_forward: boolean;
  is_paid: boolean;
  requires_approval: boolean;
  is_encashable: boolean;
  max_encashable_days?: number | string;
  max_days_per_year?: number | string;
  max_carry_forward_days?: number | string;
}

interface ManageLeaveTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveTypesChanged?: () => void;
}

const DEFAULT_FORM: Omit<LeaveTypeItem, 'id'> = {
  name: '',
  is_carry_forward: false,
  is_paid: true,
  requires_approval: true,
  is_encashable: false,
  max_encashable_days: '0',
  max_days_per_year: '0',
  max_carry_forward_days: '0',
};

export function ManageLeaveTypesModal({ isOpen, onClose, onLeaveTypesChanged }: ManageLeaveTypesModalProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useHrmsPermissionsContext();

  const canCreate = hasPermission('leave_types.create');
  const canEdit = hasPermission('leave_types.edit');
  const canDelete = hasPermission('leave_types.delete');

  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<LeaveTypeItem, 'id'>>(DEFAULT_FORM);
  const [showForm, setShowForm] = useState(false);

  const fetchTypes = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/api/v1/leaves/types/');
      const data = res.data;
      const list = Array.isArray(data) ? data : data.results || [];
      setLeaveTypes(list);
    } catch (err: unknown) {
      console.error('Failed to fetch leave types', err);
      setErrorMsg('Failed to load leave types from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
      resetForm();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleStartEdit = (item: LeaveTypeItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      is_carry_forward: item.is_carry_forward,
      is_paid: item.is_paid,
      requires_approval: item.requires_approval,
      is_encashable: item.is_encashable,
      max_encashable_days: String(item.max_encashable_days || '0'),
      max_days_per_year: '0',
      max_carry_forward_days: '0',
    });
    setShowForm(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Leave type name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      name: form.name.trim(),
      max_days_per_year: 0,
      is_carry_forward: form.is_carry_forward,
      max_carry_forward_days: 0,
      is_paid: form.is_paid,
      requires_approval: form.requires_approval,
      is_encashable: form.is_encashable,
      max_encashable_days: form.is_encashable
        ? parseFloat(String(form.max_encashable_days)) || 0
        : 0,
    };

    try {
      if (editingId) {
        await api.patch(`/api/v1/leaves/types/${editingId}/`, payload);
        setSuccessMsg(`Leave type "${payload.name}" updated successfully.`);
      } else {
        await api.post('/api/v1/leaves/types/', payload);
        setSuccessMsg(`Leave type "${payload.name}" created successfully.`);
      }

      // Sync across all caches & dropdowns
      await queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
      if (onLeaveTypesChanged) onLeaveTypesChanged();

      await fetchTypes();
      resetForm();
    } catch (err: any) {
      console.error('Failed to save leave type', err);
      const detail =
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Error saving leave type. Please check the values and try again.';
      setErrorMsg(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: LeaveTypeItem) => {
    if (!window.confirm(`Are you sure you want to delete leave type "${item.name}"?`)) {
      return;
    }

    setDeletingId(item.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.delete(`/api/v1/leaves/types/${item.id}/`);
      setSuccessMsg(`Leave type "${item.name}" deleted.`);

      // Sync across all caches & dropdowns
      await queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
      if (onLeaveTypesChanged) onLeaveTypesChanged();

      await fetchTypes();
      if (editingId === item.id) {
        resetForm();
      }
    } catch (err: any) {
      console.error('Failed to delete leave type', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to delete leave type.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Leave Types</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Create, edit, and configure custom leave types for your organization
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 ml-2 font-bold">
              ✕
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700 ml-2 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Create / Edit Form */}
          {showForm ? (
            <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-blue-100">
                <h3 className="text-base font-semibold text-gray-900">
                  {editingId ? `Edit Leave Type: ${form.name}` : 'Create New Leave Type'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Leave Type Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Casual Leave, Sick Leave, Sabbatical"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer bg-white p-2.5 rounded-lg border border-gray-200 hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={form.is_paid}
                      onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Paid Leave</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer bg-white p-2.5 rounded-lg border border-gray-200 hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={form.requires_approval}
                      onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Approval Required</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer bg-white p-2.5 rounded-lg border border-gray-200 hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={form.is_carry_forward}
                      onChange={(e) => setForm({ ...form, is_carry_forward: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Carry Forward</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer bg-white p-2.5 rounded-lg border border-gray-200 hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={form.is_encashable}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          is_encashable: e.target.checked,
                          max_encashable_days: e.target.checked ? form.max_encashable_days : '0',
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Encashable</span>
                  </label>
                </div>

                {/* Conditional Fields: Encashable Days */}
                {form.is_encashable && (
                  <div className="w-full sm:w-1/2 pt-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Max Encashable Days (0 = Unlimited)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="e.g., 10"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={form.max_encashable_days}
                      onChange={(e) => setForm({ ...form, max_encashable_days: e.target.value })}
                    />
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && (
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    {editingId ? 'Save Changes' : 'Create Leave Type'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            canCreate && (
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">
                  Total Active Leave Types: <strong className="text-gray-900">{leaveTypes.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Leave Type
                </button>
              </div>
            )
          )}

          {/* Table List */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Carry Forward
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Approval
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Loading leave types...
                    </td>
                  </tr>
                ) : leaveTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-10 h-10 mb-2 stroke-current" fill="none" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <p className="text-sm font-medium text-gray-700">No leave types found</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Click "Add New Leave Type" above to create your first dynamic leave type.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaveTypes.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                              item.is_paid
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.is_paid ? 'Paid' : 'Unpaid'}
                          </span>
                          {item.is_encashable && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800 w-fit">
                              Encashable {Number(item.max_encashable_days) > 0 ? `(Max ${item.max_encashable_days}d)` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.is_carry_forward ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                            Yes
                          </span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.requires_approval ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Required
                          </span>
                        ) : (
                          <span className="text-gray-400">Auto</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="px-2 py-1 text-xs font-medium rounded text-blue-700 hover:bg-blue-50 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item)}
                              className="px-2 py-1 text-xs font-medium rounded text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              {deletingId === item.id ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
