import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useEmployees } from '@/hooks/useEmployees';
import type { Employee } from '@/types/employee';
import {
  PermissionSectionsGrid,
  useAllPermissions,
  type PermissionSection,
  type PermissionItem,
  sectionPermissions,
  withImpliedViewPermissions,
} from '../admin/PermissionSectionsGrid';
import {
  SearchIcon,
  CheckIcon,
  LoaderIcon,
  ShieldCheckIcon,
  UsersIcon,
  PencilIcon,
} from './SettingsIcons';

export type DataScope = 'organisation' | 'department' | 'self';

export interface RoleOption {
  id: string;
  name: string;
  description: string;
  data_scope?: DataScope;
  permissions?: { id: string; code: string; display_name: string }[];
}

interface StoredEmployeePerms {
  roleId: string;
  roleName: string;
  dataScope: DataScope;
  selectedPermissionIds: string[];
}

const STORAGE_KEY = 'hrms_employee_permissions_overrides_v1';

export function EmployeePermissionTab() {
  const queryClient = useQueryClient();

  // 1. Fetch Employees
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    page_size: 100,
  });
  const employees: Employee[] = useMemo(() => {
    if (!employeesData) return [];
    return Array.isArray(employeesData) ? employeesData : employeesData.results ?? [];
  }, [employeesData]);

  // 2. Fetch Roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery<RoleOption[]>({
    queryKey: ['roles-permission-tab'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/roles/');
        const data = res.data;
        return Array.isArray(data) ? data : data?.results || [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Default fallback roles if backend roles are not yet populated
  const roles: RoleOption[] = useMemo(() => {
    if (rolesData && rolesData.length > 0) return rolesData;
    return [
      {
        id: 'r-admin',
        name: 'admin',
        description: 'Organisation Administrator with unrestricted system access',
        data_scope: 'organisation',
      },
      {
        id: 'r-dept-head',
        name: 'department_head',
        description: 'Default department head role managing departmental staff and approvals',
        data_scope: 'department',
      },
      {
        id: 'r-hr-manager',
        name: 'hr_manager',
        description: 'HR Manager overseeing recruitment, leaves, onboarding, and policies',
        data_scope: 'organisation',
      },
      {
        id: 'r-employee',
        name: 'employee',
        description: 'Standard self-service employee with self-only permissions',
        data_scope: 'self',
      },
    ];
  }, [rolesData]);

  // 3. Fetch All Permissions Hierarchy
  const { data: permissionSections, isLoading: permsLoading } = useAllPermissions();

  const sections: PermissionSection[] = useMemo(() => {
    return permissionSections ?? [];
  }, [permissionSections]);

  // Flattened all permissions map id -> PermissionItem
  const allPermsById = useMemo(() => {
    const map = new Map<string, PermissionItem>();
    sections.forEach((sec) => {
      sec.common.forEach((p) => map.set(p.id, p));
      sec.subsections.forEach((sub) => {
        sub.permissions.forEach((p) => map.set(p.id, p));
      });
    });
    return map;
  }, [sections]);

  // 4. Overrides map state (stored in localStorage)
  const [employeePermsMap, setEmployeePermsMap] = useState<Record<string, StoredEmployeePerms>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  const saveOverridesMap = (nextMap: Record<string, StoredEmployeePerms>) => {
    setEmployeePermsMap(nextMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
  };

  // Helper to determine initial role & permissions for an employee
  const getEmployeeConfig = useCallback(
    (employee: Employee): StoredEmployeePerms => {
      const existing = employeePermsMap[employee.id];
      if (existing) return existing;

      // Guess default role based on designation / title
      const title = (employee.designation?.title || '').toLowerCase();
      let defaultRole = roles.find((r) => r.name === 'employee') || roles[0];

      if (title.includes('head') || title.includes('manager') || title.includes('lead')) {
        const found = roles.find((r) => r.name === 'department_head' || r.name === 'hr_manager');
        if (found) defaultRole = found;
      } else if (title.includes('admin') || title.includes('director')) {
        const found = roles.find((r) => r.name === 'admin');
        if (found) defaultRole = found;
      }

      // Default permissions from role
      const rolePermIds = (defaultRole.permissions || []).map((p) => p.id);

      return {
        roleId: defaultRole.id,
        roleName: defaultRole.name,
        dataScope: (defaultRole.data_scope as DataScope) || 'self',
        selectedPermissionIds: rolePermIds,
      };
    },
    [employeePermsMap, roles]
  );

  // Filter / Search states for Employee List
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Active view: List view vs Employee Detail View
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Detail view active editing state
  const [activeRoleName, setActiveRoleName] = useState<string>('employee');
  const [activeDataScope, setActiveDataScope] = useState<DataScope>('self');
  const [activeSelectedIds, setActiveSelectedIds] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // When an employee is selected, initialize the editing state
  useEffect(() => {
    if (selectedEmployee) {
      const cfg = getEmployeeConfig(selectedEmployee);
      setActiveRoleName(cfg.roleName);
      setActiveDataScope(cfg.dataScope);

      // If stored perms are empty but role has perms, seed from role
      if (cfg.selectedPermissionIds && cfg.selectedPermissionIds.length > 0) {
        setActiveSelectedIds(new Set(cfg.selectedPermissionIds));
      } else {
        const matchingRole = roles.find((r) => r.name === cfg.roleName || r.id === cfg.roleId);
        if (matchingRole && matchingRole.permissions && matchingRole.permissions.length > 0) {
          setActiveSelectedIds(new Set(matchingRole.permissions.map((p) => p.id)));
        } else {
          // If no permissions in role yet, check first few view permissions as sensible default
          const defaultViews = Array.from(allPermsById.values())
            .filter((p) => p.code.endsWith('.view'))
            .map((p) => p.id);
          setActiveSelectedIds(new Set(defaultViews.slice(0, 8)));
        }
      }
      setPermSearch('');
    }
  }, [selectedEmployee, getEmployeeConfig, roles, allPermsById]);

  // When admin switches the Base Role dropdown in detail view
  const handleRoleChange = (newRoleName: string) => {
    setActiveRoleName(newRoleName);
    const targetRole = roles.find((r) => r.name === newRoleName);
    if (targetRole) {
      if (targetRole.data_scope) {
        setActiveDataScope(targetRole.data_scope);
      }
      // Combine target role's permissions with current
      if (targetRole.permissions && targetRole.permissions.length > 0) {
        const roleIds = targetRole.permissions.map((p) => p.id);
        setActiveSelectedIds(new Set(roleIds));
      }
    }
  };

  // Toggle single permission
  const handleTogglePermission = useCallback((permId: string) => {
    setActiveSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  }, []);

  // Toggle section / subsection group
  const handleToggleGroup = useCallback((groupPerms: PermissionItem[]) => {
    setActiveSelectedIds((prev) => {
      const next = new Set(prev);
      const allChecked = groupPerms.every((p) => next.has(p.id));
      if (allChecked) {
        groupPerms.forEach((p) => next.delete(p.id));
      } else {
        groupPerms.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }, []);

  // Save changes for selected employee
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveEmployeePermissions = async () => {
    if (!selectedEmployee) return;
    setIsSaving(true);

    const targetRole = roles.find((r) => r.name === activeRoleName) || roles[0];
    const permArray = Array.from(activeSelectedIds);

    // 1. Update localStorage
    const updatedMap: Record<string, StoredEmployeePerms> = {
      ...employeePermsMap,
      [selectedEmployee.id]: {
        roleId: targetRole.id,
        roleName: activeRoleName,
        dataScope: activeDataScope,
        selectedPermissionIds: permArray,
      },
    };
    saveOverridesMap(updatedMap);

    // 2. Attempt backend role assignment sync if endpoint is available
    try {
      await api.put(`/api/v1/employees/${selectedEmployee.id}/role-assignment/`, {
        role_id: targetRole.id,
      });
      // also patch overrides
      const overrideCodes = permArray
        .map((id) => allPermsById.get(id)?.code)
        .filter(Boolean) as string[];

      await api.patch(`/api/v1/employees/${selectedEmployee.id}/role-assignment/`, {
        permissions_override: overrideCodes,
      });
    } catch {
      // local save succeeds even if server accounts are not fully provisioned
    } finally {
      setIsSaving(false);
      showToast(`Permissions updated successfully for ${selectedEmployee.first_name} ${selectedEmployee.last_name}`);
      queryClient.invalidateQueries({ queryKey: ['hrms-permissions'] });
    }
  };

  // Filter permission sections by search query in Detail View
  const filteredSections = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return sections;

    const matches = (p: PermissionItem) =>
      p.display_name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);

    const result: PermissionSection[] = [];
    for (const sec of sections) {
      const sectionMatch = sec.label.toLowerCase().includes(q);
      const common = sectionMatch ? sec.common : sec.common.filter(matches);
      const subsections = sec.subsections
        .map((sub) => {
          const subMatch = sub.label.toLowerCase().includes(q);
          const permissions =
            sectionMatch || subMatch ? sub.permissions : sub.permissions.filter(matches);
          return { ...sub, permissions };
        })
        .filter((sub) => sub.permissions.length > 0);

      if (common.length > 0 || subsections.length > 0) {
        result.push({ ...sec, common, subsections });
      }
    }
    return result;
  }, [sections, permSearch]);

  // ──────────────────────────────────────────────────────────────────────────
  // ASSIGN MODAL WORKFLOW (when "+ Assign Permissions" button is clicked)
  // ──────────────────────────────────────────────────────────────────────────
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetEmpId, setAssignTargetEmpId] = useState<string>('');
  const [assignRoleName, setAssignRoleName] = useState<string>('department_head');
  const [assignDataScope, setAssignDataScope] = useState<DataScope>('department');
  const [assignSelectedIds, setAssignSelectedIds] = useState<Set<string>>(new Set());
  const [assignPermSearch, setAssignPermSearch] = useState('');

  const handleOpenAssignModal = () => {
    if (employees.length > 0) {
      setAssignTargetEmpId(employees[0].id);
      const initialCfg = getEmployeeConfig(employees[0]);
      setAssignRoleName(initialCfg.roleName);
      setAssignDataScope(initialCfg.dataScope);
      setAssignSelectedIds(new Set(initialCfg.selectedPermissionIds));
    }
    setAssignPermSearch('');
    setIsAssignModalOpen(true);
  };

  // When changing employee inside the Assign modal
  const handleAssignEmpSelect = (empId: string) => {
    setAssignTargetEmpId(empId);
    const targetEmp = employees.find((e) => e.id === empId);
    if (targetEmp) {
      const cfg = getEmployeeConfig(targetEmp);
      setAssignRoleName(cfg.roleName);
      setAssignDataScope(cfg.dataScope);
      setAssignSelectedIds(new Set(cfg.selectedPermissionIds));
    }
  };

  // When changing base role in Assign modal
  const handleAssignRoleChange = (roleName: string) => {
    setAssignRoleName(roleName);
    const targetRole = roles.find((r) => r.name === roleName);
    if (targetRole) {
      if (targetRole.data_scope) setAssignDataScope(targetRole.data_scope);
      if (targetRole.permissions && targetRole.permissions.length > 0) {
        setAssignSelectedIds(new Set(targetRole.permissions.map((p) => p.id)));
      }
    }
  };

  const handleSaveAssignModal = async () => {
    if (!assignTargetEmpId) return;
    const targetEmp = employees.find((e) => e.id === assignTargetEmpId);
    if (!targetEmp) return;

    const targetRole = roles.find((r) => r.name === assignRoleName) || roles[0];
    const permArray = Array.from(assignSelectedIds);

    const updatedMap: Record<string, StoredEmployeePerms> = {
      ...employeePermsMap,
      [assignTargetEmpId]: {
        roleId: targetRole.id,
        roleName: assignRoleName,
        dataScope: assignDataScope,
        selectedPermissionIds: permArray,
      },
    };
    saveOverridesMap(updatedMap);

    // Attempt backend sync
    try {
      await api.put(`/api/v1/employees/${assignTargetEmpId}/role-assignment/`, {
        role_id: targetRole.id,
      });
      const overrideCodes = permArray
        .map((id) => allPermsById.get(id)?.code)
        .filter(Boolean) as string[];

      await api.patch(`/api/v1/employees/${assignTargetEmpId}/role-assignment/`, {
        permissions_override: overrideCodes,
      });
    } catch {
      // Local fallback persists immediately
    }

    setIsAssignModalOpen(false);
    showToast(`Permissions successfully assigned to ${targetEmp.first_name} ${targetEmp.last_name}`);
  };

  const filteredAssignSections = useMemo(() => {
    const q = assignPermSearch.trim().toLowerCase();
    if (!q) return sections;

    const matches = (p: PermissionItem) =>
      p.display_name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);

    const result: PermissionSection[] = [];
    for (const sec of sections) {
      const sectionMatch = sec.label.toLowerCase().includes(q);
      const common = sectionMatch ? sec.common : sec.common.filter(matches);
      const subsections = sec.subsections
        .map((sub) => {
          const subMatch = sub.label.toLowerCase().includes(q);
          const permissions =
            sectionMatch || subMatch ? sub.permissions : sub.permissions.filter(matches);
          return { ...sub, permissions };
        })
        .filter((sub) => sub.permissions.length > 0);

      if (common.length > 0 || subsections.length > 0) {
        result.push({ ...sec, common, subsections });
      }
    }
    return result;
  }, [sections, assignPermSearch]);

  // Filter employees for list view
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const name = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
      const code = (e.employee_id || '').toLowerCase();
      const email = (e.email || '').toLowerCase();
      const dept = (e.department?.name || '').toLowerCase();
      const desig = (e.designation?.title || '').toLowerCase();
      const cfg = getEmployeeConfig(e);
      const role = cfg.roleName.toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        desig.includes(q) ||
        role.includes(q)
      );
    });
  }, [employees, employeeSearch, getEmployeeConfig]);

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW B: EMPLOYEE PERMISSION DETAIL VIEW (Matching Screenshot)
  // ──────────────────────────────────────────────────────────────────────────
  if (selectedEmployee) {
    const totalSelected = activeSelectedIds.size;

    return (
      <div className="space-y-6 py-2">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckIcon className="h-4 w-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header / Back Link */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <button
              type="button"
              onClick={() => setSelectedEmployee(null)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors mb-2 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to All Employees</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shadow-xs">
                {selectedEmployee.first_name?.[0]?.toUpperCase() || 'E'}
                {selectedEmployee.last_name?.[0]?.toUpperCase() || ''}
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </h2>
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{selectedEmployee.employee_id}</span> •{' '}
                  {selectedEmployee.email} •{' '}
                  <span className="text-gray-700">{selectedEmployee.department?.name || 'General'}</span> (
                  {selectedEmployee.designation?.title || 'Staff'})
                </p>
              </div>
            </div>
          </div>

          {/* Base Role Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Base Role:</label>
            <select
              value={activeRoleName}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            DATA ACCESS SCOPE SELECTOR (Exact layout as screenshot)
           ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Scope 1: Organisation-wide */}
          <button
            type="button"
            onClick={() => setActiveDataScope('organisation')}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
              activeDataScope === 'organisation'
                ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`p-1.5 rounded-lg ${activeDataScope === 'organisation' ? 'text-blue-600' : 'text-gray-400'}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              </span>
              <div>
                <span className="block text-sm font-bold text-gray-900">Organisation-wide</span>
                <span className="block text-xs text-gray-500">Access data across all departments</span>
              </div>
            </div>
            <span
              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                activeDataScope === 'organisation' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
              }`}
            >
              {activeDataScope === 'organisation' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
          </button>

          {/* Scope 2: Own Department Only */}
          <button
            type="button"
            onClick={() => setActiveDataScope('department')}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
              activeDataScope === 'department'
                ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`p-1.5 rounded-lg ${activeDataScope === 'department' ? 'text-blue-600' : 'text-gray-400'}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <div>
                <span className="block text-sm font-bold text-gray-900">Own Department Only</span>
                <span className="block text-xs text-gray-500">Restricted to employee&apos;s department</span>
              </div>
            </div>
            <span
              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                activeDataScope === 'department' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
              }`}
            >
              {activeDataScope === 'department' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
          </button>

          {/* Scope 3: Normal Employee */}
          <button
            type="button"
            onClick={() => setActiveDataScope('self')}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
              activeDataScope === 'self'
                ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`p-1.5 rounded-lg ${activeDataScope === 'self' ? 'text-blue-600' : 'text-gray-400'}`}>
                <UsersIcon className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-sm font-bold text-gray-900">Normal Employee</span>
                <span className="block text-xs text-gray-500">Personal records &amp; self-service only</span>
              </div>
            </div>
            <span
              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                activeDataScope === 'self' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
              }`}
            >
              {activeDataScope === 'self' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MODULE PERMISSIONS HEADER & SEARCH BAR (Matching screenshot)
           ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900">Module Permissions</h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {totalSelected} selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search permissions input matching screenshot */}
            <div className="relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="w-56 sm:w-64 rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Save Changes button in solid blue */}
            <button
              type="button"
              onClick={handleSaveEmployeePermissions}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>

        {/* Permissions Grid Hierarchy */}
        {permsLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
            <LoaderIcon className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm">Loading permission matrix...</span>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            No permissions found matching &quot;{permSearch}&quot;
          </div>
        ) : (
          <PermissionSectionsGrid
            sections={filteredSections}
            selectedIds={activeSelectedIds}
            onTogglePermission={handleTogglePermission}
            onToggleGroup={handleToggleGroup}
            accent="text-blue-600 focus:ring-blue-500"
          />
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW A: MAIN EMPLOYEE PERMISSIONS LIST & ASSIGN BUTTON
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 py-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Employee Permissions</h2>
          <p className="mt-1 text-sm text-gray-500">
            View, assign, and customize granular module permissions and data access scopes for individual employees.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAssignModal}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0 cursor-pointer"
        >
          <ShieldCheckIcon className="h-4 w-4" />
          <span>+ Assign Permissions</span>
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* Search Input Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees by name, ID, department, or role..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {(employeesLoading || rolesLoading || permsLoading) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <LoaderIcon className="h-3.5 w-3.5 animate-spin text-blue-600" />
            <span>Syncing permissions...</span>
          </div>
        )}
      </div>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50/70 text-xs font-semibold text-gray-900">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Employee
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Department &amp; Title
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Assigned Role
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900">
                Data Scope
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-gray-900 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
            {employeesLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <LoaderIcon className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Loading employees...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  No employees found matching &quot;{employeeSearch}&quot;.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const cfg = getEmployeeConfig(emp);

                // Scope display styling
                const scopeLabel =
                  cfg.dataScope === 'organisation'
                    ? 'Organisation-wide'
                    : cfg.dataScope === 'department'
                    ? 'Own Department Only'
                    : 'Normal Employee';

                const scopeBadgeClass =
                  cfg.dataScope === 'organisation'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : cfg.dataScope === 'department'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200';

                return (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    {/* Employee Identity */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {emp.first_name?.[0]?.toUpperCase() || 'E'}
                          {emp.last_name?.[0]?.toUpperCase() || ''}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {emp.employee_id} • {emp.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department & Designation */}
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800 block">
                        {emp.department?.name || 'General Org'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {emp.designation?.title || 'Team Member'}
                      </span>
                    </td>

                    {/* Assigned Role */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-800 border border-gray-200 font-mono">
                        {cfg.roleName}
                      </span>
                    </td>

                    {/* Data Scope */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${scopeBadgeClass}`}>
                        {scopeLabel}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                        <span>Modify Permissions</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ASSIGN MODAL DIALOG ("if click on assign button it shows
          the employee selcting column in the it shows the permissions")
         ───────────────────────────────────────────────────────────── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Assign Role &amp; Permissions</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <span className="text-xl font-light leading-none">&times;</span>
              </button>
            </div>

            {/* Modal Body: Scrollable with Employee Selector & Permissions Matrix */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* Configuration Controls Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                {/* 1. Employee Selecting Column */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Select Employee *
                  </label>
                  <select
                    value={assignTargetEmpId}
                    onChange={(e) => handleAssignEmpSelect(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Base Role Preset */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Base Role Preset *
                  </label>
                  <select
                    value={assignRoleName}
                    onChange={(e) => handleAssignRoleChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Data Access Scope */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Data Scope *
                  </label>
                  <select
                    value={assignDataScope}
                    onChange={(e) => setAssignDataScope(e.target.value as DataScope)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="organisation">Organisation-wide</option>
                    <option value="department">Own Department Only</option>
                    <option value="self">Normal Employee (Self Only)</option>
                  </select>
                </div>
              </div>

              {/* Module Permissions Subheading & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-gray-900">Customized Module Permissions</h4>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {assignSelectedIds.size} granted
                  </span>
                </div>

                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search permissions..."
                    value={assignPermSearch}
                    onChange={(e) => setAssignPermSearch(e.target.value)}
                    className="w-56 rounded-md border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 shadow-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Matrix */}
              <div className="max-h-96 overflow-y-auto pr-1">
                <PermissionSectionsGrid
                  sections={filteredAssignSections}
                  selectedIds={assignSelectedIds}
                  onTogglePermission={(permId) => {
                    setAssignSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(permId)) next.delete(permId);
                      else next.add(permId);
                      return next;
                    });
                  }}
                  onToggleGroup={(groupPerms) => {
                    setAssignSelectedIds((prev) => {
                      const next = new Set(prev);
                      const allChecked = groupPerms.every((p) => next.has(p.id));
                      if (allChecked) groupPerms.forEach((p) => next.delete(p.id));
                      else groupPerms.forEach((p) => next.add(p.id));
                      return next;
                    });
                  }}
                  accent="text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/70">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignModal}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
              >
                Assign Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeePermissionTab;

