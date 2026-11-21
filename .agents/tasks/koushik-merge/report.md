# koushik-merge report

Merge of origin/koushik (9f8ccdf) into koushik-merge as a real merge commit (b6edf56), then restyled onto our design system.

## Gate (final)
tsc errors 111 (<=119); oxlint warnings 225 (<=226); vitest 19/19; vite build ok; Playwright 80 passed (74 existing + 6 new routes); grep gate: no palette classes, no raw button/select, no emoji icons; hex only as data (HelpdeskTagsTab tag colours, CareersWidgetTab / HRSettings snippet default `#2563eb`, RichTextEditor inline table HTML and highlight palette, pre-existing).
Lint note: 6 of the warnings are in public/careers-widget.js, public/embed/careers.js, public/widget/careers.js (unused catch `e`, unused `resData`); those files are not edited.

## Per-file survival (git diff 793be09 origin/koushik --stat, 74 files)
Check method: every file exists in the merged tree; for each file the identifiers his diff added (formatDate, formatDateTime, email_enabled/email_subject, usePerformanceData, hrms-format-changed, isIframe, embedMode) were grepped in the merged file and all are present.

| Area | Files | Status | How checked |
|---|---|---|---|
| Formatters | utils/formatters.ts, hooks/useAppFormatting.ts, hooks/useHRSettings.ts, settings/DateTimeFormatTab.tsx | survived | `formatDateTime`, `isIso*`, `hrms-format-changed`/`storage` events present; defaults DD/MM/YYYY and 12h kept |
| formatDate/formatDateTime call sites | DataTable, WorkflowTimeline, AppointmentLetters, AuditLogs, CompensatoryLeave, DocumentRequests, EmployeeBonusPoints, Gratuity, HolidayLists, LeaveAdjustments, LeaveBlockLists, LeavePolicyAssignments, Meetings, Profile, WorkRecords, AppraisalCycles, AppraisalDetail, MyAttendanceHistory, CheckInButton, EmployeeDashboard, LeaveApply, OnboardingChecklist, OvertimeApprovals, PayrollDashboard, ApplicantDetailDrawer, InterviewSchedule, JobOpenings, SettlementWorkflow, ShiftRoster, ShiftSchedule, TrainingDetail, TrainingEvents, TravelApprovals, MailServerTab | survived | grep of added identifiers |
| Leave / Attendance | LeaveDashboard, AttendanceDashboard, AttendanceUpload, assets/no_overtime_clock.png | survived, restyled | hooks/derived metrics kept; Playwright leaves/attendance routes |
| Performance | PerformanceDashboard, hooks/usePerformance.ts, routes performance/dashboard + pms/dashboard-view, nav item | survived, restyled | `usePerformanceData` used; new smoke route |
| Recruitment | RecruitmentDashboard, RecruitmentStages (email_* fields), ApplicantPipeline, CareersEmbedWidget (isIframe), types/recruitment.ts | survived, restyled | grep + smoke routes |
| Settings | SettingsLayout (accordion, careers-widget, leave-types), CareersWidgetTab, GraceTimeTab, CandidateRejectReasonTab, HRSettings (embedMode), HelpdeskTagsTab, HistoryTagsTab, LeaveTypeTab, GeneralSettingsTab, AutoPayslipSettingsTab, BonusPointSettingTab, EmployeeTypeTab, WorkTypeTab, MailServerTab | survived | smoke settings-careers-widget, settings-grace-time, hr-settings |
| Routing / nav | router/index.tsx (hr-settings, helpdesk/faq*, careers-widget), RoleGatedRoute.tsx (admin aliases), config/navigation.ts (Performance Dashboard, FAQs, HR Settings), package.json | survived | smoke faq-categories, hr-settings; `admin`/`administrator` aliases present |
| Shell | Sidebar.tsx, NavIcon.tsx | ours kept (per rule) | |
| Config | vite.config.ts | survived | proxy target `http://localhost:8002` |
| Public embeds | public/careers-widget.js, embed/careers.js, widget/careers.js, test-widget.html | untouched | `git diff origin/koushik -- public` empty |
| PermissionDashboard | pages/admin/PermissionDashboard.tsx | kept (he deleted it) | smoke permissions-dashboard |

## Judgement calls to flag
- PermissionDashboard page, both routes and nav entries kept; confirm with Koushik.
- Help Desk: both Helpdesk Tags (ours) and FAQs (his) nav items kept.
- PayrollDashboard header links Salary Slips / Payroll Runs kept (he removed them).
- 12h time and DD/MM/YYYY defaults are his and kept.
- vite proxy port 8002 is his.
- CareersWidgetTab hardcodes tenant `org_digihrms` and `/careers/embed`; kept.

## Public widget styling note (not edited)
Font stack is -apple-system/Segoe UI/Roboto (not Public Sans); primary colour comes from `data-primary-color` with a script fallback, so no change is needed.

## Screenshots reviewed (screens/after)
leaves-dashboard, attendance-dashboard, attendance-upload, performance-dashboard, recruitment-dashboard, recruitment-stages, recruitment-pipeline, settings-careers-widget, settings-grace-time, hr-settings, faq-categories. Layout, cards, stat cards, empty states, buttons and tabs match other pages. No further fixes made.

## Lint fixes in this step
useMemo/useCallback dependency fixes in LeaveDashboard, RecruitmentDashboard, CareersEmbedWidget; one eslint-disable on the CandidateRejectReasonTab company-sync effect; removed four unused imports (TrainingDetail, MailServerTab, DataTable, OnboardingTemplates).
