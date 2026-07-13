/**
 * API Endpoint Constants
 *
 * Centralized endpoint definitions for the HRMS Backend (api.digihrms.com).
 * Organized by module for easy discovery and refactoring.
 *
 * Requirements: 24.2, 24.3
 */

// ─── Employees ───────────────────────────────────────────────────────────────

export const EMPLOYEES = {
  LIST: '/api/v1/employees/',
  CREATE: '/api/v1/employees/',
  DETAIL: (id: string) => `/api/v1/employees/${id}/`,
  UPDATE: (id: string) => `/api/v1/employees/${id}/`,
  DELETE: (id: string) => `/api/v1/employees/${id}/`,
  PROPERTY_HISTORY: (id: string) => `/api/v1/employees/${id}/property-history/`,
} as const;

export const DEPARTMENTS = {
  LIST: '/api/v1/departments/',
  CREATE: '/api/v1/departments/',
  DETAIL: (id: string) => `/api/v1/departments/${id}/`,
  UPDATE: (id: string) => `/api/v1/departments/${id}/`,
  DELETE: (id: string) => `/api/v1/departments/${id}/`,
} as const;

export const DESIGNATIONS = {
  LIST: '/api/v1/designations/',
  CREATE: '/api/v1/designations/',
  DETAIL: (id: string) => `/api/v1/designations/${id}/`,
  UPDATE: (id: string) => `/api/v1/designations/${id}/`,
  DELETE: (id: string) => `/api/v1/designations/${id}/`,
} as const;

export const EMPLOYEE_GRADES = {
  LIST: '/api/v1/employee-grades/',
  CREATE: '/api/v1/employee-grades/',
  DETAIL: (id: string) => `/api/v1/employee-grades/${id}/`,
  UPDATE: (id: string) => `/api/v1/employee-grades/${id}/`,
  DELETE: (id: string) => `/api/v1/employee-grades/${id}/`,
} as const;

export const DEPARTMENT_APPROVERS = {
  LIST: '/api/v1/department-approvers/',
  CREATE: '/api/v1/department-approvers/',
  DETAIL: (id: string) => `/api/v1/department-approvers/${id}/`,
  UPDATE: (id: string) => `/api/v1/department-approvers/${id}/`,
  DELETE: (id: string) => `/api/v1/department-approvers/${id}/`,
} as const;

// ─── Branches ─────────────────────────────────────────────────────────────────

export const BRANCHES = {
  LIST: '/api/v1/branches/',
  CREATE: '/api/v1/branches/',
  DETAIL: (id: string) => `/api/v1/branches/${id}/`,
  UPDATE: (id: string) => `/api/v1/branches/${id}/`,
  DELETE: (id: string) => `/api/v1/branches/${id}/`,
} as const;

// ─── Attendance ──────────────────────────────────────────────────────────────

export const ATTENDANCE = {
  LIST: '/api/v1/attendance/',
  CHECK_IN: '/api/v1/attendance/check-in/',
  CHECK_OUT: '/api/v1/attendance/check-out/',
  DETAIL: (id: string) => `/api/v1/attendance/${id}/`,
} as const;

// ─── Leaves ──────────────────────────────────────────────────────────────────

export const LEAVES = {
  TYPES: '/api/v1/leaves/types/',
  ALLOCATIONS: '/api/v1/leaves/allocations/',
  APPLICATIONS: '/api/v1/leaves/applications/',
  APPLICATION_DETAIL: (id: string) => `/api/v1/leaves/applications/${id}/`,
  APPROVE: (id: string) => `/api/v1/leaves/applications/${id}/approve/`,
  REJECT: (id: string) => `/api/v1/leaves/applications/${id}/reject/`,
  ENCASHMENT: '/api/v1/leaves/encashment/',
  ENCASHMENT_APPROVE: (id: string) => `/api/v1/leaves/encashment/${id}/approve/`,
  ENCASHMENT_REJECT: (id: string) => `/api/v1/leaves/encashment/${id}/reject/`,
  COMPENSATORY: '/api/v1/leaves/compensatory/',
  COMPENSATORY_APPROVE: (id: string) => `/api/v1/leaves/compensatory/${id}/approve/`,
  COMPENSATORY_REJECT: (id: string) => `/api/v1/leaves/compensatory/${id}/reject/`,
} as const;

