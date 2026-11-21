import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Select } from '@/components/ui/Select';

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
            <button
              type="button"
              onClick={(e) => toggleCollapse(node.id, e)}
              className="relative z-10 -ml-2.5 inline-flex items-center justify-center h-5 w-5 rounded-full border border-error-light bg-surface-paper text-error-light shadow-xs hover:bg-error-lighter hover:text-error-dark transition-all text-xs font-bold shrink-0"
              title={isCollapsed ? 'Expand Direct Reports' : 'Collapse Direct Reports'}
            >
              {isCollapsed ? '+' : '−'}
            </button>
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
            <button
              type="button"
              onClick={(e) => toggleCollapse(node.id, e)}
              className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-error-light bg-surface-paper text-error-light shadow-xs hover:bg-error-lighter hover:text-error-dark transition-all text-xs font-bold"
              title={isCollapsed ? 'Expand Direct Reports' : 'Collapse Direct Reports'}
            >
              {isCollapsed ? '+' : '−'}
            </button>
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleDeptExpand(dept.id);
            }}
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${isDeptExpanded
              ? 'bg-error-lighter text-error-dark border border-error-light'
              : 'bg-surface-neutral text-ink-primary hover:bg-grey-200 border border-divider'
              }`}
          >
            <span>👥 {dept.employee_count} {dept.employee_count === 1 ? 'Member' : 'Members'}</span>
            <span>{isDeptExpanded ? '▲ Hide' : '▼ View Employees'}</span>
          </button>
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
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* ─── Top Control Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface-paper p-3.5 shadow-xs w-full max-w-full min-w-0">
        {/* Row 1: Title & Main View Switcher */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-ink-primary">Organization Chart</h1>

            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mode Switcher */}
            <div className="inline-flex rounded-xl bg-surface-neutral p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('reporting')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'reporting'
                  ? 'bg-surface-paper text-ink-primary shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
                  }`}
              >
                Reporting Tree
              </button>
              <button
                type="button"
                onClick={() => setViewMode('departments')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'departments'
                  ? 'bg-surface-paper text-ink-primary shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
                  }`}
              >
                Department View
              </button>
            </div>

            {/* Rotate Tree Orientation */}
            <button
              type="button"
              onClick={() => {
                setOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
                setPan({ x: 0, y: 0 });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-divider bg-surface-paper px-3 py-1.5 text-xs font-semibold text-ink-primary hover:bg-surface-neutral shadow-2xs transition-all active:scale-95 shrink-0"
              title="Rotate between Horizontal (Left-to-Right) and Vertical (Top-to-Bottom)"
            >
              <svg
                className={`h-3.5 w-3.5 text-primary-main transition-transform duration-300 ${orientation === 'horizontal' ? 'rotate-90' : ''
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{orientation === 'horizontal' ? 'Horizontal ↔' : 'Vertical ↕'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search, Filters & Zoom Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-2.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            {/* Select Employee to Focus Dropdown */}
            {viewMode === 'reporting' && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="focus-employee-select" className="text-xs font-semibold text-ink-primary whitespace-nowrap">
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
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, designation..."
                className="w-full rounded-xl border border-divider bg-surface-paper py-1.5 pl-8 pr-3 text-xs text-ink-primary placeholder-ink-disabled focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main shadow-2xs"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-disabled"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-disabled hover:text-ink-secondary"
                >
                  ✕
                </button>
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
          <div className="flex items-center gap-0.5 rounded-xl border border-divider bg-surface-paper p-1 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              className="h-7 w-7 rounded-lg text-ink-secondary hover:bg-surface-neutral flex items-center justify-center text-sm font-bold"
              title="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="h-7 w-7 rounded-lg text-ink-secondary hover:bg-surface-neutral flex items-center justify-center text-sm font-bold"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ─── Focused Sub-Tree Breadcrumb Bar ─────────────────────────────── */}
      {focusedNode && viewMode === 'reporting' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary-lighter border border-secondary-light px-5 py-3 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-semibold text-secondary-darker flex items-center gap-1.5">
              <svg className="h-4 w-4 text-secondary-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Hierarchy Under:
            </span>

            <button
              type="button"
              onClick={() => handleFocusEmployee(null)}
              className="font-medium text-secondary-main hover:text-secondary-dark hover:underline"
            >
              Entire Company
            </button>

            {ancestors.map((anc) => (
              <React.Fragment key={anc.id}>
                <span className="text-secondary-light font-bold">&rarr;</span>
                <button
                  type="button"
                  onClick={() => handleFocusEmployee(anc.id)}
                  className="font-medium text-secondary-main hover:text-secondary-dark hover:underline"
                >
                  {anc.name}
                </button>
              </React.Fragment>
            ))}

            <span className="text-secondary-light font-bold">&rarr;</span>
            <span className="font-bold text-secondary-darker bg-surface-paper px-2.5 py-0.5 rounded-md shadow-2xs border border-secondary-light">
              {focusedNode.name} ({focusedNode.direct_reports_count} direct {focusedNode.direct_reports_count === 1 ? 'report' : 'reports'})
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleFocusEmployee(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-paper border border-secondary-light px-3 py-1.5 text-xs font-semibold text-secondary-dark hover:bg-secondary-lighter transition-colors shadow-2xs"
          >
            <span>✕ View Full Company Chart</span>
          </button>
        </div>
      )}

      {/* ─── Unassigned Staff Notice Bar ─────────────────────────────────── */}
      {unassigned.length > 0 && viewMode === 'reporting' && !focusedNode && (
        <div className="flex items-center justify-between rounded-xl bg-warning-lighter border border-warning-light px-4 py-2.5 text-xs text-warning-dark">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-warning-main flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>{unassigned.length}</strong> active employee{unassigned.length !== 1 ? 's do' : ' does'} not have an assigned reporting manager.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowUnassignedDrawer(true)}
            className="font-bold underline text-warning-darker hover:text-warning-dark"
          >
            View Unassigned Staff &rarr;
          </button>
        </div>
      )}

      {/* ─── Search Active Notice Bar ─────────────────────────────────────── */}
      {search.trim() && viewMode === 'reporting' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warning-lighter border border-warning-light px-4 py-2 text-xs text-warning-darker">
          <div className="flex items-center gap-2">
            <span className="font-semibold flex items-center gap-1.5 text-warning-dark">
              🔍 Search Active:
            </span>
            <span>
              Showing only searched employee and their reporter. Delete letters in search bar to show the full company chart.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="inline-flex items-center gap-1 rounded-lg bg-surface-paper border border-warning-light px-2.5 py-1 text-xs font-bold text-warning-dark hover:bg-warning-lighter transition-colors shadow-2xs"
          >
            ✕ Show Full Company Chart
          </button>
        </div>
      )}

      {/* ─── Interactive Tree Canvas ─────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative h-[720px] w-full overflow-hidden rounded-2xl border border-divider bg-error-lighter/20 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
      >
        {/* Background Grid Pattern (Matching pink graph paper grid from screenshot) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(239, 68, 68, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(239, 68, 68, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-paper/70 backdrop-blur-xs z-20">
            <svg className="h-8 w-8 text-primary-main animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="mt-3 text-xs font-semibold text-ink-secondary">Building organization tree...</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <p className="text-sm font-semibold text-error-main">Failed to load organization hierarchy.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-lg bg-primary-main px-4 py-2 text-xs font-bold text-primary-contrast hover:bg-primary-dark"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty Tree State */}
        {!isLoading && !isError && activeReportingRoots.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-grey-200 text-ink-secondary mb-3">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-ink-primary">No Hierarchy Available</h3>
            <p className="mt-1 text-xs text-ink-secondary max-w-sm">
              {focusedNode
                ? `No direct or indirect reporting employees found under ${focusedNode.name}.`
                : 'Add active employees and assign reporting managers in the Employees module.'}
            </p>
            {focusedNode ? (
              <button
                type="button"
                onClick={() => handleFocusEmployee(null)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-main px-4 py-2 text-xs font-bold text-primary-contrast shadow-sm hover:bg-primary-dark"
              >
                &larr; View Full Company Chart
              </button>
            ) : (
              <Link
                to="/employees/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-main px-4 py-2 text-xs font-bold text-primary-contrast shadow-sm hover:bg-primary-dark"
              >
                + Add First Employee
              </Link>
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
        <div className="absolute bottom-4 left-4 rounded-lg bg-surface-paper/90 backdrop-blur-xs border border-divider px-3 py-1.5 text-[11px] text-ink-secondary shadow-xs pointer-events-none flex items-center gap-3">
          <span>🖱️ Click & Drag canvas to pan</span>
          <span>•</span>
          <span>🔍 Zoom +/-</span>
          <span>•</span>
          <span>🎯 Click Focus ↗ to view anyone's team</span>
        </div>
      </div>

      {/* ─── Employee Detail Slide-over Drawer ────────────────────────────── */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-grey-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-surface-paper shadow-2xl h-full flex flex-col border-l border-divider">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-divider px-6 py-4 bg-surface-neutral">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Employee Profile Summary
              </span>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg p-1.5 text-ink-disabled hover:bg-grey-200 hover:text-ink-secondary transition-colors"
              >
                ✕
              </button>
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
                <button
                  type="button"
                  onClick={() => {
                    handleFocusEmployee(selectedEmployee.id);
                    setSelectedEmployee(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-lighter border border-secondary-light px-4 py-2.5 text-xs font-bold text-secondary-dark hover:bg-secondary-lighter transition-colors shadow-2xs"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Focus Chart on {selectedEmployee.name}'s Team ({selectedEmployee.direct_reports_count} Reports)</span>
                </button>
              )}

              {/* Contact & Designation Info */}
              <div className="rounded-xl bg-surface-neutral p-4 border border-divider space-y-3">
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
                        className="flex items-center justify-between rounded-xl border border-divider p-2.5 hover:bg-surface-neutral cursor-pointer transition-colors"
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
                        <span className="text-xs text-primary-main font-semibold">&rarr;</span>
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
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg border border-divider bg-surface-paper px-4 py-2 text-xs font-medium text-ink-primary hover:bg-surface-neutral"
              >
                Close
              </button>
              <Link
                to={`/employees/${selectedEmployee.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-main px-4 py-2 text-xs font-bold text-primary-contrast shadow-sm hover:bg-primary-dark transition-colors"
              >
                <span>View Full Profile</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Unassigned Staff Drawer ─────────────────────────────────────── */}
      {showUnassignedDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-grey-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-surface-paper shadow-2xl h-full flex flex-col border-l border-divider">
            <div className="flex items-center justify-between border-b border-divider px-6 py-4 bg-warning-lighter">
              <div>
                <h3 className="text-sm font-bold text-warning-darker">Unassigned Staff ({unassigned.length})</h3>
                <p className="text-xs text-warning-dark mt-0.5">
                  Employees without a designated reporting manager.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUnassignedDrawer(false)}
                className="rounded-lg p-1.5 text-ink-disabled hover:bg-grey-200 hover:text-ink-secondary"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {unassigned.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between rounded-xl border border-divider p-3 hover:border-primary-main transition-colors"
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
                  <Link
                    to={`/employees/${emp.id}/edit`}
                    className="rounded-lg bg-surface-neutral hover:bg-primary-lighter hover:text-primary-main px-2.5 py-1 text-xs font-medium text-ink-primary transition-colors"
                  >
                    Assign Manager
                  </Link>
                </div>
              ))}
            </div>

            <div className="border-t border-divider p-4 bg-surface-neutral">
              <button
                type="button"
                onClick={() => setShowUnassignedDrawer(false)}
                className="w-full rounded-lg border border-divider bg-surface-paper py-2 text-xs font-medium text-ink-primary hover:bg-surface-neutral"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Department Detail Slide-over Drawer (Shows Employees) ──────── */}
      {selectedDepartment && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-grey-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-surface-paper shadow-2xl h-full flex flex-col border-l border-divider">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-divider px-6 py-4 bg-surface-neutral">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-primary-lighter text-primary-dark text-xs font-bold">
                    🏢
                  </span>
                  <h3 className="text-base font-bold text-ink-primary">{selectedDepartment.name} Department</h3>
                </div>
                <p className="text-xs text-ink-secondary mt-1">
                  {selectedDepartment.employee_count} {selectedDepartment.employee_count === 1 ? 'Employee' : 'Employees'}
                  {selectedDepartment.head ? ` • Head: ${selectedDepartment.head.name}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDepartment(null)}
                className="rounded-lg p-1.5 text-ink-disabled hover:bg-grey-200 hover:text-ink-secondary transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedDepartment.description && (
                <div className="p-3 bg-surface-neutral border border-divider rounded-xl text-xs text-ink-secondary">
                  {selectedDepartment.description}
                </div>
              )}

              {/* Department Head Card if present */}
              {selectedDepartment.head && (
                <div className="rounded-xl border border-error-light bg-error-lighter/60 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-error-dark">Department Head</span>
                  <div className="flex items-center justify-between mt-1.5">
                    <div>
                      <p className="text-xs font-bold text-ink-primary">{selectedDepartment.head.name}</p>
                      <p className="text-[11px] text-ink-secondary">{selectedDepartment.head.designation || 'Department Head'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDepartment(null);
                        handleFocusEmployee(selectedDepartment.head!.id);
                        setViewMode('reporting');
                      }}
                      className="rounded-lg bg-surface-paper border border-error-light px-2.5 py-1 text-xs font-bold text-error-dark hover:bg-error-lighter shadow-2xs"
                    >
                      Focus Tree ↗
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                  Department Members ({selectedDepartment.employees?.length || 0})
                </h4>
                <button
                  type="button"
                  onClick={() => toggleDeptExpand(selectedDepartment.id)}
                  className="text-xs text-primary-main hover:text-primary-dark font-semibold"
                >
                  {expandedDeptIds.has(selectedDepartment.id) ? '▲ Hide in Tree' : '▼ Branch in Tree'}
                </button>
              </div>

              {selectedDepartment.employees && selectedDepartment.employees.length > 0 ? (
                <div className="space-y-2">
                  {selectedDepartment.employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-divider hover:border-primary-main transition-colors bg-surface-paper shadow-2xs"
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDepartment(null);
                            handleFocusEmployee(emp.id);
                            setViewMode('reporting');
                          }}
                          className="rounded-lg bg-secondary-lighter border border-secondary-light px-2 py-1 text-[11px] font-bold text-secondary-dark hover:bg-secondary-lighter transition-colors"
                          title="View reporting tree under this employee"
                        >
                          Focus ↗
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDepartment(null);
                            setSelectedEmployee(emp);
                          }}
                          className="rounded-lg bg-surface-neutral hover:bg-grey-200 px-2 py-1 text-[11px] font-medium text-ink-primary transition-colors"
                          title="View quick details"
                        >
                          Details
                        </button>
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
              <button
                type="button"
                onClick={() => setSelectedDepartment(null)}
                className="w-full rounded-lg border border-divider bg-surface-paper py-2 text-xs font-medium text-ink-primary hover:bg-surface-neutral"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Employee Picker Modal ────────────────────────────────────── */}
      {showEmployeePicker && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-grey-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-surface-paper shadow-2xl border border-divider overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-divider px-6 py-4 bg-surface-neutral">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-lighter text-primary-main">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-primary">Select Specific Employee</h3>
                  <p className="text-xs text-ink-secondary">Pick any employee to view their reporting tree.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmployeePicker(false)}
                className="rounded-lg p-1.5 text-ink-disabled hover:bg-grey-200 hover:text-ink-secondary"
              >
                ✕
              </button>
            </div>

            {/* Search Input & Reset Button */}
            <div className="p-4 border-b border-divider space-y-3">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search by employee name, designation, department, or ID..."
                  className="w-full rounded-xl border border-divider py-2 pl-9 pr-4 text-xs text-ink-primary placeholder-ink-disabled focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main shadow-2xs"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-ink-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {pickerSearch && (
                  <button
                    type="button"
                    onClick={() => setPickerSearch('')}
                    className="absolute right-3 top-2 text-xs text-ink-disabled hover:text-ink-secondary"
                  >
                    ✕
                  </button>
                )}
              </div>

              {focusedEmployeeId && (
                <button
                  type="button"
                  onClick={() => {
                    handleFocusEmployee(null);
                    setShowEmployeePicker(false);
                  }}
                  className="w-full py-2 px-3 text-xs font-semibold text-primary-dark bg-primary-lighter border border-primary-light rounded-xl hover:bg-primary-lighter transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>🔄 Reset to View Entire Company</span>
                </button>
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
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isCurrent
                        ? 'border-primary-main bg-primary-lighter/60 ring-1 ring-primary-main'
                        : 'border-divider hover:border-primary-light hover:bg-surface-neutral'
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
                          <span className="rounded-full bg-success-lighter px-2.5 py-0.5 text-[10px] font-bold text-success-dark border border-success-light">
                            {emp.direct_reports_count} {emp.direct_reports_count === 1 ? 'Report' : 'Reports'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-disabled">Individual</span>
                        )}
                        <span className="text-primary-main text-xs font-bold">&rarr;</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-divider px-6 py-3 bg-surface-neutral flex items-center justify-between text-xs text-ink-secondary">
              <span>Showing {filteredPickerEmployees.length} of {allEmployees.length} employees</span>
              <button
                type="button"
                onClick={() => setShowEmployeePicker(false)}
                className="rounded-lg border border-divider bg-surface-paper px-3 py-1.5 font-medium text-ink-primary hover:bg-surface-neutral"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
