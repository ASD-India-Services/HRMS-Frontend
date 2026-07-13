/**
 * CRUD Module Configurations — Barrel Export
 *
 * Re-exports all CRUD module configs for centralized access.
 *
 * Requirements: 3.1
 */

// ─── Core HR ─────────────────────────────────────────────────────────────────
export { employeeCrudConfig } from './employees';
export { departmentCrudConfig } from './departments';
export { designationCrudConfig } from './designations';

// ─── Leaves ──────────────────────────────────────────────────────────────────
export { leaveTypesCrudConfig } from './leaveTypes';
export { leaveAllocationsCrudConfig } from './leaveAllocations';
export { leaveApplicationsCrudConfig } from './leaveApplications';

// ─── Payroll ─────────────────────────────────────────────────────────────────
export { salaryStructuresCrudConfig } from './salaryStructures';
export { salarySlipsCrudConfig } from './salarySlips';
export { payrollEntriesCrudConfig } from './payrollEntries';
export { additionalSalaryCrudConfig } from './additionalSalary';

// ─── Recruitment ─────────────────────────────────────────────────────────────
export { jobOpeningsCrudConfig } from './jobOpenings';
export { jobApplicantsCrudConfig } from './jobApplicants';
export { interviewsCrudConfig } from './interviews';
export { jobOffersCrudConfig } from './jobOffers';

// ─── Expenses ────────────────────────────────────────────────────────────────
export { expenseClaimsCrudConfig } from './expenseClaims';
export { expenseTypesCrudConfig } from './expenseTypes';
export { employeeAdvancesCrudConfig } from './employeeAdvances';

// ─── Attendance & Shifts ─────────────────────────────────────────────────────
export { attendanceCrudConfig } from './attendance';
export { shiftTypesCrudConfig } from './shiftTypes';
export { shiftAssignmentsCrudConfig } from './shiftAssignments';

// ─── Appraisals ──────────────────────────────────────────────────────────────
export { appraisalCyclesCrudConfig } from './appraisalCycles';
export { appraisalsCrudConfig } from './appraisals';

// ─── Onboarding & Training ───────────────────────────────────────────────────
export { onboardingTemplatesCrudConfig } from './onboardingTemplates';
export { trainingEventsCrudConfig } from './trainingEvents';

// ─── Grievances ──────────────────────────────────────────────────────────────
export { grievancesCrudConfig } from './grievances';

// ─── Travel ──────────────────────────────────────────────────────────────────
export { travelRequestsCrudConfig } from './travelRequests';

// ─── Overtime ────────────────────────────────────────────────────────────────
export { overtimeSlipsCrudConfig } from './overtimeSlips';

// ─── Holidays ────────────────────────────────────────────────────────────────
export { holidayListsCrudConfig } from './holidayLists';

// ─── Fleet ───────────────────────────────────────────────────────────────────
export { vehiclesCrudConfig } from './vehicles';
