/**
 * Application Router
 *
 * Defines all routes for the HRMS frontend with feature-gated and
 * role-gated access. Routes are lazy-loaded for code splitting.
 *
 * Every sidebar link has an explicit route — no wildcard (`/*`) routes.
 * Each path maps directly to the correct page component.
 *
 * Route hierarchy:
 *   ProtectedRoute → AppShell → FeatureGatedRoute → RoleGatedRoute → PageComponent
 *
 * Requirements: 16.1, 16.2, 16.3
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/Layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { FeatureGatedRoute } from './FeatureGatedRoute';
import { RoleGatedRoute } from './RoleGatedRoute';
import { OnboardingGuard } from './OnboardingGuard';
import { RouteErrorBoundary } from '@/components/ErrorBoundary';

// Auth pages (not lazy — needed immediately)
import { AuthCallback } from '@/pages/AuthCallback';

// Login redirect page (not lazy — needed immediately for unauthenticated users)
import Login from '@/pages/Login';

// Auth pages (public, lazy-loaded)
const SetupPassword = lazy(() => import('@/pages/auth/SetupPassword'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));

// Self-onboarding (inside ProtectedRoute but outside OnboardingGuard)
const SelfOnboarding = lazy(() => import('@/pages/onboarding/SelfOnboarding'));

// Public candidate application page
const PublicJobApplyPage = lazy(() => import('@/pages/recruitment/PublicJobApplyPage'));
const CareersEmbedWidget = lazy(() => import('@/pages/recruitment/CareersEmbedWidget'));

// ─── Lazy-loaded page components ─────────────────────────────────────────────

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Employees = lazy(() => import('@/pages/Employees'));
const Departments = lazy(() => import('@/pages/Departments'));
const Designations = lazy(() => import('@/pages/Designations'));
const EmployeeGrades = lazy(() => import('@/pages/EmployeeGrades'));
const DepartmentApprovers = lazy(() => import('@/pages/DepartmentApprovers'));
const Branches = lazy(() => import('@/pages/Branches'));
const EmployeeDetailPage = lazy(() => import('@/pages/employees/EmployeeDetailPage'));
const EmployeeEditPage = lazy(() => import('@/pages/employees/EmployeeEditPage'));
const EmployeeForm = lazy(() => import('@/pages/employees/EmployeeForm').then((m) => ({ default: m.EmployeeForm as React.ComponentType })));
const OrgChart = lazy(() => import('@/pages/employees/OrgChart'));
const Profile = lazy(() => import('@/pages/Profile'));
const Holidays = lazy(() => import('@/pages/Holidays'));
const TaxBenefits = lazy(() => import('@/pages/TaxBenefits'));
const Fleet = lazy(() => import('@/pages/Fleet'));
const Skills = lazy(() => import('@/pages/Skills'));
const Reports = lazy(() => import('@/pages/Reports'));
const Compliance = lazy(() => import('@/pages/Compliance'));
const DailySummary = lazy(() => import('@/pages/DailySummary'));
const Staffing = lazy(() => import('@/pages/Staffing'));

// New module pages
const CompanyLeaves = lazy(() => import('@/pages/CompanyLeaves'));
const LeavePolicies = lazy(() => import('@/pages/LeavePolicies'));
const LeavePolicyAssignments = lazy(() => import('@/pages/LeavePolicyAssignments'));
const LeaveBlockLists = lazy(() => import('@/pages/LeaveBlockLists'));
const LeaveAdjustments = lazy(() => import('@/pages/LeaveAdjustments'));
const EarnedLeaveSchedules = lazy(() => import('@/pages/EarnedLeaveSchedules'));
const LossOfPay = lazy(() => import('@/pages/LossOfPay'));
const ShiftRequests = lazy(() => import('@/pages/ShiftRequests'));
const ShiftSchedules = lazy(() => import('@/pages/ShiftSchedules'));
const AttendanceRequests = lazy(() => import('@/pages/AttendanceRequests'));
const AttendanceUpload = lazy(() => import('@/pages/AttendanceUpload'));
const GeoFenceLocations = lazy(() => import('@/pages/GeoFenceLocations'));
const KRAs = lazy(() => import('@/pages/KRAs'));
const AppraisalTemplates = lazy(() => import('@/pages/AppraisalTemplates'));
const Goals = lazy(() => import('@/pages/Goals'));
const PerformanceFeedback = lazy(() => import('@/pages/PerformanceFeedback'));
const ExitInterviews = lazy(() => import('@/pages/ExitInterviews'));
const GrievanceTypes = lazy(() => import('@/pages/GrievanceTypes'));
const OvertimeTypes = lazy(() => import('@/pages/OvertimeTypes'));
const OvertimeCategories = lazy(() => import('@/pages/OvertimeCategories'));
const PayrollPeriods = lazy(() => import('@/pages/PayrollPeriods'));
const PayrollCorrections = lazy(() => import('@/pages/PayrollCorrections'));
const HolidayListAssignments = lazy(() => import('@/pages/HolidayListAssignments'));
const HolidayLists = lazy(() => import('@/pages/HolidayLists'));
const InterviewTypes = lazy(() => import('@/pages/InterviewTypes'));
const TrainingPrograms = lazy(() => import('@/pages/TrainingPrograms'));
const TrainingResults = lazy(() => import('@/pages/TrainingResults'));
const JobOpeningTemplates = lazy(() => import('@/pages/JobOpeningTemplates'));
const EmployeeReferrals = lazy(() => import('@/pages/EmployeeReferrals'));
const EmployeeHealthInsurance = lazy(() => import('@/pages/EmployeeHealthInsurance'));
const EmployeeCostCenters = lazy(() => import('@/pages/EmployeeCostCenters'));
const DocumentTypes = lazy(() => import('@/pages/DocumentTypes'));
const EmployeeDocuments = lazy(() => import('@/pages/EmployeeDocuments'));
const DocumentRequests = lazy(() => import('@/pages/DocumentRequests'));
const ExpenseTaxes = lazy(() => import('@/pages/ExpenseTaxes'));
const ExpenseTypes = lazy(() => import('@/pages/ExpenseTypes'));
const EmployeeIncentives = lazy(() => import('@/pages/EmployeeIncentives'));
const Transfers = lazy(() => import('@/pages/Transfers'));
const Promotions = lazy(() => import('@/pages/Promotions'));
const Gratuity = lazy(() => import('@/pages/Gratuity'));
const AppointmentLetters = lazy(() => import('@/pages/AppointmentLetters'));
const Policies = lazy(() => import('@/pages/Policies'));
const HRSettings = lazy(() => import('@/pages/HRSettings'));
const Meetings = lazy(() => import('@/pages/Meetings'));
const EmployeeBonusPoints = lazy(() => import('@/pages/EmployeeBonusPoints'));
const AuditLogs = lazy(() => import('@/pages/AuditLogs'));

// Settings Module
const SettingsLayout = lazy(() => import('@/pages/settings/SettingsLayout').then(m => ({ default: m.SettingsLayout })));
const GeneralSettingsTab = lazy(() => import('@/pages/settings/GeneralSettingsTab').then(m => ({ default: m.GeneralSettingsTab })));
const PrefixNamingSeriesTab = lazy(() => import('@/pages/settings/PrefixNamingSeriesTab').then(m => ({ default: m.PrefixNamingSeriesTab })));
const DateTimeFormatTab = lazy(() => import('@/pages/settings/DateTimeFormatTab').then(m => ({ default: m.DateTimeFormatTab })));
const MailServerTab = lazy(() => import('@/pages/settings/MailServerTab').then(m => ({ default: m.MailServerTab })));
const AccessibilityTab = lazy(() => import('@/pages/settings/AccessibilityTab').then(m => ({ default: m.AccessibilityTab })));
const CompanyProfileTab = lazy(() => import('@/pages/settings/CompanyProfileTab').then(m => ({ default: m.CompanyProfileTab })));
const EmployeePermissionTab = lazy(() => import('@/pages/settings/EmployeePermissionTab').then(m => ({ default: m.EmployeePermissionTab })));
const HistoryTagsTab = lazy(() => import('@/pages/settings/HistoryTagsTab').then(m => ({ default: m.HistoryTagsTab })));
const GdriveBackupTab = lazy(() => import('@/pages/settings/GdriveBackupTab').then(m => ({ default: m.GdriveBackupTab })));
const EmploymentTypesTab = lazy(() => import('@/pages/settings/SecondarySettingsTabs').then(m => ({ default: m.EmploymentTypesTab })));
const CandidateSelfTrackingTab = lazy(() => import('@/pages/settings/CandidateSelfTrackingTab').then(m => ({ default: m.CandidateSelfTrackingTab })));
const CandidateRejectReasonTab = lazy(() => import('@/pages/settings/CandidateRejectReasonTab').then(m => ({ default: m.CandidateRejectReasonTab })));
const CareersWidgetTab = lazy(() => import('@/pages/settings/CareersWidgetTab').then(m => ({ default: m.CareersWidgetTab })));
const LinkedinIntegrationTab = lazy(() => import('@/pages/settings/LinkedinIntegrationTab').then(m => ({ default: m.LinkedinIntegrationTab })));
const WorkTypeTab = lazy(() => import('@/pages/settings/WorkTypeTab').then(m => ({ default: m.WorkTypeTab })));
const LeaveTypeTab = lazy(() => import('@/pages/settings/LeaveTypeTab').then(m => ({ default: m.LeaveTypeTab })));
const EmployeeTypeTab = lazy(() => import('@/pages/settings/EmployeeTypeTab').then(m => ({ default: m.EmployeeTypeTab })));
const RotatingWorkTypeTab = lazy(() => import('@/pages/settings/RotatingWorkTypeTab').then(m => ({ default: m.RotatingWorkTypeTab })));
const RotatingShiftTab = lazy(() => import('@/pages/settings/RotatingShiftTab').then(m => ({ default: m.RotatingShiftTab })));
const DisciplinaryActionTypeTab = lazy(() => import('@/pages/settings/DisciplinaryActionTypeTab').then(m => ({ default: m.DisciplinaryActionTypeTab })));
const TrackLateComeEarlyOutTab = lazy(() => import('@/pages/settings/TrackLateComeEarlyOutTab').then(m => ({ default: m.TrackLateComeEarlyOutTab })));
const AttendanceBreakPointTab = lazy(() => import('@/pages/settings/AttendanceBreakPointTab').then(m => ({ default: m.AttendanceBreakPointTab })));
const GraceTimeTab = lazy(() => import('@/pages/settings/GraceTimeTab').then(m => ({ default: m.GraceTimeTab })));
const RestrictPastLeaveTab = lazy(() => import('@/pages/settings/RestrictPastLeaveTab').then(m => ({ default: m.RestrictPastLeaveTab })));
const CompensatoryLeaveSettingsTab = lazy(() => import('@/pages/settings/CompensatoryLeaveSettingsTab').then(m => ({ default: m.CompensatoryLeaveSettingsTab })));
const AutoPayslipSettingsTab = lazy(() => import('@/pages/settings/AutoPayslipSettingsTab').then(m => ({ default: m.AutoPayslipSettingsTab })));
const BonusPointSettingTab = lazy(() => import('@/pages/settings/BonusPointSettingTab').then(m => ({ default: m.BonusPointSettingTab })));
const HelpdeskTagsTab = lazy(() => import('@/pages/settings/HelpdeskTagsTab').then(m => ({ default: m.HelpdeskTagsTab })));

// Module-specific Dashboards
const RecruitmentDashboard = lazy(() => import('@/pages/recruitment/RecruitmentDashboard'));
const AttendanceDashboard = lazy(() => import('@/pages/attendance/AttendanceDashboard'));
const LeaveDashboard = lazy(() => import('@/pages/leaves/LeaveDashboard'));
const PayrollDashboard = lazy(() => import('@/pages/payroll/PayrollDashboard'));
const PerformanceDashboard = lazy(() => import('@/pages/performance/PerformanceDashboard'));

// Leaves — direct component imports (no sub-routing in Leaves.tsx)
const MyLeaves = lazy(() => import('@/pages/leaves/MyLeaves'));
const LeaveApply = lazy(() => import('@/pages/leaves/LeaveApply').then((m) => ({ default: m.LeaveApply })));
const LeaveApprovals = lazy(() => import('@/pages/leaves/LeaveApprovals').then((m) => ({ default: m.LeaveApprovals })));
const CompensatoryLeave = lazy(() => import('@/pages/CompensatoryLeave'));

// Attendance
const Attendance = lazy(() => import('@/pages/Attendance'));
const AttendanceRegister = lazy(() => import('@/pages/AttendanceRegister'));
const MyAttendanceHistory = lazy(() => import('@/pages/attendance/MyAttendanceHistory'));
const HourAccount = lazy(() => import('@/pages/HourAccount'));
const WorkRecords = lazy(() => import('@/pages/WorkRecords'));

// Shifts — direct component imports (no sub-routing in Shifts.tsx)
const Shifts = lazy(() => import('@/pages/Shifts'));
const ShiftTypes = lazy(() => import('@/pages/ShiftTypes'));

// Payroll — direct component imports
const PayslipViewer = lazy(() => import('@/pages/payroll/PayslipViewer').then((m) => ({ default: m.PayslipViewer })));
const PayrollRuns = lazy(() => import('@/pages/payroll/PayrollRuns').then((m) => ({ default: m.PayrollRuns })));
const SalaryComponents = lazy(() => import('@/pages/SalaryComponents'));
const SalaryStructures = lazy(() => import('@/pages/SalaryStructures'));
const SalaryStructureAssignments = lazy(() => import('@/pages/SalaryStructureAssignments'));

// Recruitment — direct component imports
const Recruitment = lazy(() => import('@/pages/Recruitment'));
const RecruitmentPipeline = lazy(() => import('@/pages/recruitment/RecruitmentPipeline').then((m) => ({ default: m.RecruitmentPipeline })));
const RecruitmentStages = lazy(() => import('@/pages/recruitment/RecruitmentStages'));

// Appraisals — direct component imports
const AppraisalCycles = lazy(() => import('@/pages/appraisals/AppraisalCycles').then((m) => ({ default: m.AppraisalCycles })));
const AppraisalDetail = lazy(() => import('@/pages/appraisals/AppraisalDetail').then((m) => ({ default: m.AppraisalDetail })));

// Expenses — direct component imports
const ExpenseList = lazy(() => import('@/pages/expenses/ExpenseList').then((m) => ({ default: m.ExpenseList })));
const ExpenseSubmit = lazy(() => import('@/pages/expenses/ExpenseSubmit').then((m) => ({ default: m.ExpenseSubmit })));
const ExpenseApprovals = lazy(() => import('@/pages/expenses/ExpenseApprovals').then((m) => ({ default: m.ExpenseApprovals })));

// Onboarding
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const OnboardingTemplates = lazy(() => import('@/pages/OnboardingTemplates'));
const OnboardingTracking = lazy(() => import('@/pages/onboarding/OnboardingTracking').then((m) => ({ default: m.OnboardingTracking as React.ComponentType })));

// Training
const Training = lazy(() => import('@/pages/Training'));

// Grievances
const GrievanceList = lazy(() => import('@/pages/grievances/GrievanceList').then((m) => ({ default: m.GrievanceList })));

// Travel
const TravelApprovals = lazy(() => import('@/pages/travel/TravelApprovals').then((m) => ({ default: m.TravelApprovals })));

// Overtime
const OvertimeApprovals = lazy(() => import('@/pages/overtime/OvertimeApprovals').then((m) => ({ default: m.OvertimeApprovals })));

// Settlements
const SettlementWorkflow = lazy(() => import('@/pages/settlements/SettlementWorkflow').then((m) => ({ default: m.SettlementWorkflow })));

// Help Desk
const FAQCategories = lazy(() => import('@/pages/helpdesk/FAQCategories'));
const FAQs = lazy(() => import('@/pages/helpdesk/FAQs'));

// Admin
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'));
const CreateRolePage = lazy(() => import('@/pages/admin/CreateRolePage'));
const RoleDetailPage = lazy(() => import('@/pages/admin/RoleDetailPage'));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Loading fallback for lazy-loaded route chunks */
function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
    </div>
  );
}

