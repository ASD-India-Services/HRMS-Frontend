import { Iconify, type IconName } from '@/components/Iconify';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * Reports — Grid of available HR report cards.
 *
 * Static layout for now; each card shows the report name with a "Coming Soon" badge.
 */

const REPORTS: { name: string; description: string; icon: IconName }[] = [
  { name: 'Attendance Monthly', description: 'Monthly attendance summary by department', icon: 'attendance' },
  { name: 'Leave Balance', description: 'Current leave balance for all employees', icon: 'leaves' },
  { name: 'Salary Register', description: 'Detailed salary register with breakdowns', icon: 'payroll' },
  { name: 'Payroll Summary', description: 'Period-wise payroll cost summary', icon: 'chart' },
  { name: 'Recruitment Analytics', description: 'Hiring funnel and source analysis', icon: 'kras' },
  { name: 'Employee Analytics', description: 'Headcount, attrition, and demographics', icon: 'employees' },
  { name: 'Employee Birthdays', description: 'Upcoming employee birthdays this month', icon: 'holidayLists' },
  { name: 'Expense Unpaid', description: 'Pending and unpaid expense claims', icon: 'expenses' },
];

export default function Reports() {
  return (
    <PageContainer>
      <PageHeader title="Reports" subtitle="HR analytics, attendance reports, and payroll summaries" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {REPORTS.map((report) => (
          <Card key={report.name} className="relative">
            <CardContent>
              {/* Coming Soon badge */}
              <span className="absolute right-4 top-4 rounded-full bg-warning-lighter px-2 py-0.5 text-xs font-medium text-warning-dark">
                Coming Soon
              </span>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-lighter text-primary-main">
                <Iconify icon={report.icon} width={24} />
              </div>
              <h3 className="text-sm font-semibold text-ink-primary">{report.name}</h3>
              <p className="mt-1 text-xs text-ink-secondary">{report.description}</p>
              <Button variant="outlined" color="inherit" size="small" disabled className="mt-4">
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
