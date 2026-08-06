/**
 * Navigation configuration for the HRMS sidebar.
 *
 * Defines the sidebar navigation structure with module groups,
 * each specifying label, icon (SVG path data), href, featureFlag, and requiredPermission.
 * Groups are filtered by both feature flag availability and permission checks.
 *
 * Requirements: 11.1, 11.2, 16.1, 16.2, 16.3, 16.4, 16.5
 */

export interface NavItem {
  /** Display label in the sidebar */
  label: string;
  /** Route path (relative to root) */
  href: string;
  /** SVG path `d` attribute for a 24x24 stroke-based icon (Heroicons style) */
  icon: string;
  /** Permission code required to see this item (e.g. "employees.view") */
  requiredPermission: string;
  /** Feature flag key required to access this module (null = always visible) */
  featureFlag?: string | null;
}

export interface NavGroup {
  /** Section title displayed above the group items */
  label: string;
  /** Navigation items in this group */
  items: NavItem[];
}

// ─── SVG Icon Paths (Heroicons 24x24, stroke-based) ────────────────────────

const ICONS = {
  dashboard:
    'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  employees:
    'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  departments:
    'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 4.5h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z',
  designations:
    'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z',
  leaves:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  leaveApprovals:
    'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  attendance:
    'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  shifts:
    'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
  payroll:
    'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z',
  salarySlips:
    'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  recruitment:
    'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z',
  pipeline:
    'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12',
  appraisals:
    'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z',
  expenses:
    'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
  expenseApprovals:
    'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
  onboarding:
    'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
  training:
    'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
  grievances:
    'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  travel:
    'M6 12 3.269 3.125A7.502 7.502 0 0 1 16.731 8.875L19.5 12M18 12l2.731-3.125A7.502 7.502 0 0 0 7.269 15.125L4.5 12',
  overtime:
    'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  settlements:
    'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
  settings:
    'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
} as const;