/** Helper to wrap a page in FeatureGatedRoute + RoleGatedRoute + OnboardingGuard */
function gated(
  featureFlag: string,
  moduleName: string,
  requiredPermission: string,
  element: React.ReactNode,
) {
  return (
    <OnboardingGuard>
      <FeatureGatedRoute featureFlag={featureFlag} moduleName={moduleName}>
        <RoleGatedRoute requiredPermission={requiredPermission}>
          {element}
        </RoleGatedRoute>
      </FeatureGatedRoute>
    </OnboardingGuard>
  );
}

/** Helper for routes without a feature gate but with permission gating + OnboardingGuard */
function permGated(requiredPermission: string, element: React.ReactNode) {
  return (
    <OnboardingGuard>
      <RoleGatedRoute requiredPermission={requiredPermission}>
        {element}
      </RoleGatedRoute>
    </OnboardingGuard>
  );
}

/** Like permGated(), but grants access if the user has ANY of the given permissions. */
function permGatedAny(requiredAnyPermission: string[], element: React.ReactNode) {
  return (
    <OnboardingGuard>
      <RoleGatedRoute requiredAnyPermission={requiredAnyPermission}>
        {element}
      </RoleGatedRoute>
    </OnboardingGuard>
  );
}

/** Like gated(), but grants access if the user has ANY of the given permissions. */
function gatedAny(
  featureFlag: string,
  moduleName: string,
  requiredAnyPermission: string[],
  element: React.ReactNode,
) {
  return (
    <OnboardingGuard>
      <FeatureGatedRoute featureFlag={featureFlag} moduleName={moduleName}>
        <RoleGatedRoute requiredAnyPermission={requiredAnyPermission}>
          {element}
        </RoleGatedRoute>
      </FeatureGatedRoute>
    </OnboardingGuard>
  );
}