// ─── Salary Components ───────────────────────────────────────────────────────

export const SALARY_COMPONENTS = {
  LIST: '/api/v1/salary-components/',
  CREATE: '/api/v1/salary-components/',
  DETAIL: (id: string) => `/api/v1/salary-components/${id}/`,
  UPDATE: (id: string) => `/api/v1/salary-components/${id}/`,
  DELETE: (id: string) => `/api/v1/salary-components/${id}/`,
} as const;

// ─── Salary Structure Assignments ────────────────────────────────────────────

export const SALARY_STRUCTURE_ASSIGNMENTS = {
  LIST: '/api/v1/salary-structure-assignments/',
  CREATE: '/api/v1/salary-structure-assignments/',
  DETAIL: (id: string) => `/api/v1/salary-structure-assignments/${id}/`,
  UPDATE: (id: string) => `/api/v1/salary-structure-assignments/${id}/`,
  DELETE: (id: string) => `/api/v1/salary-structure-assignments/${id}/`,
} as const;

// ─── Payroll ─────────────────────────────────────────────────────────────────

export const PAYROLL = {
  SALARY_STRUCTURES: '/api/v1/salary-structures/',
  SALARY_STRUCTURE_DETAIL: (id: string) => `/api/v1/salary-structures/${id}/`,
  SALARY_SLIPS: '/api/v1/salary-slips/',
  SALARY_SLIP_DETAIL: (id: string) => `/api/v1/salary-slips/${id}/`,
  PAYROLL_ENTRIES: '/api/v1/payroll-entries/',
  PAYROLL_ENTRY_DETAIL: (id: string) => `/api/v1/payroll-entries/${id}/`,
  ADDITIONAL_SALARY: '/api/v1/additional-salary/',
  ADDITIONAL_SALARY_DETAIL: (id: string) => `/api/v1/additional-salary/${id}/`,
  EMPLOYEE_INCENTIVES: '/api/v1/employee-incentives/',
  RETENTION_BONUSES: '/api/v1/retention-bonuses/',
  SALARY_WITHHOLDING: '/api/v1/salary-withholding/',
  SALARY_WITHHOLDING_DETAIL: (id: string) => `/api/v1/salary-withholding/${id}/`,
} as const;

// ─── Shifts ──────────────────────────────────────────────────────────────────

export const SHIFTS = {
  TYPES: '/api/v1/shifts/types/',
  TYPE_DETAIL: (id: string) => `/api/v1/shifts/types/${id}/`,
  ASSIGNMENTS: '/api/v1/shifts/assignments/',
  ASSIGNMENT_DETAIL: (id: string) => `/api/v1/shifts/assignments/${id}/`,
  ROSTERS: '/api/v1/shifts/rosters/',
} as const;

// ─── Recruitment ─────────────────────────────────────────────────────────────

export const RECRUITMENT = {
  JOB_OPENINGS: '/api/v1/recruitment/job-openings/',
  JOB_OPENING_DETAIL: (id: string) => `/api/v1/recruitment/job-openings/${id}/`,
  JOB_APPLICANTS: '/api/v1/recruitment/applicants/',
  JOB_APPLICANT_DETAIL: (id: string) => `/api/v1/recruitment/applicants/${id}/`,
  INTERVIEWS: '/api/v1/recruitment/interviews/',
  INTERVIEW_DETAIL: (id: string) => `/api/v1/recruitment/interviews/${id}/`,
  JOB_OFFERS: '/api/v1/recruitment/job-offers/',
  JOB_OFFER_DETAIL: (id: string) => `/api/v1/recruitment/job-offers/${id}/`,
  STAFFING_PLANS: '/api/v1/recruitment/staffing-plans/',
  JOB_REQUISITIONS: '/api/v1/recruitment/job-requisitions/',
} as const;

// ─── Appraisals ──────────────────────────────────────────────────────────────

