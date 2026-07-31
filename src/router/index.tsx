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
const LeavePolicies = lazy(() => import('@/pages/LeavePolicies'));
const LeavePolicyAssignments = lazy(() => import('@/pages/LeavePolicyAssignments'));
const LeaveBlockLists = lazy(() => import('@/pages/LeaveBlockLists'));
const LeaveAdjustments = lazy(() => import('@/pages/LeaveAdjustments'));
const EarnedLeaveSchedules = lazy(() => import('@/pages/EarnedLeaveSchedules'));
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
const PayrollPeriods = lazy(() => import('@/pages/PayrollPeriods'));
const PayrollCorrections = lazy(() => import('@/pages/PayrollCorrections'));
const HolidayListAssignments = lazy(() => import('@/pages/HolidayListAssignments'));
const InterviewTypes = lazy(() => import('@/pages/InterviewTypes'));
const TrainingPrograms = lazy(() => import('@/pages/TrainingPrograms'));
const TrainingResults = lazy(() => import('@/pages/TrainingResults'));
const JobOpeningTemplates = lazy(() => import('@/pages/JobOpeningTemplates'));
const EmployeeReferrals = lazy(() => import('@/pages/EmployeeReferrals'));
const EmployeeHealthInsurance = lazy(() => import('@/pages/EmployeeHealthInsurance'));
const EmployeeCostCenters = lazy(() => import('@/pages/EmployeeCostCenters'));
const DocumentTypes = lazy(() => import('@/pages/DocumentTypes'));
const EmployeeDocuments = lazy(() => import('@/pages/EmployeeDocuments'));
const ExpenseTaxes = lazy(() => import('@/pages/ExpenseTaxes'));
const EmployeeIncentives = lazy(() => import('@/pages/EmployeeIncentives'));
const Transfers = lazy(() => import('@/pages/Transfers'));
const Promotions = lazy(() => import('@/pages/Promotions'));
const Gratuity = lazy(() => import('@/pages/Gratuity'));
const AppointmentLetters = lazy(() => import('@/pages/AppointmentLetters'));
const HRSettings = lazy(() => import('@/pages/HRSettings'));
const AuditLogs = lazy(() => import('@/pages/AuditLogs'));

// Leaves — direct component imports (no sub-routing in Leaves.tsx)
const LeaveList = lazy(() => import('@/pages/leaves/LeaveList').then((m) => ({ default: m.LeaveList })));
const LeaveApply = lazy(() => import('@/pages/leaves/LeaveApply').then((m) => ({ default: m.LeaveApply })));
const LeaveApprovals = lazy(() => import('@/pages/leaves/LeaveApprovals').then((m) => ({ default: m.LeaveApprovals })));

// Attendance
const Attendance = lazy(() => import('@/pages/Attendance'));

// Shifts — direct component imports (no sub-routing in Shifts.tsx)
const Shifts = lazy(() => import('@/pages/Shifts'));

// Payroll — direct component imports
const PayslipViewer = lazy(() => import('@/pages/payroll/PayslipViewer').then((m) => ({ default: m.PayslipViewer })));
const PayrollRuns = lazy(() => import('@/pages/payroll/PayrollRuns').then((m) => ({ default: m.PayrollRuns })));
const SalaryComponents = lazy(() => import('@/pages/SalaryComponents'));
const SalaryStructureAssignments = lazy(() => import('@/pages/SalaryStructureAssignments'));

// Recruitment — direct component imports
const Recruitment = lazy(() => import('@/pages/Recruitment'));
const RecruitmentPipeline = lazy(() => import('@/pages/recruitment/RecruitmentPipeline').then((m) => ({ default: m.RecruitmentPipeline })));

// Appraisals — direct component imports
const AppraisalCycles = lazy(() => import('@/pages/appraisals/AppraisalCycles').then((m) => ({ default: m.AppraisalCycles })));
const AppraisalDetail = lazy(() => import('@/pages/appraisals/AppraisalDetail').then((m) => ({ default: m.AppraisalDetail })));

// Expenses — direct component imports
const ExpenseList = lazy(() => import('@/pages/expenses/ExpenseList').then((m) => ({ default: m.ExpenseList })));
const ExpenseSubmit = lazy(() => import('@/pages/expenses/ExpenseSubmit').then((m) => ({ default: m.ExpenseSubmit })));
const ExpenseApprovals = lazy(() => import('@/pages/expenses/ExpenseApprovals').then((m) => ({ default: m.ExpenseApprovals })));