// ─── Router Definition ───────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // Auth callback (outside protected shell)
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },

  // Login page — branded redirect to Identity Center
  {
    path: '/login',
    element: <Login />,
  },

  // Public auth pages (outside ProtectedRoute — user is not authenticated)
  {
    path: '/auth/setup-password',
    element: <Suspense fallback={<PageLoader />}><SetupPassword /></Suspense>,
  },
  {
    path: '/auth/forgot-password',
    element: <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>,
  },
  {
    path: '/auth/reset-password',
    element: <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>,
  },

  // Public candidate job application page (zero authentication required)
  {
    path: '/careers/apply/:jobId',
    element: <Suspense fallback={<PageLoader />}><PublicJobApplyPage /></Suspense>,
  },
  // Public careers embed widget & public careers portal (Method 2 integration)
  {
    path: '/careers/embed',
    element: <Suspense fallback={<PageLoader />}><CareersEmbedWidget /></Suspense>,
  },
  {
    path: '/careers',
    element: <Suspense fallback={<PageLoader />}><CareersEmbedWidget /></Suspense>,
  },

  // Self-Onboarding — protected but NO sidebar/header (outside AppShell)
  {
    path: '/onboarding/self',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <SelfOnboarding />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // Protected app routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      // Redirect root to dashboard
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // ─── Dashboard ───────────────────────────────────────────────
      {
        path: 'dashboard',
        element: permGated('dashboard.view', <Dashboard />),
      },

      // ─── Profile ─────────────────────────────────────────────────
      {
        path: 'profile',
        element: <Profile />,
      },

      // ─── Employees ───────────────────────────────────────────────
      {
        path: 'employees',
        element: gated('employees_enabled', 'Employees', 'employees.view', <Employees />),
      },
      {
        path: 'org-chart',
        element: gated('employees_enabled', 'Employees', 'employees.view', <OrgChart />),
      },
      {
        path: 'employees/new',
        element: gated('employees_enabled', 'Employees', 'employees.create', <EmployeeForm />),
      },
      {
        path: 'employees/:id/edit',
        element: gated('employees_enabled', 'Employees', 'employees.edit', <EmployeeEditPage />),
      },
      {
        path: 'employees/:id',
        element: gated('employees_enabled', 'Employees', 'employees.view', <EmployeeDetailPage />),
      },
      {
        path: 'departments',
        element: gated('employees_enabled', 'Employees', 'departments.view', <Departments />),
      },
      {
        path: 'designations',
        element: gated('employees_enabled', 'Employees', 'designations.view', <Designations />),
      },
      {
        path: 'employee-grades',
        element: gated('employees_enabled', 'Employees', 'employee_grades.view', <EmployeeGrades />),
      },
      {
        path: 'department-approvers',
        element: gated('employees_enabled', 'Employees', 'department_approvers.view', <DepartmentApprovers />),
      },
      {
        path: 'branches',
        element: gated('employees_enabled', 'Employees', 'branches.view', <Branches />),
      },
      {
        path: 'meetings',
        element: permGated('meetings.view', <Meetings />),
      },
      {
        path: 'employee-bonus-points',
        element: permGated('bonus_points.view', <EmployeeBonusPoints />),
      },

      // ─── Leaves (explicit sub-routes, no wildcard) ─────────────
      {
        path: 'leaves/dashboard',
        element: gated('leaves_enabled', 'Leave Dashboard', 'leaves.view', <LeaveDashboard />),
      },
      {
        path: 'my-leaves',
        element: gated('leaves_enabled', 'My Leaves', 'leaves.view', <MyLeaves />),
      },
      {
        path: 'my-leaves/apply',
        element: gated('leaves_enabled', 'Leave Management', 'leaves.view', <LeaveApply />),
      },
      {
        path: 'leaves',
        element: <Navigate to="/my-leaves" replace />,
      },
      {
        path: 'leaves/apply',
        element: <Navigate to="/my-leaves/apply" replace />,
      },
      {
        path: 'leaves/approvals',
        element: gated('leaves_enabled', 'Leave Management', 'leave_approvals.view', <LeaveApprovals />),
      },
      {
        path: 'leaves/compensatory',
        element: gated('leaves_enabled', 'Compensatory Leave', 'compensatory_leave.view', <CompensatoryLeave />),
      },
      {
        path: 'compensatory-leave',
        element: gated('leaves_enabled', 'Compensatory Leave', 'compensatory_leave.view', <CompensatoryLeave />),
      },

      // ─── Attendance ──────────────────────────────────────────────
      {
        path: 'attendance/dashboard',
        element: gated('attendance_enabled', 'Attendance Dashboard', 'attendance.view', <AttendanceDashboard />),
      },
      {
        path: 'attendance',
        element: gated('attendance_enabled', 'Attendance', 'attendance.view', <Attendance />),
      },
      {
        path: 'attendance/hour-account',
        element: gated('attendance_enabled', 'Hour Account', 'hour_account.view', <HourAccount />),
      },
      {
        path: 'attendance/attendance-overtime-view',
        element: gated('attendance_enabled', 'Hour Account', 'hour_account.view', <HourAccount />),
      },
      {
        path: 'attendance/work-records',
        element: gated('attendance_enabled', 'Work Records', 'work_records.view', <WorkRecords />),
      },
      {
        path: 'work-records',
        element: gated('attendance_enabled', 'Work Records', 'work_records.view', <WorkRecords />),
      },
      {
        path: 'my-attendance',
        element: gated('attendance_enabled', 'My Attendance', 'my_attendance.view', <MyAttendanceHistory />),
      },
      {
        path: 'attendance-register',
        element: gated('attendance_enabled', 'Attendance Register', 'attendance_register.view', <AttendanceRegister />),
      },

      // ─── Shifts ──────────────────────────────────────────────────
      {
        path: 'shifts',
        element: gatedAny('shifts_enabled', 'Shift Management', ['shifts.view_own', 'shifts.view_team'], <Shifts />),
      },
      {
        path: 'shift-types',
        element: gated('shifts_enabled', 'Shift Types', 'shift_types.view', <ShiftTypes />),
      },

      // ─── Payroll (explicit sub-routes, no wildcard) ────────────
      {
        path: 'payroll/dashboard',
        element: gated('payroll_enabled', 'Payroll Dashboard', 'payroll.view', <PayrollDashboard />),
      },
      {
        path: 'payroll',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <PayslipViewer />),
      },
      {
        path: 'payroll/runs',
        element: gated('payroll_enabled', 'Payroll', 'payroll_runs.view', <PayrollRuns />),
      },
      {
        path: 'salary-components',
        element: gated('payroll_enabled', 'Payroll', 'salary_components.view', <SalaryComponents />),
      },
      {
        path: 'salary-structures',
        element: gated('payroll_enabled', 'Payroll', 'salary_structures.view', <SalaryStructures />),
      },
      {
        path: 'salary-structure-assignments',
        element: gated('payroll_enabled', 'Payroll', 'salary_structure_assignments.view', <SalaryStructureAssignments />),
      },

      // ─── Recruitment (explicit sub-routes, no wildcard) ────────
      {
        path: 'recruitment/dashboard',
        element: gated('recruitment_enabled', 'Recruitment Dashboard', 'recruitment.view', <RecruitmentDashboard />),
      },
      {
        path: 'recruitment',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <Recruitment />),
      },
      {
        path: 'recruitment/job-openings',
        element: gated('recruitment_enabled', 'Recruitment', 'job_openings.view', <Recruitment />),
      },
      {
        path: 'recruitment/candidates',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <Recruitment />),
      },
      {
        path: 'recruitment/interviews',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <Recruitment />),
      },
      {
        path: 'recruitment/pipeline',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <RecruitmentPipeline />),
      },
      {
        path: 'recruitment/stages',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <RecruitmentStages />),
      },

      // ─── Appraisals (explicit sub-routes, no wildcard) ─────────
      {
        path: 'appraisals',
        element: gated('appraisals_enabled', 'Appraisals', 'appraisals.view', <AppraisalCycles />),
      },
      {
        path: 'appraisals/:id',
        element: gated('appraisals_enabled', 'Appraisals', 'appraisals.view', <AppraisalDetail />),
      },

      // ─── Expenses (explicit sub-routes, no wildcard) ───────────
      {
        path: 'expenses',
        element: gated('expenses_enabled', 'Expense Management', 'expenses.view', <ExpenseList />),
      },
      {
        path: 'expenses/new',
        element: gated('expenses_enabled', 'Expense Management', 'expenses.view', <ExpenseSubmit />),
      },
      {
        path: 'expenses/approvals',
        element: gated('expenses_enabled', 'Expense Management', 'expense_approvals.view', <ExpenseApprovals />),
      },

      // ─── Onboarding ──────────────────────────────────────────────
      {
        path: 'onboarding',
        element: permGated('onboarding.view', <Onboarding />),
      },
      {
        path: 'onboarding-templates',
        element: permGated('onboarding_templates.view', <OnboardingTemplates />),
      },
      {
        path: 'onboarding-tracking',
        element: permGated('onboarding_tracking.view', <OnboardingTracking />),
      },

      // ─── Training ────────────────────────────────────────────────
      {
        path: 'training',
        element: gated('training_enabled', 'Training', 'training.view', <Training />),
      },

      // ─── Grievances ──────────────────────────────────────────────
      {
        path: 'grievances',
        element: (
          <OnboardingGuard>
            <RoleGatedRoute requiredAnyPermission={['grievances.view', 'grievances.create']}>
              <GrievanceList />
            </RoleGatedRoute>
          </OnboardingGuard>
        ),
      },
      {
        path: 'grievance-types',
        element: permGated('grievance_types.view', <GrievanceTypes />),
      },

      // ─── Travel ──────────────────────────────────────────────────
      {
        path: 'travel',
        element: gated('travel_enabled', 'Travel Requests', 'travel.view', <TravelApprovals />),
      },

      // ─── Overtime ────────────────────────────────────────────────
      {
        path: 'overtime',
        element: permGated('overtime.view', <OvertimeApprovals />),
      },
      {
        path: 'overtime-types',
        element: permGated('overtime_types.view', <OvertimeTypes />),
      },
      {
        path: 'overtime-categories',
        element: permGated('overtime_categories.view', <OvertimeCategories />),
      },

      // ─── Settlements ─────────────────────────────────────────────
      {
        path: 'settlements',
        element: gated('settlements_enabled', 'Settlements', 'settlements.view', <SettlementWorkflow />),
      },

      // ─── Supporting Modules ────────────────────────────────────
      {
        path: 'holidays',
        element: gated('holidays_enabled', 'Holiday Lists', 'holidays.view', <Holidays />),
      },
      {
        path: 'tax-benefits',
        element: gated('tax_benefits_enabled', 'Tax & Benefits', 'payroll.view', <TaxBenefits />),
      },
      {
        path: 'fleet',
        element: gated('fleet_enabled', 'Fleet Management', 'employees.view', <Fleet />),
      },
      {
        path: 'skills',
        element: gated('skills_enabled', 'Skills', 'employees.view', <Skills />),
      },
      {
        path: 'reports',
        element: gated('reports_enabled', 'Reports', 'employees.view', <Reports />),
      },
      {
        path: 'compliance',
        element: gated('compliance_enabled', 'Compliance', 'employees.view', <Compliance />),
      },
      {
        path: 'daily-summary',
        element: gated('daily_summary_enabled', 'Daily Work Summary', 'employees.view', <DailySummary />),
      },
      {
        path: 'staffing',
        element: gated('staffing_enabled', 'Staffing Plans', 'employees.view', <Staffing />),
      },

      // ─── Leave Policies & Configuration ────────────────────────
      {
        path: 'leave-policies',
        element: gated('leaves_enabled', 'Leave Management', 'leave_policies.view', <LeavePolicies />),
      },
      {
        path: 'leave-policy-assignments',
        element: gated('leaves_enabled', 'Leave Management', 'leave_policy_assignments.view', <LeavePolicyAssignments />),
      },
      {
        path: 'leave-block-lists',
        element: gated('leaves_enabled', 'Leave Management', 'leave_block_lists.view', <LeaveBlockLists />),
      },
      {
        path: 'leave-adjustments',
        element: gated('leaves_enabled', 'Leave Management', 'leave_adjustments.view', <LeaveAdjustments />),
      },
      {
        path: 'earned-leave-schedules',
        element: gated('leaves_enabled', 'Leave Management', 'earned_leave_schedules.view', <EarnedLeaveSchedules />),
      },
      {
        path: 'loss-of-pay',
        element: gated('leaves_enabled', 'Leave Management', 'loss_of_pay.view', <LossOfPay />),
      },
      {
        path: 'company-leaves',
        element: gated('leaves_enabled', 'Company Leaves', 'leaves.view', <CompanyLeaves />),
      },
      {
        path: 'leaves/company-leaves',
        element: gated('leaves_enabled', 'Company Leaves', 'leaves.view', <CompanyLeaves />),
      },

      // ─── Shift Requests & Schedules ────────────────────────────
      {
        path: 'shift-requests',
        element: gated('shifts_enabled', 'Shift Management', 'shift_requests.view', <ShiftRequests />),
      },
      {
        path: 'shift-schedules',
        element: gated('shifts_enabled', 'Shift Management', 'shift_schedules.view', <ShiftSchedules />),
      },

      // ─── Attendance Requests & Upload ──────────────────────────
      {
        path: 'attendance-requests',
        element: gated('attendance_enabled', 'Attendance', 'attendance_requests.view', <AttendanceRequests />),
      },
      {
        path: 'attendance-upload',
        element: gated('attendance_enabled', 'Attendance', 'attendance_upload.manage', <AttendanceUpload />),
      },
      {
        path: 'geofence-locations',
        element: gated('attendance_enabled', 'Attendance', 'geofence_locations.view', <GeoFenceLocations />),
      },

      // ─── Performance: Dashboard, KRAs, Templates, Goals, Feedback ─────────
      {
        path: 'performance/dashboard',
        element: gated('appraisals_enabled', 'Performance Dashboard', 'appraisals.view', <PerformanceDashboard />),
      },
      {
        path: 'pms/dashboard-view',
        element: gated('appraisals_enabled', 'Performance Dashboard', 'appraisals.view', <PerformanceDashboard />),
      },
      {
        path: 'kras',
        element: gated('appraisals_enabled', 'Appraisals', 'kras.view', <KRAs />),
      },
      {
        path: 'appraisal-templates',
        element: gated('appraisals_enabled', 'Appraisals', 'appraisal_templates.view', <AppraisalTemplates />),
      },
      {
        path: 'goals',
        element: gated('appraisals_enabled', 'Appraisals', 'goals.view', <Goals />),
      },
      {
        path: 'performance-feedback',
        element: gated('appraisals_enabled', 'Appraisals', 'performance_feedback.view', <PerformanceFeedback />),
      },

      // ─── Exit Interviews ───────────────────────────────────────
      {
        path: 'exit-interviews',
        element: permGated('exit_interviews.view', <ExitInterviews />),
      },

      // ─── Payroll Periods & Corrections ─────────────────────────
      {
        path: 'payroll-periods',
        element: gated('payroll_enabled', 'Payroll', 'payroll_periods.view', <PayrollPeriods />),
      },
      {
        path: 'payroll-corrections',
        element: gated('payroll_enabled', 'Payroll', 'payroll_corrections.view', <PayrollCorrections />),
      },

      // ─── Holiday Assignments ───────────────────────────────────
      {
        path: 'holiday-assignments',
        element: gated('holidays_enabled', 'Holiday Lists', 'holiday_assignments.view', <HolidayListAssignments />),
      },
      {
        path: 'holiday-lists',
        element: permGated('holidays.view', <HolidayLists />),
      },

      // ─── Recruitment: Interview Types, Templates, Referrals ────
      {
        path: 'interview-types',
        element: gated('recruitment_enabled', 'Recruitment', 'interview_types.view', <InterviewTypes />),
      },
      {
        path: 'job-templates',
        element: gated('recruitment_enabled', 'Recruitment', 'job_templates.view', <JobOpeningTemplates />),
      },
      {
        path: 'referrals',
        element: gated('recruitment_enabled', 'Recruitment', 'referrals.view', <EmployeeReferrals />),
      },

      // ─── Training Programs & Results ───────────────────────────
      {
        path: 'training-programs',
        element: gated('training_enabled', 'Training', 'training_programs.view', <TrainingPrograms />),
      },
      {
        path: 'training-results',
        element: gated('training_enabled', 'Training', 'training_results.view', <TrainingResults />),
      },

      // ─── Employee Records ──────────────────────────────────────
      {
        path: 'health-insurance',
        element: permGated('health_insurance.view', <EmployeeHealthInsurance />),
      },
      {
        path: 'cost-centers',
        element: permGated('cost_centers.view', <EmployeeCostCenters />),
      },
      {
        path: 'document-types',
        element: permGated('document_types.view', <DocumentTypes />),
      },
      {
        path: 'employee-documents',
        element: permGated('documents.view', <EmployeeDocuments />),
      },
      {
        path: 'document-requests',
        element: permGatedAny(['document_requests.view', 'documents.view'], <DocumentRequests />),
      },

      // ─── Expense Taxes ─────────────────────────────────────────
      {
        path: 'expense-taxes',
        element: gated('expenses_enabled', 'Expense Management', 'expense_taxes.view', <ExpenseTaxes />),
      },
      {
        path: 'expense-types',
        element: gated('expenses_enabled', 'Expense Management', 'expense_types.view', <ExpenseTypes />),
      },

      // ─── Employee Incentives ───────────────────────────────────
      {
        path: 'employee-incentives',
        element: gated('payroll_enabled', 'Payroll', 'employee_incentives.view', <EmployeeIncentives />),
      },

      // ─── Transfers & Promotions ─────────────────────────────────
      {
        path: 'transfers',
        element: gated('employees_enabled', 'Employees', 'transfers.view', <Transfers />),
      },
      {
        path: 'promotions',
        element: gated('employees_enabled', 'Employees', 'promotions.view', <Promotions />),
      },
      {
        path: 'gratuity',
        element: gated('payroll_enabled', 'Payroll', 'gratuity.view', <Gratuity />),
      },
      {
        path: 'appointment-letters',
        element: permGated('appointment_letters.view', <AppointmentLetters />),
      },
      {
        path: 'policies',
        element: permGatedAny(['policies.view', 'documents.view'], <Policies />),
      },
      {
        path: 'hr-settings',
        element: permGatedAny(['hr_settings.view', 'hr_settings.manage', 'roles.manage'], <HRSettings />),
      },
      {
        path: 'user_accessibility',
        element: <Navigate to="/settings/accessibility" replace />,
      },
      {
        path: 'tag-view',
        element: <Navigate to="/settings/history-tags" replace />,
      },
      {
        path: 'tag_view',
        element: <Navigate to="/settings/history-tags" replace />,
      },
      {
        path: 'payroll/auto-payslip-settings-view',
        element: <Navigate to="/settings/auto-payslip" replace />,
      },
      {
        path: 'pms/bonus-point-setting',
        element: <Navigate to="/settings/bonus-point-setting" replace />,
      },
      {
        path: 'pms/bonus_point_setting',
        element: <Navigate to="/settings/bonus-point-setting" replace />,
      },
      {
        path: 'helpdesk/tags',
        element: <Navigate to="/settings/helpdesk-tags" replace />,
      },
      {
        path: 'helpdesk/helpdesk-tags',
        element: <Navigate to="/settings/helpdesk-tags" replace />,
      },
      {
        path: 'settings',
        element: permGated('hr_settings.view', <SettingsLayout />),
        children: [
          { index: true, element: <Navigate to="general-settings" replace /> },
          { path: 'general-settings', element: <GeneralSettingsTab /> },
          { path: 'employee-permission', element: <EmployeePermissionTab /> },
          { path: 'accessibility', element: <AccessibilityTab /> },
          { path: 'user-group', element: <Navigate to="/settings/general-settings" replace /> },
          { path: 'date-time-format', element: <DateTimeFormatTab /> },
          { path: 'date_settings', element: <Navigate to="date-time-format" replace /> },
          { path: 'history-tags', element: <HistoryTagsTab /> },
          { path: 'tag-view', element: <Navigate to="history-tags" replace /> },
          { path: 'tag_view', element: <Navigate to="history-tags" replace /> },
          { path: 'mail-server', element: <MailServerTab /> },
          { path: 'gdrive-backup', element: <GdriveBackupTab /> },
          { path: 'gdrive_backup', element: <Navigate to="gdrive-backup" replace /> },
          { path: 'prefixes', element: <Navigate to="general-settings" replace /> },
          { path: 'company-profile', element: <Navigate to="general-settings" replace /> },
          { path: 'employment-types', element: <Navigate to="general-settings" replace /> },

          // ─── Recruitment Settings ──────────────────────────────────
          { path: 'candidate-self-tracking', element: <CandidateSelfTrackingTab /> },
          { path: 'candidate-reject-reasons', element: <CandidateRejectReasonTab /> },
          { path: 'candidate-reject-reason', element: <Navigate to="candidate-reject-reasons" replace /> },
          { path: 'careers-widget', element: <CareersWidgetTab /> },
          { path: 'skills', element: <Navigate to="candidate-reject-reasons" replace /> },
          { path: 'linkedin-integration', element: <Navigate to="candidate-reject-reasons" replace /> },

          // ─── Employee Settings ─────────────────────────────────────
          { path: 'work-types', element: <WorkTypeTab /> },
          { path: 'work-type', element: <Navigate to="work-types" replace /> },
          { path: 'leave-types', element: <LeaveTypeTab /> },
          { path: 'leave-type', element: <Navigate to="leave-types" replace /> },
          { path: 'employee-types', element: <EmployeeTypeTab /> },
          { path: 'employee-type', element: <Navigate to="employee-types" replace /> },
          { path: 'rotating-work-types', element: <Navigate to="work-types" replace /> },
          { path: 'employee-shifts', element: <Navigate to="work-types" replace /> },
          { path: 'rotating-shifts', element: <Navigate to="work-types" replace /> },
          { path: 'shift-schedules', element: <Navigate to="work-types" replace /> },
          { path: 'disciplinary-action-types', element: <Navigate to="work-types" replace /> },

          // ─── Attendance Settings ───────────────────────────────────
          { path: 'track-late-come-early-out', element: <TrackLateComeEarlyOutTab /> },
          { path: 'late-come-early-out', element: <Navigate to="track-late-come-early-out" replace /> },
          { path: 'attendance-breakpoints', element: <AttendanceBreakPointTab /> },
          { path: 'break-point-condition', element: <Navigate to="attendance-breakpoints" replace /> },
          { path: 'breakpoint-condition', element: <Navigate to="attendance-breakpoints" replace /> },
          { path: 'ip-restrictions', element: <Navigate to="attendance-breakpoints" replace /> },
          { path: 'grace-time', element: <GraceTimeTab /> },

          // ─── Leave Settings ────────────────────────────────────────
          { path: 'restrict-past-leave', element: <RestrictPastLeaveTab /> },
          { path: 'compensatory-leave', element: <CompensatoryLeaveSettingsTab /> },
          { path: 'compensatory-leave-settings', element: <Navigate to="compensatory-leave" replace /> },
          { path: 'leave-policies', element: <Navigate to="restrict-past-leave" replace /> },
          { path: 'holiday-lists', element: <Navigate to="restrict-past-leave" replace /> },

          // ─── Payroll Settings ──────────────────────────────────────
          { path: 'auto-payslip', element: <AutoPayslipSettingsTab /> },
          { path: 'auto-payslip-settings-view', element: <Navigate to="auto-payslip" replace /> },
          { path: 'auto_payslip_settings_view', element: <Navigate to="auto-payslip" replace /> },
          { path: 'salary-components', element: <Navigate to="auto-payslip" replace /> },
          { path: 'salary-structures', element: <Navigate to="auto-payslip" replace /> },
          { path: 'tax-benefits', element: <Navigate to="auto-payslip" replace /> },
          { path: 'payroll-periods', element: <Navigate to="auto-payslip" replace /> },

          // ─── Performance Settings ──────────────────────────────────
          { path: 'bonus-point-setting', element: <BonusPointSettingTab /> },
          { path: 'bonus_point_setting', element: <Navigate to="bonus-point-setting" replace /> },
          { path: 'bonus-point-settings', element: <Navigate to="bonus-point-setting" replace /> },
          { path: 'appraisal-templates', element: <Navigate to="bonus-point-setting" replace /> },
          { path: 'kras', element: <Navigate to="bonus-point-setting" replace /> },
          { path: 'goals', element: <Navigate to="bonus-point-setting" replace /> },
          { path: 'performance-feedback', element: <Navigate to="bonus-point-setting" replace /> },

          // ─── Help Desk Settings ────────────────────────────────────
          { path: 'helpdesk-tags', element: <HelpdeskTagsTab /> },
          { path: 'helpdesk_tags', element: <Navigate to="helpdesk-tags" replace /> },
          { path: 'helpdesk-tag', element: <Navigate to="helpdesk-tags" replace /> },
          { path: 'tags', element: <Navigate to="helpdesk-tags" replace /> },
          { path: 'faq-categories', element: <Navigate to="helpdesk-tags" replace /> },
          { path: 'faqs', element: <Navigate to="helpdesk-tags" replace /> },
        ],
      },

      // ─── Help Desk ──────────────────────────────────────────────
      {
        path: 'helpdesk',
        element: <Navigate to="/helpdesk/faq-categories" replace />,
      },
      {
        path: 'helpdesk/tags',
        element: <Navigate to="/settings/helpdesk-tags" replace />,
      },
      {
        path: 'helpdesk/helpdesk-tags',
        element: <Navigate to="/settings/helpdesk-tags" replace />,
      },
      {
        path: 'helpdesk/faq-categories',
        element: permGatedAny(['faq_categories.view', 'faqs.view'], <FAQCategories />),
      },
      {
        path: 'helpdesk/faqs',
        element: permGatedAny(['faqs.view', 'faq_categories.view'], <FAQs />),
      },
      {
        path: 'helpdesk/faq-view/:categoryId',
        element: permGatedAny(['faqs.view', 'faq_categories.view'], <FAQs />),
      },

      // ─── Admin: Roles & Permissions ────────────────────────────
      {
        path: 'admin/roles',
        element: permGated('roles.manage', <RolesPage />),
      },
      {
        path: 'admin/roles/create',
        element: permGated('roles.manage', <CreateRolePage />),
      },
      {
        path: 'admin/roles/:id',
        element: permGated('roles.manage', <RoleDetailPage />),
      },
      {
        path: 'audit-logs',
        element: permGated('audit_logs.view', <AuditLogs />),
      },
    ],
  },
]);