export const APPRAISALS = {
  CYCLES: '/api/v1/appraisals/cycles/',
  CYCLE_DETAIL: (id: string) => `/api/v1/appraisals/cycles/${id}/`,
  LIST: '/api/v1/appraisals/',
  DETAIL: (id: string) => `/api/v1/appraisals/${id}/`,
} as const;

// ─── Expenses ────────────────────────────────────────────────────────────────

export const EXPENSES = {
  CLAIMS: '/api/v1/expenses/claims/',
  CLAIM_DETAIL: (id: string) => `/api/v1/expenses/claims/${id}/`,
  CLAIM_APPROVE: (id: string) => `/api/v1/expenses/claims/${id}/approve/`,
  CLAIM_REJECT: (id: string) => `/api/v1/expenses/claims/${id}/reject/`,
  TYPES: '/api/v1/expenses/types/',
  ADVANCES: '/api/v1/expenses/advances/',
  ADVANCE_DETAIL: (id: string) => `/api/v1/expenses/advances/${id}/`,
  ADVANCE_APPROVE: (id: string) => `/api/v1/expenses/advances/${id}/approve/`,
  ADVANCE_REJECT: (id: string) => `/api/v1/expenses/advances/${id}/reject/`,
  ADVANCE_BALANCE: (id: string) => `/api/v1/expenses/advances/${id}/balance/`,
} as const;

// ─── Onboarding ──────────────────────────────────────────────────────────────

export const ONBOARDING = {
  TEMPLATES: '/api/v1/onboarding/templates/',
  TEMPLATE_DETAIL: (id: string) => `/api/v1/onboarding/templates/${id}/`,
  TASKS: '/api/v1/onboarding/tasks/',
  TASK_DETAIL: (id: string) => `/api/v1/onboarding/tasks/${id}/`,
} as const;

// ─── Training ────────────────────────────────────────────────────────────────

export const TRAINING = {
  EVENTS: '/api/v1/training/events/',
  EVENT_DETAIL: (id: string) => `/api/v1/training/events/${id}/`,
  ENROLLMENTS: '/api/v1/training/enrollments/',
  ENROLLMENT_DETAIL: (id: string) => `/api/v1/training/enrollments/${id}/`,
  ENROLLMENT_COMPLETE: (id: string) => `/api/v1/training/enrollments/${id}/complete/`,
} as const;

// ─── Holidays ────────────────────────────────────────────────────────────────

export const HOLIDAYS = {
  LISTS: '/api/v1/holidays/holiday-lists/',
  LIST_DETAIL: (id: string) => `/api/v1/holidays/holiday-lists/${id}/`,
  ENTRIES: (listId: string) => `/api/v1/holidays/holiday-lists/${listId}/entries/`,
  ENTRY_DETAIL: (listId: string, entryId: string) => `/api/v1/holidays/holiday-lists/${listId}/entries/${entryId}/`,
} as const;

// ─── HR Settings ─────────────────────────────────────────────────────────────

export const HR_SETTINGS = {
  GET: '/api/v1/hr-settings/',
  UPDATE: '/api/v1/hr-settings/',
  EMPLOYMENT_TYPES: '/api/v1/employment-types/',
  EMPLOYMENT_TYPE_DETAIL: (id: string) => `/api/v1/employment-types/${id}/`,
} as const;

// ─── Email Configuration ─────────────────────────────────────────────────────

export const EMAIL_CONFIG = {
  GET: '/api/v1/email-config/',
  UPDATE: '/api/v1/email-config/',
  TEST: '/api/v1/email-config/test/',
} as const;

// ─── Tax & Benefits ──────────────────────────────────────────────────────────

export const TAX_BENEFITS = {
  TAX_SLABS: '/api/v1/tax-benefits/tax-slabs/',
  TAX_SLAB_DETAIL: (id: string) => `/api/v1/tax-benefits/tax-slabs/${id}/`,
  TAX_DECLARATIONS: '/api/v1/tax-benefits/tax-declarations/',
  TAX_DECLARATION_DETAIL: (id: string) => `/api/v1/tax-benefits/tax-declarations/${id}/`,
  TAX_PROOF_SUBMISSIONS: '/api/v1/tax-benefits/tax-proof-submissions/',
  BENEFIT_APPLICATIONS: '/api/v1/tax-benefits/benefit-applications/',
  BENEFIT_APPLICATION_APPROVE: (id: string) => `/api/v1/tax-benefits/benefit-applications/${id}/approve/`,
  BENEFIT_CLAIMS: '/api/v1/tax-benefits/benefit-claims/',
  BENEFIT_CLAIM_APPROVE: (id: string) => `/api/v1/tax-benefits/benefit-claims/${id}/approve/`,
} as const;

