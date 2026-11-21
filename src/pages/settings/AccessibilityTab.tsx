import { useState, useEffect, useRef } from 'react';
import {
  CheckIcon,
  LoaderIcon,
  AlertCircleIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
} from './SettingsIcons';
import { useHRSettings, useUpdateHRSettings } from '@/hooks/useHRSettings';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton, Switch } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Iconify } from '@/components/Iconify';

export interface CategoryFilters {
  employee?: string;
  department?: string;
  employee_type?: string;
  tags?: string;
  permissions?: string;
  job_position?: string;
  work_type?: string;
  job_role?: string;
  shift?: string;
  exclude_employees?: string;
}

export interface AccessibilityFeatureItem {
  id: string;
  label: string;
  restrict_all: boolean;
  filters: CategoryFilters;
}

const DEFAULT_FEATURES: AccessibilityFeatureItem[] = [
  {
    id: 'default_employee_view',
    label: 'Default Employee View',
    restrict_all: false, // matches user screenshot where it is toggled OFF
    filters: {
      employee_type: 'Permanent',
    },
  },
  {
    id: 'default_employee_detailed_view',
    label: 'Default Employee Detailed View',
    restrict_all: true,
    filters: {},
  },
  {
    id: 'can_view_gender_chart',
    label: 'Can view Gender Chart',
    restrict_all: true,
    filters: {},
  },
  {
    id: 'can_view_department_chart',
    label: 'Can view Department Chart',
    restrict_all: false,
    filters: {},
  },
  {
    id: 'can_view_employees_chart',
    label: 'Can view Employees Chart',
    restrict_all: false,
    filters: {},
  },
  {
    id: 'can_view_birthdays',
    label: 'Can view Birthdays',
    restrict_all: false,
    filters: {},
  },
  {
    id: 'can_view_anniversaries',
    label: 'Can view Work Anniversaries',
    restrict_all: false,
    filters: {},
  },
  {
    id: 'can_view_leave_chart',
    label: 'Can view Leave Chart',
    restrict_all: false,
    filters: {},
  },
  {
    id: 'can_view_attendance_chart',
    label: 'Can view Attendance Overview',
    restrict_all: false,
    filters: {},
  },
  {
    id: 'can_view_org_chart',
    label: 'Can view Organization Chart',
    restrict_all: false,
    filters: {},
  },
];

// Reusable toggle switch with primary blue active state
function SwitchToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Switch checked={checked} disabled={disabled} onClick={() => onChange(!checked)} />
  );
}

