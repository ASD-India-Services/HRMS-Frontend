import { Button } from '@/components/ui/Button';

/**
 * Reports — Grid of available HR report cards.
 *
 * Static layout for now; each card shows the report name with a "Coming Soon" badge.
 */

const REPORTS = [
  { name: 'Attendance Monthly', description: 'Monthly attendance summary by department', icon: '📅' },
  { name: 'Leave Balance', description: 'Current leave balance for all employees', icon: '🏖️' },
  { name: 'Salary Register', description: 'Detailed salary register with breakdowns', icon: '💰' },
  { name: 'Payroll Summary', description: 'Period-wise payroll cost summary', icon: '📊' },
  { name: 'Recruitment Analytics', description: 'Hiring funnel and source analysis', icon: '🎯' },
  { name: 'Employee Analytics', description: 'Headcount, attrition, and demographics', icon: '👥' },
  { name: 'Employee Birthdays', description: 'Upcoming employee birthdays this month', icon: '🎂' },
  { name: 'Expense Unpaid', description: 'Pending and unpaid expense claims', icon: '🧾' },
];

export default function Reports() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-primary">Reports</h1>
        <p className="mt-1 text-sm text-ink-secondary">HR analytics, attendance reports, and payroll summaries</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {REPORTS.map((report) => (
          <div
            key={report.name}
            className="relative rounded-xl border border-divider bg-surface-paper p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Coming Soon badge */}
            <span className="absolute right-3 top-3 rounded-full bg-warning-lighter px-2 py-0.5 text-xs font-medium text-warning-dark">
              Coming Soon
            </span>

            <div className="mb-3 text-2xl">{report.icon}</div>
            <h3 className="text-sm font-semibold text-ink-primary">{report.name}</h3>
            <p className="mt-1 text-xs text-ink-secondary">{report.description}</p>

            <Button variant="outlined" color="inherit" size="small"
              type="button"
              disabled
              className="mt-4"
            >
              View Report
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