// ─── Gratuity ────────────────────────────────────────────────────────────────

export const GRATUITY = {
  RULES: '/api/v1/gratuity/rules/',
  RULE_DETAIL: (id: string) => `/api/v1/gratuity/rules/${id}/`,
  CALCULATE: '/api/v1/gratuity/calculate/',
} as const;

// ─── Transfers & Promotions ──────────────────────────────────────────────────

export const TRANSFERS = {
  LIST: '/api/v1/employee-transfers/',
  CREATE: '/api/v1/employee-transfers/',
  DETAIL: (id: string) => `/api/v1/employee-transfers/${id}/`,
} as const;

export const PROMOTIONS = {
  LIST: '/api/v1/employee-promotions/',
  CREATE: '/api/v1/employee-promotions/',
  DETAIL: (id: string) => `/api/v1/employee-promotions/${id}/`,
} as const;

// ─── Overtime ────────────────────────────────────────────────────────────────

export const OVERTIME = {
  TYPES: '/api/v1/overtime-types/',
  TYPE_DETAIL: (id: string) => `/api/v1/overtime-types/${id}/`,
  SLIPS: '/api/v1/overtime-slips/',
  SLIP_DETAIL: (id: string) => `/api/v1/overtime-slips/${id}/`,
  SLIP_APPROVE: (id: string) => `/api/v1/overtime-slips/${id}/approve/`,
  SLIP_REJECT: (id: string) => `/api/v1/overtime-slips/${id}/reject/`,
} as const;

// ─── Grievance ───────────────────────────────────────────────────────────────

export const GRIEVANCES = {
  TYPES: '/api/v1/grievance-types/',
  LIST: '/api/v1/grievances/',
  CREATE: '/api/v1/grievances/',
  DETAIL: (id: string) => `/api/v1/grievances/${id}/`,
} as const;

// ─── Travel ──────────────────────────────────────────────────────────────────

export const TRAVEL = {
  REQUESTS: '/api/v1/travel-requests/',
  REQUEST_DETAIL: (id: string) => `/api/v1/travel-requests/${id}/`,
  REQUEST_APPROVE: (id: string) => `/api/v1/travel-requests/${id}/approve/`,
  REQUEST_REJECT: (id: string) => `/api/v1/travel-requests/${id}/reject/`,
} as const;

// ─── Fleet / Vehicles ────────────────────────────────────────────────────────

export const FLEET = {
  VEHICLES: '/api/v1/vehicles/',
  VEHICLE_DETAIL: (id: string) => `/api/v1/vehicles/${id}/`,
  VEHICLE_LOGS: '/api/v1/vehicle-logs/',
  VEHICLE_SERVICES: '/api/v1/vehicle-services/',
  VEHICLE_EXPENSES: (id: string) => `/api/v1/vehicles/${id}/expenses/`,
} as const;

// ─── Skills ──────────────────────────────────────────────────────────────────

export const SKILLS = {
  LIST: '/api/v1/skills/',
  CATEGORIES: '/api/v1/skill-categories/',
  EMPLOYEE_SKILLS: '/api/v1/employee-skills/',
  EMPLOYEE_SKILL_DETAIL: (id: string) => `/api/v1/employee-skills/${id}/`,
  DESIGNATION_SKILLS: '/api/v1/designation-skills/',
  GAP_ANALYSIS: '/api/v1/skill-gap-analysis/',
} as const;

// ─── Reports ─────────────────────────────────────────────────────────────────

