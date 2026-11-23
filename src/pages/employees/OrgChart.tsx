import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface OrgEmployeeNode {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string;
  profile_picture: string | null;
  status: string;
  department: { id: string; name: string } | null;
  designation: { id: string; name?: string; title?: string } | null;
  reporting_manager_id: string | null;
  direct_reports_count: number;
  children: OrgEmployeeNode[];
}

interface DeptNode {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  head: {
    id: string;
    employee_id: string;
    name: string;
    email: string;
    designation?: string;
  } | null;
  employee_count: number;
  employees?: OrgEmployeeNode[];
  children: DeptNode[];
}

interface OrgChartResponse {
  reporting_tree: OrgEmployeeNode[];
  departments_tree: DeptNode[];
  unassigned: OrgEmployeeNode[];
  total_employees: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-primary-main',
  'bg-secondary-main',
  'bg-secondary-main',
  'bg-success-main',
  'bg-success-main',
  'bg-error-main',
  'bg-warning-main',
];

function getInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getDesignation(emp?: { designation?: { name?: string; title?: string } | string | null } | null): string {
  if (!emp || !emp.designation) return 'No Designation';
  if (typeof emp.designation === 'string') return emp.designation;
  return emp.designation.name || emp.designation.title || 'No Designation';
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function OrgChart() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlEmployeeId = searchParams.get('employee');

  const [viewMode, setViewMode] = useState<'reporting' | 'departments'>('reporting');
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [focusedEmployeeId, setFocusedEmployeeId] = useState<string | null>(urlEmployeeId || null);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<OrgEmployeeNode | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DeptNode | null>(null);
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(new Set());
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showUnassignedDrawer, setShowUnassignedDrawer] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state with URL parameter if present
  useEffect(() => {
    if (urlEmployeeId) {
      setFocusedEmployeeId(urlEmployeeId);
    }
  }, [urlEmployeeId]);

  // ─── Query Hierarchy Data ─────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery<OrgChartResponse>({
    queryKey: ['org-chart-data'],
    queryFn: async () => {
      const res = await api.get('/api/v1/employees/org-chart/');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const reportingTree = data?.reporting_tree || [];
  const departmentsTree = data?.departments_tree || [];
  const unassigned = data?.unassigned || [];
  const totalEmployees = data?.total_employees || 0;

  // ─── Flat Employee List for Quick Select Dropdown (Deduplicated by ID) ──
  const allEmployees = useMemo(() => {
    const map = new Map<string, OrgEmployeeNode>();
    const traverse = (nodes: OrgEmployeeNode[]) => {
      for (const n of nodes) {
        if (!map.has(n.id)) {
          map.set(n.id, n);
        }
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      }
    };
    traverse(reportingTree);
    unassigned.forEach((u) => {
      if (!map.has(u.id)) {
        map.set(u.id, u);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportingTree, unassigned]);

  // Filtered employees for the Employee Picker Modal
  const filteredPickerEmployees = useMemo(() => {
    if (!pickerSearch.trim()) return allEmployees;
    const query = pickerSearch.toLowerCase();
    return allEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.employee_id.toLowerCase().includes(query) ||
        getDesignation(emp).toLowerCase().includes(query) ||
        (emp.department?.name && emp.department.name.toLowerCase().includes(query))
    );
  }, [allEmployees, pickerSearch]);

  // ─── Find Focused Employee & Ancestor Path ────────────────────────────────
  const { focusedNode, ancestors } = useMemo(() => {
    if (!focusedEmployeeId) {
      return { focusedNode: null, ancestors: [] as OrgEmployeeNode[] };
    }

    const path: OrgEmployeeNode[] = [];
    let target: OrgEmployeeNode | null = null;

    const dfs = (node: OrgEmployeeNode, currentPath: OrgEmployeeNode[]): boolean => {
      if (node.id === focusedEmployeeId) {
        target = node;
        path.push(...currentPath);
        return true;
      }
      for (const child of node.children || []) {
        if (dfs(child, [...currentPath, node])) {
          return true;
        }
      }
      return false;
    };

    for (const root of reportingTree) {
      if (dfs(root, [])) break;
    }

    if (!target) {
      target = unassigned.find((u) => u.id === focusedEmployeeId) || null;
    }

    return { focusedNode: target, ancestors: path };
  }, [focusedEmployeeId, reportingTree, unassigned]);

  // ─── Fast Map of Employees by ID ─────────────────────────────────────────
  const employeeMap = useMemo(() => {
    const map = new Map<string, OrgEmployeeNode>();
    for (const emp of allEmployees) {
      map.set(emp.id, emp);
    }
    return map;
  }, [allEmployees]);

  // ─── Search-Filtered Tree: Shows ONLY Searched Employee & Their Reporter ───
  const searchedReportingRoots = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed || viewMode !== 'reporting') return null;
    const query = trimmed.toLowerCase();

    // 1. Prioritize employee name (first name, last name, full name) and employee_id
    const nameMatches = allEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.employee_id.toLowerCase().includes(query)
    );

    const matches = nameMatches.length > 0
      ? nameMatches
      : allEmployees.filter(
          (emp) => getDesignation(emp).toLowerCase().includes(query)
        );

    if (matches.length === 0) return [];

    // Sort matches: exact name match first, then starts-with, then alphabetical
    matches.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aName === query) return -1;
      if (bName === query) return 1;
      if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
      if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
      return aName.localeCompare(bName);
    });

    // Build the mini-tree: strictly Reporter ─── Searched Employee
    const roots: OrgEmployeeNode[] = [];
    const seenMatchIds = new Set<string>();

    for (const match of matches) {
      if (seenMatchIds.has(match.id)) continue;
      seenMatchIds.add(match.id);

      const searchedNode: OrgEmployeeNode = {
        ...match,
        children: [],
      };

      const manager = match.reporting_manager_id ? employeeMap.get(match.reporting_manager_id) : null;

      if (manager) {
        roots.push({
          ...manager,
          children: [searchedNode],
        });
      } else {
        roots.push(searchedNode);
      }
    }

    return roots;
  }, [search, viewMode, allEmployees, employeeMap]);

  // Roots to render on canvas: either search results, focused sub-tree, or the entire company
  const activeReportingRoots = useMemo(() => {
    if (searchedReportingRoots !== null) {
      return searchedReportingRoots;
    }
    if (focusedNode) {
      return [focusedNode];
    }
    return reportingTree;
  }, [searchedReportingRoots, focusedNode, reportingTree]);

  // Extract unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    const scan = (nodes: OrgEmployeeNode[]) => {
      for (const n of nodes) {
        if (n.department?.name) set.add(n.department.name);
        if (n.children?.length) scan(n.children);
      }
    };
    scan(reportingTree);
    for (const u of unassigned) {
      if (u.department?.name) set.add(u.department.name);
    }
    return Array.from(set).sort();
  }, [reportingTree, unassigned]);

  // Auto-reset pan/zoom when search changes
  useEffect(() => {
    if (search.trim()) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [search]);

  // ─── Focus on a specific employee ─────────────────────────────────────────
  const handleFocusEmployee = (id: string | null) => {
    setFocusedEmployeeId(id);
    if (id) {
      setSearchParams({ employee: id });
    } else {
      setSearchParams({});
    }
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // ─── Toggle Collapse / Expand ─────────────────────────────────────────────
  const toggleCollapse = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ─── Toggle Department Employee Expansion ─────────────────────────────
  const toggleDeptExpand = (deptId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    const allManagerIds = new Set<string>();
    const collect = (nodes: OrgEmployeeNode[]) => {
      for (const n of nodes) {
        if (n.children && n.children.length > 0) {
          allManagerIds.add(n.id);
          collect(n.children);
        }
      }
    };
    collect(activeReportingRoots);
    setCollapsedIds(allManagerIds);
  };

  // ─── Canvas Pan & Drag ────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.org-card, button, a, input, select')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 1.8));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.45));

  // ─── Recursive Employee Tree Node ─────────────────────────────────────────
  const renderEmployeeNode = (node: OrgEmployeeNode, keyPrefix = 'node') => {
    const isCollapsed = collapsedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isFocusedRoot = focusedNode?.id === node.id;
    const isLeader = (node.direct_reports_count > 0) || isFocusedRoot || !node.reporting_manager_id;
    const isSelected = selectedEmployee?.id === node.id;

    const isMatchesSearch =
      search.trim() &&
      (node.name.toLowerCase().includes(search.toLowerCase()) ||
        node.employee_id.toLowerCase().includes(search.toLowerCase()) ||
        getDesignation(node).toLowerCase().includes(search.toLowerCase()));

    const isDeptMatched = selectedDept === 'all' || node.department?.name === selectedDept;

    const cardElement = (
      <div
        onClick={() => setSelectedEmployee(node)}
        className={`org-card group relative w-48 sm:w-52 cursor-pointer rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 border-2 shrink-0 ${isSelected
          ? 'ring-4 ring-warning-light bg-warning-lighter border-warning-main shadow-md'
          : isFocusedRoot
            ? 'ring-2 ring-error-main border-error-main'
            : isMatchesSearch
              ? 'ring-2 ring-warning-main border-warning-main'
              : isLeader
                ? 'border-error-main hover:border-error-dark'
                : isDeptMatched
                  ? 'border-info-dark hover:border-info-darker'
                  : 'border-divider opacity-40 hover:opacity-100'
          }`}
      >
        {/* Top Banner: Employee Name */}
        <div className={`px-2.5 py-1.5 text-center ${isLeader ? 'bg-error-main' : 'bg-info-dark'}`}>
          <h4 className="text-xs sm:text-sm font-bold text-primary-contrast truncate leading-snug tracking-tight">
            {node.name}
          </h4>
        </div>

        {/* Bottom Section: Designation */}
        <div className="bg-surface-paper px-2.5 py-1.5 text-center border-t border-divider">
          <p className="text-[11px] sm:text-xs text-ink-primary font-medium truncate leading-snug" title={getDesignation(node)}>
            {getDesignation(node)}
          </p>
        </div>
      </div>
    );

    // ─── Horizontal (Left-to-Right) Tree Layout ───
    if (orientation === 'horizontal') {
      return (
        <div key={`${keyPrefix}-${node.id}`} className="flex flex-row items-center">
          {cardElement}

          {/* Expand / Collapse Button if has reports */}
          {hasChildren && (
            <IconButton
              icon={isCollapsed ? 'plus' : 'minus'}
              size="small"
              variant="soft"
              color="error"
              onClick={(e) => toggleCollapse(node.id, e)}
              className="relative z-10 -ml-2.5 !h-5 !w-5 bg-surface-paper shadow-z1"
              aria-label={isCollapsed ? 'Expand Direct Reports' : 'Collapse Direct Reports'}
              title={isCollapsed ? 'Expand Direct Reports' : 'Collapse Direct Reports'}
            />
          )}

          {/* Children Sub-tree with Connectors (Horizontal L-to-R) */}
          {hasChildren && !isCollapsed && (
            <div className="flex flex-row items-center">
              {/* Red Stem leading right from parent */}
              <div className="w-10 h-0.5 bg-error-light shrink-0"></div>

              {/* Children stacked vertically */}
              <div className="flex flex-col justify-center">
                {node.children.map((child, index) => {
                  const isOnly = node.children.length === 1;
                  const isFirst = index === 0;
                  const isLast = index === node.children.length - 1;

                  return (
                    <div key={child.id} className="relative flex items-center py-2.5">
                      {/* Vertical red spine connector */}
                      {!isOnly && (
                        <div
                          className={`absolute left-0 w-0.5 bg-error-light ${isFirst
                            ? 'top-1/2 bottom-0'
                            : isLast
                              ? 'top-0 bottom-1/2'
                              : 'top-0 bottom-0'
                            }`}
                        />
                      )}

                      {/* Horizontal red branch line into child */}
                      <div className="w-10 h-0.5 bg-error-light shrink-0"></div>

                      {/* Render child node */}
                      {renderEmployeeNode(child, `${keyPrefix}-${node.id}-${index}`)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ─── Vertical (Top-to-Bottom) Tree Layout ───
    return (
      <div key={`${keyPrefix}-${node.id}`} className="flex flex-col items-center">
        {cardElement}

        {/* Expand / Collapse Button if has reports */}
        {hasChildren && (
          <div className="relative z-10 -mt-2">
            <IconButton
              icon={isCollapsed ? 'plus' : 'minus'}
              size="small"
              variant="soft"
              color="error"
              onClick={(e) => toggleCollapse(node.id, e)}
              className="!h-6 !w-6 bg-surface-paper shadow-z1"
              aria-label={isCollapsed ? 'Expand Direct Reports' : 'Collapse Direct Reports'}
              title={isCollapsed ? 'Expand Direct Reports' : 'Collapse Direct Reports'}
            />
          </div>
        )}

        {/* Children Sub-tree with Connectors */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center">
            {/* Vertical connector down from parent */}
            <div className="h-6 w-0.5 bg-error-light"></div>

            {/* Children container with connecting lines */}
            <div className="flex items-start justify-center pt-0">
              {node.children.map((child, index) => {
                const isOnly = node.children.length === 1;
                const isFirst = index === 0;
                const isLast = index === node.children.length - 1;

                return (
                  <div key={child.id} className="relative flex flex-col items-center px-4">
                    {/* Horizontal connector line across children */}
                    {!isOnly && (
                      <div
                        className={`absolute top-0 h-0.5 bg-error-light ${isFirst
                          ? 'left-1/2 right-0'
                          : isLast
                            ? 'left-0 right-1/2'
                            : 'left-0 right-0'
                          }`}
                      />
                    )}

                    {/* Vertical connector line down into child card */}
                    <div className="h-6 w-0.5 bg-error-light"></div>

                    {/* Render child node */}
                    {renderEmployeeNode(child, `${keyPrefix}-${node.id}-${index}`)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Recursive Department Tree Node ───────────────────────────────────────
  const renderDepartmentNode = (dept: DeptNode) => {
    const isDeptExpanded = expandedDeptIds.has(dept.id);
    const isSelected = selectedDepartment?.id === dept.id;
    const hasSubDepts = dept.children && dept.children.length > 0;
    const deptEmployees = dept.employees || [];
    const hasEmployees = deptEmployees.length > 0;
    const shouldShowEmployees = isDeptExpanded && hasEmployees;

    // Combined child items to branch under this department:
    // 1. Sub-departments (always if present)
    // 2. Department employees (if expanded by clicking)
    type DeptChildItem =
      | { type: 'dept'; data: DeptNode }
      | { type: 'emp'; data: OrgEmployeeNode };

    const childItems: DeptChildItem[] = [
      ...(hasSubDepts ? dept.children.map((c) => ({ type: 'dept' as const, data: c })) : []),
      ...(shouldShowEmployees ? deptEmployees.map((e) => ({ type: 'emp' as const, data: e })) : []),
    ];

    const hasAnyChildren = childItems.length > 0;

    const cardElement = (
      <div
        onClick={() => {
          setSelectedDepartment(dept);
          toggleDeptExpand(dept.id);
        }}
        className={`org-card group relative w-48 sm:w-52 cursor-pointer rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 border-2 shrink-0 ${isSelected
          ? 'ring-4 ring-warning-light bg-warning-lighter border-warning-main'
          : isDeptExpanded
            ? 'border-error-main ring-2 ring-error-light'
            : 'border-info-dark hover:border-info-darker'
          }`}
      >
        <div className={`px-2.5 py-1.5 text-center ${isDeptExpanded ? 'bg-error-main' : 'bg-info-dark'}`}>
          <h4 className="text-xs sm:text-sm font-bold text-primary-contrast truncate leading-snug">
            {dept.name}
          </h4>
        </div>
        <div className="bg-surface-paper px-2.5 py-1.5 text-center border-t border-divider flex flex-col items-center">
          <p className="text-[11px] sm:text-xs text-ink-primary font-medium truncate leading-snug w-full" title={dept.head ? `${dept.head.name} (${dept.head.designation || 'Head'})` : dept.name}>
            {dept.head ? dept.head.name : dept.name}
          </p>
          <p className="text-[10px] text-ink-secondary font-normal truncate leading-snug w-full">
            {dept.head?.designation || (dept.head ? 'Department Head' : 'Department')}
          </p>
          <Button
            size="small"
            variant="soft"
            color={isDeptExpanded ? 'error' : 'inherit'}
            onClick={(e) => {
              e.stopPropagation();
              toggleDeptExpand(dept.id);
            }}
            className="mt-1.5 !h-6 !rounded-full !px-2.5 !text-[10px]"
            startIcon={<Iconify icon="employees" />}
            endIcon={<Iconify icon={isDeptExpanded ? 'chevron-up' : 'chevron-down'} />}
          >
            <span>{dept.employee_count} {dept.employee_count === 1 ? 'Member' : 'Members'}</span>
            <span>{isDeptExpanded ? 'Hide' : 'View Employees'}</span>
          </Button>
        </div>
      </div>
    );

    // Horizontal layout
    if (orientation === 'horizontal') {
      return (
        <div key={dept.id} className="flex flex-row items-center">
          {cardElement}

          {hasAnyChildren && (
            <div className="flex flex-row items-center">
              <div className="w-10 h-0.5 bg-error-light shrink-0"></div>
              <div className="flex flex-col justify-center">
                {childItems.map((item, index) => {
                  const isOnly = childItems.length === 1;
                  const isFirst = index === 0;
                  const isLast = index === childItems.length - 1;

                  return (
                    <div
                      key={item.type === 'dept' ? `dept-${item.data.id}` : `emp-${item.data.id}`}
                      className="relative flex items-center py-2.5"
                    >
                      {!isOnly && (
                        <div
                          className={`absolute left-0 w-0.5 bg-error-light ${isFirst
                            ? 'top-1/2 bottom-0'
                            : isLast
                              ? 'top-0 bottom-1/2'
                              : 'top-0 bottom-0'
                            }`}
                        />
                      )}
                      <div className="w-10 h-0.5 bg-error-light shrink-0"></div>
                      {item.type === 'dept'
                        ? renderDepartmentNode(item.data)
                        : renderEmployeeNode(item.data)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Vertical layout
    return (
      <div key={dept.id} className="flex flex-col items-center">
        {cardElement}

        {/* Children sub-departments and expanded employees */}
        {hasAnyChildren && (
          <div className="flex flex-col items-center">
            <div className="h-6 w-0.5 bg-error-light"></div>
            <div className="flex items-start justify-center">
              {childItems.map((item, index) => {
                const isOnly = childItems.length === 1;
                const isFirst = index === 0;
                const isLast = index === childItems.length - 1;

                return (
                  <div
                    key={item.type === 'dept' ? `dept-${item.data.id}` : `emp-${item.data.id}`}
                    className="relative flex flex-col items-center px-4"
                  >
                    {!isOnly && (
                      <div
                        className={`absolute top-0 h-0.5 bg-error-light ${isFirst
                          ? 'left-1/2 right-0'
                          : isLast
                            ? 'left-0 right-1/2'
                            : 'left-0 right-0'
                          }`}
                      />
                    )}
                    <div className="h-6 w-0.5 bg-error-light"></div>
                    {item.type === 'dept'
                      ? renderDepartmentNode(item.data)
                      : renderEmployeeNode(item.data)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageContainer className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      {/* ─── Header: title, view switcher, orientation ────────────────────── */}
      <PageHeader
        className="!mb-0"
        title="Organization Chart"
        actions={
          <>
            {/* Mode Switcher */}
            <div className="inline-flex gap-1 rounded bg-grey-500/10 p-1">
              <Button
                size="small"
                variant={viewMode === 'reporting' ? 'soft' : 'text'}
                color={viewMode === 'reporting' ? 'primary' : 'inherit'}
                onClick={() => setViewMode('reporting')}
              >
                Reporting Tree
              </Button>
              <Button
                size="small"
                variant={viewMode === 'departments' ? 'soft' : 'text'}
                color={viewMode === 'departments' ? 'primary' : 'inherit'}
                onClick={() => setViewMode('departments')}
              >
                Department View
              </Button>
            </div>

            {/* Rotate Tree Orientation */}
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                setOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
                setPan({ x: 0, y: 0 });
              }}
              title="Rotate between Horizontal (Left-to-Right) and Vertical (Top-to-Bottom)"
              startIcon={
                <Iconify
                  icon="refresh"
                  className={`transition-transform duration-300 ${orientation === 'horizontal' ? 'rotate-90' : ''}`}
                />
              }
            >
              {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
            </Button>
          </>
        }
      />

      {/* ─── Toolbar: search, filters & zoom controls ───────────────────── */}
      <Card className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {/* Select Employee to Focus Dropdown */}
          {viewMode === 'reporting' && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="focus-employee-select" className="whitespace-nowrap text-xs font-semibold text-ink-primary">
                Employee:
              </label>
              <Select selectSize="small"
                id="focus-employee-select"
                value={focusedEmployeeId || 'all'}
                onChange={(e) => handleFocusEmployee(e.target.value === 'all' ? null : e.target.value)} className="max-w-[200px]">
                <option value="all">Entire Company</option>
                <optgroup label="Select Employee (View Hierarchy Under Them)">
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({getDesignation(emp)}{emp.direct_reports_count > 0 ? ` • ${emp.direct_reports_count} reports` : ''})
                    </option>
                  ))}
                </optgroup>
              </Select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative min-w-[160px] max-w-[220px]">
            <Iconify icon="search" width={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-disabled" />
            <Input
              inputSize="small"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, designation..."
              aria-label="Search organization chart"
              className="pl-8 pr-8"
            />
            {search && (
              <IconButton
                icon="close"
                size="small"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 !h-6 !w-6"
              />
            )}
          </div>

          {/* Department Filter (Only for Reporting view) */}
          {viewMode === 'reporting' && (
            <Select selectSize="small"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Filter by department" className="max-w-[170px]">
              <option value="all">All Departments</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Minimal Zoom Controls */}
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton icon="minus" size="small" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out" />
          <IconButton icon="plus" size="small" onClick={handleZoomIn} aria-label="Zoom in" title="Zoom in" />
        </div>
      </Card>

      {/* ─── Focused Sub-Tree Breadcrumb Bar ─────────────────────────────── */}
      {focusedNode && viewMode === 'reporting' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-secondary-lighter px-5 py-3">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="mr-1 flex items-center gap-1.5 font-semibold text-secondary-darker">
              <Iconify icon="orgChart" width={18} className="text-secondary-main" />
              Hierarchy Under:
            </span>

            <Button variant="text" color="secondary" size="small" onClick={() => handleFocusEmployee(null)}>
              Entire Company
            </Button>

            {ancestors.map((anc) => (
              <React.Fragment key={anc.id}>
                <Iconify icon="arrow-right" width={14} className="text-secondary-main" />
                <Button variant="text" color="secondary" size="small" onClick={() => handleFocusEmployee(anc.id)}>
                  {anc.name}
                </Button>
              </React.Fragment>
            ))}

            <Iconify icon="arrow-right" width={14} className="text-secondary-main" />
            <span className="rounded bg-surface-paper px-2.5 py-0.5 font-bold text-secondary-darker shadow-z1">
              {focusedNode.name} ({focusedNode.direct_reports_count} direct {focusedNode.direct_reports_count === 1 ? 'report' : 'reports'})
            </span>
          </div>

          <Button variant="outlined" color="secondary" size="small" onClick={() => handleFocusEmployee(null)} startIcon={<Iconify icon="close" />}>
            View Full Company Chart
          </Button>
        </div>
      )}

      {/* ─── Unassigned Staff Notice Bar ─────────────────────────────────── */}
      {unassigned.length > 0 && viewMode === 'reporting' && !focusedNode && (
        <div className="flex items-center justify-between rounded-card bg-warning-lighter px-4 py-2.5 text-xs text-warning-dark">
          <div className="flex items-center gap-2">
            <Iconify icon="warning" width={18} className="shrink-0 text-warning-main" />
            <span>
              <strong>{unassigned.length}</strong> active employee{unassigned.length !== 1 ? 's do' : ' does'} not have an assigned reporting manager.
            </span>
          </div>
          <Button variant="text" color="warning" size="small" onClick={() => setShowUnassignedDrawer(true)} endIcon={<Iconify icon="arrow-right" />}>
            View Unassigned Staff
          </Button>
        </div>
      )}

      {/* ─── Search Active Notice Bar ─────────────────────────────────────── */}
      {search.trim() && viewMode === 'reporting' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-warning-lighter px-4 py-2 text-xs text-warning-darker">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-warning-dark">
              <Iconify icon="search" width={16} /> Search Active:
            </span>
            <span>
              Showing only searched employee and their reporter. Delete letters in search bar to show the full company chart.
            </span>
          </div>
          <Button variant="outlined" color="warning" size="small" onClick={() => setSearch('')} startIcon={<Iconify icon="close" />}>
            Show Full Company Chart
          </Button>
        </div>
      )}

      {/* ─── Interactive Tree Canvas ─────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative h-[720px] w-full overflow-hidden rounded-card bg-error-lighter/20 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
      >
        {/* Background Grid Pattern (Matching pink graph paper grid from screenshot) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(var(--error-main) / 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(var(--error-main) / 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-paper/70 backdrop-blur-xs z-20">
            <Iconify icon="refresh" width={32} className="animate-spin text-primary-main" />
            <span className="mt-3 text-xs font-semibold text-ink-secondary">Building organization tree...</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <p className="text-sm font-semibold text-error-main">Failed to load organization hierarchy.</p>
            <Button className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty Tree State */}
        {!isLoading && !isError && activeReportingRoots.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-grey-500/10 text-ink-disabled">
              <Iconify icon="employees" width={28} />
            </div>
            <h3 className="text-base font-bold text-ink-primary">No Hierarchy Available</h3>
            <p className="mt-1 text-xs text-ink-secondary max-w-sm">
              {focusedNode
                ? `No direct or indirect reporting employees found under ${focusedNode.name}.`
                : 'Add active employees and assign reporting managers in the Employees module.'}
            </p>
            {focusedNode ? (
              <Button className="mt-4" onClick={() => handleFocusEmployee(null)} startIcon={<Iconify icon="arrow-left" />}>
                View Full Company Chart
              </Button>
            ) : (
              <ButtonLink to="/employees/new" className="mt-4" startIcon={<Iconify icon="plus" />}>
                Add First Employee
              </ButtonLink>
            )}
          </div>
        )}

        {/* Tree Render Container (Scaled & Translated) */}
        {!isLoading && (
          <div
            className={`absolute inset-0 flex transition-transform duration-75 ${orientation === 'horizontal'
              ? 'items-start justify-start p-8 sm:p-12 origin-top-left'
              : 'items-start justify-center p-8 sm:p-12 origin-top'
              }`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {viewMode === 'reporting' ? (
              <div
                className={
                  orientation === 'horizontal'
                    ? 'flex flex-col items-start justify-center gap-12'
                    : 'flex items-start justify-center gap-16 pt-8'
                }
              >
                {activeReportingRoots.map((root, index) =>
                  renderEmployeeNode(root, `root-${search.trim() ? 's' : 'all'}-${index}`)
                )}
              </div>
            ) : (
              <div
                className={
                  orientation === 'horizontal'
                    ? 'flex flex-col items-start justify-center gap-12'
                    : 'flex items-start justify-center gap-16 pt-8'
                }
              >
                {departmentsTree.map((deptRoot) => renderDepartmentNode(deptRoot))}
              </div>
            )}
          </div>
        )}

        {/* Floating Canvas Navigation Hints */}
        <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-lg bg-surface-paper/90 px-3 py-1.5 text-[11px] text-ink-secondary shadow-z8 backdrop-blur-xs">
          <Iconify icon="info" width={14} />
          <span>Click & Drag canvas to pan</span>
          <span>•</span>
          <span>Zoom +/-</span>
          <span>•</span>
          <span>Click Focus to view anyone's team</span>
        </div>
      </div>

      {/* ─── Employee Detail Slide-over Drawer ────────────────────────────── */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-grey-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-surface-paper shadow-dialog h-full flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-divider px-6 py-4 bg-surface-neutral">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Employee Profile Summary
              </span>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setSelectedEmployee(null)} />
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Card */}
              <div className="flex items-center gap-4">
                {selectedEmployee.profile_picture ? (
                  <img
                    src={selectedEmployee.profile_picture}
                    alt={selectedEmployee.name}
                    className="h-16 w-16 rounded-full object-cover ring-4 ring-grey-100"
                  />
                ) : (
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-base font-bold text-primary-contrast shadow-md ${getInitialsColor(
                      selectedEmployee.name
                    )}`}
                  >
                    {getInitials(selectedEmployee.name)}
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-ink-primary">{selectedEmployee.name}</h3>
                  <p className="text-xs font-semibold text-primary-main mt-0.5">
                    {getDesignation(selectedEmployee)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-xs bg-surface-neutral text-ink-secondary px-2 py-0.5 rounded">
                      {selectedEmployee.employee_id}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-success-lighter px-2 py-0.5 text-[11px] font-semibold text-success-dark">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Focus Chart on this Employee */}
              {selectedEmployee.direct_reports_count > 0 && (
                <Button
                  variant="soft"
                  color="secondary"
                  className="w-full"
                  onClick={() => {
                    handleFocusEmployee(selectedEmployee.id);
                    setSelectedEmployee(null);
                  }}
                  startIcon={<Iconify icon="orgChart" />}
                >
                  Focus Chart on {selectedEmployee.name}'s Team ({selectedEmployee.direct_reports_count} Reports)
                </Button>
              )}

              {/* Contact & Designation Info */}
              <div className="space-y-3 rounded-card bg-surface-neutral p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-secondary">Designation:</span>
                  <strong className="text-ink-primary">{getDesignation(selectedEmployee)}</strong>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-secondary">Department:</span>
                  <strong className="text-ink-primary">{selectedEmployee.department?.name || '—'}</strong>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-secondary">Email:</span>
                  <a
                    href={`mailto:${selectedEmployee.email}`}
                    className="font-medium text-primary-main hover:underline truncate max-w-[200px]"
                  >
                    {selectedEmployee.email}
                  </a>
                </div>

                {selectedEmployee.phone && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-secondary">Phone:</span>
                    <a
                      href={`tel:${selectedEmployee.phone}`}
                      className="font-medium text-primary-main hover:underline"
                    >
                      {selectedEmployee.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Direct Reports List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2">
                  Direct Reports ({selectedEmployee.direct_reports_count})
                </h4>

                {selectedEmployee.children && selectedEmployee.children.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEmployee.children.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedEmployee(sub)}
                        className="flex cursor-pointer items-center justify-between rounded-lg bg-surface-neutral p-2.5 transition-colors hover:bg-grey-500/10"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-primary-contrast ${getInitialsColor(
                              sub.name
                            )}`}
                          >
                            {getInitials(sub.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink-primary truncate">{sub.name}</p>
                            <p className="text-[11px] text-ink-secondary truncate">
                              {getDesignation(sub)}
                            </p>
                          </div>
                        </div>
                        <Iconify icon="arrow-right" width={16} className="text-primary-main" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-ink-disabled">No direct reports assigned.</p>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-divider p-4 bg-surface-neutral flex items-center justify-between">
              <Button variant="outlined" color="inherit" onClick={() => setSelectedEmployee(null)}>
                Close
              </Button>
              <ButtonLink to={`/employees/${selectedEmployee.id}`} endIcon={<Iconify icon="arrow-right" />}>
                View Full Profile
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {/* ─── Unassigned Staff Drawer ─────────────────────────────────────── */}
      {showUnassignedDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-grey-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-surface-paper shadow-dialog h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-divider px-6 py-4 bg-warning-lighter">
              <div>
                <h3 className="text-sm font-bold text-warning-darker">Unassigned Staff ({unassigned.length})</h3>
                <p className="text-xs text-warning-dark mt-0.5">
                  Employees without a designated reporting manager.
                </p>
              </div>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setShowUnassignedDrawer(false)} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {unassigned.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between rounded-lg bg-surface-neutral p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-primary-contrast ${getInitialsColor(
                        emp.name
                      )}`}
                    >
                      {getInitials(emp.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink-primary truncate">{emp.name}</p>
                      <p className="text-[11px] text-ink-secondary truncate">
                        {getDesignation(emp)} • {emp.department?.name || 'No Department'}
                      </p>
                    </div>
                  </div>
                  <ButtonLink to={`/employees/${emp.id}/edit`} variant="soft" color="inherit" size="small">
                    Assign Manager
                  </ButtonLink>
                </div>
              ))}
            </div>

            <div className="border-t border-divider p-4 bg-surface-neutral">
              <Button variant="outlined" color="inherit" className="w-full" onClick={() => setShowUnassignedDrawer(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Department Detail Slide-over Drawer (Shows Employees) ──────── */}
      {selectedDepartment && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-grey-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-surface-paper shadow-dialog h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-divider px-6 py-4 bg-surface-neutral">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary-lighter text-primary-dark">
                    <Iconify icon="departments" width={16} />
                  </span>
                  <h3 className="text-base font-bold text-ink-primary">{selectedDepartment.name} Department</h3>
                </div>
                <p className="text-xs text-ink-secondary mt-1">
                  {selectedDepartment.employee_count} {selectedDepartment.employee_count === 1 ? 'Employee' : 'Employees'}
                  {selectedDepartment.head ? ` • Head: ${selectedDepartment.head.name}` : ''}
                </p>
              </div>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setSelectedDepartment(null)} />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedDepartment.description && (
                <div className="rounded-card bg-surface-neutral p-3 text-xs text-ink-secondary">
                  {selectedDepartment.description}
                </div>
              )}

              {/* Department Head Card if present */}
              {selectedDepartment.head && (
                <div className="rounded-card bg-error-lighter/60 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-error-dark">Department Head</span>
                  <div className="flex items-center justify-between mt-1.5">
                    <div>
                      <p className="text-xs font-bold text-ink-primary">{selectedDepartment.head.name}</p>
                      <p className="text-[11px] text-ink-secondary">{selectedDepartment.head.designation || 'Department Head'}</p>
                    </div>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => {
                        setSelectedDepartment(null);
                        handleFocusEmployee(selectedDepartment.head!.id);
                        setViewMode('reporting');
                      }}
                      endIcon={<Iconify icon="external" />}
                    >
                      Focus Tree
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                  Department Members ({selectedDepartment.employees?.length || 0})
                </h4>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => toggleDeptExpand(selectedDepartment.id)}
                  startIcon={<Iconify icon={expandedDeptIds.has(selectedDepartment.id) ? 'chevron-up' : 'chevron-down'} />}
                >
                  {expandedDeptIds.has(selectedDepartment.id) ? 'Hide in Tree' : 'Branch in Tree'}
                </Button>
              </div>

              {selectedDepartment.employees && selectedDepartment.employees.length > 0 ? (
                <div className="space-y-2">
                  {selectedDepartment.employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between rounded-lg bg-surface-neutral p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.profile_picture ? (
                          <img src={emp.profile_picture} alt={emp.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-primary-contrast shrink-0 ${getInitialsColor(emp.name)}`}>
                            {getInitials(emp.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink-primary truncate">{emp.name}</p>
                          <p className="text-[11px] text-ink-secondary truncate">{getDesignation(emp)}</p>
                          <span className="font-mono text-[10px] text-ink-disabled">{emp.employee_id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="soft"
                          color="secondary"
                          size="small"
                          onClick={() => {
                            setSelectedDepartment(null);
                            handleFocusEmployee(emp.id);
                            setViewMode('reporting');
                          }}
                          title="View reporting tree under this employee"
                          endIcon={<Iconify icon="external" />}
                        >
                          Focus
                        </Button>
                        <Button
                          variant="soft"
                          color="inherit"
                          size="small"
                          onClick={() => {
                            setSelectedDepartment(null);
                            setSelectedEmployee(emp);
                          }}
                          title="View quick details"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-ink-disabled italic">
                  No active employees currently assigned to this department.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-divider p-4 bg-surface-neutral flex items-center justify-between">
              <Button variant="outlined" color="inherit" className="w-full" onClick={() => setSelectedDepartment(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Employee Picker Modal ────────────────────────────────────── */}
      {showEmployeePicker && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-grey-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-surface-paper shadow-dialog">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-divider px-6 py-4 bg-surface-neutral">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-lighter text-primary-main">
                  <Iconify icon="user" width={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-primary">Select Specific Employee</h3>
                  <p className="text-xs text-ink-secondary">Pick any employee to view their reporting tree.</p>
                </div>
              </div>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setShowEmployeePicker(false)} />
            </div>

            {/* Search Input & Reset Button */}
            <div className="p-4 border-b border-divider space-y-3">
              <div className="relative">
                <Iconify icon="search" width={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-disabled" />
                <Input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search by employee name, designation, department, or ID..."
                  aria-label="Search employees"
                  className="pl-9 pr-9"
                />
                {pickerSearch && (
                  <IconButton
                    icon="close"
                    size="small"
                    aria-label="Clear search"
                    onClick={() => setPickerSearch('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  />
                )}
              </div>

              {focusedEmployeeId && (
                <Button
                  variant="soft"
                  className="w-full"
                  onClick={() => {
                    handleFocusEmployee(null);
                    setShowEmployeePicker(false);
                  }}
                  startIcon={<Iconify icon="refresh" />}
                >
                  Reset to View Entire Company
                </Button>
              )}
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredPickerEmployees.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-secondary">
                  No employees matched your search "{pickerSearch}".
                </div>
              ) : (
                filteredPickerEmployees.map((emp) => {
                  const isCurrent = focusedEmployeeId === emp.id;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => {
                        handleFocusEmployee(emp.id);
                        setViewMode('reporting');
                        setShowEmployeePicker(false);
                      }}
                      className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all ${isCurrent
                        ? 'bg-primary-lighter/60 ring-1 ring-primary-main'
                        : 'bg-surface-neutral hover:bg-grey-500/10'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.profile_picture ? (
                          <img src={emp.profile_picture} alt={emp.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-primary-contrast shrink-0 ${getInitialsColor(emp.name)}`}>
                            {getInitials(emp.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink-primary truncate">{emp.name}</p>
                          <p className="text-[11px] text-ink-secondary truncate">
                            {getDesignation(emp)} • {emp.department?.name || 'No Department'}
                          </p>
                          <span className="font-mono text-[10px] text-ink-disabled">{emp.employee_id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {emp.direct_reports_count > 0 ? (
                          <span className="rounded-full bg-success-lighter px-2.5 py-0.5 text-[10px] font-bold text-success-dark">
                            {emp.direct_reports_count} {emp.direct_reports_count === 1 ? 'Report' : 'Reports'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-disabled">Individual</span>
                        )}
                        <Iconify icon="arrow-right" width={16} className="text-primary-main" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-divider px-6 py-3 bg-surface-neutral flex items-center justify-between text-xs text-ink-secondary">
              <span>Showing {filteredPickerEmployees.length} of {allEmployees.length} employees</span>
              <Button variant="outlined" color="inherit" size="small" onClick={() => setShowEmployeePicker(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
