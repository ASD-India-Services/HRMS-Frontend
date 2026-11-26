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
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Iconify } from '@/components/Iconify';

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

  // Flattened all permissions map code -> PermissionItem
  const allPermsByCode = useMemo(() => {
    const map = new Map<string, PermissionItem>();
    sections.forEach((sec) => {
      sec.common.forEach((p) => map.set(p.code, p));
      sec.subsections.forEach((sub) => {
        sub.permissions.forEach((p) => map.set(p.code, p));
      });
    });
    return map;
  }, [sections]);

  // 4. Server-synced role assignments for all employees
  const { data: assignmentsData, refetch: refetchAssignments } = useQuery<
    Record<
      string,
      {
        role_id: string;
        role_name: string;
        data_scope: DataScope;
        permissions_override: string[];
      }
    >
  >({
    queryKey: ['employee-role-assignments'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/employees/role-assignments/');
        return res.data || {};
      } catch {
        return {};
      }
    },
    staleTime: 30 * 1000,
  });

  // Overrides map state (stored in localStorage as fallback)
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
      // 1. Check server assignments first
      const serverAssignment = assignmentsData?.[employee.id];
      if (serverAssignment) {
        const role = roles.find(
          (r) => r.id === serverAssignment.role_id || r.name === serverAssignment.role_name
        );
        const rolePermIds = (role?.permissions || []).map((p) => p.id);
        const overridePermIds = (serverAssignment.permissions_override || [])
          .map((code) => allPermsByCode.get(code)?.id)
          .filter(Boolean) as string[];
        const combined = Array.from(new Set([...rolePermIds, ...overridePermIds]));
        return {
          roleId: role?.id || serverAssignment.role_id,
          roleName: serverAssignment.role_name,
          dataScope: serverAssignment.data_scope || role?.data_scope || 'self',
          selectedPermissionIds: combined,
        };
      }

      // 2. Check local storage fallback
      const existing = employeePermsMap[employee.id];
      if (existing) return existing;

      // 3. Guess default role based on designation / title
      const title = (employee.designation?.title || '').toLowerCase();
      let defaultRole = roles.find((r) => r.name === 'employee') || roles[0];

      if (title.includes('head') || title.includes('manager') || title.includes('lead')) {
        const found = roles.find((r) => r.name === 'department_head' || r.name === 'hr_manager');
        if (found) defaultRole = found;
      } else if (title.includes('admin') || title.includes('director')) {
        const found = roles.find((r) => r.name === 'admin' || r.name === 'org_admin');
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
    [assignmentsData, employeePermsMap, roles, allPermsByCode]
  );

  // Filter / Search states for Employee List
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Active view: List view vs Employee Detail View
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Single employee role assignment query from backend
  const { data: selectedEmpAssignment } = useQuery({
    queryKey: ['employee-role-assignment', selectedEmployee?.id],
    queryFn: async () => {
      if (!selectedEmployee) return null;
      try {
        const res = await api.get(`/api/v1/employees/${selectedEmployee.id}/role-assignment/`);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!selectedEmployee,
    staleTime: 10 * 1000,
  });

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

  // When an employee or their server assignment is loaded, initialize the editing state
  useEffect(() => {
    if (selectedEmployee) {
      if (selectedEmpAssignment) {
        const role =
          roles.find(
            (r) => r.id === selectedEmpAssignment.role || r.name === selectedEmpAssignment.role_name
          ) ||
          roles.find((r) => r.name === 'employee') ||
          roles[0];

        setActiveRoleName(selectedEmpAssignment.role_name || role.name);
        setActiveDataScope(selectedEmpAssignment.data_scope || role.data_scope || 'self');

        const rolePermIds = (role.permissions || []).map((p) => p.id);
        const overridePermIds = (selectedEmpAssignment.permissions_override || [])
          .map((code: string) => allPermsByCode.get(code)?.id)
          .filter(Boolean) as string[];

        setActiveSelectedIds(new Set([...rolePermIds, ...overridePermIds]));
      } else {
        const cfg = getEmployeeConfig(selectedEmployee);
        setActiveRoleName(cfg.roleName);
        setActiveDataScope(cfg.dataScope);

        if (cfg.selectedPermissionIds && cfg.selectedPermissionIds.length > 0) {
          setActiveSelectedIds(new Set(cfg.selectedPermissionIds));
        } else {
          const matchingRole = roles.find((r) => r.name === cfg.roleName || r.id === cfg.roleId);
          if (matchingRole && matchingRole.permissions && matchingRole.permissions.length > 0) {
            setActiveSelectedIds(new Set(matchingRole.permissions.map((p) => p.id)));
          } else {
            const defaultViews = Array.from(allPermsById.values())
              .filter((p) => p.code.endsWith('.view'))
              .map((p) => p.id);
            setActiveSelectedIds(new Set(defaultViews.slice(0, 8)));
          }
        }
      }
      setPermSearch('');
    }
  }, [selectedEmployee, selectedEmpAssignment, getEmployeeConfig, roles, allPermsById, allPermsByCode]);

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

    // 1. Update localStorage for offline fallback
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

    // 2. Map selected permission IDs to permission codes
    const selectedCodes = permArray
      .map((id) => allPermsById.get(id)?.code)
      .filter(Boolean) as string[];

    // 3. Save to backend via atomic PUT
    try {
      await api.put(`/api/v1/employees/${selectedEmployee.id}/role-assignment/`, {
        role_id: targetRole.id,
        permissions_override: selectedCodes,
      });

      await queryClient.invalidateQueries({ queryKey: ['employee-role-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-role-assignment', selectedEmployee.id] });
      await queryClient.invalidateQueries({ queryKey: ['hrms-permissions'] });

      showToast(`Permissions updated successfully for ${selectedEmployee.first_name} ${selectedEmployee.last_name}`);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to save employee permissions';
      showToast(`Error: ${errMsg}`);
    } finally {
      setIsSaving(false);
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

    const selectedCodes = permArray
      .map((id) => allPermsById.get(id)?.code)
      .filter(Boolean) as string[];

    // Attempt backend sync via atomic PUT
    try {
      await api.put(`/api/v1/employees/${assignTargetEmpId}/role-assignment/`, {
        role_id: targetRole.id,
        permissions_override: selectedCodes,
      });

      await queryClient.invalidateQueries({ queryKey: ['employee-role-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-role-assignment', assignTargetEmpId] });
      await queryClient.invalidateQueries({ queryKey: ['hrms-permissions'] });

      showToast(`Permissions successfully assigned to ${targetEmp.first_name} ${targetEmp.last_name}`);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to assign permissions';
      showToast(`Error: ${errMsg}`);
    } finally {
      setIsAssignModalOpen(false);
    }
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
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckIcon className="h-4 w-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header / Back Link */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-divider pb-4">
          <div>
            <Button variant="text" size="small" startIcon={<Iconify icon="arrow-left" />} onClick={() => setSelectedEmployee(null)} className="mb-2">
              Back to All Employees
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-lighter text-primary-dark flex items-center justify-center font-bold text-base shadow-xs">
                {selectedEmployee.first_name?.[0]?.toUpperCase() || 'E'}
                {selectedEmployee.last_name?.[0]?.toUpperCase() || ''}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink-primary">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </h2>
                <p className="text-xs text-ink-secondary">
                  <span className="font-semibold text-ink-primary">{selectedEmployee.employee_id}</span> •{' '}
                  {selectedEmployee.email} •{' '}
                  <span className="text-ink-primary">{selectedEmployee.department?.name || 'General'}</span> (
                  {selectedEmployee.designation?.title || 'Staff'})
                </p>
              </div>
            </div>
          </div>

          {/* Base Role Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-secondary whitespace-nowrap">Base Role:</label>
            <Select
              value={activeRoleName}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="font-semibold cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            DATA ACCESS SCOPE SELECTOR (Exact layout as screenshot)
           ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Scope 1: Organisation-wide */}
          <Button
 type="button"
 variant="outlined"
 color={activeDataScope === 'organisation' ? 'primary' : 'inherit'}
 onClick={() => setActiveDataScope('organisation')}
 className={`!h-auto !justify-between !rounded-card !p-4 !text-left !font-normal ${activeDataScope === 'organisation' ? 'bg-primary-main/10' : ''}`}
 >
            <div className="flex items-center gap-2.5">
              <span className={`p-1.5 rounded-lg ${activeDataScope === 'organisation' ? 'text-primary-main' : 'text-ink-disabled'}`}>
                <Iconify icon="branches" />
              </span>
              <div>
                <span className="block text-sm font-bold text-ink-primary">Organisation-wide</span>
                <span className="block text-xs text-ink-secondary">Access data across all departments</span>
              </div>
            </div>
            <span
              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                activeDataScope === 'organisation' ? 'border-primary-main bg-primary-main' : 'border-divider'
              }`}
            >
              {activeDataScope === 'organisation' && <span className="h-1.5 w-1.5 rounded-full bg-surface-paper" />}
            </span>
          </Button>

          {/* Scope 2: Own Department Only */}
          <Button
 type="button"
 variant="outlined"
 color={activeDataScope === 'department' ? 'primary' : 'inherit'}
 onClick={() => setActiveDataScope('department')}
 className={`!h-auto !justify-between !rounded-card !p-4 !text-left !font-normal ${activeDataScope === 'department' ? 'bg-primary-main/10' : ''}`}
 >
            <div className="flex items-center gap-2.5">
              <span className={`p-1.5 rounded-lg ${activeDataScope === 'department' ? 'text-primary-main' : 'text-ink-disabled'}`}>
                <Iconify icon="departments" />
              </span>
              <div>
                <span className="block text-sm font-bold text-ink-primary">Own Department Only</span>
                <span className="block text-xs text-ink-secondary">Restricted to employee&apos;s department</span>
              </div>
            </div>
            <span
              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                activeDataScope === 'department' ? 'border-primary-main bg-primary-main' : 'border-divider'
              }`}
            >
              {activeDataScope === 'department' && <span className="h-1.5 w-1.5 rounded-full bg-surface-paper" />}
            </span>
          </Button>

          {/* Scope 3: Normal Employee */}
          <Button
 type="button"
 variant="outlined"
 color={activeDataScope === 'self' ? 'primary' : 'inherit'}
 onClick={() => setActiveDataScope('self')}
 className={`!h-auto !justify-between !rounded-card !p-4 !text-left !font-normal ${activeDataScope === 'self' ? 'bg-primary-main/10' : ''}`}
 >
            <div className="flex items-center gap-2.5">
              <span className={`p-1.5 rounded-lg ${activeDataScope === 'self' ? 'text-primary-main' : 'text-ink-disabled'}`}>
                <UsersIcon className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-sm font-bold text-ink-primary">Normal Employee</span>
                <span className="block text-xs text-ink-secondary">Personal records &amp; self-service only</span>
              </div>
            </div>
            <span
              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                activeDataScope === 'self' ? 'border-primary-main bg-primary-main' : 'border-divider'
              }`}
            >
              {activeDataScope === 'self' && <span className="h-1.5 w-1.5 rounded-full bg-surface-paper" />}
            </span>
          </Button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MODULE PERMISSIONS HEADER & SEARCH BAR (Matching screenshot)
           ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-ink-primary">Module Permissions</h3>
            <span className="rounded-full bg-primary-lighter px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
              {totalSelected} selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search permissions input matching screenshot */}
            <div className="relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled" />
              <Input
                type="text"
                placeholder="Search permissions..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="w-56 sm:w-64 pl-9 pr-3"
              />
            </div>

            {/* Save Changes button in solid blue */}
            <Button
              type="button"
              onClick={handleSaveEmployeePermissions}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>

        {/* Permissions Grid Hierarchy */}
        {permsLoading ? (
          <div className="flex items-center justify-center py-12 text-ink-secondary gap-2">
            <LoaderIcon className="h-5 w-5 animate-spin text-primary-main" />
            <span className="text-sm">Loading permission matrix...</span>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="rounded-lg border border-divider bg-surface-paper p-8 text-center text-sm text-ink-disabled">
            No permissions found matching &quot;{permSearch}&quot;
          </div>
        ) : (
          <PermissionSectionsGrid
            sections={filteredSections}
            selectedIds={activeSelectedIds}
            onTogglePermission={handleTogglePermission}
            onToggleGroup={handleToggleGroup}
            accent="text-primary-main focus:ring-primary-main"
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
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-success-main px-4 py-2.5 text-sm font-medium text-primary-contrast shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckIcon className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">Employee Permissions</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            View, assign, and customize granular module permissions and data access scopes for individual employees.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleOpenAssignModal}
          className="shrink-0"
        >
          <ShieldCheckIcon className="h-4 w-4" />
          <span>+ Assign Permissions</span>
        </Button>
      </div>

      <hr className="border-divider" />

      {/* Search Input Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled" />
          <Input
            type="text"
            placeholder="Search employees by name, ID, department, or role..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
        {(employeesLoading || rolesLoading || permsLoading) && (
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <LoaderIcon className="h-3.5 w-3.5 animate-spin text-primary-main" />
            <span>Syncing permissions...</span>
          </div>
        )}
      </div>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-xs">
        <table className="min-w-full divide-y divide-divider text-left text-sm">
          <thead className="bg-surface-neutral/70 text-xs font-semibold text-ink-primary">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Employee
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Department &amp; Title
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Assigned Role
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary">
                Data Scope
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-ink-primary text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface-paper text-ink-primary">
            {employeesLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-ink-disabled">
                  <div className="flex items-center justify-center gap-2">
                    <LoaderIcon className="h-4 w-4 animate-spin text-primary-main" />
                    <span>Loading employees...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-ink-disabled">
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
                    ? 'bg-secondary-lighter text-secondary-dark border border-secondary-light'
                    : cfg.dataScope === 'department'
                    ? 'bg-primary-lighter text-primary-dark border border-primary-light'
                    : 'bg-surface-neutral text-ink-primary border border-divider';

                return (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-primary-lighter/40 cursor-pointer transition-colors"
                  >
                    {/* Employee Identity */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-lighter text-primary-dark flex items-center justify-center font-bold text-sm shrink-0">
                          {emp.first_name?.[0]?.toUpperCase() || 'E'}
                          {emp.last_name?.[0]?.toUpperCase() || ''}
                        </div>
                        <div>
                          <span className="font-semibold text-ink-primary block">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="text-xs text-ink-disabled">
                            {emp.employee_id} • {emp.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department & Designation */}
                    <td className="px-6 py-4">
                      <span className="font-medium text-ink-primary block">
                        {emp.department?.name || 'General Org'}
                      </span>
                      <span className="text-xs text-ink-secondary">
                        {emp.designation?.title || 'Team Member'}
                      </span>
                    </td>

                    {/* Assigned Role */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-neutral px-2.5 py-1 text-xs font-semibold text-ink-primary border border-divider font-mono">
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
                      <Button size="small"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                        }}
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                        <span>Modify Permissions</span>
                      </Button>
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
        <Modal open onClose={() => setIsAssignModalOpen(false)} labelledBy="EmployeePermissionTab-modal-title-1" size="lg" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-surface-neutral/70">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-primary-main" />
                <h3 id="EmployeePermissionTab-modal-title-1" className="text-lg font-semibold text-ink-primary">Assign Role &amp; Permissions</h3>
              </div>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setIsAssignModalOpen(false)} />
            </div>

            {/* Modal Body: Scrollable with Employee Selector & Permissions Matrix */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* Configuration Controls Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-divider bg-surface-neutral/50 p-4">
                {/* 1. Employee Selecting Column */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-1.5">
                    Select Employee *
                  </label>
                  <Select
                    value={assignTargetEmpId}
                    onChange={(e) => handleAssignEmpSelect(e.target.value)}
                    className="cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </option>
                    ))}
                  </Select>
                </div>

                {/* 2. Base Role Preset */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-1.5">
                    Base Role Preset *
                  </label>
                  <Select
                    value={assignRoleName}
                    onChange={(e) => handleAssignRoleChange(e.target.value)}
                    className="cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* 3. Data Access Scope */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-1.5">
                    Data Scope *
                  </label>
                  <Select
                    value={assignDataScope}
                    onChange={(e) => setAssignDataScope(e.target.value as DataScope)}
                    className="cursor-pointer"
                  >
                    <option value="organisation">Organisation-wide</option>
                    <option value="department">Own Department Only</option>
                    <option value="self">Normal Employee (Self Only)</option>
                  </Select>
                </div>
              </div>

              {/* Module Permissions Subheading & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-divider">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-ink-primary">Customized Module Permissions</h4>
                  <span className="rounded-full bg-primary-lighter px-2 py-0.5 text-xs font-semibold text-primary-dark">
                    {assignSelectedIds.size} granted
                  </span>
                </div>

                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-disabled" />
                  <Input
                    type="text"
                    placeholder="Search permissions..."
                    value={assignPermSearch}
                    onChange={(e) => setAssignPermSearch(e.target.value)}
                    className="w-56 pl-8 pr-3"
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
                  accent="text-primary-main focus:ring-primary-main"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-divider bg-surface-neutral/70">
              <Button variant="outlined" color="inherit"
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveAssignModal}
              >
                Assign Permissions
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default EmployeePermissionTab;

