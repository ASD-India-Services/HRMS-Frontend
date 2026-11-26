/**
 * Navigation configuration for the HRMS sidebar.
 *
 * Defines the sidebar navigation structure with module groups,
 * each specifying label, icon (NavIcon name), href, featureFlag, and requiredPermission.
 * Groups are filtered by both feature flag availability and permission checks.
 *
 * Requirements: 11.1, 11.2, 16.1, 16.2, 16.3, 16.4, 16.5
 */

export interface NavItem {
  /** Display label in the sidebar */
  label: string;
  /** Route path (relative to root) */
  href: string;
  /** Icon name registered in components/Iconify (rendered by NavIcon) */
  icon: string;
  /** Permission code required to see this item (e.g. "employees.view") */
  requiredPermission?: string | null;
  /** Optional: show the item if the user has ANY one of these permissions. */
  requiredAnyPermission?: string[] | null;
  /** Feature flag key required to access this module (null = always visible) */
  featureFlag?: string | null;
}

export interface NavGroup {
  /** Section title displayed above the group items */
  label: string;
  /** Icon name (Iconify registry) shown beside the section title */
  icon?: string;
  /** Render this group as a single top-level link instead of an expandable module. */
  isDirectLink?: boolean;
  /** Navigation items in this group */
  items: NavItem[];
}

// ─── Icon names (resolved by NavIcon via the Iconify registry) ─────────────

const ICONS = {
  dashboard: 'dashboard',
  employees: 'employees',
  departments: 'departments',
  designations: 'designations',
  grades: 'grades',
  approvers: 'approvers',
  branches: 'branches',
  transfers: 'transfers',
  promotions: 'promotions',
  leaves: 'leaves',
  leaveApprovals: 'leaveApprovals',
  leavePolicies: 'leavePolicies',
  leaveBlock: 'leaveBlock',
  leaveAdjust: 'leaveAdjust',
  leaveEarned: 'leaveEarned',
  attendance: 'attendance',
  attendanceRegister: 'attendanceRegister',
  attendanceRequest: 'attendanceRequest',
  attendanceUpload: 'attendanceUpload',
  geoLocations: 'geoLocations',
  shifts: 'shifts',
  shiftTypes: 'shiftTypes',
  shiftRequests: 'shiftRequests',
  payroll: 'payroll',
  salarySlips: 'salarySlips',
  recruitment: 'recruitment',
  pipeline: 'pipeline',
  referrals: 'referrals',
  interviewTypes: 'interviewTypes',
  jobTemplates: 'jobTemplates',
  appraisals: 'appraisals',
  kras: 'kras',
  goals: 'goals',
  feedback: 'feedback',
  expenses: 'expenses',
  expenseApprovals: 'expenseApprovals',
  expenseTypes: 'expenseTypes',
  expenseTaxes: 'expenseTaxes',
  onboarding: 'onboarding',
  onboardingTemplates: 'onboardingTemplates',
  onboardingTracking: 'onboardingTracking',
  training: 'training',
  trainingPrograms: 'trainingPrograms',
  trainingResults: 'trainingResults',
  grievances: 'grievances',
  grievanceTypes: 'grievanceTypes',
  travel: 'travel',
  overtime: 'overtime',
  overtimeTypes: 'overtimeTypes',
  settlements: 'settlements',
  exitInterviews: 'exitInterviews',
  holidayAssignments: 'holidayAssignments',
  holidayLists: 'holidayLists',
  healthInsurance: 'healthInsurance',
  costCenters: 'costCenters',
  documentTypes: 'documentTypes',
  employeeDocuments: 'employeeDocuments',
  appointmentLetters: 'appointmentLetters',
  settings: 'settings',
  auditLogs: 'auditLogs',
  hrSettings: 'hrSettings',
  orgChart: 'orgChart',
  helpdesk: 'helpdesk',
  faqs: 'faqs',
  policies: 'policies',
  meetings: 'meetings',
  bonusPoints: 'bonusPoints',
  summary: 'summary',
  compliance: 'compliance',
} as const;