export const REPORTS = {
  ATTENDANCE_MONTHLY: '/api/v1/reports/attendance-monthly/',
  ATTENDANCE_HOLIDAYS: '/api/v1/reports/attendance-holidays/',
  LEAVE_BALANCE: '/api/v1/reports/leave-balance/',
  LEAVE_LEDGER: '/api/v1/reports/leave-ledger/',
  SALARY_REGISTER: '/api/v1/reports/salary-register/',
  PAYROLL_SUMMARY: '/api/v1/reports/payroll-summary/',
  RECRUITMENT_ANALYTICS: '/api/v1/reports/recruitment-analytics/',
  EMPLOYEE_ANALYTICS: '/api/v1/reports/employee-analytics/',
  EMPLOYEE_BIRTHDAYS: '/api/v1/reports/employee-birthdays/',
  EXPENSE_UNPAID: '/api/v1/reports/expense-unpaid/',
  ADVANCE_SUMMARY: '/api/v1/reports/advance-summary/',
  EXPORT: '/api/v1/reports/export/',
} as const;

// ─── Compliance (India) ──────────────────────────────────────────────────────

export const COMPLIANCE = {
  PF_CONFIG: '/api/v1/compliance/pf-config/',
  ESI_CONFIG: '/api/v1/compliance/esi-config/',
  PT_SLABS: '/api/v1/compliance/pt-slabs/',
  FORM16: (employeeId: string) => `/api/v1/compliance/form16/${employeeId}/`,
  COMPUTE_TAX: '/api/v1/compliance/compute-tax/',
} as const;

// ─── Full & Final Settlement ─────────────────────────────────────────────────

export const SETTLEMENT = {
  CREATE: '/api/v1/full-final-settlement/',
  DETAIL: (id: string) => `/api/v1/full-final-settlement/${id}/`,
  APPROVE: (id: string) => `/api/v1/full-final-settlement/${id}/approve/`,
  ASSET_RETURNS: (id: string) => `/api/v1/full-final-settlement/${id}/asset-returns/`,
  MARK_ASSET_RETURNED: (id: string, assetId: string) =>
    `/api/v1/full-final-settlement/${id}/asset-returns/${assetId}/`,
} as const;

// ─── Appointment Letters ─────────────────────────────────────────────────────

export const APPOINTMENT_LETTERS = {
  TEMPLATES: '/api/v1/appointment-letters/templates/',
  TEMPLATE_DETAIL: (id: string) => `/api/v1/appointment-letters/templates/${id}/`,
  GENERATE: '/api/v1/appointment-letters/generate/',
  DETAIL: (id: string) => `/api/v1/appointment-letters/${id}/`,
  PDF: (id: string) => `/api/v1/appointment-letters/${id}/pdf/`,
  SEND: (id: string) => `/api/v1/appointment-letters/${id}/send/`,
} as const;

// ─── Daily Work Summary ──────────────────────────────────────────────────────

export const DAILY_WORK_SUMMARY = {
  GROUPS: '/api/v1/daily-work-summary-groups/',
  GROUP_DETAIL: (id: string) => `/api/v1/daily-work-summary-groups/${id}/`,
  GROUP_TRIGGER: (id: string) => `/api/v1/daily-work-summary-groups/${id}/trigger/`,
  SUMMARIES: '/api/v1/daily-work-summaries/',
} as const;

// ─── Leave Policies & Adjustments ────────────────────────────────────────────

export const LEAVE_POLICIES = {
  LIST: '/api/v1/leaves/policies/',
  CREATE: '/api/v1/leaves/policies/',
  DETAIL: (id: string) => `/api/v1/leaves/policies/${id}/`,
  UPDATE: (id: string) => `/api/v1/leaves/policies/${id}/`,
  DELETE: (id: string) => `/api/v1/leaves/policies/${id}/`,
} as const;

export const LEAVE_POLICY_ASSIGNMENTS = {
  LIST: '/api/v1/leaves/policy-assignments/',
  CREATE: '/api/v1/leaves/policy-assignments/',
  DETAIL: (id: string) => `/api/v1/leaves/policy-assignments/${id}/`,
  UPDATE: (id: string) => `/api/v1/leaves/policy-assignments/${id}/`,
  DELETE: (id: string) => `/api/v1/leaves/policy-assignments/${id}/`,
} as const;

