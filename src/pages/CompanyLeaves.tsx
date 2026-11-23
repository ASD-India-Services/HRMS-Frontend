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
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';
import { StateView } from '@/components/ui/StateView';

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
  const { showToast } = useToast();
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
      showToast(err.response?.data?.detail || 'Failed to delete company leave.', 'error');
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
    <PageContainer>
      <PageHeader title="Company Leaves" actions={
        <>
<div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Search Input with Q icon */}
          <div className="relative">
            <Iconify icon="search" width={16} className="pointer-events-none absolute left-2.5 top-2.5 text-ink-disabled" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="pl-8 pr-3 w-44 sm:w-56"
            />
          </div>

          {/* Filter Popover Button */}
          <div className="relative" ref={filterRef}>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<Iconify icon="filter" />}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              Filter
              {hasActiveFilters && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary-main" />
              )}
            </Button>

            {/* Filter Dropdown / Card (Matching Screenshot 3) */}
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-surface-paper border border-divider rounded-sm shadow-xl p-5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-divider pb-2 mb-4">
                  <h3 className="text-sm font-bold text-ink-primary">Company Leave</h3>
                  <IconButton icon="chevron-up" size="small" onClick={() => setIsFilterOpen(false)} aria-label="Close filters" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-primary mb-1.5">
                      Based On Week
                    </label>
                    <Select
                      value={filterWeek}
                      onChange={(e) => setFilterWeek(e.target.value)}
                    >
                      <option value="">---------</option>
                      {WEEK_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-primary mb-1.5">
                      Based On Week Day
                    </label>
                    <Select
                      value={filterWeekDay}
                      onChange={(e) => setFilterWeekDay(e.target.value)}
                    >
                      <option value="">---------</option>
                      {WEEK_DAY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button size="small"
                      type="button"
                      onClick={handleApplyFilter}
                      className="w-full"
                    >
                      Filter
                    </Button>
                    {hasActiveFilters && (
                      <Button variant="text" color="inherit" size="small" onClick={handleResetFilter} className="w-full">
                        Reset Filter
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* + Create Button (Blue) */}
          <Button size="small"
            type="button"
            onClick={handleOpenCreate}
          >
            <span>+ Create</span>
          </Button>
        </div>
        </>
      } />

      {/* Main Table (Matching Screenshot 2) */}
      <div className="bg-surface-paper border border-grey-300/90 rounded-xs shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider text-left">
            <thead>
              <tr className="bg-surface-paper">
                <th
                  scope="col"
                  className="py-3 px-4 text-xs font-bold text-ink-primary uppercase tracking-wider"
                >
                  Based On Week
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-xs font-bold text-ink-primary uppercase tracking-wider"
                >
                  Based On Week Day
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-xs font-bold text-ink-primary uppercase tracking-wider text-center border-l border-divider w-36"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-surface-paper">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-ink-secondary">
                    Loading company leaves...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <StateView
                      icon="leaves"
                      title="No company leaves configured yet."
                      description={'Click "Create" to configure recurring leaves like All Sundays or Second/Fourth Saturdays.'}
                    />
                  </td>
                </tr>
              ) : (
                records.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-neutral/70 transition-colors">
                    <td className="py-3.5 px-4 text-sm text-ink-primary font-normal">
                      {item.based_on_week_display || item.based_on_week}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-ink-primary font-normal">
                      {item.based_on_week_day_display || item.based_on_week_day}
                    </td>
                    <td className="py-2 px-4 text-center border-l border-divider">
                      <div className="inline-flex items-center justify-center gap-4">
                        {/* Edit Icon (Pencil in Square) */}
                        <IconButton icon="pencil" size="small" onClick={() => handleOpenEdit(item)} aria-label="Edit" />

                        {/* Delete Icon (Red Trash) */}
                        <IconButton icon="trash" size="small" color="error" onClick={() => setDeletingLeave(item)} aria-label="Delete" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Matching Screenshot 2) */}
        <div className="py-3 px-4 flex items-center justify-between border-t border-divider bg-surface-paper text-xs text-ink-primary">
          <div>
            Page {page} of {totalPages}.
          </div>
          <div className="flex items-center gap-2">
            <span>Page</span>
            <span className="inline-flex items-center justify-center border border-divider rounded-xs px-2 py-0.5 min-w-[28px] text-center font-medium bg-surface-paper">
              {page}
            </span>
            <span>of {totalPages}</span>
            <div className="flex items-center gap-1 ml-2">
              <IconButton icon="arrow-left" size="small" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous Page" />
              <IconButton icon="arrow-right" size="small" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Next Page" />
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal (Matching Screenshot 1) */}
      {isModalOpen && (
        <Modal open onClose={() => setIsModalOpen(false)} labelledBy="CompanyLeaves-modal-title-1" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 id="CompanyLeaves-modal-title-1" className="text-lg font-bold text-ink-primary tracking-tight">
                {editingLeave ? 'Edit Company Leave' : 'Create Company Leave'}
              </h2>
              <IconButton icon="close" size="small" onClick={() => setIsModalOpen(false)} aria-label="Close" />
            </div>

            {/* Inner Bordered Card (Matching Screenshot 1) */}
            <form onSubmit={handleSaveModal}>
              <div className="border border-divider rounded-xs p-5 space-y-4 bg-surface-paper">
                {formError && (
                  <div className="p-2.5 rounded-xs bg-error-lighter border border-error-light text-xs text-error-dark">
                    {formError}
                  </div>
                )}

                {/* Field 1: Based On Week */}
                <div>
                  <label className="block text-sm font-bold text-ink-primary mb-1.5">
                    Based On Week
                  </label>
                  <Select
                    value={formWeek}
                    onChange={(e) => setFormWeek(e.target.value)}
                  >
                    {WEEK_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Field 2: Based On Week Day */}
                <div>
                  <label className="block text-sm font-bold text-ink-primary mb-1.5">
                    Based On Week Day
                  </label>
                  <Select
                    value={formWeekDay}
                    onChange={(e) => setFormWeekDay(e.target.value)}
                    required
                  >
                    <option value="">---------</option>
                    {WEEK_DAY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Field 3: Company */}
                <div>
                  <label className="block text-sm font-bold text-ink-primary mb-1.5">
                    Company
                  </label>
                  <Select
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
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
                  </Select>
                </div>

                {/* Save Button (Blue) */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : 'Save'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
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
    </PageContainer>
  );
}

