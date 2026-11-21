import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useDefaultPaginationSize } from '@/hooks/useHRSettings';
import {
  useCompanyLeaves,
  useCreateCompanyLeave,
  useUpdateCompanyLeave,
  useDeleteCompanyLeave,
  type CompanyLeave,
} from '@/hooks/useCompanyLeaves';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const WEEK_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'first_week', label: 'First Week' },
  { value: 'second_week', label: 'Second Week' },
  { value: 'third_week', label: 'Third Week' },
  { value: 'fourth_week', label: 'Fourth Week' },
  { value: 'fifth_week', label: 'Fifth Week' },
];

const WEEK_DAY_OPTIONS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

export default function CompanyLeaves() {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Filter form values
  const [filterWeek, setFilterWeek] = useState('');
  const [filterWeekDay, setFilterWeekDay] = useState('');

  // Applied filter values
  const [appliedWeek, setAppliedWeek] = useState('');
  const [appliedWeekDay, setAppliedWeekDay] = useState('');

  // Pagination
  const pageSize = useDefaultPaginationSize();
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close filter popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  // Fetch Companies from HR Settings & Branches
  const { data: hrSettings } = useQuery<{ company_name?: string }>({
    queryKey: ['hr-settings-company-leaves'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/hr-settings/');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: branchesData } = useQuery<any>({
    queryKey: ['branches-company-leaves'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/branches/');
        return res.data;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableCompanies = useMemo(() => {
    const list: string[] = [];
    if (hrSettings?.company_name?.trim() && !list.includes(hrSettings.company_name.trim())) {
      list.push(hrSettings.company_name.trim());
    }
    const branchList = Array.isArray(branchesData)
      ? branchesData
      : Array.isArray((branchesData as any)?.results)
      ? (branchesData as any).results
      : [];
    branchList.forEach((b: any) => {
      if (b?.name?.trim() && !list.includes(b.name.trim())) {
        list.push(b.name.trim());
      }
    });
    return list;
  }, [hrSettings, branchesData]);

  // Query Company Leaves
  const { data: leavesData, isLoading, refetch } = useCompanyLeaves({
    search: debouncedSearch || undefined,
    based_on_week: appliedWeek || undefined,
    based_on_week_day: appliedWeekDay || undefined,
    page,
    page_size: pageSize,
  });

  const records: CompanyLeave[] = useMemo(() => {
    if (!leavesData) return [];
    if (Array.isArray(leavesData)) return leavesData;
    if (Array.isArray(leavesData.results)) return leavesData.results;
    return [];
  }, [leavesData]);

  const totalCount = leavesData?.count ?? records.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Mutations
  const createMutation = useCreateCompanyLeave();
  const updateMutation = useUpdateCompanyLeave();
  const deleteMutation = useDeleteCompanyLeave();

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<CompanyLeave | null>(null);
  const [formWeek, setFormWeek] = useState('all');
  const [formWeekDay, setFormWeekDay] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingLeave, setDeletingLeave] = useState<CompanyLeave | null>(null);

  const handleOpenCreate = () => {
    setEditingLeave(null);
    setFormWeek('all');
    setFormWeekDay('');
    setFormCompany(availableCompanies[0] || hrSettings?.company_name || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (leave: CompanyLeave) => {
    setEditingLeave(leave);
    setFormWeek(leave.based_on_week || 'all');
    setFormWeekDay(leave.based_on_week_day || '');
    setFormCompany(leave.company || availableCompanies[0] || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formWeekDay) {
      setFormError('Please select a Week Day.');
      return;
    }

    try {
      if (editingLeave) {
        await updateMutation.mutateAsync({
          id: editingLeave.id,
          data: {
            based_on_week: formWeek,
            based_on_week_day: formWeekDay,
            company: formCompany,
          },
        });
      } else {
        await createMutation.mutateAsync({
          based_on_week: formWeek,
          based_on_week_day: formWeekDay,
          company: formCompany,
        });
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.message ||
        'Failed to save Company Leave. Please check for duplicate rules.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLeave) return;
    try {
      await deleteMutation.mutateAsync(deletingLeave.id);
      setDeletingLeave(null);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete company leave.');
    }
  };

  const handleApplyFilter = () => {
    setAppliedWeek(filterWeek);
    setAppliedWeekDay(filterWeekDay);
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    setFilterWeek('');
    setFilterWeekDay('');
    setAppliedWeek('');
    setAppliedWeekDay('');
    setPage(1);
    setIsFilterOpen(false);
  };

  const hasActiveFilters = Boolean(appliedWeek || appliedWeekDay);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Top Header & Action Controls (Matching Screenshot 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Company Leaves</h1>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Search Input with Q icon */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-gray-400 w-44 sm:w-56"
            />
          </div>

          {/* Filter Popover Button */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xs border transition-colors ${
                hasActiveFilters || isFilterOpen
                  ? 'border-gray-400 bg-gray-100 text-gray-900'
                  : 'border-gray-300 bg-gray-50/70 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Filter Dropdown / Card (Matching Screenshot 3) */}
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-sm shadow-xl p-5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Company Leave</h3>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1.5">
                      Based On Week
                    </label>
                    <select
                      value={filterWeek}
                      onChange={(e) => setFilterWeek(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-xs px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="">---------</option>
                      {WEEK_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1.5">
                      Based On Week Day
                    </label>
                    <select
                      value={filterWeekDay}
                      onChange={(e) => setFilterWeekDay(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-xs px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="">---------</option>
                      {WEEK_DAY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleApplyFilter}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xs font-semibold text-xs tracking-wide shadow-xs cursor-pointer transition-colors"
                    >
                      Filter
                    </button>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilter}
                        className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-800 underline text-center"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* + Create Button (Blue) */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xs text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <span>+ Create</span>
          </button>
        </div>
      </div>

      {/* Main Table (Matching Screenshot 2) */}
      <div className="bg-white border border-gray-200/90 rounded-xs shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead>
              <tr className="bg-white">
                <th
                  scope="col"
                  className="py-3 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider"
                >
                  Based On Week
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider"
                >
                  Based On Week Day
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider text-center border-l border-gray-100 w-36"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                    Loading company leaves...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center">
                    <p className="text-sm font-medium text-gray-600">No company leaves configured yet.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "+ Create" to configure recurring leaves like All Sundays or Second/Fourth Saturdays.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-sm text-gray-800 font-normal">
                      {item.based_on_week_display || item.based_on_week}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-gray-800 font-normal">
                      {item.based_on_week_day_display || item.based_on_week_day}
                    </td>
                    <td className="py-2 px-4 text-center border-l border-gray-100">
                      <div className="inline-flex items-center justify-center gap-4">
                        {/* Edit Icon (Pencil in Square) */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit"
                          className="text-gray-400 hover:text-gray-700 p-1 rounded-xs transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {/* Delete Icon (Red Trash) */}
                        <button
                          type="button"
                          onClick={() => setDeletingLeave(item)}
                          title="Delete"
                          className="text-red-500 hover:text-red-700 p-1 rounded-xs transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Matching Screenshot 2) */}
        <div className="py-3 px-4 flex items-center justify-between border-t border-gray-100 bg-white text-xs text-gray-700">
          <div>
            Page {page} of {totalPages}.
          </div>
          <div className="flex items-center gap-2">
            <span>Page</span>
            <span className="inline-flex items-center justify-center border border-gray-300 rounded-xs px-2 py-0.5 min-w-[28px] text-center font-medium bg-white">
              {page}
            </span>
            <span>of {totalPages}</span>
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal (Matching Screenshot 1) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white rounded-xs shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {editingLeave ? 'Edit Company Leave' : 'Create Company Leave'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Inner Bordered Card (Matching Screenshot 1) */}
            <form onSubmit={handleSaveModal}>
              <div className="border border-gray-200 rounded-xs p-5 space-y-4 bg-white">
                {formError && (
                  <div className="p-2.5 rounded-xs bg-red-50 border border-red-200 text-xs text-red-700">
                    {formError}
                  </div>
                )}

                {/* Field 1: Based On Week */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1.5">
                    Based On Week
                  </label>
                  <select
                    value={formWeek}
                    onChange={(e) => setFormWeek(e.target.value)}
                    className="w-full border border-gray-200 rounded-xs px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    {WEEK_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 2: Based On Week Day */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1.5">
                    Based On Week Day
                  </label>
                  <select
                    value={formWeekDay}
                    onChange={(e) => setFormWeekDay(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xs px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">---------</option>
                    {WEEK_DAY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 3: Company */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1.5">
                    Company
                  </label>
                  <select
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full border border-gray-200 rounded-xs px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    {availableCompanies.length === 0 ? (
                      <option value="">Default Organization</option>
                    ) : (
                      availableCompanies.map((comp) => (
                        <option key={comp} value={comp}>
                          {comp}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Save Button (Blue) */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xs font-semibold text-sm shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingLeave}
        onClose={() => setDeletingLeave(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Company Leave"
        message={`Are you sure you want to delete the company leave rule for "${deletingLeave?.based_on_week_display || deletingLeave?.based_on_week} - ${deletingLeave?.based_on_week_day_display || deletingLeave?.based_on_week_day}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