// Onboarding
const Onboarding = lazy(() => import('@/pages/Onboarding'));

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
        element: permGated('employees.view', <Dashboard />),
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
        element: gated('employees_enabled', 'Employees', 'employees.view', <Departments />),
      },
      {
        path: 'designations',
        element: gated('employees_enabled', 'Employees', 'employees.view', <Designations />),
      },
      {
        path: 'employee-grades',
        element: gated('employees_enabled', 'Employees', 'employees.view', <EmployeeGrades />),
      },
      {
        path: 'department-approvers',
        element: gated('employees_enabled', 'Employees', 'employees.view', <DepartmentApprovers />),
      },
      {
        path: 'branches',
        element: gated('employees_enabled', 'Employees', 'employees.view', <Branches />),
      },

      // ─── Leaves (explicit sub-routes, no wildcard) ─────────────
      {
        path: 'leaves',
        element: gated('leaves_enabled', 'Leave Management', 'leaves.view', <LeaveList />),
      },
      {
        path: 'leaves/apply',
        element: gated('leaves_enabled', 'Leave Management', 'leaves.view', <LeaveApply />),
      },
      {
        path: 'leaves/approvals',
        element: gated('leaves_enabled', 'Leave Management', 'leaves.approve', <LeaveApprovals />),
      },

      // ─── Attendance ──────────────────────────────────────────────
      {
        path: 'attendance',
        element: gated('attendance_enabled', 'Attendance', 'attendance.view', <Attendance />),
      },

      // ─── Shifts ──────────────────────────────────────────────────
      {
        path: 'shifts',
        element: gated('shifts_enabled', 'Shift Management', 'attendance.view', <Shifts />),
      },

      // ─── Payroll (explicit sub-routes, no wildcard) ────────────
      {
        path: 'payroll',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <PayslipViewer />),
      },
      {
        path: 'payroll/runs',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <PayrollRuns />),
      },
      {
        path: 'salary-components',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <SalaryComponents />),
      },
      {
        path: 'salary-structure-assignments',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <SalaryStructureAssignments />),
      },

      // ─── Recruitment (explicit sub-routes, no wildcard) ────────
      {
        path: 'recruitment',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <Recruitment />),
      },
      {
        path: 'recruitment/pipeline',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <RecruitmentPipeline />),
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
        element: gated('expenses_enabled', 'Expense Management', 'expenses.approve', <ExpenseApprovals />),
      },

      // ─── Onboarding ──────────────────────────────────────────────
      {
        path: 'onboarding',
        element: gated('onboarding_enabled', 'Onboarding', 'onboarding.view', <Onboarding />),
      },

      // ─── Training ────────────────────────────────────────────────
      {
        path: 'training',
        element: gated('training_enabled', 'Training', 'training.view', <Training />),
      },

      // ─── Grievances ──────────────────────────────────────────────
      {
        path: 'grievances',
        element: gated('grievances_enabled', 'Grievances', 'grievances.view', <GrievanceList />),
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

      // ─── Settlements ─────────────────────────────────────────────
      {
        path: 'settlements',
        element: gated('settlements_enabled', 'Settlements', 'settlements.view', <SettlementWorkflow />),
      },

      // ─── Supporting Modules ────────────────────────────────────
      {
        path: 'holidays',
        element: gated('holidays_enabled', 'Holiday Lists', 'employees.view', <Holidays />),
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
        element: gated('leaves_enabled', 'Leave Management', 'leaves.view', <LeavePolicies />),
      },
      {
        path: 'leave-policy-assignments',
        element: gated('leaves_enabled', 'Leave Management', 'leaves.view', <LeavePolicyAssignments />),
      },
      {
        path: 'leave-block-lists',
        element: gated('leaves_enabled', 'Leave Management', 'leaves.view', <LeaveBlockLists />),
      },
      {
        path: 'leave-adjustments',
        element: gated('leaves_enabled', 'Leave Management', 'leaves.view', <LeaveAdjustments />),
      },
      {
        path: 'earned-leave-schedules',
        element: gated('leaves_enabled', 'Leave Management', 'leaves.view', <EarnedLeaveSchedules />),
      },

      // ─── Shift Requests & Schedules ────────────────────────────
      {
        path: 'shift-requests',
        element: gated('shifts_enabled', 'Shift Management', 'attendance.view', <ShiftRequests />),
      },
      {
        path: 'shift-schedules',
        element: gated('shifts_enabled', 'Shift Management', 'attendance.view', <ShiftSchedules />),
      },

      // ─── Attendance Requests & Upload ──────────────────────────
      {
        path: 'attendance-requests',
        element: gated('attendance_enabled', 'Attendance', 'attendance.view', <AttendanceRequests />),
      },
      {
        path: 'attendance-upload',
        element: gated('attendance_enabled', 'Attendance', 'attendance.view', <AttendanceUpload />),
      },
      {
        path: 'geofence-locations',
        element: gated('attendance_enabled', 'Attendance', 'attendance.view', <GeoFenceLocations />),
      },

      // ─── Performance: KRAs, Templates, Goals, Feedback ─────────
      {
        path: 'kras',
        element: gated('appraisals_enabled', 'Appraisals', 'appraisals.view', <KRAs />),
      },
      {
        path: 'appraisal-templates',
        element: gated('appraisals_enabled', 'Appraisals', 'appraisals.view', <AppraisalTemplates />),
      },
      {
        path: 'goals',
        element: gated('appraisals_enabled', 'Appraisals', 'appraisals.view', <Goals />),
      },
      {
        path: 'performance-feedback',
        element: gated('appraisals_enabled', 'Appraisals', 'appraisals.view', <PerformanceFeedback />),
      },

      // ─── Exit Interviews ───────────────────────────────────────
      {
        path: 'exit-interviews',
        element: permGated('employees.view', <ExitInterviews />),
      },

      // ─── Payroll Periods & Corrections ─────────────────────────
      {
        path: 'payroll-periods',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <PayrollPeriods />),
      },
      {
        path: 'payroll-corrections',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <PayrollCorrections />),
      },

      // ─── Holiday Assignments ───────────────────────────────────
      {
        path: 'holiday-assignments',
        element: gated('holidays_enabled', 'Holiday Lists', 'employees.view', <HolidayListAssignments />),
      },

      // ─── Recruitment: Interview Types, Templates, Referrals ────
      {
        path: 'interview-types',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <InterviewTypes />),
      },
      {
        path: 'job-templates',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <JobOpeningTemplates />),
      },
      {
        path: 'referrals',
        element: gated('recruitment_enabled', 'Recruitment', 'recruitment.view', <EmployeeReferrals />),
      },

      // ─── Training Programs & Results ───────────────────────────
      {
        path: 'training-programs',
        element: gated('training_enabled', 'Training', 'training.view', <TrainingPrograms />),
      },
      {
        path: 'training-results',
        element: gated('training_enabled', 'Training', 'training.view', <TrainingResults />),
      },

      // ─── Employee Records ──────────────────────────────────────
      {
        path: 'health-insurance',
        element: gated('employees_enabled', 'Employees', 'employees.view', <EmployeeHealthInsurance />),
      },
      {
        path: 'cost-centers',
        element: gated('employees_enabled', 'Employees', 'employees.view', <EmployeeCostCenters />),
      },
      {
        path: 'document-types',
        element: gated('employees_enabled', 'Employees', 'employees.view', <DocumentTypes />),
      },
      {
        path: 'employee-documents',
        element: gated('employees_enabled', 'Employees', 'employees.view', <EmployeeDocuments />),
      },

      // ─── Expense Taxes ─────────────────────────────────────────
      {
        path: 'expense-taxes',
        element: gated('expenses_enabled', 'Expense Management', 'expenses.view', <ExpenseTaxes />),
      },

      // ─── Employee Incentives ───────────────────────────────────
      {
        path: 'employee-incentives',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <EmployeeIncentives />),
      },

      // ─── Transfers & Promotions ─────────────────────────────────
      {
        path: 'transfers',
        element: gated('employees_enabled', 'Employees', 'employees.view', <Transfers />),
      },
      {
        path: 'promotions',
        element: gated('employees_enabled', 'Employees', 'employees.view', <Promotions />),
      },
      {
        path: 'gratuity',
        element: gated('payroll_enabled', 'Payroll', 'payroll.view', <Gratuity />),
      },
      {
        path: 'appointment-letters',
        element: gated('employees_enabled', 'Employees', 'employees.view', <AppointmentLetters />),
      },
      {
        path: 'hr-settings',
        element: permGated('roles.manage', <HRSettings />),
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
        element: permGated('roles.manage', <AuditLogs />),
      },
    ],
  },
]);