export const navigationConfig: NavGroup[] = [
  {
    label: 'Dashboard',
    icon: 'custom:dashboard',
    isDirectLink: true,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: ICONS.dashboard, requiredPermission: 'dashboard.view', featureFlag: null },
    ],
  },
  {
    label: 'People',
    icon: 'custom:people',
    items: [
      { label: 'Employees', href: '/employees', icon: ICONS.employees, requiredPermission: 'employees.view', featureFlag: 'employees_enabled' },
      { label: 'Org Chart', href: '/org-chart', icon: ICONS.orgChart, requiredPermission: 'employees.view', featureFlag: 'employees_enabled' },
      { label: 'Departments', href: '/departments', icon: ICONS.departments, requiredPermission: 'departments.view', featureFlag: 'employees_enabled' },
      { label: 'Designations', href: '/designations', icon: ICONS.designations, requiredPermission: 'designations.view', featureFlag: 'employees_enabled' },
      { label: 'Grades', href: '/employee-grades', icon: ICONS.grades, requiredPermission: 'employee_grades.view', featureFlag: 'employees_enabled' },
      { label: 'Approvers', href: '/department-approvers', icon: ICONS.approvers, requiredPermission: 'department_approvers.view', featureFlag: 'employees_enabled' },
      { label: 'Branches', href: '/branches', icon: ICONS.branches, requiredPermission: 'branches.view', featureFlag: 'employees_enabled' },
      { label: 'Transfers', href: '/transfers', icon: ICONS.transfers, requiredPermission: 'transfers.view', featureFlag: 'employees_enabled' },
      { label: 'Promotions', href: '/promotions', icon: ICONS.promotions, requiredPermission: 'promotions.view', featureFlag: 'employees_enabled' },
      { label: 'Meetings', href: '/meetings', icon: ICONS.meetings, requiredPermission: 'meetings.view', featureFlag: null },
      { label: 'Employee Bonus Point', href: '/employee-bonus-points', icon: ICONS.bonusPoints, requiredPermission: 'bonus_points.view', featureFlag: null },
    ],
  },
  {
    label: 'Leaves',
    icon: 'custom:leave',
    items: [
      { label: 'Dashboard', href: '/leaves/dashboard', icon: ICONS.dashboard, requiredPermission: 'leaves.view', featureFlag: 'leaves_enabled' },
      { label: 'My Leaves', href: '/my-leaves', icon: ICONS.leaves, requiredPermission: 'leaves.view', featureFlag: 'leaves_enabled' },
      { label: 'Leave Approvals', href: '/leaves/approvals', icon: ICONS.leaveApprovals, requiredPermission: 'leave_approvals.view', featureFlag: 'leaves_enabled' },
      { label: 'Compensatory Leave', href: '/leaves/compensatory', icon: ICONS.leaveApprovals, requiredPermission: 'compensatory_leave.view', featureFlag: 'leaves_enabled' },
      { label: 'Leave Policies', href: '/leave-policies', icon: ICONS.leavePolicies, requiredPermission: 'leave_policies.view', featureFlag: 'leaves_enabled' },
      { label: 'Policy Assignments', href: '/leave-policy-assignments', icon: ICONS.leaveAdjust, requiredPermission: 'leave_policy_assignments.view', featureFlag: 'leaves_enabled' },
      { label: 'Block Lists', href: '/leave-block-lists', icon: ICONS.leaveBlock, requiredPermission: 'leave_block_lists.view', featureFlag: 'leaves_enabled' },
      { label: 'Adjustments', href: '/leave-adjustments', icon: ICONS.leaveAdjust, requiredPermission: 'leave_adjustments.view', featureFlag: 'leaves_enabled' },
      { label: 'Earned Leave Schedules', href: '/earned-leave-schedules', icon: ICONS.leaveEarned, requiredPermission: 'earned_leave_schedules.view', featureFlag: 'leaves_enabled' },
      { label: 'Loss of Pay', href: '/loss-of-pay', icon: ICONS.leaveAdjust, requiredPermission: 'loss_of_pay.view', featureFlag: 'leaves_enabled' },
      { label: 'Company Leaves', href: '/leaves/company-leaves', icon: ICONS.leaves, requiredPermission: 'leaves.view', featureFlag: 'leaves_enabled' },
    ],
  },
  {
    label: 'Attendance',
    icon: 'custom:attendance',
    items: [
      { label: 'Dashboard', href: '/attendance/dashboard', icon: ICONS.dashboard, requiredPermission: 'attendance.view', featureFlag: 'attendance_enabled' },
      { label: 'Attendance', href: '/attendance', icon: ICONS.attendance, requiredPermission: 'attendance.view', featureFlag: 'attendance_enabled' },
      { label: 'My Attendance', href: '/my-attendance', icon: ICONS.attendanceRegister, requiredPermission: 'my_attendance.view', featureFlag: 'attendance_enabled' },
      { label: 'Attendance Register', href: '/attendance-register', icon: ICONS.attendanceRegister, requiredPermission: 'attendance_register.view', featureFlag: 'attendance_enabled' },
      { label: 'Attendance Requests', href: '/attendance-requests', icon: ICONS.attendanceRequest, requiredPermission: 'attendance_requests.view', featureFlag: 'attendance_enabled' },
      { label: 'Hour Account', href: '/attendance/hour-account', icon: ICONS.overtime, requiredPermission: 'hour_account.view', featureFlag: 'attendance_enabled' },
      { label: 'Work Records', href: '/attendance/work-records', icon: ICONS.attendanceRegister, requiredPermission: 'work_records.view', featureFlag: 'attendance_enabled' },
      { label: 'Attendance Upload', href: '/attendance-upload', icon: ICONS.attendanceUpload, requiredPermission: 'attendance_upload.manage', featureFlag: 'attendance_enabled' },
      { label: 'Geo Locations', href: '/geofence-locations', icon: ICONS.geoLocations, requiredPermission: 'geofence_locations.view', featureFlag: 'attendance_enabled' },
      { label: 'Shifts', href: '/shifts', icon: ICONS.shifts, requiredPermission: 'shifts.view_own', requiredAnyPermission: ['shifts.view_own', 'shifts.view_team'], featureFlag: 'shifts_enabled' },
      { label: 'Shift Types', href: '/shift-types', icon: ICONS.shiftTypes, requiredPermission: 'shift_types.view', featureFlag: 'shifts_enabled' },
      { label: 'Shift Requests', href: '/shift-requests', icon: ICONS.shiftRequests, requiredPermission: 'shift_requests.view', featureFlag: 'shifts_enabled' },
      { label: 'Shift Schedules', href: '/shift-schedules', icon: ICONS.shifts, requiredPermission: 'shift_schedules.view', featureFlag: 'shifts_enabled' },
    ],
  },
  {
    label: 'Payroll',
    icon: 'custom:payroll',
    items: [
      { label: 'Dashboard', href: '/payroll/dashboard', icon: ICONS.dashboard, requiredPermission: 'payroll.view', featureFlag: 'payroll_enabled' },
      { label: 'Payroll Runs', href: '/payroll/runs', icon: ICONS.payroll, requiredPermission: 'payroll_runs.view', featureFlag: 'payroll_enabled' },
      { label: 'Salary Slips', href: '/payroll', icon: ICONS.salarySlips, requiredPermission: 'payroll.view', featureFlag: 'payroll_enabled' },
      { label: 'Components', href: '/salary-components', icon: ICONS.expenseTaxes, requiredPermission: 'salary_components.view', featureFlag: 'payroll_enabled' },
      { label: 'Structures', href: '/salary-structures', icon: ICONS.leavePolicies, requiredPermission: 'salary_structures.view', featureFlag: 'payroll_enabled' },
      { label: 'Assignments', href: '/salary-structure-assignments', icon: ICONS.leaveAdjust, requiredPermission: 'salary_structure_assignments.view', featureFlag: 'payroll_enabled' },
      { label: 'Payroll Periods', href: '/payroll-periods', icon: ICONS.leaves, requiredPermission: 'payroll_periods.view', featureFlag: 'payroll_enabled' },
      { label: 'Corrections', href: '/payroll-corrections', icon: ICONS.hrSettings, requiredPermission: 'payroll_corrections.view', featureFlag: 'payroll_enabled' },
      { label: 'Incentives', href: '/employee-incentives', icon: ICONS.appraisals, requiredPermission: 'employee_incentives.view', featureFlag: 'payroll_enabled' },
      { label: 'Gratuity', href: '/gratuity', icon: ICONS.costCenters, requiredPermission: 'gratuity.view', featureFlag: 'payroll_enabled' },
    ],
  },
  {
    label: 'Recruitment',
    icon: 'custom:recruitment',
    items: [
      { label: 'Dashboard', href: '/recruitment/dashboard', icon: ICONS.dashboard, requiredPermission: 'recruitment.view', featureFlag: 'recruitment_enabled' },
      { label: 'Job Openings', href: '/recruitment/job-openings', icon: ICONS.recruitment, requiredPermission: 'job_openings.view', featureFlag: 'recruitment_enabled' },
      { label: 'Pipeline', href: '/recruitment/pipeline', icon: ICONS.pipeline, requiredPermission: 'recruitment.view', featureFlag: 'recruitment_enabled' },
      { label: 'Stages', href: '/recruitment/stages', icon: ICONS.pipeline, requiredPermission: 'recruitment.view', featureFlag: 'recruitment_enabled' },
      { label: 'Referrals', href: '/referrals', icon: ICONS.referrals, requiredPermission: 'referrals.view', featureFlag: 'recruitment_enabled' },
      { label: 'Interview Types', href: '/interview-types', icon: ICONS.interviewTypes, requiredPermission: 'interview_types.view', featureFlag: 'recruitment_enabled' },
      { label: 'Job Templates', href: '/job-templates', icon: ICONS.jobTemplates, requiredPermission: 'job_templates.view', featureFlag: 'recruitment_enabled' },
    ],
  },
  {
    label: 'Performance',
    icon: 'custom:performance',
    items: [
      { label: 'Dashboard', href: '/performance/dashboard', icon: ICONS.dashboard, requiredPermission: 'appraisals.view', requiredAnyPermission: ['appraisals.view', 'goals.view', 'kras.view', 'performance_feedback.view'], featureFlag: 'appraisals_enabled' },
      { label: 'Appraisals', href: '/appraisals', icon: ICONS.appraisals, requiredPermission: 'appraisals.view', featureFlag: 'appraisals_enabled' },
      { label: 'KRAs', href: '/kras', icon: ICONS.kras, requiredPermission: 'kras.view', featureFlag: 'appraisals_enabled' },
      { label: 'Templates', href: '/appraisal-templates', icon: ICONS.jobTemplates, requiredPermission: 'appraisal_templates.view', featureFlag: 'appraisals_enabled' },
      { label: 'Goals', href: '/goals', icon: ICONS.goals, requiredPermission: 'goals.view', featureFlag: 'appraisals_enabled' },
      { label: 'Feedback', href: '/performance-feedback', icon: ICONS.feedback, requiredPermission: 'performance_feedback.view', featureFlag: 'appraisals_enabled' },
    ],
  },
  {
    label: 'Expenses',
    icon: 'custom:expenses',
    items: [
      { label: 'My Expenses', href: '/expenses', icon: ICONS.expenses, requiredPermission: 'expenses.view', featureFlag: 'expenses_enabled' },
      { label: 'Expense Approvals', href: '/expenses/approvals', icon: ICONS.expenseApprovals, requiredPermission: 'expense_approvals.view', featureFlag: 'expenses_enabled' },
      { label: 'Expense Types', href: '/expense-types', icon: ICONS.expenseTypes, requiredPermission: 'expense_types.view', featureFlag: 'expenses_enabled' },
      { label: 'Expense Taxes', href: '/expense-taxes', icon: ICONS.expenseTaxes, requiredPermission: 'expense_taxes.view', featureFlag: 'expenses_enabled' },
    ],
  },
  {
    label: 'Learning',
    icon: 'custom:learning',
    items: [
      { label: 'Onboarding', href: '/onboarding', icon: ICONS.onboarding, requiredPermission: 'onboarding.view' },
      { label: 'Onboarding Templates', href: '/onboarding-templates', icon: ICONS.onboardingTemplates, requiredPermission: 'onboarding_templates.view' },
      { label: 'Onboarding Tracking', href: '/onboarding-tracking', icon: ICONS.onboardingTracking, requiredPermission: 'onboarding_tracking.view' },
      { label: 'Training', href: '/training', icon: ICONS.training, requiredPermission: 'training.view', featureFlag: 'training_enabled' },
      { label: 'Training Programs', href: '/training-programs', icon: ICONS.trainingPrograms, requiredPermission: 'training_programs.view', featureFlag: 'training_enabled' },
      { label: 'Training Results', href: '/training-results', icon: ICONS.trainingResults, requiredPermission: 'training_results.view', featureFlag: 'training_enabled' },
    ],
  },
  {
    label: 'More',
    icon: 'custom:more',
    items: [
      { label: 'Grievances', href: '/grievances', icon: ICONS.grievances, requiredPermission: 'grievances.view', requiredAnyPermission: ['grievances.view', 'grievances.create'], featureFlag: null },
      { label: 'Grievance Types', href: '/grievance-types', icon: ICONS.grievanceTypes, requiredPermission: 'grievance_types.view' },
      { label: 'Travel', href: '/travel', icon: ICONS.travel, requiredPermission: 'travel.view', featureFlag: 'travel_enabled' },
      { label: 'Overtime', href: '/overtime', icon: ICONS.overtime, requiredPermission: 'overtime.view', featureFlag: null },
      { label: 'Overtime Types', href: '/overtime-types', icon: ICONS.overtimeTypes, requiredPermission: 'overtime_types.view' },
      { label: 'Overtime Categories', href: '/overtime-categories', icon: ICONS.overtimeTypes, requiredPermission: 'overtime_categories.view' },
      { label: 'Settlements', href: '/settlements', icon: ICONS.settlements, requiredPermission: 'settlements.view', featureFlag: 'settlements_enabled' },
      { label: 'Exit Interviews', href: '/exit-interviews', icon: ICONS.exitInterviews, requiredPermission: 'exit_interviews.view', featureFlag: null },
      { label: 'Holiday Assignments', href: '/holiday-assignments', icon: ICONS.holidayAssignments, requiredPermission: 'holiday_assignments.view', featureFlag: null },
      { label: 'Holiday Lists', href: '/holiday-lists', icon: ICONS.holidayLists, requiredPermission: 'holidays.view' },
      { label: 'Health Insurance', href: '/health-insurance', icon: ICONS.healthInsurance, requiredPermission: 'health_insurance.view' },
      { label: 'Cost Centers', href: '/cost-centers', icon: ICONS.costCenters, requiredPermission: 'cost_centers.view' },
      { label: 'Document Types', href: '/document-types', icon: ICONS.documentTypes, requiredPermission: 'document_types.view' },
      { label: 'Employee Documents', href: '/employee-documents', icon: ICONS.employeeDocuments, requiredPermission: 'documents.view' },
      { label: 'Document Requests', href: '/document-requests', icon: ICONS.employeeDocuments, requiredPermission: 'document_requests.view', requiredAnyPermission: ['document_requests.view', 'documents.view'] },
      { label: 'Appointment Letters', href: '/appointment-letters', icon: ICONS.appointmentLetters, requiredPermission: 'appointment_letters.view' },
      { label: 'Policies', href: '/policies', icon: ICONS.policies, requiredPermission: 'policies.view', requiredAnyPermission: ['policies.view', 'documents.view'], featureFlag: null },
    ],
  },
  {
    label: 'Help Desk',
    icon: 'custom:help-desk',
    items: [
      {
        label: 'FAQs',
        href: '/helpdesk/faq-categories',
        icon: ICONS.faqs,
        requiredPermission: 'faq_categories.view',
        requiredAnyPermission: ['faq_categories.view', 'faqs.view'],
        featureFlag: null,
      },
      {
        label: 'Helpdesk Tags',
        href: '/settings/helpdesk-tags',
        icon: ICONS.helpdesk,
        requiredPermission: null,
        requiredAnyPermission: null,
        featureFlag: null,
      },
    ],
  },
  {
    label: 'Permissions',
    icon: 'custom:permissions',
    items: [
      { label: 'Dashboard', href: '/permissions/dashboard', icon: ICONS.dashboard, requiredPermission: 'roles.manage', featureFlag: null },
      { label: 'Roles & Permissions', href: '/admin/roles', icon: ICONS.settings, requiredPermission: 'roles.manage', featureFlag: null },
    ],
  },
  {
    label: 'Admin',
    icon: 'custom:admin',
    items: [
      { label: 'Dashboard', href: '/admin/permissions/dashboard', icon: ICONS.dashboard, requiredPermission: 'roles.manage', featureFlag: null },
      { label: 'Roles & Permissions', href: '/admin/roles', icon: ICONS.settings, requiredPermission: 'roles.manage', featureFlag: null },
      { label: 'Settings', href: '/settings/general-settings', icon: ICONS.settings, requiredPermission: 'hr_settings.view', featureFlag: null },
      {
        label: 'HR Settings',
        href: '/hr-settings',
        icon: ICONS.hrSettings,
        requiredPermission: 'roles.manage',
        requiredAnyPermission: ['roles.manage', 'hr_settings.view', 'hr_settings.manage'],
        featureFlag: null,
      },
      { label: 'Audit Logs', href: '/audit-logs', icon: ICONS.auditLogs, requiredPermission: 'roles.manage', requiredAnyPermission: ['roles.manage', 'audit_logs.view'], featureFlag: null },
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
        // Check permission access: any-of list takes precedence when provided.
        if (item.requiredAnyPermission && item.requiredAnyPermission.length > 0) {
          if (!item.requiredAnyPermission.some((p) => hasPermission(p))) return false;
        } else if (!hasPermission(item.requiredPermission)) {
          return false;
        }
        // Check feature flag
        if (item.featureFlag && !hasFeature(item.featureFlag)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}