export const LEAVE_BLOCK_LISTS = {
  LIST: '/api/v1/leaves/block-lists/',
  CREATE: '/api/v1/leaves/block-lists/',
  DETAIL: (id: string) => `/api/v1/leaves/block-lists/${id}/`,
  UPDATE: (id: string) => `/api/v1/leaves/block-lists/${id}/`,
  DELETE: (id: string) => `/api/v1/leaves/block-lists/${id}/`,
} as const;

export const LEAVE_ADJUSTMENTS = {
  LIST: '/api/v1/leaves/adjustments/',
  CREATE: '/api/v1/leaves/adjustments/',
  DETAIL: (id: string) => `/api/v1/leaves/adjustments/${id}/`,
  UPDATE: (id: string) => `/api/v1/leaves/adjustments/${id}/`,
  DELETE: (id: string) => `/api/v1/leaves/adjustments/${id}/`,
} as const;

export const EARNED_LEAVE_SCHEDULES = {
  LIST: '/api/v1/leaves/earned-leave-schedules/',
  CREATE: '/api/v1/leaves/earned-leave-schedules/',
  DETAIL: (id: string) => `/api/v1/leaves/earned-leave-schedules/${id}/`,
  UPDATE: (id: string) => `/api/v1/leaves/earned-leave-schedules/${id}/`,
  DELETE: (id: string) => `/api/v1/leaves/earned-leave-schedules/${id}/`,
} as const;

// ─── Shift Requests & Schedules ──────────────────────────────────────────────

export const SHIFT_REQUESTS = {
  LIST: '/api/v1/shifts/requests/',
  CREATE: '/api/v1/shifts/requests/',
  DETAIL: (id: string) => `/api/v1/shifts/requests/${id}/`,
  UPDATE: (id: string) => `/api/v1/shifts/requests/${id}/`,
  DELETE: (id: string) => `/api/v1/shifts/requests/${id}/`,
} as const;

export const SHIFT_SCHEDULES = {
  LIST: '/api/v1/shifts/schedules/',
  CREATE: '/api/v1/shifts/schedules/',
  DETAIL: (id: string) => `/api/v1/shifts/schedules/${id}/`,
  UPDATE: (id: string) => `/api/v1/shifts/schedules/${id}/`,
  DELETE: (id: string) => `/api/v1/shifts/schedules/${id}/`,
} as const;

// ─── Attendance Requests & Upload ────────────────────────────────────────────

export const ATTENDANCE_REQUESTS = {
  LIST: '/api/v1/attendance/requests/',
  CREATE: '/api/v1/attendance/requests/',
  DETAIL: (id: string) => `/api/v1/attendance/requests/${id}/`,
  UPDATE: (id: string) => `/api/v1/attendance/requests/${id}/`,
  DELETE: (id: string) => `/api/v1/attendance/requests/${id}/`,
} as const;

export const ATTENDANCE_UPLOAD = {
  UPLOAD: '/api/v1/attendance/upload/',
} as const;

// ─── Geo-Fence Locations ─────────────────────────────────────────────────────

export const GEOFENCE_LOCATIONS = {
  LIST: '/api/v1/attendance/geofence-locations/',
  CREATE: '/api/v1/attendance/geofence-locations/',
  DETAIL: (id: string) => `/api/v1/attendance/geofence-locations/${id}/`,
  UPDATE: (id: string) => `/api/v1/attendance/geofence-locations/${id}/`,
  DELETE: (id: string) => `/api/v1/attendance/geofence-locations/${id}/`,
} as const;

// ─── KRAs & Appraisal Templates ─────────────────────────────────────────────

export const KRAS = {
  LIST: '/api/v1/appraisals/kras/',
  CREATE: '/api/v1/appraisals/kras/',
  DETAIL: (id: string) => `/api/v1/appraisals/kras/${id}/`,
  UPDATE: (id: string) => `/api/v1/appraisals/kras/${id}/`,
  DELETE: (id: string) => `/api/v1/appraisals/kras/${id}/`,
} as const;

export const APPRAISAL_TEMPLATES = {
  LIST: '/api/v1/appraisals/templates/',
  CREATE: '/api/v1/appraisals/templates/',
  DETAIL: (id: string) => `/api/v1/appraisals/templates/${id}/`,
  UPDATE: (id: string) => `/api/v1/appraisals/templates/${id}/`,
  DELETE: (id: string) => `/api/v1/appraisals/templates/${id}/`,
} as const;