export const navigationConfig: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: ICONS.dashboard, requiredPermission: 'employees.view', featureFlag: null },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', href: '/employees', icon: ICONS.employees, requiredPermission: 'employees.view', featureFlag: 'employees_enabled' },
      { label: 'Departments', href: '/departments', icon: ICONS.departments, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Designations', href: '/designations', icon: ICONS.designations, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Grades', href: '/employee-grades', icon: ICONS.designations, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Approvers', href: '/department-approvers', icon: ICONS.leaveApprovals, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Branches', href: '/branches', icon: ICONS.departments, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Transfers', href: '/transfers', icon: ICONS.departments, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Promotions', href: '/promotions', icon: ICONS.designations, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
    ],
  },
  {
    label: 'Leaves',
    items: [
      { label: 'Leave Applications', href: '/leaves', icon: ICONS.leaves, requiredPermission: 'leaves.view', featureFlag: 'leaves_enabled' },
      { label: 'Leave Approvals', href: '/leaves/approvals', icon: ICONS.leaveApprovals, requiredPermission: 'leaves.approve', featureFlag: 'leaves_enabled' },
      { label: 'Leave Policies', href: '/leave-policies', icon: ICONS.leaves, requiredPermission: 'leaves.manage', featureFlag: 'leaves_enabled' },
      { label: 'Policy Assignments', href: '/leave-policy-assignments', icon: ICONS.leaves, requiredPermission: 'leaves.manage', featureFlag: 'leaves_enabled' },
      { label: 'Block Lists', href: '/leave-block-lists', icon: ICONS.leaves, requiredPermission: 'leaves.manage', featureFlag: 'leaves_enabled' },
      { label: 'Adjustments', href: '/leave-adjustments', icon: ICONS.leaves, requiredPermission: 'leaves.manage', featureFlag: 'leaves_enabled' },
      { label: 'Earned Leave Schedules', href: '/earned-leave-schedules', icon: ICONS.leaves, requiredPermission: 'leaves.manage', featureFlag: 'leaves_enabled' },
    ],
  },
  {
    label: 'Attendance',
    items: [
      { label: 'Attendance', href: '/attendance', icon: ICONS.attendance, requiredPermission: 'attendance.view', featureFlag: 'attendance_enabled' },
      { label: 'Attendance Register', href: '/attendance-register', icon: ICONS.attendance, requiredPermission: 'attendance.manage', featureFlag: 'attendance_enabled' },
      { label: 'Attendance Requests', href: '/attendance-requests', icon: ICONS.attendance, requiredPermission: 'attendance.view', featureFlag: 'attendance_enabled' },
      { label: 'Attendance Upload', href: '/attendance-upload', icon: ICONS.attendance, requiredPermission: 'attendance.manage', featureFlag: 'attendance_enabled' },
      { label: 'Geo Locations', href: '/geofence-locations', icon: ICONS.attendance, requiredPermission: 'attendance.manage', featureFlag: 'attendance_enabled' },
      { label: 'Shifts', href: '/shifts', icon: ICONS.shifts, requiredPermission: 'attendance.view', featureFlag: 'shifts_enabled' },
      { label: 'Shift Types', href: '/shift-types', icon: ICONS.shifts, requiredPermission: 'attendance.manage', featureFlag: 'shifts_enabled' },
      { label: 'Shift Requests', href: '/shift-requests', icon: ICONS.shifts, requiredPermission: 'attendance.view', featureFlag: 'shifts_enabled' },
      { label: 'Shift Schedules', href: '/shift-schedules', icon: ICONS.shifts, requiredPermission: 'attendance.manage', featureFlag: 'shifts_enabled' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { label: 'Payroll Runs', href: '/payroll/runs', icon: ICONS.payroll, requiredPermission: 'payroll.manage', featureFlag: 'payroll_enabled' },
      { label: 'Salary Slips', href: '/payroll', icon: ICONS.salarySlips, requiredPermission: 'payroll.view', featureFlag: 'payroll_enabled' },
      { label: 'Components', href: '/salary-components', icon: ICONS.salarySlips, requiredPermission: 'payroll.manage', featureFlag: 'payroll_enabled' },
      { label: 'Structures', href: '/salary-structures', icon: ICONS.payroll, requiredPermission: 'payroll.manage', featureFlag: 'payroll_enabled' },
      { label: 'Assignments', href: '/salary-structure-assignments', icon: ICONS.payroll, requiredPermission: 'payroll.manage', featureFlag: 'payroll_enabled' },
      { label: 'Payroll Periods', href: '/payroll-periods', icon: ICONS.payroll, requiredPermission: 'payroll.manage', featureFlag: 'payroll_enabled' },
      { label: 'Corrections', href: '/payroll-corrections', icon: ICONS.payroll, requiredPermission: 'payroll.manage', featureFlag: 'payroll_enabled' },
      { label: 'Incentives', href: '/employee-incentives', icon: ICONS.payroll, requiredPermission: 'payroll.manage', featureFlag: 'payroll_enabled' },
      { label: 'Gratuity', href: '/gratuity', icon: ICONS.payroll, requiredPermission: 'payroll.manage', featureFlag: 'payroll_enabled' },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { label: 'Job Openings', href: '/recruitment/job-openings', icon: ICONS.recruitment, requiredPermission: 'recruitment.view', featureFlag: 'recruitment_enabled' },
      { label: 'Pipeline', href: '/recruitment/pipeline', icon: ICONS.pipeline, requiredPermission: 'recruitment.view', featureFlag: 'recruitment_enabled' },
      { label: 'Referrals', href: '/referrals', icon: ICONS.recruitment, requiredPermission: 'recruitment.view', featureFlag: 'recruitment_enabled' },
      { label: 'Interview Types', href: '/interview-types', icon: ICONS.recruitment, requiredPermission: 'recruitment.manage', featureFlag: 'recruitment_enabled' },
      { label: 'Job Templates', href: '/job-templates', icon: ICONS.recruitment, requiredPermission: 'recruitment.manage', featureFlag: 'recruitment_enabled' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { label: 'Appraisals', href: '/appraisals', icon: ICONS.appraisals, requiredPermission: 'appraisals.view', featureFlag: 'appraisals_enabled' },
      { label: 'KRAs', href: '/kras', icon: ICONS.appraisals, requiredPermission: 'appraisals.manage', featureFlag: 'appraisals_enabled' },
      { label: 'Templates', href: '/appraisal-templates', icon: ICONS.appraisals, requiredPermission: 'appraisals.manage', featureFlag: 'appraisals_enabled' },
      { label: 'Goals', href: '/goals', icon: ICONS.appraisals, requiredPermission: 'appraisals.view', featureFlag: 'appraisals_enabled' },
      { label: 'Feedback', href: '/performance-feedback', icon: ICONS.appraisals, requiredPermission: 'appraisals.view', featureFlag: 'appraisals_enabled' },
    ],
  },
  {
    label: 'Expenses',
    items: [
      { label: 'My Expenses', href: '/expenses', icon: ICONS.expenses, requiredPermission: 'expenses.view', featureFlag: 'expenses_enabled' },
      { label: 'Expense Approvals', href: '/expenses/approvals', icon: ICONS.expenseApprovals, requiredPermission: 'expenses.approve', featureFlag: 'expenses_enabled' },
      { label: 'Expense Types', href: '/expense-types', icon: ICONS.expenses, requiredPermission: 'expenses.manage', featureFlag: 'expenses_enabled' },
      { label: 'Expense Taxes', href: '/expense-taxes', icon: ICONS.expenses, requiredPermission: 'expenses.manage', featureFlag: 'expenses_enabled' },
    ],
  },
  {
    label: 'Learning',
    items: [
      { label: 'Onboarding', href: '/onboarding', icon: ICONS.onboarding, requiredPermission: 'onboarding.view' },
      { label: 'Onboarding Templates', href: '/onboarding-templates', icon: ICONS.onboarding, requiredPermission: 'onboarding.manage' },
      { label: 'Onboarding Tracking', href: '/onboarding-tracking', icon: ICONS.onboarding, requiredPermission: 'onboarding.manage' },
      { label: 'Training', href: '/training', icon: ICONS.training, requiredPermission: 'training.view', featureFlag: 'training_enabled' },
      { label: 'Training Programs', href: '/training-programs', icon: ICONS.training, requiredPermission: 'training.manage', featureFlag: 'training_enabled' },
      { label: 'Training Results', href: '/training-results', icon: ICONS.training, requiredPermission: 'training.manage', featureFlag: 'training_enabled' },
    ],
  },
  {
    label: 'More',
    items: [
      { label: 'Grievances', href: '/grievances', icon: ICONS.grievances, requiredPermission: 'grievances.view', featureFlag: 'grievances_enabled' },
      { label: 'Travel', href: '/travel', icon: ICONS.travel, requiredPermission: 'travel.view', featureFlag: 'travel_enabled' },
      { label: 'Overtime', href: '/overtime', icon: ICONS.overtime, requiredPermission: 'overtime.view', featureFlag: null },
      { label: 'Settlements', href: '/settlements', icon: ICONS.settlements, requiredPermission: 'settlements.view', featureFlag: 'settlements_enabled' },
      { label: 'Exit Interviews', href: '/exit-interviews', icon: ICONS.settlements, requiredPermission: 'employees.manage', featureFlag: null },
      { label: 'Holiday Assignments', href: '/holiday-assignments', icon: ICONS.leaves, requiredPermission: 'employees.manage', featureFlag: 'holidays_enabled' },
      { label: 'Health Insurance', href: '/health-insurance', icon: ICONS.employees, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Cost Centers', href: '/cost-centers', icon: ICONS.departments, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Document Types', href: '/document-types', icon: ICONS.designations, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
      { label: 'Employee Documents', href: '/employee-documents', icon: ICONS.designations, requiredPermission: 'employees.view', featureFlag: 'employees_enabled' },
      { label: 'Appointment Letters', href: '/appointment-letters', icon: ICONS.designations, requiredPermission: 'employees.manage', featureFlag: 'employees_enabled' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Roles & Permissions', href: '/admin/roles', icon: ICONS.settings, requiredPermission: 'roles.manage', featureFlag: null },
      { label: 'HR Settings', href: '/hr-settings', icon: ICONS.settings, requiredPermission: 'roles.manage', featureFlag: null },
      { label: 'Audit Logs', href: '/audit-logs', icon: ICONS.settings, requiredPermission: 'roles.manage', featureFlag: null },
    ],
  },
];

/** Flat list of all nav items for quick lookups */
export const allNavItems: NavItem[] = navigationConfig.flatMap((g) => g.items);

/**
 * Filters navigation config based on user permissions and available feature flags.
 * Returns only groups that have at least one visible item for the given permission set.
 */
export function getFilteredNavigation(
  hasPermission: (perm: string) => boolean,
  hasFeature: (flag: string) => boolean,
): NavGroup[] {
  return navigationConfig
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Check permission access
        if (!hasPermission(item.requiredPermission)) return false;
        // Check feature flag
        if (item.featureFlag && !hasFeature(item.featureFlag)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}
