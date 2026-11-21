import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { EMPLOYEES } from '@/lib/endpoints';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  useEmployeeBonusPoints,
  useCreateBonusPoint,
  useUpdateBonusPoint,
  useDeleteBonusPoint,
  type EmployeeBonusPoint,
} from '@/hooks/useEmployeeBonusPoints';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type GroupByOption =
  | 'Select'
  | 'Employee'
  | 'Reporting Manager'
  | 'Department'
  | 'Job Position'
  | 'Employement Type'
  | 'Company';

export default function EmployeeBonusPoints() {
  const { hasPermission, roleName } = useHrmsPermissionsContext();
  const isAdminOrHr =
    !roleName ||
    ['admin', 'org_admin', 'superadmin', 'hr_manager', 'hr manager', 'hr'].includes(
      roleName.toLowerCase()
    );
  const canView = isAdminOrHr || hasPermission('bonus_points.view');
  const canCreate = isAdminOrHr || hasPermission('bonus_points.create');
  const canEdit = isAdminOrHr || hasPermission('bonus_points.edit');
  const canDelete = isAdminOrHr || hasPermission('bonus_points.delete');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [groupByField, setGroupByField] = useState<GroupByOption>('Employee');
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [savedNotification, setSavedNotification] = useState('');
  const groupByRef = useRef<HTMLDivElement>(null);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmployeeBonusPoint | null>(null);

  // Form Fields matching Screenshot 2
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [points, setPoints] = useState<number>(0);
  const [basedOn, setBasedOn] = useState('');
  const [formError, setFormError] = useState('');

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Close Group By dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (groupByRef.current && !groupByRef.current.contains(event.target as Node)) {
        setIsGroupByOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch employees list for dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['all-employees-for-bonus-points'],
    queryFn: async () => {
      const res = await api.get(EMPLOYEES.LIST, { params: { page_size: 250 } });
      const results = res.data?.results || res.data || [];
      return Array.isArray(results) ? results : [];
    },
  });

  // Query bonus points
  const { data, isLoading } = useEmployeeBonusPoints({
    search: search.trim() || undefined,
  });

  const bonusPoints = data?.results || [];

  // Mutations
  const createMutation = useCreateBonusPoint();
  const updateMutation = useUpdateBonusPoint();
  const deleteMutation = useDeleteBonusPoint();

  // Reset form
  const resetForm = () => {
    setSelectedEmployeeId(employees.length > 0 ? employees[0].id : '');
    setPoints(0);
    setBasedOn('');
    setFormError('');
    setEditingRecord(null);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    if (!canCreate) return;
    resetForm();
    if (employees.length > 0) {
      setSelectedEmployeeId(employees[0].id);
    }
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (record: EmployeeBonusPoint) => {
    if (!canEdit) return;
    setEditingRecord(record);
    setSelectedEmployeeId(record.employee);
    setPoints(record.points);
    setBasedOn(record.based_on);
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedEmployeeId) {
      setFormError('Please select an employee.');
      return;
    }
    if (points === undefined || points === null || isNaN(points)) {
      setFormError('Please enter a valid bonus point count.');
      return;
    }
    if (!basedOn.trim()) {
      setFormError('Please enter what this bonus point is based on.');
      return;
    }

    try {
      if (editingRecord) {
        await updateMutation.mutateAsync({
          id: editingRecord.id,
          employee: selectedEmployeeId,
          points: Number(points),
          based_on: basedOn.trim(),
        });
      } else {
        await createMutation.mutateAsync({
          employee: selectedEmployeeId,
          points: Number(points),
          based_on: basedOn.trim(),
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Unable to save bonus point record. Please verify permissions and data.';
      setFormError(msg);
    }
  };

  // Confirm delete
  const handleDelete = async () => {
    if (!deleteConfirmId || !canDelete) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete bonus point failed', err);
    }
  };

  // Filtered & Grouped Data
  const filteredBonusPoints = useMemo(() => {
    if (!search.trim()) return bonusPoints;
    const q = search.trim().toLowerCase();
    return bonusPoints.filter(
      (b) =>
        b.employee_name?.toLowerCase().includes(q) ||
        b.employee_code?.toLowerCase().includes(q) ||
        b.based_on?.toLowerCase().includes(q) ||
        b.department_name?.toLowerCase().includes(q) ||
        b.designation_name?.toLowerCase().includes(q)
    );
  }, [bonusPoints, search]);

  // Grouping computation
  const groupedData = useMemo(() => {
    if (groupByField === 'Select') {
      return null;
    }

    const groups: Record<
      string,
      {
        groupKey: string;
        groupTitle: string;
        subTitle?: string;
        totalPoints: number;
        items: EmployeeBonusPoint[];
      }
    > = {};

    filteredBonusPoints.forEach((item) => {
      let key = '';
      let title = '';
      let subTitle = '';

      switch (groupByField) {
        case 'Employee':
          key = item.employee || item.employee_name || 'unknown';
          title = item.employee_name || 'Unknown Employee';
          subTitle = [item.employee_code, item.designation_name, item.department_name]
            .filter(Boolean)
            .join(' • ');
          break;
        case 'Reporting Manager':
          key = item.reporting_manager_id || 'no-manager';
          title = item.reporting_manager_name || 'No Reporting Manager';
          subTitle = 'Manager Group';
          break;
        case 'Department':
          key = item.department_id || 'no-dept';
          title = item.department_name || 'No Department';
          subTitle = 'Department Group';
          break;
        case 'Job Position':
          key = item.designation_id || 'no-designation';
          title = item.designation_name || 'No Job Position';
          subTitle = 'Designation Group';
          break;
        case 'Employement Type':
          key = item.employment_type || 'unknown';
          title = item.employment_type
            ? item.employment_type.charAt(0).toUpperCase() + item.employment_type.slice(1)
            : 'Unknown Type';
          subTitle = 'Employment Type Group';
          break;
        case 'Company':
          key = item.company_name || 'DigiHRMS';
          title = item.company_name || 'DigiHRMS';
          subTitle = 'Company / Branch Group';
          break;
        default:
          key = 'all';
          title = 'All Records';
      }

      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          groupTitle: title,
          subTitle,
          totalPoints: 0,
          items: [],
        };
      }
      groups[key].items.push(item);
      groups[key].totalPoints += Number(item.points || 0);
    });

    return Object.values(groups);
  }, [filteredBonusPoints, groupByField]);

  const activeGroupsCount = groupByField === 'Select' ? 0 : 1;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* ── Top Bar matching Screenshot 1 & 3 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ink-primary tracking-tight">
          Employee Bonus Point
        </h1>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Search Input matching Screenshot 1 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-ink-disabled">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 w-44 sm:w-56"
            />
          </div>

          {/* Group By(1) Popover Trigger Button */}
          <div className="relative" ref={groupByRef}>
            <Button variant="outlined" color="inherit" size="small"
              type="button"
              onClick={() => setIsGroupByOpen((prev) => !prev)}
            >
              <svg className="w-3.5 h-3.5 text-ink-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Group By({activeGroupsCount})</span>
            </Button>

            {/* Popover matching Screenshot 3 */}
            {isGroupByOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-surface-paper border border-divider rounded-sm shadow-xl z-50 p-3 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-xs font-bold text-ink-primary mb-2">Group By</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-ink-primary w-12">Field</span>
                  <Select
                    value={groupByField}
                    onChange={(e) => {
                      setGroupByField(e.target.value as GroupByOption);
                      setIsGroupByOpen(false);
                    }}
                  >
                    <option value="Select">Select</option>
                    <option value="Employee">Employee</option>
                    <option value="Reporting Manager">Reporting Manager</option>
                    <option value="Department">Department</option>
                    <option value="Job Position">Job Position</option>
                    <option value="Employement Type">Employement Type</option>
                    <option value="Company">Company</option>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* + Create Button (Blue) */}
          {canCreate && (
            <Button size="small"
              type="button"
              onClick={handleOpenCreate}
            >
              <span>+ Create</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Active Filter Bar ── */}
      {groupByField !== 'Select' && (
        <div className="flex items-center justify-end gap-2 pt-1 pb-1">
          {/* White Filters: Badge */}
          <span className="bg-surface-paper border border-divider text-ink-primary text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs">
            Filters:
          </span>

          {/* Active Field Chip with ⓧ */}
          <div className="bg-surface-paper border border-divider text-ink-primary text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
            <span className="text-ink-primary font-normal">Field : {groupByField}</span>
            <button
              type="button"
              onClick={() => setGroupByField('Select')}
              className="text-ink-disabled hover:text-ink-secondary font-bold text-xs ml-0.5 transition-colors cursor-pointer"
              title="Remove filter"
            >
              ⓧ
            </button>
          </div>

          {/* Save Button (White) */}
          <Button variant="outlined" color="inherit" size="small"
            type="button"
            onClick={() => {
              setSavedNotification('View preferences saved.');
              setTimeout(() => setSavedNotification(''), 3000);
            }}
          >
            <svg className="w-3.5 h-3.5 text-ink-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Save</span>
          </Button>

          {/* Clear Button (White ✕) */}
          <Button variant="outlined" color="inherit" size="small"
            type="button"
            onClick={() => setGroupByField('Select')}
            title="Clear filters"
          >
            ✕
          </Button>
        </div>
      )}

      {savedNotification && (
        <div className="text-right text-xs text-success-main font-medium">
          {savedNotification}
        </div>
      )}

      {/* ── Main Content Area: Empty State or Grouped / Flat View ── */}
      {isLoading ? (
        <div className="bg-surface-paper border border-divider rounded-sm p-16 text-center shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-main mb-2"></div>
          <p className="text-xs text-ink-secondary">Loading employee bonus points...</p>
        </div>
      ) : filteredBonusPoints.length === 0 ? (
        /* Empty State exactly matching Screenshot 1 */
        <div className="bg-surface-paper border border-divider rounded-sm py-28 px-4 flex flex-col items-center justify-center text-center shadow-xs">
          <svg
            className="w-16 h-16 text-ink-disabled stroke-1 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-5-5" />
          </svg>

          <h2 className="text-xl font-bold text-ink-primary mb-1 tracking-tight">
            No Records found
          </h2>
          <p className="text-xs text-ink-secondary font-normal">
            No records found.
          </p>

          {canCreate && (
            <Button type="button" size="small"
              onClick={handleOpenCreate}
              className="mt-4"
            >
              + Award First Bonus Point
            </Button>
          )}
        </div>
      ) : groupByField !== 'Select' && groupedData ? (
        /* Grouped View */
        <div className="space-y-4">
          {groupedData.map((group) => (
            <div
              key={group.groupKey}
              className="bg-surface-paper border border-divider rounded-sm shadow-xs overflow-hidden"
            >
              {/* Group Header */}
              <div className="px-4 py-3 bg-surface-neutral/75 border-b border-divider flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink-primary">{group.groupTitle}</span>
                  {group.subTitle && (
                    <span className="text-xs text-ink-secondary font-normal">({group.subTitle})</span>
                  )}
                  <span className="text-[11px] text-ink-disabled font-medium ml-1">
                    • {group.items.length} {group.items.length === 1 ? 'record' : 'records'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning-lighter text-warning-dark border border-warning-light">
                    ⭐ Total: {group.totalPoints} pts
                  </span>
                </div>
              </div>

              {/* Group Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-neutral/50 border-b border-divider text-ink-secondary uppercase text-[10px] font-semibold tracking-wider">
                    <tr>
                      {groupByField !== 'Employee' && <th className="py-2.5 px-4">Employee</th>}
                      <th className="py-2.5 px-4">Bonus Points</th>
                      <th className="py-2.5 px-4">Based On</th>
                      <th className="py-2.5 px-4">Awarded By</th>
                      <th className="py-2.5 px-4">Date</th>
                      {(canEdit || canDelete) && <th className="py-2.5 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider bg-surface-paper">
                    {group.items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-neutral transition-colors">
                        {groupByField !== 'Employee' && (
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-ink-primary">{item.employee_name}</div>
                            <div className="text-[11px] text-ink-disabled">{item.employee_code}</div>
                          </td>
                        )}
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-primary-lighter text-primary-dark border border-primary-light">
                            +{item.points} pts
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-ink-primary font-medium max-w-xs truncate">
                          {item.based_on}
                        </td>
                        <td className="py-2.5 px-4 text-ink-secondary">
                          {item.created_by_name || 'System / Admin'}
                        </td>
                        <td className="py-2.5 px-4 text-ink-secondary whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1 text-primary-main hover:text-primary-dark hover:bg-primary-lighter rounded transition-colors"
                                  title="Edit Bonus Point"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="p-1 text-error-main hover:text-error-dark hover:bg-error-lighter rounded transition-colors"
                                  title="Delete Bonus Point"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat List View (when Group By is Select) */
        <div className="bg-surface-paper border border-divider rounded-sm shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-neutral border-b border-divider text-ink-secondary uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Department &amp; Role</th>
                  <th className="py-2.5 px-4">Bonus Points</th>
                  <th className="py-2.5 px-4">Based On</th>
                  <th className="py-2.5 px-4">Awarded By</th>
                  <th className="py-2.5 px-4">Date</th>
                  {(canEdit || canDelete) && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-divider bg-surface-paper">
                {filteredBonusPoints.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-neutral transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-ink-primary">{item.employee_name}</div>
                      <div className="text-[11px] text-ink-disabled">{item.employee_code}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-ink-primary font-medium">{item.designation_name || '—'}</div>
                      <div className="text-[11px] text-ink-secondary">{item.department_name || '—'}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-primary-lighter text-primary-dark border border-primary-light">
                        +{item.points} pts
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-ink-primary font-medium max-w-sm truncate">
                      {item.based_on}
                    </td>
                    <td className="py-2.5 px-4 text-ink-secondary">
                      {item.created_by_name || 'System / Admin'}
                    </td>
                    <td className="py-2.5 px-4 text-ink-secondary whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 text-primary-main hover:text-primary-dark hover:bg-primary-lighter rounded transition-colors"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1 text-error-main hover:text-error-dark hover:bg-error-lighter rounded transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal matching Screenshot 2 ── */}
      {isModalOpen && (
        <Modal open onClose={() => {
                  setIsModalOpen(false);
                  resetForm();
                }} labelledBy="EmployeeBonusPoints-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
              <h3 id="EmployeeBonusPoints-modal-title-1" className="text-base font-bold text-ink-primary tracking-tight">
                {editingRecord ? 'Edit Employee Bonus Point' : 'Create Employee Bonus Point'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-ink-disabled hover:text-ink-secondary text-lg font-semibold leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 rounded bg-error-lighter border border-error-light text-xs text-error-dark">
                  {formError}
                </div>
              )}

              {/* Row 1: Employee and Bonus point * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                    Employee
                  </label>
                  <Select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp: any) => {
                      const name = emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                      const code = emp.employee_id ? `(${emp.employee_id})` : '';
                      return (
                        <option key={emp.id} value={emp.id}>
                          {name} {code}
                        </option>
                      );
                    })}
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                    Bonus point *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
                    required
                  />
                </div>
              </div>

              {/* Row 2: Based on * */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Based on *
                </label>
                <Input
                  type="text"
                  placeholder="Based On"
                  value={basedOn}
                  onChange={(e) => setBasedOn(e.target.value)}
                  required
                />
              </div>

              {/* Modal Footer with Blue Save Button matching Screenshot 2 */}
              <div className="pt-4 flex items-center justify-end">
                <Button size="small"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Employee Bonus Point"
        message="Are you sure you want to delete this employee bonus point entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