export const PERFORMANCE_FEEDBACK = {
  LIST: '/api/v1/appraisals/feedback/',
  CREATE: '/api/v1/appraisals/feedback/',
  DETAIL: (id: string) => `/api/v1/appraisals/feedback/${id}/`,
  UPDATE: (id: string) => `/api/v1/appraisals/feedback/${id}/`,
  DELETE: (id: string) => `/api/v1/appraisals/feedback/${id}/`,
} as const;

// ─── Goals ───────────────────────────────────────────────────────────────────

export const GOALS = {
  LIST: '/api/v1/goals/',
  CREATE: '/api/v1/goals/',
  DETAIL: (id: string) => `/api/v1/goals/${id}/`,
  UPDATE: (id: string) => `/api/v1/goals/${id}/`,
  DELETE: (id: string) => `/api/v1/goals/${id}/`,
} as const;

// ─── Exit Interviews ─────────────────────────────────────────────────────────

export const EXIT_INTERVIEWS = {
  LIST: '/api/v1/exit-interviews/',
  CREATE: '/api/v1/exit-interviews/',
  DETAIL: (id: string) => `/api/v1/exit-interviews/${id}/`,
  UPDATE: (id: string) => `/api/v1/exit-interviews/${id}/`,
  DELETE: (id: string) => `/api/v1/exit-interviews/${id}/`,
} as const;

// ─── Payroll Periods & Corrections ──────────────────────────────────────────

export const PAYROLL_PERIODS = {
  LIST: '/api/v1/payroll-periods/',
  CREATE: '/api/v1/payroll-periods/',
  DETAIL: (id: string) => `/api/v1/payroll-periods/${id}/`,
  UPDATE: (id: string) => `/api/v1/payroll-periods/${id}/`,
  DELETE: (id: string) => `/api/v1/payroll-periods/${id}/`,
} as const;

export const PAYROLL_CORRECTIONS = {
  LIST: '/api/v1/payroll-corrections/',
  CREATE: '/api/v1/payroll-corrections/',
  DETAIL: (id: string) => `/api/v1/payroll-corrections/${id}/`,
  UPDATE: (id: string) => `/api/v1/payroll-corrections/${id}/`,
  DELETE: (id: string) => `/api/v1/payroll-corrections/${id}/`,
} as const;

// ─── Holiday List Assignments ────────────────────────────────────────────────

export const HOLIDAY_ASSIGNMENTS = {
  LIST: '/api/v1/holidays/assignments/',
  CREATE: '/api/v1/holidays/assignments/',
  DETAIL: (id: string) => `/api/v1/holidays/assignments/${id}/`,
  UPDATE: (id: string) => `/api/v1/holidays/assignments/${id}/`,
  DELETE: (id: string) => `/api/v1/holidays/assignments/${id}/`,
} as const;

// ─── Interview Types ─────────────────────────────────────────────────────────

export const INTERVIEW_TYPES = {
  LIST: '/api/v1/recruitment/interview-types/',
  CREATE: '/api/v1/recruitment/interview-types/',
  DETAIL: (id: string) => `/api/v1/recruitment/interview-types/${id}/`,
  UPDATE: (id: string) => `/api/v1/recruitment/interview-types/${id}/`,
  DELETE: (id: string) => `/api/v1/recruitment/interview-types/${id}/`,
} as const;

// ─── Training Programs & Results ─────────────────────────────────────────────

export const TRAINING_PROGRAMS = {
  LIST: '/api/v1/training/programs/',
  CREATE: '/api/v1/training/programs/',
  DETAIL: (id: string) => `/api/v1/training/programs/${id}/`,
  UPDATE: (id: string) => `/api/v1/training/programs/${id}/`,
  DELETE: (id: string) => `/api/v1/training/programs/${id}/`,
} as const;

export const TRAINING_RESULTS = {
  LIST: '/api/v1/training/results/',
  CREATE: '/api/v1/training/results/',
  DETAIL: (id: string) => `/api/v1/training/results/${id}/`,
  UPDATE: (id: string) => `/api/v1/training/results/${id}/`,
  DELETE: (id: string) => `/api/v1/training/results/${id}/`,
} as const;