export function AccessibilityTab() {
  const { data: settings, isLoading, isError, error } = useHRSettings();
  const updateMutation = useUpdateHRSettings();

  // Features list
  const [features, setFeatures] = useState<AccessibilityFeatureItem[]>(DEFAULT_FEATURES);

  // Expanded items (default_employee_view expanded as in screenshot)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    default_employee_view: true,
    default_employee_detailed_view: false,
    can_view_gender_chart: false,
  });

  // Active Actions dropdown ID
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Clear filter confirmation modal state
  const [clearFilterTarget, setClearFilterTarget] = useState<AccessibilityFeatureItem | null>(null);
  const [clearFilterSaving, setClearFilterSaving] = useState(false);

  // Per-feature saving status
  const [savingFeatureId, setSavingFeatureId] = useState<string | null>(null);
  const [savedFeatureId, setSavedFeatureId] = useState<string | null>(null);

  // Notification message
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Mobile Location Check Interval
  const [intervalMinutes, setIntervalMinutes] = useState<number>(30);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savedLocation, setSavedLocation] = useState(false);

  // Dynamic dropdown options fetched from backend
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([
    'IT',
    'IT Support',
    'Human Resources',
    'Finance',
    'Operations',
    'Marketing',
    'Sales',
  ]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([
    'Software Engineer',
    'HR',
    'Senior Developer',
    'Project Manager',
    'QA Specialist',
    'Accountant',
  ]);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);

  // Fetch real backend options on mount
  useEffect(() => {
    async function fetchSelectOptions() {
      try {
        const [deptRes, desigRes, empRes] = await Promise.allSettled([
          api.get('/api/v1/departments/'),
          api.get('/api/v1/designations/'),
          api.get('/api/v1/employees/?page_size=100'),
        ]);

        if (deptRes.status === 'fulfilled' && deptRes.value.data) {
          const depts = (deptRes.value.data.results || deptRes.value.data).map(
            (d: any) => d.name
          );
          if (depts.length > 0) setDepartmentOptions(depts);
        }

        if (desigRes.status === 'fulfilled' && desigRes.value.data) {
          const desigs = (desigRes.value.data.results || desigRes.value.data).map(
            (d: any) => d.name
          );
          if (desigs.length > 0) setDesignationOptions(desigs);
        }

        if (empRes.status === 'fulfilled' && empRes.value.data) {
          const emps = (empRes.value.data.results || empRes.value.data).map((e: any) => ({
            id: e.id,
            name: `${e.first_name || ''} ${e.last_name || ''} (${e.employee_id || e.id.slice(0, 6)})`.trim(),
          }));
          if (emps.length > 0) setEmployeeOptions(emps);
        }
      } catch {
        // Fallbacks remain intact
      }
    }

    fetchSelectOptions();
  }, []);

  // Sync state from server settings
  useEffect(() => {
    if (settings) {
      if (settings.location_check_interval_minutes !== undefined) {
        setIntervalMinutes(settings.location_check_interval_minutes);
      }

      if (settings.accessibility_restrictions && typeof settings.accessibility_restrictions === 'object') {
        const serverMap = settings.accessibility_restrictions;
        setFeatures((prev) =>
          prev.map((f) => {
            if (serverMap[f.id] !== undefined) {
              const serverEntry = serverMap[f.id];
              return {
                ...f,
                restrict_all: typeof serverEntry === 'boolean' ? serverEntry : !!serverEntry.restrict_all,
                filters: (serverEntry && serverEntry.filters) ? { ...serverEntry.filters } : { ...f.filters },
              };
            }
            return f;
          })
        );
      }
    }
  }, [settings]);

  // Close actions menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActiveActionsId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle expand / collapse row
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle Restrict All switch
  const handleToggleRestrictAll = async (id: string) => {
    const nextFeatures = features.map((f) =>
      f.id === id ? { ...f, restrict_all: !f.restrict_all } : f
    );
    setFeatures(nextFeatures);
    await persistFeatures(nextFeatures);
  };

  // Update a single filter field for an item
  const handleFilterFieldChange = (
    featureId: string,
    field: keyof CategoryFilters,
    value: string
  ) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? {
              ...f,
              filters: {
                ...f.filters,
                [field]: value,
              },
            }
          : f
      )
    );
  };

  // Save changes for a feature
  const handleSaveFeature = async (featureId: string) => {
    setSavingFeatureId(featureId);
    setSavedFeatureId(null);
    try {
      await persistFeatures(features);
      setSavedFeatureId(featureId);
      setTimeout(() => setSavedFeatureId(null), 3000);
    } finally {
      setSavingFeatureId(null);
    }
  };

  // Persist all features into settings.accessibility_restrictions
  const persistFeatures = async (updatedList: AccessibilityFeatureItem[]) => {
    const payloadMap: Record<string, any> = {};
    updatedList.forEach((f) => {
      payloadMap[f.id] = {
        label: f.label,
        restrict_all: f.restrict_all,
        filters: f.filters || {},
      };
    });

    await updateMutation.mutateAsync({
      accessibility_restrictions: payloadMap,
    });
  };

  // Open Clear Filter Confirmation
  const handleOpenClearFilter = (feature: AccessibilityFeatureItem) => {
    setActiveActionsId(null);
    setClearFilterTarget(feature);
  };

  // Confirm and Clear Filter
  const handleConfirmClearFilter = async () => {
    if (!clearFilterTarget) return;
    setClearFilterSaving(true);
    try {
      const nextFeatures = features.map((f) =>
        f.id === clearFilterTarget.id
          ? {
              ...f,
              filters: {},
            }
          : f
      );
      setFeatures(nextFeatures);
      await persistFeatures(nextFeatures);
      setBannerNotice(`Filters cleared successfully for '${clearFilterTarget.label}'.`);
      setTimeout(() => setBannerNotice(null), 4000);
    } finally {
      setClearFilterSaving(false);
      setClearFilterTarget(null);
    }
  };

  // Mobile Location Check Interval save
  const handleSaveLocation = async () => {
    setSavingLocation(true);
    setSavedLocation(false);
    try {
      await updateMutation.mutateAsync({
        location_check_interval_minutes: Number(intervalMinutes) || 30,
      });
      setSavedLocation(true);
      setTimeout(() => setSavedLocation(false), 3000);
    } finally {
      setSavingLocation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderIcon className="h-8 w-8 text-primary-main" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-error-light bg-error-lighter p-6 text-center">
        <AlertCircleIcon className="mx-auto h-8 w-8 text-error-main" />
        <p className="mt-2 text-sm text-error-dark">
          Failed to load accessibility settings: {(error as Error)?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast Notice */}
      {bannerNotice && (
        <div className="rounded-xl border border-success-light bg-success-lighter px-4 py-3 text-sm text-success-dark flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckIcon className="h-4 w-4 text-success-main" />
            <span>{bannerNotice}</span>
          </div>
          <IconButton icon="close" size="small" color="success" aria-label="Dismiss" onClick={() => setBannerNotice(null)} />
        </div>
      )}

      {/* ─── Main Restriction Accordion List ─────────────────────────────── */}
      <div className="rounded-2xl border border-divider bg-surface-paper shadow-xs divide-y divide-divider overflow-hidden">
        {features.map((item) => {
          const isExpanded = !!expandedIds[item.id];
          const isMenuOpen = activeActionsId === item.id;
          const filters = item.filters || {};

          return (
            <div key={item.id} className="transition-colors hover:bg-surface-neutral/30">
              {/* Row Header matching screenshot: — Default Employee View [Actions ▼] */}
              <div className="flex items-center justify-between px-6 py-4">
                <Button
                  variant="text"
                  color="inherit"
                  onClick={() => toggleExpand(item.id)}
                  startIcon={<Iconify icon={isExpanded ? 'minus' : 'plus'} />}
                  className="!h-auto flex-1 !justify-start !px-0 !text-sm !font-semibold"
                >
                  {item.label}
                </Button>

                {/* Right Actions Dropdown */}
                <div className="relative">
                  <Button variant="outlined" color="inherit" size="small"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveActionsId(isMenuOpen ? null : item.id);
                    }}
                  >
                    <span>Actions</span>
                    <ChevronDownIcon className="h-3.5 w-3.5 text-ink-secondary" />
                  </Button>

                  {/* Actions Dropdown Menu containing "Clear Filter" */}
                  {isMenuOpen && (
                    <div
                      ref={actionsMenuRef}
                      className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-divider bg-surface-paper py-1 shadow-lg ring-1 ring-grey-900/5 animate-in fade-in zoom-in-95 duration-100"
                    >
                      {/* Clear Filter option with confirmation */}
                      <Button variant="text" color="error" size="small" onClick={() => handleOpenClearFilter(item)} className="!w-full !justify-start !rounded-none">
                        Clear Filter
                      </Button>

                      <div className="my-1 border-t border-divider" />

                      <Button
                        variant="text"
                        color="inherit"
                        size="small"
                        onClick={() => {
                          setActiveActionsId(null);
                          handleToggleRestrictAll(item.id);
                        }}
                        className="!w-full !justify-start !rounded-none"
                      >
                        {item.restrict_all ? 'Allow All' : 'Restrict All'}
                      </Button>

                      <Button
                        variant="text"
                        color="inherit"
                        size="small"
                        onClick={() => {
                          setActiveActionsId(null);
                          toggleExpand(item.id);
                        }}
                        className="!w-full !justify-start !rounded-none"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Body Content */}
              {isExpanded && (
                <div className="border-t border-divider bg-surface-paper px-6 py-5 pl-14 space-y-6">
                  {/* Restrict All Switch */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-ink-primary">
                      Restrict All
                    </label>
                    <div>
                      <SwitchToggle
                        checked={item.restrict_all}
                        onChange={() => handleToggleRestrictAll(item.id)}
                      />
                    </div>
                  </div>

                  {/* When Restrict All is OFF, render the filter form matching the screenshot */}
                  {!item.restrict_all && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                      {/* Light-blue Banner matching the screenshot */}
                      <div className="rounded-xl border border-info-light bg-info-lighter/70 p-4 text-xs text-info-darker leading-relaxed shadow-2xs">
                        <p className="font-medium text-info-darker">
                          Only those normal users/employees with any category mentioned in the form can access the <strong>'{item.label}'</strong> feature
                        </p>
                        <p className="mt-1 text-info-dark">
                          If skip all the category fields in the form, then all normal users/employees can access the feature
                        </p>
                      </div>

                      {/* 2-Column Form Fields */}
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {/* ── Left Column ── */}
                        <div className="space-y-5">
                          {/* 1. Employee */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Employee
                            </label>
                            <Select
                              value={filters.employee || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'employee', e.target.value)
                              }
                            >
                              <option value="">Select Employee</option>
                              {employeeOptions.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name}
                                </option>
                              ))}
                            </Select>
                          </div>

                          {/* 2. Department */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Department
                            </label>
                            <Select
                              value={filters.department || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'department', e.target.value)
                              }
                            >
                              <option value="">Select Department</option>
                              {departmentOptions.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </Select>
                          </div>

                          {/* 3. Employee Type (Permanent in screenshot) */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Employee Type
                            </label>
                            <Select
                              value={filters.employee_type || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'employee_type', e.target.value)
                              }
                            >
                              <option value="">Select Employee Type</option>
                              <option value="Permanent">Permanent</option>
                              <option value="Contract">Contract</option>
                              <option value="Probationary">Probationary</option>
                              <option value="Internship">Internship</option>
                              <option value="Part-Time">Part-Time</option>
                              <option value="Freelance">Freelance</option>
                            </Select>
                          </div>

                          {/* 4. Tags */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Tags
                            </label>
                            <Select
                              value={filters.tags || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'tags', e.target.value)
                              }
                            >
                              <option value="">Select Tag</option>
                              <option value="Core Team">Core Team</option>
                              <option value="Field Operations">Field Operations</option>
                              <option value="HQ">HQ</option>
                              <option value="Remote">Remote</option>
                              <option value="Contractor">Contractor</option>
                            </Select>
                          </div>

                          {/* 5. Permissions */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Permissions
                            </label>
                            <Select
                              value={filters.permissions || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'permissions', e.target.value)
                              }
                            >
                              <option value="">Select Permission</option>
                              <option value="Standard User">Standard User</option>
                              <option value="Department Approver">Department Approver</option>
                              <option value="Manager View">Manager View</option>
                              <option value="Administrator">Administrator</option>
                            </Select>
                          </div>
                        </div>

                        {/* ── Right Column ── */}
                        <div className="space-y-5">
                          {/* 1. Job Position */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Job Position
                            </label>
                            <Select
                              value={filters.job_position || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'job_position', e.target.value)
                              }
                            >
                              <option value="">Select Job Position</option>
                              {designationOptions.map((desig) => (
                                <option key={desig} value={desig}>
                                  {desig}
                                </option>
                              ))}
                            </Select>
                          </div>

                          {/* 2. Work Type */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Work Type
                            </label>
                            <Select
                              value={filters.work_type || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'work_type', e.target.value)
                              }
                            >
                              <option value="">Select Work Type</option>
                              <option value="Full-Time">Full-Time</option>
                              <option value="Part-Time">Part-Time</option>
                              <option value="On-site">On-site</option>
                              <option value="Remote">Remote</option>
                              <option value="Hybrid">Hybrid</option>
                            </Select>
                          </div>

                          {/* 3. Job Role */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Job Role
                            </label>
                            <Select
                              value={filters.job_role || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'job_role', e.target.value)
                              }
                            >
                              <option value="">Select Job Role</option>
                              <option value="Entry Level">Entry Level</option>
                              <option value="Junior">Junior</option>
                              <option value="Associate">Associate</option>
                              <option value="Mid-Level">Mid-Level</option>
                              <option value="Senior">Senior</option>
                              <option value="Lead">Lead</option>
                              <option value="Manager">Manager</option>
                            </Select>
                          </div>

                          {/* 4. Shift */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Shift
                            </label>
                            <Select
                              value={filters.shift || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'shift', e.target.value)
                              }
                            >
                              <option value="">Select Shift</option>
                              <option value="General Shift">General Shift (09:00 - 18:00)</option>
                              <option value="Morning Shift">Morning Shift (06:00 - 15:00)</option>
                              <option value="Afternoon Shift">Afternoon Shift (14:00 - 23:00)</option>
                              <option value="Night Shift">Night Shift (22:00 - 07:00)</option>
                              <option value="Flexible">Flexible Shift</option>
                            </Select>
                          </div>

                          {/* 5. Exclude Employees */}
                          <div>
                            <label className="block text-sm font-semibold text-ink-primary mb-1.5">
                              Exclude Employees
                            </label>
                            <Select
                              value={filters.exclude_employees || ''}
                              onChange={(e) =>
                                handleFilterFieldChange(item.id, 'exclude_employees', e.target.value)
                              }
                            >
                              <option value="">Select Excluded Employee</option>
                              {employeeOptions.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Save Filter Changes Button */}
                      <div className="pt-2 flex items-center gap-4">
                        <Button
                          type="button"
                          onClick={() => handleSaveFeature(item.id)}
                          disabled={savingFeatureId === item.id}
                        >
                          {savingFeatureId === item.id ? (
                            <>
                              <LoaderIcon className="mr-2 h-4 w-4" /> Saving Changes...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>

                        {savedFeatureId === item.id && (
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
                            <CheckIcon className="h-4 w-4" /> Saved successfully
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Clear Filter Confirmation Modal ─────────────────────────────── */}
      {clearFilterTarget && (
        <Modal open onClose={() => setClearFilterTarget(null)} labelledBy="AccessibilityTab-modal-title-1" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 space-y-4 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-lighter text-primary-main">
                <AlertCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 id="AccessibilityTab-modal-title-1" className="text-lg font-semibold text-ink-primary">Clear Filter Confirmation</h3>
                <p className="text-xs text-ink-secondary">Reset category permissions</p>
              </div>
            </div>

            <p className="text-sm text-ink-primary leading-relaxed">
              Are you sure you want to clear all accessibility filters for <strong>'{clearFilterTarget.label}'</strong>?
              All selected departments, positions, employee types, and excluded employees will be removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-divider">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setClearFilterTarget(null)}
                disabled={clearFilterSaving}
              >
                Cancel
              </Button>
              <Button size="small"
                type="button"
                onClick={handleConfirmClearFilter}
                disabled={clearFilterSaving}
              >
                {clearFilterSaving ? (
                  <>
                    <LoaderIcon className="mr-1.5 h-3.5 w-3.5" /> Clearing...
                  </>
                ) : (
                  'Yes, Clear Filter'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Secondary Section: Mobile Geofencing Interval ────────────────── */}
      <section className="space-y-4 pt-4 border-t border-divider">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-ink-primary">
            Mobile Geofencing &amp; Location Verification
          </h3>
          <p className="mt-1 text-xs text-ink-secondary">
            Periodic background GPS synchronization frequency for attendance verification on mobile devices.
          </p>
        </div>

        <div className="rounded-2xl border border-divider bg-surface-paper p-6 shadow-xs space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
              <MapPinIcon className="h-4 w-4 text-primary-main" />
              <span>Mobile Location Check Interval</span>
            </label>
            <p className="mt-0.5 text-xs text-ink-secondary">
              Interval at which the employee mobile app verifies ongoing presence inside the designated office coordinates.
            </p>

            <Select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10) || 30)}
              className="mt-2.5 max-w-md"
            >
              <option value={15}>15 Minutes (High Precision &amp; Frequent Verification)</option>
              <option value={30}>30 Minutes (Recommended Standard)</option>
              <option value={45}>45 Minutes (Balanced Performance)</option>
              <option value={60}>60 Minutes (Battery Saver Mode)</option>
            </Select>
          </div>

          <div className="rounded-xl border border-primary-lighter bg-primary-lighter/60 p-4 text-xs text-primary-darker">
            <div className="flex items-center gap-2 font-semibold text-primary-darker">
              <ShieldCheckIcon className="h-4 w-4 text-primary-main" />
              <span>Geofencing Boundary Enforcement</span>
            </div>
            <p className="mt-1 text-primary-dark">
              Branch coordinates, GPS radius, and designated Wi-Fi networks can be managed under <strong>Organization &gt; Branches</strong>.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-4">
            <Button
              type="button"
              onClick={handleSaveLocation}
              disabled={savingLocation}
            >
              {savingLocation ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>

            {savedLocation && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-main">
                <CheckIcon className="h-4 w-4" /> Saved successfully
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