// ─── Job Opening Templates ──────────────────────────────────────────────────

export const JOB_OPENING_TEMPLATES = {
  LIST: '/api/v1/recruitment/job-templates/',
  CREATE: '/api/v1/recruitment/job-templates/',
  DETAIL: (id: string) => `/api/v1/recruitment/job-templates/${id}/`,
  UPDATE: (id: string) => `/api/v1/recruitment/job-templates/${id}/`,
  DELETE: (id: string) => `/api/v1/recruitment/job-templates/${id}/`,
} as const;

// ─── Employee Referrals ──────────────────────────────────────────────────────

export const EMPLOYEE_REFERRALS = {
  LIST: '/api/v1/recruitment/referrals/',
  CREATE: '/api/v1/recruitment/referrals/',
  DETAIL: (id: string) => `/api/v1/recruitment/referrals/${id}/`,
  UPDATE: (id: string) => `/api/v1/recruitment/referrals/${id}/`,
  DELETE: (id: string) => `/api/v1/recruitment/referrals/${id}/`,
} as const;

// ─── Employee Health Insurance ───────────────────────────────────────────────

export const EMPLOYEE_HEALTH_INSURANCE = {
  LIST: '/api/v1/employee-health-insurance/',
  CREATE: '/api/v1/employee-health-insurance/',
  DETAIL: (id: string) => `/api/v1/employee-health-insurance/${id}/`,
  UPDATE: (id: string) => `/api/v1/employee-health-insurance/${id}/`,
  DELETE: (id: string) => `/api/v1/employee-health-insurance/${id}/`,
} as const;

// ─── Employee Cost Centers ───────────────────────────────────────────────────

export const EMPLOYEE_COST_CENTERS = {
  LIST: '/api/v1/employee-cost-centers/',
  CREATE: '/api/v1/employee-cost-centers/',
  DETAIL: (id: string) => `/api/v1/employee-cost-centers/${id}/`,
  UPDATE: (id: string) => `/api/v1/employee-cost-centers/${id}/`,
  DELETE: (id: string) => `/api/v1/employee-cost-centers/${id}/`,
} as const;

// ─── Document Types & Employee Documents ─────────────────────────────────────

export const DOCUMENT_TYPES = {
  LIST: '/api/v1/document-types/',
  CREATE: '/api/v1/document-types/',
  DETAIL: (id: string) => `/api/v1/document-types/${id}/`,
  UPDATE: (id: string) => `/api/v1/document-types/${id}/`,
  DELETE: (id: string) => `/api/v1/document-types/${id}/`,
} as const;

export const EMPLOYEE_DOCUMENTS = {
  LIST: '/api/v1/employee-documents/',
  CREATE: '/api/v1/employee-documents/',
  DETAIL: (id: string) => `/api/v1/employee-documents/${id}/`,
  UPDATE: (id: string) => `/api/v1/employee-documents/${id}/`,
  DELETE: (id: string) => `/api/v1/employee-documents/${id}/`,
} as const;

// ─── Expense Taxes ───────────────────────────────────────────────────────────

export const EXPENSE_TAXES = {
  LIST: '/api/v1/expenses/taxes/',
  CREATE: '/api/v1/expenses/taxes/',
  DETAIL: (id: string) => `/api/v1/expenses/taxes/${id}/`,
  UPDATE: (id: string) => `/api/v1/expenses/taxes/${id}/`,
  DELETE: (id: string) => `/api/v1/expenses/taxes/${id}/`,
} as const;

// ─── Employee Incentives ─────────────────────────────────────────────────────

export const EMPLOYEE_INCENTIVES = {
  LIST: '/api/v1/employee-incentives/',
  CREATE: '/api/v1/employee-incentives/',
  DETAIL: (id: string) => `/api/v1/employee-incentives/${id}/`,
  UPDATE: (id: string) => `/api/v1/employee-incentives/${id}/`,
  DELETE: (id: string) => `/api/v1/employee-incentives/${id}/`,
} as const;
